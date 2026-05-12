import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type { EdgeData } from '@/types/edge-data';
import type { NodeData } from '@/types/node-data';
import { getRenderableEdgeType } from '@/helpers/route-auto-waypoint-edges';
import type { HistoryAdminClient } from './history-client-types';

export interface CurrentNodeRow {
	id: string;
	map_id: string;
	user_id: string;
	content: string | null;
	position_x: number | null;
	position_y: number | null;
	width: number | null;
	height: number | null;
	node_type: NodeData['node_type'] | null;
	metadata: NodeData['metadata'] | null;
	aiData: NodeData['aiData'] | null;
	parent_id: string | null;
	created_at: string;
	updated_at: string;
}

export interface CurrentEdgeRow {
	id: string;
	map_id: string;
	user_id: string;
	source: string;
	target: string;
	label: string | null;
	type: string | null;
	animated: boolean | null;
	style: EdgeData['style'] | null;
	markerEnd: string | null;
	markerStart: string | null;
	metadata: EdgeData['metadata'] | null;
	aiData: EdgeData['aiData'] | null;
	created_at: string | null;
	updated_at: string | null;
}

export interface CurrentGraphState {
	nodes: AppNode[];
	edges: AppEdge[];
}

const NODE_SELECT =
	'id, map_id, user_id, content, position_x, position_y, width, height, node_type, metadata, aiData, parent_id, created_at, updated_at';

const EDGE_SELECT =
	'id, map_id, user_id, source, target, label, type, animated, style, markerEnd, markerStart, metadata, aiData, created_at, updated_at';

function toNumber(value: number | null | undefined): number {
	return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function nodeRowToSnapshotNode(row: CurrentNodeRow): AppNode {
	const position = {
		x: toNumber(row.position_x),
		y: toNumber(row.position_y),
	};
	const nodeType = row.node_type || 'defaultNode';
	const data: NodeData = {
		...row,
		content: row.content ?? '',
		position_x: position.x,
		position_y: position.y,
		node_type: nodeType,
		width: row.width ?? null,
		height: row.height ?? null,
		parent_id: row.parent_id ?? null,
		metadata: row.metadata ?? {},
		aiData: row.aiData ?? {},
	};

	const node = {
		id: row.id,
		position,
		type: nodeType,
		data,
		...(row.parent_id
			? { parentNode: row.parent_id, parentId: row.parent_id }
			: {}),
	} as AppNode;

	if (typeof row.width === 'number') node.width = row.width;
	if (typeof row.height === 'number') node.height = row.height;

	return node;
}

export function edgeRowToSnapshotEdge(row: CurrentEdgeRow): AppEdge {
	const metadata = {
		...(row.metadata ?? {}),
		pathType: row.metadata?.pathType ?? 'waypoint',
	};
	const data: EdgeData = {
		...row,
		label: row.label ?? null,
		type: row.type ?? undefined,
		animated: row.animated ?? false,
		style: row.style ?? null,
		markerEnd: row.markerEnd ?? undefined,
		markerStart: row.markerStart ?? undefined,
		metadata,
		aiData: row.aiData ?? {},
		created_at: row.created_at ?? undefined,
		updated_at: row.updated_at ?? undefined,
	};

	return {
		id: row.id,
		source: row.source,
		target: row.target,
		type: row.type ?? getRenderableEdgeType(data),
		label: row.label ?? undefined,
		animated: row.animated ?? false,
		style: row.style ?? undefined,
		markerEnd: row.markerEnd ?? undefined,
		markerStart: row.markerStart ?? undefined,
		data,
	};
}

export async function readCurrentGraphState(
	adminClient: HistoryAdminClient,
	mapId: string
): Promise<CurrentGraphState> {
	const [nodesResult, edgesResult] = await Promise.all([
		adminClient.from('nodes').select(NODE_SELECT).eq('map_id', mapId),
		adminClient.from('edges').select(EDGE_SELECT).eq('map_id', mapId),
	]);

	if (nodesResult.error) {
		throw new Error(`Failed to read current nodes: ${nodesResult.error.message}`);
	}
	if (edgesResult.error) {
		throw new Error(`Failed to read current edges: ${edgesResult.error.message}`);
	}

	const nodes = ((nodesResult.data ?? []) as CurrentNodeRow[]).map(
		nodeRowToSnapshotNode
	);
	const edges = ((edgesResult.data ?? []) as CurrentEdgeRow[]).map(
		edgeRowToSnapshotEdge
	);

	return { nodes, edges };
}
