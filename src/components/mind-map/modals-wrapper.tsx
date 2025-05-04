"use client";
import { useMindMapContext } from "@/contexts/mind-map/mind-map-context";
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
    showNotification,
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
    // Logic moved from MindMapCanvas
    setNodeToAddInfo((prevInfo) => {
      if (!prevInfo) {
        console.error("Node to add info is missing when selecting type.");
        showNotification("Error adding node.", "error");
        return null;
      }

      crudActions.addNode(
        prevInfo.parentId,
        `New ${selectedType}`,
        selectedType,
        prevInfo.position,
      );
      return null; // Reset nodeToAddInfo
    });
    setIsNodeTypeModalOpen(false);
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
          setNodeToAddInfo(null); // Clear info if closed without selection
          setIsNodeTypeModalOpen(false);
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
    </>
  );
}
