import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';

const rerouteAutoWaypointEdgesMock = jest.fn(
	({ edges }: { edges: AppEdge[] }) => ({
		edges,
		affectedEdgeIds: new Set<string>(),
	})
);
const broadcastMock = jest.fn().mockResolvedValue(undefined);

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

jest.mock('@/lib/realtime/broadcast-channel', () => ({
	broadcast: (
		mapId: string,
		event: string,
		payload: Record<string, unknown>
	) => broadcastMock(mapId, event, payload),
	BROADCAST_EVENTS: {
		EDGE_UPDATE: 'EDGE_UPDATE',
	},
	subscribeToSyncEvents: jest.fn(),
}));

jest.mock('sonner', () => ({
	toast: {
		error: jest.fn(),
		info: jest.fn(),
		loading: jest.fn(),
		success: jest.fn(),
	},
}));

import { createEdgeSlice } from './edges-slice';

function createNode(id: string, x: number, y: number): AppNode {
	return {
		id,
		type: 'defaultNode',
		position: { x, y },
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
			parent_id: null,
		},
	} as AppNode;
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

function createSliceState(edge: AppEdge) {
	let state: Record<string, unknown> = {
		edges: [edge],
		nodes: [createNode('a', 0, 0), createNode('b', 220, 0)],
		mapId: 'map-1',
		currentUser: { id: 'user-1' },
		layoutConfig: {
			direction: 'LEFT_RIGHT',
		},
		persistDeltaEvent: jest.fn().mockResolvedValue(undefined),
		triggerEdgeSave: jest.fn(),
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

describe('edges-slice updateEdge', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('invalidates ELK label placement without rerouting when only the label changes', async () => {
		const store = createSliceState(createElkEdge());

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
});
