import generateUuid from '@/helpers/generate-uuid';
import useAppStore from '@/store/mind-map-store';
import { ContextMenuState } from '@/types/context-menu-state';
import { EdgeData } from '@/types/edge-data';
import { NodeData } from '@/types/node-data';
import { ReactMouseEvent } from '@/types/react-mouse-event';
import { Edge, EdgeMouseHandler, Node, NodeMouseHandler } from '@xyflow/react';
import { useCallback, useRef } from 'react';
import { useShallow } from 'zustand/shallow';

interface ContextMenuHandlers {
	onNodeContextMenu: NodeMouseHandler<Node<NodeData>>;
	onPaneContextMenu: (event: ReactMouseEvent | MouseEvent) => void;
	onEdgeContextMenu: EdgeMouseHandler<Edge<Partial<EdgeData>>>;
	onPaneClick: (event: ReactMouseEvent) => void;
	close: () => void;
}

interface UseContextMenuResult {
	contextMenuState: ContextMenuState | null;
	contextMenuHandlers: ContextMenuHandlers;
}

export function useContextMenu(): UseContextMenuResult {
	const lastClickTime = useRef<number>(0);
	const DOUBLE_CLICK_DELAY = 300; // milliseconds

	const {
		reactFlowInstance,
		contextMenuState,
		popoverOpen,
		setPopoverOpen,
		setContextMenuState,
		activeTool,
		setActiveTool,
		addNode,
		addEdge,
		isCommentMode,
		createComment,
		mapId,
		supabase,
		currentUser,
		nodes,
		setNodes,
	} = useAppStore(
		useShallow((state) => ({
			reactFlowInstance: state.reactFlowInstance,
			contextMenuState: state.contextMenuState,
			popoverOpen: state.popoverOpen,
			setPopoverOpen: state.setPopoverOpen,
			setContextMenuState: state.setContextMenuState,
			activeTool: state.activeTool,
			setActiveTool: state.setActiveTool,
			addNode: state.addNode,
			addEdge: state.addEdge,
			isCommentMode: state.isCommentMode,
			createComment: state.createComment,
			mapId: state.mapId,
			supabase: state.supabase,
			currentUser: state.currentUser,
			nodes: state.nodes,
			setNodes: state.setNodes,
		}))
	);

	const onNodeContextMenu = useCallback(
		(event: ReactMouseEvent, node: Node<NodeData>) => {
			event.preventDefault();
			setPopoverOpen({
				contextMenu: true,
			});
			setContextMenuState({
				x: event.clientX,
				y: event.clientY,
				nodeId: node.id,
				edgeId: null,
			});
		},
		[setPopoverOpen, setContextMenuState]
	);

	const onEdgeContextMenu = useCallback(
		(event: ReactMouseEvent, edge: Edge<Partial<EdgeData>>) => {
			event.preventDefault();
			setContextMenuState({
				x: event.clientX,
				y: event.clientY,
				nodeId: null,
				edgeId: edge.id,
			});
			setPopoverOpen({
				contextMenu: true,
			});
		},
		[setPopoverOpen, setContextMenuState]
	);

	const onPaneContextMenu = useCallback(
		(event: ReactMouseEvent | MouseEvent) => {
			event.preventDefault();

			const target = event.target as Element;

			if (
				target.closest('.react-flow__node') ||
				target.closest('.react-flow__edge')
			) {
				if (popoverOpen.contextMenu) {
					setPopoverOpen({
						contextMenu: false,
					});
					setContextMenuState({
						x: 0,
						y: 0,
						nodeId: null,
						edgeId: null,
					});
				}

				return;
			}

			setPopoverOpen({
				contextMenu: true,
			});
			setContextMenuState({
				x: event.clientX,
				y: event.clientY,
				nodeId: null,
				edgeId: null,
			});
		},
		[setPopoverOpen, setContextMenuState]
	);

	const closeContextMenu = useCallback(() => {
		setPopoverOpen({
			contextMenu: false,
		});
		setContextMenuState({
			x: 0,
			y: 0,
			nodeId: null,
			edgeId: null,
		});
	}, [setPopoverOpen, setContextMenuState]);

	const onPaneClick = useCallback(
		async (event: ReactMouseEvent) => {
			const position = reactFlowInstance?.screenToFlowPosition({
				x: event.clientX,
				y: event.clientY,
			});

			const currentTime = Date.now();
			const isDoubleClick = currentTime - lastClickTime.current < DOUBLE_CLICK_DELAY;
			lastClickTime.current = currentTime;

			// Comment Mode: Only create comment on double-click
			if (isCommentMode) {
				if (isDoubleClick && position && mapId && currentUser) {
					try {
						// Generate shared ID for both node and comment
						const commentId = generateUuid();

						// 1. Create node in nodes table
						const nodeData = {
							id: commentId,
							user_id: currentUser.id,
							map_id: mapId,
							content: '', // Comments don't use node content
							position_x: position.x,
							position_y: position.y,
							width: 400,
							height: 500,
							node_type: 'commentNode' as const,
							metadata: {},
							aiData: {},
						};

						const { error: nodeError } = await supabase
							.from('nodes')
							.insert([nodeData]);

						if (nodeError) {
							console.error('Failed to create comment node:', nodeError);
							return;
						}

						// 2. Create comment in comments table
						const { error: commentError } = await supabase
							.from('comments')
							.insert([{
								id: commentId,
								map_id: mapId,
								position_x: position.x,
								position_y: position.y,
								width: 400,
								height: 500,
								created_by: currentUser.id,
							}]);

						if (commentError) {
							console.error('Failed to create comment:', commentError);
							// Clean up the node if comment creation failed
							await supabase.from('nodes').delete().eq('id', commentId);
							return;
						}

						// Note: Real-time events will handle adding to state arrays automatically
					} catch (error) {
						console.error('Failed to create comment:', error);
					}
				}
				// In comment mode, don't close context menu or handle other tools
				return;
			}

			// Non-comment mode: handle other tools (only on single click)
			if (!isDoubleClick) {
				if (activeTool === 'node') {
					addNode({
						parentNode: null,
						content: 'New node from pane click',
						nodeType: 'defaultNode',
						position,
					});
					setActiveTool('default'); // Switch back to select tool for a better UX
				}

				if (activeTool === 'text') {
					addNode({
						parentNode: null,
						content: 'New node from pane click',
						nodeType: 'textNode',
						position,
					});
					setActiveTool('default'); // Switch back to select tool for a better UX
				}
			}

			closeContextMenu();
		},
		[closeContextMenu, activeTool, isCommentMode, mapId, currentUser, reactFlowInstance, supabase, setActiveTool, addNode]
	);

	return {
		contextMenuState,
		contextMenuHandlers: {
			onNodeContextMenu,
			onEdgeContextMenu,
			onPaneContextMenu,
			onPaneClick,
			close: closeContextMenu,
		},
	};
}
