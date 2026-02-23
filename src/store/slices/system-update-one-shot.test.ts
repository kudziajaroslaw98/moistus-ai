import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';

const mockBroadcast = jest.fn();
const mockSerializeNodeForRealtime = jest.fn();
const mockSerializeEdgeForRealtime = jest.fn();

jest.mock('@/helpers/with-loading-and-toast', () => ({
	__esModule: true,
	default: (fn: unknown) => fn,
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
	getNodeActorId: jest.fn(() => 'editor-id'),
	getEdgeActorId: jest.fn(() => 'editor-id'),
	isYjsGraphSyncEnabled: jest.fn(() => true),
	serializeNodeForRealtime: (...args: unknown[]) =>
		mockSerializeNodeForRealtime(...args),
	serializeEdgeForRealtime: (...args: unknown[]) =>
		mockSerializeEdgeForRealtime(...args),
}));

jest.mock('@xyflow/react', () => {
	const actual = jest.requireActual('@xyflow/react');

	return {
		...actual,
		applyNodeChanges: (changes: any[], nodes: AppNode[]) => {
			let nextNodes = [...nodes];
			for (const change of changes) {
				if (!change || typeof change.id !== 'string') continue;

				if (change.type === 'replace' && change.item) {
					nextNodes = nextNodes.map((node) =>
						node.id === change.id ? (change.item as AppNode) : node
					);
					continue;
				}

				if (change.type === 'position' && change.position) {
					nextNodes = nextNodes.map((node) =>
						node.id === change.id
							? {
									...node,
									position: {
										x: change.position.x,
										y: change.position.y,
									},
								}
							: node
					);
				}
			}
			return nextNodes;
		},
		applyEdgeChanges: (changes: any[], edges: AppEdge[]) => {
			let nextEdges = [...edges];
			for (const change of changes) {
				if (!change || typeof change.id !== 'string') continue;
				if (change.type === 'replace' && change.item) {
					nextEdges = nextEdges.map((edge) =>
						edge.id === change.id ? (change.item as AppEdge) : edge
					);
				}
			}
			return nextEdges;
		},
	};
});

function createNodeStoreHarness() {
	const { createNodeSlice } = require('@/store/slices/nodes-slice') as typeof import('@/store/slices/nodes-slice');

	const initialNode: AppNode = {
		id: 'node-1',
		position: { x: 0, y: 0 },
		type: 'defaultNode',
		data: {
			id: 'node-1',
			map_id: 'map-1',
			user_id: 'creator-id',
			content: 'Node',
			metadata: {},
			aiData: {},
			position_x: 0,
			position_y: 0,
			node_type: 'defaultNode',
			created_at: '2026-01-01T00:00:00.000Z',
			updated_at: '2026-01-01T00:00:00.000Z',
			parent_id: null,
		} as AppNode['data'],
	};

	let state: Record<string, unknown> = {
		nodes: [initialNode],
		edges: [],
		mapId: 'map-1',
		currentUser: { id: 'current-user' },
		isReverting: false,
		isLayouting: false,
		systemUpdatedNodes: new Map<string, number>(),
		nodeInfo: null,
		persistDeltaEvent: jest.fn(),
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
	state = { ...state, ...slice };

	const triggerNodeSave = jest.fn();
	state = { ...state, triggerNodeSave };
	const persistDeltaEvent = state.persistDeltaEvent as jest.Mock;

	return {
		getState: () => state,
		triggerNodeSave,
		persistDeltaEvent,
		onNodesChange: slice.onNodesChange,
		markNodeAsSystemUpdate: slice.markNodeAsSystemUpdate,
	};
}

function createEdgeStoreHarness() {
	const { createEdgeSlice } = require('@/store/slices/edges-slice') as typeof import('@/store/slices/edges-slice');

	const initialEdge: AppEdge = {
		id: 'edge-1',
		source: 'node-1',
		target: 'node-2',
		type: 'floatingEdge',
			data: ({
				id: 'edge-1',
				map_id: 'map-1',
				user_id: 'creator-id',
			source: 'node-1',
			target: 'node-2',
			label: null,
			animated: false,
			style: { stroke: '#6c757d', strokeWidth: 2 },
			markerEnd: null,
			markerStart: null,
			metadata: {},
				aiData: {},
				created_at: '2026-01-01T00:00:00.000Z',
				updated_at: '2026-01-01T00:00:00.000Z',
			} as unknown) as AppEdge['data'],
		};

	let state: Record<string, unknown> = {
		nodes: [],
		edges: [initialEdge],
		mapId: 'map-1',
		currentUser: { id: 'current-user' },
		isReverting: false,
		isLayouting: false,
		systemUpdatedEdges: new Map<string, number>(),
		persistDeltaEvent: jest.fn(),
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
	const slice = createEdgeSlice(set as never, get as never, {} as never);
	state = { ...state, ...slice };

	const triggerEdgeSave = jest.fn();
	state = { ...state, triggerEdgeSave };
	const persistDeltaEvent = state.persistDeltaEvent as jest.Mock;

	return {
		getState: () => state,
		triggerEdgeSave,
		persistDeltaEvent,
		onEdgesChange: slice.onEdgesChange,
		markEdgeAsSystemUpdate: slice.markEdgeAsSystemUpdate,
	};
}

describe('system update one-shot suppression', () => {
	beforeEach(() => {
		mockBroadcast.mockReset();
		mockBroadcast.mockResolvedValue(undefined);
		mockSerializeNodeForRealtime.mockReset();
		mockSerializeNodeForRealtime.mockReturnValue({
			id: 'node-1',
			user_id: 'creator-id',
		});
		mockSerializeEdgeForRealtime.mockReset();
		mockSerializeEdgeForRealtime.mockReturnValue({
			id: 'edge-1',
			user_id: 'creator-id',
		});
	});

	it('consumes node system marker once and clears suppression marker', () => {
		const harness = createNodeStoreHarness();
		harness.markNodeAsSystemUpdate('node-1');

		const firstReplace = {
			id: 'node-1',
			type: 'position',
			position: { x: 10, y: 10 },
			dragging: false,
		};
		harness.onNodesChange([firstReplace] as never);

		expect(harness.triggerNodeSave).not.toHaveBeenCalled();
		expect(
			(harness.getState().systemUpdatedNodes as Map<string, number>).has('node-1')
		).toBe(false);

		const secondReplace = {
			id: 'node-1',
			type: 'position',
			position: { x: 20, y: 20 },
			dragging: false,
		};
		harness.onNodesChange([secondReplace] as never);

		expect(
			(harness.getState().systemUpdatedNodes as Map<string, number>).has('node-1')
		).toBe(false);
	});

	it('does not save or persist history for no-op node position change', () => {
		const harness = createNodeStoreHarness();

		harness.onNodesChange([
			{
				id: 'node-1',
				type: 'position',
				position: { x: 0, y: 0 },
				dragging: false,
			},
		] as never);

		expect(harness.triggerNodeSave).not.toHaveBeenCalled();
		expect(harness.persistDeltaEvent).not.toHaveBeenCalled();
	});

	it('consumes edge system marker once and clears suppression marker', () => {
		const harness = createEdgeStoreHarness();
		harness.markEdgeAsSystemUpdate('edge-1');

		const firstReplace = {
			id: 'edge-1',
			type: 'replace',
			item: {
				...(harness.getState().edges as AppEdge[])[0],
				source: 'node-3',
			},
		};
		harness.onEdgesChange([firstReplace] as never);

		expect(harness.triggerEdgeSave).not.toHaveBeenCalled();
		expect(
			(harness.getState().systemUpdatedEdges as Map<string, number>).has('edge-1')
		).toBe(false);

		const secondReplace = {
			id: 'edge-1',
			type: 'replace',
			item: {
				...(harness.getState().edges as AppEdge[])[0],
				source: 'node-4',
			},
		};
		harness.onEdgesChange([secondReplace] as never);

		expect(
			(harness.getState().systemUpdatedEdges as Map<string, number>).has('edge-1')
		).toBe(false);
	});

	it('does not save or persist history for no-op edge replace', () => {
		const harness = createEdgeStoreHarness();

		const unchanged = (harness.getState().edges as AppEdge[])[0];
		harness.onEdgesChange([
			{
				id: 'edge-1',
				type: 'replace',
				item: unchanged,
			},
		] as never);

		expect(harness.triggerEdgeSave).not.toHaveBeenCalled();
		expect(harness.persistDeltaEvent).not.toHaveBeenCalled();
	});
});
