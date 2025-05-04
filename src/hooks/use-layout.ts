import { NotificationType } from "@/hooks/use-notifications";
import { EdgeData } from "@/types/edge-data";
import { HistoryState } from "@/types/history-state";
import { NodeData } from "@/types/node-data";
import { Edge, Node, ReactFlowInstance, XYPosition } from "@xyflow/react";
import dagre from "dagre";
import { useCallback, useState } from "react";

type LayoutDirection = "TB" | "LR";

const g = new dagre.graphlib.Graph();
g.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (
  nodes: Node<NodeData>[],
  edges: Edge<EdgeData>[],
  direction: LayoutDirection = "TB",
) => {
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
      data: node.data,
    };
  });

  return { layoutedNodes, layoutedEdges: edges };
};

interface UseLayoutProps {
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];
  setNodes: React.Dispatch<React.SetStateAction<Node<NodeData>[]>>;
  reactFlowInstance: ReactFlowInstance | null;
  addStateToHistory: (sourceAction?: string) => void;
  showNotification: (message: string, type: NotificationType) => void;
  currentHistoryState: HistoryState | undefined;

  saveNodePosition: (nodeId: string, position: XYPosition) => Promise<void>;
}

interface UseLayoutResult {
  applyLayout: (direction: LayoutDirection) => Promise<void>;
  isLoading: boolean;
}

export function useLayout({
  nodes,
  edges,
  setNodes,
  reactFlowInstance,
  addStateToHistory,
  showNotification,
  saveNodePosition,
}: UseLayoutProps): UseLayoutResult {
  const [isLoading, setIsLoading] = useState(false);

  const applyLayout = useCallback(
    async (direction: LayoutDirection): Promise<void> => {
      if (nodes.length === 0) {
        showNotification("Nothing to layout.", "error");
        return;
      }

      setIsLoading(true);
      showNotification(`Applying layout (${direction})...`, "success");

      try {
        const { layoutedNodes } = getLayoutedElements(nodes, edges, direction);

        setNodes([...layoutedNodes]);

        const savePromises = layoutedNodes.map((node) =>
          saveNodePosition(node.id, node.position),
        );

        await Promise.all(savePromises);

        addStateToHistory("applyLayout");

        setTimeout(() => {
          reactFlowInstance?.fitView({ padding: 0.1, duration: 300 });
        }, 50);

        showNotification(`Layout (${direction}) applied and saved.`, "success");
      } catch (err: unknown) {
        console.error("Error applying or saving layout:", err);
        const message =
          err instanceof Error
            ? err.message
            : "Failed to apply or save layout.";
        showNotification(message, "error");
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
      saveNodePosition,
    ],
  );

  return { applyLayout, isLoading };
}
