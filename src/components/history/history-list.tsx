'use client';

import { getNodeOutlineText } from '@/helpers/collapse/branch-index';
import useAppStore from '@/store/mind-map-store';
import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { HistoryEmptyState } from './history-empty-state';
import { HistoryItem } from './history-item';
import { HistoryItemSkeleton } from './history-item-skeleton';
import { HistoryRowGroup } from './history-row-group';
import {
	buildHistoryTimeline,
	type HistoryFilter,
} from './model/history-timeline';

const FILTER_EMPTY_COPY: Record<HistoryFilter, string> = {
	all: 'No changes',
	edits: 'No edits',
	added: 'No added nodes',
	removed: 'No removed nodes',
	links: 'No connection changes',
};

/** Re-render relative times ("8 min ago") once a minute. */
function useMinuteClock(): number {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const id = window.setInterval(() => setNow(Date.now()), 60_000);
		return () => window.clearInterval(id);
	}, []);
	return now;
}

interface HistoryListProps {
	filter: HistoryFilter;
}

export function HistoryList({ filter }: HistoryListProps) {
	const isLoading = useAppStore((s) => s.loadingStates?.isHistoryLoading);
	const historyMeta = useAppStore((s) => s.historyMeta);
	const historyIndex = useAppStore((s) => s.historyIndex);
	const hasMore = useAppStore((s) => s.historyHasMore);
	// Shallow-compared id → label map: stays stable while nodes are dragged.
	const nodeLabels = useAppStore(
		useShallow((s) => {
			const labels: Record<string, string> = {};
			for (const node of s.nodes) {
				const text = getNodeOutlineText(node);
				if (text !== 'Untitled') labels[node.id] = text;
			}
			return labels;
		})
	);
	const now = useMinuteClock();

	// Skeletons only on first load; "Load older" keeps the list on screen.
	if (isLoading && historyMeta.length === 0) {
		return (
			<div className='flex flex-col gap-1'>
				{Array.from({ length: 6 }).map((_, i) => (
					<HistoryItemSkeleton key={i} />
				))}
			</div>
		);
	}

	const sections = buildHistoryTimeline(historyMeta, {
		historyIndex,
		filter,
		now,
	});
	const resolveNodeLabel = (nodeId: string) => nodeLabels[nodeId] ?? null;

	if (sections.length === 0) {
		return (
			<HistoryEmptyState
				title={FILTER_EMPTY_COPY[filter]}
				description={
					hasMore
						? 'Nothing in the loaded changes. Load older changes to look further back.'
						: 'Nothing matches this filter yet.'
				}
			/>
		);
	}

	return (
		<div className='flex flex-col gap-4'>
			{sections.map((section) => (
				<section aria-label={section.label} key={section.key}>
					<div className='flex items-center gap-3 px-2.5 pb-1.5'>
						<h3 className='text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55'>
							{section.label}
						</h3>

						<span aria-hidden className='h-px flex-1 bg-white/[0.07]' />

						<span className='text-[12px] text-white/40'>
							{`${section.changeCount} change${section.changeCount === 1 ? '' : 's'}`}
						</span>
					</div>

					<div className='flex flex-col gap-0.5'>
						{section.rows.map((row) =>
							row.kind === 'single' ? (
								<HistoryItem
									isCurrent={row.entry.isCurrent}
									key={row.key}
									meta={row.entry.meta}
									now={now}
									originalIndex={row.entry.originalIndex}
									resolveNodeLabel={resolveNodeLabel}
								/>
							) : (
								<HistoryRowGroup
									entries={row.entries}
									key={row.key}
									now={now}
									resolveNodeLabel={resolveNodeLabel}
								/>
							)
						)}
					</div>
				</section>
			))}
		</div>
	);
}

export default HistoryList;
