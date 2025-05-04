"use client";

import { useMindMapContext } from "@/contexts/mind-map/mind-map-context";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"; // Keep shortcuts here
import { useMemo } from "react";
import { CommandPaletteWrapper } from "./mind-map/command-palette-wrapper";
import { ContextMenuWrapper } from "./mind-map/context-menu-wrapper";
import { ModalsWrapper } from "./mind-map/modals-wrapper";
import { NotificationsWrapper } from "./mind-map/notications-wrapper";
import { ReactFlowArea } from "./mind-map/react-flow-area";
import { ToolbarWrapper } from "./mind-map/toolbar-wrapper";

export function MindMapCanvas() {
  // Consume necessary values for keyboard shortcuts
  const {
    handleUndo,
    handleRedo,
    crudActions,
    handleCopy,
    handlePaste,
    nodes,
    edges, // Need edges for selectedEdgeId
    canUndo,
    canRedo,
    isLoading,
    reactFlowInstance,
    setIsNodeTypeModalOpen, // For Tab shortcut
    setNodeToAddInfo, // For Tab shortcut
  } = useMindMapContext();

  const selectedNodeId = useMemo(
    () => nodes.find((n) => n.selected)?.id,
    [nodes],
  );
  const selectedEdgeId = useMemo(
    () => edges.find((e) => e.selected)?.id,
    [edges],
  );

  const openNodeTypeModal = (parentId: string | null) => {
    setNodeToAddInfo({ parentId, position: undefined }); // Define position if needed
    setIsNodeTypeModalOpen(true);
  };

  useKeyboardShortcuts({
    onUndo: handleUndo,
    onRedo: handleRedo,
    onDelete: (idToDelete) => {
      // Determine if it's a node or edge ID
      if (nodes.some((n) => n.id === idToDelete)) {
        crudActions.deleteNode(idToDelete);
      } else if (edges.some((e) => e.id === idToDelete)) {
        crudActions.deleteEdge(idToDelete);
      } else {
        // This case shouldn't happen if selectedId is correct
        console.warn("Delete shortcut called with unknown ID:", idToDelete);
      }
    },
    onAddChild: openNodeTypeModal, // Use wrapper function
    onCopy: handleCopy,
    onPaste: handlePaste,
    selectedNodeId: selectedNodeId,
    selectedEdgeId: selectedEdgeId,
    canUndo: canUndo,
    canRedo: canRedo,
    isBusy: isLoading,
    reactFlowInstance: reactFlowInstance,
  });

  return (
    // Context Provider is now wrapping this component higher up
    <div className="relative h-full w-full overflow-hidden rounded-md bg-zinc-900">
      {/* Render the wrapped components */}
      <ToolbarWrapper />

      <CommandPaletteWrapper />

      <ContextMenuWrapper />

      <NotificationsWrapper />

      <ModalsWrapper />

      {/* Position the ReactFlowArea */}
      <div
        className={`relative h-full w-full transition-all duration-200 ease-in-out mt-[60px]`}
      >
        <ReactFlowArea />
      </div>
    </div>
  );
}
