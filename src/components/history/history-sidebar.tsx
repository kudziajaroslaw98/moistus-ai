'use client';

import useAppStore from '@/store/mind-map-store';
import { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/shallow';
import { SidePanel } from '../side-panel';
import { HistoryActions } from './history-actions';
import { HistoryEmptyState } from './history-empty-state';
import { HistoryList, type HistoryListHandle } from './history-list';

export function HistorySidebar() {
	const {
		popoverOpen,
		setPopoverOpen,
		loadHistoryFromDB,
		historyMeta,
		isLoading,
		mapId,
		isProUser,
	} = useAppStore(
		useShallow((state) => ({
			popoverOpen: state.popoverOpen,
			setPopoverOpen: state.setPopoverOpen,
			loadHistoryFromDB: state.loadHistoryFromDB,
			historyMeta: state.historyMeta,
			isLoading: state.loadingStates?.isStateLoading,
			mapId: state.mapId,
			isProUser: state.isProUser(),
		}))
	);

	// Ref to control history list
	const historyListRef = useRef<HistoryListHandle>(null);

	// Load history when sidebar opens
	// Note: loadHistoryFromDB intentionally excluded from deps to prevent infinite loop
	// (Zustand functions create new references on state updates)
	useEffect(() => {
		if (popoverOpen.history && mapId) {
			loadHistoryFromDB();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [popoverOpen.history, mapId]);

	const handleClose = () => setPopoverOpen({ history: false });

	return (
		<SidePanel
			className='w-[400px]'
			isOpen={popoverOpen.history}
			onClose={handleClose}
			title='Mind Map History'
		>
			<div className='flex h-full flex-col gap-4 p-4 pb-12 overflow-y-auto scrollbar'>
				{historyMeta.length === 0 && !isLoading ? (
					<HistoryEmptyState />
				) : (
					<>
						<HistoryList ref={historyListRef} />

						<HistoryActions historyListRef={historyListRef} isPro={isProUser} />
					</>
				)}
			</div>
		</SidePanel>
	);
}
