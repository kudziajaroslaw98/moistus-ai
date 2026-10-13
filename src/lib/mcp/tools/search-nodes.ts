import { z } from 'zod';
import type { NodeData } from '@/types/node-data';
import { McpToolError } from '../errors';
import { NODE_TYPE_TRIGGERS, nodeToOutlineText } from '../format/node-text';
import { loadMapForCaller } from '../graph/loaded-map';
import { buildMapShortIds, listAccessibleMaps } from '../graph/maps';
import { isVisibleNode } from '../graph/types';
import { defineMcpTool } from '../tool-types';

const RESULT_CHARS = 120;
/** Cross-map results print 8-char node ids; any unique prefix resolves later. */
const CROSS_MAP_ID_CHARS = 8;

const NODE_TYPE_BY_NAME = new Map(
	Object.entries(NODE_TYPE_TRIGGERS).map(([nodeType, trigger]) => [trigger.slice(1), nodeType])
);

function toNodeType(name: string | undefined): string | undefined {
	if (!name) return undefined;
	const nodeType = NODE_TYPE_BY_NAME.get(name.replace(/^\$/, '').toLowerCase());
	if (!nodeType) {
		throw new McpToolError(
			`Unknown type "${name}". Use one of: ${[...NODE_TYPE_BY_NAME.keys()].join(', ')}.`
		);
	}
	return nodeType;
}

const summarize = (node: NodeData) => {
	const text = nodeToOutlineText(node);
	const line = text.body.length > 0 ? `${text.head} | ${text.body[0]}` : text.head;
	return line.length > RESULT_CHARS ? `${line.slice(0, RESULT_CHARS - 1)}…` : line;
};

function searchableText(node: NodeData): string {
	const metadata = node.metadata ?? {};
	return [
		node.content,
		metadata.title,
		...(metadata.tags ?? []),
		...(metadata.tasks ?? []).map((task) => task.text),
	]
		.filter(Boolean)
		.join(' ')
		.toLowerCase();
}

export const searchNodesTool = defineMcpTool({
	name: 'search_nodes',
	kind: 'read',
	summary: 'Find nodes by text, type or tag in one map, or across all your maps.',
	keywords: ['find', 'search', 'query', 'lookup', 'tag', 'type', 'filter'],
	input: z.strictObject({
		query: z.string().trim().min(1).describe('Words to find (all must match)'),
		map: z.string().optional().describe('Search one map; omit to search all your maps'),
		type: z.string().optional().describe('e.g. task, question, annotation, note'),
		tag: z.string().optional().describe('Tag without #'),
		limit: z.number().int().min(1).max(50).default(20),
	}),
	example: { query: 'letter', map: 'a1b2c3', type: 'question' },
	async run({ query, map, type, tag, limit }, ctx) {
		const nodeType = toNodeType(type);
		const wantedTag = tag?.replace(/^#/, '');

		if (map) {
			const loaded = await loadMapForCaller(ctx, map);
			const words = query.toLowerCase().split(/\s+/).filter(Boolean);
			const matches = loaded.nodes.filter((node) => {
				if (nodeType && (node.node_type ?? 'defaultNode') !== nodeType) return false;
				if (wantedTag && !(node.metadata?.tags ?? []).includes(wantedTag)) return false;
				const haystack = searchableText(node);
				return words.every((word) => haystack.includes(word));
			});
			if (matches.length === 0) return `No nodes match "${query}" in map ${loaded.mapRef}.`;

			const lines = matches
				.slice(0, limit)
				.map((node) => `[${loaded.shortIds.get(node.id)}] ${summarize(node)}`);
			if (matches.length > limit) lines.push(`(${matches.length - limit} more; raise limit)`);
			return lines.join('\n');
		}

		const maps = await listAccessibleMaps(ctx.supabase, ctx.userId);
		if (maps.length === 0) return 'You have no maps to search.';
		const mapShortIds = buildMapShortIds(maps);
		const titles = new Map(maps.map((entry) => [entry.id, entry.title]));

		let request = ctx.supabase
			.from('nodes')
			.select('id, map_id, content, node_type, metadata, parent_id, position_x, position_y, created_at, updated_at')
			.in('map_id', maps.map((entry) => entry.id))
			.textSearch('content_tsv', query, { type: 'websearch', config: 'english' })
			.limit(limit);
		if (nodeType) request = request.eq('node_type', nodeType);
		if (wantedTag) request = request.contains('metadata', { tags: [wantedTag] });

		const { data, error } = await request.returns<NodeData[]>();
		if (error) throw new McpToolError(`Search failed: ${error.message}`);

		const nodes = (data ?? []).filter(isVisibleNode);
		if (nodes.length === 0) {
			return `No nodes match "${query}" in your maps. Full-text search matches whole words; try fewer or simpler words.`;
		}
		return nodes
			.map(
				(node) =>
					`map ${mapShortIds.get(node.map_id)} (${titles.get(node.map_id)}) · [${node.id.replace(/-/g, '').slice(0, CROSS_MAP_ID_CHARS)}] ${summarize(node)}`
			)
			.join('\n');
	},
});
