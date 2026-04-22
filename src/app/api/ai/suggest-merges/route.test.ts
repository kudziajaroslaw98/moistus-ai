jest.mock('@/helpers/api/with-subscription-check', () => ({
	checkAIQuota: jest.fn(),
	trackAIUsage: jest.fn(),
}));

jest.mock('@/helpers/supabase/server', () => ({
	createClient: jest.fn(),
}));

jest.mock('@/helpers/ai-merge-context', () => ({
	buildMergePromptContext: jest.fn(),
}));

jest.mock('@/helpers/ai-merge-prompts', () => ({
	buildMergeUserPrompt: jest.fn(),
	getMergeSystemPrompt: jest.fn(),
}));

jest.mock('@/helpers/ai-merge-postprocess', () => ({
	mergeSuggestionSchema: {},
	processMergeSuggestionElement: jest.fn(),
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
import { buildMergePromptContext } from '@/helpers/ai-merge-context';
import {
	buildMergeUserPrompt,
	getMergeSystemPrompt,
} from '@/helpers/ai-merge-prompts';
import { processMergeSuggestionElement } from '@/helpers/ai-merge-postprocess';
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
const mockedBuildMergePromptContext = jest.mocked(buildMergePromptContext);
const mockedBuildMergeUserPrompt = jest.mocked(buildMergeUserPrompt);
const mockedGetMergeSystemPrompt = jest.mocked(getMergeSystemPrompt);
const mockedProcessMergeSuggestionElement = jest.mocked(
	processMergeSuggestionElement
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

describe('/api/ai/suggest-merges route', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		executeStream = null;

		const eq = jest.fn().mockResolvedValue({
			data: [{ id: 'node-1' }, { id: 'node-2' }],
			error: null,
		});
		const select = jest.fn(() => ({ eq }));
		const from = jest.fn(() => ({ select }));

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
			from,
		} as never);

		mockedCheckAIQuota.mockResolvedValue({
			allowed: true,
			isPro: false,
			error: null,
		} as never);

		mockedBuildMergePromptContext.mockReturnValue({
			aliasMap: {
				nodeIdToAlias: new Map([
					['node-1', 1],
					['node-2', 2],
				]),
				aliasToNodeId: new Map([
					[1, 'node-1'],
					[2, 'node-2'],
				]),
			},
			nodeRows: ['NODE=[1,"task","Node 1",[]]', 'NODE=[2,"task","Node 2",[]]'],
			validNodeIds: new Set(['node-1', 'node-2']),
			nodes: [{ id: 'node-1' }, { id: 'node-2' }],
		} as never);

		mockedGetMergeSystemPrompt.mockReturnValue('SYSTEM_SENTINEL');
		mockedBuildMergeUserPrompt.mockReturnValue('USER_SENTINEL');
		mockedProcessMergeSuggestionElement.mockReturnValue({
			node1Id: 'node-1',
			node2Id: 'node-2',
			reason: 'Overlap',
			similarityScore: 0.92,
			confidence: 0.88,
		} as never);

		mockedStreamObject.mockReturnValue({
			elementStream: (async function* () {
				yield { id: 'raw-merge' };
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

	it('keeps streamObject and sends the extracted merge prompt to the model', async () => {
		const response = await POST(
			new Request('http://localhost/api/ai/suggest-merges', {
				method: 'POST',
				body: JSON.stringify({
					messages: [
						{
							role: 'user',
							parts: [
								{
									type: 'text',
									text: JSON.stringify({
										mapId: '123e4567-e89b-12d3-a456-426614174000',
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
		expect(mockedBuildMergePromptContext).toHaveBeenCalledWith([
			{ id: 'node-1' },
			{ id: 'node-2' },
		]);
		expect(mockedBuildMergeUserPrompt).toHaveBeenCalledWith([
			'NODE=[1,"task","Node 1",[]]',
			'NODE=[2,"task","Node 2",[]]',
		]);
		expect(mockedStreamObject).toHaveBeenCalledWith(
			expect.objectContaining({
				messages: [
					{ role: 'system', content: 'SYSTEM_SENTINEL' },
					{ role: 'user', content: 'USER_SENTINEL' },
				],
			})
		);
		expect(mockedProcessMergeSuggestionElement).toHaveBeenCalledWith(
			expect.objectContaining({
				element: { id: 'raw-merge' },
				validNodeIds: new Set(['node-1', 'node-2']),
				processedPairs: expect.any(Set),
			})
		);
		expect(mockedTrackAIUsage).toHaveBeenCalled();
		expect(writes).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: 'data-merge-suggestion',
					data: expect.objectContaining({
						node1Id: 'node-1',
						node2Id: 'node-2',
					}),
				}),
			])
		);
	});

	it('streams later distinct merge suggestions after filtered duplicates', async () => {
		mockedBuildMergePromptContext.mockReturnValue({
			aliasMap: {
				nodeIdToAlias: new Map([
					['node-1', 1],
					['node-2', 2],
					['node-3', 3],
				]),
				aliasToNodeId: new Map([
					[1, 'node-1'],
					[2, 'node-2'],
					[3, 'node-3'],
				]),
			},
			nodeRows: [
				'NODE=[1,"task","Node 1",[]]',
				'NODE=[2,"task","Node 2",[]]',
				'NODE=[3,"task","Node 3",[]]',
			],
			validNodeIds: new Set(['node-1', 'node-2', 'node-3']),
			nodes: [{ id: 'node-1' }, { id: 'node-2' }, { id: 'node-3' }],
		} as never);

		mockedStreamObject.mockReturnValue({
			elementStream: (async function* () {
				yield { id: 'raw-merge-1' };
				yield { id: 'raw-merge-duplicate' };
				yield { id: 'raw-merge-2' };
			})(),
		} as never);

		mockedProcessMergeSuggestionElement.mockImplementation(({ element }) => {
			const rawElement = element as { id?: string };
			switch (rawElement.id) {
				case 'raw-merge-1':
					return {
						node1Id: 'node-1',
						node2Id: 'node-2',
						reason: 'Overlap',
						similarityScore: 0.92,
						confidence: 0.88,
					} as never;
				case 'raw-merge-2':
					return {
						node1Id: 'node-2',
						node2Id: 'node-3',
						reason: 'Shared destination',
						similarityScore: 0.81,
						confidence: 0.74,
					} as never;
				default:
					return null;
			}
		});

		await POST(
			new Request('http://localhost/api/ai/suggest-merges', {
				method: 'POST',
				body: JSON.stringify({
					messages: [
						{
							role: 'user',
							parts: [
								{
									type: 'text',
									text: JSON.stringify({
										mapId: '123e4567-e89b-12d3-a456-426614174000',
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
			(chunk) => (chunk as { type?: string }).type === 'data-merge-suggestion'
		) as Array<{
			type: string;
			data: { node1Id: string; node2Id: string };
		}>;

		expect(mockedProcessMergeSuggestionElement).toHaveBeenCalledTimes(3);
		expect(suggestionChunks).toHaveLength(2);
		expect(suggestionChunks.map((chunk) => chunk.data)).toEqual([
			{ node1Id: 'node-1', node2Id: 'node-2' },
			{ node1Id: 'node-2', node2Id: 'node-3' },
		]);
	});

	it('reports invalid last-user-message format before fetching nodes', async () => {
		await POST(
			new Request('http://localhost/api/ai/suggest-merges', {
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

		expect(mockedBuildMergePromptContext).not.toHaveBeenCalled();
		expect(mockedStreamObject).not.toHaveBeenCalled();
		expect(writes).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: 'data-stream-status',
					data: expect.objectContaining({
						header: 'Suggesting Node Merges',
						error: 'Invalid request format: User message not found.',
					}),
				}),
			])
		);
	});
});
