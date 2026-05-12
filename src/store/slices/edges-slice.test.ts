import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type { EdgeData } from '@/types/edge-data';

const rerouteAutoWaypointEdgesMock = jest.fn(
	({ edges }: { edges: AppEdge[] }) => ({
		edges,
		affectedEdgeIds: new Set<string>(),
	})
);
const broadcastMock = jest.fn().mockResolvedValue(undefined);
const queueMutationMock = jest.fn();
const serializeEdgeForRealtimeMock = jest.fn((edge) => edge.data ?? null);

jest.mock('@/helpers/generate-uuid', () => jest.fn(() => 'mock-uuid'));

jest.mock('@/helpers/route-auto-waypoint-edges', () => ({
	getRenderableEdgeType: (edgeData: { type?: string } | undefined) =>
		edgeData?.type ?? 'waypointEdge',
	rerouteAutoWaypointEdges: (params: { edges: AppEdge[] }) =>
		rerouteAutoWaypointEdgesMock(params),
}));

jest.mock('@/helpers/with-loading-and-toast', () => ({
	__esModule: true,
	default: (fn: unknown) => fn,
}));

jest.mock('@/lib/offline/offline-mutation-adapter', () => ({
	queueMutation: (params: unknown) => queueMutationMock(params),
}));

jest.mock('@/lib/realtime/graph-sync', () => ({
	getEdgeActorId: (_edge: unknown, fallbackUserId?: string) =>
		fallbackUserId ?? 'user-1',
	getNodeActorId: (_node: unknown, fallbackUserId?: string) =>
		fallbackUserId ?? 'user-1',
	serializeEdgeForRealtime: (edge: AppEdge) => serializeEdgeForRealtimeMock(edge),
	serializeNodeForRealtime: jest.fn(),
}));

jest.mock('@/lib/realtime/broadcast-channel', () => ({
	broadcast: (
		mapId: string,
		event: string,
		payload: Record<string, unknown>
	) => broadcastMock(mapId, event, payload),
	BROADCAST_EVENTS: {
		EDGE_CREATE: 'EDGE_CREATE',
		EDGE_DELETE: 'EDGE_DELETE',
		EDGE_UPDATE: 'EDGE_UPDATE',
		NODE_UPDATE: 'NODE_UPDATE',
	},
	subscribeToSyncEvents: jest.fn(),
}));

jest.mock('sonner', () => ({
	toast: {
		error: jest.fn(),
		info: jest.fn(),
		loading: jest.fn(),
		success: jest.fn(),
		warning: jest.fn(),
	},
}));

import { createEdgeSlice } from './edges-slice';

function createNode(
	id: string,
	x: number,
	y: number,
	parentId: string | null = null
): AppNode {
	return {
		id,
		type: 'defaultNode',
		position: { x, y },
		...(parentId ? { parentId } : {}),
		data: {
			id,
			map_id: 'map-1',
			user_id: 'user-1',
			content: id,
			metadata: {},
			aiData: {},
			position_x: x,
			position_y: y,
			node_type: 'defaultNode',
			created_at: '2026-04-15T00:00:00.000Z',
			updated_at: '2026-04-15T00:00:00.000Z',
			parent_id: parentId,
		},
	} as AppNode;
}

function createEdge(id: string, source: string, target: string): AppEdge {
	return {
		id,
		source,
		target,
		type: 'waypointEdge',
		animated: false,
		label: null,
		style: {
			stroke: '#6c757d',
			strokeWidth: 2,
		},
		markerEnd: undefined,
		data: {
			id,
			map_id: 'map-1',
			user_id: 'user-1',
			source,
			target,
			animated: false,
			label: null,
			style: {
				stroke: '#6c757d',
				strokeWidth: 2,
			},
			metadata: {
				pathType: 'waypoint',
				routingStyle: 'orthogonal',
			},
			aiData: {},
			created_at: '2026-04-15T00:00:00.000Z',
			updated_at: '2026-04-15T00:00:00.000Z',
		},
	} as AppEdge;
}

function createElkEdge(): AppEdge {
	return {
		id: 'edge-1',
		source: 'a',
		target: 'b',
		type: 'waypointEdge',
		label: 'Before',
		animated: false,
		style: {
			stroke: '#6c757d',
			strokeWidth: 2,
			strokeDasharray: '5 5',
		},
		data: {
			id: 'edge-1',
			map_id: 'map-1',
			user_id: 'user-1',
			source: 'a',
			target: 'b',
			label: 'Before',
			animated: false,
			style: {
				stroke: '#6c757d',
				strokeWidth: 2,
				strokeDasharray: '5 5',
			},
			metadata: {
				pathType: 'waypoint',
				routingStyle: 'elk',
				waypoints: [{ id: 'edge-1:wp:0', x: 120, y: 60 }],
				elkLabel: {
					x: 140,
					y: 48,
					width: 90,
					height: 24,
					centerX: 185,
					centerY: 60,
				},
			},
			aiData: {},
			created_at: '2026-04-15T00:00:00.000Z',
			updated_at: '2026-04-15T00:00:00.000Z',
		},
	} as AppEdge;
}

function createSliceState(params?: {
	edges?: AppEdge[];
	nodes?: AppNode[];
}) {
	const initialEdges = params?.edges ?? [createElkEdge()];
	const initialNodes = params?.nodes ?? [createNode('a', 0, 0), createNode('b', 220, 0)];

	let state: Record<string, unknown> = {
		edges: initialEdges,
		nodes: initialNodes,
		mapId: 'map-1',
		currentUser: { id: 'user-1' },
		layoutConfig: {
			direction: 'LEFT_RIGHT',
		},
		getVisibleNodes: jest.fn(() => state.nodes as AppNode[]),
		persistDeltaEvent: jest.fn().mockResolvedValue(undefined),
		triggerEdgeSave: jest.fn(),
		triggerNodeSave: jest.fn(),
		supabase: {
			auth: {
				getUser: jest.fn().mockResolvedValue({
					data: {
						user: { id: 'user-1' },
					},
				}),
			},
		},
	};

	const set = (
		update:
			| Partial<Record<string, unknown>>
			| ((current: Record<string, unknown>) => Partial<Record<string, unknown>>)
	) => {
		const partial = typeof update === 'function' ? update(state) : update;
		state = {
			...state,
			...partial,
		};
	};
	const get = () => state;

	state = {
		...createEdgeSlice(set as never, get as never, undefined as never),
		...state,
		triggerEdgeSave: jest.fn(),
		persistDeltaEvent: jest.fn().mockResolvedValue(undefined),
	};

	return {
		getState: () => state,
	};
}

describe('edges-slice', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		queueMutationMock.mockImplementation(async (params: Record<string, unknown>) => ({
			status: 'applied',
			data: params?.payload
				? ((params.payload as { values?: EdgeData }).values as EdgeData)
				: null,
		}));
		serializeEdgeForRealtimeMock.mockImplementation((edge: AppEdge) => edge.data ?? null);
	});

	it('invalidates ELK label placement without rerouting when only the label changes', async () => {
		const store = createSliceState();

		await (
			store.getState().updateEdge as (props: {
				edgeId: string;
				data: Record<string, unknown>;
			}) => Promise<void>
		)({
			edgeId: 'edge-1',
			data: { label: 'After' },
		});

		const updatedEdge = (store.getState().edges as AppEdge[])[0];
		expect(rerouteAutoWaypointEdgesMock).not.toHaveBeenCalled();
		expect(updatedEdge?.label).toBe('After');
		expect(updatedEdge?.data?.label).toBe('After');
		expect(updatedEdge?.data?.metadata?.routingStyle).toBe('elk');
		expect(updatedEdge?.data?.metadata?.waypoints).toEqual([
			{ id: 'edge-1:wp:0', x: 120, y: 60 },
		]);
		expect(updatedEdge?.data?.metadata?.elkLabel).toBeUndefined();
		expect(updatedEdge?.style?.strokeDasharray).toBe('5 5');
	});

	it('adds an edge without mutating target node parent hierarchy', async () => {
		const store = createSliceState({
			edges: [],
			nodes: [createNode('a', 0, 0), createNode('b', 220, 0, 'original-parent')],
		});

		await (
			store.getState().addEdge as (
				sourceId: string,
				targetId: string,
				data: Partial<EdgeData>
			) => Promise<AppEdge>
		)('a', 'b', {});

		const state = store.getState();
		const targetNode = (state.nodes as AppNode[]).find((node) => node.id === 'b');
		const addedEdge = (state.edges as AppEdge[]).find(
			(edge) => edge.source === 'a' && edge.target === 'b'
		);

		expect(targetNode?.data.parent_id).toBe('original-parent');
		expect(targetNode?.parentId).toBe('original-parent');
		expect(addedEdge).toBeDefined();
		expect(rerouteAutoWaypointEdgesMock).toHaveBeenCalledTimes(2);
		expect(queueMutationMock).toHaveBeenCalledTimes(1);
		expect(broadcastMock).toHaveBeenCalledWith(
			'map-1',
			'EDGE_CREATE',
			expect.objectContaining({
				id: 'mock-uuid',
			})
		);

		const persistDeltaEvent = state.persistDeltaEvent as jest.Mock;
		expect(persistDeltaEvent).toHaveBeenCalledWith(
			'addEdge',
			expect.objectContaining({
				edges: [],
			}),
			expect.any(Object)
		);
	});

	it('returns incoming/outgoing/all/connectedNodeIds from getNodeConnections', () => {
		const edges = [
			createEdge('edge-1', 'a', 'b'),
			createEdge('edge-2', 'c', 'a'),
			createEdge('edge-3', 'a', 'd'),
			createEdge('edge-4', 'b', 'a'),
			createEdge('edge-5', 'a', 'c'),
		];
		const store = createSliceState({ edges });

		const connections = (
			store.getState().getNodeConnections as (nodeId: string) => {
				incoming: AppEdge[];
				outgoing: AppEdge[];
				all: AppEdge[];
				connectedNodeIds: string[];
			}
		)('a');

		expect(connections.incoming.map((edge) => edge.id)).toEqual([
			'edge-2',
			'edge-4',
		]);
		expect(connections.outgoing.map((edge) => edge.id)).toEqual([
			'edge-1',
			'edge-3',
			'edge-5',
		]);
		expect(connections.all.map((edge) => edge.id)).toEqual([
			'edge-1',
			'edge-2',
			'edge-3',
			'edge-4',
			'edge-5',
		]);
		expect(connections.connectedNodeIds).toEqual(['b', 'c', 'd']);
	});
});
