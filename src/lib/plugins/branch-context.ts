import {
	getBranchIndex,
	getNodeOutlineText,
} from '@/helpers/collapse/branch-index';
import { localDateString } from '@/lib/plugins/call-context';
import { PLUGIN_BRANCH_LIMITS } from '@/lib/plugins/limits';
import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';

/**
 * `ctx.branch` for plugins with the `branch:read` power: a compact, read-only list of the
 * nodes under the plugin's node (depth first). Nothing here leaves the browser, because a
 * plugin that reads the branch can never reach a site.
 */


export interface PluginBranchNode {
	id: string;
	/** 1 for the node's children, 2 for theirs, and so on. */
	depth: number;
	/** "note", "task", "question"… ("plugin" for plugin nodes). */
	type: string;
	text: string;
	tasks: { done: number; total: number } | null;
	status: string | null;
	priority: string | null;
	/** People named with @. */
	assignees: string[];
	/** YYYY-MM-DD from ^date, or null. */
	due: string | null;
	tags: string[];
}

function nodeTypeName(node: AppNode): string {
	const type = node.data.node_type ?? node.type ?? 'defaultNode';
	if (type === 'defaultNode') return 'note';
	if (type === 'extensionNode') return 'plugin';
	return type.replace(/Node$/, '');
}

function stringList(value: unknown): string[] {
	if (typeof value === 'string') return value ? [value] : [];
	return Array.isArray(value)
		? value.filter((item): item is string => typeof item === 'string')
		: [];
}

/**
 * ^date is stored as the viewer's local midnight in UTC ("^friday" here is
 * 2026-10-08T22:00:00Z), so the calendar day is read in local time, as typed.
 */
function dueDate(value: unknown): string | null {
	if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
	const date =
		value instanceof Date ? value : typeof value === 'string' ? new Date(value) : null;
	return date && !Number.isNaN(date.getTime()) ? localDateString(date) : null;
}

function fullText(node: AppNode): string {
	// The outline text is trimmed to 80 characters; plugins get up to 500.
	const metadata = node.data.metadata;
	const raw =
		(typeof metadata?.title === 'string' && metadata.title) ||
		(typeof node.data.content === 'string' && node.data.content) ||
		getNodeOutlineText(node);
	const text = raw
		.replace(/<[^>]*>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
	return text.slice(0, PLUGIN_BRANCH_LIMITS.text);
}

/** The branch under `rootId`, following the same structure as collapse (cycle-safe). */
export function buildPluginBranch(
	rootId: string,
	nodes: readonly AppNode[],
	edges: readonly AppEdge[]
): PluginBranchNode[] {
	const { childIdsById } = getBranchIndex(nodes, edges);
	const nodeById = new Map(nodes.map((node) => [node.id, node]));
	const result: PluginBranchNode[] = [];
	const visited = new Set([rootId]);
	const stack: Array<{ id: string; depth: number }> = (
		childIdsById.get(rootId) ?? []
	)
		.map((id) => ({ id, depth: 1 }))
		.reverse();

	while (stack.length > 0 && result.length < PLUGIN_BRANCH_LIMITS.nodes) {
		const { id, depth } = stack.pop()!;
		const node = nodeById.get(id);
		if (!node || visited.has(id)) continue;
		visited.add(id);

		const metadata = node.data.metadata;
		const tasks = Array.isArray(metadata?.tasks) ? metadata.tasks : [];
		const status = metadata?.status ?? node.data.status;
		const priority = metadata?.priority ?? node.data.priority;
		result.push({
			id,
			depth,
			type: nodeTypeName(node),
			text: fullText(node),
			tasks:
				tasks.length > 0
					? {
							done: tasks.filter((task) => task.isComplete).length,
							total: tasks.length,
						}
					: null,
			status: typeof status === 'string' && status ? status : null,
			priority: typeof priority === 'string' && priority ? priority : null,
			assignees: stringList(metadata?.assignee),
			due: dueDate(metadata?.dueDate),
			tags: stringList(metadata?.tags),
		});

		const children = childIdsById.get(id) ?? [];
		for (let index = children.length - 1; index >= 0; index -= 1) {
			stack.push({ id: children[index], depth: depth + 1 });
		}
	}
	return result;
}
