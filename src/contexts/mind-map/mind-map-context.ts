import type { AiActions, AiLoadingStates } from "@/hooks/use-ai-features"; // Assuming types are exported
import type { CrudActions } from "@/hooks/use-mind-map-crud";
import type { AiMergeSuggestion } from "@/types/ai-merge-suggestion";
import type { AppEdge } from "@/types/app-edge";
import { ContextMenuState } from "@/types/context-menu-state";
import type { EdgeData } from "@/types/edge-data";
import type { HistoryState } from "@/types/history-state";
import { MindMapData } from "@/types/mind-map-data";
import type { NodeData } from "@/types/node-data";
import {
  Edge,
  EdgeMouseHandler,
  Node,
  NodeMouseHandler,
  OnEdgesChange,
  OnNodesChange,
  ReactFlowInstance,
  XYPosition,
} from "@xyflow/react";
import React, { createContext, useContext } from "react";

interface MindMapContextProps {
  // State
  mindMap: MindMapData | null;
  mapId: string | null;
  nodes: Node<NodeData>[];
  edges: AppEdge[];
  isLoading: boolean; // Combined loading state
  isStateLoading: boolean;
  isCrudLoading: boolean;
  isLayoutLoading: boolean;
  aiLoadingStates: AiLoadingStates;
  canUndo: boolean;
  canRedo: boolean;
  currentHistoryState: HistoryState | undefined;
  suggestedEdges: Edge<Partial<EdgeData>>[];
  mergeSuggestions: AiMergeSuggestion[];
  isAiContentModalOpen: boolean;
  aiContentTargetNodeId: string | null;
  isMergeModalOpen: boolean;
  isNodeTypeModalOpen: boolean;
  isNodeEditModalOpen: boolean;
  nodeToEdit: NodeData | null;
  isEdgeEditModalOpen: boolean;
  edgeToEdit: AppEdge | null;
  isCommandPaletteOpen: boolean;
  isFocusMode: boolean;
  aiPrompt: string;
  aiSearchQuery: string;
  history: HistoryState[]; // Full history array
  historyIndex: number; // Current index in history
  isHistorySidebarOpen: boolean; // State for the new sidebar
  nodeToAddInfo: { parentId: string | null; position?: XYPosition } | null;
  selectedNodes: Node<NodeData>[] | undefined; // Track selected nodes

  // Setters / Actions
  setNodes: React.Dispatch<React.SetStateAction<Node<NodeData>[]>>;
  setEdges: React.Dispatch<React.SetStateAction<AppEdge[]>>;
  crudActions: CrudActions;
  aiActions: AiActions;
  applyLayout: (direction: "TB" | "LR") => Promise<void>;
  handleUndo: () => void;
  handleRedo: () => void;
  addStateToHistory: (sourceAction?: string) => void;
  revertToHistoryState: (index: number) => Promise<void>; // Function to revert
  setIsHistorySidebarOpen: React.Dispatch<React.SetStateAction<boolean>>; // Setter for sidebar
  contextMenuHandlers: {
    onNodeContextMenu: NodeMouseHandler<Node<NodeData>>;
    onPaneContextMenu: (event: React.MouseEvent | MouseEvent) => void;
    onEdgeContextMenu: EdgeMouseHandler<Edge<Partial<EdgeData>>>;
    onPaneClick: () => void;
    close: () => void;
  };
  reactFlowInstance: ReactFlowInstance | null;
  setReactFlowInstance: (instance: ReactFlowInstance | null) => void;
  setIsAiContentModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsMergeModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsNodeTypeModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setNodeToAddInfo: React.Dispatch<
    React.SetStateAction<{
      parentId: string | null;
      position?: XYPosition | undefined;
    } | null>
  >;
  setIsNodeEditModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setNodeToEdit: React.Dispatch<React.SetStateAction<NodeData | null>>;
  setIsEdgeEditModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setEdgeToEdit: React.Dispatch<React.SetStateAction<AppEdge | null>>;
  setIsCommandPaletteOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleFocusMode: () => void;
  handleCopy: () => void;
  handlePaste: () => Promise<void>;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  contextMenuState: ContextMenuState;
  toggleNodeCollapse: (nodeId: string) => Promise<void>; // Added for collapsing
  isNodeCollapsed: (nodeId: string) => boolean; // Helper to check collapse state
  setSelectedNodes: React.Dispatch<React.SetStateAction<Node<NodeData>[] | undefined>>; // Setter for selected nodes
}

const MindMapContext = createContext<MindMapContextProps | undefined>(
  undefined,
);

export const useMindMapContext = () => {
  const context = useContext(MindMapContext);

  if (!context) {
    throw new Error("useMindMapContext must be used within a MindMapProvider");
  }

  return context;
};

export default MindMapContext;
