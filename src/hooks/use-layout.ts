import { EdgeData } from "@/types/edge-data";
import { NodeData } from "@/types/node-data";
import { Edge, Node, ReactFlowInstance, XYPosition } from "@xyflow/react";
import dagre from "dagre";
import { useCallback, useState } from "react";
import { toast } from "sonner";

type LayoutDirection = "TB" | "LR";

const g = new dagre.graphlib.Graph();
g.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (
  nodes: Node<NodeData>[],
  edges: Edge<EdgeData>[],
  direction: LayoutDirection = "TB",
) => {
  g.setGraph({ rankdir: direction, nodesep: 80, ranksep: 150 }); // Increased separation

  nodes.forEach((node) => {
    const nodeWidth = node.width || 320; // Adjusted default width
    const nodeHeight = node.height || 100; // Adjusted default height
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

    const nodeWidth = node.width || 320; // Adjusted default width
    const nodeHeight = node.height || 100; // Adjusted default height

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
  addStateToHistory: (
    actionName?: string,
    newState?: { nodes: Node<NodeData>[]; edges: Edge<EdgeData>[] },
  ) => void;
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
  saveNodePosition,
}: UseLayoutProps): UseLayoutResult {
  const [isLoading, setIsLoading] = useState(false);

  const applyLayout = useCallback(
    async (direction: LayoutDirection): Promise<void> => {
      if (nodes.length === 0) {
        toast.error("Nothing to layout.");
        return;
      }

      setIsLoading(true);
      toast.message(`Applying layout (${direction})...`);

      try {
        const { layoutedNodes } = getLayoutedElements(nodes, edges, direction);

        setNodes([...layoutedNodes]);

        const savePromises = layoutedNodes.map((node) =>
          saveNodePosition(node.id, node.position),
        );

        await Promise.all(savePromises);

        addStateToHistory(`applyLayout${direction}`);

        setTimeout(() => {
          reactFlowInstance?.fitView({ padding: 0.1, duration: 300 });
        }, 50);

        toast.success(`Layout (${direction}) applied and saved.`);
      } catch (err: unknown) {
        console.error("Error applying or saving layout:", err);
        const message =
          err instanceof Error
            ? err.message
            : "Failed to apply or save layout.";

        toast.error(message);
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
      saveNodePosition,
    ],
  );

  return { applyLayout, isLoading };
}
