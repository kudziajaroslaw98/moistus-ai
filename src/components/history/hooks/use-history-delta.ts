'use client';

import type {
	AttributedHistoryDelta,
	HistoryItem as HistoryMeta,
} from '@/types/history-state';
import { useCallback, useState } from 'react';

export function useHistoryDelta(meta: HistoryMeta, mapId?: string | null) {
	const [isExpanded, setIsExpanded] = useState(false);
	const [cachedDelta, setCachedDelta] = useState<AttributedHistoryDelta | null>(
		null
	);
	const [isFetchingDelta, setIsFetchingDelta] = useState(false);
	const [fetchError, setFetchError] = useState<string | null>(null);

	const handleToggleExpand = useCallback(async () => {
		const newExpandedState = !isExpanded;
		setIsExpanded(newExpandedState);

		if (
			!newExpandedState ||
			cachedDelta ||
			meta.type !== 'event' ||
			!mapId
		) {
			return;
		}

		setIsFetchingDelta(true);
		setFetchError(null);

		try {
			const response = await fetch(`/api/history/${mapId}/delta/${meta.id}`);
			if (!response.ok) {
				throw new Error('Failed to fetch change details');
			}
			const data = await response.json();

			setCachedDelta({
				operation: data.operation,
				entityType: data.entityType,
				changes: data.changes,
				userId: data.userId || 'unknown',
				userName: data.userName || 'Unknown',
				userAvatar: data.userAvatar,
				actionName: data.actionName || meta.actionName,
				timestamp: data.timestamp || meta.timestamp,
				summary: data.summary,
				summaryDetail: data.summaryDetail,
				subjectHints: data.subjectHints,
			});
		} catch (error) {
			console.error('Failed to fetch delta:', error);
			setFetchError(error instanceof Error ? error.message : 'Unknown error');
		} finally {
			setIsFetchingDelta(false);
		}
	}, [cachedDelta, isExpanded, mapId, meta]);

	return {
		isExpanded,
		cachedDelta,
		isFetchingDelta,
		fetchError,
		handleToggleExpand,
	};
}
