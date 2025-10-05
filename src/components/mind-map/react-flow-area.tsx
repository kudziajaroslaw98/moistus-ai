'use client';
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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NodeRegistry } from '@/registry/node-registry';

import FloatingEdge from '@/components/edges/floating-edge';
import SuggestedConnectionEdge from '@/components/edges/suggested-connection-edge';
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useContextMenu } from '@/hooks/use-context-menu';
import { useNodeSuggestion } from '@/hooks/use-node-suggestion';
import useAppStore from '@/store/mind-map-store';
import type { AppNode } from '@/types/app-node';
import type { EdgeData } from '@/types/edge-data';
import type { NodeData } from '@/types/node-data';
import { cn } from '@/utils/cn';
import {
	Command,
	History,
	MessageCircle,
	Redo,
	Share2,
	Slash,
	Undo,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useShallow } from 'zustand/shallow';
import FloatingConnectionLine from '../edges/floating-connection-line';
import { SuggestedMergeEdge } from '../edges/suggested-merge-edge';
import { GlassmorphismTheme } from '../nodes/themes/glassmorphism-theme';
import { RealtimeAvatarStack } from '../realtime/realtime-avatar-stack';
import { RealtimeCursors } from '../realtime/realtime-cursor';
import { Toolbar } from '../toolbar';
import { Button } from '../ui/button';
import { UpgradeModal } from '@/components/modals/upgrade-modal';

export function ReactFlowArea() {
	// const {
	//   suggestedEdges,
	//   crudActions,
	// } = useMindMapContext();
	const mapId = useParams().id;
	const reactFlowInstance = useReactFlow();
	const connectingNodeId = useRef<string | null>(null);
	const connectingHandleId = useRef<string | null>(null);
	const connectingHandleType = useRef<'source' | 'target' | null>(null);
	const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

	const {
		supabase,
		nodes,
		onNodesChange,
		onEdgesChange,
		onConnect,
		setReactFlowInstance,
		setNodeInfo,
		setSelectedNodes,
		setPopoverOpen,
		popoverOpen,
		setEdgeInfo,
		setMapId,
		addNode,
		fetchMindMapData,
		deleteNodes,
		isDraggingNodes,
		deleteEdges,
		setIsDraggingNodes,
		initializeComments,
		unsubscribeFromComments,
		unsubscribeFromRealtimeUpdates,
		openInlineCreator,
		openNodeEditor,
		getCurrentUser,
		getVisibleEdges,
		getVisibleNodes,
		mindMap,
		activeTool,
		setActiveTool,
		ghostNodes,
		isStreaming,
		aiFeature,
		canRedo,
		canUndo,
	} = useAppStore(
		useShallow((state) => ({
			supabase: state.supabase,
			nodes: state.nodes,
			getVisibleEdges: state.getVisibleEdges,
			getVisibleNodes: state.getVisibleNodes,
			isFocusMode: state.isFocusMode,
			onNodesChange: state.onNodesChange,
			onEdgesChange: state.onEdgesChange,
			onConnect: state.onConnect,
			setReactFlowInstance: state.setReactFlowInstance,
			setNodeInfo: state.setNodeInfo,
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
			initializeComments: state.initializeComments,
			unsubscribeFromComments: state.unsubscribeFromComments,
			unsubscribeFromRealtimeUpdates: state.unsubscribeFromRealtimeUpdates,
			openInlineCreator: state.openInlineCreator,
			openNodeEditor: state.openNodeEditor,
			getCurrentUser: state.getCurrentUser,
			toggleFocusMode: state.toggleFocusMode,
			mindMap: state.mindMap,
			activeTool: state.activeTool,
			setActiveTool: state.setActiveTool,
			ghostNodes: state.ghostNodes,
			isStreaming: state.isStreaming,
			aiFeature: state.aiFeature,
			canRedo: state.canRedo,
			canUndo: state.canUndo,
		}))
	);

	const { contextMenuHandlers } = useContextMenu();
	const { generateSuggestionsForNode } = useNodeSuggestion();

	useEffect(() => {
		getCurrentUser();

		if (reactFlowInstance) {
			setReactFlowInstance(reactFlowInstance);
		}
	}, [reactFlowInstance, setReactFlowInstance]);

	useEffect(() => {
		if (!mapId || !supabase) return;
		setMapId(mapId as string);
		fetchMindMapData(mapId as string);
		initializeComments(mapId as string);
	}, [fetchMindMapData, mapId, supabase]);

	useEffect(() => {
		return () => {
			unsubscribeFromComments();
			unsubscribeFromRealtimeUpdates();
		};
	}, []);

	// Track mouse position for InlineNodeCreator
	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			setMousePosition({ x: e.clientX, y: e.clientY });
		};

		window.addEventListener('mousemove', handleMouseMove);
		return () => window.removeEventListener('mousemove', handleMouseMove);
	}, []);

	// Handle "/" key to open InlineNodeCreator
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Check if "/" key is pressed and not in an input
			if (e.key === '/' && !isInputElement(e.target)) {
				e.preventDefault();

				const position = reactFlowInstance?.screenToFlowPosition({
					x: mousePosition.x,
					y: mousePosition.y,
				}) || { x: 0, y: 0 };

				console.log('Mouse position:', mousePosition);

				openInlineCreator({
					position,
					screenPosition: mousePosition,
					parentNode: null,
				});
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [mousePosition, openInlineCreator, reactFlowInstance]);

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
			console.log(node);

			if (activeTool === 'magic-wand' && aiFeature === 'suggest-nodes') {
				event.preventDefault();
				event.stopPropagation();
				generateSuggestionsForNode(node.id, 'magic-wand');
				setActiveTool('default');
			}
		},
		[activeTool, isStreaming, generateSuggestionsForNode]
	);

	const handleEdgeDoubleClick: EdgeMouseHandler<Edge<EdgeData>> = useCallback(
		(_event, edge) => {
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
			editableEdge: FloatingEdge,
			defaultEdge: FloatingEdge,
			floatingEdge: FloatingEdge,
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

				openInlineCreator({
					position: flowPosition,
					screenPosition,
					parentNode: parentNode ?? null,
					suggestedType: parentNode?.data?.node_type ?? 'defaultNode',
				});
			}

			connectingNodeId.current = null;
			connectingHandleId.current = null;
			connectingHandleType.current = null;
		},
		[reactFlowInstance, nodes, openInlineCreator]
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
	}, [setIsDraggingNodes, isDraggingNodes]);

	const handleNodeDragStop = useCallback(() => {
		// Short delay to ensure drag operation completes before allowing auto-resize
		setTimeout(() => {
			setIsDraggingNodes(false);
		}, 100);
	}, [setIsDraggingNodes]);

	const handleToggleSharePanel = useCallback(() => {
		setPopoverOpen({ sharePanel: true });
	}, [setPopoverOpen]);

	const handleCommandPaletteOpen = useCallback(() => {
		setPopoverOpen({ commandPalette: true });
	}, [setPopoverOpen]);

	const handleToggleHistorySidebar = useCallback(() => {
		setPopoverOpen({ history: true });
	}, [setPopoverOpen]);

	const handleToggleCommentsPanel = useCallback(() => {
		setPopoverOpen({ commentsPanel: true });
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
	const [showUpgradeModal, setShowUpgradeModal] = useState(false);

	return (
		<>
			<ReactFlow
			colorMode='dark'
			multiSelectionKeyCode={['Meta', 'Control']}
			className={cn([
				isPanningMode && 'cursor-grab',
				activeTool === 'node' || (activeTool === 'text' && 'cursor-crosshair'),
			])}
			style={{
				backgroundColor: GlassmorphismTheme.elevation[0], // Base background
			}}
			minZoom={0.1}
			snapToGrid={true}
			snapGrid={[16, 16]}
			nodesDraggable={isSelectMode}
			nodesConnectable={isSelectMode || activeTool === 'connector'}
			elementsSelectable={isSelectMode}
			panOnDrag={true}
			fitView={true}
			nodes={[...getVisibleNodes(), ...ghostNodes]}
			edges={getVisibleEdges()}
			onNodesChange={onNodesChange}
			onEdgesChange={onEdgesChange}
			onConnectStart={onConnectStart}
			onConnectEnd={onConnectEnd}
			onEdgeDoubleClick={handleEdgeDoubleClick}
			onNodeClick={handleNodeClick}
			onNodesDelete={deleteNodes}
			onEdgesDelete={deleteEdges}
			nodeTypes={nodeTypesWithProps}
			edgeTypes={edgeTypes}
			deleteKeyCode={['Delete']}
			connectionLineComponent={FloatingConnectionLine}
			onNodeContextMenu={contextMenuHandlers.onNodeContextMenu}
			onPaneContextMenu={contextMenuHandlers.onPaneContextMenu}
			onEdgeContextMenu={contextMenuHandlers.onEdgeContextMenu}
			onPaneClick={contextMenuHandlers.onPaneClick}
			selectionMode={SelectionMode.Partial}
			connectionLineType={ConnectionLineType.Bezier}
			connectionMode={ConnectionMode.Loose}
			onConnect={onConnect}
			onSelectionChange={handleSelectionChange}
			onNodeDragStart={handleNodeDragStart}
			onNodeDragStop={handleNodeDragStop}
		>
			<Background
				color='rgba(255, 255, 255, 0.06)'
				gap={16}
				variant={BackgroundVariant.Dots}
			/>

			<Panel
				position='top-left'
				className='!m-0 p-2 px-8 right-0 flex justify-between'
				style={{
					background: `rgba(39, 39, 39, 0.3)`, // Subtle glassmorphism for floating app bar
					backdropFilter: 'blur(4px)', // Reduced blur for subtlety
				}}
			>
				<div className='flex items-center gap-8'>
					<Breadcrumb>
						<BreadcrumbList>
							<BreadcrumbItem>
								<BreadcrumbLink asChild>
									<Link href='/dashboard'>
										<Image
											src='/images/moistus.svg'
											alt='Moistus Logo'
											width={60}
											height={60}
										/>
									</Link>
								</BreadcrumbLink>
							</BreadcrumbItem>

							<BreadcrumbSeparator>
								<Slash />
							</BreadcrumbSeparator>

							<BreadcrumbItem>
								<BreadcrumbPage className='capitalize'>
									{mindMap?.title || 'Loading...'}
								</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>

					<div className='flex gap-2'>
						{/*TODO: Uncomment redo/undo when optimized history implemented*/}
						<Button
							// onClick={handleUndo}
							disabled={!canUndo}
							title='Undo (Ctrl+Z)'
							variant='secondary'
							size='icon'
						>
							<Undo className='size-4' />
						</Button>

						{/*TODO: Uncomment redo/undo when optimized history implemented*/}
						<Button
							// onClick={handleRedo}
							disabled={!canRedo}
							title='Redo (Ctrl+Y)'
							variant='secondary'
							size='icon'
						>
							<Redo className='size-4' />
						</Button>

						<Button
							onClick={handleToggleHistorySidebar}
							title='Toggle History Sidebar'
							aria-label='Toggle History Sidebar'
							variant='secondary'
							size='icon'
						>
							<History className='h-4 w-4' />
						</Button>
					</div>
				</div>

				<div className='flex items-center gap-8'>
					<div className='flex gap-2'>
						{/* Profile Button */}
						{/* <Link href='/dashboard/profile'>
							<Button
								title='Profile Settings'
								aria-label='Profile Settings'
								variant='secondary'
								size='icon'
							>
								<User className='h-4 w-4' />
							</Button>
						</Link> */}

						<Button
							onClick={handleCommandPaletteOpen}
							title='Command Palette'
							aria-label='Command Palette'
							variant='secondary'
							size='icon'
						>
							<Command className='h-4 w-4' />
						</Button>

						{/* <Button
							onClick={handleToggleFocusMode}
							title='Enter Focus Mode'
							aria-label='Enter Focus Mode'
							variant='secondary'
							size='icon'
						>
							<Maximize className='h-4 w-4' />
						</Button> */}
					</div>

					<RealtimeAvatarStack roomName={`mind_map:${mapId}:users`} />

					<div className='flex gap-2'>
						<Button
							onClick={handleToggleCommentsPanel}
							title='Toggle Comments Panel (Ctrl+/)'
							aria-label='Toggle Comments Panel'
							variant={popoverOpen.commentsPanel ? 'default' : 'secondary'}
							size='icon'
						>
							<MessageCircle className='h-4 w-4' />
						</Button>

						<Button
							onClick={handleToggleSharePanel}
							title='Share Mind Map'
							aria-label='Share Mind Map'
							variant={popoverOpen.sharePanel ? 'default' : 'secondary'}
							className='gap-2'
						>
							Share <Share2 className='size-3' />
						</Button>
					</div>
				</div>
			</Panel>

			<Panel position='bottom-center'>
				<Toolbar />
			</Panel>

			<Panel position='top-left'>
				<RealtimeCursors
					roomName={`mind_map:${mapId}:cursor`}
					reactFlowInstance={reactFlowInstance}
				/>
			</Panel>
		</ReactFlow>

		<UpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} />
		</>
	);
}
