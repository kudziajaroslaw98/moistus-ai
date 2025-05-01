import { NodeData } from "./node-data";
import { Node } from "@xyflow/react";

export interface NodeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  node: Node<NodeData> | null; // The node being edited
  // onSave should accept node ID and partial NodeData for changes
  onSave: (nodeId: string, changes: Partial<NodeData>) => Promise<void>;
  isLoading: boolean; // To disable the form during save
}
