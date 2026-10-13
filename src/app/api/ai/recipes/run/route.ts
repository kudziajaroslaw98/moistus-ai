import { buildRecipePromptContext } from '@/helpers/ai-recipe-context';
import {
	buildRecipeOutputSchema,
	getRecipeComparisonEntries,
	processRecipeElement,
	toRecipeChunk,
} from '@/helpers/ai-recipe-postprocess';
import {
	buildRecipeUserPrompt,
	getRecipeSystemPrompt,
} from '@/helpers/ai-recipe-prompts';
import { parseRecipeRunRequest } from '@/helpers/ai-recipe-request';
import type { SuggestionComparisonEntry } from '@/helpers/ai-suggestion-postprocess';
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

export const maxDuration = 60;

const STEPS = [
	{ id: 'build-context', name: 'Read map', status: 'pending' },
	{ id: 'generate', name: 'Run recipe', status: 'pending' },
	{ id: 'stream-results', name: 'Streaming results', status: 'pending' },
];

/** Runs a recipe (saved, starter or unsaved draft) and streams ghost suggestions. */
export async function POST(req: Request) {
	const abortSignal = req.signal;

	try {
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return new Response(
				JSON.stringify({ error: 'Unauthorized. Please sign in to use AI features.' }),
				{ status: 401, headers: { 'Content-Type': 'application/json' } }
			);
		}

		const { allowed, isPro, error: quotaError } = await checkAIQuota(user, supabase);
		if (!allowed && quotaError) {
			return quotaError;
		}

		const { messages } = (await req.json()) as { messages: UIMessage[] };

		return createUIMessageStreamResponse({
			stream: createUIMessageStream({
				execute: async ({ writer }) => {
					let header = 'Running recipe';
					const writeStatus = (step: number, message: string) =>
						writer.write({
							type: 'data-stream-status',
							data: {
								header,
								message,
								step,
								stepName: STEPS[step - 1].name,
								totalSteps: STEPS.length,
							},
						});

					try {
						writer.write({ type: 'start' });
						writer.write({ type: 'data-stream-info', data: { steps: STEPS } });

						const request = parseRecipeRunRequest(messages);
						const { recipe } = request;
						header = recipe.definition.title;

						writeStatus(1, 'Reading the map...');
						const promptContext = buildRecipePromptContext(request);

						writeStatus(2, 'Running recipe...');
						const schema = buildRecipeOutputSchema(recipe.definition);
						const result = streamObject({
							model: openai('gpt-6-luna'),
							abortSignal,
							output: 'array',
							schema,
							instructions: getRecipeSystemPrompt(),
							messages: [
								{
									role: 'user',
									content: buildRecipeUserPrompt({
										definition: recipe.definition,
										graphRows: promptContext.graphRows,
										focusNodeId: promptContext.focusNodeId,
										aliasMap: promptContext.aliasMap,
									}),
								},
							],
							providerOptions: {
								openai: { reasoningEffort: 'medium', reasoningSummary: null },
							},
						});

						const existingEntries = getRecipeComparisonEntries(promptContext.graph);
						const emittedEntries: SuggestionComparisonEntry[] = [];
						let isStreaming = false;

						for await (const element of result.elementStream) {
							if (!isStreaming) {
								isStreaming = true;
								writeStatus(3, 'Streaming results...');
							}

							const processed = processRecipeElement({
								element,
								schema,
								recipe,
								promptContext,
								existingEntries,
								emittedEntries,
								createId: () => crypto.randomUUID(),
							});
							if (!processed) continue;

							writer.write(
								toRecipeChunk({
									suggestion: processed.suggestion,
									index: emittedEntries.length,
									nodes: request.nodes,
								})
							);
							emittedEntries.push(processed.comparisonEntry);
						}

						await trackAIUsage(user, supabase, isPro);
					} catch (e) {
						const error = e instanceof Error ? e : new Error('Unknown error');
						console.error('Recipe stream failed:', error);
						writer.write({
							type: 'data-stream-status',
							data: { header, error: error.message },
						});
					} finally {
						writer.write({ type: 'finish' });
					}
				},
			}),
		});
	} catch (e) {
		console.error('Error in recipes/run POST handler:', e);
		return new Response(JSON.stringify({ error: 'Invalid request' }), {
			status: 400,
		});
	}
}
