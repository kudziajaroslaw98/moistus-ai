import { buildAnchorHostById, getAnchorOffset } from '@/helpers/anchored-annotations';
import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type { LayoutResult } from '@/types/layout-types';

export interface AnchoredAnnotationSplit {
	nodes: AppNode[];
	edges: AppEdge[];
	/** annotation id -> host id; empty when the graph has no anchored annotations */
	anchorHostById: Map<string, string>;
}

/**
 * Remove anchored annotations (and edges touching them) before any layout pass.
 * Annotations are satellites of their host and must never become layout members,
 * forest roots, or collision obstacles.
 */
export function splitAnchoredAnnotations(
	nodes: AppNode[],
	edges: AppEdge[]
): AnchoredAnnotationSplit {
	const anchorHostById = buildAnchorHostById(nodes);
	if (anchorHostById.size === 0) {
		return { nodes, edges, anchorHostById };
	}

	return {
		nodes: nodes.filter((node) => !anchorHostById.has(node.id)),
		edges: edges.filter(
			(edge) => !anchorHostById.has(edge.source) && !anchorHostById.has(edge.target)
		),
		anchorHostById,
	};
}

/**
 * Put anchored annotations back next to their (possibly moved) hosts.
 * Keeps the original node/edge order; edges touching annotations are unchanged.
 * Returns ids of annotations whose position changed.
 */
export function reattachAnchoredAnnotations(
	originalNodes: AppNode[],
	originalEdges: AppEdge[],
	result: LayoutResult,
	anchorHostById: ReadonlyMap<string, string>
): LayoutResult & { movedAnnotationIds: Set<string> } {
	const movedAnnotationIds = new Set<string>();
	if (anchorHostById.size === 0) {
		return { ...result, movedAnnotationIds };
	}

	const originalById = new Map(originalNodes.map((node) => [node.id, node]));
	const resultNodeById = new Map(result.nodes.map((node) => [node.id, node]));
	const resultEdgeById = new Map(result.edges.map((edge) => [edge.id, edge]));

	const nodes = originalNodes.map((node) => {
		const hostId = anchorHostById.get(node.id);
		if (!hostId) return resultNodeById.get(node.id) ?? node;

		const originalHost = originalById.get(hostId);
		const nextHost = resultNodeById.get(hostId);
		if (!originalHost || !nextHost) return node;

		const offset = getAnchorOffset(node, originalHost);
		const position = {
			x: nextHost.position.x + offset.x,
			y: nextHost.position.y + offset.y,
		};
		if (position.x === node.position.x && position.y === node.position.y) {
			return node;
		}
		movedAnnotationIds.add(node.id);
		return { ...node, position };
	});

	const edges = originalEdges.map((edge) => resultEdgeById.get(edge.id) ?? edge);

	return { nodes, edges, movedAnnotationIds };
}

/**
 * Add anchored annotations whose host is in `ids` (for persistence sets).
 */
export function withAnchoredFollowers(
	ids: ReadonlySet<string>,
	anchorHostById: ReadonlyMap<string, string>
): Set<string> {
	const next = new Set(ids);
	for (const [annotationId, hostId] of anchorHostById) {
		if (ids.has(hostId)) next.add(annotationId);
	}
	return next;
}
