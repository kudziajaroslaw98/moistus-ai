import { buildCounterpointPromptContext } from '@/helpers/ai-counterpoint-context';
import {
	counterpointSuggestionSchema,
	normalizeCounterpointSuggestionElement,
} from '@/helpers/ai-counterpoint-postprocess';
import {
	buildCounterpointUserPrompt,
	getCounterpointSystemPrompt,
} from '@/helpers/ai-counterpoint-prompts';
import { parseCounterpointRequestPayload } from '@/helpers/ai-counterpoint-request';
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

						const requestData = parseCounterpointRequestPayload(messages);

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

						const promptContext = buildCounterpointPromptContext(requestData);

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

						const result = streamObject({
							model: openai('gpt-5.4-mini'),
							abortSignal,
							output: 'array',
							schema: counterpointSuggestionSchema,
							messages: [
								{
									role: 'system',
									content: getCounterpointSystemPrompt(),
								},
								{
									role: 'user',
									content: buildCounterpointUserPrompt(
										promptContext.contextRows
									),
								},
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

							const normalizedElement = normalizeCounterpointSuggestionElement(
								element,
								promptContext.aliasMap
							);
							if (normalizedElement) {
								writer.write({
									type: 'data-node-suggestion',
									data: { ...normalizedElement, index: index++ },
								});
							}
						}

						await trackAIUsage(user, supabase, hasProAccess);
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
