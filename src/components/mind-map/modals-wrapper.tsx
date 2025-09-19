'use client';
import useAppStore from '@/store/mind-map-store';
import { HistorySidebar } from '../history-sidebar';
import EdgeEditModal from '../modals/edge-edit-modal';
import { ReferenceSearchModal } from '../modals/reference-search-modal';
import SelectNodeTypeModal from '../modals/select-node-type-modal';
import { SharePanel } from '../sharing/share-panel';

export function ModalsWrapper() {
	const popoverOpen = useAppStore((state) => state.popoverOpen);
	const setPopoverOpen = useAppStore((state) => state.setPopoverOpen);
	const mindMap = useAppStore((state) => state.mindMap);
	const currentUser = useAppStore((state) => state.currentUser);

	return (
		<>
			{popoverOpen.nodeType && <SelectNodeTypeModal />}

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
