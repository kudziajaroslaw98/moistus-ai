"use client";
import { useMindMapContext } from "@/contexts/mind-map/mind-map-context";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { CommandPalette } from "../command-palette";

export function CommandPaletteWrapper() {
  const {
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
    nodes,
    edges, // Need edges to find selected edge
    crudActions,
    aiActions,
    applyLayout,
    toggleFocusMode,
    setIsNodeTypeModalOpen, // To open node type modal
    setNodeToAddInfo, // To set info for adding node
  } = useMindMapContext();

  const selectedNodeId = useMemo(
    () => nodes.find((n) => n.selected)?.id,
    [nodes],
  );
  const selectedEdgeId = useMemo(
    () => edges.find((e) => e.selected)?.id,
    [edges],
  );

  const openNodeTypeModal = useCallback(
    (parentId: string | null = null) => {
      setNodeToAddInfo({ parentId, position: undefined }); // Position might need adjustment
      setIsNodeTypeModalOpen(true);
    },
    [setNodeToAddInfo, setIsNodeTypeModalOpen],
  );

  // Rebuild actions object using context values
  const commandPaletteActions = useMemo(
    () => ({
      undo: handleUndo,
      redo: handleRedo,
      addNode: openNodeTypeModal,
      deleteSelected: () => {
        if (selectedNodeId) crudActions.deleteNode(selectedNodeId);
        else if (selectedEdgeId) crudActions.deleteEdge(selectedEdgeId);
        else toast.error("Nothing selected to delete");
      },
      triggerSuggestConnections: aiActions.suggestConnections,
      triggerSuggestMerges: aiActions.suggestMerges,
      applyLayoutTB: () => applyLayout("TB"),
      applyLayoutLR: () => applyLayout("LR"),
      aiSearch: aiActions.searchNodes, // Assuming searchNodes takes no args here, adjust if needed
      toggleFocusMode: toggleFocusMode,
      groupSelectedNodes: () => {
        const selectedNodes = nodes.filter((n) => n.selected);

        if (selectedNodes.length > 1) {
          crudActions.groupNodes(selectedNodes.map((n) => n.id));
        } else {
          toast.error("Select 2 or mode nodes to group.");
        }
      },
    }),
    [
      handleUndo,
      handleRedo,
      openNodeTypeModal,
      selectedNodeId,
      selectedEdgeId,
      crudActions,
      aiActions,
      applyLayout,
      toggleFocusMode,
      nodes,
    ],
  );

  return (
    <CommandPalette
      isOpen={isCommandPaletteOpen}
      setIsOpen={setIsCommandPaletteOpen}
      actions={commandPaletteActions}
      canUndo={canUndo}
      canRedo={canRedo}
      nodes={nodes}
    />
  );
}
