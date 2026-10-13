import type { AppNode } from '@/types/app-node';
import type { NodeData } from '@/types/node-data';

const mockBroadcast = jest.fn();
const mockQueueMutation = jest.fn();
const mockFetch = jest.fn();

jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: { getState: () => ({ setLoadingStates: jest.fn() }) },
}));

jest.mock('sonner', () => ({
	toast: { loading: jest.fn(), success: jest.fn(), error: jest.fn() },
}));

jest.mock('@/lib/offline/offline-mutation-adapter', () => ({
	queueMutation: (...args: unknown[]) => mockQueueMutation(...args),
}));

jest.mock('@/lib/realtime/broadcast-channel', () => ({
	broadcast: (...args: unknown[]) => mockBroadcast(...args),
	BROADCAST_EVENTS: {
		NODE_CREATE: 'node:create',
		NODE_UPDATE: 'node:update',
		NODE_DELETE: 'node:delete',
		EDGE_CREATE: 'edge:create',
		EDGE_UPDATE: 'edge:update',
		EDGE_DELETE: 'edge:delete',
		HISTORY_REVERT: 'history:revert',
	},
	subscribeToSyncEvents: jest.fn(),
}));

jest.mock('@/lib/realtime/graph-sync', () => ({
	toPgReal: (value: number) => Math.fround(value),
	getNodeActorId: jest.fn(() => 'actor-id'),
	getEdgeActorId: jest.fn(() => 'actor-id'),
	isYjsGraphSyncEnabled: jest.fn(() => true),
	serializeNodeForRealtime: jest.fn(() => ({})),
	serializeEdgeForRealtime: jest.fn(() => ({})),
}));

type Role = 'owner' | 'editor' | 'commenter' | 'viewer';

function createNode(
	id: string,
	nodeType: NodeData['node_type'],
	metadata: NodeData['metadata'] = {}
): AppNode {
	return {
		id,
		type: nodeType,
		position: { x: 0, y: 0 },
		data: {
			id,
			map_id: 'map-1',
			user_id: 'creator-id',
			parent_id: null,
			content: id,
			position_x: 0,
			position_y: 0,
			node_type: nodeType,
			created_at: '2026-10-13T00:00:00.000Z',
			updated_at: '2026-10-13T00:00:00.000Z',
			metadata,
		},
	};
}

function createHarness(role: Role, nodes: AppNode[]) {
	const { createNodeSlice } =
		require('@/store/slices/nodes-slice') as typeof import('@/store/slices/nodes-slice');

	let state: Record<string, unknown> = {
		nodes,
		edges: [],
		mapId: 'map-1',
		currentUser: { id: 'current-user' },
		mindMap: { id: 'map-1', user_id: role === 'owner' ? 'current-user' : 'owner' },
		permissions: {
			role,
			can_view: true,
			can_comment: role === 'commenter' || role === 'editor',
			can_edit: role === 'editor',
		},
		isCommentMode: false,
		isReverting: false,
		isLayouting: false,
		systemUpdatedNodes: new Map<string, number>(),
		layoutConfig: { direction: 'LEFT_RIGHT' },
		persistDeltaEvent: jest.fn(),
		supabase: {
			auth: { getSession: jest.fn() },
		},
	};
	const set = (partial: unknown) => {
		const patch =
			typeof partial === 'function'
				? (partial as (current: Record<string, unknown>) => Record<string, unknown>)(
						state
					)
				: (partial as Record<string, unknown>);
		state = { ...state, ...(patch ?? {}) };
	};
	const get = () => state;
	const slice = createNodeSlice(set as never, get as never, {} as never);
	const triggerNodeSave = jest.fn();
	// The slice starts with empty nodes/edges, so put the fixture back.
	state = { ...state, ...slice, nodes, edges: [], triggerNodeSave };

	return {
		slice,
		getState: () => state,
		getNode: (id: string) =>
			(state.nodes as AppNode[]).find((node) => node.id === id),
		triggerNodeSave,
		persistDeltaEvent: state.persistDeltaEvent as jest.Mock,
		getSession: (state.supabase as { auth: { getSession: jest.Mock } }).auth
			.getSession,
	};
}

function expectNothingSent(harness: ReturnType<typeof createHarness>) {
	expect(mockBroadcast).not.toHaveBeenCalled();
	expect(mockQueueMutation).not.toHaveBeenCalled();
	expect(harness.triggerNodeSave).not.toHaveBeenCalled();
	expect(harness.persistDeltaEvent).not.toHaveBeenCalled();
}

const collapsedParent = () =>
	createNode('parent', 'defaultNode', { isCollapsed: true });

describe('nodes slice permissions', () => {
	beforeEach(() => {
		mockBroadcast.mockReset().mockResolvedValue(undefined);
		mockQueueMutation.mockReset().mockResolvedValue({ status: 'applied' });
		mockFetch.mockReset().mockResolvedValue({
			status: 403,
			ok: false,
			json: async () => ({ error: 'blocked' }),
		});
		global.fetch = mockFetch as unknown as typeof fetch;
		jest.spyOn(console, 'error').mockImplementation(() => undefined);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('updateNode', () => {
		it.each<Role>(['viewer', 'commenter'])(
			'changes and sends nothing for a %s',
			async (role) => {
				const harness = createHarness(role, [createNode('a', 'defaultNode')]);

				await harness.slice.updateNode({ nodeId: 'a', data: { content: 'edited' } });

				expect(harness.getNode('a')?.data.content).toBe('a');
				expectNothingSent(harness);
			}
		);

		it.each<Role>(['owner', 'editor'])('saves for an %s', async (role) => {
			const harness = createHarness(role, [createNode('a', 'defaultNode')]);

			await harness.slice.updateNode({ nodeId: 'a', data: { content: 'edited' } });

			expect(harness.getNode('a')?.data.content).toBe('edited');
			expect(harness.triggerNodeSave).toHaveBeenCalledWith('a');
			expect(harness.persistDeltaEvent).toHaveBeenCalledTimes(1);
		});
	});

	describe('addNode', () => {
		it('makes no call for a viewer', async () => {
			const harness = createHarness('viewer', []);

			await harness.slice.addNode({ parentNode: null, nodeType: 'defaultNode' });

			expect(mockFetch).not.toHaveBeenCalled();
			expectNothingSent(harness);
		});

		it('makes no call for a commenter adding an ordinary node', async () => {
			const harness = createHarness('commenter', []);

			await harness.slice.addNode({ parentNode: null, nodeType: 'defaultNode' });

			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('still lets a commenter start a comment thread', async () => {
			const harness = createHarness('commenter', []);

			await harness.slice.addNode({ parentNode: null, nodeType: 'commentNode' });

			expect(mockFetch).toHaveBeenCalledWith(
				'/api/nodes/check-limit',
				expect.objectContaining({
					body: JSON.stringify({ mapId: 'map-1', nodeType: 'commentNode' }),
				})
			);
		});

		it('makes no call for a viewer starting a comment thread', async () => {
			const harness = createHarness('viewer', []);
			(harness.getState().permissions as { can_comment: boolean }).can_comment =
				false;

			await harness.slice.addNode({ parentNode: null, nodeType: 'commentNode' });

			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('checks the limit for an editor', async () => {
			const harness = createHarness('editor', []);

			await harness.slice.addNode({ parentNode: null, nodeType: 'defaultNode' });

			expect(mockFetch).toHaveBeenCalledTimes(1);
		});
	});

	describe('deleteNodes', () => {
		it('deletes nothing for a viewer', async () => {
			const node = createNode('a', 'defaultNode');
			const harness = createHarness('viewer', [node]);

			await harness.slice.deleteNodes([node]);

			expect(harness.getState().nodes).toHaveLength(1);
			expect(harness.getSession).not.toHaveBeenCalled();
			expectNothingSent(harness);
		});

		it('deletes nothing for a commenter unless it is only comment threads', async () => {
			const node = createNode('a', 'defaultNode');
			const harness = createHarness('commenter', [node]);

			await harness.slice.deleteNodes([node]);

			expect(harness.getState().nodes).toHaveLength(1);
			expect(harness.getSession).not.toHaveBeenCalled();
		});

		it('lets a commenter roll back their own comment thread', async () => {
			const thread = createNode('thread', 'commentNode');
			const harness = createHarness('commenter', [thread]);

			await harness.slice.deleteNodes([thread]);

			expect(harness.getSession).toHaveBeenCalled();
		});
	});

	describe('collapse', () => {
		it.each<Role>(['viewer', 'commenter'])(
			'opens a branch on screen only for a %s',
			(role) => {
				const harness = createHarness(role, [collapsedParent()]);

				harness.slice.setNodesCollapsed(['parent'], false);

				expect(harness.getNode('parent')?.data.metadata?.isCollapsed).toBe(false);
				expectNothingSent(harness);
			}
		);

		it('closes a branch on screen only for a viewer', async () => {
			const harness = createHarness('viewer', [
				createNode('parent', 'defaultNode'),
			]);

			await harness.slice.toggleNodeCollapse('parent');

			expect(harness.getNode('parent')?.data.metadata?.isCollapsed).toBe(true);
			expectNothingSent(harness);
		});

		it('keeps saving and sharing the collapse for an editor', () => {
			const harness = createHarness('editor', [collapsedParent()]);

			harness.slice.setNodesCollapsed(['parent'], false);

			expect(harness.getNode('parent')?.data.metadata?.isCollapsed).toBe(false);
			expect(mockBroadcast).toHaveBeenCalledTimes(1);
			expect(harness.triggerNodeSave).toHaveBeenCalledWith('parent');
			expect(harness.persistDeltaEvent).toHaveBeenCalledTimes(1);
		});

		it('keeps toggling through updateNode for an editor', async () => {
			const harness = createHarness('editor', [createNode('parent', 'defaultNode')]);

			await harness.slice.toggleNodeCollapse('parent');

			expect(harness.getNode('parent')?.data.metadata?.isCollapsed).toBe(true);
			expect(harness.triggerNodeSave).toHaveBeenCalledWith('parent');
		});
	});

	describe('onNodesChange', () => {
		const dropAt = (id: string) =>
			[
				{ id, type: 'position', position: { x: 50, y: 50 }, dragging: false },
			] as never;

		it('saves and shares a committed move for an editor', () => {
			const harness = createHarness('editor', [createNode('a', 'defaultNode')]);

			harness.slice.onNodesChange(dropAt('a'));

			expect(harness.triggerNodeSave).toHaveBeenCalledWith('a');
			expect(mockBroadcast).toHaveBeenCalledTimes(1);
			expect(harness.persistDeltaEvent).toHaveBeenCalledTimes(1);
		});

		it('keeps the change on screen but sends nothing for a viewer', () => {
			const harness = createHarness('viewer', [createNode('a', 'defaultNode')]);

			harness.slice.onNodesChange(dropAt('a'));

			expectNothingSent(harness);
		});
	});
});
