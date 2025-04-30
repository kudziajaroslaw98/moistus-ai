export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  nodeId: string | null; // ID of the node clicked, null if background
  edgeId: string | null; // ID of the edge clicked, null if background
}
