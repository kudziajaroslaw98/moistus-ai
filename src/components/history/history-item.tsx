'use client';

import {
	buildHistoryPresentation,
	normalizeHistoryActionIntent,
} from '@/helpers/history/presentation';
import useAppStore from '@/store/mind-map-store';
import type { HistoryItem as HistoryMeta } from '@/types/history-state';
import { useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import { HistoryEntryCard } from './history-entry-card';
import { useHistoryDelta } from './hooks/use-history-delta';
import { useHistoryFocusController } from './hooks/use-history-focus-controller';
import { toHistoryEntryViewModel } from './model/history-entry-view-model';

interface Props {
	meta: HistoryMeta;
	originalIndex: number;
	isCurrent: boolean;
}

export function HistoryItem({ meta, originalIndex, isCurrent }: Props) {
	const {
		isLoading,
		isReverting,
		revertingIndex,
		revertToHistoryState,
		canRevertChange,
		currentUser,
		mapId,
	} = useAppStore(
		useShallow((state) => ({
			isLoading: state.loadingStates?.isHistoryLoading,
			isReverting: state.isReverting,
			revertingIndex: state.revertingIndex,
			revertToHistoryState: state.revertToHistoryState,
			canRevertChange: state.canRevertChange,
			currentUser: state.currentUser,
			mapId: state.mapId,
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

	const viewModel = useMemo(
		() =>
			toHistoryEntryViewModel({
				meta,
				delta: cachedDelta,
				presentation,
				currentUserId: currentUser?.id,
			}),
		[cachedDelta, currentUser?.id, meta, presentation]
	);

	const hasPermission = canRevertChange(cachedDelta ?? undefined);
	const canShowDiff = meta.type === 'event' || !!cachedDelta;
	const isThisReverting = revertingIndex === originalIndex;
	const actionIntent = normalizeHistoryActionIntent(meta.actionName);

	const handleRevert = () => {
		if (!isLoading && !isReverting) revertToHistoryState(originalIndex);
	};

	return (
		<HistoryEntryCard
			actionIntent={actionIntent}
			canShowDiff={canShowDiff}
			delta={cachedDelta}
			deltaError={fetchError}
			hasAttribution={viewModel.hasAttribution}
			hasPermission={hasPermission}
			headline={viewModel.headline}
			headlineDetail={viewModel.headlineDetail}
			inlineSubject={viewModel.inlineSubject}
			isCurrent={isCurrent}
			isExpanded={isExpanded}
			isFetchingDelta={isFetchingDelta}
			isLoading={isLoading}
			isReverting={isReverting}
			isThisReverting={isThisReverting}
			meta={meta}
			mobileFocusLabel={viewModel.mobileFocusLabel}
			mobileFocusTarget={viewModel.mobileFocusTarget}
			onFocusTarget={handleFocusTarget}
			onRevert={handleRevert}
			onToggleExpand={handleToggleExpand}
			presentation={presentation}
			subjectPreview={viewModel.subjectPreview}
			timestamp={viewModel.timestamp}
			userDisplay={viewModel.userDisplay}
		/>
	);
}
