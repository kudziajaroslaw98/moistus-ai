import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import { act, render } from '@testing-library/react';
import { ReactFlowArea } from './react-flow-area';

const mockReactFlowRenderHistory: Array<{ nodes: AppNode[]; edges: AppEdge[] }> =
	[];
const mockAnimateGraphToState = jest.fn();
const mockCancelAnimation = jest.fn();
const mockNoop = jest.fn();
const mockOpenContextMenuAt = jest.fn();
const mockUseTouchContextMenuFallback = jest.fn();
let mockStoreState: Record<string, unknown>;

jest.mock('@/registry/node-registry', () => ({
	NodeRegistry: {
		getComponentMap: () => ({}),
	},
}));

jest.mock('@xyflow/react', () => {
	const React = require('react');

	return {
		Background: () => null,
		BackgroundVariant: { Dots: 'dots' },
		ConnectionLineType: { Bezier: 'bezier' },
		ConnectionMode: { Loose: 'loose' },
		Panel: ({ children }: { children: React.ReactNode }) =>
			React.createElement(React.Fragment, null, children),
		ReactFlow: ({
			nodes,
			edges,
			children,
		}: {
			nodes: AppNode[];
			edges: AppEdge[];
			children: React.ReactNode;
		}) => {
			mockReactFlowRenderHistory.push({ nodes, edges });
			return React.createElement('div', { 'data-testid': 'react-flow' }, children);
		},
		SelectionMode: { Partial: 'partial' },
		useReactFlow: () => null,
	};
});

jest.mock('@/components/ai-chat', () => ({ ChatPanel: () => null }));
jest.mock('@/components/dashboard/settings-panel', () => ({
	SettingsPanel: () => null,
}));
jest.mock('@/components/edges/animated-ghost-edge', () => () => null);
jest.mock('@/components/edges/floating-edge', () => () => null);
jest.mock('@/components/edges/suggested-connection-edge', () => () => null);
jest.mock('@/components/guided-tour', () => ({
	GuidedTourMode: () => null,
	PathBuilder: () => null,
}));
jest.mock('@/components/modals/upgrade-modal', () => ({
	UpgradeModal: () => null,
}));
jest.mock('@/components/mode-indicator', () => ({
	ModeIndicator: () => null,
}));
jest.mock('@/components/notifications/use-notifications', () => ({
	useNotifications: () => ({
		notifications: [],
		visibleNotifications: [],
		visibleUnreadCount: 0,
		isLoading: false,
		error: null,
		refreshNotifications: jest.fn().mockResolvedValue(undefined),
		markAllAsRead: jest.fn().mockResolvedValue(undefined),
		markNotificationAsRead: jest.fn().mockResolvedValue(undefined),
	}),
}));
jest.mock('@/components/onboarding/onboarding-modal', () => ({
	OnboardingModal: () => null,
}));
jest.mock('@/components/shortcuts-help/shortcuts-help-fab', () => ({
	ShortcutsHelpFab: () => null,
}));
jest.mock('@/components/edges/floating-connection-line', () => () => null);
jest.mock('@/components/edges/suggested-merge-edge', () => ({
	SuggestedMergeEdge: () => null,
}));
jest.mock('@/components/edges/waypoint-edge', () => () => null);
jest.mock('@/components/realtime/realtime-cursor', () => ({
	RealtimeCursors: () => null,
}));
jest.mock('@/components/toolbar', () => ({ Toolbar: () => null }));
jest.mock('@/components/mind-map/top-bar', () => ({
	MindMapTopBar: () => null,
	MobileMenu: () => null,
}));

jest.mock('@/hooks/collaboration/use-permissions', () => ({
	usePermissions: () => ({ canEdit: true }),
}));
jest.mock('@/hooks/realtime/use-activity-tracker', () => ({
	useActivityTracker: () => ({
		activityState: {},
		setDragging: (...args: unknown[]) => mockNoop(...args),
		setViewing: (...args: unknown[]) => mockNoop(...args),
		setTyping: (...args: unknown[]) => mockNoop(...args),
	}),
}));
jest.mock('@/hooks/subscription/use-upgrade-prompt', () => ({
	useUpgradePrompt: () => ({
		shouldShowTimePrompt: () => false,
		showUpgradeModal: (...args: unknown[]) => mockNoop(...args),
		dismissWithCooldown: (...args: unknown[]) => mockNoop(...args),
		clearCooldown: (...args: unknown[]) => mockNoop(...args),
	}),
}));
jest.mock('@/hooks/use-context-menu', () => ({
	useContextMenu: () => ({
		contextMenuHandlers: {
			onEdgeContextMenu: (...args: unknown[]) => mockNoop(...args),
			onPaneClick: (...args: unknown[]) => mockNoop(...args),
			onPaneContextMenu: (...args: unknown[]) => mockNoop(...args),
			onNodeContextMenu: (...args: unknown[]) => mockNoop(...args),
			openContextMenuAt: (...args: unknown[]) =>
				mockOpenContextMenuAt(...args),
		},
	}),
}));
jest.mock('@/hooks/use-touch-context-menu-fallback', () => ({
	useTouchContextMenuFallback: (...args: unknown[]) =>
		mockUseTouchContextMenuFallback(...args),
}));
jest.mock('@/hooks/use-mobile', () => ({
	useIsMobile: () => false,
}));
jest.mock('@/hooks/use-node-suggestion', () => ({
	useNodeSuggestion: () => ({
		generateSuggestionsForNode: (...args: unknown[]) => mockNoop(...args),
	}),
}));
jest.mock('@/hooks/use-animated-layout', () => ({
	useAnimatedLayout: () => ({
		animateGraphToState: (...args: unknown[]) =>
			mockAnimateGraphToState(...args),
		cancelAnimation: (...args: unknown[]) => mockCancelAnimation(...args),
		isAnimating: false,
		animationProgress: 0,
	}),
}));
jest.mock('@/lib/realtime/room-names', () => ({
	getMindMapRoomName: () => 'room-name',
}));
jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: (selector: (state: Record<string, unknown>) => unknown) =>
		selector(mockStoreState),
}));
jest.mock('next/navigation', () => ({
	useParams: () => ({ id: 'map-1' }),
}));
jest.mock('sonner', () => ({
	toast: {
		error: (...args: unknown[]) => mockNoop(...args),
		info: (...args: unknown[]) => mockNoop(...args),
		loading: (...args: unknown[]) => mockNoop(...args),
		success: (...args: unknown[]) => mockNoop(...args),
	},
}));
jest.mock('zustand/shallow', () => ({
	useShallow: <T,>(selector: T) => selector,
}));

const createNode = (id: string, x: number, y: number): AppNode =>
	({
		id,
		type: 'defaultNode',
		position: { x, y },
		data: {
			id,
			map_id: 'map-1',
			parent_id: null,
			content: id,
			position_x: x,
			position_y: y,
			node_type: 'defaultNode',
			created_at: '2026-03-11T00:00:00.000Z',
			updated_at: '2026-03-11T00:00:00.000Z',
			metadata: {},
		},
	} as AppNode);

const createEdge = (id: string, waypointX: number): AppEdge =>
	({
		id,
		source: 'a',
		target: 'b',
		type: 'waypointEdge',
		data: {
			id,
			map_id: 'map-1',
			user_id: 'user-1',
			source: 'a',
			target: 'b',
			label: null,
			animated: false,
			metadata: {
				pathType: 'waypoint',
				waypoints: [{ id: `${id}:wp:0`, x: waypointX, y: 0 }],
			},
			aiData: {},
			created_at: '2026-03-11T00:00:00.000Z',
			updated_at: '2026-03-11T00:00:00.000Z',
		},
	} as AppEdge);

function createMockStore(overrides: Partial<Record<string, unknown>> = {}) {
	const store: Record<string, unknown> = {
		supabase: null,
		nodes: [createNode('a', 0, 0), createNode('b', 200, 0)],
		edges: [createEdge('edge-1', 50)],
		onNodesChange: mockNoop,
		onEdgesChange: mockNoop,
		onConnect: mockNoop,
		setReactFlowInstance: mockNoop,
		setSelectedNodes: mockNoop,
		setPopoverOpen: mockNoop,
		popoverOpen: {
			contextMenu: false,
			upgradeUser: false,
			mapSettings: false,
			history: false,
		},
		setEdgeInfo: mockNoop,
		setMapId: mockNoop,
		addNode: mockNoop,
		fetchMindMapData: jest.fn().mockResolvedValue(undefined),
		deleteNodes: mockNoop,
		isDraggingNodes: false,
		deleteEdges: mockNoop,
		setIsDraggingNodes: mockNoop,
		unsubscribeFromRealtimeUpdates: jest.fn().mockResolvedValue(undefined),
		openNodeEditor: mockNoop,
		getCurrentUser: jest.fn().mockResolvedValue(null),
		getVisibleEdges: () => store.edges as AppEdge[],
		getVisibleNodes: () => store.nodes as AppNode[],
		mindMap: { user_id: 'user-1', layout_direction: 'TOP_BOTTOM' },
		currentUser: { id: 'user-1' },
		mapAccessError: null,
		activeTool: 'default',
		setActiveTool: mockNoop,
		mobileTapMultiSelectEnabled: false,
		setMobileTapMultiSelectEnabled: mockNoop,
		ghostNodes: [],
		isStreaming: false,
		aiFeature: null,
		userProfile: null,
		usageData: null,
		currentSubscription: null,
		maybeStartOnboarding: mockNoop,
		isTourActive: false,
		isPathEditMode: false,
		addNodeToPath: mockNoop,
		isCommentMode: false,
		getCurrentShareUsers: jest.fn().mockResolvedValue([]),
		isFocusMode: false,
		toggleFocusMode: mockNoop,
		resetOnboarding: mockNoop,
		setOnboardingStep: mockNoop,
		setShowOnboarding: mockNoop,
		isProUser: false,
		layoutAnimationVersion: 0,
		animatedNodeIds: [],
		animatedEdgeIds: [],
		...overrides,
	};

	return store;
}

describe('ReactFlowArea', () => {
	beforeEach(() => {
		mockReactFlowRenderHistory.length = 0;
		mockAnimateGraphToState.mockReset();
		mockCancelAnimation.mockReset();
		mockOpenContextMenuAt.mockReset();
		mockUseTouchContextMenuFallback.mockReset();
		mockStoreState = createMockStore();
		mockAnimateGraphToState.mockImplementation(
			async ({
				targetNodes,
				targetEdges,
				onFrame,
			}: {
				targetNodes: AppNode[];
				targetEdges: AppEdge[];
				onFrame?: (graph: { nodes: AppNode[]; edges: AppEdge[] }) => void;
			}) => {
				onFrame?.({
					nodes: targetNodes.map((node) =>
						node.id === 'a'
							? {
									...node,
									position: { x: 50, y: node.position.y },
									data: {
										...node.data,
										position_x: 50,
									},
								}
							: node
					),
					edges: targetEdges.map((edge) =>
						edge.id === 'edge-1'
							? {
									...edge,
									data: edge.data
										? {
												...edge.data,
												metadata: {
													...(edge.data.metadata ?? {}),
													waypoints: [{ id: 'edge-1:wp:0', x: 100, y: 0 }],
												},
											}
										: edge.data,
								}
							: edge
					),
				});

				return { nodes: targetNodes, edges: targetEdges };
			}
		);
	});

	it('renders empty graph while map payload is not ready', () => {
		render(<ReactFlowArea isMapReady={false} />);

		const latestRender = mockReactFlowRenderHistory.at(-1);
		expect(latestRender?.nodes).toEqual([]);
		expect(latestRender?.edges).toEqual([]);
	});

	it('renders animated display nodes and edges when layout animation is signaled', async () => {
		const { rerender } = render(<ReactFlowArea isMapReady={true} />);

		expect(mockReactFlowRenderHistory.at(-1)?.nodes[0]?.position.x).toBe(0);

		mockStoreState = createMockStore({
			nodes: [createNode('a', 100, 0), createNode('b', 300, 0)],
			edges: [createEdge('edge-1', 150)],
			layoutAnimationVersion: 1,
			animatedNodeIds: ['a', 'b'],
			animatedEdgeIds: ['edge-1'],
		});

		await act(async () => {
			rerender(<ReactFlowArea isMapReady={true} />);
			await Promise.resolve();
			await Promise.resolve();
		});

		expect(mockAnimateGraphToState).toHaveBeenCalledTimes(1);
		expect(mockAnimateGraphToState.mock.calls[0][0].animatedNodeIds).toEqual([
			'a',
			'b',
		]);
		expect(mockAnimateGraphToState.mock.calls[0][0].animatedEdgeIds).toEqual([
			'edge-1',
		]);
		expect(
			mockAnimateGraphToState.mock.calls[0][0].targetNodes[0].position.x
		).toBe(100);
		expect(
			mockAnimateGraphToState.mock.calls[0][0].targetEdges[0].data?.metadata
				?.waypoints?.[0]?.x
		).toBe(150);

		const nodePositions = mockReactFlowRenderHistory.map(
			(entry) => entry.nodes[0]?.position.x
		);
		const edgeWaypointPositions = mockReactFlowRenderHistory.map(
			(entry) => entry.edges[0]?.data?.metadata?.waypoints?.[0]?.x
		);

		expect(nodePositions).toContain(50);
		expect(edgeWaypointPositions).toContain(100);
	});

	it('wires touch context menu fallback with expected params and open/closed state', () => {
		const { rerender } = render(<ReactFlowArea isMapReady={true} />);

		expect(mockUseTouchContextMenuFallback).toHaveBeenCalled();
		const firstCallParams = mockUseTouchContextMenuFallback.mock.calls[0][0] as {
			containerRef: { current: unknown };
			openContextMenuAt: (...args: unknown[]) => unknown;
			isContextMenuOpen: boolean;
		};
		expect(firstCallParams.isContextMenuOpen).toBe(false);
		expect(typeof firstCallParams.openContextMenuAt).toBe('function');
		expect(firstCallParams.containerRef).toBeDefined();
		expect(firstCallParams.containerRef.current).not.toBeNull();

		firstCallParams.openContextMenuAt({
			x: 10,
			y: 20,
			nodeId: 'node-via-hook',
			edgeId: null,
		});
		expect(mockOpenContextMenuAt).toHaveBeenCalledWith({
			x: 10,
			y: 20,
			nodeId: 'node-via-hook',
			edgeId: null,
		});

		mockStoreState = createMockStore({
			popoverOpen: {
				contextMenu: true,
				upgradeUser: false,
				mapSettings: false,
				history: false,
			},
		});

		rerender(<ReactFlowArea isMapReady={true} />);

		const lastCallParams = mockUseTouchContextMenuFallback.mock.calls.at(-1)?.[0] as {
			isContextMenuOpen: boolean;
		};
		expect(lastCallParams.isContextMenuOpen).toBe(true);
	});
});
