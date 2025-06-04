import { AppEdge } from "@/types/app-edge";
import { EdgeData } from "@/types/edge-data";
import { NodeData } from "@/types/node-data";
import { Node } from "@xyflow/react";

export const transformDataToReactFlow = (
  nodes: NodeData[],
  edges: EdgeData[],
) => {
  const reactFlowNodes: Node<NodeData>[] = nodes.map((node) => ({
    id: node.id,
    position: { x: node.position_x || 0, y: node.position_y || 0 },
    data: node,
    type: node.node_type || "defaultNode",
    width: node.width || undefined,
    height: node.height || undefined,
  }));

  const reactFlowEdges: AppEdge[] = edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    user_id: edge.user_id,
    map_id: edge.map_id,

    type: edge.type || "editableEdge",
    animated: edge.animated ?? false,
    label: edge.label,

    style: {
      stroke: edge.style?.stroke || "#6c757d",
      strokeWidth: edge.style?.strokeWidth || 2,
    },
    markerEnd: edge.markerEnd || undefined,

    data: {
      ...edge,
      metadata: {
        ...(edge.metadata || {}),
        pathType: edge.metadata?.pathType,
      },
    },
  }));

  return { reactFlowNodes, reactFlowEdges };
};
