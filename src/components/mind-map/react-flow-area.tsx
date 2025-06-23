'use client';
import {
	Background,
	BackgroundVariant,
	ConnectionLineType,
	ConnectionMode,
	Edge,
	EdgeMouseHandler,
	MiniMap,
	Node,
	NodeTypes,
	OnConnectStartParams,
	Panel,
	ReactFlow,
	SelectionMode,
	useReactFlow,
} from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
// Import specific node/edge components only if needed here, otherwise rely on types
import AnnotationNode from '@/components/nodes/annotation-node';
import CodeNode from '@/components/nodes/code-node';
import DefaultNode from '@/components/nodes/default-node';
import GroupNode from '@/components/nodes/group-node';
import ImageNode from '@/components/nodes/image-node';
import QuestionNode from '@/components/nodes/question-node';
import ResourceNode from '@/components/nodes/resource-node';
import TextNode from '@/components/nodes/text-node';

import FloatingEdge from '@/components/edges/floating-edge';
// import SuggestedConnectionEdge from "@/components/edges/suggested-connection-edge";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useContextMenu } from '@/hooks/use-context-menu';
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
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useShallow } from 'zustand/shallow';
import FloatingConnectionLine from '../edges/floating-connection-line';
import BuilderNode from '../nodes/builder-node';
import TaskNode from '../nodes/task-node';
import { RealtimeAvatarStack } from '../realtime/realtime-avatar-stack';
import { RealtimeCursors } from '../realtime/realtime-cursor';
import { Toolbar } from '../toolbar';
import { Button } from '../ui/button';

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

	const {
		supabase,
		nodes,
		edges,
		isFocusMode,
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
		getCurrentUser,
		currentUser,
		getVisibleEdges,
		getVisibleNodes,
		toggleFocusMode,
		mindMap,
		activeTool,
		setActiveTool,
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
			getCurrentUser: state.getCurrentUser,
			currentUser: state.currentUser,
			toggleFocusMode: state.toggleFocusMode,
			mindMap: state.mindMap,
			activeTool: state.activeTool,
			setActiveTool: state.setActiveTool,
		}))
	);

	const { contextMenuHandlers } = useContextMenu();

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

	const handleNodeDoubleClick = useCallback(
		(event: React.MouseEvent, node: Node<NodeData>) => {
			setNodeInfo(node);
			setPopoverOpen({ nodeEdit: true });
		},
		[]
	);

	const handleEdgeDoubleClick: EdgeMouseHandler<Edge<EdgeData>> = useCallback(
		(_event, edge) => {
			setEdgeInfo(edge);
			setPopoverOpen({ edgeEdit: true });
		},
		[]
	);

	const nodeTypesWithProps: NodeTypes = useMemo(
		() => ({
			defaultNode: DefaultNode,
			questionNode: QuestionNode,
			taskNode: TaskNode,
			imageNode: ImageNode,
			resourceNode: ResourceNode,
			annotationNode: AnnotationNode,
			codeNode: CodeNode,
			groupNode: GroupNode,
			textNode: TextNode,
			builderNode: BuilderNode,
		}),
		[]
	);

	const edgeTypes = useMemo(
		() => ({
			// suggestedConnection: SuggestedConnectionEdge,
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

				const panePosition = reactFlowInstance.screenToFlowPosition({
					x: clientX,
					y: clientY,
				});

				const parentNode = nodes.find(
					(node) => node.id === connectingNodeId.current
				);

				addNode({
					parentNode: parentNode ?? null,
					position: panePosition,
					data: {},
					content: 'New Node',
					nodeType: parentNode?.data?.node_type ?? 'defaultNode',
				});
			}

			connectingNodeId.current = null;
			connectingHandleId.current = null;
			connectingHandleType.current = null;
		},
		[reactFlowInstance, addNode, nodes]
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

	const handleToggleFocusMode = useCallback(() => {
		toggleFocusMode();
	}, [toggleFocusMode]);

	const isSelectMode = activeTool === 'default';
	const isPanningMode = activeTool === 'pan';

	return (
		<ReactFlow
			colorMode='dark'
			multiSelectionKeyCode={['Meta', 'Control']}
			className={cn([
				'bg-zinc-900',
				isPanningMode && 'cursor-grab',
				activeTool === 'node' || (activeTool === 'text' && 'cursor-crosshair'),
			])}
			minZoom={0.1}
			snapToGrid={true}
			nodesDraggable={isSelectMode}
			nodesConnectable={isSelectMode || activeTool === 'connector'}
			elementsSelectable={isSelectMode}
			panOnDrag={isSelectMode || isPanningMode}
			fitView={true}
			nodes={getVisibleNodes()}
			edges={getVisibleEdges()}
			onNodesChange={onNodesChange}
			onEdgesChange={onEdgesChange}
			onConnectStart={onConnectStart}
			onConnectEnd={onConnectEnd}
			onEdgeDoubleClick={handleEdgeDoubleClick}
			onNodeDoubleClick={handleNodeDoubleClick}
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
			{/* <Controls
				position='top-right'
				orientation='horizontal'
				showZoom={false}
				showFitView={false}
				className={`${isFocusMode ? '!right-12' : ''} cursor-pointer`}
			/> */}

			{/* {isFocusMode ? <ZoomSelect /> : <ZoomSlider position='top-left' />} */}

			<Background color='#52525c' gap={16} variant={BackgroundVariant.Dots} />

			<Panel position='top-left'>
				<div className='flex justify-center items-center gap-8'>
					<Breadcrumb>
						<BreadcrumbList>
							<BreadcrumbItem>
								<BreadcrumbLink asChild>
									<Link href='/dashboard'>Moistus AI</Link>
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
						<Button
							// onClick={handleUndo}
							// disabled={!canUndo}
							title='Undo (Ctrl+Z)'
							variant='secondary'
							size='icon'
						>
							<Undo className='size-4' />
						</Button>

						<Button
							// onClick={handleRedo}
							// disabled={!canRedo}
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
			</Panel>

			<Panel position='top-right' className='z-20'>
				<div className='flex gap-8'>
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
							// onClick={handleToggleCommentsPanel}
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

			<MiniMap position='bottom-right' />
		</ReactFlow>
	);
}
