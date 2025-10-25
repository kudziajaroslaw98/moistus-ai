import {
	checkUsageLimit,
	getAIUsageCount,
	requireSubscription,
	SubscriptionError,
	trackAIUsage,
} from '@/helpers/api/with-subscription-check';
import { extractNodesContext } from '@/helpers/extract-node-context';
import { createClient } from '@/helpers/supabase/server';
import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type { SuggestionContext } from '@/types/ghost-node';
import { openai } from '@ai-sdk/openai';
import {
	createUIMessageStream,
	createUIMessageStreamResponse,
	streamObject,
	UIMessage,
} from 'ai';
import { z } from 'zod';

// Schema for a single counterpoint suggestion object from the AI
const counterpointSuggestionSchema = z.object({
	id: z
		.string()
		.describe('A unique identifier for the suggestion, typically UUID.'),
	content: z.string().describe('Concise content of the counterpoint.'),
	nodeType: z
		.enum([
			'defaultNode',
			'textNode',
			'resourceNode',
			'annotationNode',
			'taskNode',
		] as const)
		.describe('The node type suitable for this counterpoint.'),
	confidence: z
		.number()
		.min(0)
		.max(1)
		.describe("AI's confidence from 0.0 to 1.0."),
	position: z
		.object({ x: z.number(), y: z.number() })
		.describe('Initial canvas position (may be overridden on client).'),
	context: z
		.object({
			sourceNodeId: z.string().nullable().optional(),
			targetNodeId: z.string().nullable().optional(),
			relationshipType: z
				.enum([
					'contradicts',
					'risk',
					'alternative',
					'test-of',
					'mitigates',
					'questions',
				] as const)
				.nullable()
				.optional(),
			trigger: z.enum(['magic-wand', 'auto']),
			// Optional metadata used by UI/telemetry if present
			stance: z
				.enum(['counterargument', 'risk', 'alternative', 'test'])
				.nullable()
				.optional(),
			citations: z
				.array(z.object({ title: z.string(), url: z.string().url() }))
				.optional(),
		})
		.describe('Enriched context for this suggestion.'),
	reasoning: z.string().nullable().optional(),
});

export const maxDuration = 30;

export async function POST(req: Request) {
	// Capture abort signal for stream cancellation
	const abortSignal = req.signal;

	try {
		// Auth
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

		// Subscription / limits
		let hasProAccess = false;

		try {
			await requireSubscription(user, supabase, 'pro');
			hasProAccess = true;
		} catch (error) {
			if (error instanceof SubscriptionError) {
				const currentUsage = await getAIUsageCount(
					user,
					supabase,
					'counterpoints'
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
							error: `AI limit reached (${limit} per month). Upgrade to Pro for unlimited AI counterpoints.`,
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

		// Extract messages from useChat
		const { messages }: { messages: UIMessage[] } = await req.json();
		const streamHeader = 'Generating Counterpoints';
		const totalSteps = [
			{ id: 'validate-request', name: 'Validate Request', status: 'pending' },
			{ id: 'fetch-data', name: 'Fetch Data', status: 'pending' },
			{ id: 'build-context', name: 'Build Context', status: 'pending' },
			{ id: 'generate', name: 'Generate Counterpoints', status: 'pending' },
			{ id: 'stream-results', name: 'Streaming Results', status: 'pending' },
		];

		return createUIMessageStreamResponse({
			stream: createUIMessageStream({
				execute: async ({ writer }) => {
					try {
						const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

						writer.write({ type: 'start' });
						writer.write({
							type: 'data-stream-info',
							data: { steps: totalSteps },
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

						await wait(300);

						const lastUserMessage = messages
							.filter((m) => m.role === 'user')
							.pop();
						if (
							!lastUserMessage ||
							!lastUserMessage.parts.filter((p) => p.type === 'text')?.[0]
						) {
							throw new Error(
								'Invalid request format: User message not found.'
							);
						}

						const requestData = JSON.parse(
							lastUserMessage.parts.filter((p) => p.type === 'text')[0].text
						);

						const { nodes, edges, mapId, context } = requestData as {
							nodes: AppNode[];
							edges: AppEdge[];
							mapId: string;
							context: SuggestionContext & { trigger: 'magic-wand' | 'auto' };
						};

						if (!Array.isArray(nodes) || !Array.isArray(edges)) {
							throw new Error('Invalid nodes or edges data.');
						}

						const mapValidation = z.string().uuid().safeParse(mapId);
						if (!mapValidation.success) {
							throw new Error(`Invalid Map ID: ${mapValidation.error.message}`);
						}

						if (!context || !context.trigger) {
							throw new Error('Invalid context data');
						}

						writer.write({
							type: 'data-stream-status',
							data: {
								header: streamHeader,
								message: 'Processing mind map data...',
								step: 2,
								stepName: totalSteps[1].name,
								totalSteps: totalSteps.length,
							},
						});

						await wait(300);

						// Build compact focus context
						writer.write({
							type: 'data-stream-status',
							data: {
								header: streamHeader,
								message: 'Building counterpoint context...',
								step: 3,
								stepName: totalSteps[2].name,
								totalSteps: totalSteps.length,
							},
						});

						await wait(300);

						const focusNode = context.sourceNodeId
							? nodes.find((n) => n.id === context.sourceNodeId)
							: undefined;
						const vicinityNodes = getRelevantNodes(nodes, edges, context);
						const contextString = extractNodesContext(
							vicinityNodes.map((n) => n.data)
						).join('\n');

						writer.write({
							type: 'data-stream-status',
							data: {
								header: streamHeader,
								message: 'Generating counterpoints...',
								step: 4,
								stepName: totalSteps[3].name,
								totalSteps: totalSteps.length,
							},
						});

						await wait(300);

						const SYSTEM_PROMPT = `You generate rigorous counterpoints to a focus idea.
Return 1–4 items. Each item must be concise (<= 180 chars) and mapped as:
- stance: counterargument|risk|alternative|test
- relationshipType: contradicts|risk|alternative|test-of|mitigates|questions
- nodeType: defaultNode|textNode|annotationNode|taskNode|resourceNode
Only include citations if they are real (never fabricate). Avoid redundancy.
`;

						const USER_PROMPT = `Focus: ${focusNode?.data.content || '(no focus)'}
Context:\n${contextString}`;

						const result = streamObject({
							model: openai('o4-mini'),
							abortSignal,
							output: 'array',
							schema: counterpointSuggestionSchema,
							messages: [
								{ role: 'system', content: SYSTEM_PROMPT },
								{ role: 'user', content: USER_PROMPT },
							],
						});

						let index = 0;
						let status: 'pending' | 'streaming' = 'pending';
						for await (const element of result.elementStream) {
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

							if (counterpointSuggestionSchema.safeParse(element).success) {
								writer.write({
									type: 'data-node-suggestion',
									data: { ...element, index: index++ },
								});
							}
						}

						if (!hasProAccess) {
							await trackAIUsage(user, supabase, 'counterpoints', {
								mapId,
								trigger: context.trigger,
								count: index,
							});
						}

						writer.write({ type: 'finish' });
					} catch (e) {
						const error = e instanceof Error ? e : new Error('Unknown error');
						console.error('Counterpoints stream failed:', error);
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
		console.error('Error in counterpoints POST handler:', e);
		return new Response(JSON.stringify({ error: 'Invalid request' }), {
			status: 400,
		});
	}
}

// Utilities borrowed from suggestions route to gather relevant context
function getRelevantNodes(
	nodes: AppNode[],
	edges: AppEdge[],
	context: SuggestionContext
): AppNode[] {
	if (context.sourceNodeId) {
		const sourceNode = nodes.find((n) => n.id === context.sourceNodeId);
		if (sourceNode) {
			return [
				sourceNode,
				...getConnectedNodes(nodes, edges, context.sourceNodeId),
			].slice(0, 6);
		}
	}

	return nodes.slice(-6);
}

function getConnectedNodes(
	nodes: AppNode[],
	edges: AppEdge[],
	nodeId: string
): AppNode[] {
	if (!nodeId || !edges || !nodes) return [];
	const connectedEdges = edges.filter(
		(e) => e.source === nodeId || e.target === nodeId
	);
	const connectedNodeIds = new Set(
		connectedEdges.map((edge) =>
			edge.source === nodeId ? edge.target : edge.source
		)
	);
	return nodes.filter((node) => connectedNodeIds.has(node.id));
}

