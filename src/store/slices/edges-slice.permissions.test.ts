import type { AppEdge } from '@/types/app-edge';

const mockBroadcast = jest.fn();
const mockQueueMutation = jest.fn();

jest.mock('@/helpers/generate-uuid', () => jest.fn(() => 'mock-uuid'));

jest.mock('@/helpers/route-auto-waypoint-edges', () => ({
	getRenderableEdgeType: () => 'waypointEdge',
	rerouteAutoWaypointEdges: ({ edges }: { edges: AppEdge[] }) => ({
		edges,
		affectedEdgeIds: new Set<string>(),
	}),
}));

jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: { getState: () => ({ setLoadingStates: jest.fn() }) },
}));

jest.mock('@/lib/offline/offline-mutation-adapter', () => ({
	queueMutation: (...args: unknown[]) => mockQueueMutation(...args),
}));

jest.mock('@/lib/realtime/graph-sync', () => ({
	getEdgeActorId: () => 'actor-id',
	getNodeActorId: () => 'actor-id',
	serializeEdgeForRealtime: (edge: AppEdge) => edge.data ?? null,
	serializeNodeForRealtime: jest.fn(),
}));

jest.mock('@/lib/realtime/broadcast-channel', () => ({
	broadcast: (...args: unknown[]) => mockBroadcast(...args),
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
	},
}));

type Role = 'owner' | 'editor' | 'commenter' | 'viewer';

function createEdge(label: string | null = 'Before'): AppEdge {
	return {
		id: 'edge-1',
		source: 'a',
		target: 'b',
		type: 'waypointEdge',
		data: {
			id: 'edge-1',
			map_id: 'map-1',
			user_id: 'creator-id',
			source: 'a',
			target: 'b',
			label,
			animated: false,
			metadata: {},
			aiData: {},
			created_at: '2026-10-13T00:00:00.000Z',
			updated_at: '2026-10-13T00:00:00.000Z',
		},
	} as AppEdge;
}

function createHarness(role: Role) {
	const { createEdgeSlice } =
		require('@/store/slices/edges-slice') as typeof import('@/store/slices/edges-slice');
	const getUser = jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } });

	let state: Record<string, unknown> = {
		edges: [createEdge()],
		nodes: [],
		mapId: 'map-1',
		currentUser: { id: 'user-1' },
		mindMap: { id: 'map-1', user_id: role === 'owner' ? 'user-1' : 'owner' },
		permissions: {
			role,
			can_view: true,
			can_comment: role === 'commenter' || role === 'editor',
			can_edit: role === 'editor',
		},
		layoutConfig: { direction: 'LEFT_RIGHT' },
		getVisibleNodes: () => [],
		supabase: { auth: { getUser } },
	};
	const set = (
		update:
			| Partial<Record<string, unknown>>
			| ((current: Record<string, unknown>) => Partial<Record<string, unknown>>)
	) => {
		state = { ...state, ...(typeof update === 'function' ? update(state) : update) };
	};
	const get = () => state;
	const triggerEdgeSave = jest.fn();
	const persistDeltaEvent = jest.fn().mockResolvedValue(undefined);
	const edges = state.edges;
	state = {
		...createEdgeSlice(set as never, get as never, undefined as never),
		...state,
		edges,
		triggerEdgeSave,
		persistDeltaEvent,
	};

	return {
		slice: state as unknown as ReturnType<typeof createEdgeSlice>,
		getEdges: () => state.edges as AppEdge[],
		getUser,
		triggerEdgeSave,
		persistDeltaEvent,
	};
}

function expectNothingSent(harness: ReturnType<typeof createHarness>) {
	expect(harness.getUser).not.toHaveBeenCalled();
	expect(mockBroadcast).not.toHaveBeenCalled();
	expect(mockQueueMutation).not.toHaveBeenCalled();
	expect(harness.triggerEdgeSave).not.toHaveBeenCalled();
	expect(harness.persistDeltaEvent).not.toHaveBeenCalled();
}

describe('edges slice permissions', () => {
	beforeEach(() => {
		mockBroadcast.mockReset().mockResolvedValue(undefined);
		mockQueueMutation
			.mockReset()
			.mockResolvedValue({ status: 'applied', data: null });
		jest.spyOn(console, 'error').mockImplementation(() => undefined);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe.each<Role>(['viewer', 'commenter'])('for a %s', (role) => {
		it('does not update an edge', async () => {
			const harness = createHarness(role);

			await harness.slice.updateEdge({ edgeId: 'edge-1', data: { label: 'After' } });

			expect(harness.getEdges()[0].data?.label).toBe('Before');
			expectNothingSent(harness);
		});

		it('does not add an edge', async () => {
			const harness = createHarness(role);

			await harness.slice.addEdge('a', 'c', {});

			expect(harness.getEdges()).toHaveLength(1);
			expectNothingSent(harness);
		});

		it('does not connect two nodes', () => {
			const harness = createHarness(role);

			harness.slice.onConnect({
				source: 'a',
				target: 'c',
				sourceHandle: null,
				targetHandle: null,
			});

			expect(harness.getEdges()).toHaveLength(1);
			expectNothingSent(harness);
		});

		it('does not delete an edge', async () => {
			const harness = createHarness(role);

			await harness.slice.deleteEdges(harness.getEdges());

			expect(harness.getEdges()).toHaveLength(1);
			expectNothingSent(harness);
		});

		it('keeps an edge change on screen but sends nothing', () => {
			const harness = createHarness(role);

			harness.slice.onEdgesChange([
				{ id: 'edge-1', type: 'replace', item: createEdge('After') },
			]);

			expect(harness.getEdges()[0].data?.label).toBe('After');
			expectNothingSent(harness);
		});
	});

	describe.each<Role>(['owner', 'editor'])('for an %s', (role) => {
		it('updates an edge', async () => {
			const harness = createHarness(role);

			await harness.slice.updateEdge({ edgeId: 'edge-1', data: { label: 'After' } });

			expect(harness.getEdges()[0].data?.label).toBe('After');
			expect(harness.getUser).toHaveBeenCalled();
		});

		it('deletes an edge', async () => {
			const harness = createHarness(role);

			await harness.slice.deleteEdges(harness.getEdges());

			expect(harness.getEdges()).toHaveLength(0);
		});

		it('saves and shares an edge change', () => {
			const harness = createHarness(role);

			harness.slice.onEdgesChange([
				{ id: 'edge-1', type: 'replace', item: createEdge('After') },
			]);

			expect(harness.triggerEdgeSave).toHaveBeenCalledWith('edge-1');
			expect(mockBroadcast).toHaveBeenCalledTimes(1);
			expect(harness.persistDeltaEvent).toHaveBeenCalledTimes(1);
		});
	});
});
