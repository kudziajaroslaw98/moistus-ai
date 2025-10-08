import { extractNodesContext } from '@/helpers/extract-node-context';
import { createClient } from '@/helpers/supabase/server';
import {
	requireSubscription,
	checkUsageLimit,
	getAIUsageCount,
	trackAIUsage,
	SubscriptionError,
} from '@/helpers/api/with-subscription-check';
import { openai } from '@ai-sdk/openai';
import {
	createUIMessageStream,
	createUIMessageStreamResponse,
	streamObject,
	UIMessage,
} from 'ai';
import { z } from 'zod';

// Zod schema for validating the AI's response structure
const aiResponseSchema = z.object({
	node1Id: z
		.string()
		.describe('The ID of the first node to merge (the one that will be kept).'),
	node2Id: z
		.string()
		.describe(
			'The ID of the second node to merge (the one that will be removed).'
		),
	reason: z
		.string()
		.describe('A brief explanation for why these nodes should be merged.'),
	similarityScore: z
		.number()
		.min(0)
		.max(1)
		.describe('A score indicating how similar the nodes are.'),
	confidence: z
		.number()
		.min(0)
		.max(1)
		.describe("A score indicating the AI's confidence in the suggestion."),
});

// Set maximum duration for the API route
export const maxDuration = 30;

export async function POST(req: Request) {
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
				const currentUsage = await getAIUsageCount(user, supabase, 'merges');
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
							remaining: remaining,
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
		const streamHeader = 'Suggesting Node Merges';
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
				id: 'analyze-nodes',
				name: 'Analyze Nodes',
				status: 'pending',
			},
			{
				id: 'generate-merges',
				name: 'Generate Merge Suggestions',
				status: 'pending',
			},
			{
				id: 'streaming-results',
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
								message: 'Fetching map nodes...',
								step: 2,
								stepName: totalSteps[1].name,
								totalSteps: totalSteps.length,
							},
						});

						await wait(1000);

						// Fetch all nodes for the given map
						const { data: nodesData, error: fetchError } = await supabase
							.from('nodes')
							.select('*')
							.eq('map_id', mapId);

						if (fetchError) {
							throw new Error(
								`Error fetching nodes for merge suggestion: ${fetchError.message}`
							);
						}

						if (!nodesData || nodesData.length < 2) {
							writer.write({
								type: 'data-stream-status',
								data: {
									header: streamHeader,
									message:
										'Not enough nodes to suggest merges (minimum 2 required).',
									step: totalSteps.length,
									stepName: 'Complete',
									totalSteps: totalSteps.length,
								},
							});

							writer.write({
								type: 'data-stream-info',
								data: {
									steps: totalSteps.map((step) => ({
										...step,
										status: 'completed',
									})),
								},
							});

							writer.write({
								type: 'finish',
							});
							return;
						}

						// --- Step 3: Analyze Nodes ---
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

						// Format node content for the AI prompt
						const nodeContentContext = extractNodesContext(nodesData);

						// --- Step 4: Generate Merge Suggestions ---
						writer.write({
							type: 'data-stream-status',
							data: {
								header: streamHeader,
								message: 'Generating merge suggestions...',
								step: 4,
								stepName: totalSteps[3].name,
								totalSteps: totalSteps.length,
							},
						});

						await wait(1000);

						// Construct the AI prompt
						const aiPrompt = `
							You are an expert at analyzing mind maps for redundancy. Your task is to identify pairs of nodes that cover overlapping topics or are semantically similar enough to be merged.

							Given the following list of mind map nodes (in 'ID: Content' format), provide suggestions for merges.

							Guidelines:
							- Focus on conceptual similarity, not just keyword matches.
							- The first node (node1Id) in a pair should be the one that is kept, and the second (node2Id) will be merged into it.
							- Provide a concise reason for each suggestion.
							- Provide a confidence score indicating the AI's confidence in the suggestion.
							- Provide a similarity score indicating the AI's confidence in the similarity between the two nodes.
							- Do not suggest merging a node with itself.
							- Ensure your response is a valid JSON object that adheres to the provided schema.

							Restrictions:
							- Do not provide connections with similarity below 0.8
							- Do not provide connections with confidence below 0.8
						`;

						// Call the AI using the Vercel AI SDK's streamObject
						const result = streamObject({
							model: openai('o4-mini'),
							output: 'array',
							schema: aiResponseSchema,
							messages: [
								{
									role: 'system',
									content: aiPrompt,
								},
								{
									role: 'user',
									content: `Please suggest meaningful merge suggestions.
									Node Context:
									${nodeContentContext}`,
								},
							],
						});

						// Stream individual merge suggestions
						const validNodeIds = new Set(nodesData.map((node) => node.id));
						const processedPairs = new Set<string>();
						let status = 'pending';
						let mergeCount = 0;

						for await (const element of result.elementStream) {
							if (status === 'pending') {
								status = 'streaming';
								writer.write({
									type: 'data-stream-status',
									data: {
										header: streamHeader,
										message: 'Streaming merge suggestions...',
										step: 5,
										stepName: totalSteps[4].name,
										totalSteps: totalSteps.length,
									},
								});
							}

							if (aiResponseSchema.safeParse(element).success) {
								// Validate IDs and avoid duplicates
								if (
									validNodeIds.has(element.node1Id) &&
									validNodeIds.has(element.node2Id) &&
									element.node1Id !== element.node2Id
								) {
									// Avoid duplicate pairs (e.g., A-B and B-A)
									const pairKey = [element.node1Id, element.node2Id]
										.sort()
										.join('-');

									if (!processedPairs.has(pairKey)) {
										processedPairs.add(pairKey);

										writer.write({
											type: 'data-merge-suggestion',
											data: element,
										});
										mergeCount++;
									}
								}
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
							await trackAIUsage(user, supabase, 'merges', {
								mergeCount,
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
