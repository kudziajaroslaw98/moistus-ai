import { ANNOTATION_TETHER_EDGE_PREFIX } from '@/helpers/anchored-annotations';
import { COLLAPSED_PROXY_EDGE_PREFIX } from '@/helpers/collapse/collapsed-proxy-edges';

/**
 * True for display-only edges (collapsed-branch proxies, annotation tethers).
 * They are never stored in the edges slice, so edge actions (context menu,
 * edit, delete) must ignore them.
 */
export function isDerivedDisplayEdgeId(edgeId: string): boolean {
	return (
		edgeId.startsWith(COLLAPSED_PROXY_EDGE_PREFIX) ||
		edgeId.startsWith(ANNOTATION_TETHER_EDGE_PREFIX)
	);
}
