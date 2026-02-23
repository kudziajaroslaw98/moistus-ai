import { AvailableNodeTypes } from '@/registry/node-registry';
import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type { EdgeData } from '@/types/edge-data';
import type { NodeData } from '@/types/node-data';
import { asNonEmptyString } from '@/lib/realtime/util';

export function toPgReal(value: number): number {
	if (!Number.isFinite(value)) return 0;
	return Math.fround(value);
}

export function getNodeActorId(
	node: AppNode,
	preferredUserId?: string | null
): string {
	const preferred = asNonEmptyString(preferredUserId);
	if (preferred) return preferred;

	const nodeUserId = asNonEmptyString(
		(node.data as Record<string, unknown> | undefined)?.user_id
	);
	if (nodeUserId) return nodeUserId;

	return 'unknown';
}

export function serializeNodeForRealtime(
	node: AppNode,
	mapId: string,
	userId: string
): Record<string, unknown> {
	const nodeData = (node.data ?? {}) as Partial<NodeData>;
	const stableNodeUserId = asNonEmptyString(nodeData.user_id) ?? userId;
	const rawNodeType =
		(node.type as AvailableNodeTypes | undefined) ?? nodeData.node_type;
	const nodeType = (rawNodeType ?? 'defaultNode') as AvailableNodeTypes;

	return {
		...nodeData,
		id: node.id,
		map_id: mapId,
		user_id: stableNodeUserId,
		content: nodeData.content ?? '',
		metadata: nodeData.metadata ?? {},
		aiData: (node.data as Record<string, unknown> | undefined)?.aiData ?? {},
		position_x: toPgReal(node.position.x),
		position_y: toPgReal(node.position.y),
		width: node.width ?? nodeData.width ?? null,
		height: node.height ?? nodeData.height ?? null,
		node_type: nodeType,
		// Always regenerate — Yjs merges by key, so a fresh timestamp ensures the
		// DB upsert detects the row as changed even if only position moved.
		updated_at: new Date().toISOString(),
		created_at: nodeData.created_at ?? new Date().toISOString(),
		parent_id: node.parentId ?? nodeData.parent_id ?? null,
	};
}

export function getEdgeActorId(
	edge: AppEdge,
	preferredUserId?: string | null
): string {
	const preferred = asNonEmptyString(preferredUserId);
	if (preferred) return preferred;

	const edgeUserId = asNonEmptyString(
		(edge.data as Record<string, unknown> | undefined)?.user_id
	);
	if (edgeUserId) return edgeUserId;

	return 'unknown';
}

export function serializeEdgeForRealtime(
	edge: AppEdge,
	mapId: string,
	userId: string
): Record<string, unknown> {
	const edgeData = (edge.data ?? {}) as Partial<EdgeData>;
	const stableEdgeUserId = asNonEmptyString(edgeData.user_id) ?? userId;

	return {
		...edgeData,
		id: edge.id,
		map_id: mapId,
		user_id: stableEdgeUserId,
		source: edge.source || '',
		target: edge.target || '',
		label: edgeData.label ?? edge.label ?? null,
		markerEnd: edgeData.markerEnd ?? edge.markerEnd ?? null,
		markerStart: edgeData.markerStart ?? null,
		style:
			edgeData.style ??
			(edge.style as unknown as Record<string, unknown> | undefined) ??
			null,
		animated: edgeData.animated ?? edge.animated ?? false,
		metadata: edgeData.metadata ?? null,
		aiData: edgeData.aiData ?? null,
		updated_at: new Date().toISOString(),
		created_at: edgeData.created_at ?? new Date().toISOString(),
	};
}
