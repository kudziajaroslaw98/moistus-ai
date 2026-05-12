import type { HistoryAdminClient } from './history-client-types';
import { readCurrentGraphState } from './history-graph-state';

export interface CreateHistoryCheckpointInput {
	adminClient: HistoryAdminClient;
	mapId: string;
	userId: string;
	actionName?: string;
	isMajor?: boolean;
	prunePrevious?: boolean;
}

export interface CreatedHistoryCheckpoint {
	snapshotId: string;
	snapshotIndex: number;
	nodeCount: number;
	edgeCount: number;
	prunedSnapshotCount: number;
}

interface SnapshotPointerRow {
	id: string;
	snapshot_index: number | null;
}

export async function createHistoryCheckpoint({
	adminClient,
	mapId,
	userId,
	actionName = 'Manual Checkpoint',
	isMajor = true,
	prunePrevious = true,
}: CreateHistoryCheckpointInput): Promise<CreatedHistoryCheckpoint> {
	const { nodes, edges } = await readCurrentGraphState(adminClient, mapId);

	const { data: oldSnapshots, error: snapshotsError } = await adminClient
		.from('map_history_snapshots')
		.select('id, snapshot_index')
		.eq('map_id', mapId)
		.order('snapshot_index', { ascending: false });

	if (snapshotsError) {
		throw new Error(`Failed to read existing snapshots: ${snapshotsError.message}`);
	}

	const existingSnapshots = (oldSnapshots ?? []) as SnapshotPointerRow[];
	const previousMaxIndex = existingSnapshots.reduce((max, snapshot) => {
		const index =
			typeof snapshot.snapshot_index === 'number'
				? snapshot.snapshot_index
				: -1;
		return Math.max(max, index);
	}, -1);

	const { data: inserted, error: insertError } = await adminClient
		.from('map_history_snapshots')
		.insert({
			map_id: mapId,
			user_id: userId,
			snapshot_index: previousMaxIndex + 1,
			action_name: actionName,
			nodes,
			edges,
			node_count: nodes.length,
			edge_count: edges.length,
			is_major: isMajor,
		})
		.select('id, snapshot_index')
		.single();

	if (insertError || !inserted) {
		throw new Error(
			`Failed to create checkpoint: ${insertError?.message ?? 'No row returned'}`
		);
	}

	const { error: pointerError } = await adminClient.from('map_history_current').upsert(
		{
			map_id: mapId,
			snapshot_id: inserted.id,
			event_id: null,
			updated_by: userId,
			updated_at: new Date().toISOString(),
		},
		{ onConflict: 'map_id' }
	);

	if (pointerError) {
		throw new Error(`Failed to update current pointer: ${pointerError.message}`);
	}

	const oldSnapshotIds = existingSnapshots
		.map((snapshot) => snapshot.id)
		.filter((id) => id !== inserted.id);

	if (prunePrevious && oldSnapshotIds.length > 0) {
		const { error: eventsDeleteError } = await adminClient
			.from('map_history_events')
			.delete()
			.eq('map_id', mapId)
			.in('snapshot_id', oldSnapshotIds);

		if (eventsDeleteError) {
			throw new Error(
				`Failed to prune old history events: ${eventsDeleteError.message}`
			);
		}

		const { error: snapshotsDeleteError } = await adminClient
			.from('map_history_snapshots')
			.delete()
			.eq('map_id', mapId)
			.in('id', oldSnapshotIds);

		if (snapshotsDeleteError) {
			throw new Error(
				`Failed to prune old history snapshots: ${snapshotsDeleteError.message}`
			);
		}
	}

	return {
		snapshotId: inserted.id,
		snapshotIndex:
			typeof inserted.snapshot_index === 'number'
				? inserted.snapshot_index
				: previousMaxIndex + 1,
		nodeCount: nodes.length,
		edgeCount: edges.length,
		prunedSnapshotCount: prunePrevious ? oldSnapshotIds.length : 0,
	};
}
