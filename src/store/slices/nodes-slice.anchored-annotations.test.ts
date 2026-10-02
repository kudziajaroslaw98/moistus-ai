import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type { NodeData } from '@/types/node-data';

const mockBroadcast = jest.fn();
const mockQueueMutation = jest.fn();

jest.mock('@/helpers/with-loading-and-toast', () => ({
	__esModule: true,
	default: (fn: unknown) => fn,
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
	getNodeActorId: jest.fn(() => 'editor-id'),
	getEdgeActorId: jest.fn(() => 'editor-id'),
	isYjsGraphSyncEnabled: jest.fn(() => true),
	serializeNodeForRealtime: jest.fn(() => ({})),
	serializeEdgeForRealtime: jest.fn(() => ({})),
}));

jest.mock('@xyflow/react', () => {
	const actual = jest.requireActual('@xyflow/react');
	return {
		...actual,
		applyNodeChanges: (changes: any[], nodes: AppNode[]) =>
			nodes.map((node) => {
				const change = changes.find(
					(candidate) =>
						candidate.id === node.id &&
						candidate.type === 'position' &&
						candidate.position
				);
				return change ? { ...node, position: { ...change.position } } : node;
			}),
	};
});

function createNode(
	id: string,
	nodeType: NodeData['node_type'],
	position: { x: number; y: number },
	metadata: NodeData['metadata'] = {}
): AppNode {
	return {
		id,
		type: nodeType,
		position,
		data: {
			id,
			map_id: 'map-1',
			user_id: 'creator-id',
			parent_id: null,
			content: id,
			position_x: position.x,
			position_y: position.y,
			node_type: nodeType,
			created_at: '2026-10-03T00:00:00.000Z',
			updated_at: '2026-10-03T00:00:00.000Z',
			metadata,
		},
	};
}

function createEdge(id: string, source: string, target: string): AppEdge {
	return {
		id,
		source,
		target,
		data: { id, source, target, map_id: 'map-1' } as unknown as AppEdge['data'],
	};
}

function createHarness(nodes: AppNode[], edges: AppEdge[] = []) {
	const { createNodeSlice } =
		require('@/store/slices/nodes-slice') as typeof import('@/store/slices/nodes-slice');

	let state: Record<string, unknown> = {
		nodes,
		edges,
		mapId: 'map-1',
		currentUser: { id: 'current-user' },
		isCommentMode: false,
		isReverting: false,
		isLayouting: false,
		systemUpdatedNodes: new Map<string, number>(),
		layoutConfig: { direction: 'LEFT_RIGHT' },
		persistDeltaEvent: jest.fn(),
		supabase: {
			auth: {
				getSession: jest.fn(async () => ({
					data: { session: { user: { id: 'current-user' } } },
				})),
			},
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
	state = { ...state, ...slice, nodes, edges, triggerNodeSave };

	return {
		getState: () => state,
		getNode: (id: string) =>
			(state.nodes as AppNode[]).find((node) => node.id === id),
		triggerNodeSave,
		persistDeltaEvent: state.persistDeltaEvent as jest.Mock,
		slice,
	};
}

const host = () => createNode('host', 'defaultNode', { x: 100, y: 100 });
const annotation = () =>
	createNode('note', 'annotationNode', { x: 300, y: 100 }, {
		anchorNodeId: 'host',
		anchorOffset: { x: 200, y: 0 },
	});

describe('anchored annotations in nodes slice', () => {
	beforeEach(() => {
		mockBroadcast.mockReset();
		mockBroadcast.mockResolvedValue(undefined);
		mockQueueMutation.mockReset();
		mockQueueMutation.mockResolvedValue({ status: 'applied', opId: 'op-1' });
	});

	it('moves anchored annotations with the host and persists them on drop', () => {
		const harness = createHarness([host(), annotation()]);

		harness.slice.onNodesChange([
			{ id: 'host', type: 'position', position: { x: 150, y: 120 }, dragging: true },
		] as never);
		expect(harness.getNode('note')?.position).toEqual({ x: 350, y: 120 });
		expect(harness.triggerNodeSave).not.toHaveBeenCalled();

		harness.slice.onNodesChange([
			{ id: 'host', type: 'position', position: { x: 150, y: 120 }, dragging: false },
		] as never);
		expect(harness.triggerNodeSave).toHaveBeenCalledWith('host');
		expect(harness.triggerNodeSave).toHaveBeenCalledWith('note');
		expect(harness.persistDeltaEvent).toHaveBeenCalledWith(
			'moveNodes',
			expect.anything(),
			expect.anything()
		);
	});

	it('records a new offset when the annotation itself is dropped', () => {
		const harness = createHarness([host(), annotation()]);

		harness.slice.onNodesChange([
			{ id: 'note', type: 'position', position: { x: 100, y: 250 }, dragging: false },
		] as never);

		const note = harness.getNode('note');
		expect(note?.position).toEqual({ x: 100, y: 250 });
		expect(note?.data.metadata?.anchorOffset).toEqual({ x: 0, y: 150 });
		expect(harness.triggerNodeSave).toHaveBeenCalledWith('note');
	});

	it('does not double-move an annotation dragged together with its host', () => {
		const harness = createHarness([host(), annotation()]);

		harness.slice.onNodesChange([
			{ id: 'host', type: 'position', position: { x: 110, y: 100 }, dragging: false },
			{ id: 'note', type: 'position', position: { x: 310, y: 100 }, dragging: false },
		] as never);

		expect(harness.getNode('note')?.position).toEqual({ x: 310, y: 100 });
		expect(harness.getNode('note')?.data.metadata?.anchorOffset).toEqual({
			x: 200,
			y: 0,
		});
	});

	it('cascade-deletes anchored annotations in one history step', async () => {
		const free = createNode('free', 'annotationNode', { x: 0, y: 0 });
		const harness = createHarness([host(), annotation(), free]);

		await (harness.slice.deleteNodes as unknown as (nodes: AppNode[]) => Promise<void>)([
			host(),
		]);

		expect((harness.getState().nodes as AppNode[]).map((node) => node.id)).toEqual([
			'free',
		]);
		expect(mockQueueMutation).toHaveBeenCalledWith(
			expect.objectContaining({
				action: 'delete',
				payload: expect.objectContaining({
					values: { ids: ['host', 'note'] },
				}),
			})
		);
		expect(harness.persistDeltaEvent).toHaveBeenCalledTimes(1);
	});

	it('hides anchored annotations when the host is hidden by a collapsed ancestor', () => {
		const root = createNode('root', 'defaultNode', { x: 0, y: 0 }, { isCollapsed: true });
		const harness = createHarness(
			[root, host(), annotation()],
			[createEdge('e1', 'root', 'host')]
		);

		expect(harness.slice.getVisibleNodes().map((node) => node.id)).toEqual(['root']);
	});

	it('keeps annotations of a collapsed (but visible) host visible', () => {
		const collapsedHost = createNode('host', 'defaultNode', { x: 100, y: 100 }, {
			isCollapsed: true,
		});
		const harness = createHarness([collapsedHost, annotation()]);

		expect(harness.slice.getVisibleNodes().map((node) => node.id)).toEqual([
			'host',
			'note',
		]);
	});
});
