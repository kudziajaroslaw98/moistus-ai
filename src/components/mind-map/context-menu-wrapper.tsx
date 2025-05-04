"use client";
import { useMindMapContext } from "@/contexts/mind-map/mind-map-context";
import useOutsideAlerter from "@/hooks/use-click-outside";
import { XYPosition } from "@xyflow/react";
import { useRef } from "react";
import { ContextMenuDisplay } from "../context-menu-display";

export function ContextMenuWrapper() {
  const {
    contextMenuState,
    contextMenuHandlers,
    nodes,
    edges,
    crudActions,
    aiActions,
    aiLoadingStates,
    applyLayout,
    isLoading,
    reactFlowInstance,
    setIsAiContentModalOpen,
    aiActions: { setAiContentTargetNodeId }, // Destructure specific action
    setIsNodeTypeModalOpen,
    setNodeToAddInfo,
  } = useMindMapContext();

  const ref = useRef<HTMLDivElement>(null);
  useOutsideAlerter(ref, contextMenuHandlers.close);

  const handleOpenNodeTypeModal = (
    parentId: string | null,
    position?: XYPosition,
  ) => {
    setNodeToAddInfo({ parentId, position });
    setIsNodeTypeModalOpen(true);
  };

  return (
    <ContextMenuDisplay
      ref={ref}
      contextMenuState={contextMenuState}
      closeContextMenu={contextMenuHandlers.close}
      nodes={nodes}
      edges={edges}
      // Pass specific actions from crudActions
      addNode={handleOpenNodeTypeModal} // Use wrapper to set info and open modal
      deleteNode={crudActions.deleteNode}
      deleteEdge={crudActions.deleteEdge}
      saveEdgeStyle={crudActions.saveEdgeProperties} // Assuming this covers style saving
      aiActions={{
        summarizeNode: aiActions.summarizeNode,
        summarizeBranch: aiActions.summarizeBranch,
        extractConcepts: aiActions.extractConcepts,
        openContentModal: (nodeId: string) => {
          setAiContentTargetNodeId(nodeId);
          setIsAiContentModalOpen(true);
        },
        suggestConnections: aiActions.suggestConnections,
        suggestMerges: aiActions.suggestMerges,
      }}
      aiLoadingStates={aiLoadingStates}
      applyLayout={applyLayout}
      isLoading={isLoading}
      reactFlowInstance={reactFlowInstance!} // Assuming it's available when menu is open
    />
  );
}
