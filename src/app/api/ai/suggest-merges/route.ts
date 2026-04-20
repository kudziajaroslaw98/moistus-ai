import { buildMergePromptContext } from '@/helpers/ai-merge-context';
import {
	mergeSuggestionSchema,
	processMergeSuggestionElement,
} from '@/helpers/ai-merge-postprocess';
import {
	buildMergeUserPrompt,
	getMergeSystemPrompt,
} from '@/helpers/ai-merge-prompts';
import { parseMergeRequestPayload } from '@/helpers/ai-merge-request';
import {
	checkAIQuota,
	trackAIUsage,
} from '@/helpers/api/with-subscription-check';
import { createClient } from '@/helpers/supabase/server';
import { openai } from '@ai-sdk/openai';
import type { UIMessage } from 'ai';
import {
	createUIMessageStream,
	createUIMessageStreamResponse,
	streamObject,
} from 'ai';

// Set maximum duration for the API route
export const maxDuration = 30;

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

		// Check AI quota
		const {
			allowed,
			isPro: hasProAccess,
			error: quotaError,
		} = await checkAIQuota(user, supabase);
		if (!allowed && quotaError) {
			return quotaError;
		}

		const { messages } = (await req.json()) as { messages: UIMessage[] };
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

						const { mapId } = parseMergeRequestPayload(messages);

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
						const promptContext = buildMergePromptContext(nodesData);

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

						const result = streamObject({
							model: openai('gpt-5.4-nano'),
							abortSignal,
							output: 'array',
							schema: mergeSuggestionSchema,
							messages: [
								{
									role: 'system',
									content: getMergeSystemPrompt(),
								},
								{
									role: 'user',
									content: buildMergeUserPrompt(promptContext.nodeRows),
								},
							],
						});

						const processedPairs = new Set<string>();
						let status = 'pending';

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

							const normalizedElement = processMergeSuggestionElement({
								element,
								aliasMap: promptContext.aliasMap,
								validNodeIds: promptContext.validNodeIds,
								processedPairs,
							});
							if (normalizedElement) {
								writer.write({
									type: 'data-merge-suggestion',
									data: normalizedElement,
								});
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

						// Track usage (no-ops for Pro)
						await trackAIUsage(user, supabase, hasProAccess);
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
