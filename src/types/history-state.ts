import { Node } from "@xyflow/react";
import { AppEdge } from "./app-edge";
import { NodeData } from "./node-data";

export interface HistoryState {
  nodes: Node<NodeData>[];
  edges: AppEdge[];
}
