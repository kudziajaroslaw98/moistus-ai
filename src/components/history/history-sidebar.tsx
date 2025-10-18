'use client';

import useAppStore from '@/store/mind-map-store';
import { useCallback, useEffect, useRef } from 'react';
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

	const loadFromDB = useCallback(async () => {
		await loadHistoryFromDB();
	}, [loadHistoryFromDB]);

	useEffect(() => {
		loadFromDB();
	}, [popoverOpen.history, loadFromDB]);

	const handleClose = () => setPopoverOpen({ history: false });

	return (
		<SidePanel
			className='w-[400px]'
			isOpen={popoverOpen.history}
			title='Mind Map History'
			onClose={handleClose}
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
