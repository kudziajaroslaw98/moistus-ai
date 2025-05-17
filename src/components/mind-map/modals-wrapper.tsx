"use client";
import { useMindMapContext } from "@/contexts/mind-map/mind-map-context";
import { toast } from "sonner";
import { HistorySidebar } from "../history-sidebar";
import MergeSuggestionsModal from "../merge-suggestions-modal";
import AiContentPromptModal from "../modals/ai-content-prompt-modal";
import EdgeEditModal from "../modals/edge-edit-modal";
import NodeEditModal from "../modals/node-edit-modal";
import SelectNodeTypeModal from "../modals/select-node-type-modal";

export function ModalsWrapper() {
  const {
    // AI Content Modal
    isAiContentModalOpen,
    setIsAiContentModalOpen,
    aiContentTargetNodeId,
    aiActions,
    aiLoadingStates,
    // Merge Modal
    isMergeModalOpen,
    setIsMergeModalOpen,
    mergeSuggestions,
    nodes, // Needed for merge modal node lookup
    // Node Type Modal
    isNodeTypeModalOpen,
    setIsNodeTypeModalOpen,
    setNodeToAddInfo,
    crudActions,
    nodeToAddInfo,
    // Node Edit Modal
    isNodeEditModalOpen,
    setIsNodeEditModalOpen,
    nodeToEdit,
    setNodeToEdit,
    isCrudLoading, // Use specific loading state
    // Edge Edit Modal
    isEdgeEditModalOpen,
    setIsEdgeEditModalOpen,
    edgeToEdit,
    setEdgeToEdit,
  } = useMindMapContext();

  const handleSelectNodeType = (selectedType: string) => {
    const info = nodeToAddInfo; // Capture the info *before* resetting state

    // Clear state immediately after capture and ensure modal closes
    setIsNodeTypeModalOpen(false);
    setNodeToAddInfo(null);

    if (!info) {
      console.error("Node to add info is missing when selecting type.");
      // Use a more specific error message if possible
      toast.error("Error adding node: Missing context.");
      return; // Exit early if info is missing
    }

    // Call addNode *after* capturing info and clearing state
    // Use the captured 'info' variable
    crudActions.addNode(
      info.parentId,
      `New ${selectedType}`,
      selectedType,
      info.position,
    );

    // State is already cleared above
  };

  const handleCloseNodeEditModal = () => {
    setNodeToEdit(null); // Clear data on close
    setIsNodeEditModalOpen(false);
  };

  const handleCloseEdgeEditModal = () => {
    setEdgeToEdit(null); // Clear data on close
    setIsEdgeEditModalOpen(false);
  };

  return (
    <>
      <AiContentPromptModal
        isOpen={isAiContentModalOpen}
        onClose={() => {
          aiActions.setAiContentTargetNodeId(null);
          setIsAiContentModalOpen(false);
        }}
        onGenerate={(prompt) => {
          if (aiContentTargetNodeId) {
            aiActions.generateContent(aiContentTargetNodeId, prompt);
          }
        }}
        isLoading={aiLoadingStates.isGeneratingContent}
      />

      <MergeSuggestionsModal
        isOpen={isMergeModalOpen}
        onClose={() => setIsMergeModalOpen(false)}
        suggestions={mergeSuggestions}
        onAccept={aiActions.acceptMerge}
        onDismiss={aiActions.dismissMerge}
        nodes={nodes}
        isLoading={aiLoadingStates.isAcceptingMerge}
      />

      <SelectNodeTypeModal
        isOpen={isNodeTypeModalOpen}
        onClose={() => {
          // Ensure state is cleared on explicit close/cancel
          setIsNodeTypeModalOpen(false);
          setNodeToAddInfo(null);
        }}
        onSelectType={handleSelectNodeType}
      />

      <NodeEditModal
        isOpen={isNodeEditModalOpen}
        onClose={handleCloseNodeEditModal}
        node={nodeToEdit}
        onSave={crudActions.saveNodeProperties}
        isLoading={isCrudLoading}
        clearData={() => setNodeToEdit(null)} // Pass clear function
      />

      <EdgeEditModal
        isOpen={isEdgeEditModalOpen}
        onClose={handleCloseEdgeEditModal}
        edge={edgeToEdit}
        onSave={crudActions.saveEdgeProperties}
        isLoading={isCrudLoading}
        nodes={nodes} // Pass nodes for context/display
        clearData={() => setEdgeToEdit(null)} // Pass clear function
      />

      <HistorySidebar />
    </>
  );
}
