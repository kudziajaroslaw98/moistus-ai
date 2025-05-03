import { Node } from "@xyflow/react";
import { NodeData } from "./node-data";

export interface NodeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  clearData: () => void; // Function to clear data when modal closes
  node: Node<NodeData> | null; // The node being edited
  // onSave should accept node ID and partial NodeData for changes
  onSave: (nodeId: string, changes: Partial<NodeData>) => Promise<void>;
  isLoading: boolean; // To disable the form during save
}
