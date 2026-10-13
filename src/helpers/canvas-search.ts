import { buildAnchorHostById } from '@/helpers/anchored-annotations';
import { buildHiddenOwnerById, getBranchIndex } from '@/helpers/collapse/branch-index';
import { getNodeSearchText } from '@/helpers/node-semantic-text';
import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';

const EXCLUDED_SEARCH_NODE_TYPES = new Set(['ghostNode', 'commentNode']);

// Letters NFD does not decompose into base + diacritic.
const FOLDED_LETTERS: Record<string, string> = {
	ł: 'l',
	đ: 'd',
	ø: 'o',
	ħ: 'h',
	ß: 'ss',
	æ: 'ae',
	œ: 'oe',
};

/** Case- and diacritic-insensitive form used on both sides of the match. */
export function normalizeSearchText(value: string): string {
	return value
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase()
		.replace(/[łđøħßæœ]/g, (letter) => FOLDED_LETTERS[letter] ?? letter)
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Ids of nodes whose text contains `query`, in reading order (top-to-bottom,
 * then left-to-right). Searches every node, including ones hidden inside
 * collapsed branches.
 */
export function searchNodes(nodes: readonly AppNode[], query: string): string[] {
	const needle = normalizeSearchText(query);
	if (!needle) return [];

	return nodes
		.filter((node) => {
			const nodeType = node.data.node_type ?? node.type ?? 'defaultNode';
			if (EXCLUDED_SEARCH_NODE_TYPES.has(nodeType)) return false;
			return normalizeSearchText(getNodeSearchText(node)).includes(needle);
		})
		.sort(
			(left, right) =>
				left.position.y - right.position.y || left.position.x - right.position.x
		)
		.map((node) => node.id);
}

/**
 * For each visible collapsed node, how many matches it hides.
 * Visibility is derived from the branch index (hidden = inside any collapsed
 * branch, or anchored to a hidden host), matching `getVisibleNodes`.
 */
export function countMatchesInsideCollapsed(
	nodes: readonly AppNode[],
	edges: readonly AppEdge[],
	matchIds: readonly string[]
): Map<string, number> {
	const counts = new Map<string, number>();
	if (matchIds.length === 0) return counts;

	const index = getBranchIndex(nodes, edges);
	if (index.summaries.size === 0) return counts;

	const hiddenIds = new Set<string>();
	for (const summary of index.summaries.values()) {
		for (const hiddenId of summary.hiddenIds) hiddenIds.add(hiddenId);
	}
	// Summaries exclude anchored annotations; they are hidden with their host.
	const anchorHostById = buildAnchorHostById(nodes);
	for (const [annotationId, hostId] of anchorHostById) {
		if (hiddenIds.has(hostId)) hiddenIds.add(annotationId);
	}
	const visibleNodeIds = new Set(
		nodes.filter((node) => !hiddenIds.has(node.id)).map((node) => node.id)
	);

	const ownerById = buildHiddenOwnerById(index, visibleNodeIds, anchorHostById);
	for (const matchId of matchIds) {
		const owner = ownerById.get(matchId);
		if (owner) counts.set(owner, (counts.get(owner) ?? 0) + 1);
	}
	return counts;
}

/**
 * Stored active index clamped to the current match list, which can shrink
 * under it (edits, deletes, remote changes).
 */
export function getActiveMatchIndex(activeIndex: number, total: number): number {
	return total === 0 ? 0 : Math.min(Math.max(activeIndex, 0), total - 1);
}

let insideMemo: {
	nodes: readonly AppNode[];
	edges: readonly AppEdge[];
	query: string;
	counts: Map<string, number>;
} | null = null;

/** Memoized `countMatchesInsideCollapsed` for the current query. */
export function getMatchesInsideCollapsed(
	nodes: readonly AppNode[],
	edges: readonly AppEdge[],
	query: string
): Map<string, number> {
	if (
		insideMemo &&
		insideMemo.nodes === nodes &&
		insideMemo.edges === edges &&
		insideMemo.query === query
	) {
		return insideMemo.counts;
	}
	const counts = countMatchesInsideCollapsed(
		nodes,
		edges,
		getCanvasSearchMatches(nodes, query).ids
	);
	insideMemo = { nodes, edges, query, counts };
	return counts;
}

let matchMemo: {
	nodes: readonly AppNode[];
	query: string;
	ids: string[];
	idSet: Set<string>;
} | null = null;

/**
 * Memoized matches for the current nodes/query (shared by every node component
 * and the search bar).
 */
export function getCanvasSearchMatches(
	nodes: readonly AppNode[],
	query: string
): { ids: string[]; idSet: Set<string> } {
	if (matchMemo && matchMemo.nodes === nodes && matchMemo.query === query) {
		return matchMemo;
	}
	const ids = searchNodes(nodes, query);
	matchMemo = { nodes, query, ids, idSet: new Set(ids) };
	return matchMemo;
}
