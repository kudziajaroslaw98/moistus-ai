import { AiMergeSuggestion } from "./ai-merge-suggestion";
import { Node } from "@xyflow/react";
import { NodeData } from "./node-data";

export interface MergeSuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: AiMergeSuggestion[];
  onAccept: (suggestion: AiMergeSuggestion) => void;
  onDismiss: (suggestion: AiMergeSuggestion) => void;
  nodes: Node<NodeData>[]; // Need nodes to display content snippets
}
