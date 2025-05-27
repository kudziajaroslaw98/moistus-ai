import { AppEdge } from "@/types/app-edge";
import { AppNode } from "@/types/app-node";
import { ContextMenuState } from "@/types/context-menu-state";
import { StateCreator } from "zustand";
import { AppState } from "../app-state";

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
  layoutSelector: boolean;
  commentsPanel: boolean;
  nodeComments: boolean;
}

export interface UIStateSlice {
  // UI state
  popoverOpen: Popovers;
  nodeInfo: Partial<AppNode> | null;
  edgeInfo: Partial<AppEdge> | null;
  contextMenuState: ContextMenuState;
  isFocusMode: boolean;
  isDraggingNodes: boolean;

  // UI setters
  setPopoverOpen: (popover: Partial<Popovers>) => void;
  setNodeInfo: (node: Partial<AppNode> | null) => void;
  setEdgeInfo: (edge: AppEdge | null) => void;
  setContextMenuState: (state: ContextMenuState) => void;
  setIsDraggingNodes: (isDragging: boolean) => void;

  // UI actions
  toggleFocusMode: () => void;
}

export const createUiStateSlice: StateCreator<
  AppState,
  [],
  [],
  UIStateSlice
> = (set, get) => ({
  // state
  popoverOpen: {
    contextMenu: false,
    commandPalette: false,
    nodeType: false,
    nodeEdit: false,
    edgeEdit: false,
    history: false,
    mergeSuggestions: false,
    aiContent: false,
    generateFromNodesModal: false,
    layoutSelector: false,
    commentsPanel: false,
    nodeComments: false,
  },
  nodeInfo: null,
  edgeInfo: null,
  contextMenuState: {
    x: 0,
    y: 0,
    nodeId: null,
    edgeId: null,
  },
  isFocusMode: false,
  isDraggingNodes: false,

  // setters
  setEdgeInfo: (edgeInfo) => {
    set({ edgeInfo });
  },
  setNodeInfo: (nodeInfo) => {
    set({ nodeInfo });
  },
  setPopoverOpen: (popover) => {
    set({ popoverOpen: { ...get().popoverOpen, ...popover } });
  },
  setIsDraggingNodes: (isDraggingNodes) => {
    set({ isDraggingNodes });
  },
  setContextMenuState: (state) => set({ contextMenuState: state }),

  // actions
  toggleFocusMode: () => {
    set({
      isFocusMode: !get().isFocusMode,
    });
  },
});
