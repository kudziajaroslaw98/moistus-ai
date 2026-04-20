jest.mock('@/helpers/api/with-subscription-check', () => ({
	checkAIQuota: jest.fn(),
	trackAIUsage: jest.fn(),
}));

jest.mock('@/helpers/supabase/server', () => ({
	createClient: jest.fn(),
}));

jest.mock('@/helpers/ai-counterpoint-context', () => ({
	buildCounterpointPromptContext: jest.fn(),
}));

jest.mock('@/helpers/ai-counterpoint-prompts', () => ({
	buildCounterpointUserPrompt: jest.fn(),
	getCounterpointSystemPrompt: jest.fn(),
}));

jest.mock('@/helpers/ai-counterpoint-postprocess', () => ({
	counterpointSuggestionSchema: {},
	normalizeCounterpointSuggestionElement: jest.fn(),
}));

jest.mock('@ai-sdk/openai', () => ({
	openai: jest.fn(() => 'mock-model'),
}));

jest.mock('ai', () => ({
	createUIMessageStream: jest.fn(),
	createUIMessageStreamResponse: jest.fn(),
	streamObject: jest.fn(),
}));

import { checkAIQuota, trackAIUsage } from '@/helpers/api/with-subscription-check';
import { buildCounterpointPromptContext } from '@/helpers/ai-counterpoint-context';
import {
	buildCounterpointUserPrompt,
	getCounterpointSystemPrompt,
} from '@/helpers/ai-counterpoint-prompts';
import { normalizeCounterpointSuggestionElement } from '@/helpers/ai-counterpoint-postprocess';
import { createClient } from '@/helpers/supabase/server';
import {
	createUIMessageStream,
	createUIMessageStreamResponse,
	streamObject,
} from 'ai';
import { POST } from './route';

type StreamExecute = (params: {
	writer: { write: (chunk: unknown) => void };
}) => Promise<void>;

const mockedCheckAIQuota = jest.mocked(checkAIQuota);
const mockedTrackAIUsage = jest.mocked(trackAIUsage);
const mockedBuildCounterpointPromptContext = jest.mocked(
	buildCounterpointPromptContext
);
const mockedBuildCounterpointUserPrompt = jest.mocked(buildCounterpointUserPrompt);
const mockedGetCounterpointSystemPrompt = jest.mocked(
	getCounterpointSystemPrompt
);
const mockedNormalizeCounterpointSuggestionElement = jest.mocked(
	normalizeCounterpointSuggestionElement
);
const mockedCreateClient = jest.mocked(createClient);
const mockedCreateUIMessageStream = jest.mocked(createUIMessageStream);
const mockedCreateUIMessageStreamResponse = jest.mocked(
	createUIMessageStreamResponse
);
const mockedStreamObject = jest.mocked(streamObject);

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

describe('/api/ai/counterpoints route', () => {
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

		mockedBuildCounterpointPromptContext.mockReturnValue({
			aliasMap: {
				nodeIdToAlias: new Map([['focus-node', 1]]),
				aliasToNodeId: new Map([[1, 'focus-node']]),
			},
			contextRows: ['NODE=[1,"task","Focus node",[]]'],
		});

		mockedGetCounterpointSystemPrompt.mockReturnValue('SYSTEM_SENTINEL');
		mockedBuildCounterpointUserPrompt.mockReturnValue('USER_SENTINEL');
		mockedNormalizeCounterpointSuggestionElement.mockReturnValue({
			id: 'cp-1',
			content: 'Challenge the rollout assumptions',
			nodeType: 'defaultNode',
			confidence: 0.88,
			position: { x: 0, y: 0 },
			context: {
				sourceNodeId: 'focus-node',
				targetNodeId: null,
				relationshipType: 'questions',
				trigger: 'magic-wand',
			},
			reasoning: 'It tests the branch against a missing challenge.',
		} as never);

		mockedStreamObject.mockReturnValue({
			elementStream: (async function* () {
				yield { id: 'raw-counterpoint' };
			})(),
		} as never);

		mockedCreateUIMessageStream.mockImplementation(
			({ execute }) => ({ execute }) as never
		);
		mockedCreateUIMessageStreamResponse.mockImplementation(({ stream }) => {
			executeStream = (stream as unknown as { execute: StreamExecute }).execute;
			return new Response(null, { status: 200 });
		});
	});

	it('keeps streamObject and sends the extracted counterpoint prompt to the model', async () => {
		const response = await POST(
			new Request('http://localhost/api/ai/counterpoints', {
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
											sourceNodeId: 'focus-node',
											trigger: 'magic-wand',
										},
									}),
								},
							],
						},
					],
				}),
			})
		);

		const writes = await runCapturedStream();

		expect(response.status).toBe(200);
		expect(mockedBuildCounterpointPromptContext).toHaveBeenCalledWith(
			expect.objectContaining({
				mapId: '123e4567-e89b-12d3-a456-426614174000',
				context: expect.objectContaining({
					sourceNodeId: 'focus-node',
					trigger: 'magic-wand',
				}),
			})
		);
		expect(mockedBuildCounterpointUserPrompt).toHaveBeenCalledWith([
			'NODE=[1,"task","Focus node",[]]',
		]);
		expect(mockedStreamObject).toHaveBeenCalledWith(
			expect.objectContaining({
				messages: [
					{ role: 'system', content: 'SYSTEM_SENTINEL' },
					{ role: 'user', content: 'USER_SENTINEL' },
				],
			})
		);
		expect(mockedNormalizeCounterpointSuggestionElement).toHaveBeenCalledWith(
			{ id: 'raw-counterpoint' },
			expect.objectContaining({
				nodeIdToAlias: expect.any(Map),
				aliasToNodeId: expect.any(Map),
			})
		);
		expect(mockedTrackAIUsage).toHaveBeenCalled();
		expect(writes).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: 'data-node-suggestion',
					data: expect.objectContaining({
						id: 'cp-1',
						index: 0,
					}),
				}),
			])
		);
	});

	it('streams all valid counterpoints with increasing indexes', async () => {
		mockedStreamObject.mockReturnValue({
			elementStream: (async function* () {
				yield { id: 'raw-counterpoint-1' };
				yield { id: 'raw-counterpoint-2' };
			})(),
		} as never);

		mockedNormalizeCounterpointSuggestionElement.mockImplementation((element) => {
			const rawElement = element as { id?: string };
			switch (rawElement.id) {
				case 'raw-counterpoint-1':
					return {
						id: 'cp-1',
						content: 'Challenge the rollout assumptions',
						nodeType: 'defaultNode',
						confidence: 0.88,
						position: { x: 0, y: 0 },
						context: {
							sourceNodeId: 'focus-node',
							targetNodeId: null,
							relationshipType: 'questions',
							trigger: 'magic-wand',
						},
						reasoning: 'First challenge.',
					} as never;
				case 'raw-counterpoint-2':
					return {
						id: 'cp-2',
						content: 'Surface the missing dependency risk',
						nodeType: 'defaultNode',
						confidence: 0.79,
						position: { x: 0, y: 0 },
						context: {
							sourceNodeId: 'focus-node',
							targetNodeId: null,
							relationshipType: 'questions',
							trigger: 'magic-wand',
						},
						reasoning: 'Second challenge.',
					} as never;
				default:
					return null;
			}
		});

		await POST(
			new Request('http://localhost/api/ai/counterpoints', {
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
											sourceNodeId: 'focus-node',
											trigger: 'magic-wand',
										},
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

		expect(mockedNormalizeCounterpointSuggestionElement).toHaveBeenCalledTimes(2);
		expect(suggestionChunks).toHaveLength(2);
		expect(
			suggestionChunks.map((chunk) => ({
				id: chunk.data.id,
				index: chunk.data.index,
			}))
		).toEqual([
			{ id: 'cp-1', index: 0 },
			{ id: 'cp-2', index: 1 },
		]);
	});

	it('reports invalid last-user-message format before calling the AI', async () => {
		await POST(
			new Request('http://localhost/api/ai/counterpoints', {
				method: 'POST',
				body: JSON.stringify({
					messages: [
						{
							role: 'user',
							parts: [],
						},
					],
				}),
			})
		);

		const writes = await runCapturedStream();

		expect(mockedBuildCounterpointPromptContext).not.toHaveBeenCalled();
		expect(mockedStreamObject).not.toHaveBeenCalled();
		expect(writes).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: 'data-stream-status',
					data: expect.objectContaining({
						header: 'Generating Counterpoints',
						error: 'Invalid request format: User message not found.',
					}),
				}),
			])
		);
	});
});
