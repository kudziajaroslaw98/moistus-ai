import { Node } from "@xyflow/react";
import { NodeData } from "./node-data";

export interface NodeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  clearData: () => void;
  node: Node<NodeData> | null;

  onSave: (nodeId: string, changes: Partial<NodeData>) => Promise<void>;
  isLoading: boolean;
}
