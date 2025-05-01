import DefaultEdge from "@/components/edges/default-edge";
import EditableEdge from "@/components/edges/editable-edge";
import SuggestedConnectionEdge from "@/components/edges/suggested-connection-edge";

export const edgeTypes = {
  suggestedConnection: SuggestedConnectionEdge, // Add custom edge type for suggestions
  editableEdge: EditableEdge,
  defaultEdge: DefaultEdge,
};
