'use client';

import {
	collapseAllGroups,
	expandAllGroups,
	groupHistoryItems,
	toggleGroupExpansion,
	type HistoryGroupOrItem,
	type HistoryItemWithMeta,
} from '@/helpers/history/grouping-utils';
import useAppStore from '@/store/mind-map-store';
import { motion } from 'motion/react';
import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { HistoryGroup } from './history-group';
import { HistoryItem } from './history-item';
import { HistoryItemSkeleton } from './history-item-skeleton';

export interface HistoryListHandle {
	expandAllGroups: () => void;
	collapseAllGroups: () => void;
}

export const HistoryList = forwardRef<HistoryListHandle>((props, ref) => {
	const isLoading = useAppStore((s) => s.loadingStates?.isStateLoading);
	const historyMeta = useAppStore((s) => s.historyMeta);
	const history = useAppStore((s) => s.history);
	const historyIndex = useAppStore((s) => s.historyIndex);
	const mapId = useAppStore((s) => s.mapId);
	const loadMoreHistory = useAppStore((s) => s.loadMoreHistory);
	const hasMore = useAppStore((s) => s.historyHasMore);

	// Local state for group expansion
	const [groupedItems, setGroupedItems] = useState<HistoryGroupOrItem[]>([]);

	// Compute grouped items from history metadata
	const items: HistoryItemWithMeta[] = useMemo(() => {
		const reversed = [...historyMeta].reverse();
		return reversed.map((meta, idx) => {
			const originalIndex = historyMeta.length - 1 - idx;
			const historyEntry = history[originalIndex] as any;
			const delta = historyEntry?._delta;

			return {
				meta,
				originalIndex,
				isCurrent: originalIndex === historyIndex,
				delta,
			};
		});
	}, [historyMeta, history, historyIndex]);

	// Group items whenever the source data changes
	useMemo(() => {
		const grouped = groupHistoryItems(items);
		setGroupedItems(grouped);
	}, [items]);

	const handleToggleGroup = (groupId: string) => {
		setGroupedItems((prev) => toggleGroupExpansion(prev, groupId));
	};

	const handleExpandAll = () => {
		setGroupedItems((prev) => expandAllGroups(prev));
	};

	const handleCollapseAll = () => {
		setGroupedItems((prev) => collapseAllGroups(prev));
	};

	// Expose methods to parent via ref
	useImperativeHandle(ref, () => ({
		expandAllGroups: handleExpandAll,
		collapseAllGroups: handleCollapseAll,
	}));

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
		<motion.div className='flex-grow flex flex-col gap-1'>
			{/* Load more (older) at top since list shows newest at top */}
			{hasMore && (
				<div className='mb-2 flex justify-center'>
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

			{/* Render grouped and ungrouped items */}
			{groupedItems.map((item, idx) => {
				if (item.type === 'group') {
					return (
						<HistoryGroup
							group={item}
							key={item.id}
							onToggle={() => handleToggleGroup(item.id)}
						/>
					);
				} else {
					return (
						<HistoryItem
							isCurrent={item.item.isCurrent}
							key={item.item.meta.id}
							meta={item.item.meta}
							originalIndex={item.item.originalIndex}
						/>
					);
				}
			})}
		</motion.div>
	);
});

export default HistoryList;
HistoryList.displayName = 'HistoryList';
