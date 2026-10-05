'use client';

import { buildHistoryPresentation } from '@/helpers/history/presentation';
import { formatTimestamp } from '@/helpers/history/time-utils';
import useAppStore from '@/store/mind-map-store';
import type { HistoryItem as HistoryMeta } from '@/types/history-state';
import { LocateFixed, Undo2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { DiffView } from './diff-view';
import { HistoryRevertConfirm } from './history-revert-confirm';
import { HistoryRow } from './history-row';
import { useHistoryDelta } from './hooks/use-history-delta';
import { useHistoryFocusController } from './hooks/use-history-focus-controller';
import { toHistoryEntryViewModel } from './model/history-entry-view-model';
import {
	buildHistoryRowSubject,
	buildHistoryRowTitle,
	countChangesUndoneByRevert,
	formatHistoryRowTime,
	type NodeLabelResolver,
} from './model/history-timeline';

interface Props {
	meta: HistoryMeta;
	originalIndex: number;
	isCurrent: boolean;
	/** Clock for relative times; the list passes a shared minute tick. */
	now?: number;
	resolveNodeLabel?: NodeLabelResolver;
	/**
	 * Inside an expanded group the group row already names the action, so a
	 * child is titled by what differs: its fields or its subject.
	 */
	nestedTitle?: 'fields' | 'subject';
}

export function HistoryItem({
	meta,
	originalIndex,
	isCurrent,
	now,
	resolveNodeLabel,
	nestedTitle,
}: Props) {
	const {
		isLoading,
		isReverting,
		revertingIndex,
		revertToHistoryState,
		canRevertChange,
		currentUser,
		mapId,
		historyIndex,
	} = useAppStore(
		useShallow((state) => ({
			isLoading: state.loadingStates?.isHistoryLoading,
			isReverting: state.isReverting,
			revertingIndex: state.revertingIndex,
			revertToHistoryState: state.revertToHistoryState,
			canRevertChange: state.canRevertChange,
			currentUser: state.currentUser,
			mapId: state.mapId,
			historyIndex: state.historyIndex,
		}))
	);
	const { nodes, edges, handleFocusTarget } = useHistoryFocusController();
	const {
		isExpanded,
		cachedDelta,
		isFetchingDelta,
		fetchError,
		handleToggleExpand,
	} = useHistoryDelta(meta, mapId);
	const [isConfirmingRevert, setIsConfirmingRevert] = useState(false);
	const [mountedAt] = useState(() => Date.now());

	const presentation = useMemo(
		() =>
			cachedDelta
				? buildHistoryPresentation(cachedDelta, {
						actionName: cachedDelta.actionName || meta.actionName,
						nodes,
						edges,
					})
				: null,
		[cachedDelta, edges, meta.actionName, nodes]
	);

	const viewModel = toHistoryEntryViewModel({
		meta,
		delta: cachedDelta,
		presentation,
		currentUserId: currentUser?.id,
	});

	const subject = buildHistoryRowSubject(meta, resolveNodeLabel);
	const title = nestedTitle
		? nestedRowTitle(meta, nestedTitle, subject)
		: buildHistoryRowTitle(meta);

	const hasPermission = canRevertChange(cachedDelta ?? undefined);
	const canShowDiff = meta.type === 'event' || !!cachedDelta;
	const isThisReverting = revertingIndex === originalIndex;
	const revertBlocked = Boolean(isLoading || isReverting);
	const focusTarget = viewModel.mobileFocusTarget;
	const author =
		viewModel.userDisplay && viewModel.userDisplay !== 'You'
			? viewModel.userDisplay
			: null;

	const requestRevert = () => {
		if (!revertBlocked && hasPermission) setIsConfirmingRevert(true);
	};

	const confirmRevert = async () => {
		if (revertBlocked) return;
		await revertToHistoryState(originalIndex);
		setIsConfirmingRevert(false);
	};

	return (
		<HistoryRow
			author={author}
			canExpand={canShowDiff}
			focusLabel={viewModel.mobileFocusLabel}
			focusTarget={focusTarget}
			isCurrent={isCurrent}
			isExpanded={isExpanded}
			meta={meta}
			onFocusTarget={handleFocusTarget}
			onToggleExpand={handleToggleExpand}
			subject={nestedTitle ? null : subject}
			time={formatHistoryRowTime(meta.timestamp, now ?? mountedAt)}
			timeTooltip={formatTimestamp(meta.timestamp).tooltip}
			title={title}
			variant={nestedTitle ? 'nested' : 'row'}
			footer={
				isConfirmingRevert && !isCurrent ? (
					<HistoryRevertConfirm
						isReverting={isThisReverting}
						onCancel={() => setIsConfirmingRevert(false)}
						onConfirm={confirmRevert}
						undoneCount={countChangesUndoneByRevert(
							originalIndex,
							historyIndex
						)}
					/>
				) : null
			}
			revert={
				isCurrent
					? null
					: {
							hasPermission,
							disabled: revertBlocked || isConfirmingRevert,
							onRequest: requestRevert,
						}
			}
		>
			<DiffView
				delta={cachedDelta}
				error={fetchError}
				isLoading={isFetchingDelta}
				onFocusTarget={handleFocusTarget}
				presentation={presentation}
				footer={
					focusTarget || !isCurrent ? (
						<>
							{focusTarget ? (
								<button
									className='inline-flex h-8 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2.5 text-[13px] text-white/80 transition-colors duration-200 ease hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60'
									onClick={() => handleFocusTarget(focusTarget)}
									type='button'
								>
									<LocateFixed className='h-3.5 w-3.5' />
									Focus on canvas
								</button>
							) : (
								<span />
							)}

							{!isCurrent && (
								<button
									className='inline-flex h-8 items-center gap-1.5 rounded-md border border-amber-400/30 px-2.5 text-[13px] text-amber-200 transition-colors duration-200 ease hover:bg-amber-500/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 disabled:cursor-not-allowed disabled:opacity-40'
									onClick={requestRevert}
									type='button'
									disabled={
										revertBlocked || !hasPermission || isConfirmingRevert
									}
									title={
										hasPermission
											? 'Restore map to this point'
											: 'You do not have permission to revert this change'
									}
								>
									<Undo2 className='h-3.5 w-3.5' />
									Revert…
								</button>
							)}
						</>
					) : null
				}
			/>
		</HistoryRow>
	);
}

function nestedRowTitle(
	meta: HistoryMeta,
	mode: 'fields' | 'subject',
	subject: ReturnType<typeof buildHistoryRowSubject>
): string {
	if (mode === 'fields' && meta.fieldLabels && meta.fieldLabels.length > 0) {
		return meta.fieldLabels.join(', ');
	}
	if (subject) {
		const more = subject.moreCount > 0 ? ` +${subject.moreCount}` : '';
		return `${subject.typeLabel} ${subject.names.join(', ')}${more}`.trim();
	}
	return buildHistoryRowTitle(meta);
}
