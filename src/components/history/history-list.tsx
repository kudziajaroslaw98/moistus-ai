'use client';

import useAppStore from '@/store/mind-map-store';
import type { HistoryItem as HistoryMeta } from '@/types/history-state';
import { motion } from 'motion/react';
import { useMemo } from 'react';
import { Button } from '../ui/button';
import { HistoryItem } from './history-item';
import { HistoryItemSkeleton } from './history-item-skeleton';

interface HistoryTimelineItem {
	meta: HistoryMeta;
	originalIndex: number;
	isCurrent: boolean;
}

export function HistoryList() {
	const isLoading = useAppStore((s) => s.loadingStates?.isHistoryLoading);
	const historyMeta = useAppStore((s) => s.historyMeta);
	const historyIndex = useAppStore((s) => s.historyIndex);
	const mapId = useAppStore((s) => s.mapId);
	const loadMoreHistory = useAppStore((s) => s.loadMoreHistory);
	const hasMore = useAppStore((s) => s.historyHasMore);

	// Compute timeline items from history metadata (DB-only, no in-memory history)
	const items: HistoryTimelineItem[] = useMemo(() => {
		const reversed = [...historyMeta].reverse();
		return reversed.map((meta, idx) => {
			const originalIndex = historyMeta.length - 1 - idx;
			// Delta will be fetched on-demand when expanding history item
			return {
				meta,
				originalIndex,
				isCurrent: originalIndex === historyIndex,
			};
		});
	}, [historyMeta, historyIndex]);

	if (isLoading) {
		return (
			<div className='flex flex-col gap-2'>
				{Array.from({ length: 5 }).map((_, i) => (
					<HistoryItemSkeleton key={i} />
				))}
			</div>
		);
	}

	return (
		<motion.div className='relative flex-grow'>
			{items.length > 0 && (
				<div className='px-4 pb-1 text-[10px] font-semibold tracking-[0.12em] text-primary-300 uppercase sm:px-0'>
					Current
				</div>
			)}

			<div className='flex flex-col gap-2'>
				{/* Load more (older) at top since list shows newest at top */}
				{hasMore && (
					<div className='mb-2 flex justify-center px-4 sm:px-0'>
						<Button
							disabled={!mapId}
							onClick={() => mapId && loadMoreHistory(mapId)}
							size='sm'
							variant='outline'
						>
							Load older
						</Button>
					</div>
				)}

				{/* Render timeline items */}
				{items.map((item) => (
					<div className='relative' key={item.meta.id}>
						<HistoryItem
							isCurrent={item.isCurrent}
							meta={item.meta}
							originalIndex={item.originalIndex}
						/>
					</div>
				))}
			</div>
		</motion.div>
	);
}

export default HistoryList;
