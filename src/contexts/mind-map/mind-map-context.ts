import type { AiActions, AiLoadingStates } from "@/hooks/use-ai-features"; // Assuming types are exported
import type { CrudActions } from "@/hooks/use-mind-map-crud";
import type { NotificationType } from "@/hooks/use-notifications";
import type { AiMergeSuggestion } from "@/types/ai-merge-suggestion";
import type { AppEdge } from "@/types/app-edge";
import type { ContextMenuState } from "@/types/context-menu-state";
import type { EdgeData } from "@/types/edge-data";
import type { HistoryState } from "@/types/history-state";
import type { NodeData } from "@/types/node-data";
import {
  Edge,
  Node,
  OnEdgesChange,
  OnNodesChange,
  ReactFlowInstance,
  XYPosition,
} from "@xyflow/react";
import React, { createContext, useContext } from "react";

interface MindMapContextProps {
  // State
  mapId: string | null;
  nodes: Node<NodeData>[];
  edges: AppEdge[];
  isLoading: boolean; // Combined loading state
  isDataLoading: boolean;
  isCrudLoading: boolean;
  isLayoutLoading: boolean;
  aiLoadingStates: AiLoadingStates;
  notification: { message: string | null; type: NotificationType | null };
  contextMenuState: ContextMenuState;
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
  nodeToEdit: Node<NodeData> | null;
  isEdgeEditModalOpen: boolean;
  edgeToEdit: AppEdge | null;
  isCommandPaletteOpen: boolean;
  isFocusMode: boolean;
  aiPrompt: string;
  aiSearchQuery: string;

  // Setters / Actions
  setNodes: React.Dispatch<React.SetStateAction<Node<NodeData>[]>>;
  setEdges: React.Dispatch<React.SetStateAction<AppEdge[]>>;
  showNotification: (message: string, type: NotificationType) => void;
  crudActions: CrudActions;
  aiActions: AiActions;
  applyLayout: (direction: "TB" | "LR") => Promise<void>;
  handleUndo: () => void;
  handleRedo: () => void;
  addStateToHistory: (sourceAction?: string) => void;
  contextMenuHandlers: {
    onNodeContextMenu: (event: React.MouseEvent, node: Node<NodeData>) => void;
    onPaneContextMenu: (event: React.MouseEvent) => void;
    onEdgeContextMenu: (event: React.MouseEvent, edge: AppEdge) => void;
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
  setNodeToEdit: React.Dispatch<React.SetStateAction<Node<NodeData> | null>>;
  setIsEdgeEditModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setEdgeToEdit: React.Dispatch<React.SetStateAction<AppEdge | null>>;
  setIsCommandPaletteOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleFocusMode: () => void;
  handleCopy: () => void;
  handlePaste: () => Promise<void>;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
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
