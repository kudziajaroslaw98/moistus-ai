import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type { EdgeData } from '@/types/edge-data';

/**
 * Canonicalization for history revert state. Snapshots and deltas store nodes/edges in
 * several historical shapes; these helpers normalize them to the same shape the canvas
 * gets on map load (src/helpers/transform-supabase-data.ts).
 */

export function toRecord(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
	return value as Record<string, unknown>;
}

export function toStringOrNull(value: unknown): string | null {
	return typeof value === 'string' ? value : null;
}

export function toTextOrNull(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	if (trimmed.length === 0 || trimmed.toLowerCase() === 'null') return null;
	return value;
}

export function toNumberOrNull(value: unknown): number | null {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && value.trim().length > 0) {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) return parsed;
	}
	return null;
}

export function toBooleanOrNull(value: unknown): boolean | null {
	if (typeof value === 'boolean') return value;
	if (typeof value === 'string') {
		const normalized = value.trim().toLowerCase();
		if (normalized === 'true') return true;
		if (normalized === 'false') return false;
	}
	return null;
}

export function canonicalizeNode(node: AppNode): AppNode | null {
	if (!node || typeof node !== 'object' || typeof node.id !== 'string') {
		return null;
	}

	const nodeRecord = node as unknown as Record<string, unknown>;
	const nodeData = toRecord(nodeRecord.data) ?? {};
	const position = toRecord(nodeRecord.position) ?? {};
	const measured = toRecord(nodeRecord.measured) ?? {};
	const parentNode = toRecord(nodeRecord.parentNode);

	const positionX =
		toNumberOrNull(position.x) ?? toNumberOrNull(nodeData.position_x) ?? 0;
	const positionY =
		toNumberOrNull(position.y) ?? toNumberOrNull(nodeData.position_y) ?? 0;
	const width =
		toNumberOrNull(nodeRecord.width) ??
		toNumberOrNull(measured.width) ??
		toNumberOrNull(nodeData.width);
	const height =
		toNumberOrNull(nodeRecord.height) ??
		toNumberOrNull(measured.height) ??
		toNumberOrNull(nodeData.height);
	const parentId =
		toStringOrNull(nodeRecord.parentId) ??
		toStringOrNull(nodeRecord.parentNode) ??
		toStringOrNull(parentNode?.id) ??
		toStringOrNull(nodeData.parent_id);
	const nodeType =
		toStringOrNull(nodeRecord.type) ??
		toStringOrNull(nodeData.node_type) ??
		'defaultNode';

	const normalizedData: Record<string, unknown> = {
		...nodeData,
		id: node.id,
		content: toStringOrNull(nodeData.content) ?? '',
		position_x: positionX,
		position_y: positionY,
		width: width ?? null,
		height: height ?? null,
		node_type: nodeType,
		parent_id: parentId ?? null,
		metadata: toRecord(nodeData.metadata) ?? {},
		aiData: toRecord(nodeData.aiData) ?? {},
	};

	const normalizedNode: Record<string, unknown> = {
		...nodeRecord,
		id: node.id,
		type: nodeType,
		position: { x: positionX, y: positionY },
		data: normalizedData,
	};
	// Hierarchy lives in data.parent_id only. A top-level React Flow parentId makes the
	// node a sub-flow child, so its absolute position would render relative to its parent.
	delete normalizedNode.parentId;
	delete normalizedNode.parentNode;

	if (typeof width === 'number') normalizedNode.width = width;
	else delete normalizedNode.width;

	if (typeof height === 'number') normalizedNode.height = height;
	else delete normalizedNode.height;

	return normalizedNode as unknown as AppNode;
}

export function inferEdgeTypeFromData(edgeData: Record<string, unknown>): string {
	const aiData = toRecord(edgeData.aiData);
	if (aiData?.isSuggested === true || aiData?.isSuggested === 'true') {
		return 'suggestedConnection';
	}

	const metadata = toRecord(edgeData.metadata);
	if (metadata?.pathType === 'waypoint') {
		return 'waypointEdge';
	}

	return 'floatingEdge';
}

export function canonicalizeEdge(edge: AppEdge): AppEdge | null {
	if (!edge || typeof edge !== 'object' || typeof edge.id !== 'string') {
		return null;
	}

	const edgeRecord = edge as unknown as Record<string, unknown>;
	const edgeData = toRecord(edgeRecord.data) ?? {};
	const source =
		toStringOrNull(edgeRecord.source) ?? toStringOrNull(edgeData.source);
	const target =
		toStringOrNull(edgeRecord.target) ?? toStringOrNull(edgeData.target);

	if (!source || !target) return null;

	const animated =
		toBooleanOrNull(edgeRecord.animated) ??
		toBooleanOrNull(edgeData.animated) ??
		false;
	const style = toRecord(edgeRecord.style) ?? toRecord(edgeData.style) ?? null;
	const markerEnd =
		toTextOrNull(edgeRecord.markerEnd) ?? toTextOrNull(edgeData.markerEnd);
	const markerStart =
		toTextOrNull(edgeRecord.markerStart) ?? toTextOrNull(edgeData.markerStart);
	const label =
		toStringOrNull(edgeRecord.label) ?? toStringOrNull(edgeData.label);
	const metadata = toRecord(edgeData.metadata) ?? {};
	const aiData = toRecord(edgeData.aiData) ?? {};
	const edgeType =
		toStringOrNull(edgeRecord.type) ??
		toStringOrNull(edgeData.type) ??
		inferEdgeTypeFromData(edgeData);

	const normalizedData: Record<string, unknown> = {
		...edgeData,
		id: edge.id,
		source,
		target,
		label: label ?? null,
		animated,
		style,
		markerEnd: markerEnd ?? null,
		markerStart: markerStart ?? null,
		metadata,
		aiData,
	};

	return {
		...(edge as unknown as Record<string, unknown>),
		id: edge.id,
		source,
		target,
		type: edgeType,
		label: label ?? undefined,
		animated,
		style,
		markerEnd: markerEnd ?? null,
		markerStart: markerStart ?? null,
		data: normalizedData as EdgeData,
	} as AppEdge;
}
