import useAppStore from "@/contexts/mind-map/mind-map-store";
import { ContextMenuState } from "@/types/context-menu-state";
import { EdgeData } from "@/types/edge-data";
import { NodeData } from "@/types/node-data";
import { Edge, EdgeMouseHandler, Node, NodeMouseHandler } from "@xyflow/react";
import { useCallback } from "react";
import { useShallow } from "zustand/shallow";

interface ContextMenuHandlers {
  onNodeContextMenu: NodeMouseHandler<Node<NodeData>>;
  onPaneContextMenu: (event: React.MouseEvent | MouseEvent) => void;
  onEdgeContextMenu: EdgeMouseHandler<Edge<Partial<EdgeData>>>;
  onPaneClick: () => void;
  close: () => void;
}

interface UseContextMenuResult {
  contextMenuState: ContextMenuState | null;
  contextMenuHandlers: ContextMenuHandlers;
}

export function useContextMenu(): UseContextMenuResult {
  const { contextMenuState, popoverOpen, setPopoverOpen, setContextMenuState } =
    useAppStore(
      useShallow((state) => ({
        contextMenuState: state.contextMenuState,
        popoverOpen: state.popoverOpen,
        setPopoverOpen: state.setPopoverOpen,
        setContextMenuState: state.setContextMenuState,
      })),
    );

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node<NodeData>) => {
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
    [setPopoverOpen, setContextMenuState],
  );

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge<Partial<EdgeData>>) => {
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
    [setPopoverOpen, setContextMenuState],
  );

  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault();

      const target = event.target as Element;

      if (
        target.closest(".react-flow__node") ||
        target.closest(".react-flow__edge")
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
    [setPopoverOpen, setContextMenuState],
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

  const onPaneClick = useCallback(() => {
    closeContextMenu();
  }, [closeContextMenu]);

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
