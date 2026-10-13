import { z } from 'zod';
import { McpToolError } from '../errors';
import { resolveMapId } from '../graph/maps';
import { defineMcpTool } from '../tool-types';

export const updateMapInfoTool = defineMcpTool({
	name: 'update_map_info',
	kind: 'write',
	summary: "Rename a map or change its description or tags (owner only).",
	keywords: ['rename', 'title', 'description', 'tags', 'map', 'info', 'settings'],
	input: z
		.strictObject({
			map: z.string().describe('Map id'),
			title: z.string().trim().min(1).max(200).optional(),
			description: z.string().trim().max(2000).nullable().optional().describe('null clears it'),
			tags: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
		})
		.refine((args) => args.title !== undefined || args.description !== undefined || args.tags !== undefined, {
			message: 'Give at least one of title, description or tags.',
		}),
	example: { map: 'a1b2c3', title: 'Dune: full cast' },
	async run({ map, title, description, tags }, ctx) {
		const mapId = await resolveMapId(ctx.supabase, ctx.userId, map);
		const { data: current, error: readError } = await ctx.supabase
			.from('mind_maps')
			.select('id, user_id, title')
			.eq('id', mapId)
			.maybeSingle<{ id: string; user_id: string | null; title: string }>();
		if (readError) throw new McpToolError(`Could not load the map: ${readError.message}`);
		if (!current) throw new McpToolError('Map not found, or you no longer have access to it.');
		if (current.user_id !== ctx.userId) {
			throw new McpToolError("Only the map's owner can change its title, description or tags.");
		}

		const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
		if (title !== undefined) update.title = title;
		if (description !== undefined) update.description = description || null;
		if (tags !== undefined) update.tags = tags.length > 0 ? tags : null;

		const { error } = await ctx.supabase.from('mind_maps').update(update).eq('id', mapId);
		if (error) throw new McpToolError(`Could not update the map: ${error.message}`);

		const changed = [
			title !== undefined ? `title "${title}"` : null,
			description !== undefined ? (description ? 'description' : 'description cleared') : null,
			tags !== undefined ? `tags: ${tags.length > 0 ? tags.join(', ') : 'none'}` : null,
		].filter(Boolean);
		return `Updated "${current.title}": ${changed.join(', ')}.`;
	},
});
