import { useState, useCallback } from "react";
import { Node, Edge, ReactFlowInstance, XYPosition } from "@xyflow/react"; // Import XYPosition
import dagre from "dagre";
import { NodeData } from "@/types/node-data";
import { EdgeData } from "@/types/edge-data";
import { HistoryState } from "@/types/history-state";
import { NotificationType } from "@/hooks/use-notifications";

type LayoutDirection = "TB" | "LR";

const g = new dagre.graphlib.Graph();
g.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (
  nodes: Node<NodeData>[],
  edges: Edge<EdgeData>[],
  direction: LayoutDirection = "TB",
) => {
  // --- Dagre calculation logic remains the same ---
  g.setGraph({ rankdir: direction, nodesep: 50, ranksep: 100 });

  nodes.forEach((node) => {
    const nodeWidth = node.width || 170;
    const nodeHeight = node.height || 60;
    g.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    if (!nodeWithPosition) {
      console.warn(`Dagre could not find node ${node.id} during layout.`);
      return node;
    }
    const nodeWidth = node.width || 170;
    const nodeHeight = node.height || 60;

    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
      data: node.data, // Ensure data is preserved
    };
  });

  return { layoutedNodes, layoutedEdges: edges };
};

interface UseLayoutProps {
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];
  setNodes: React.Dispatch<React.SetStateAction<Node<NodeData>[]>>;
  reactFlowInstance: ReactFlowInstance<Node<NodeData>, Edge<EdgeData>>;
  addStateToHistory: (sourceAction?: string) => void;
  showNotification: (message: string, type: NotificationType) => void;
  currentHistoryState: HistoryState | undefined;
  // Add saveNodePosition function from CRUD actions
  saveNodePosition: (nodeId: string, position: XYPosition) => Promise<void>;
}

interface UseLayoutResult {
  applyLayout: (direction: LayoutDirection) => Promise<void>; // Make async
  isLoading: boolean;
}

export function useLayout({
  nodes,
  edges,
  setNodes,
  reactFlowInstance,
  addStateToHistory,
  showNotification,
  saveNodePosition, // Destructure saveNodePosition
}: UseLayoutProps): UseLayoutResult {
  const [isLoading, setIsLoading] = useState(false);

  const applyLayout = useCallback(
    async (direction: LayoutDirection): Promise<void> => {
      // Return promise
      if (nodes.length === 0) {
        showNotification("Nothing to layout.", "error");
        return;
      }
      setIsLoading(true);
      showNotification(`Applying layout (${direction})...`, "success"); // Pending notification

      try {
        const { layoutedNodes } = getLayoutedElements(nodes, edges, direction);

        // Update node positions locally FIRST for immediate feedback
        setNodes([...layoutedNodes]);

        // ---- ADDED: Save positions to Database ----
        const savePromises = layoutedNodes.map((node) =>
          saveNodePosition(node.id, node.position),
        );

        // Wait for all save operations to complete (or handle errors)
        await Promise.all(savePromises);
        // Consider Promise.allSettled if you want to know which ones failed

        // ------------------------------------------

        // Add history state after local update & successful saves
        addStateToHistory("applyLayout");

        // Fit view after state update and saves
        setTimeout(() => {
          reactFlowInstance.fitView({ padding: 0.1, duration: 300 });
        }, 50);

        showNotification(`Layout (${direction}) applied and saved.`, "success"); // Final success
      } catch (err: unknown) {
        console.error("Error applying or saving layout:", err);
        const message =
          err instanceof Error
            ? err.message
            : "Failed to apply or save layout.";
        showNotification(message, "error");
        // Note: Local state might be updated even if saving fails.
        // Consider reverting local state on save error if desired.
      } finally {
        setIsLoading(false);
      }
    },
    [
      nodes,
      edges,
      setNodes,
      reactFlowInstance,
      addStateToHistory,
      showNotification,
      saveNodePosition, // Add saveNodePosition dependency
    ],
  );

  return { applyLayout, isLoading };
}
