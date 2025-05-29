"use client";
import useAppStore from "@/contexts/mind-map/mind-map-store";
import { HistorySidebar } from "../history-sidebar";
import EdgeEditModal from "../modals/edge-edit-modal";
import NodeEditModal from "../modals/node-edit-modal";
import SelectNodeTypeModal from "../modals/select-node-type-modal";

export function ModalsWrapper() {
  // const {
  //   // AI Content Modal
  //   isAiContentModalOpen,
  //   setIsAiContentModalOpen,
  //   aiContentTargetNodeId,
  //   aiActions,
  //   aiLoadingStates,
  //   // Merge Modal
  //   isMergeModalOpen,
  //   setIsMergeModalOpen,
  //   mergeSuggestions,
  //   nodes, // Needed for merge modal node lookup
  // } = useMindMapContext();

  const popoverOpen = useAppStore((store) => store.popoverOpen);

  return (
    <>
      {/* <AiContentPromptModal
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
      */}

      {popoverOpen.nodeType && <SelectNodeTypeModal />}

      {popoverOpen.nodeEdit && <NodeEditModal />}

      {popoverOpen.edgeEdit && <EdgeEditModal />}

      {popoverOpen.history && <HistorySidebar />}
    </>
  );
}
