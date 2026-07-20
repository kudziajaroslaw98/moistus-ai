import { createLayoutSlice } from '@/store/slices/layout-slice';
import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type { LayoutConfig, LayoutSlice } from '@/types/layout-types';
import type { StoreApi } from 'zustand';
import type { AppState } from '../app-state';

const runElkLayoutMock = jest.fn();

jest.mock('@/helpers/layout/elk-worker-client', () => ({
	runElkLayout: (...args: unknown[]) => runElkLayoutMock(...args),
}));

jest.mock('@/helpers/layout/local-branch-reflow', () => ({
	applyLocalCreateBranchReflow: jest.fn(),
	applyLocalEditBranchReflow: jest.fn(),
}));

jest.mock('@/helpers/route-auto-waypoint-edges', () => ({
	rerouteAutoWaypointEdges: jest.fn(),
}));

jest.mock('@/lib/realtime/broadcast-channel', () => ({
	BROADCAST_EVENTS: {},
	broadcast: jest.fn(),
	replaceGraphState: jest.fn(),
}));

jest.mock('@/lib/realtime/graph-sync', () => ({
	getEdgeActorId: jest.fn(),
	getNodeActorId: jest.fn(),
	serializeEdgeForRealtime: jest.fn(),
	serializeNodeForRealtime: jest.fn(),
	toPgReal: jest.fn(),
}));

jest.mock('sonner', () => ({
	toast: {
		error: jest.fn(),
		info: jest.fn(),
		loading: jest.fn(() => 'layout-toast'),
		success: jest.fn(),
	},
}));

type LayoutHarnessState = {
	nodes: AppNode[];
	edges: AppEdge[];
	mindMap: null;
	mapId: null;
	supabase: null;
	currentUser: null;
	setMindMapContent: jest.Mock;
	persistDeltaEvent: jest.Mock;
	setLoadingStates: jest.Mock;
} & LayoutSlice;

const createNode = (id: string): AppNode =>
	({
		id,
		position: { x: 0, y: 0 },
		data: {},
	}) as unknown as AppNode;

function createLayoutSliceHarness(layoutConfig: LayoutConfig): {
	getState: () => LayoutHarnessState;
} {
	let state: LayoutHarnessState;
	const set = (
		partial:
			| Partial<LayoutHarnessState>
			| ((current: LayoutHarnessState) => Partial<LayoutHarnessState>)
	) => {
		const patch = typeof partial === 'function' ? partial(state) : partial;
		state = { ...state, ...patch };
	};
	const get = () => state;
	const slice = createLayoutSlice(
		set as never,
		get as never,
		{} as StoreApi<AppState>
	) as unknown as LayoutSlice;

	state = {
		...slice,
		nodes: [createNode('node-1')],
		edges: [],
		mindMap: null,
		mapId: null,
		supabase: null,
		currentUser: null,
		layoutConfig,
		setMindMapContent: jest.fn(),
		persistDeltaEvent: jest.fn().mockResolvedValue(undefined),
		setLoadingStates: jest.fn(),
	};

	return { getState: () => state };
}

describe('layout slice preset actions', () => {
	beforeEach(() => {
		runElkLayoutMock.mockReset();
		runElkLayoutMock.mockImplementation(async ({ nodes, edges }) => ({
			nodes,
			edges,
		}));
	});

	it.each([
		['roomy-right', 'TOP_BOTTOM', 'LEFT_RIGHT'],
		['roomy-down', 'LEFT_RIGHT', 'TOP_BOTTOM'],
		['tree-right', 'TOP_BOTTOM', 'LEFT_RIGHT'],
		['tree-down', 'LEFT_RIGHT', 'TOP_BOTTOM'],
	] as const)(
		'persists %s as %s and clears the transient preset id',
		async (presetId, initialDirection, expectedDirection) => {
			const harness = createLayoutSliceHarness({
				direction: initialDirection,
				nodeSpacing: 50,
				layerSpacing: 100,
				animateTransition: false,
			});

			await harness.getState().applyLayoutPreset(presetId);

			expect(runElkLayoutMock).toHaveBeenCalledWith(
				expect.objectContaining({
					config: expect.objectContaining({
						direction: expectedDirection,
						presetId,
					}),
				})
			);
			expect(harness.getState().layoutConfig).toEqual(
				expect.objectContaining({
					direction: expectedDirection,
					presetId: undefined,
				})
			);
		}
	);

	it('retains the existing direction after radial layout while clearing preset id', async () => {
		const harness = createLayoutSliceHarness({
			direction: 'TOP_BOTTOM',
			nodeSpacing: 50,
			layerSpacing: 100,
			animateTransition: false,
		});

		await harness.getState().applyLayoutPreset('radial-tree');

		expect(runElkLayoutMock).toHaveBeenCalledWith(
			expect.objectContaining({
				config: expect.objectContaining({
					direction: 'TOP_BOTTOM',
					presetId: 'radial-tree',
				}),
			})
		);
		expect(harness.getState().layoutConfig).toEqual(
			expect.objectContaining({
				direction: 'TOP_BOTTOM',
				presetId: undefined,
			})
		);
	});
});
