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
		deleteNodes,
		isCommentMode,
		createComment,
		mapId,
		currentUser,
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
			deleteNodes: state.deleteNodes,
			isCommentMode: state.isCommentMode,
			createComment: state.createComment,
			mapId: state.mapId,
			currentUser: state.currentUser,
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

							// Create comment node through graph-aware store action
							await addNode({
								parentNode: null,
								content: '',
								nodeType: 'commentNode',
								position,
								nodeId: commentId,
								data: {
									width: 400,
									height: 500,
									metadata: {},
									aiData: {},
								},
							});

							const createdNode = useAppStore
								.getState()
								.nodes.some((node) => node.id === commentId);

							if (!createdNode) {
								return;
							}

							// Create aligned comment record using same ID
							const savedComment = await createComment({
								id: commentId,
								map_id: mapId,
								position_x: position.x,
								position_y: position.y,
								width: 400,
								height: 500,
							});

							// Roll back node if comment record creation fails
							if (!savedComment) {
								const rollbackNode = useAppStore
									.getState()
									.nodes.find((node) => node.id === commentId);
								if (rollbackNode) {
									await deleteNodes([rollbackNode]);
								}
							}
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
			[
				closeContextMenu,
				activeTool,
				isCommentMode,
				mapId,
				currentUser,
				reactFlowInstance,
				setActiveTool,
				addNode,
				createComment,
				deleteNodes,
			]
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
