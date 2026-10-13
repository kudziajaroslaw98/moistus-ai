import type { EdgeData } from '@/types/edge-data';
import type { LayoutDirection } from '@/types/layout-types';
import type { NodeData } from '@/types/node-data';

export interface MapTree {
	roots: string[];
	children: Map<string, string[]>;
	parentOf: Map<string, string>;
	/** Edges drawn as indentation; every other edge is listed as a link. */
	treeEdgeIds: Set<string>;
}

const byCreatedAt = (a: EdgeData, b: EdgeData) =>
	(a.created_at ?? '').localeCompare(b.created_at ?? '') || a.id.localeCompare(b.id);

/**
 * Builds the outline tree for a map. A node's parent is its `parent_id` when
 * that node exists, otherwise the source of its first incoming edge. Maps can
 * contain cycles, so any node not reachable from a root becomes a root.
 * Siblings are ordered the way they sit on the canvas.
 */
export function buildMapTree(
	nodes: NodeData[],
	edges: EdgeData[],
	direction: LayoutDirection | null
): MapTree {
	const nodesById = new Map(nodes.map((node) => [node.id, node]));
	const incoming = new Map<string, EdgeData[]>();
	for (const edge of [...edges].sort(byCreatedAt)) {
		if (!nodesById.has(edge.source) || !nodesById.has(edge.target)) continue;
		if (edge.source === edge.target) continue;
		const list = incoming.get(edge.target) ?? [];
		list.push(edge);
		incoming.set(edge.target, list);
	}

	const parentOf = new Map<string, string>();
	const parentEdgeOf = new Map<string, string>();
	for (const node of nodes) {
		const edgesIn = incoming.get(node.id) ?? [];
		const parentId =
			node.parent_id && node.parent_id !== node.id && nodesById.has(node.parent_id)
				? node.parent_id
				: edgesIn[0]?.source;
		if (!parentId) continue;
		parentOf.set(node.id, parentId);
		const parentEdge = edgesIn.find((edge) => edge.source === parentId);
		if (parentEdge) parentEdgeOf.set(node.id, parentEdge.id);
	}

	const position = (id: string) => {
		const node = nodesById.get(id)!;
		return direction === 'TOP_BOTTOM'
			? [node.position_x ?? 0, node.position_y ?? 0]
			: [node.position_y ?? 0, node.position_x ?? 0];
	};
	const byCanvasOrder = (a: string, b: string) => {
		const [a1, a2] = position(a);
		const [b1, b2] = position(b);
		return a1 - b1 || a2 - b2 || a.localeCompare(b);
	};

	const children = new Map<string, string[]>();
	for (const [childId, parentId] of parentOf) {
		const list = children.get(parentId) ?? [];
		list.push(childId);
		children.set(parentId, list);
	}
	for (const list of children.values()) list.sort(byCanvasOrder);

	const visited = new Set<string>();
	const visit = (rootId: string) => {
		const stack = [rootId];
		while (stack.length > 0) {
			const id = stack.pop()!;
			if (visited.has(id)) continue;
			visited.add(id);
			for (const childId of children.get(id) ?? []) stack.push(childId);
		}
	};

	const roots = nodes
		.map((node) => node.id)
		.filter((id) => !parentOf.has(id))
		.sort(byCanvasOrder);
	roots.forEach(visit);

	// Whatever is left sits on a cycle: cut it at the first node in canvas order.
	for (const id of nodes.map((node) => node.id).sort(byCanvasOrder)) {
		if (visited.has(id)) continue;
		const parentId = parentOf.get(id)!;
		parentOf.delete(id);
		parentEdgeOf.delete(id);
		children.set(
			parentId,
			(children.get(parentId) ?? []).filter((childId) => childId !== id)
		);
		roots.push(id);
		visit(id);
	}

	return {
		roots,
		children,
		parentOf,
		treeEdgeIds: new Set(parentEdgeOf.values()),
	};
}
