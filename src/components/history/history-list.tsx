'use client';

import useAppStore from '@/store/mind-map-store';
import { motion } from 'motion/react';
import { Button } from '../ui/button';
import { HistoryItem } from './history-item';
import { HistoryItemSkeleton } from './history-item-skeleton';

export function HistoryList() {
	const isLoading = useAppStore((s) => s.loadingStates?.isStateLoading);
	const historyMeta = useAppStore((s) => s.historyMeta);
	const historyIndex = useAppStore((s) => s.historyIndex);
	const mapId = useAppStore((s) => s.mapId);
	const loadMoreHistory = useAppStore((s) => s.loadMoreHistory);
	const hasMore = useAppStore((s) => s.historyHasMore);

	if (isLoading) {
		return (
			<div className='flex flex-col gap-2'>
				{Array.from({ length: 5 }).map((_, i) => (
					<HistoryItemSkeleton key={i} />
				))}
			</div>
		);
	}

	const items = [...historyMeta].reverse();

	return (
		<motion.div className='flex-grow flex flex-col gap-1'>
			{/* Load more (older) at top since list shows newest at top */}
			{hasMore && (
				<div className='mb-2 flex justify-center'>
					<Button
						disabled={!mapId}
						size='sm'
						variant='outline'
						onClick={() => mapId && loadMoreHistory(mapId)}
					>
						Load older
					</Button>
				</div>
			)}

			{items.map((item, idx) => {
				const originalIndex = historyMeta.length - 1 - idx;
				const isCurrent = originalIndex === historyIndex;
				return (
					<HistoryItem
						isCurrent={isCurrent}
						key={item.id}
						meta={item}
						originalIndex={originalIndex}
					/>
				);
			})}
		</motion.div>
	);
}
