// src/app/api/ai/suggest-connections/route.ts

import {
	connectionSuggestionSchema,
	normalizeConnectionSuggestionElement,
} from '@/helpers/ai-connection-postprocess';
import { buildConnectionModelMessages } from '@/helpers/ai-connection-prompts';
import { parseConnectionRequestPayload } from '@/helpers/ai-connection-request';
import {
	checkAIQuota,
	trackAIUsage,
} from '@/helpers/api/with-subscription-check';
import {
	extractEdgesForConnections,
	extractNodesForConnections,
	formatConnectionContext,
} from '@/helpers/extract-connection-context';
import { createClient } from '@/helpers/supabase/server';
import { openai } from '@ai-sdk/openai';
import type { UIMessage } from 'ai';
import {
	createUIMessageStream,
	createUIMessageStreamResponse,
	streamObject,
} from 'ai';

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

						const { mapId } = parseConnectionRequestPayload(messages);

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

						const modelMessages =
							await buildConnectionModelMessages(formattedContext);
						const response = streamObject({
							model: openai('gpt-5.4-nano'),
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

							const normalizedElement =
								normalizeConnectionSuggestionElement(element);
							if (normalizedElement) {
								writer.write({
									type: 'data-connection-suggestion',
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
						void trackAIUsage(user, supabase, hasProAccess).catch(
							(trackingError) => {
								console.warn(
									'Failed to track AI suggest-connections usage:',
									trackingError
								);
							}
						);
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
