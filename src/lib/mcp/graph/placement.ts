import { DEFAULT_ANCHOR_GAP } from '@/helpers/anchored-annotations';
import { runDirectionalForestLayout } from '@/helpers/layout/experimental-forest-layout';
import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import { DEFAULT_LAYOUT_CONFIG } from '@/types/layout-types';
import type { NodeData } from '@/types/node-data';
import type { WorkingGraph } from './edit-plan';
import { anchorHostId, buildMapTree, type MapTree } from './tree';

interface Size {
	width: number;
	height: number;
}

const DEFAULT_SIZE: Size = { width: 320, height: 80 };
const CHARS_PER_LINE = 40;
const SIBLING_GAP = 90;
const ROOT_GAP = 200;
const ANNOTATION_STACK_GAP = 16;

/** Rough rendered size from type and text, so new nodes don't stack on each other. */
export function estimateNodeSize(node: NodeData): Size {
	const lines = (node.content ?? '').split('\n');
	const wrappedLines = lines.reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / CHARS_PER_LINE)), 0);

	switch (node.node_type) {
		case 'taskNode':
			return { width: 320, height: 56 + (node.metadata?.tasks?.length ?? 0) * 28 };
		case 'codeNode':
			return { width: 400, height: 56 + Math.min(lines.length, 30) * 20 };
		case 'imageNode':
			return { width: 320, height: 240 };
		default:
			return { width: 320, height: 40 + Math.min(wrappedLines, 12) * 22 };
	}
}

function sizeOf(graph: WorkingGraph, id: string): Size {
	const node = graph.nodes.get(id)!;
	if (graph.placeIds.has(id)) return estimateNodeSize(node);
	return {
		width: Number(node.width) || DEFAULT_SIZE.width,
		height: Number(node.height) || DEFAULT_SIZE.height,
	};
}

const positionOf = (node: NodeData) => ({ x: node.position_x ?? 0, y: node.position_y ?? 0 });

function setPosition(graph: WorkingGraph, id: string, x: number, y: number): void {
	const node = graph.nodes.get(id)!;
	graph.nodes.set(id, { ...node, position_x: Math.round(x), position_y: Math.round(y) });
}

function subtreeOf(tree: MapTree, rootIds: string[], include: (id: string) => boolean): string[] {
	const result: string[] = [];
	const stack = [...rootIds];
	while (stack.length > 0) {
		const id = stack.pop()!;
		if (!include(id)) continue;
		result.push(id);
		stack.push(...(tree.children.get(id) ?? []));
	}
	return result;
}

function bounds(graph: WorkingGraph, ids: string[]) {
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	for (const id of ids) {
		const { x, y } = positionOf(graph.nodes.get(id)!);
		const size = sizeOf(graph, id);
		minX = Math.min(minX, x);
		minY = Math.min(minY, y);
		maxX = Math.max(maxX, x + size.width);
		maxY = Math.max(maxY, y + size.height);
	}
	return ids.length > 0 ? { minX, minY, maxX, maxY } : null;
}

/** Lays out `memberIds` (and `attachId` as their root, if given) with the app's forest layout. */
function layoutGroup(
	graph: WorkingGraph,
	tree: MapTree,
	memberIds: string[],
	attachId: string | null
): Map<string, { x: number; y: number }> {
	const ids = attachId ? [attachId, ...memberIds] : memberIds;
	const idSet = new Set(ids);
	const nodes = ids.map((id) => ({
		id,
		position: { x: 0, y: 0 },
		...sizeOf(graph, id),
		data: graph.nodes.get(id)!,
	})) as unknown as AppNode[];
	const edges = memberIds
		.filter((id) => idSet.has(tree.parentOf.get(id) ?? ''))
		.map((id) => ({ id: `layout:${id}`, source: tree.parentOf.get(id)!, target: id })) as AppEdge[];

	const direction = graph.direction === 'TOP_BOTTOM' ? 'DOWN' : 'RIGHT';
	const result = runDirectionalForestLayout(nodes, edges, { ...DEFAULT_LAYOUT_CONFIG, direction: graph.direction ?? 'LEFT_RIGHT' }, direction);
	return new Map(result.nodes.map((node) => [node.id, node.position]));
}

/**
 * Gives every new or moved node a position, never moving anything else.
 * - Nodes under an existing node: their subtree is laid out next to it, past
 *   that node's other children.
 * - New top-level nodes: laid out together beside the whole map.
 * - Anchored annotations: to the right of their host, stacked.
 */
export function placeNewNodes(graph: WorkingGraph): void {
	if (graph.placeIds.size === 0) return;

	const tree = buildMapTree([...graph.nodes.values()], [...graph.edges.values()], graph.direction);
	const vertical = graph.direction === 'TOP_BOTTOM';
	const isAnchored = (id: string) => anchorHostId(graph.nodes.get(id)!, graph.nodes) !== null;
	const toPlace = (id: string) => graph.placeIds.has(id) && !isAnchored(id);

	const groups = new Map<string | null, string[]>();
	for (const id of graph.placeIds) {
		if (!toPlace(id)) continue;
		const parent = tree.parentOf.get(id) ?? null;
		if (parent && toPlace(parent)) continue;
		groups.set(parent, [...(groups.get(parent) ?? []), id]);
	}

	const existingIds = [...graph.nodes.keys()].filter((id) => !graph.placeIds.has(id));

	for (const [attachId, rootIds] of groups) {
		const members = subtreeOf(tree, rootIds, toPlace);
		const positions = layoutGroup(graph, tree, members, attachId);

		let dx = 0;
		let dy = 0;
		if (attachId) {
			const anchor = positionOf(graph.nodes.get(attachId)!);
			const laidOut = positions.get(attachId)!;
			dx = anchor.x - laidOut.x;
			dy = anchor.y - laidOut.y;

			// Start past the parent's other children instead of on top of them.
			const others = subtreeOf(
				tree,
				(tree.children.get(attachId) ?? []).filter((id) => !graph.placeIds.has(id)),
				(id) => !graph.placeIds.has(id)
			);
			const taken = bounds(graph, others);
			if (taken) {
				const newMin = Math.min(...members.map((id) => (vertical ? positions.get(id)!.x + dx : positions.get(id)!.y + dy)));
				const needed = (vertical ? taken.maxX : taken.maxY) + SIBLING_GAP;
				if (newMin < needed) {
					if (vertical) dx += needed - newMin;
					else dy += needed - newMin;
				}
			}
		} else {
			const taken = bounds(graph, existingIds);
			if (taken) {
				const minX = Math.min(...members.map((id) => positions.get(id)!.x));
				const minY = Math.min(...members.map((id) => positions.get(id)!.y));
				dx = vertical ? taken.minX - minX : taken.maxX + ROOT_GAP - minX;
				dy = vertical ? taken.maxY + ROOT_GAP - minY : taken.minY - minY;
			}
		}

		for (const id of members) {
			const position = positions.get(id)!;
			setPosition(graph, id, position.x + dx, position.y + dy);
		}
	}

	const stackedByHost = new Map<string, number>();
	for (const id of graph.placeIds) {
		const hostId = isAnchored(id) ? anchorHostId(graph.nodes.get(id)!, graph.nodes) : null;
		if (!hostId) continue;
		const host = positionOf(graph.nodes.get(hostId)!);
		const offsetY = stackedByHost.get(hostId) ?? 0;
		const offset = { x: sizeOf(graph, hostId).width + DEFAULT_ANCHOR_GAP, y: offsetY };
		const node = graph.nodes.get(id)!;
		graph.nodes.set(id, { ...node, metadata: { ...node.metadata, anchorOffset: offset } });
		setPosition(graph, id, host.x + offset.x, host.y + offset.y);
		stackedByHost.set(hostId, offsetY + sizeOf(graph, id).height + ANNOTATION_STACK_GAP);
	}
}
