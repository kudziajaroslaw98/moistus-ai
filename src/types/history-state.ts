import { Node } from "@xyflow/react";
import { AppEdge } from "./app-edge";
import { NodeData } from "./node-data";

export interface HistoryState {
  nodes: Node<NodeData>[];
  edges: AppEdge[];
  actionName?: string; // Optional name of the action that created this state
  timestamp: number; // Timestamp when the state was created
}
