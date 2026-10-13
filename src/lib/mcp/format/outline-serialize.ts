import type { EdgeData } from '@/types/edge-data';
import type { NodeData } from '@/types/node-data';
import type { MapTree } from '../graph/tree';
import { nodeToOutlineText } from './node-text';

export interface OutlineOptions {
	rootId?: string;
	/** Levels below the start node(s) to include; 0 = only the start node(s). */
	depth?: number;
	maxNodes: number;
	detail: 'brief' | 'full';
}

export interface OutlineResult {
	text: string;
	shownNodeIds: Set<string>;
	totalNodes: number;
	shownLinks: number;
	totalLinks: number;
}

const BRIEF_HEAD_CHARS = 160;
const BRIEF_BODY_CHARS = 120;
const BRIEF_TASKS = 8;
const INDENT = '  ';

const truncate = (text: string, max: number) =>
	text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

const oneLine = (text: string) => text.replace(/\s*\n\s*/g, ' ').trim();

function countSubtrees(tree: MapTree, nodeIds: string[]): Map<string, number> {
	const sizes = new Map<string, number>();
	const visitedOrder: string[] = [];
	const seen = new Set<string>();
	const stack = [...nodeIds];
	while (stack.length > 0) {
		const id = stack.pop()!;
		if (seen.has(id)) continue;
		seen.add(id);
		visitedOrder.push(id);
		stack.push(...(tree.children.get(id) ?? []));
	}
	for (const id of visitedOrder.reverse()) {
		const childTotal = (tree.children.get(id) ?? []).reduce(
			(sum, childId) => sum + (sizes.get(childId) ?? 0),
			0
		);
		sizes.set(id, 1 + childTotal);
	}
	return sizes;
}

/** Edges listed after `---`: every non-tree edge, plus tree edges with a label. */
export function isListedLink(edge: EdgeData, tree: MapTree): boolean {
	return !tree.treeEdgeIds.has(edge.id) || Boolean(edge.label?.trim());
}

export function formatLink(edge: EdgeData, shortIds: Map<string, string>): string {
	const label = edge.label?.trim() ? ` : ${oneLine(edge.label)}` : '';
	return `${shortIds.get(edge.source)} -> ${shortIds.get(edge.target)}${label}`;
}

/**
 * Prints a map (or one branch) as an indented outline. When the map is bigger
 * than `maxNodes`, nodes are picked level by level so the reader always sees
 * the top of the map, and each cut branch says how much is hidden below it.
 */
export function serializeOutline(
	nodes: NodeData[],
	edges: EdgeData[],
	tree: MapTree,
	shortIds: Map<string, string>,
	options: OutlineOptions
): OutlineResult {
	const nodesById = new Map(nodes.map((node) => [node.id, node]));
	const startIds = options.rootId ? [options.rootId] : tree.roots;
	const subtreeSizes = countSubtrees(tree, startIds);
	const totalNodes = startIds.reduce((sum, id) => sum + (subtreeSizes.get(id) ?? 0), 0);

	const selected = new Set<string>();
	const queue = startIds.map((id) => ({ id, level: 0 }));
	for (let i = 0; i < queue.length && selected.size < options.maxNodes; i++) {
		const { id, level } = queue[i];
		selected.add(id);
		if (options.depth === undefined || level < options.depth) {
			for (const childId of tree.children.get(id) ?? []) {
				queue.push({ id: childId, level: level + 1 });
			}
		}
	}

	const lines: string[] = [];
	const brief = options.detail === 'brief';

	const writeNode = (id: string, level: number) => {
		const node = nodesById.get(id);
		if (!node) return;
		const indent = INDENT.repeat(level);
		const inner = indent + INDENT;
		const text = nodeToOutlineText(node);

		lines.push(`${indent}[${shortIds.get(id)}] ${brief ? truncate(text.head, BRIEF_HEAD_CHARS) : text.head}`);

		if (brief && text.body.length > 0) {
			const more = text.body.length > 1 ? ` (+${text.body.length - 1} lines)` : '';
			lines.push(`${inner}| ${truncate(text.body[0], BRIEF_BODY_CHARS)}${more}`);
		} else {
			for (const line of text.body) lines.push(`${inner}| ${line}`);
		}

		const tasks = brief ? text.tasks.slice(0, BRIEF_TASKS) : text.tasks;
		for (const task of tasks) lines.push(`${inner}[${task.done ? 'x' : ' '}] ${task.text}`);
		if (tasks.length < text.tasks.length) {
			lines.push(`${inner}… +${text.tasks.length - tasks.length} more tasks`);
		}

		const children = tree.children.get(id) ?? [];
		let hidden = 0;
		for (const childId of children) {
			if (selected.has(childId)) writeNode(childId, level + 1);
			else hidden += subtreeSizes.get(childId) ?? 1;
		}
		if (hidden > 0) {
			lines.push(`${inner}… ${hidden} more below (read_map root:${shortIds.get(id)})`);
		}
	};

	for (const id of startIds) {
		if (selected.has(id)) writeNode(id, 0);
	}

	const listed = edges.filter((edge) => isListedLink(edge, tree));
	const inScope = listed.filter(
		(edge) => subtreeSizes.has(edge.source) && subtreeSizes.has(edge.target)
	);
	const shownLinks = inScope.filter(
		(edge) => selected.has(edge.source) && selected.has(edge.target)
	);
	if (shownLinks.length > 0) {
		lines.push('---');
		for (const edge of shownLinks) lines.push(formatLink(edge, shortIds));
	}

	const hiddenNodes = totalNodes - selected.size;
	const hiddenLinks = inScope.length - shownLinks.length;
	if (hiddenNodes > 0 || hiddenLinks > 0) {
		lines.push(
			`(${hiddenNodes} nodes and ${hiddenLinks} links not shown. Narrow with root/depth, raise maxNodes, or use search_nodes / read_nodes.)`
		);
	}

	return {
		text: lines.join('\n'),
		shownNodeIds: selected,
		totalNodes,
		shownLinks: shownLinks.length,
		totalLinks: inScope.length,
	};
}
