import type { AppNode } from '@/types/app-node';
import { toast } from 'sonner';

jest.mock('@/helpers/generate-uuid', () => jest.fn(() => 'mock-uuid'));

// The history slice builds a Supabase browser client on import.
jest.mock('@/helpers/supabase/shared-client', () => ({
	getSharedSupabaseClient: () => ({}),
}));

jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: { getState: () => ({ setLoadingStates: jest.fn() }) },
}));

jest.mock('sonner', () => ({
	toast: {
		error: jest.fn(),
		info: jest.fn(),
		loading: jest.fn(),
		success: jest.fn(),
	},
}));

type Role = 'owner' | 'editor' | 'viewer';

function permissionState(role: Role) {
	return {
		currentUser: { id: 'user-1' },
		mindMap: { id: 'map-1', user_id: role === 'owner' ? 'user-1' : 'owner' },
		permissions: {
			role,
			can_view: true,
			can_comment: false,
			can_edit: role === 'editor',
		},
	};
}

function createNode(id: string): AppNode {
	return {
		id,
		type: 'defaultNode',
		position: { x: 0, y: 0 },
		data: {
			id,
			map_id: 'map-1',
			parent_id: null,
			content: id,
			position_x: 0,
			position_y: 0,
			node_type: 'defaultNode',
			metadata: {},
		},
	} as unknown as AppNode;
}

function createSliceState<Slice>(
	factory: (set: never, get: never, api: never) => Slice,
	initial: Record<string, unknown>
) {
	let state: Record<string, unknown> = { ...initial };
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
	const slice = factory(set as never, get as never, undefined as never);
	state = { ...state, ...slice, ...initial };

	return { slice, getState: () => state };
}

describe.each<Role>(['viewer'])('writes by a %s', (role) => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('pastes nothing', async () => {
		const { createClipboardSlice } =
			require('@/store/slices/clipboard-slice') as typeof import('@/store/slices/clipboard-slice');
		const addNode = jest.fn();
		const addEdge = jest.fn();
		const { slice } = createSliceState(createClipboardSlice as never, {
			...permissionState(role),
			copiedNodes: [createNode('a')],
			copiedEdges: [],
			reactFlowInstance: null,
			addNode,
			addEdge,
		});

		await (slice as { pasteNodes: () => Promise<void> }).pasteNodes();

		expect(addNode).not.toHaveBeenCalled();
		expect(addEdge).not.toHaveBeenCalled();
	});

	it('groups nothing and shows no toast', async () => {
		const { createGroupsSlice } =
			require('@/store/slices/groups-slice') as typeof import('@/store/slices/groups-slice');
		const addNode = jest.fn();
		const { slice } = createSliceState(createGroupsSlice as never, {
			...permissionState(role),
			nodes: [createNode('a'), createNode('b')],
			selectedNodes: [createNode('a'), createNode('b')],
			addNode,
		});

		await (slice as { createGroupFromSelected: () => Promise<void> }).createGroupFromSelected();

		expect(addNode).not.toHaveBeenCalled();
		expect(toast.loading).not.toHaveBeenCalled();
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('ungroups nothing and shows no toast', async () => {
		const { createGroupsSlice } =
			require('@/store/slices/groups-slice') as typeof import('@/store/slices/groups-slice');
		const deleteNodes = jest.fn();
		const { slice } = createSliceState(createGroupsSlice as never, {
			...permissionState(role),
			nodes: [createNode('group')],
			updateNode: jest.fn(),
			deleteNodes,
		});

		await (slice as { ungroupNodes: (id: string) => Promise<void> }).ungroupNodes(
			'group'
		);

		expect(deleteNodes).not.toHaveBeenCalled();
		expect(toast.loading).not.toHaveBeenCalled();
	});

	it('records no history', async () => {
		const { createHistorySlice } =
			require('@/store/slices/history-slice') as typeof import('@/store/slices/history-slice');
		const from = jest.fn();
		const getUser = jest.fn();
		const { slice } = createSliceState(createHistorySlice as never, {
			...permissionState(role),
			mapId: 'map-1',
			isReverting: false,
			historyBatchDepth: 0,
			supabase: { from, auth: { getUser } },
		});

		await (
			slice as {
				persistDeltaEvent: (
					action: string,
					prev: { nodes: AppNode[]; edges: never[] },
					next: { nodes: AppNode[]; edges: never[] }
				) => Promise<void>;
			}
		).persistDeltaEvent(
			'saveNodeProperties',
			{ nodes: [createNode('a')], edges: [] },
			{ nodes: [], edges: [] }
		);

		expect(from).not.toHaveBeenCalled();
		expect(getUser).not.toHaveBeenCalled();
	});
});

describe('writes by an editor', () => {
	it('still pastes', async () => {
		const { createClipboardSlice } =
			require('@/store/slices/clipboard-slice') as typeof import('@/store/slices/clipboard-slice');
		const addNode = jest.fn();
		const { slice } = createSliceState(createClipboardSlice as never, {
			...permissionState('editor'),
			copiedNodes: [createNode('a')],
			copiedEdges: [],
			reactFlowInstance: null,
			addNode,
			addEdge: jest.fn(),
		});

		await (slice as { pasteNodes: () => Promise<void> }).pasteNodes();

		expect(addNode).toHaveBeenCalledTimes(1);
	});

	it('still records history', async () => {
		const { createHistorySlice } =
			require('@/store/slices/history-slice') as typeof import('@/store/slices/history-slice');
		const from = jest.fn(() => {
			throw new Error('reached the database');
		});
		jest.spyOn(console, 'error').mockImplementation(() => undefined);
		const { slice } = createSliceState(createHistorySlice as never, {
			...permissionState('editor'),
			mapId: 'map-1',
			isReverting: false,
			historyBatchDepth: 0,
			supabase: { from, auth: { getUser: jest.fn() } },
		});

		await (
			slice as {
				persistDeltaEvent: (
					action: string,
					prev: { nodes: AppNode[]; edges: never[] },
					next: { nodes: AppNode[]; edges: never[] }
				) => Promise<void>;
			}
		).persistDeltaEvent(
			'saveNodeProperties',
			{ nodes: [createNode('a')], edges: [] },
			{ nodes: [], edges: [] }
		);

		expect(from).toHaveBeenCalled();
	});
});
