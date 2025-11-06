'use client';
import useAppStore from '@/store/mind-map-store';
import { HistorySidebar } from '../history/history-sidebar';
import { MapSettingsPanel } from '../mind-map/map-settings-panel';
import EdgeEditModal from '../modals/edge-edit-modal';
import { ReferenceSearchModal } from '../modals/reference-search-modal';
import { SharePanel } from '../sharing/share-panel';

export function ModalsWrapper() {
	const popoverOpen = useAppStore((state) => state.popoverOpen);
	const setPopoverOpen = useAppStore((state) => state.setPopoverOpen);
	const mindMap = useAppStore((state) => state.mindMap);
	const currentUser = useAppStore((state) => state.currentUser);

	return (
		<>
			{popoverOpen.edgeEdit && <EdgeEditModal />}

			<HistorySidebar />

			{popoverOpen.sharePanel && mindMap && currentUser && (
				<SharePanel
					isOpen={popoverOpen.sharePanel}
					mapId={mindMap.id}
					mapTitle={mindMap.title}
					currentUser={{
						id: currentUser.id,
						name:
							currentUser.user_metadata?.name || currentUser.email || 'User',
						email: currentUser.email || '',
					}}
					onClose={() => setPopoverOpen({ sharePanel: false })}
				/>
			)}

			<MapSettingsPanel
				isOpen={popoverOpen.mapSettings}
				onClose={() => setPopoverOpen({ mapSettings: false })}
			/>

			{popoverOpen.referenceSearch && <ReferenceSearchModal />}
		</>
	);
}
