import { Node, Edge } from "@xyflow/react";
import { NodeData } from "./node-data";
import { EdgeData } from "./edge-data";

export interface HistoryState {
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];
}
