jest.mock('@/helpers/api/with-subscription-check', () => ({
	checkAIQuota: jest.fn(),
	trackAIUsage: jest.fn(),
}));

jest.mock('@/helpers/supabase/server', () => ({
	createClient: jest.fn(),
}));

jest.mock('@/helpers/extract-connection-context', () => ({
	extractNodesForConnections: jest.fn(),
	extractEdgesForConnections: jest.fn(),
	formatConnectionContext: jest.fn(),
}));

jest.mock('@/helpers/ai-connection-prompts', () => ({
	buildConnectionModelMessages: jest.fn(),
}));

jest.mock('@/helpers/ai-connection-postprocess', () => ({
	connectionSuggestionSchema: {},
	normalizeConnectionSuggestionElement: jest.fn(),
}));

jest.mock('@ai-sdk/openai', () => ({
	openai: jest.fn(() => 'mock-model'),
}));

jest.mock('ai', () => ({
	createUIMessageStream: jest.fn(),
	createUIMessageStreamResponse: jest.fn(),
	streamObject: jest.fn(),
}));

import { checkAIQuota } from '@/helpers/api/with-subscription-check';
import { buildConnectionModelMessages } from '@/helpers/ai-connection-prompts';
import { normalizeConnectionSuggestionElement } from '@/helpers/ai-connection-postprocess';
import {
	extractEdgesForConnections,
	extractNodesForConnections,
	formatConnectionContext,
} from '@/helpers/extract-connection-context';
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
const mockedBuildConnectionModelMessages = jest.mocked(
	buildConnectionModelMessages
);
const mockedNormalizeConnectionSuggestionElement = jest.mocked(
	normalizeConnectionSuggestionElement
);
const mockedExtractNodesForConnections = jest.mocked(extractNodesForConnections);
const mockedExtractEdgesForConnections = jest.mocked(extractEdgesForConnections);
const mockedFormatConnectionContext = jest.mocked(formatConnectionContext);
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

describe('/api/ai/suggest-connections route', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		executeStream = null;

		const single = jest.fn().mockResolvedValue({
			data: {
				nodes: [{ id: 'node-1' }, { id: 'node-2' }],
				edges: [{ source: 'node-1', target: 'node-2' }],
			},
			error: null,
		});
		const eq = jest.fn(() => ({ single }));
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

		mockedExtractNodesForConnections.mockReturnValue([
			{ id: 'node-1', type: 'defaultNode', semantic: 'Node 1' },
			{ id: 'node-2', type: 'defaultNode', semantic: 'Node 2' },
		] as never);
		mockedExtractEdgesForConnections.mockReturnValue([
			{ source: 'node-1', target: 'node-2' },
		] as never);
		mockedFormatConnectionContext.mockReturnValue('FORMATTED_CONTEXT');
		mockedBuildConnectionModelMessages.mockResolvedValue([
			{ role: 'system', content: 'MODEL_MESSAGE_SENTINEL' },
		] as never);
		mockedNormalizeConnectionSuggestionElement.mockReturnValue({
			id: 'conn-1',
			sourceNodeId: 'node-1',
			targetNodeId: 'node-2',
			label: 'depends on',
			reason: 'It is a prerequisite.',
			confidence: 0.9,
			relationshipType: 'depends-on',
			metadata: {
				strength: 'strong',
				bidirectional: false,
				contextualRelevance: 0.86,
			},
		} as never);

		mockedStreamObject.mockReturnValue({
			elementStream: (async function* () {
				yield { id: 'raw-connection' };
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

	it('keeps streamObject and sends the extracted connection prompt to the model', async () => {
		const response = await POST(
			new Request('http://localhost/api/ai/suggest-connections', {
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
		expect(mockedFormatConnectionContext).toHaveBeenCalled();
		expect(mockedBuildConnectionModelMessages).toHaveBeenCalledWith(
			'FORMATTED_CONTEXT'
		);
		expect(mockedStreamObject).toHaveBeenCalledWith(
			expect.objectContaining({
				messages: [{ role: 'system', content: 'MODEL_MESSAGE_SENTINEL' }],
			})
		);
		expect(mockedNormalizeConnectionSuggestionElement).toHaveBeenCalledWith({
			id: 'raw-connection',
		});
		expect(writes).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: 'data-connection-suggestion',
					data: expect.objectContaining({
						id: 'conn-1',
						sourceNodeId: 'node-1',
						targetNodeId: 'node-2',
					}),
				}),
			])
		);
	});

	it('streams all valid generated connections and skips invalid ones', async () => {
		mockedStreamObject.mockReturnValue({
			elementStream: (async function* () {
				yield { id: 'raw-invalid' };
				yield { id: 'raw-connection-1' };
				yield { id: 'raw-connection-2' };
			})(),
		} as never);

		mockedNormalizeConnectionSuggestionElement.mockImplementation((element) => {
			const rawElement = element as { id?: string };
			switch (rawElement.id) {
				case 'raw-connection-1':
					return {
						id: 'conn-1',
						sourceNodeId: 'node-1',
						targetNodeId: 'node-2',
						label: 'depends on',
						reason: 'It is a prerequisite.',
						confidence: 0.9,
						relationshipType: 'depends-on',
						metadata: {
							strength: 'strong',
							bidirectional: false,
							contextualRelevance: 0.86,
						},
					} as never;
				case 'raw-connection-2':
					return {
						id: 'conn-2',
						sourceNodeId: 'node-2',
						targetNodeId: 'node-1',
						label: 'supports',
						reason: 'It reinforces the previous node.',
						confidence: 0.84,
						relationshipType: 'supports',
						metadata: {
							strength: 'moderate',
							bidirectional: false,
							contextualRelevance: 0.72,
						},
					} as never;
				default:
					return null;
			}
		});

		await POST(
			new Request('http://localhost/api/ai/suggest-connections', {
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
			(chunk) =>
				(chunk as { type?: string }).type === 'data-connection-suggestion'
		) as Array<{ type: string; data: { id: string } }>;

		expect(mockedNormalizeConnectionSuggestionElement).toHaveBeenCalledTimes(3);
		expect(suggestionChunks).toHaveLength(2);
		expect(suggestionChunks.map((chunk) => chunk.data.id)).toEqual([
			'conn-1',
			'conn-2',
		]);
	});

	it('reports invalid last-user-message format before calling the model', async () => {
		await POST(
			new Request('http://localhost/api/ai/suggest-connections', {
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

		expect(mockedBuildConnectionModelMessages).not.toHaveBeenCalled();
		expect(mockedStreamObject).not.toHaveBeenCalled();
		expect(writes).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: 'data-stream-status',
					data: expect.objectContaining({
						header: 'Suggesting Connections',
						error: 'Invalid request format: User message not found.',
					}),
				}),
			])
		);
	});
});
