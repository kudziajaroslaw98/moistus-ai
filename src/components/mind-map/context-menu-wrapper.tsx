'use client';
import useAppStore from '@/store/mind-map-store';
import { useShallow } from 'zustand/shallow';
import { ContextMenu } from '../context-menu/context-menu';

export function ContextMenuWrapper() {
	const {
		popoverOpen,
		generateConnectionSuggestions,
		generateMergeSuggestions,
		contextMenuState,
		generateCounterpointsForNode,
	} = useAppStore(
		useShallow((state) => ({
			popoverOpen: state.popoverOpen,
			generateConnectionSuggestions: state.generateConnectionSuggestions,
			generateMergeSuggestions: state.generateMergeSuggestions,
			contextMenuState: state.contextMenuState,
			generateCounterpointsForNode: state.generateCounterpointsForNode,
		}))
	);

	if (!popoverOpen.contextMenu) {
		return null;
	}

	return (
		<ContextMenu
			aiActions={{
				suggestConnections: () => generateConnectionSuggestions(),
				suggestMerges: () => generateMergeSuggestions(),
				suggestCounterpoints: () => {
					const nodeId = contextMenuState?.nodeId;
					if (nodeId) generateCounterpointsForNode(nodeId);
				},
			}}
		/>
	);
}
