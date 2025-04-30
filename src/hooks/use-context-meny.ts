import { useState, useCallback } from "react";
import { NodeMouseHandler, Node, EdgeMouseHandler, Edge } from "@xyflow/react";
import { NodeData } from "@/types/node-data"; // Adjust path
import { ContextMenuState } from "@/types/context-menu-state"; // Adjust path
import { EdgeData } from "@/types/edge-data";

interface ContextMenuHandlers {
  onNodeContextMenu: NodeMouseHandler<Node<NodeData>>;
  onPaneContextMenu: (event: React.MouseEvent) => void;
  onEdgeContextMenu: EdgeMouseHandler<Edge<EdgeData>>;
  onPaneClick: () => void; // Handler to close menu on pane click
  close: () => void; // Explicit close function
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
    edgeId: null, // <-- Initialize edgeId
  });

  const onNodeContextMenu = useCallback<NodeMouseHandler<Node<NodeData>>>(
    (event, node) => {
      event.preventDefault();
      setContextMenu({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        nodeId: node.id,
        edgeId: null, // <-- Reset edgeId
      });
    },
    [],
  );

  const onEdgeContextMenu = useCallback<EdgeMouseHandler<Edge<EdgeData>>>(
    (event, edge) => {
      event.preventDefault();
      setContextMenu({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        nodeId: null, // <-- Reset nodeId
        edgeId: edge.id, // <-- Set edgeId
      });
    },
    [],
  );

  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      // Don't open pane menu if clicking on a node (sometimes events overlap)
      // Check if the click target is the pane itself or a background element
      const target = event.target as Element;
      if (
        target.closest(".react-flow__node") ||
        target.closest(".react-flow__edge")
      ) {
        // Click was on a node or edge, let node/edge context menu handle it
        // Or close existing menu if open
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
        nodeId: null, // Indicate background click
        edgeId: null,
      });
    },
    [contextMenu.visible],
  ); // Add visible state dependency

  const closeContextMenu = useCallback(() => {
    setContextMenu({ visible: false, x: 0, y: 0, nodeId: null, edgeId: null });
  }, []);

  // Close on pane click
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
