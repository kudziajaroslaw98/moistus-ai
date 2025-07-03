'use client';
import useAppStore from '@/store/mind-map-store';
import { HistorySidebar } from '../history-sidebar';
import EdgeEditModal from '../modals/edge-edit-modal';
import NodeEditModal from '../modals/node-edit-modal';
import { ReferenceSearchModal } from '../modals/reference-search-modal';
import SelectNodeTypeModal from '../modals/select-node-type-modal';
import { SharePanel } from '../sharing/share-panel';

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
	//
	const popoverOpen = useAppStore((state) => state.popoverOpen);
	const setPopoverOpen = useAppStore((state) => state.setPopoverOpen);
	const mindMap = useAppStore((state) => state.mindMap);
	const currentUser = useAppStore((state) => state.currentUser);

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

			{popoverOpen.sharePanel && mindMap && currentUser && (
				<SharePanel
					mapId={mindMap.id}
					mapTitle={mindMap.title}
					isOpen={popoverOpen.sharePanel}
					onClose={() => setPopoverOpen({ sharePanel: false })}
					currentUser={{
						id: currentUser.id,
						name:
							currentUser.user_metadata?.name || currentUser.email || 'User',
						email: currentUser.email || '',
					}}
				/>
			)}

			{popoverOpen.referenceSearch && <ReferenceSearchModal />}
		</>
	);
}
