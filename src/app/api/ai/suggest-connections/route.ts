// src/app/api/ai/suggest-connections/route.ts

import {
	checkUsageLimit,
	getAIUsageCount,
	requireSubscription,
	SubscriptionError,
	trackAIUsage,
} from '@/helpers/api/with-subscription-check';
import {
	extractEdgesForConnections,
	extractNodesForConnections,
	formatConnectionContext,
} from '@/helpers/extract-connection-context';
import { createClient } from '@/helpers/supabase/server';
import { openai } from '@ai-sdk/openai';
import {
	convertToModelMessages,
	createUIMessageStream,
	createUIMessageStreamResponse,
	streamObject,
	UIMessage,
} from 'ai';
import { z } from 'zod';

// Zod schema for a single connection suggestion object from the AI
const connectionSuggestionSchema = z.object({
	id: z.string().describe('A unique ID for the suggestion.'),
	sourceNodeId: z
		.string()
		.describe('The ID of the source node for the connection.'),
	targetNodeId: z
		.string()
		.describe('The ID of the target node for the connection.'),
	label: z.string().nullable().describe('A concise label for the connection.'),
	reason: z
		.string()
		.describe('A brief explanation for why this connection is suggested.'),
	confidence: z
		.number()
		.min(0)
		.max(1)
		.describe("The AI's confidence in this suggestion."),
	relationshipType: z
		.enum([
			'related-to',
			'leads-to',
			'is-example-of',
			'depends-on',
			'contradicts',
			'supports',
			'elaborates-on',
			'summarizes',
			'implements',
			'extends',
			'references',
			'causes',
			'prevents',
			'enables',
			'questions',
			'answers',
		])
		.describe('The semantic type of the relationship.'),
	metadata: z.object({
		strength: z.enum(['weak', 'moderate', 'strong']),
		bidirectional: z.boolean(),
		contextualRelevance: z.number().min(0).max(1),
	}),
});

// The entire POST function is now the API route handler
export async function POST(req: Request) {
	// Capture abort signal for stream cancellation
	const abortSignal = req.signal;

	try {
		// Get authenticated user
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return new Response(
				JSON.stringify({
					error: 'Unauthorized. Please sign in to use AI features.',
				}),
				{ status: 401, headers: { 'Content-Type': 'application/json' } }
			);
		}

		// Check subscription and usage limits
		let hasProAccess = false;

		try {
			await requireSubscription(user, supabase, 'pro');
			hasProAccess = true;
		} catch (error) {
			if (error instanceof SubscriptionError) {
				const currentUsage = await getAIUsageCount(
					user,
					supabase,
					'connections'
				);
				const { allowed, limit, remaining } = await checkUsageLimit(
					user,
					supabase,
					'aiSuggestions',
					currentUsage
				);

				if (!allowed) {
					return new Response(
						JSON.stringify({
							error: `AI limit reached (${limit} per month). Upgrade to Pro.`,
							code: 'LIMIT_REACHED',
							currentUsage,
							limit,
							remaining,
							upgradeUrl: '/dashboard/settings/billing',
						}),
						{ status: 402, headers: { 'Content-Type': 'application/json' } }
					);
				}
			} else {
				throw error;
			}
		}

		// Extract the body sent by the useChat hook
		const { messages }: { messages: UIMessage[] } = await req.json();
		const streamHeader = 'Suggesting Connections';
		const totalSteps = [
			{
				id: 'validate-request',
				name: 'Validate Request',
				status: 'pending',
			},
			{
				id: 'fetch-data',
				name: 'Fetch Data',
				status: 'pending',
			},
			{
				id: 'analyze-data',
				name: 'Analyze Data',
				status: 'pending',
			},
			{
				id: 'generate-connections',
				name: 'Generate Connection Suggestions',
				status: 'pending',
			},
			{
				id: 'stream-results',
				name: 'Streaming Results',
				status: 'pending',
			},
		];

		return createUIMessageStreamResponse({
			stream: createUIMessageStream({
				execute: async ({ writer }) => {
					try {
						const wait = (ms: number) =>
							new Promise((resolve) => setTimeout(resolve, ms));

						writer.write({
							type: 'start',
						});

						writer.write({
							type: 'data-stream-info',
							data: {
								steps: totalSteps,
							},
						});

						writer.write({
							type: 'data-stream-status',
							data: {
								header: streamHeader,
								message: 'Validating request...',
								step: 1,
								stepName: totalSteps[0].name,
								totalSteps: totalSteps.length,
							},
						});

						await wait(1000);

						// Safely extract mapId from the last message's text part
						const lastUserMessage = messages
							.filter((m) => m.role === 'user')
							.pop();

						if (
							!lastUserMessage ||
							!lastUserMessage.parts.filter((part) => part.type === 'text')?.[0]
						) {
							throw new Error(
								'Invalid request format: User message not found.'
							);
						}

						const { mapId } = JSON.parse(
							lastUserMessage.parts.filter((part) => part.type === 'text')[0]
								.text
						);
						const mapValidation = z.string().uuid().safeParse(mapId);

						if (!mapValidation.success) {
							throw new Error(`Invalid Map ID: ${mapValidation.error.message}`);
						}

						// --- Step 2: Fetch Data ---
						writer.write({
							type: 'data-stream-status',
							data: {
								header: streamHeader,
								message: 'Fetching map data...',
								step: 2,
								stepName: totalSteps[1].name,
								totalSteps: totalSteps.length,
							},
						});

						await wait(1000);

						const { data: mapData, error } = await supabase
							.from('map_graph_aggregated_view')
							.select('nodes,edges')
							.eq('map_id', mapId)
							.single();

						if (error || mapData === null) {
							throw new Error(
								`Failed to fetch map data: ${error?.message || 'Not found'}`
							);
						}

						// --- Step 3: Prepare Context & Query AI ---
						writer.write({
							type: 'data-stream-status',
							data: {
								header: streamHeader,
								message: 'Analyzing node content...',
								step: 3,
								stepName: totalSteps[2].name,
								totalSteps: totalSteps.length,
							},
						});

						await wait(1000);

						// Extract only semantic content (filters ghost/comment nodes, excludes URLs/styling)
						const minimalNodes = extractNodesForConnections(mapData.nodes);
						const minimalEdges = extractEdgesForConnections(mapData.edges);
						const formattedContext = formatConnectionContext(
							minimalNodes,
							minimalEdges
						);

						const systemPrompt = `You are an expert at analyzing mind maps and discovering meaningful connections between concepts.

Given the following mind map content, suggest new connections that would add value.

Guidelines:
- Focus on semantic relationships, not structural ones
- Look for conceptual links: causes, dependencies, similarities, contradictions
- Avoid suggesting connections that already exist
- Each suggestion needs valid node IDs from the provided list

Restrictions:
- Only suggest connections with confidence > 0.8
- Return at most 6 suggestions, prioritized by confidence
- Quality over quantity: fewer strong suggestions beat many weak ones

${formattedContext}`;

						const modelMessages = await convertToModelMessages([
							{
								role: 'system',
								parts: [{ type: 'text', text: systemPrompt }],
							},
							{
								role: 'user',
								parts: [
									{
										type: 'text',
										text: 'Please suggest meaningful connections between these nodes.',
									},
								],
							},
						]);
						const response = streamObject({
							model: openai('gpt-5-nano'),
							abortSignal,
							schema: connectionSuggestionSchema,
							output: 'array',
							messages: modelMessages,
						});

						// --- Step 4: Stream Results ---
						writer.write({
							type: 'data-stream-status',
							data: {
								header: streamHeader,
								message: 'Generating results...',
								step: 4,
								stepName: totalSteps[3].name,
								totalSteps: totalSteps.length,
							},
						});

						await wait(1000);
						let status = 'pending';
						let connectionIndex = 0;

						for await (const element of response.elementStream) {
							if (status === 'pending') {
								status = 'streaming';
								writer.write({
									type: 'data-stream-status',
									data: {
										header: streamHeader,
										message: 'Streaming results...',
										step: 5,
										stepName: totalSteps[4].name,
										totalSteps: totalSteps.length,
									},
								});
							}

							if (connectionSuggestionSchema.safeParse(element).success) {
								writer.write({
									type: 'data-connection-suggestion',
									data: element,
								});
								connectionIndex++;
							}
						}

						writer.write({
							type: 'data-stream-info',
							data: {
								steps: totalSteps.map((step) => ({
									...step,
									status: 'completed',
								})),
							},
						});

						// Track usage for free tier users
						if (!hasProAccess) {
							await trackAIUsage(user, supabase, 'connections', {
								connectionCount: connectionIndex,
							});
						}

						writer.write({
							type: 'finish',
						});
					} catch (e) {
						const error =
							e instanceof Error ? e : new Error('An unknown error occurred.');
						console.error('Streaming process failed:', error);
						writer.write({
							type: 'data-stream-status',
							data: { header: streamHeader, error: error.message },
						});
					} finally {
						writer.write({ type: 'finish' });
					}
				},
			}),
		});
	} catch (e) {
		console.error('Error in POST handler:', e);
		return new Response(JSON.stringify({ error: 'Invalid request' }), {
			status: 400,
		});
	}
}
