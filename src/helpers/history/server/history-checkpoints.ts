import type { HistoryAdminClient } from './history-client-types';

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
	snapshot_id: string;
	snapshot_index: number;
	node_count: number;
	edge_count: number;
	pruned_snapshot_count: number;
}

export async function createHistoryCheckpoint({
	adminClient,
	mapId,
	userId,
	actionName = 'Manual Checkpoint',
	isMajor = true,
	prunePrevious = true,
}: CreateHistoryCheckpointInput): Promise<CreatedHistoryCheckpoint> {
	if (!prunePrevious) {
		throw new Error('Checkpoint RPC always prunes previous history');
	}

	const { data, error } = await adminClient.rpc(
		'create_history_checkpoint_and_prune',
		{
			p_map_id: mapId,
			p_user_id: userId,
			p_action_name: actionName,
			p_is_major: isMajor,
		}
	);

	if (error) {
		throw new Error(
			`Failed to create checkpoint transaction: ${error.message}`
		);
	}

	const row = Array.isArray(data)
		? (data[0] as SnapshotPointerRow | undefined)
		: (data as SnapshotPointerRow | null);

	if (!row?.snapshot_id) {
		throw new Error('Checkpoint RPC did not return snapshot metadata');
	}

	return {
		snapshotId: row.snapshot_id,
		snapshotIndex: row.snapshot_index,
		nodeCount: row.node_count,
		edgeCount: row.edge_count,
		prunedSnapshotCount: row.pruned_snapshot_count,
	};
}
