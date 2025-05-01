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
    position: { x: node.position_x || 0, y: node.position_y || 0 },
    data: node, // Pass the entire NodeData object
    type: node.node_type || "defaultNode", // Use node_type from data, default to 'defaultNode'
    width: node.width || undefined, // Use width from DB if available
    height: node.height || undefined, // Use height from DB if available
    // Ensure style object is correctly structured if used directly on the node
    // style: node.style || {}, // Example if you have a style column
  }));

  // --- Edges are now fetched from the 'edges' table ---
  const reactFlowEdges: AppEdge[] = edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    user_id: edge.user_id, // Include user_id
    map_id: edge.map_id, // Include map_id

    // Use saved properties, fall back to defaults
    type: edge.type || "editableEdge", // Default to 'editableEdge' custom type
    animated: edge.animated ?? false, // Default to false if null/undefined
    label: edge.label,
    // Use style object from data if available, otherwise construct from color/strokeWidth
    style: edge.style || {
      stroke: edge.color || "#6c757d",
      strokeWidth: edge.strokeWidth || 2,
    },
    markerEnd: edge.markerEnd || undefined, // Use markerEnd from data

    data: edge, // Pass the full edge data into the data property
    // Add other standard edge properties if needed
  }));

  return { reactFlowNodes, reactFlowEdges };
};
