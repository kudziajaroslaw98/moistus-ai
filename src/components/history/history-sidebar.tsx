'use client';

import useAppStore from '@/store/mind-map-store';
import { useCallback, useEffect } from 'react';
import { useShallow } from 'zustand/shallow';
import { SidePanel } from '../side-panel';
import { HistoryActions } from './history-actions';
import { HistoryEmptyState } from './history-empty-state';
import { HistoryList } from './history-list';

export function HistorySidebar() {
	const {
		popoverOpen,
		setPopoverOpen,
		loadHistoryFromDB,
		historyMeta,
		isLoading,
		mapId,
		userProfile,
	} = useAppStore(
		useShallow((state) => ({
			popoverOpen: state.popoverOpen,
			setPopoverOpen: state.setPopoverOpen,
			loadHistoryFromDB: state.loadHistoryFromDB,
			historyMeta: state.historyMeta,
			isLoading: state.loadingStates?.isStateLoading,
			mapId: state.mapId,
			userProfile: state.userProfile,
		}))
	);

	const isPro =
		!!userProfile && (userProfile as any).subscription?.plan === 'pro';

	const loadFromDB = useCallback(async () => {
		await loadHistoryFromDB();
	}, [loadHistoryFromDB]);

	useEffect(() => {
		loadFromDB();
	}, [loadFromDB]);

	const handleClose = () => setPopoverOpen({ history: false });

	return (
		<SidePanel
			className='w-[400px]'
			isOpen={popoverOpen.history}
			title='Mind Map History'
			onClose={handleClose}
		>
			<div className='flex h-full flex-col gap-4'>
				{historyMeta.length === 0 && !isLoading ? (
					<HistoryEmptyState />
				) : (
					<>
						<HistoryList />

						<HistoryActions />
					</>
				)}
			</div>
		</SidePanel>
	);
}
