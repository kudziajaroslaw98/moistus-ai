'use client';
import useAppStore from '@/store/mind-map-store';
import { useShallow } from 'zustand/shallow';
import { ContextMenu } from '../context-menu/context-menu';

export function ContextMenuWrapper() {
	const { popoverOpen } = useAppStore(
		useShallow((state) => ({
			popoverOpen: state.popoverOpen,
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
		<ContextMenu
			aiActions={{
				suggestConnections: aiActions.suggestConnections,
				suggestMerges: aiActions.suggestMerges,
			}}
		/>
	);
}
