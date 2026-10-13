import { z } from 'zod';
import { buildMapShortIds, listAccessibleMaps } from '../graph/maps';
import { defineMcpTool } from '../tool-types';

export const listMapsTool = defineMcpTool({
	name: 'list_maps',
	kind: 'read',
	summary: 'List your maps and maps shared with you (id, title, size, your role).',
	keywords: ['maps', 'find', 'open', 'shared', 'browse'],
	input: z.strictObject({
		query: z.string().trim().optional().describe('Only maps whose title contains this text'),
		limit: z.number().int().min(1).max(50).default(20),
		cursor: z
			.string()
			.regex(/^\d+$/)
			.optional()
			.describe('From the previous page ("More: …" line)'),
	}),
	example: { query: 'novel', limit: 20 },
	async run({ query, limit, cursor }, ctx) {
		const maps = await listAccessibleMaps(ctx.supabase, ctx.userId);
		const shortIds = buildMapShortIds(maps);
		const needle = query?.toLowerCase();
		const matching = needle
			? maps.filter((map) => map.title.toLowerCase().includes(needle))
			: maps;

		if (matching.length === 0) {
			return needle
				? `No maps with "${query}" in the title. ${maps.length} maps in total.`
				: 'You have no maps yet. Create one with create_map.';
		}

		const offset = cursor ? Number(cursor) : 0;
		const page = matching.slice(offset, offset + limit);
		const lines = [
			`${matching.length} maps, newest first. id | title | nodes | your role | updated`,
			...page.map(
				(map) =>
					`${shortIds.get(map.id)} | ${map.title} | ${map.nodeCount} | ${map.role} | ${map.updatedAt.slice(0, 10)}`
			),
		];
		if (offset + limit < matching.length) {
			lines.push(`More: list_maps {cursor:"${offset + limit}"}`);
		}
		return lines.join('\n');
	},
});
