import type { AppNode } from '@/types/app-node';
import type { Comment } from '@/types/comment';

const mockQueueMutation = jest.fn();

jest.mock('@/helpers/generate-uuid', () => jest.fn(() => 'mock-uuid'));

jest.mock('@/lib/offline/indexed-db', () => ({
	getWorkspaceCacheRecord: jest.fn(),
	setWorkspaceCacheRecord: jest.fn(),
}));

jest.mock('@/lib/offline/offline-mutation-adapter', () => ({
	queueMutation: (...args: unknown[]) => mockQueueMutation(...args),
}));

type CommentPayload = {
	eventType: 'INSERT' | 'UPDATE' | 'DELETE';
	new: Partial<Comment>;
	old: Partial<Comment>;
};

function createComment(id: string): Comment {
	return {
		id,
		map_id: 'map-1',
		position_x: 120,
		position_y: 240,
		width: 400,
		height: 500,
		created_by: 'commenter-1',
		created_at: '2026-10-13T00:00:00.000Z',
		updated_at: '2026-10-13T00:00:00.000Z',
	};
}

function createNode(id: string, type: string): AppNode {
	return {
		id,
		type,
		position: { x: 0, y: 0 },
		data: { id, node_type: type, content: id, metadata: {} },
	} as unknown as AppNode;
}

function createHarness(initial: { nodes?: AppNode[]; comments?: Comment[] }) {
	const { createCommentsSlice } =
		require('@/store/slices/comments-slice') as typeof import('@/store/slices/comments-slice');

	let commentsHandler: ((payload: CommentPayload) => void) | null = null;
	const channel: { on: jest.Mock; subscribe: jest.Mock } = {
		on: jest.fn(
			(
				_type: string,
				config: { table: string },
				callback: (payload: CommentPayload) => void
			) => {
				if (config.table === 'comments') commentsHandler = callback;
				return channel;
			}
		),
		subscribe: jest.fn(() => channel),
	};
	const markNodeAsSystemUpdate = jest.fn();
	const deleteNodes = jest.fn().mockResolvedValue(undefined);

	let state: Record<string, unknown> = {
		nodes: initial.nodes ?? [],
		comments: initial.comments ?? [],
		commentMessages: {},
		supabase: { channel: jest.fn(() => channel), removeChannel: jest.fn() },
		markNodeAsSystemUpdate,
		deleteNodes,
	};
	const set = (update: unknown) => {
		const patch =
			typeof update === 'function'
				? (update as (current: Record<string, unknown>) => Record<string, unknown>)(
						state
					)
				: (update as Record<string, unknown>);
		state = { ...state, ...patch };
	};
	const get = () => state;
	const slice = createCommentsSlice(set as never, get as never, {} as never);
	// The slice starts with empty lists, so put the fixture back.
	state = { ...state, ...slice, ...initial, markNodeAsSystemUpdate, deleteNodes };

	return {
		slice,
		deleteNodes,
		markNodeAsSystemUpdate,
		getNodes: () => state.nodes as AppNode[],
		getComments: () => state.comments as Comment[],
		emit: (payload: CommentPayload) => commentsHandler?.(payload),
	};
}

describe('comment threads arriving over realtime', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockQueueMutation.mockResolvedValue({ status: 'applied', data: null });
	});

	it('adds the canvas node when only the comment row arrives', async () => {
		const harness = createHarness({});
		await harness.slice.subscribeToCommentUpdates('map-1');

		harness.emit({
			eventType: 'INSERT',
			new: createComment('thread-1'),
			old: {},
		});

		expect(harness.getComments().map((c) => c.id)).toEqual(['thread-1']);
		const [node] = harness.getNodes();
		expect(node).toMatchObject({
			id: 'thread-1',
			type: 'commentNode',
			position: { x: 120, y: 240 },
			zIndex: 100,
		});
		expect(node.data).toMatchObject({
			map_id: 'map-1',
			user_id: 'commenter-1',
			node_type: 'commentNode',
			width: 400,
			height: 500,
		});
		expect(harness.markNodeAsSystemUpdate).toHaveBeenCalledWith('thread-1');
	});

	it('does not add a second node for a thread that is already on the canvas', async () => {
		const harness = createHarness({
			nodes: [createNode('thread-1', 'commentNode')],
		});
		await harness.slice.subscribeToCommentUpdates('map-1');

		harness.emit({
			eventType: 'INSERT',
			new: createComment('thread-1'),
			old: {},
		});

		expect(harness.getNodes()).toHaveLength(1);
		expect(harness.getComments()).toHaveLength(1);
		expect(harness.markNodeAsSystemUpdate).not.toHaveBeenCalled();
	});

	it('ignores a repeated insert of a thread that is fully loaded', async () => {
		const harness = createHarness({
			nodes: [createNode('thread-1', 'commentNode')],
			comments: [createComment('thread-1')],
		});
		await harness.slice.subscribeToCommentUpdates('map-1');

		harness.emit({
			eventType: 'INSERT',
			new: createComment('thread-1'),
			old: {},
		});

		expect(harness.getNodes()).toHaveLength(1);
		expect(harness.getComments()).toHaveLength(1);
	});

	it('removes the canvas node when the comment row is deleted', async () => {
		const harness = createHarness({
			nodes: [createNode('thread-1', 'commentNode'), createNode('a', 'defaultNode')],
			comments: [createComment('thread-1')],
		});
		await harness.slice.subscribeToCommentUpdates('map-1');

		harness.emit({ eventType: 'DELETE', new: {}, old: { id: 'thread-1' } });

		expect(harness.getComments()).toHaveLength(0);
		expect(harness.getNodes().map((node) => node.id)).toEqual(['a']);
	});

	it('only removes comment nodes, never another node with that id', async () => {
		const harness = createHarness({
			nodes: [createNode('shared-id', 'defaultNode')],
		});
		await harness.slice.subscribeToCommentUpdates('map-1');

		harness.emit({ eventType: 'DELETE', new: {}, old: { id: 'shared-id' } });

		expect(harness.getNodes()).toHaveLength(1);
	});

	it('leaves the node to deleteComment while this browser deletes the thread', async () => {
		const threadNode = createNode('thread-1', 'commentNode');
		const harness = createHarness({
			nodes: [threadNode],
			comments: [createComment('thread-1')],
		});
		await harness.slice.subscribeToCommentUpdates('map-1');

		let finishDatabaseDelete: () => void = () => undefined;
		mockQueueMutation.mockImplementationOnce(
			() =>
				new Promise<void>((resolve) => {
					finishDatabaseDelete = resolve;
				})
		);

		const deleting = harness.slice.deleteComment('thread-1');
		// The database event lands before deleteComment reaches deleteNodes.
		harness.emit({ eventType: 'DELETE', new: {}, old: { id: 'thread-1' } });

		expect(harness.getNodes()).toHaveLength(1);

		finishDatabaseDelete();
		await deleting;

		expect(harness.deleteNodes).toHaveBeenCalledWith([threadNode]);
	});
});
