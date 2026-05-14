import {
	buildHistoryPresentation,
	deriveHistorySubjectHints,
	normalizeHistoryDelta,
} from '@/helpers/history/presentation';
import type { HistoryDbItem, HistoryItem } from '@/types/history-state';

export interface HistorySnapshotListRow {
	id: string;
	snapshot_index: number;
	action_name: string;
	node_count: number;
	edge_count: number;
	is_major: boolean;
	created_at: string;
	user_id?: string | null;
}

export interface UserProfileRow {
	user_id: string;
	display_name: string | null;
	avatar_url: string | null;
}

export function collectHistoryUserIds(
	snapshots: HistorySnapshotListRow[],
	events: HistoryDbItem[]
): string[] {
	return Array.from(
		new Set(
			[
				...snapshots.map((snapshot) => snapshot.user_id),
				...events.map((event) => event.user_id),
			].filter((id): id is string => typeof id === 'string' && id.length > 0)
		)
	);
}

export function buildProfileMap(profiles: UserProfileRow[]): Map<string, UserProfileRow> {
	return new Map(profiles.map((profile) => [profile.user_id, profile]));
}

function attributionFor(
	profileMap: Map<string, UserProfileRow>,
	userId?: string | null
) {
	if (!userId) return {};
	const profile = profileMap.get(userId);
	return {
		userId,
		userName: profile?.display_name || 'Unknown',
		userAvatar: profile?.avatar_url || undefined,
	};
}

export function buildHistoryListItems({
	snapshots,
	events,
	profileMap,
}: {
	snapshots: HistorySnapshotListRow[];
	events: HistoryDbItem[];
	profileMap: Map<string, UserProfileRow>;
}): HistoryItem[] {
	const snapshotItems: HistoryItem[] = snapshots.map((snapshot) => ({
		id: snapshot.id,
		type: 'snapshot',
		snapshotIndex: snapshot.snapshot_index,
		actionName: snapshot.action_name,
		nodeCount: snapshot.node_count,
		edgeCount: snapshot.edge_count,
		isMajor: snapshot.is_major,
		timestamp: new Date(snapshot.created_at).getTime(),
		...attributionFor(profileMap, snapshot.user_id),
	}));

	const eventItems: HistoryItem[] = events.map((event) => {
		const storedDelta = normalizeHistoryDelta(event.changes, {
			operation: event.operation_type,
			entityType: event.entity_type,
		});
		const presentation = storedDelta
			? buildHistoryPresentation(storedDelta, { actionName: event.action_name })
			: null;

		return {
			id: event.id,
			type: 'event',
			snapshotId: event.snapshot_id,
			eventIndex: event.event_index,
			actionName: event.action_name,
			operationType: event.operation_type,
			entityType: event.entity_type,
			timestamp: new Date(event.created_at).getTime(),
			summary: presentation?.summary,
			summaryDetail: presentation?.summaryDetail,
			subjects: storedDelta
				? storedDelta.subjectHints || deriveHistorySubjectHints(storedDelta)
				: undefined,
			...attributionFor(profileMap, event.user_id),
		};
	});

	return [...snapshotItems, ...eventItems].sort(
		(a, b) => b.timestamp - a.timestamp
	);
}
