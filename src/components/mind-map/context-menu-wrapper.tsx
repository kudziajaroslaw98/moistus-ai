'use client';
import useAppStore from '@/store/mind-map-store';
import { ContextMenu } from '../context-menu/context-menu';

export function ContextMenuWrapper() {
	const isContextMenuOpen = useAppStore(
		(state) => state.popoverOpen.contextMenu
	);

	if (!isContextMenuOpen) {
		return null;
	}

	return <ContextMenu />;
}
