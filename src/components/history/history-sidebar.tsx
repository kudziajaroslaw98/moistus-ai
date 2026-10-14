'use client';

import { Button } from '@/components/ui/button';
import {
	Panel,
	PanelFooterActions,
	PanelFooterNote,
	panelButtonSmClass,
} from '@/components/ui/panel';
import { useIsMobile } from '@/hooks/use-mobile';
import useAppStore from '@/store/mind-map-store';
import { Flag, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { HistoryEmptyState } from './history-empty-state';
import { HistoryFilterBar } from './history-filter-bar';
import { HistoryList } from './history-list';
import {
	countHistoryByFilter,
	type HistoryFilter,
} from './model/history-timeline';

const outlineButtonClass = `${panelButtonSmClass} gap-1.5 border-white/12 bg-white/[0.03] text-text-primary hover:bg-white/[0.07]`;

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
	const isMobile = useIsMobile();
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

	const isEmpty = historyMeta.length === 0 && !isLoading;

	return (
		<Panel
			// Docked beside the map so "Focus on canvas" can be watched; on a phone the
			// panel covers the screen, so it is a modal and Focus closes it first.
			variant={isMobile ? 'modal' : 'docked'}
			bodyClassName='flex flex-col px-3 pt-3 pb-4'
			data-testid='history-panel'
			onOpenChange={(open) => setPopoverOpen({ history: open })}
			open={popoverOpen.history}
			subtitle={mapTitle}
			title='History'
			headerActions={
				isProUser ? (
					<Button
						className={outlineButtonClass}
						onClick={() => createSnapshot('Manual Checkpoint', true)}
						title='Save a checkpoint of the current map'
						type='button'
						variant='outline'
					>
						<Flag className='size-3.5' />
						Checkpoint
					</Button>
				) : null
			}
			subbar={
				isEmpty ? undefined : (
					<HistoryFilterBar
						counts={countHistoryByFilter(historyMeta)}
						onChange={setFilter}
						value={filter}
					/>
				)
			}
			footer={
				<>
					<PanelFooterNote>Latest changes first</PanelFooterNote>

					{hasMore && (
						<PanelFooterActions>
							<Button
								className={outlineButtonClass}
								disabled={!mapId || isLoading}
								onClick={() => mapId && loadMoreHistory(mapId)}
								type='button'
								variant='outline'
							>
								{isLoading && <Loader2 className='size-3.5 animate-spin' />}
								Load older
							</Button>
						</PanelFooterActions>
					)}
				</>
			}
		>
			{isEmpty ? <HistoryEmptyState /> : <HistoryList filter={filter} />}
		</Panel>
	);
}
