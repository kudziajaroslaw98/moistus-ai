'use client';
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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import FloatingEdge from '@/components/edges/floating-edge';
import SuggestedConnectionEdge from '@/components/edges/suggested-connection-edge';
import { UpgradeModal } from '@/components/modals/upgrade-modal';
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
import { Command, History, Redo, Share2, Slash, Undo } from 'lucide-react';
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

export function ReactFlowArea() {
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
	}, [fetchMindMapData, mapId, supabase]);

	useEffect(() => {
		return () => {
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

				openNodeEditor({
					position,
					screenPosition: mousePosition,
					parentNode: null,
					mode: 'create',
				});
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [mousePosition, openNodeEditor, reactFlowInstance]);

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
				connectionLineComponent={FloatingConnectionLine}
				connectionLineType={ConnectionLineType.Bezier}
				connectionMode={ConnectionMode.Loose}
				deleteKeyCode={['Delete']}
				edges={getVisibleEdges()}
				edgeTypes={edgeTypes}
				elementsSelectable={isSelectMode}
				fitView={true}
				minZoom={0.1}
				multiSelectionKeyCode={['Meta', 'Control']}
				nodes={[...getVisibleNodes(), ...ghostNodes]}
				nodesConnectable={isSelectMode || activeTool === 'connector'}
				nodesDraggable={isSelectMode}
				nodeTypes={nodeTypesWithProps}
				panOnDrag={true}
				selectionMode={SelectionMode.Partial}
				snapGrid={[16, 16]}
				snapToGrid={true}
				className={cn([
					isPanningMode && 'cursor-grab',
					activeTool === 'node' ||
						(activeTool === 'text' && 'cursor-crosshair'),
				])}
				style={{
					backgroundColor: GlassmorphismTheme.elevation[0], // Base background
				}}
				onConnect={onConnect}
				onConnectEnd={onConnectEnd}
				onConnectStart={onConnectStart}
				onEdgeContextMenu={contextMenuHandlers.onEdgeContextMenu}
				onEdgeDoubleClick={handleEdgeDoubleClick}
				onEdgesChange={onEdgesChange}
				onEdgesDelete={deleteEdges}
				onNodeClick={handleNodeClick}
				onNodeContextMenu={contextMenuHandlers.onNodeContextMenu}
				onNodeDragStart={handleNodeDragStart}
				onNodeDragStop={handleNodeDragStop}
				onNodesChange={onNodesChange}
				onNodesDelete={deleteNodes}
				onPaneClick={contextMenuHandlers.onPaneClick}
				onPaneContextMenu={contextMenuHandlers.onPaneContextMenu}
				onSelectionChange={handleSelectionChange}
			>
				<Background
					color='rgba(255, 255, 255, 0.06)'
					gap={16}
					variant={BackgroundVariant.Dots}
				/>

				<Panel
					className='!m-0 p-2 px-8 right-0 flex justify-between'
					position='top-left'
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
												alt='Moistus Logo'
												height={60}
												src='/images/moistus.svg'
												width={60}
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
								size='icon'
								title='Undo (Ctrl+Z)'
								variant='secondary'
							>
								<Undo className='size-4' />
							</Button>

							{/*TODO: Uncomment redo/undo when optimized history implemented*/}
							<Button
								// onClick={handleRedo}
								disabled={!canRedo}
								size='icon'
								title='Redo (Ctrl+Y)'
								variant='secondary'
							>
								<Redo className='size-4' />
							</Button>

							<Button
								aria-label='Toggle History Sidebar'
								size='icon'
								title='Toggle History Sidebar'
								variant='secondary'
								onClick={handleToggleHistorySidebar}
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
								aria-label='Command Palette'
								size='icon'
								title='Command Palette'
								variant='secondary'
								onClick={handleCommandPaletteOpen}
							>
								<Command className='h-4 w-4' />
							</Button>
						</div>

						<RealtimeAvatarStack roomName={`mind_map:${mapId}:users`} />

						<div className='flex gap-2'>
							<Button
								aria-label='Share Mind Map'
								className='gap-2'
								title='Share Mind Map'
								variant={popoverOpen.sharePanel ? 'default' : 'secondary'}
								onClick={handleToggleSharePanel}
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
						reactFlowInstance={reactFlowInstance}
						roomName={`mind_map:${mapId}:cursor`}
					/>
				</Panel>
			</ReactFlow>

			<UpgradeModal
				open={showUpgradeModal}
				onOpenChange={setShowUpgradeModal}
			/>
		</>
	);
}
