import { buildAnchorHostById } from '@/helpers/anchored-annotations';
import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import { buildHiddenOwnerById, getBranchIndex, isStructuralEdge } from './branch-index';

export const COLLAPSED_PROXY_EDGE_PREFIX = 'collapsed-proxy:';

/**
 * Visible edges for the canvas, with cross-links into collapsed branches kept.
 *
 * - Both endpoints visible -> edge as is.
 * - An endpoint hidden inside a collapsed branch -> re-attached to the visible
 *   collapsed node that hides it, as a derived dashed `collapsedProxy` edge.
 * - Both endpoints map to the same node (tree edges inside a branch) -> dropped.
 * - Proxies for the same display pair are merged with a count.
 * - Transient AI suggestion edges are never proxied (they carry their own proxy).
 *
 * Proxy edges are display-only: never stored, persisted, selectable, or deletable.
 */
export function buildVisibleEdgesWithCollapsedProxies(
	nodes: readonly AppNode[],
	edges: readonly AppEdge[],
	visibleNodeIds: ReadonlySet<string>
): AppEdge[] {
	const index = getBranchIndex(nodes, edges);
	const ownerById =
		index.summaries.size > 0
			? buildHiddenOwnerById(index, visibleNodeIds, buildAnchorHostById(nodes as AppNode[]))
			: new Map<string, string>();

	const visibleEdges: AppEdge[] = [];
	const proxies = new Map<
		string,
		{ source: string; target: string; edges: AppEdge[] }
	>();

	for (const edge of edges) {
		const sourceVisible = visibleNodeIds.has(edge.source);
		const targetVisible = visibleNodeIds.has(edge.target);
		if (sourceVisible && targetVisible) {
			visibleEdges.push(edge);
			continue;
		}
		if (!isStructuralEdge(edge)) continue;

		const source = sourceVisible ? edge.source : ownerById.get(edge.source);
		const target = targetVisible ? edge.target : ownerById.get(edge.target);
		if (!source || !target || source === target) continue;

		const key = `${source}->${target}`;
		const proxy = proxies.get(key);
		if (proxy) proxy.edges.push(edge);
		else proxies.set(key, { source, target, edges: [edge] });
	}

	for (const [key, proxy] of proxies) {
		const [first] = proxy.edges;
		const label = first.data?.label ?? first.label;
		visibleEdges.push({
			id: `${COLLAPSED_PROXY_EDGE_PREFIX}${key}`,
			source: proxy.source,
			target: proxy.target,
			type: 'collapsedProxy',
			selectable: false,
			deletable: false,
			focusable: false,
			data: {
				label: typeof label === 'string' ? label : null,
				collapsedProxy: {
					originalEdgeIds: proxy.edges.map((edge) => edge.id),
					count: proxy.edges.length,
				},
			} as unknown as AppEdge['data'],
		});
	}

	return visibleEdges;
}
