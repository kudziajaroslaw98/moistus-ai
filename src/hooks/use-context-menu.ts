import { ContextMenuState } from "@/types/context-menu-state";
import { EdgeData } from "@/types/edge-data";
import { NodeData } from "@/types/node-data";
import { Edge, EdgeMouseHandler, Node, NodeMouseHandler } from "@xyflow/react";
import { useCallback, useState } from "react";

interface ContextMenuHandlers {
  onNodeContextMenu: NodeMouseHandler<Node<NodeData>>;
  onPaneContextMenu: (event: React.MouseEvent | MouseEvent) => void;
  onEdgeContextMenu: EdgeMouseHandler<Edge<Partial<EdgeData>>>;
  onPaneClick: () => void;
  close: () => void;
}

interface UseContextMenuResult {
  contextMenuState: ContextMenuState;
  contextMenuHandlers: ContextMenuHandlers;
}

export function useContextMenu(): UseContextMenuResult {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    nodeId: null,
    edgeId: null,
  });

  const onNodeContextMenu = useCallback<NodeMouseHandler<Node<NodeData>>>(
    (event, node) => {
      event.preventDefault();
      setContextMenu({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        nodeId: node.id,
        edgeId: null,
      });
    },
    [],
  );

  const onEdgeContextMenu = useCallback<
    EdgeMouseHandler<Edge<Partial<EdgeData>>>
  >((event, edge) => {
    event.preventDefault();
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      nodeId: null,
      edgeId: edge.id,
    });
  }, []);

  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault();

      const target = event.target as Element;

      if (
        target.closest(".react-flow__node") ||
        target.closest(".react-flow__edge")
      ) {
        if (contextMenu.visible) {
          setContextMenu({
            visible: false,
            x: 0,
            y: 0,
            nodeId: null,
            edgeId: null,
          });
        }

        return;
      }

      setContextMenu({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        nodeId: null,
        edgeId: null,
      });
    },
    [contextMenu.visible],
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu({ visible: false, x: 0, y: 0, nodeId: null, edgeId: null });
  }, []);

  const onPaneClick = useCallback(() => {
    closeContextMenu();
  }, [closeContextMenu]);

  return {
    contextMenuState: contextMenu,
    contextMenuHandlers: {
      onNodeContextMenu,
      onEdgeContextMenu,
      onPaneContextMenu,
      onPaneClick,
      close: closeContextMenu,
    },
  };
}
