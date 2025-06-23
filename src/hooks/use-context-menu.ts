import useAppStore from '@/store/mind-map-store';
import { ContextMenuState } from '@/types/context-menu-state';
import { EdgeData } from '@/types/edge-data';
import { NodeData } from '@/types/node-data';
import { ReactMouseEvent } from '@/types/react-mouse-event';
import { Edge, EdgeMouseHandler, Node, NodeMouseHandler } from '@xyflow/react';
import { useCallback } from 'react';
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
		(event: ReactMouseEvent) => {
			const position = reactFlowInstance?.screenToFlowPosition({
				x: event.clientX,
				y: event.clientY,
			});

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

			closeContextMenu();
		},
		[closeContextMenu, activeTool]
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
