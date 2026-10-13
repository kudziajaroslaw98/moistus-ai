import { z } from 'zod';
import type { NodeData } from '@/types/node-data';
import { nodeLabel, nodeToOutlineText } from '../format/node-text';
import { loadMapForCaller, resolveNodeId, type LoadedMap } from '../graph/loaded-map';
import { buildMapTree } from '../graph/tree';
import { defineMcpTool } from '../tool-types';

const WORD_TOKEN = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

/** Fields the outline syntax can't carry, so agents still see them. */
function metaParts(node: NodeData, loaded: LoadedMap): string[] {
	const metadata = node.metadata ?? {};
	const parts: string[] = [];
	if (metadata.isCollapsed) parts.push('collapsed');
	if (metadata.groupId) {
		parts.push(`in group ${loaded.shortIds.get(metadata.groupId) ?? metadata.groupId}`);
	}
	if (metadata.answer) parts.push(`answer: ${JSON.stringify(metadata.answer)}`);
	const oddTags = (metadata.tags ?? []).filter((tag) => !WORD_TOKEN.test(tag));
	if (oddTags.length > 0) parts.push(`tags: ${oddTags.map((tag) => JSON.stringify(tag)).join(', ')}`);
	if (node.node_type === 'extensionNode') {
		parts.push('plugin node: its data belongs to the plugin and is not shown or editable here');
	}
	return parts;
}

export const readNodesTool = defineMcpTool({
	name: 'read_nodes',
	kind: 'read',
	summary: 'Read full text, links and extra fields of specific nodes.',
	keywords: ['node', 'details', 'full', 'text', 'links', 'edges', 'content'],
	input: z.strictObject({
		map: z.string().describe('Map id'),
		ids: z.array(z.string()).min(1).max(50).describe('Node ids from read_map'),
	}),
	example: { map: 'a1b2c3', ids: ['d4e5f6', '77e01a'] },
	async run({ map, ids }, ctx) {
		const loaded = await loadMapForCaller(ctx, map);
		const nodesById = new Map(loaded.nodes.map((node) => [node.id, node]));
		const tree = buildMapTree(loaded.nodes, loaded.edges, loaded.map.layoutDirection);
		const short = (id: string) => loaded.shortIds.get(id) ?? id;
		const linkText = (id: string, label: string | null | undefined) =>
			label?.trim() ? `${short(id)} "${label.trim()}"` : short(id);

		const blocks = [...new Set(ids.map((id) => resolveNodeId(loaded, id)))].map((id) => {
			const node = nodesById.get(id)!;
			const text = nodeToOutlineText(node);
			const lines = [`[${short(id)}] ${text.head}`];
			for (const line of text.body) lines.push(`  | ${line}`);
			for (const task of text.tasks) lines.push(`  [${task.done ? 'x' : ' '}] ${task.text}`);

			const parentId = tree.parentOf.get(id);
			if (parentId) lines.push(`  under: ${short(parentId)} (${nodeLabel(nodesById.get(parentId)!)})`);
			const children = tree.children.get(id) ?? [];
			if (children.length > 0) lines.push(`  children: ${children.map(short).join(', ')}`);

			const incoming = loaded.edges.filter((edge) => edge.target === id);
			const outgoing = loaded.edges.filter((edge) => edge.source === id);
			if (incoming.length > 0) {
				lines.push(`  links in: ${incoming.map((edge) => linkText(edge.source, edge.label)).join(', ')}`);
			}
			if (outgoing.length > 0) {
				lines.push(`  links out: ${outgoing.map((edge) => linkText(edge.target, edge.label)).join(', ')}`);
			}

			const meta = metaParts(node, loaded);
			if (meta.length > 0) lines.push(`  meta: ${meta.join(' · ')}`);
			return lines.join('\n');
		});

		return blocks.join('\n\n');
	},
});
