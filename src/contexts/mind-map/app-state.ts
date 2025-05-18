import type { NodeTypes } from "@/constants/node-types";
import type { AppEdge } from "@/types/app-edge";
import type { MindMapData } from "@/types/mind-map-data";
import type { NodeData } from "@/types/node-data";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Node,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
  ReactFlowInstance,
} from "@xyflow/react";

export type AppNode = Node<NodeData>;
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
}

export interface Popovers {
  commandPalette: boolean;
  nodeType: boolean;
  nodeEdit: boolean;
  edgeEdit: boolean;
  history: boolean;
  mergeSuggestions: boolean;
  aiContent: boolean;
}

export interface AppState {
  // state
  supabase: SupabaseClient;
  mapId: string | null;
  mindMap: MindMapData | null;
  reactFlowInstance: ReactFlowInstance | null;
  nodes: AppNode[];
  edges: AppEdge[];
  isFocusMode: boolean;
  popoverOpen: {
    commandPalette: boolean;
    nodeType: boolean;
    nodeEdit: boolean;
    edgeEdit: boolean;
    history: boolean;
    mergeSuggestions: boolean;
    aiContent: boolean;
  };
  nodeInfo: AppNode | null; // reference to the node currently being edited / added node to
  edgeInfo: AppEdge | null;
  loadingStates: LoadingStates;

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
  setNodeInfo: (node: AppNode | null) => void;
  setEdgeInfo: (edge: AppEdge | null) => void;
  setReactFlowInstance: (reactFlowInstance: ReactFlowInstance) => void;
  setMapId: (mapId: string | null) => void;

  // actions
  toggleFocusMode: () => void;
  fetchMindMapData: (mapId: string) => Promise<void>;
  addNode: ({
    parentNode,
    content,
    nodeType,
    data,
    position,
  }: {
    parentNode: AppNode | null;
    content?: string;
    nodeType?: NodeTypes;
    data?: Partial<NodeData>;
    position?: { x: number; y: number };
  }) => Promise<void>;
  updateNode: (props: {
    nodeId: string;
    data: Partial<NodeData>;
  }) => Promise<void>;
}
