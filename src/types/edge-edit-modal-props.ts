import { AppEdge } from "./app-edge";
import { Node } from "@xyflow/react";
import { NodeData } from "./node-data";
import { EdgeData } from "./edge-data";

export interface EdgeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  edge: AppEdge | null; // The edge being edited
  onSave: (edgeId: string, changes: Partial<EdgeData>) => Promise<void>;
  isLoading: boolean; // To disable form during save
  nodes: Node<NodeData>[]; // Pass nodes to display node content if needed
}
