'use client';

import { formatTimestamp } from '@/helpers/history/time-utils';
import { useState } from 'react';
import { HistoryItem } from './history-item';
import { HistoryRow } from './history-row';
import { useHistoryFocusController } from './hooks/use-history-focus-controller';
import { toHistoryEntryViewModel } from './model/history-entry-view-model';
import {
	buildHistoryRowSubject,
	buildHistoryRowTitle,
	formatHistoryRowTime,
	type HistoryTimelineEntry,
	type NodeLabelResolver,
} from './model/history-timeline';

interface HistoryRowGroupProps {
	/** Newest first; at least two entries sharing a title and fields. */
	entries: HistoryTimelineEntry[];
	now: number;
	resolveNodeLabel?: NodeLabelResolver;
}

/**
 * Collapsed run of identical changes ("Resized group ×2"). Expanding shows
 * each change on a dot rail; restore lives on the individual children because
 * a group has no single point to restore to.
 */
export function HistoryRowGroup({
	entries,
	now,
	resolveNodeLabel,
}: HistoryRowGroupProps) {
	const [isExpanded, setIsExpanded] = useState(false);
	const { handleFocusTarget } = useHistoryFocusController();
	const newest = entries[0];
	const oldest = entries[entries.length - 1];

	const subjectIds = new Set(
		entries.map((entry) =>
			(entry.meta.subjects ?? []).map((subject) => subject.id).join(',')
		)
	);
	const sameSubject = subjectIds.size === 1;
	// One subject changed repeatedly: describe it. Several subjects: list the
	// distinct ones from the whole run.
	const subject = sameSubject
		? buildHistoryRowSubject(newest.meta, resolveNodeLabel)
		: buildHistoryRowSubject(
				{
					...newest.meta,
					subjects: dedupeSubjects(entries),
				},
				resolveNodeLabel
			);
	const focusModel = toHistoryEntryViewModel({
		meta: newest.meta,
		delta: null,
		presentation: null,
	});

	return (
		<HistoryRow
			canExpand
			count={entries.length}
			focusLabel={focusModel.mobileFocusLabel}
			focusTarget={focusModel.mobileFocusTarget}
			isCurrent={false}
			isExpanded={isExpanded}
			meta={newest.meta}
			onFocusTarget={handleFocusTarget}
			onToggleExpand={() => setIsExpanded((value) => !value)}
			subject={subject}
			time={formatHistoryRowTime(newest.meta.timestamp, now)}
			timeTooltip={`${formatTimestamp(oldest.meta.timestamp).tooltip} – ${formatTimestamp(newest.meta.timestamp).tooltip}`}
			title={buildHistoryRowTitle(newest.meta)}
		>
			{/* Rail sits under the parent icon; child dots (14px in) land on it. */}
			<div className='relative -ml-[2.625rem] flex flex-col gap-0.5 before:absolute before:bottom-4 before:left-[13.5px] before:top-4 before:w-px before:bg-white/10'>
				{entries.map((entry) => (
					<HistoryItem
						isCurrent={entry.isCurrent}
						key={entry.meta.id}
						meta={entry.meta}
						nestedTitle={sameSubject ? 'fields' : 'subject'}
						now={now}
						originalIndex={entry.originalIndex}
						resolveNodeLabel={resolveNodeLabel}
					/>
				))}
			</div>
		</HistoryRow>
	);
}

function dedupeSubjects(entries: HistoryTimelineEntry[]) {
	const seen = new Map<
		string,
		NonNullable<HistoryTimelineEntry['meta']['subjects']>[number]
	>();
	for (const entry of entries) {
		for (const subject of entry.meta.subjects ?? []) {
			const key = `${subject.type}:${subject.id}`;
			if (!seen.has(key)) seen.set(key, subject);
		}
	}
	return [...seen.values()];
}
