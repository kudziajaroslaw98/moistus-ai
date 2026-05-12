import { buildSuggestionPromptContext } from '@/helpers/ai-suggestion-context';
import {
	getSuggestionStreamErrorMessage,
	processSuggestionElement,
	suggestionObjectSchema,
	toSuggestionChunk,
	type SuggestionComparisonEntry,
} from '@/helpers/ai-suggestion-postprocess';
import { getSuggestionSystemPrompt } from '@/helpers/ai-suggestion-prompts';
import {
	checkAIQuota,
	trackAIUsage,
} from '@/helpers/api/with-subscription-check';
import { createClient } from '@/helpers/supabase/server';
import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type {
	SuggestionContext,
	SuggestionHistoryEntry,
	SuggestionLens,
} from '@/types/ghost-node';
import { SUGGESTION_EXPLORATION_LENSES } from '@/types/ghost-node';
import { openai } from '@ai-sdk/openai';
import {
	createUIMessageStream,
	createUIMessageStreamResponse,
	streamObject,
	UIMessage,
} from 'ai';
import { z } from 'zod';

const RECENT_SUGGESTION_PROMPT_LIMIT = 8;

interface SuggestionRequestPayload {
	nodes: AppNode[];
	edges: AppEdge[];
	mapId: string;
	context: SuggestionContext;
	mapMeta?: {
		title?: string | null;
		description?: string | null;
	};
	recentSuggestions: SuggestionHistoryEntry[];
	selectedLenses: SuggestionLens[];
	clickIndex: number;
	requestNonce: string;
}

function isSuggestionLens(value: unknown): value is SuggestionLens {
	return (
		typeof value === 'string' &&
		SUGGESTION_EXPLORATION_LENSES.includes(value as SuggestionLens)
	);
}

function isSuggestionTrigger(
	value: unknown
): value is SuggestionContext['trigger'] {
	return (
		value === 'magic-wand' || value === 'dangling-edge' || value === 'auto'
	);
}

function parseRecentSuggestions(value: unknown): SuggestionHistoryEntry[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return value.flatMap((entry) => {
		if (
			!entry ||
			typeof entry !== 'object' ||
			typeof (entry as SuggestionHistoryEntry).content !== 'string' ||
			!isSuggestionTrigger((entry as SuggestionHistoryEntry).trigger)
		) {
			return [];
		}

		const content = (entry as SuggestionHistoryEntry).content.trim();
		if (!content) {
			return [];
		}

		return [
			{
				content,
				sourceNodeId:
					typeof (entry as SuggestionHistoryEntry).sourceNodeId === 'string'
						? (entry as SuggestionHistoryEntry).sourceNodeId
						: null,
				trigger: (entry as SuggestionHistoryEntry).trigger,
				timestamp:
					typeof (entry as SuggestionHistoryEntry).timestamp === 'string'
						? (entry as SuggestionHistoryEntry).timestamp
						: new Date().toISOString(),
			},
		];
	});
}

function parseSelectedLenses(value: unknown): SuggestionLens[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return Array.from(new Set(value.filter(isSuggestionLens))).slice(0, 2);
}

function parseSuggestionRequestPayload(
	requestData: Record<string, unknown>
): SuggestionRequestPayload {
	return {
		nodes: Array.isArray(requestData.nodes)
			? (requestData.nodes as AppNode[])
			: [],
		edges: Array.isArray(requestData.edges)
			? (requestData.edges as AppEdge[])
			: [],
		mapId: typeof requestData.mapId === 'string' ? requestData.mapId : '',
		context:
			requestData.context && typeof requestData.context === 'object'
				? (requestData.context as SuggestionContext)
				: ({ trigger: 'magic-wand' } as SuggestionContext),
		mapMeta:
			requestData.mapMeta && typeof requestData.mapMeta === 'object'
				? (requestData.mapMeta as SuggestionRequestPayload['mapMeta'])
				: undefined,
		recentSuggestions: parseRecentSuggestions(
			requestData.recentSuggestions
		).slice(-RECENT_SUGGESTION_PROMPT_LIMIT),
		selectedLenses: parseSelectedLenses(requestData.selectedLenses),
		clickIndex:
			typeof requestData.clickIndex === 'number' &&
			Number.isFinite(requestData.clickIndex)
				? Math.max(0, Math.floor(requestData.clickIndex))
				: 0,
		requestNonce:
			typeof requestData.requestNonce === 'string'
				? requestData.requestNonce
				: '',
	};
}

export const maxDuration = 30;

export async function POST(req: Request) {
	const abortSignal = req.signal;

	try {
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return new Response(
				JSON.stringify({
					error: 'Unauthorized. Please sign in to use AI suggestions.',
				}),
				{ status: 401, headers: { 'Content-Type': 'application/json' } }
			);
		}

		const {
			allowed,
			isPro: hasProAccess,
			error: quotaError,
		} = await checkAIQuota(user, supabase);
		if (!allowed && quotaError) {
			return quotaError;
		}

		const { messages }: { messages: UIMessage[] } = await req.json();
		const streamHeader = 'Generating Node Suggestions';
		const totalSteps = [
			{ id: 'validate-request', name: 'Validate Request', status: 'pending' },
			{ id: 'fetch-data', name: 'Fetch Data', status: 'pending' },
			{ id: 'build-context', name: 'Build Context', status: 'pending' },
			{
				id: 'generate-suggestions',
				name: 'Generate Node Suggestions',
				status: 'pending',
			},
			{ id: 'stream-results', name: 'Streaming Results', status: 'pending' },
		];

		return createUIMessageStreamResponse({
			stream: createUIMessageStream({
				execute: async ({ writer }) => {
					let isWholeMapSuggestion = false;

					try {
						const wait = (ms: number) =>
							new Promise((resolve) => setTimeout(resolve, ms));

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

						await wait(1000);

						const lastUserMessage = messages
							.filter((message) => message.role === 'user')
							.pop();
						const requestTextPart = lastUserMessage?.parts.find(
							(part) => part.type === 'text'
						);

						if (!requestTextPart || requestTextPart.type !== 'text') {
							throw new Error(
								'Invalid request format: User message not found.'
							);
						}

						const rawRequestData = JSON.parse(requestTextPart.text) as Record<
							string,
							unknown
						>;
						const requestData = parseSuggestionRequestPayload(rawRequestData);
						const {
							nodes,
							edges,
							mapId,
							context,
							mapMeta,
							recentSuggestions,
							selectedLenses,
							clickIndex,
							requestNonce,
						} = requestData;

						isWholeMapSuggestion = !context.sourceNodeId;

						if (!Array.isArray(rawRequestData.nodes)) {
							throw new Error('Invalid nodes data');
						}

						if (!Array.isArray(rawRequestData.edges)) {
							throw new Error('Invalid edges data');
						}

						const mapValidation = z.string().uuid().safeParse(mapId);
						if (!mapValidation.success) {
							throw new Error(`Invalid Map ID: ${mapValidation.error.message}`);
						}

						if (
							!rawRequestData.context ||
							typeof rawRequestData.context !== 'object' ||
							!isSuggestionTrigger(
								(rawRequestData.context as SuggestionContext).trigger
							)
						) {
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

						await wait(1000);

						writer.write({
							type: 'data-stream-status',
							data: {
								header: streamHeader,
								message: 'Building suggestion context...',
								step: 3,
								stepName: totalSteps[2].name,
								totalSteps: totalSteps.length,
							},
						});

						await wait(1000);

						const promptContext = buildSuggestionPromptContext({
							nodes,
							edges,
							mapMeta,
							context,
							selectedLenses,
							recentSuggestions,
							clickIndex,
							requestNonce,
						});
						isWholeMapSuggestion = promptContext.isWholeMapSuggestion;

						writer.write({
							type: 'data-stream-status',
							data: {
								header: streamHeader,
								message: 'Generating AI suggestions...',
								step: 4,
								stepName: totalSteps[3].name,
								totalSteps: totalSteps.length,
							},
						});

						await wait(1000);

						const result = streamObject({
							model: openai('gpt-5.4-mini'),

							abortSignal,
							output: 'array',
							schema: suggestionObjectSchema,
							providerOptions: {
								openai: {
									reasoningEffort: 'high', // Increases autonomous exploration
								},
							},
							messages: [
								{
									role: 'system',
									content: getSuggestionSystemPrompt(promptContext.graph.mode),
								},
								{
									role: 'user',
									content: promptContext.prompt,
								},
							],
						});

						const isManualTrigger = context.trigger === 'magic-wand';
						const minConfidence = isManualTrigger ? 0.4 : 0.6;
						const maxSuggestions = isManualTrigger ? 6 : 5;
						const validAnchorNodeIds = promptContext.isWholeMapSuggestion
							? new Set(promptContext.validAnchorNodeIds)
							: null;
						const emittedSuggestions: SuggestionComparisonEntry[] = [];
						let suggestionIndex = 0;
						let filteredCount = 0;
						let hasStartedStreaming = false;

						for await (const element of result.elementStream) {
							if (!hasStartedStreaming) {
								hasStartedStreaming = true;
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

							const processedSuggestion = processSuggestionElement({
								element,
								validAnchorNodeIds,
								requestContext: context,
								recentSuggestions,
								emittedSuggestions,
								minConfidence,
								maxSuggestions,
								emittedCount: suggestionIndex,
								aliasMap: promptContext.aliasMap,
							});

							if (!processedSuggestion) {
								filteredCount += 1;
								continue;
							}

							emittedSuggestions.push(processedSuggestion.comparisonEntry);
							writer.write(
								toSuggestionChunk({
									processedSuggestion,
									index: suggestionIndex,
									nodes,
								})
							);
							suggestionIndex += 1;
						}

						console.log(
							`Suggestions: ${suggestionIndex} sent, ${filteredCount} filtered (trigger: ${context.trigger}, threshold: ${minConfidence})`
						);

						writer.write({
							type: 'data-stream-info',
							data: {
								steps: totalSteps.map((step) => ({
									...step,
									status: 'completed',
								})),
							},
						});

						void Promise.resolve(
							trackAIUsage(user, supabase, hasProAccess)
						).catch((trackingError) => {
							console.warn(
								'Failed to track AI suggestions usage:',
								trackingError
							);
						});
					} catch (error) {
						console.error(
							'Streaming process failed:',
							error instanceof Error
								? error
								: new Error('An unknown error occurred.')
						);
						writer.write({
							type: 'data-stream-status',
							data: {
								header: streamHeader,
								error: getSuggestionStreamErrorMessage({
									error,
									isWholeMapSuggestion,
								}),
							},
						});
					} finally {
						writer.write({ type: 'finish' });
					}
				},
			}),
		});
	} catch (error) {
		console.error('Error in POST handler:', error);
		return new Response(JSON.stringify({ error: 'Invalid request' }), {
			status: 400,
		});
	}
}
