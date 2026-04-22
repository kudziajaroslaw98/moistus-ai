jest.mock('@/helpers/api/with-subscription-check', () => ({
	checkAIQuota: jest.fn(),
	trackAIUsage: jest.fn(),
}));

jest.mock('@/helpers/supabase/server', () => ({
	createClient: jest.fn(),
}));

jest.mock('@/helpers/ai-suggestion-context', () => ({
	buildSuggestionPromptContext: jest.fn(),
}));

jest.mock('@/helpers/ai-suggestion-prompts', () => ({
	getSuggestionSystemPrompt: jest.fn(),
}));

jest.mock('@/helpers/ai-suggestion-postprocess', () => ({
	suggestionObjectSchema: {},
	processSuggestionElement: jest.fn(),
	toSuggestionChunk: jest.fn(),
	getSuggestionStreamErrorMessage: jest.fn(() => 'stream failed'),
}));

jest.mock('@ai-sdk/openai', () => ({
	openai: jest.fn(() => 'mock-model'),
}));

jest.mock('ai', () => ({
	createUIMessageStream: jest.fn(),
	createUIMessageStreamResponse: jest.fn(),
	streamObject: jest.fn(),
	UIMessage: class UIMessage {},
}));

import { checkAIQuota } from '@/helpers/api/with-subscription-check';
import { buildSuggestionPromptContext } from '@/helpers/ai-suggestion-context';
import {
	getSuggestionStreamErrorMessage,
	processSuggestionElement,
	toSuggestionChunk,
} from '@/helpers/ai-suggestion-postprocess';
import { getSuggestionSystemPrompt } from '@/helpers/ai-suggestion-prompts';
import { createClient } from '@/helpers/supabase/server';
import {
	createUIMessageStream,
	createUIMessageStreamResponse,
	streamObject,
} from 'ai';
import { POST } from './route';

const mockedCheckAIQuota = jest.mocked(checkAIQuota);
const mockedBuildSuggestionPromptContext = jest.mocked(
	buildSuggestionPromptContext
);
const mockedProcessSuggestionElement = jest.mocked(processSuggestionElement);
const mockedToSuggestionChunk = jest.mocked(toSuggestionChunk);
const mockedGetSuggestionSystemPrompt = jest.mocked(getSuggestionSystemPrompt);
const mockedCreateClient = jest.mocked(createClient);
const mockedCreateUIMessageStream = jest.mocked(createUIMessageStream);
const mockedCreateUIMessageStreamResponse = jest.mocked(
	createUIMessageStreamResponse
);
const mockedStreamObject = jest.mocked(streamObject);
const mockedGetSuggestionStreamErrorMessage = jest.mocked(
	getSuggestionStreamErrorMessage
);

type StreamExecute = (params: {
	writer: { write: (chunk: unknown) => void };
}) => Promise<void>;

let executeStream: StreamExecute | null = null;

async function runCapturedStream() {
	if (!executeStream) {
		throw new Error('Stream execute function was not captured.');
	}

	const writes: unknown[] = [];
	await executeStream({
		writer: {
			write: (chunk: unknown) => {
				writes.push(chunk);
			},
		},
	});
	return writes;
}

describe('/api/ai/suggestions route', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		executeStream = null;

		mockedCreateClient.mockResolvedValue({
			auth: {
				getUser: jest.fn().mockResolvedValue({
					data: {
						user: {
							id: 'user-1',
						},
					},
				}),
			},
		} as never);

		mockedCheckAIQuota.mockResolvedValue({
			allowed: true,
			isPro: false,
			error: null,
		} as never);

		mockedBuildSuggestionPromptContext.mockReturnValue({
			graph: {
				mode: 'full-map',
			},
			graphRows: ['MAP=["Launch Map","Roadmap",2,1]'],
			prompt: 'PROMPT_SENTINEL',
			validAnchorNodeIds: ['anchor-1'],
			isWholeMapSuggestion: true,
			aliasMap: {
				nodeIdToAlias: new Map([['anchor-1', 1]]),
				aliasToNodeId: new Map([[1, 'anchor-1']]),
			},
		} as never);

		mockedGetSuggestionSystemPrompt.mockReturnValue('SYSTEM_SENTINEL');

		mockedStreamObject.mockReturnValue({
			elementStream: (async function* () {
				yield { id: 'raw-suggestion' };
			})(),
		} as never);

		mockedProcessSuggestionElement.mockReturnValue({
			suggestion: {
				id: 'suggestion-1',
				content: 'Clarify collaborator limit state before upgrade wall',
					nodeType: 'taskNode',
					nodePayload: {
						title: 'Upgrade copy fixes',
						taskTexts: [
							'Explain collaborator limits before the upgrade gate',
							'Show current collaborator count next to the limit',
						],
					answer: null,
					questionType: null,
					annotationType: null,
					language: null,
					fileName: null,
				},
				confidence: 0.88,
				position: { x: 0, y: 0 },
				context: {
					sourceNodeId: 'anchor-1',
					targetNodeId: null,
					relationshipType: 'reduces confusion',
					trigger: 'magic-wand',
				},
				reasoning: 'This addresses a concrete confusion point before upgrade.',
			},
			resolvedSourceNodeId: 'anchor-1',
			comparisonEntry: {
				content: 'Clarify collaborator limit state before upgrade wall',
				sourceNodeId: 'anchor-1',
			},
		});

		mockedToSuggestionChunk.mockReturnValue({
			type: 'data-node-suggestion',
			data: {
				id: 'suggestion-1',
			},
		} as never);

		mockedCreateUIMessageStream.mockImplementation(({ execute }) => ({ execute }) as never);
		mockedCreateUIMessageStreamResponse.mockImplementation(({ stream }) => {
			executeStream = (stream as unknown as { execute: StreamExecute }).execute;
			return new Response(null, { status: 200 });
		});
	});

	it('keeps native streamObject and sends the extracted prompt context to the model', async () => {
		const response = await POST(
			new Request('http://localhost/api/ai/suggestions', {
				method: 'POST',
				body: JSON.stringify({
					messages: [
						{
							role: 'user',
							parts: [
								{
									type: 'text',
									text: JSON.stringify({
										nodes: [],
										edges: [],
										mapId: '123e4567-e89b-12d3-a456-426614174000',
										context: {
											trigger: 'magic-wand',
										},
										selectedLenses: ['risk', 'dependency'],
										recentSuggestions: [
											{
												content: 'Add retry budget for sync failures',
												sourceNodeId: 'anchor-1',
												trigger: 'magic-wand',
												timestamp: '2026-04-15T00:00:00.000Z',
											},
										],
										clickIndex: 3,
										requestNonce: 'nonce-1',
									}),
								},
							],
						},
					],
				}),
			})
		);

		await runCapturedStream();

		expect(response.status).toBe(200);
		expect(mockedBuildSuggestionPromptContext).toHaveBeenCalledWith(
			expect.objectContaining({
				clickIndex: 3,
				requestNonce: 'nonce-1',
				selectedLenses: ['risk', 'dependency'],
			})
		);
		expect(mockedGetSuggestionSystemPrompt).toHaveBeenCalledWith('full-map');
		expect(mockedStreamObject).toHaveBeenCalledWith(
			expect.objectContaining({
				messages: [
					{
						role: 'system',
						content: 'SYSTEM_SENTINEL',
					},
					{
						role: 'user',
						content: 'PROMPT_SENTINEL',
					},
				],
			})
		);
		expect(mockedProcessSuggestionElement).toHaveBeenCalled();
		expect(mockedProcessSuggestionElement).toHaveBeenCalledWith(
			expect.objectContaining({
				aliasMap: expect.objectContaining({
					nodeIdToAlias: expect.any(Map),
					aliasToNodeId: expect.any(Map),
				}),
			})
		);
		expect(mockedToSuggestionChunk).toHaveBeenCalled();
		expect(mockedGetSuggestionStreamErrorMessage).not.toHaveBeenCalled();
	});

	it('can stream more than one valid processed suggestion in a single request', async () => {
		mockedStreamObject.mockReturnValue({
			elementStream: (async function* () {
				yield { id: 'raw-suggestion-1' };
				yield { id: 'raw-suggestion-2' };
			})(),
		} as never);

		mockedProcessSuggestionElement.mockImplementation(({ element }) => {
			const rawElement = element as { id?: string };
			switch (rawElement.id) {
				case 'raw-suggestion-1':
					return {
						suggestion: {
							id: 'suggestion-1',
							content: 'Clarify collaborator limit state before upgrade wall',
								nodeType: 'taskNode',
								nodePayload: {
									title: 'Upgrade copy fixes',
									taskTexts: [
										'Explain collaborator limits before the upgrade gate',
									],
									answer: null,
								questionType: null,
								annotationType: null,
								language: null,
								fileName: null,
							},
							confidence: 0.88,
							position: { x: 0, y: 0 },
							context: {
								sourceNodeId: 'anchor-1',
								targetNodeId: null,
								relationshipType: 'reduces confusion',
								trigger: 'magic-wand',
							},
							reasoning:
								'This addresses a concrete confusion point before upgrade.',
						},
						resolvedSourceNodeId: 'anchor-1',
						comparisonEntry: {
							content: 'Clarify collaborator limit state before upgrade wall',
							sourceNodeId: 'anchor-1',
						},
					};
				case 'raw-suggestion-2':
					return {
						suggestion: {
							id: 'suggestion-2',
							content: 'Surface collaborator overage recovery steps',
							nodeType: 'defaultNode',
							nodePayload: null,
							confidence: 0.82,
							position: { x: 0, y: 0 },
							context: {
								sourceNodeId: 'anchor-1',
								targetNodeId: null,
								relationshipType: 'reduces confusion',
								trigger: 'magic-wand',
							},
							reasoning: 'This complements the first suggestion.',
						},
						resolvedSourceNodeId: 'anchor-1',
						comparisonEntry: {
							content: 'Surface collaborator overage recovery steps',
							sourceNodeId: 'anchor-1',
						},
					};
				default:
					return null;
			}
		});

		mockedToSuggestionChunk.mockImplementation(({ processedSuggestion, index }) => ({
			type: 'data-node-suggestion',
			data: {
				id: processedSuggestion.suggestion.id,
				index,
			},
		}) as never);

		await POST(
			new Request('http://localhost/api/ai/suggestions', {
				method: 'POST',
				body: JSON.stringify({
					messages: [
						{
							role: 'user',
							parts: [
								{
									type: 'text',
									text: JSON.stringify({
										nodes: [],
										edges: [],
										mapId: '123e4567-e89b-12d3-a456-426614174000',
										context: {
											trigger: 'magic-wand',
										},
										selectedLenses: ['risk', 'dependency'],
										recentSuggestions: [],
										clickIndex: 3,
										requestNonce: 'nonce-2',
									}),
								},
							],
						},
					],
				}),
			})
		);

		const writes = await runCapturedStream();
		const suggestionChunks = writes.filter(
			(chunk) => (chunk as { type?: string }).type === 'data-node-suggestion'
		) as Array<{ type: string; data: { id: string; index: number } }>;

		expect(mockedProcessSuggestionElement).toHaveBeenCalledTimes(2);
		expect(suggestionChunks).toHaveLength(2);
		expect(
			suggestionChunks.map((chunk) => ({
				id: chunk.data.id,
				index: chunk.data.index,
			}))
		).toEqual([
			{ id: 'suggestion-1', index: 0 },
			{ id: 'suggestion-2', index: 1 },
		]);
	});
});
