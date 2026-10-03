import { buildAnchorHostById } from '@/helpers/anchored-annotations';
import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';

/**
 * Collapsed-branch index: the single source of rollups shown on collapsed nodes
 * (hidden count, branch task progress, pending statuses, severity, peek outline).
 *
 * Structure follows the same rules as `getDescendantNodeIds`: outgoing edges that
 * are not transient AI suggestions. Anchored annotations are satellites, never
 * counted as hidden nodes, but their type feeds the severity signal.
 */

export type BranchSeverity = 'critical' | 'warning' | null;

export interface BranchOutlineRow {
	id: string;
	depth: number;
	text: string;
	nodeType: string;
	edgeLabel: string | null;
	tasks: { done: number; total: number } | null;
	status: string | null;
	isCollapsed: boolean;
}

export interface BranchSummary {
	/** Every node in the subtree (all depths), excluding anchored annotations */
	hiddenIds: string[];
	/** Task progress across the collapsed node and its whole subtree */
	tasks: { done: number; total: number };
	/** Subtree nodes whose status is draft / in-progress / on-hold */
	pendingStatusCount: number;
	severity: BranchSeverity;
	/** Depth-first outline of the subtree for the peek overlay (capped) */
	outline: BranchOutlineRow[];
}

export interface BranchIndex {
	/** Direct structural children per node (only entries with > 0) */
	childIdsById: Map<string, string[]>;
	/** Summaries for collapsed nodes that have children */
	summaries: Map<string, BranchSummary>;
}

export const PENDING_STATUSES = new Set(['draft', 'in-progress', 'on-hold']);
export const BRANCH_OUTLINE_LIMIT = 50;

export function isStructuralEdge(edge: AppEdge): boolean {
	return edge.data?.aiData?.isSuggested !== true;
}

export function getNodeOutlineText(node: AppNode): string {
	const metadata = node.data.metadata;
	const raw =
		(typeof metadata?.title === 'string' && metadata.title) ||
		(typeof metadata?.label === 'string' && metadata.label) ||
		(typeof node.data.content === 'string' && node.data.content) ||
		'';
	const text = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
	if (!text) return 'Untitled';
	return text.length > 80 ? `${text.slice(0, 79)}…` : text;
}

function getNodeStatus(node: AppNode): string | null {
	const status = node.data.metadata?.status ?? node.data.status;
	return typeof status === 'string' && status.length > 0 ? status : null;
}

function getNodeTasks(node: AppNode): { done: number; total: number } | null {
	const tasks = node.data.metadata?.tasks;
	if (!Array.isArray(tasks) || tasks.length === 0) return null;
	return {
		done: tasks.filter((task) => task.isComplete).length,
		total: tasks.length,
	};
}

function isCriticalNode(node: AppNode): boolean {
	const priority = node.data.metadata?.priority ?? node.data.priority;
	if (priority !== 'high') return false;
	if (getNodeStatus(node) === 'completed') return false;
	const tasks = getNodeTasks(node);
	return !(tasks && tasks.done === tasks.total);
}

function getEdgeLabel(edge: AppEdge): string | null {
	const label = edge.data?.label ?? edge.label;
	return typeof label === 'string' && label.trim().length > 0 ? label.trim() : null;
}

/**
 * Build structural child lists and summaries for every collapsed node.
 * Cycle-safe; each summary walks only its own subtree.
 */
export function buildBranchIndex(
	nodes: readonly AppNode[],
	edges: readonly AppEdge[]
): BranchIndex {
	const nodeById = new Map(nodes.map((node) => [node.id, node]));
	const childEdgesById = new Map<string, AppEdge[]>();

	for (const edge of edges) {
		if (!isStructuralEdge(edge)) continue;
		if (!nodeById.has(edge.source) || !nodeById.has(edge.target)) continue;
		if (edge.source === edge.target) continue;
		const list = childEdgesById.get(edge.source);
		if (list) list.push(edge);
		else childEdgesById.set(edge.source, [edge]);
	}

	const anchorHostById = buildAnchorHostById(nodes as AppNode[]);
	const annotationsByHost = new Map<string, AppNode[]>();
	for (const [annotationId, hostId] of anchorHostById) {
		const annotation = nodeById.get(annotationId);
		if (!annotation) continue;
		const list = annotationsByHost.get(hostId);
		if (list) list.push(annotation);
		else annotationsByHost.set(hostId, [annotation]);
	}

	const childIdsById = new Map<string, string[]>();
	for (const [sourceId, childEdges] of childEdgesById) {
		const childIds = [
			...new Set(
				childEdges
					.map((edge) => edge.target)
					.filter((targetId) => !anchorHostById.has(targetId))
			),
		];
		if (childIds.length > 0) childIdsById.set(sourceId, childIds);
	}

	const summaries = new Map<string, BranchSummary>();
	for (const node of nodes) {
		if (!node.data.metadata?.isCollapsed) continue;
		if (!childIdsById.has(node.id)) continue;
		summaries.set(
			node.id,
			summarizeBranch(node, nodeById, childEdgesById, anchorHostById, annotationsByHost)
		);
	}

	return { childIdsById, summaries };
}

function summarizeBranch(
	root: AppNode,
	nodeById: ReadonlyMap<string, AppNode>,
	childEdgesById: ReadonlyMap<string, AppEdge[]>,
	anchorHostById: ReadonlyMap<string, string>,
	annotationsByHost: ReadonlyMap<string, AppNode[]>
): BranchSummary {
	const hiddenIds: string[] = [];
	const outline: BranchOutlineRow[] = [];
	const tasks = { done: 0, total: 0 };
	let pendingStatusCount = 0;
	let severity: BranchSeverity = null;

	const rootTasks = getNodeTasks(root);
	if (rootTasks) {
		tasks.done += rootTasks.done;
		tasks.total += rootTasks.total;
	}

	const raiseSeverity = (next: BranchSeverity) => {
		if (next === 'critical' || (next === 'warning' && severity === null)) {
			severity = next;
		}
	};

	const visited = new Set<string>([root.id]);
	// Iterative DFS keeps sibling order (reverse push) and is stack-safe.
	const stack: Array<{ edge: AppEdge; depth: number }> = [];
	const pushChildren = (nodeId: string, depth: number) => {
		const childEdges = childEdgesById.get(nodeId) ?? [];
		for (let index = childEdges.length - 1; index >= 0; index -= 1) {
			stack.push({ edge: childEdges[index], depth });
		}
	};
	pushChildren(root.id, 0);

	while (stack.length > 0) {
		const { edge, depth } = stack.pop()!;
		const node = nodeById.get(edge.target);
		if (!node || visited.has(node.id)) continue;
		visited.add(node.id);

		if (!anchorHostById.has(node.id)) {
			hiddenIds.push(node.id);

			const nodeTasks = getNodeTasks(node);
			if (nodeTasks) {
				tasks.done += nodeTasks.done;
				tasks.total += nodeTasks.total;
			}
			const status = getNodeStatus(node);
			if (status && PENDING_STATUSES.has(status)) pendingStatusCount += 1;
			if (isCriticalNode(node)) raiseSeverity('critical');

			for (const annotation of annotationsByHost.get(node.id) ?? []) {
				const type = annotation.data.metadata?.annotationType;
				if (type === 'error') raiseSeverity('critical');
				else if (type === 'warning') raiseSeverity('warning');
			}

			if (outline.length < BRANCH_OUTLINE_LIMIT) {
				outline.push({
					id: node.id,
					depth,
					text: getNodeOutlineText(node),
					nodeType: node.data.node_type ?? node.type ?? 'defaultNode',
					edgeLabel: getEdgeLabel(edge),
					tasks: nodeTasks,
					status,
					isCollapsed: Boolean(node.data.metadata?.isCollapsed),
				});
			}
		}

		pushChildren(node.id, depth + 1);
	}

	return { hiddenIds, tasks, pendingStatusCount, severity, outline };
}

let memo: {
	nodes: readonly AppNode[];
	edges: readonly AppEdge[];
	index: BranchIndex;
} | null = null;

/**
 * Memoized by array identity, so every node component can select from the same
 * index without rebuilding it per render.
 */
export function getBranchIndex(
	nodes: readonly AppNode[],
	edges: readonly AppEdge[]
): BranchIndex {
	if (memo && memo.nodes === nodes && memo.edges === edges) {
		return memo.index;
	}
	const index = buildBranchIndex(nodes, edges);
	memo = { nodes, edges, index };
	return index;
}

/**
 * Collapsed ancestors (via structural incoming edges) that currently hide
 * `targetId`. Expanding all of them is the minimal way to reveal the target,
 * since a node is hidden while it descends from any collapsed node.
 */
export function getCollapsedAncestorIds(
	targetId: string,
	nodes: readonly AppNode[],
	edges: readonly AppEdge[]
): string[] {
	const nodeById = new Map(nodes.map((node) => [node.id, node]));
	const parentIdsById = new Map<string, string[]>();
	for (const edge of edges) {
		if (!isStructuralEdge(edge)) continue;
		const list = parentIdsById.get(edge.target);
		if (list) list.push(edge.source);
		else parentIdsById.set(edge.target, [edge.source]);
	}

	// An anchored annotation is hidden through its host.
	const anchorHostId = buildAnchorHostById(nodes as AppNode[]).get(targetId);
	const startId = anchorHostId ?? targetId;

	const collapsed: string[] = [];
	const visited = new Set<string>([startId]);
	const queue = [...(parentIdsById.get(startId) ?? [])];
	while (queue.length > 0) {
		const id = queue.shift()!;
		if (visited.has(id)) continue;
		visited.add(id);
		if (nodeById.get(id)?.data.metadata?.isCollapsed) collapsed.push(id);
		queue.push(...(parentIdsById.get(id) ?? []));
	}
	return collapsed;
}

/**
 * Map every hidden node to the visible collapsed node that hides it
 * (used to re-attach cross-links to collapsed branches).
 */
export function buildHiddenOwnerById(
	index: BranchIndex,
	visibleNodeIds: ReadonlySet<string>,
	anchorHostById: ReadonlyMap<string, string>
): Map<string, string> {
	const ownerById = new Map<string, string>();
	for (const [collapsedId, summary] of index.summaries) {
		if (!visibleNodeIds.has(collapsedId)) continue;
		for (const hiddenId of summary.hiddenIds) {
			if (!visibleNodeIds.has(hiddenId) && !ownerById.has(hiddenId)) {
				ownerById.set(hiddenId, collapsedId);
			}
		}
	}
	for (const [annotationId, hostId] of anchorHostById) {
		const owner = ownerById.get(hostId);
		if (owner && !visibleNodeIds.has(annotationId)) ownerById.set(annotationId, owner);
	}
	return ownerById;
}
