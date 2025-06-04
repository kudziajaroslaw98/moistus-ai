import FloatingEdge from "@/components/edges/floating-edge"; // Import the new edge

export const edgeTypes = {
  suggestedConnection:
    /* SuggestedConnectionEdge TODO: Implement */ FloatingEdge,
  editableEdge: FloatingEdge,
  defaultEdge: FloatingEdge,
  floatingEdge: FloatingEdge, // Add the new floating edge
};
