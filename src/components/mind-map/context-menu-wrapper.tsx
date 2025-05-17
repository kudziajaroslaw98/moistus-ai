"use client";
import { useMindMapContext } from "@/contexts/mind-map/mind-map-context";
import useOutsideAlerter from "@/hooks/use-click-outside";
import { XYPosition } from "@xyflow/react";
import { useRef, useState } from "react";
import { ContextMenuDisplay } from "../context-menu-display";
import { GenerateFromNodesModal } from "../modals/generate-from-nodes-modal";

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
    aiActions: { setAiContentTargetNodeId },
    setIsNodeTypeModalOpen,
    setNodeToAddInfo,
    selectedNodes,
  } = useMindMapContext();

  const [isGenerateFromNodesModalOpen, setIsGenerateFromNodesModalOpen] = useState(false);

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
    <>
      <ContextMenuDisplay
        ref={ref}
        contextMenuState={contextMenuState}
        closeContextMenu={contextMenuHandlers.close}
        nodes={nodes}
        edges={edges}
        addNode={handleOpenNodeTypeModal}
        deleteNode={crudActions.deleteNode}
        deleteEdge={crudActions.deleteEdge}
        saveEdgeStyle={crudActions.saveEdgeProperties}
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
          generateFromSelectedNodes: aiActions.generateFromSelectedNodes,
        }}
        aiLoadingStates={aiLoadingStates}
        applyLayout={applyLayout}
        isLoading={isLoading}
        reactFlowInstance={reactFlowInstance!}
        setNodeParentAction={crudActions.setNodeParent}
        selectedNodes={selectedNodes}
        setIsGenerateFromNodesModalOpen={setIsGenerateFromNodesModalOpen}
      />

      <GenerateFromNodesModal
        isOpen={isGenerateFromNodesModalOpen}
        onClose={() => setIsGenerateFromNodesModalOpen(false)}
        onSubmit={(prompt) => {
          if (selectedNodes && selectedNodes.length > 0) {
            return aiActions.generateFromSelectedNodes(
              selectedNodes.map(node => node.id),
              prompt
            );
          }
          return Promise.resolve();
        }}
        isLoading={aiLoadingStates.isGeneratingFromSelectedNodes || false}
        selectedNodeCount={selectedNodes ? selectedNodes.length : 0}
      />
    </>
  );
}
