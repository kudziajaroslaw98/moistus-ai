import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type { XYPosition } from '@xyflow/react';

/**
 * Anchored annotations are annotation nodes that follow a host node.
 *
 * The link lives in `metadata.anchorNodeId` + `metadata.anchorOffset` and is
 * intentionally separate from `parent_id` (mind-map hierarchy). An annotation
 * whose host is missing, is itself an annotation, or is the annotation itself
 * is treated as free-floating.
 */

export const DEFAULT_ANCHOR_GAP = 48;

export function isAnnotationNode(node: Pick<AppNode, 'type' | 'data'>): boolean {
	return (node.data?.node_type ?? node.type) === 'annotationNode';
}

/**
 * Raw anchor id stored on an annotation, without validating the host.
 */
function getRawAnchorNodeId(node: AppNode): string | null {
	if (!isAnnotationNode(node)) return null;
	const anchorNodeId = node.data?.metadata?.anchorNodeId;
	return typeof anchorNodeId === 'string' && anchorNodeId.length > 0 && anchorNodeId !== node.id
		? anchorNodeId
		: null;
}

/**
 * Ids of nodes that may host annotations (every non-annotation node).
 */
export function getAnchorHostIds(nodes: readonly AppNode[]): Set<string> {
	const hostIds = new Set<string>();
	for (const node of nodes) {
		if (!isAnnotationNode(node)) hostIds.add(node.id);
	}
	return hostIds;
}

/**
 * Resolve a valid host id for an anchored annotation, or null when free.
 */
export function getAnchorNodeId(
	node: AppNode,
	hostIds: ReadonlySet<string>
): string | null {
	const anchorNodeId = getRawAnchorNodeId(node);
	return anchorNodeId && hostIds.has(anchorNodeId) ? anchorNodeId : null;
}

/**
 * Group anchored annotations by their (valid) host node id.
 */
export function buildAnnotationsByHost(
	nodes: readonly AppNode[]
): Map<string, AppNode[]> {
	const hostIds = getAnchorHostIds(nodes);
	const annotationsByHost = new Map<string, AppNode[]>();

	for (const node of nodes) {
		const hostId = getAnchorNodeId(node, hostIds);
		if (!hostId) continue;
		const list = annotationsByHost.get(hostId);
		if (list) list.push(node);
		else annotationsByHost.set(hostId, [node]);
	}

	return annotationsByHost;
}

/**
 * Map of anchored annotation id -> host id.
 */
export function buildAnchorHostById(nodes: readonly AppNode[]): Map<string, string> {
	const hostIds = getAnchorHostIds(nodes);
	const hostById = new Map<string, string>();
	for (const node of nodes) {
		const hostId = getAnchorNodeId(node, hostIds);
		if (hostId) hostById.set(node.id, hostId);
	}
	return hostById;
}

/**
 * Stored offset, or the current relative position when the offset is missing.
 */
export function getAnchorOffset(annotation: AppNode, host: AppNode): XYPosition {
	const offset = annotation.data?.metadata?.anchorOffset;
	if (
		offset &&
		typeof offset.x === 'number' &&
		Number.isFinite(offset.x) &&
		typeof offset.y === 'number' &&
		Number.isFinite(offset.y)
	) {
		return { x: offset.x, y: offset.y };
	}
	return computeAnchorOffset(annotation.position, host.position);
}

export function computeAnchorOffset(
	annotationPosition: XYPosition,
	hostPosition: XYPosition
): XYPosition {
	return {
		x: annotationPosition.x - hostPosition.x,
		y: annotationPosition.y - hostPosition.y,
	};
}

/**
 * Default placement for a new annotation: to the right of the host.
 */
export function getDefaultAnchorOffset(host: Pick<AppNode, 'width' | 'measured'>): XYPosition {
	const hostWidth = host.measured?.width ?? host.width ?? 320;
	return { x: hostWidth + DEFAULT_ANCHOR_GAP, y: 0 };
}

/**
 * Nearest valid host for attaching a free annotation (center-to-center).
 */
export function findNearestAnchorHost(
	annotation: AppNode,
	nodes: readonly AppNode[]
): AppNode | null {
	const center = getNodeCenter(annotation);
	let nearest: AppNode | null = null;
	let nearestDistance = Number.POSITIVE_INFINITY;

	for (const node of nodes) {
		if (node.id === annotation.id || isAnnotationNode(node)) continue;
		if (node.type === 'ghostNode' || node.type === 'commentNode') continue;
		const nodeCenter = getNodeCenter(node);
		const distance = Math.hypot(nodeCenter.x - center.x, nodeCenter.y - center.y);
		if (distance < nearestDistance) {
			nearest = node;
			nearestDistance = distance;
		}
	}

	return nearest;
}

function getNodeCenter(node: AppNode): XYPosition {
	const width = node.measured?.width ?? node.width ?? 0;
	const height = node.measured?.height ?? node.height ?? 0;
	return { x: node.position.x + width / 2, y: node.position.y + height / 2 };
}

type PositionChangeLike = {
	type: string;
	id?: string;
	position?: XYPosition;
	dragging?: boolean;
};

/**
 * Keep anchored annotations glued to their hosts inside `onNodesChange`.
 *
 * Mutates `nodes` in place (same contract as group-children syncing):
 * - host moved (and annotation not moved itself) -> annotation = host + offset
 * - annotation moved and not mid-drag -> store the new `anchorOffset`
 *
 * Returns host id -> follower annotation ids (annotations not in the change set),
 * so the caller can persist followers when the host move is committed.
 */
export function syncAnchoredAnnotationPositions(
	changes: readonly PositionChangeLike[],
	nodes: AppNode[],
	previousNodeById: ReadonlyMap<string, AppNode>
): Map<string, string[]> {
	const followersByHost = new Map<string, string[]>();
	const anchorHostById = buildAnchorHostById(nodes);
	if (anchorHostById.size === 0) return followersByHost;

	const positionChangeById = new Map<string, PositionChangeLike>();
	for (const change of changes) {
		if (change.type === 'position' && change.position && change.id) {
			positionChangeById.set(change.id, change);
		}
	}

	const indexById = new Map(nodes.map((node, index) => [node.id, index]));

	for (const [annotationId, hostId] of anchorHostById) {
		const annotationIndex = indexById.get(annotationId);
		const hostIndex = indexById.get(hostId);
		if (annotationIndex === undefined || hostIndex === undefined) continue;

		const annotation = nodes[annotationIndex];
		const host = nodes[hostIndex];
		const ownChange = positionChangeById.get(annotationId);

		if (ownChange) {
			// Moved directly (alone or together with its host): record the offset on commit.
			if (ownChange.dragging === true) continue;
			const nextOffset = computeAnchorOffset(annotation.position, host.position);
			const currentOffset = annotation.data.metadata?.anchorOffset;
			if (currentOffset?.x === nextOffset.x && currentOffset?.y === nextOffset.y) {
				continue;
			}
			nodes[annotationIndex] = {
				...annotation,
				data: {
					...annotation.data,
					metadata: { ...annotation.data.metadata, anchorOffset: nextOffset },
				},
			};
			continue;
		}

		const followers = followersByHost.get(hostId);
		if (followers) followers.push(annotationId);
		else followersByHost.set(hostId, [annotationId]);

		const previousHost = previousNodeById.get(hostId);
		if (
			!previousHost ||
			(previousHost.position.x === host.position.x &&
				previousHost.position.y === host.position.y)
		) {
			continue;
		}

		const offset = getAnchorOffset(
			previousNodeById.get(annotationId) ?? annotation,
			previousHost
		);
		nodes[annotationIndex] = {
			...annotation,
			position: { x: host.position.x + offset.x, y: host.position.y + offset.y },
		};
	}

	return followersByHost;
}

/**
 * Ids of anchored annotations whose host is in `hostIds` (for cascade delete).
 */
export function getAnchoredAnnotationIdsForHosts(
	nodes: readonly AppNode[],
	hostIds: ReadonlySet<string>
): string[] {
	const ids: string[] = [];
	for (const [annotationId, hostId] of buildAnchorHostById(nodes)) {
		if (hostIds.has(hostId)) ids.push(annotationId);
	}
	return ids;
}

export const ANNOTATION_TETHER_EDGE_PREFIX = 'annotation-tether:';

/**
 * Display-only tether edges (host -> anchored annotation) for visible nodes.
 * Never stored in the edges slice, so history/layout/AI never see them.
 */
export function buildAnnotationTetherEdges(visibleNodes: readonly AppNode[]): AppEdge[] {
	const tethers: AppEdge[] = [];
	const hostById = buildAnchorHostById(visibleNodes);

	for (const node of visibleNodes) {
		const hostId = hostById.get(node.id);
		if (!hostId) continue;
		tethers.push({
			id: `${ANNOTATION_TETHER_EDGE_PREFIX}${node.id}`,
			source: hostId,
			target: node.id,
			type: 'annotationTether',
			selectable: false,
			deletable: false,
			focusable: false,
			data: {
				annotationType: node.data.metadata?.annotationType ?? 'note',
			} as unknown as AppEdge['data'],
		});
	}

	return tethers;
}
