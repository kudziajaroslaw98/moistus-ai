'use client';
import { GRID_SIZE } from '@/constants/grid';
import { NodeRegistry } from '@/registry/node-registry';
import {
	Background,
	BackgroundVariant,
	ConnectionLineType,
	ConnectionMode,
	Edge,
	EdgeMouseHandler,
	EdgeTypes,
	Node,
	NodeTypes,
	OnConnectStartParams,
	Panel,
	ReactFlow,
	SelectionMode,
	useReactFlow,
} from '@xyflow/react';
import {
	CSSProperties,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react';

import { ChatPanel } from '@/components/ai-chat';
import { SettingsPanel } from '@/components/dashboard/settings-panel';
import AnimatedGhostEdge from '@/components/edges/animated-ghost-edge';
import FloatingEdge from '@/components/edges/floating-edge';
import SuggestedConnectionEdge from '@/components/edges/suggested-connection-edge';
import { UpgradeModal } from '@/components/modals/upgrade-modal';
import { ModeIndicator } from '@/components/mode-indicator';
import { GuidedTourMode, PathBuilder } from '@/components/guided-tour';
import { ShortcutsHelpFab } from '@/components/shortcuts-help/shortcuts-help-fab';
import { usePermissions } from '@/hooks/collaboration/use-permissions';
import { useActivityTracker } from '@/hooks/realtime/use-activity-tracker';
import { useUpgradePrompt } from '@/hooks/subscription/use-upgrade-prompt';
import { useContextMenu } from '@/hooks/use-context-menu';
import { useNodeSuggestion } from '@/hooks/use-node-suggestion';
import useAppStore from '@/store/mind-map-store';
import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type { EdgeData } from '@/types/edge-data';
import type { NodeData } from '@/types/node-data';
import { cn } from '@/utils/cn';
import { useParams, useRouter } from 'next/navigation';
import { useShallow } from 'zustand/shallow';
import { toast } from 'sonner';
import FloatingConnectionLine from '../edges/floating-connection-line';
import { SuggestedMergeEdge } from '../edges/suggested-merge-edge';
import WaypointEdge from '../edges/waypoint-edge';
import { RealtimeCursors } from '../realtime/realtime-cursor';
import { Toolbar } from '../toolbar';
import { MindMapTopBar, MobileMenu } from './top-bar';

// Feature flag: Set NEXT_PUBLIC_ENABLE_AI_CHAT=true to enable AI Chat
const ENABLE_AI_CHAT = process.env.NEXT_PUBLIC_ENABLE_AI_CHAT === 'true';

export function ReactFlowArea() {
	const mapId = useParams().id;
	const router = useRouter();
	const reactFlowInstance = useReactFlow();
	const connectingNodeId = useRef<string | null>(null);
	const connectingHandleId = useRef<string | null>(null);
	const connectingHandleType = useRef<'source' | 'target' | null>(null);
	// Prevent duplicate fetch in React Strict Mode (dev runs effects twice)
	const fetchStartedRef = useRef(false);
	const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const [settingsTab, setSettingsTab] = useState<'account' | 'billing'>(
		'account'
	);
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	const handleOpenSettings = (tab: 'account' | 'billing' = 'account') => {
		setSettingsTab(tab);
		setIsSettingsOpen(true);
	};

	// Activity tracking for real-time collaboration
	const { activityState, setDragging, setViewing, setTyping } =
		useActivityTracker();

	const {
		supabase,
		nodes,
		edges,
		onNodesChange,
		onEdgesChange,
		onConnect,
		setReactFlowInstance,
		setSelectedNodes,
		setPopoverOpen,
		popoverOpen,
		setEdgeInfo,
		setMapId,
		addNode: addNode,
		fetchMindMapData,
		deleteNodes,
		isDraggingNodes,
		deleteEdges,
		setIsDraggingNodes,
		unsubscribeFromRealtimeUpdates,
		openNodeEditor,
		getCurrentUser,
		getVisibleEdges,
		getVisibleNodes,
		mindMap,
		currentUser,
		activeTool,
		setActiveTool,
		ghostNodes,
		isStreaming,
		aiFeature,
		userProfile,
		isTourActive,
		isPathEditMode,
		addNodeToPath,
		isCommentMode,
		getCurrentShareUsers,
	} = useAppStore(
		useShallow((state) => ({
			supabase: state.supabase,
			nodes: state.nodes,
			edges: state.edges,
			getVisibleEdges: state.getVisibleEdges,
			getVisibleNodes: state.getVisibleNodes,
			isFocusMode: state.isFocusMode,
			onNodesChange: state.onNodesChange,
			onEdgesChange: state.onEdgesChange,
			onConnect: state.onConnect,
			setReactFlowInstance: state.setReactFlowInstance,
			setSelectedNodes: state.setSelectedNodes,
			setPopoverOpen: state.setPopoverOpen,
			popoverOpen: state.popoverOpen,
			isDraggingNodes: state.isDraggingNodes,
			setEdgeInfo: state.setEdgeInfo,
			setMapId: state.setMapId,
			addNode: state.addNode,
			fetchMindMapData: state.fetchMindMapData,
			deleteNodes: state.deleteNodes,
			deleteEdges: state.deleteEdges,
			setIsDraggingNodes: state.setIsDraggingNodes,
			unsubscribeFromRealtimeUpdates: state.unsubscribeFromRealtimeUpdates,
			openNodeEditor: state.openNodeEditor,
			getCurrentUser: state.getCurrentUser,
			toggleFocusMode: state.toggleFocusMode,
			mindMap: state.mindMap,
			currentUser: state.currentUser,
			activeTool: state.activeTool,
			setActiveTool: state.setActiveTool,
			ghostNodes: state.ghostNodes,
			isStreaming: state.isStreaming,
			aiFeature: state.aiFeature,
			resetOnboarding: state.resetOnboarding,
			setOnboardingStep: state.setOnboardingStep,
			setShowOnboarding: state.setShowOnboarding,
			isProUser: state.isProUser,
			userProfile: state.userProfile,
			// Guided tour state
			isTourActive: state.isTourActive,
			isPathEditMode: state.isPathEditMode,
			addNodeToPath: state.addNodeToPath,
			// Comment mode - needed for visibility memoization
			isCommentMode: state.isCommentMode,
			getCurrentShareUsers: state.getCurrentShareUsers,
		}))
	);

	const { contextMenuHandlers } = useContextMenu();
	const { generateSuggestionsForNode } = useNodeSuggestion();
	const { canEdit } = usePermissions();

	// Permission-gated delete handlers
	// Viewers should not be able to delete nodes/edges via Delete key
	const handleNodesDelete = useCallback(
		(nodesToDelete: Node[]) => {
			if (!canEdit) return;
			// Cast is safe: React Flow returns same objects we passed in
			deleteNodes(nodesToDelete as AppNode[]);
		},
		[canEdit, deleteNodes]
	);

	const handleEdgesDelete = useCallback(
		(edgesToDelete: Edge[]) => {
			if (!canEdit) return;
			// Cast is safe: React Flow returns same objects we passed in
			deleteEdges(edgesToDelete as AppEdge[]);
		},
		[canEdit, deleteEdges]
	);

	// Memoize visible nodes to prevent infinite re-renders
	// getVisibleNodes() returns new array on each call via .filter()
	// Without memoization, ReactFlow sees "new" arrays every render → triggers onNodesChange → state update → re-render loop
	// isCommentMode is needed because getVisibleNodes() filters based on it internally
	const visibleNodes = useMemo(() => {
		return [...getVisibleNodes(), ...ghostNodes];
	}, [nodes, ghostNodes, getVisibleNodes, isCommentMode]);

	// Memoize visible edges to prevent infinite re-renders
	// Edge visibility depends on node visibility (collapsed nodes hide their edges)
	// isCommentMode affects which nodes are visible, which affects edge visibility
	const visibleEdges = useMemo(() => {
		return getVisibleEdges();
	}, [edges, nodes, getVisibleEdges, isCommentMode]);

	useEffect(() => {
		getCurrentUser();

		if (reactFlowInstance) {
			setReactFlowInstance(reactFlowInstance);
		}
	}, [reactFlowInstance, setReactFlowInstance]);

	useEffect(() => {
		if (!mapId || !supabase) return;
		// Prevent duplicate fetch in React Strict Mode (dev runs effects twice)
		if (fetchStartedRef.current) return;
		fetchStartedRef.current = true;

		setMapId(mapId as string);
		fetchMindMapData(mapId as string);
		getCurrentShareUsers().catch((error) => {
			console.error('[ReactFlowArea] Failed to fetch current share users:', error);
			toast.error('Failed to load collaborators for this map');
		});
	}, [fetchMindMapData, mapId, supabase, getCurrentShareUsers]);

	useEffect(() => {
		return () => {
			unsubscribeFromRealtimeUpdates();
		};
	}, []);

	// Track mouse position for InlineNodeCreator
	useLayoutEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			setMousePosition({ x: e.clientX, y: e.clientY });
		};

		window.addEventListener('mousemove', handleMouseMove);
		return () => window.removeEventListener('mousemove', handleMouseMove);
	}, [setMousePosition]);

	// Handle "/" key to open InlineNodeCreator
	useLayoutEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Track typing activity when user types in input fields
			if (isInputElement(e.target)) {
				// Ignore modifier keys, arrow keys, etc.
				if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete') {
					setTyping();
				}
			}

			// Check if "/" key is pressed and not in an input
			if (e.key === '/' && !isInputElement(e.target)) {
				e.preventDefault();

				const position = reactFlowInstance?.screenToFlowPosition({
					x: mousePosition.x,
					y: mousePosition.y,
				}) || { x: 0, y: 0 };


				openNodeEditor({
					position,
					screenPosition: position,
					mode: 'create',
				});
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [mousePosition, openNodeEditor, reactFlowInstance, setTyping]);

	const handleNodeDoubleClick = useCallback(
		(event: React.MouseEvent, node: Node<NodeData>) => {
			openNodeEditor({
				mode: 'edit',
				position: node.position,
				existingNodeId: node.id,
			});
		},
		[openNodeEditor]
	);

	const handleNodeClick = useCallback(
		(event: React.MouseEvent, node: Node<NodeData>) => {
			// Handle path edit mode - add clicked node to path
			if (isPathEditMode) {
				event.preventDefault();
				event.stopPropagation();
				addNodeToPath(node.id);
				return;
			}

			if (activeTool === 'magic-wand' && aiFeature === 'suggest-nodes') {
				event.preventDefault();
				event.stopPropagation();
				generateSuggestionsForNode(node.id, 'magic-wand');
				setActiveTool('default');
			}
		},
		[activeTool, isStreaming, generateSuggestionsForNode, isPathEditMode, addNodeToPath]
	);

	const handleEdgeDoubleClick: EdgeMouseHandler<Edge<EdgeData>> = useCallback(
		(event, edge) => {
			// Forward double-click to waypoint edge component via custom event
			if (
				edge.type === 'waypointEdge' ||
				edge.data?.metadata?.pathType === 'waypoint'
			) {
				const customEvent = new CustomEvent('waypoint-edge-add', {
					detail: {
						edgeId: edge.id,
						clientX: event.clientX,
						clientY: event.clientY,
					},
				});
				document.dispatchEvent(customEvent);
				return;
			}
			setEdgeInfo(edge);
			setPopoverOpen({ edgeEdit: true });
		},
		[]
	);

	const nodeTypesWithProps: NodeTypes = useMemo(
		() => NodeRegistry.getComponentMap(),
		[]
	);

	const edgeTypes: EdgeTypes = useMemo(
		() => ({
			suggestedMerge: SuggestedMergeEdge,
			suggestedConnection: SuggestedConnectionEdge,
			animatedGhostEdge: AnimatedGhostEdge,
			editableEdge: FloatingEdge,
			defaultEdge: FloatingEdge,
			floatingEdge: FloatingEdge,
			waypointEdge: WaypointEdge,
			default: FloatingEdge,
		}),
		[]
	);

	const onConnectStart = useCallback(
		(
			event: MouseEvent | TouchEvent,
			{ nodeId, handleId, handleType }: OnConnectStartParams
		) => {
			connectingNodeId.current = nodeId;
			connectingHandleId.current = handleId;
			connectingHandleType.current = handleType;
		},
		[]
	);

	const onConnectEnd = useCallback(
		(event: MouseEvent | TouchEvent) => {
			if (!connectingNodeId.current || !reactFlowInstance) {
				return;
			}

			const targetIsPane = (event.target as HTMLElement).classList.contains(
				'react-flow__pane'
			);

			if (
				targetIsPane &&
				connectingNodeId.current &&
				connectingHandleType.current === 'source'
			) {
				const isTouchEvent = 'touches' in event;
				const clientX = isTouchEvent
					? event.changedTouches[0]?.clientX
					: (event as MouseEvent).clientX;
				const clientY = isTouchEvent
					? event.changedTouches[0]?.clientY
					: (event as MouseEvent).clientY;

				const screenPosition = { x: clientX, y: clientY };
				const flowPosition =
					reactFlowInstance.screenToFlowPosition(screenPosition);

				const parentNode = nodes.find(
					(node) => node.id === connectingNodeId.current
				);

				openNodeEditor({
					position: flowPosition,
					screenPosition,
					parentNode: parentNode ?? null,
					mode: 'create',
					suggestedType: parentNode?.data?.node_type ?? 'defaultNode',
				});
			}

			connectingNodeId.current = null;
			connectingHandleId.current = null;
			connectingHandleType.current = null;
		},
		[reactFlowInstance, nodes, openNodeEditor]
	);

	const handleSelectionChange = useCallback(
		({ nodes }: { nodes: AppNode[] }) => {
			setSelectedNodes(nodes);
		},
		[setSelectedNodes]
	);

	const handleNodeDragStart = useCallback(() => {
		if (!isDraggingNodes) {
			setIsDraggingNodes(true);
		}
		setDragging(); // Track dragging activity
	}, [setIsDraggingNodes, isDraggingNodes, setDragging]);

	const handleNodeDragStop = useCallback(() => {
		// Short delay to ensure drag operation completes before allowing auto-resize
		setTimeout(() => {
			setIsDraggingNodes(false);
			setViewing(); // Return to viewing state
		}, 100);
	}, [setIsDraggingNodes, setViewing]);

	const handleToggleSharePanel = useCallback(() => {
		setPopoverOpen({ sharePanel: true });
	}, [setPopoverOpen]);

	const handleToggleMapSettings = useCallback(() => {
		setPopoverOpen({ mapSettings: true });
	}, [setPopoverOpen]);

	const handleToggleHistorySidebar = useCallback(() => {
		setPopoverOpen({ history: true });
	}, [setPopoverOpen]);

	// Helper to check if target is an input element
	const isInputElement = (target: EventTarget | null): boolean => {
		if (!target || !(target instanceof HTMLElement)) return false;
		const tagName = target.tagName.toLowerCase();
		return (
			tagName === 'input' ||
			tagName === 'textarea' ||
			tagName === 'select' ||
			target.contentEditable === 'true'
		);
	};

	const isSelectMode = activeTool === 'default';
	const isPanningMode = activeTool === 'pan';

	// Upgrade prompt hook for modal triggers
	const {
		shouldShowTimePrompt,
		showUpgradeModal,
		dismissWithCooldown,
		clearCooldown,
	} = useUpgradePrompt();

	// Ref to hold latest check function - prevents timer reset on dep changes
	const upgradeCheckRef = useRef(shouldShowTimePrompt);
	upgradeCheckRef.current = shouldShowTimePrompt;

	// Time-based upgrade prompt trigger (check every 5 minutes)
	useEffect(() => {
		// Initial check on mount
		if (upgradeCheckRef.current()) {
			showUpgradeModal();
			return;
		}

		// Set up interval to check every 5 minutes
		const interval = setInterval(() => {
			if (upgradeCheckRef.current()) {
				showUpgradeModal();
				clearInterval(interval);
			}
		}, 5 * 60 * 1000);

		return () => clearInterval(interval);
	}, [showUpgradeModal]);

	return (
		<div className='w-full h-full' key='mind-map-container'>
			<ReactFlow
				colorMode='dark'
				connectionLineComponent={FloatingConnectionLine}
				connectionLineType={ConnectionLineType.Bezier}
				connectionMode={ConnectionMode.Loose}
				deleteKeyCode={canEdit ? ['Delete'] : null}
				disableKeyboardA11y={true}
				edges={visibleEdges}
				edgeTypes={edgeTypes}
				elementsSelectable={isSelectMode}
				fitView={true}
				minZoom={0.1}
				multiSelectionKeyCode={['Meta', 'Control']}
				nodes={visibleNodes}
				nodesConnectable={
					(isSelectMode || activeTool === 'connector') && canEdit
				}
				nodesDraggable={isSelectMode && canEdit}
				nodeTypes={nodeTypesWithProps}
				onConnect={onConnect}
				onConnectEnd={onConnectEnd}
				onConnectStart={onConnectStart}
				onEdgeContextMenu={contextMenuHandlers.onEdgeContextMenu}
				onEdgeDoubleClick={handleEdgeDoubleClick}
				onEdgesChange={onEdgesChange}
				onEdgesDelete={handleEdgesDelete}
				onNodeClick={handleNodeClick}
				onNodeDoubleClick={handleNodeDoubleClick}
				onNodeContextMenu={contextMenuHandlers.onNodeContextMenu}
				onNodeDragStart={handleNodeDragStart}
				onNodeDragStop={handleNodeDragStop}
				onNodesChange={onNodesChange}
				onNodesDelete={handleNodesDelete}
				onPaneClick={contextMenuHandlers.onPaneClick}
				onPaneContextMenu={contextMenuHandlers.onPaneContextMenu}
				onSelectionChange={handleSelectionChange}
				panOnDrag={true}
				selectionMode={SelectionMode.Partial}
				snapGrid={[GRID_SIZE, GRID_SIZE]}
				snapToGrid={true}
				className={cn([
					isPanningMode && 'cursor-grab',
					(activeTool === 'node' || activeTool === 'text') &&
						'cursor-crosshair',
				])}
				style={
					{
						'--xy-background-color-default': 'var(--color-base)',
					} as CSSProperties
				}
			>
				<Background
					color='rgba(255, 255, 255, 0.3)'
					gap={GRID_SIZE}
					variant={BackgroundVariant.Dots}
				/>

				<MindMapTopBar
					mapId={mapId as string}
					mindMap={mindMap}
					currentUser={currentUser}
					userProfile={userProfile}
					activityState={activityState}
					popoverOpen={popoverOpen}
					canEdit={canEdit}
					handleToggleHistorySidebar={handleToggleHistorySidebar}
					handleToggleMapSettings={handleToggleMapSettings}
					handleToggleSharePanel={handleToggleSharePanel}
					handleOpenSettings={handleOpenSettings}
					mobileMenuOpen={mobileMenuOpen}
					setMobileMenuOpen={setMobileMenuOpen}
				/>

				<Panel
					className='flex flex-col gap-2 items-center'
					position='bottom-center'
				>
					<ModeIndicator />

					<Toolbar />
				</Panel>

				<Panel className='m-4 pt-10' position='top-right'></Panel>

				<Panel position='top-left'>
					<RealtimeCursors
						reactFlowInstance={reactFlowInstance}
						roomName={`mind-map:${mapId}:cursor`}
					/>
				</Panel>
			</ReactFlow>

			<UpgradeModal
				onOpenChange={(open) => setPopoverOpen({ upgradeUser: open })}
				open={popoverOpen.upgradeUser}
				onDismiss={dismissWithCooldown}
				onSuccess={() => {
					clearCooldown();
					// Optionally refresh subscription data here
				}}
			/>

			<SettingsPanel
				isOpen={isSettingsOpen}
				onClose={() => setIsSettingsOpen(false)}
				defaultTab={settingsTab}
			/>

			<MobileMenu
				open={mobileMenuOpen}
				onOpenChange={setMobileMenuOpen}
				canEdit={canEdit}
				isMapOwner={mindMap?.user_id === currentUser?.id}
				activityState={activityState}
				mapId={mapId as string}
				mapOwnerId={mindMap?.user_id}
				isSettingsActive={popoverOpen.mapSettings}
				onToggleHistory={handleToggleHistorySidebar}
				onToggleSettings={handleToggleMapSettings}
			/>

			{ENABLE_AI_CHAT && <ChatPanel />}

			{/* Guided Tour Mode - renders controls and spotlight overlay when active */}
			<GuidedTourMode />

			{/* Path Builder - shows when in path edit mode */}
			{isPathEditMode && <PathBuilder />}

			{/* Keyboard shortcuts help FAB */}
			<ShortcutsHelpFab />
		</div>
	);
}
