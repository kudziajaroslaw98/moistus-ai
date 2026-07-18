export interface HistoryCurrentPointer {
	snapshot_id?: string | null;
	event_id?: string | null;
}

export interface HistorySnapshotPointer {
	id: string;
	snapshot_index?: number | null;
	created_at?: string | null;
}

export interface HistoryEventPointer {
	id: string;
	snapshot_id: string;
	event_index?: number | null;
	created_at?: string | null;
}

export function resolveCurrentSnapshotId(
	current: HistoryCurrentPointer | null | undefined,
	latestSnapshot: HistorySnapshotPointer | null | undefined
): string | null {
	return current?.snapshot_id ?? latestSnapshot?.id ?? null;
}

export function isInCurrentCheckpointScope(
	snapshotId: string | null | undefined,
	currentSnapshotId: string | null | undefined
): boolean {
	return Boolean(snapshotId && currentSnapshotId && snapshotId === currentSnapshotId);
}

export function getPagedCurrentCheckpointEvents<T extends HistoryEventPointer>(
	events: T[],
	offset: number,
	limit: number
): {
	events: T[];
	nextOffset: number;
	hasMore: boolean;
	totalEvents: number;
} {
	const safeOffset = Math.max(0, offset);
	const safeLimit = Math.max(0, limit);
	const page = events.slice(safeOffset, safeOffset + safeLimit);
	const nextOffset = safeOffset + page.length;

	return {
		events: page,
		nextOffset,
		hasMore: nextOffset < events.length,
		totalEvents: events.length,
	};
}
