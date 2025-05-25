import type { NodeTypes } from "@/constants/node-types";
import type { AppEdge } from "@/types/app-edge";
import type { EdgeData } from "@/types/edge-data";
import type { MindMapData } from "@/types/mind-map-data";
import type { NodeData } from "@/types/node-data";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Node,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
  ReactFlowInstance,
  XYPosition,
} from "@xyflow/react";

export type AppNode = Node<NodeData>;
export type LayoutDirection = "TB" | "LR";

export interface LoadingStates {
  isAddingContent: boolean;
  isStateLoading: boolean;
  isGenerating: boolean;
  isSummarizing: boolean;
  isExtracting: boolean;
  isSearching: boolean;
  isGeneratingContent: boolean;
  isSuggestingConnections: boolean;
  isSummarizingBranch: boolean;
  isSuggestingMerges: boolean;
  isSavingNode: boolean;
  isSavingEdge: boolean;
  isApplyingLayout: boolean; // Added for layout operations
}

export interface Popovers {
  commandPalette: boolean;
  nodeType: boolean;
  nodeEdit: boolean;
  edgeEdit: boolean;
  history: boolean;
  mergeSuggestions: boolean;
  aiContent: boolean;
  generateFromNodesModal: boolean;
  contextMenu: boolean;
}

import { ContextMenuState } from "@/types/context-menu-state";
import type { HistoryState } from "@/types/history-state";

export interface AppState {
  /**
   * Sets an edge as a parent link and updates the target node's parent_id.
   * Optimistically updates Zustand store, then triggers debounced saves.
   */
  setParentConnection: (edgeId: string) => void;
  // state
  supabase: SupabaseClient;
  mapId: string | null;
  mindMap: MindMapData | null;
  reactFlowInstance: ReactFlowInstance | null;
  nodes: AppNode[];
  selectedNodes: AppNode[];
  edges: AppEdge[];
  isFocusMode: boolean;

  // Clipboard state
  copiedNodes: AppNode[];
  copiedEdges: AppEdge[];

  // History state for undo/redo
  history: ReadonlyArray<HistoryState>;
  historyIndex: number;
  isReverting: boolean;

  // History actions
  addStateToHistory: (
    actionName?: string,
    stateOverride?: { nodes?: AppNode[]; edges?: AppEdge[] },
  ) => void;
  handleUndo: () => Promise<void>;
  handleRedo: () => Promise<void>;
  revertToHistoryState: (index: number) => Promise<void>;

  // History selectors
  canUndo: boolean;
  canRedo: boolean;
  getCurrentHistoryState: () => HistoryState | undefined;

  popoverOpen: Popovers;
  nodeInfo: Partial<AppNode> | null; // reference to the node currently being edited / added node to
  edgeInfo: Partial<AppEdge> | null;
  loadingStates: LoadingStates;
  lastSavedNodeTimestamps: Record<string, number>; // Track when each node was last saved
  lastSavedEdgeTimestamps: Record<string, number>; // Track when each edge was last saved

  contextMenuState: ContextMenuState;

  // handlers
  onNodesChange: OnNodesChange<AppNode>;
  onEdgesChange: OnEdgesChange<AppEdge>;
  onConnect: OnConnect;

  // setters
  setNodes: (nodes: AppNode[]) => void;
  setEdges: (edges: AppEdge[]) => void;
  setMindMap: (mindMap: MindMapData) => void;
  setLoadingStates: (loadingStates: Partial<LoadingStates>) => void;
  setPopoverOpen: (popover: Partial<Popovers>) => void;
  setNodeInfo: (node: Partial<AppNode> | null) => void;
  setEdgeInfo: (edge: AppEdge | null) => void;
  setReactFlowInstance: (reactFlowInstance: ReactFlowInstance) => void;
  setMapId: (mapId: string | null) => void;
  setSelectedNodes: (selectedNodes: AppNode[]) => void;
  setContextMenuState: (state: ContextMenuState) => void;

  // getters
  getNode: (id: string) => AppNode | undefined;
  getEdge: (id: string) => AppEdge | undefined;

  // actions
  toggleFocusMode: () => void;
  copySelectedNodes: () => void;
  pasteNodes: (position?: XYPosition) => Promise<void>;
  duplicateNodes: (nodeIds: string[]) => Promise<{
    nodes: AppNode[];
    edges: AppEdge[];
  }>;
  fetchMindMapData: (mapId: string) => Promise<void>;
  addNode: ({
    parentNode,
    content,
    nodeType,
    data,
    position,
    toastId,
  }: {
    parentNode: Partial<AppNode> | null;
    content?: string;
    nodeType?: NodeTypes;
    data?: Partial<NodeData>;
    position?: { x: number; y: number };
    toastId?: string;
  }) => Promise<void>;
  updateNode: (props: {
    nodeId: string;
    data: Partial<NodeData>;
  }) => Promise<void>;
  deleteNodes: (nodesToDelete: AppNode[]) => Promise<void>;
  addEdge: (
    sourceId: string,
    targetId: string,
    data: Partial<EdgeData>,
    toastId?: string,
  ) => Promise<AppEdge>;
  deleteEdges: (edgesToDelete: AppEdge[]) => Promise<void>;
  updateEdge: (props: {
    edgeId: string;
    data: Partial<EdgeData>;
  }) => Promise<void>;
  triggerNodeSave: (nodeId: string) => void; // Debounced node save function
  triggerEdgeSave: (edgeId: string) => void; // Debounced edge save function

  // Layout action
  applyLayout: (direction: LayoutDirection) => Promise<void>;
}
