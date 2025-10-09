'use client';
import useAppStore from '@/store/mind-map-store';
import { useShallow } from 'zustand/shallow';
import { ContextMenuDisplay } from '../context-menu/context-menu-display-simplified';

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

	

	const aiActions = {
		suggestConnections: () => {},
		suggestMerges: () => {},
	};

	if (!popoverOpen.contextMenu) {
		return null;
	}

	return (
		<>
			<ContextMenuDisplay
				aiActions={{
					suggestConnections: aiActions.suggestConnections,
					suggestMerges: aiActions.suggestMerges,
				}}
			/>

			
		</>
	);
}
