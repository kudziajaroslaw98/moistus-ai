import { z } from 'zod';
import { serializeOutline } from '../format/outline-serialize';
import { loadMapForCaller, resolveNodeId, type LoadedMap } from '../graph/loaded-map';
import { buildMapTree } from '../graph/tree';
import { defineMcpTool } from '../tool-types';

const DIRECTION_LABELS = { LEFT_RIGHT: 'left to right', TOP_BOTTOM: 'top to bottom' } as const;

export function formatMapHeader(loaded: LoadedMap, linkCount: number): string {
	const { map, access } = loaded;
	const parts = [
		`# ${map.title}`,
		`map ${loaded.mapRef}`,
		`${loaded.nodes.length} nodes`,
		`${linkCount} links`,
		map.layoutDirection ? `layout ${DIRECTION_LABELS[map.layoutDirection]}` : null,
		`you: ${access.role}${access.canEdit ? ' (can edit)' : ' (read-only)'}`,
	];
	return parts.filter(Boolean).join(' · ');
}

export const readMapTool = defineMcpTool({
	name: 'read_map',
	kind: 'read',
	summary:
		'Read a map as an indented outline (the same syntax edit_map accepts), with links after ---.',
	keywords: ['outline', 'tree', 'nodes', 'structure', 'view', 'open', 'export'],
	input: z.strictObject({
		map: z.string().describe('Map id from list_maps'),
		root: z.string().optional().describe('Only this node and what is under it'),
		depth: z.number().int().min(0).max(50).optional().describe('Levels below the start to include'),
		maxNodes: z.number().int().min(1).max(1000).default(300),
		detail: z
			.enum(['brief', 'full'])
			.default('brief')
			.describe('brief trims long text; full prints everything'),
	}),
	example: { map: 'a1b2c3', depth: 2 },
	async run({ map, root, depth, maxNodes, detail }, ctx) {
		const loaded = await loadMapForCaller(ctx, map);
		if (loaded.nodes.length === 0) {
			return `${formatMapHeader(loaded, 0)}\n(The map is empty.)`;
		}

		const tree = buildMapTree(loaded.nodes, loaded.edges, loaded.map.layoutDirection);
		const outline = serializeOutline(loaded.nodes, loaded.edges, tree, loaded.shortIds, {
			rootId: root ? resolveNodeId(loaded, root) : undefined,
			depth,
			maxNodes,
			detail,
		});

		const lines = [formatMapHeader(loaded, loaded.edges.length)];
		if (loaded.map.description?.trim()) {
			lines.push(`> ${loaded.map.description.trim().replace(/\s*\n\s*/g, ' ')}`);
		}
		lines.push(outline.text);
		return lines.join('\n');
	},
});
