'use client';

import useAppStore from '@/store/mind-map-store';
import { Flag, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { SidePanel } from '../side-panel';
import { HistoryEmptyState } from './history-empty-state';
import { HistoryFilterBar } from './history-filter-bar';
import { HistoryList } from './history-list';
import {
	countHistoryByFilter,
	type HistoryFilter,
} from './model/history-timeline';

const secondaryButtonClass =
	'inline-flex h-8 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-3 text-[13px] text-white/85 transition-colors duration-200 ease hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 disabled:opacity-50';

export function HistorySidebar() {
	const {
		popoverOpen,
		setPopoverOpen,
		loadHistoryFromDB,
		loadMoreHistory,
		createSnapshot,
		historyMeta,
		hasMore,
		isLoading,
		mapId,
		mapTitle,
		isProUser,
	} = useAppStore(
		useShallow((state) => ({
			popoverOpen: state.popoverOpen,
			setPopoverOpen: state.setPopoverOpen,
			loadHistoryFromDB: state.loadHistoryFromDB,
			loadMoreHistory: state.loadMoreHistory,
			createSnapshot: state.createSnapshot,
			historyMeta: state.historyMeta,
			hasMore: state.historyHasMore,
			isLoading: state.loadingStates?.isHistoryLoading,
			mapId: state.mapId,
			mapTitle: state.mindMap?.title,
			isProUser: state.isProUser(),
		}))
	);
	const [filter, setFilter] = useState<HistoryFilter>('all');

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
	const isEmpty = historyMeta.length === 0 && !isLoading;

	return (
		<SidePanel
			bodyClassName='p-0'
			className='w-full sm:w-[460px]'
			isOpen={popoverOpen.history}
			onClose={handleClose}
			subtitle={mapTitle}
			title='History'
			headerActions={
				isProUser ? (
					<button
						className={secondaryButtonClass}
						onClick={() => createSnapshot('Manual Checkpoint', true)}
						title='Save a checkpoint of the current map'
						type='button'
					>
						<Flag className='h-3.5 w-3.5' />
						Checkpoint
					</button>
				) : null
			}
			footer={
				<div className='flex w-full items-center justify-between gap-3'>
					<span className='text-[12px] text-white/45'>
						Latest changes first
					</span>

					{hasMore && (
						<button
							className={secondaryButtonClass}
							disabled={!mapId || isLoading}
							onClick={() => mapId && loadMoreHistory(mapId)}
							type='button'
						>
							{isLoading && <Loader2 className='h-3.5 w-3.5 animate-spin' />}
							Load older
						</button>
					)}
				</div>
			}
		>
			{isEmpty ? (
				<HistoryEmptyState />
			) : (
				<>
					<div className='shrink-0 border-b border-border-subtle px-4 py-3'>
						<HistoryFilterBar
							counts={countHistoryByFilter(historyMeta)}
							onChange={setFilter}
							value={filter}
						/>
					</div>

					<div className='min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3'>
						<HistoryList filter={filter} />
					</div>
				</>
			)}
		</SidePanel>
	);
}
