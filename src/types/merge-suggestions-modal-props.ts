import { Node } from "@xyflow/react";
import { AiMergeSuggestion } from "./ai-merge-suggestion";
import { NodeData } from "./node-data";

export interface MergeSuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: AiMergeSuggestion[];
  onAccept: (suggestion: AiMergeSuggestion) => void;
  onDismiss: (suggestion: AiMergeSuggestion) => void;
  nodes: Node<NodeData>[];
}
