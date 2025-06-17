'use client';
import useAppStore from '@/store/mind-map-store';
import { useShallow } from 'zustand/shallow';
import { ContextMenuDisplay } from '../context-menu-display';
import { GenerateFromNodesModal } from '../modals/generate-from-nodes-modal';

export function ContextMenuWrapper() {
	// const {
	//   aiActions,
	//   setIsAiContentModalOpen,
	//   aiActions: { setAiContentTargetNodeId },
	// } = useMindMapContext();

	const { loadingStates, selectedNodes, popoverOpen } = useAppStore(
		useShallow((state) => ({
			loadingStates: state.loadingStates,
			popoverOpen: state.popoverOpen,
			selectedNodes: state.selectedNodes,
		}))
	);

	const handleGenerateFromNodesSubmit = (prompt: string) => {
		if (selectedNodes && selectedNodes.length > 0) {
			return aiActions.generateFromSelectedNodes(
				selectedNodes.map((node) => node.id),
				prompt
			);
		}

		return Promise.resolve();
	};

	const aiActions = {
		summarizeNode: (nodeId: string) => {},
		summarizeBranch: (nodeId: string) => {},
		extractConcepts: (nodeId: string) => {},
		openContentModal: (nodeId: string) => {},
		suggestConnections: () => {},
		suggestMerges: () => {},
		generateFromSelectedNodes: (nodeIds: string[], prompt: string) => {
			return Promise.resolve();
		},
	};

	if (!popoverOpen.contextMenu) {
		return null;
	}

	return (
		<>
			<ContextMenuDisplay
				aiActions={{
					summarizeNode: aiActions.summarizeNode,
					summarizeBranch: aiActions.summarizeBranch,
					extractConcepts: aiActions.extractConcepts,
					openContentModal: aiActions.openContentModal,
					suggestConnections: aiActions.suggestConnections,
					suggestMerges: aiActions.suggestMerges,
					generateFromSelectedNodes: aiActions.generateFromSelectedNodes,
				}}
			/>

			<GenerateFromNodesModal
				onSubmit={handleGenerateFromNodesSubmit}
				isLoading={loadingStates.isGeneratingContent}
				selectedNodeCount={selectedNodes ? selectedNodes.length : 0}
			/>
		</>
	);
}
