import { AppEdge } from "@/types/app-edge";
import { EdgeData } from "@/types/edge-data";
import { NodeData } from "@/types/node-data";
import { Node } from "@xyflow/react";

export const transformDataToReactFlow = (
  nodes: NodeData[],
  edges: EdgeData[], // Accept EdgeData array
) => {
  const reactFlowNodes: Node<NodeData>[] = nodes.map((node) => ({
    id: node.id,
    position: { x: node.position_x || 0, y: node.position_y || 0 }, // Use stored position or default
    // Pass the full node data to the custom node component
    data: { ...node, label: node.content }, // Include content as label for default display
    type: node.node_type || "editableNode", // Use node_type from data, default to 'editableNode'
    style: {
      // Apply saved styling
      backgroundColor: node.backgroundColor || undefined, // Use undefined if null/empty
      borderColor: node.borderColor || undefined,
      color: node.color || undefined,
    },
  }));

  // --- Edges are now fetched from the 'edges' table ---
  const reactFlowEdges: AppEdge[] = edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    // Use saved properties, fall back to defaults
    type: edge.type || "editableEdge", // Default to 'editableEdge' custom type
    animated: edge.animated ?? false, // Default to false
    label: edge.label,
    style: edge.style || { stroke: edge.color || "#6c757d", strokeWidth: 2 }, // Default style or use color
    data: edge, // Pass the full edge data
    // Add other standard edge properties if needed
  }));

  return { reactFlowNodes, reactFlowEdges };
};
