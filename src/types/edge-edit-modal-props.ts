import { Node } from "@xyflow/react";
import { AppEdge } from "./app-edge";
import { EdgeData } from "./edge-data";
import { NodeData } from "./node-data";

export interface EdgeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  edge: AppEdge | null;
  onSave: (edgeId: string, changes: Partial<EdgeData>) => Promise<void>;
  isLoading: boolean;
  nodes: Node<NodeData>[];
}
