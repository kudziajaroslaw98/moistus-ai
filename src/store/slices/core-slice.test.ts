import { createCoreDataSlice } from '@/store/slices/core-slice';
import type { StoreApi } from 'zustand';

const mockGetMapCacheRecord = jest.fn();
const mockQueueMutation = jest.fn();
const transformSupabaseDataMock = jest.fn();

jest.mock('@/helpers/supabase/shared-client', () => ({
	getSharedSupabaseClient: () => ({
		auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
		from: jest.fn(),
	}),
}));

jest.mock('@/helpers/with-loading-and-toast', () => ({
	__esModule: true,
	default: (action: unknown) => action,
}));

jest.mock('@/helpers/transform-supabase-data', () => ({
	transformSupabaseData: (...args: unknown[]) => transformSupabaseDataMock(...args),
}));

jest.mock('@/helpers/route-auto-waypoint-edges', () => ({
	rerouteAutoWaypointEdges: ({ edges }: { edges: unknown[] }) => ({
		edges,
		affectedEdgeIds: new Set<string>(),
	}),
}));

jest.mock('@/lib/offline/indexed-db', () => ({
	getMapCacheRecord: (...args: unknown[]) => mockGetMapCacheRecord(...args),
	setMapCacheRecord: jest.fn(),
}));

jest.mock('@/lib/offline/offline-mutation-adapter', () => ({
	queueMutation: (...args: unknown[]) => mockQueueMutation(...args),
}));

jest.mock('sonner', () => ({
	toast: {
		dismiss: jest.fn(),
		error: jest.fn(),
		loading: jest.fn(),
		success: jest.fn(),
	},
}));

function createLoadingStates() {
	return {
		isAddingContent: false,
		isStateLoading: false,
		isHistoryLoading: false,
		isGenerating: false,
		isSummarizing: false,
		isExtracting: false,
		isSearching: false,
		isGeneratingContent: false,
		isSuggestingConnections: false,
		isSummarizingBranch: false,
		isSuggestingMerges: false,
		isSavingNode: false,
		isSavingEdge: false,
		isLoadingComments: false,
		isSavingComment: false,
		isDeletingComment: false,
		isUpdatingMapSettings: false,
		isDeletingMap: false,
	};
}

function createCoreSliceHarness(overrides: Record<string, unknown> = {}) {
	let state: Record<string, any> = {
		layoutConfig: { direction: 'TOP_BOTTOM' },
		mindMap: { id: 'stale-map', title: 'Stale', user_id: 'user-1' },
		mapId: 'stale-map',
		nodes: [{ id: 'node-1' }],
		edges: [{ id: 'edge-1' }],
		selectedNodes: [{ id: 'node-1' }],
		systemUpdatedNodes: new Map([['node-1', 1]]),
		systemUpdatedEdges: new Map([['edge-1', 1]]),
		realtimeSelectedNodes: [{ userId: 'user-2', nodeIds: ['node-1'] }],
		comments: [{ id: 'comment-1' }],
		commentMessages: { 'comment-1': [{ id: 'msg-1' }] },
		activeCommentId: 'comment-1',
		isLoadingComments: true,
		commentError: 'error',
		historyMeta: [{ id: 'history-1' }],
		historyIndex: 0,
		isReverting: true,
		revertingIndex: 0,
		historyPageOffset: 10,
		historyHasMore: true,
		popoverOpen: {
			contextMenu: true,
			edgeEdit: true,
			history: true,
			mergeSuggestions: true,
			aiContent: true,
			generateFromNodesModal: true,
			sharePanel: true,
			joinRoom: true,
			permissionManager: true,
			roomCodeDisplay: true,
			guestSignup: true,
			aiChat: true,
			referenceSearch: true,
			mapSettings: true,
			upgradeUser: true,
		},
		edgeInfo: { id: 'edge-1' },
		contextMenuState: { x: 10, y: 20, nodeId: 'node-1', edgeId: null },
		isFocusMode: true,
		isCommentMode: true,
		isDraggingNodes: true,
		nodeEditor: {
			isOpen: true,
			mode: 'edit',
			position: { x: 1, y: 2 },
			screenPosition: { x: 3, y: 4 },
			parentNode: null,
			existingNodeId: 'node-1',
			suggestedType: null,
			initialValue: 'hello',
			onboardingSource: 'onboarding-pattern',
		},
		commandPalette: {
			isOpen: true,
			position: { x: 1, y: 2 },
			searchQuery: 'abc',
			selectedIndex: 1,
			filteredCommands: [{ id: 'cmd' }],
			trigger: '/',
			anchorPosition: 1,
			activeNodeType: 'questionNode',
		},
		aiFeature: 'suggest-merges',
		ghostNodes: [{ id: 'ghost-1' }],
		isGeneratingSuggestions: true,
		suggestionError: 'error',
		mergeSuggestions: [{ id: 'merge-1' }],
		isStreaming: true,
		streamingError: 'stream-error',
		activeStreamId: 'stream-1',
		streamTrigger: { id: 'trigger-1' },
		chunks: [{ id: 'chunk-1' }],
		streamingAPI: '/api/ai/suggestions',
		stopStreamCallback: jest.fn(),
		lastTriggerTime: 123,
		pendingAnimations: new Map([['edge-1', true]]),
		chatMessages: [{ id: 'chat-1' }],
		isChatStreaming: true,
		chatContext: {
			mapId: 'stale-map',
			selectedNodeIds: ['node-1'],
			contextMode: 'full',
		},
		isChatOpen: true,
		shareTokens: [{ id: 'token-1' }],
		currentShares: [{ id: 'share-1' }],
		activeToken: { id: 'token-1' },
		sharingError: 'share-error',
		lastJoinResult: { map_id: 'stale-map' },
		loadingStates: createLoadingStates(),
		currentUser: { id: 'user-1' },
		userProfile: { id: 'profile-1' },
		currentSubscription: { tier: 'pro' },
		unsubscribeFromNodes: jest.fn().mockResolvedValue(undefined),
		unsubscribeFromEdges: jest.fn().mockResolvedValue(undefined),
		unsubscribeFromCommentUpdates: jest.fn().mockResolvedValue(undefined),
		unsubscribeFromHistoryCurrent: jest.fn().mockResolvedValue(undefined),
		unsubscribeFromSharing: jest.fn(),
		unsubscribeFromCollaboratorUpdates: jest.fn(),
		clearPermissionsState: jest.fn(),
		stopStream: jest.fn(),
		clearToast: jest.fn(),
		fetchComments: jest.fn().mockResolvedValue(undefined),
		fetchInitialPermissions: jest.fn().mockResolvedValue(undefined),
		subscribeToRealtimeUpdates: jest.fn(),
		subscribeToPermissionUpdates: jest.fn(),
		unsubscribeFromPermissionUpdates: jest.fn(),
		generateUserProfile: jest.fn(() => ({ is_anonymous: false })),
		...overrides,
	};

	const set = (partial: any) => {
		const patch = typeof partial === 'function' ? partial(state) : partial;
		state = { ...state, ...(patch ?? {}) };
	};

	const get = () => state;
	const slice = createCoreDataSlice(
		set as never,
		get as never,
		{} as StoreApi<any>
	) as unknown as Record<string, unknown>;
	state = { ...slice, ...state, ...overrides };

	return {
		getState: () => state,
		setState: (patch: Record<string, unknown>) => {
			state = { ...state, ...patch };
		},
	};
}

describe('core slice', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockGetMapCacheRecord.mockReset();
		mockQueueMutation.mockReset();
		transformSupabaseDataMock.mockReset();
	});

	it('clearMindMapRuntimeState clears map-scoped runtime state and preserves global user context', async () => {
		const harness = createCoreSliceHarness();

		harness.getState().clearMindMapRuntimeState();
		await Promise.resolve();
		await Promise.resolve();
		const nextState = harness.getState();

		expect(nextState.mindMap).toBeNull();
		expect(nextState.mapId).toBeNull();
		expect(nextState.nodes).toEqual([]);
		expect(nextState.edges).toEqual([]);
		expect(nextState.selectedNodes).toEqual([]);
		expect(nextState.comments).toEqual([]);
		expect(nextState.historyMeta).toEqual([]);
		expect(nextState.chatMessages).toEqual([]);
		expect(nextState.chatContext).toEqual({
			mapId: null,
			selectedNodeIds: [],
			contextMode: 'summary',
		});
		expect(nextState.popoverOpen.mapSettings).toBe(false);
		expect(nextState.isFocusMode).toBe(false);
		expect(nextState.loadingStates).toEqual(createLoadingStates());

		expect(nextState.currentUser).toEqual({ id: 'user-1' });
		expect(nextState.userProfile).toEqual({ id: 'profile-1' });
		expect(nextState.currentSubscription).toEqual({ tier: 'pro' });

		expect(nextState.unsubscribeFromNodes).toHaveBeenCalledTimes(1);
		expect(nextState.unsubscribeFromEdges).toHaveBeenCalledTimes(1);
		expect(nextState.unsubscribeFromCommentUpdates).toHaveBeenCalledTimes(1);
		expect(nextState.unsubscribeFromHistoryCurrent).toHaveBeenCalledTimes(1);
		expect(nextState.clearPermissionsState).toHaveBeenCalledTimes(2);
		expect(nextState.unsubscribeFromSharing).toHaveBeenCalledTimes(1);
		expect(nextState.unsubscribeFromCollaboratorUpdates).toHaveBeenCalledTimes(1);
		expect(nextState.stopStream).toHaveBeenCalledTimes(1);
		expect(nextState.clearToast).toHaveBeenCalledTimes(1);
	});

	it('fetchMindMapData ignores late responses when the active map id changed', async () => {
		let resolveSingle: (
			value: {
				data: Record<string, unknown> | null;
				error: unknown;
			}
		) => void = () => {};
		const singlePromise = new Promise<{
			data: Record<string, unknown> | null;
			error: unknown;
		}>((resolve) => {
			resolveSingle = resolve;
		});

		const query = {
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			single: jest.fn().mockReturnValue(singlePromise),
		};
		const supabase = {
			from: jest.fn().mockReturnValue(query),
		};

		transformSupabaseDataMock.mockReturnValue({
			mindMap: {
				id: 'map-a',
				title: 'Map A',
				user_id: 'user-1',
				layout_direction: 'TOP_BOTTOM',
			},
			reactFlowNodes: [{ id: 'new-node' }],
			reactFlowEdges: [{ id: 'new-edge' }],
		});

		const fetchComments = jest.fn().mockResolvedValue(undefined);
		const fetchInitialPermissions = jest.fn().mockResolvedValue(undefined);

		const harness = createCoreSliceHarness({
			mapId: 'map-a',
			supabase,
			fetchComments,
			fetchInitialPermissions,
			mindMap: { id: 'stale-map', title: 'Stale', user_id: 'user-1' },
			nodes: [{ id: 'stale-node' }],
			edges: [{ id: 'stale-edge' }],
		});

		const promise = harness.getState().fetchMindMapData('map-a');
		harness.setState({ mapId: null });

		resolveSingle({
			data: {
				map_id: 'map-a',
				user_id: 'user-1',
				is_template: false,
				nodes: [],
				edges: [],
				layout_direction: 'TOP_BOTTOM',
				map_updated_at: '2026-04-07T10:00:00.000Z',
			},
			error: null,
		});

		await promise;

		expect(transformSupabaseDataMock).not.toHaveBeenCalled();
		expect(fetchComments).not.toHaveBeenCalled();
		expect(fetchInitialPermissions).not.toHaveBeenCalled();
		expect(harness.getState().mindMap).toEqual({
			id: 'stale-map',
			title: 'Stale',
			user_id: 'user-1',
		});
		expect(harness.getState().nodes).toEqual([{ id: 'stale-node' }]);
		expect(harness.getState().edges).toEqual([{ id: 'stale-edge' }]);
	});

	it('fetchMindMapData ignores stale offline cache hydration after the active map id changed', async () => {
		let resolveCache: (value: { payload: Record<string, unknown> } | null) => void =
			() => {};
		const cachePromise = new Promise<{ payload: Record<string, unknown> } | null>(
			(resolve) => {
				resolveCache = resolve;
			}
		);

		mockGetMapCacheRecord.mockReturnValue(cachePromise);

		const query = {
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			single: jest.fn().mockResolvedValue({
				data: null,
				error: { message: 'Failed to fetch' },
			}),
		};

		const harness = createCoreSliceHarness({
			mapId: 'map-a',
			supabase: {
				from: jest.fn().mockReturnValue(query),
			},
			mindMap: { id: 'stale-map', title: 'Stale', user_id: 'user-1' },
			nodes: [{ id: 'stale-node' }],
			edges: [{ id: 'stale-edge' }],
		});

		const promise = harness.getState().fetchMindMapData('map-a');
		await Promise.resolve();
		expect(mockGetMapCacheRecord).toHaveBeenCalledWith('map-a');

		harness.setState({ mapId: null });

		resolveCache({
			payload: {
				map_id: 'map-a',
				nodes: [],
				edges: [],
			},
		});

		await promise;

		expect(transformSupabaseDataMock).not.toHaveBeenCalled();
		expect(harness.getState().mindMap).toEqual({
			id: 'stale-map',
			title: 'Stale',
			user_id: 'user-1',
		});
		expect(harness.getState().nodes).toEqual([{ id: 'stale-node' }]);
		expect(harness.getState().edges).toEqual([{ id: 'stale-edge' }]);
	});

	it('keeps layoutConfig.direction in sync for queued map updates', async () => {
		mockQueueMutation.mockResolvedValueOnce({
			status: 'queued',
			opId: 'queued-op-1',
		});

		const harness = createCoreSliceHarness({
			mindMap: {
				id: 'map-a',
				title: 'Map A',
				user_id: 'user-1',
				layout_direction: 'TOP_BOTTOM',
			},
			layoutConfig: { direction: 'TOP_BOTTOM' },
		});

		await harness.getState().updateMindMap('map-a', {
			layout_direction: 'LEFT_RIGHT',
		});

		expect(harness.getState().mindMap).toEqual(
			expect.objectContaining({
				layout_direction: 'LEFT_RIGHT',
			})
		);
		expect(harness.getState().layoutConfig).toEqual(
			expect.objectContaining({
				direction: 'LEFT_RIGHT',
			})
		);
	});

	it('coalesces concurrent realtime unsubscribe calls into a single teardown pass', async () => {
		let resolveNodesCleanup: () => void = () => {};
		const nodesCleanupPromise = new Promise<void>((resolve) => {
			resolveNodesCleanup = resolve;
		});

		const unsubscribeFromNodes = jest
			.fn()
			.mockImplementation(() => nodesCleanupPromise);
		const unsubscribeFromEdges = jest.fn().mockResolvedValue(undefined);
		const unsubscribeFromCommentUpdates = jest.fn().mockResolvedValue(undefined);
		const unsubscribeFromHistoryCurrent = jest.fn().mockResolvedValue(undefined);
		const unsubscribeFromPermissionUpdates = jest.fn();
		const clearPermissionsState = jest.fn();

		const harness = createCoreSliceHarness({
			unsubscribeFromNodes,
			unsubscribeFromEdges,
			unsubscribeFromCommentUpdates,
			unsubscribeFromHistoryCurrent,
			unsubscribeFromPermissionUpdates,
			clearPermissionsState,
		});

		const first = harness.getState().unsubscribeFromRealtimeUpdates();
		const second = harness.getState().unsubscribeFromRealtimeUpdates();

		expect(unsubscribeFromNodes).toHaveBeenCalledTimes(1);
		expect(unsubscribeFromEdges).toHaveBeenCalledTimes(1);
		expect(unsubscribeFromCommentUpdates).toHaveBeenCalledTimes(1);
		expect(unsubscribeFromHistoryCurrent).toHaveBeenCalledTimes(1);

		resolveNodesCleanup();
		await Promise.all([first, second]);

		expect(unsubscribeFromPermissionUpdates).toHaveBeenCalledTimes(1);
		expect(clearPermissionsState).toHaveBeenCalledTimes(1);
		expect(harness.getState()._realtimeUnsubscribePromise).toBeNull();
	});
});
