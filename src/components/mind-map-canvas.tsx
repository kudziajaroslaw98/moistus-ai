"use client";

import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"; // Keep shortcuts here
import { cn } from "@/utils/cn";
import { useMemo } from "react";
import { ModalsWrapper } from "./mind-map/modals-wrapper";
import { ReactFlowArea } from "./mind-map/react-flow-area";

import useAppStore from "@/contexts/mind-map/mind-map-store";
import { useShallow } from "zustand/shallow";
import { CommandPalette } from "./command-palette";
import { CommentsPanel } from "./comment/comment-panel";
import { MindMapToolbar } from "./mind-map-toolbar/mind-map-toolbar";
import { ContextMenuWrapper } from "./mind-map/context-menu-wrapper";

export function MindMapCanvas() {
  // Consume necessary values for keyboard shortcuts
  const {
    handleUndo,
    handleRedo,
    handleCopy,
    handlePaste,
    nodes,
    edges,
    selectedNodes,
    canUndo,
    canRedo,
    loadingStates,
    setPopoverOpen,
    popoverOpen,
    isFocusMode,
    createGroupFromSelected,
    ungroupNodes,
    toggleNodeCollapse,
    isCommentsPanelOpen,
    toggleCommentsPanel,
  } = useAppStore(
    useShallow((state) => ({
      handleUndo: state.handleUndo,
      handleRedo: state.handleRedo,
      handleCopy: state.copySelectedNodes,
      handlePaste: state.pasteNodes,
      nodes: state.nodes,
      edges: state.edges,
      selectedNodes: state.selectedNodes,
      canUndo: state.canUndo,
      canRedo: state.canRedo,
      loadingStates: state.loadingStates,
      setPopoverOpen: state.setPopoverOpen,
      isFocusMode: state.isFocusMode,
      popoverOpen: state.popoverOpen,
      createGroupFromSelected: state.createGroupFromSelected,
      ungroupNodes: state.ungroupNodes,
      toggleNodeCollapse: state.toggleNodeCollapse,
      isCommentsPanelOpen: state.isCommentsPanelOpen,
      toggleCommentsPanel: state.toggleCommentsPanel,
    })),
  );
  const isLoading = loadingStates.isStateLoading;

  const selectedNodeId = useMemo(
    () => nodes.find((n) => n.selected)?.id,
    [nodes],
  );
  const selectedEdgeId = useMemo(
    () => edges.find((e) => e.selected)?.id,
    [edges],
  );

  const openNodeTypeModal = () => {
    setPopoverOpen({ nodeType: true });
  };

  const handleGroup = () => {
    if (selectedNodes.length >= 2) {
      createGroupFromSelected();
    }
  };

  const handleUngroup = () => {
    if (selectedNodes.length === 1 && selectedNodes[0].data.metadata?.isGroup) {
      ungroupNodes(selectedNodes[0].id);
    }
  };

  const handleToggleCollapse = () => {
    if (selectedNodes.length === 1) {
      toggleNodeCollapse(selectedNodes[0].id);
    }
  };

  useKeyboardShortcuts({
    onUndo: handleUndo,
    onRedo: handleRedo,
    onAddChild: openNodeTypeModal, // Use wrapper function
    onCopy: handleCopy,
    onPaste: handlePaste,
    selectedNodeId: selectedNodeId,
    selectedEdgeId: selectedEdgeId,
    canUndo: canUndo,
    canRedo: canRedo,
    isBusy: isLoading,
    onGroup: handleGroup,
    onUngroup: handleUngroup,
    onToggleComments: toggleCommentsPanel,
    onToggleCollapse: handleToggleCollapse,
  });

  return (
    // Context Provider is now wrapping this component higher up
    <div className="relative h-full w-full overflow-hidden rounded-md bg-zinc-900 flex">
      {/* Main content area */}
      <div
        className={cn([
          "flex-1 relative",
          isCommentsPanelOpen ? "w-[calc(100%-384px)]" : "w-full",
        ])}
      >
        {/* Render the wrapped components */}
        <MindMapToolbar />

        <CommandPalette />

        <ModalsWrapper />

        {/* Position the ReactFlowArea */}
        <div
          className={cn([
            "relative w-full transition-all duration-200 ease-in-out",
            isFocusMode ? "h-full mt-0" : "h-[calc(100%-60px)] mt-[60px]",
          ])}
        >
          <ContextMenuWrapper />

          <ReactFlowArea />
        </div>
      </div>

      {/* Comments Panel */}
      <CommentsPanel />
    </div>
  );
}
