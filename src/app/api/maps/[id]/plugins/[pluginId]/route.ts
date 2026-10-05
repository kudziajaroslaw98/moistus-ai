import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import { findCatalogPlugin } from '@/lib/plugins/catalog';
import type { MapPluginRecord } from '@/types/plugins';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

type MapPluginParams = { id: string; pluginId: string };

const mapIdSchema = z.string().uuid();

async function isMapOwner(
	supabase: SupabaseClient,
	mapId: string,
	userId: string
) {
	const { data } = await supabase
		.from('mind_maps')
		.select('id')
		.eq('id', mapId)
		.eq('user_id', userId)
		.maybeSingle();
	return Boolean(data);
}

/** Turn a first-party plugin on for a map. Owner only; the version comes from the catalog. */
export const PUT = withApiValidation<
	Record<string, never>,
	MapPluginRecord,
	MapPluginParams
>(z.object({}), async (_req, _body, supabase, user, params) => {
	if (user.is_anonymous) {
		return respondError(
			'Create an account to use plugins.',
			403,
			'Anonymous user'
		);
	}
	const mapId = mapIdSchema.safeParse(params?.id);
	const plugin = findCatalogPlugin(params?.pluginId ?? '');
	if (!mapId.success) return respondError('Map not found.', 404);
	if (!plugin) return respondError('Unknown plugin.', 404);
	if (!(await isMapOwner(supabase, mapId.data, user.id))) {
		return respondError('Only the map owner can change plugins.', 403);
	}

	const { error } = await supabase.from('map_plugins').upsert(
		{
			map_id: mapId.data,
			plugin_id: plugin.id,
			version: plugin.version,
			enabled_by: user.id,
		},
		{ onConflict: 'map_id,plugin_id' }
	);
	if (error)
		return respondError('Failed to turn the plugin on.', 500, error.message);
	return respondSuccess({ pluginId: plugin.id, version: plugin.version });
});

/** Turn a plugin off for a map. Its nodes stay and show their last saved view. */
export const DELETE = withApiValidation<
	Record<string, never>,
	{ pluginId: string },
	MapPluginParams
>(z.object({}), async (_req, _body, supabase, user, params) => {
	const mapId = mapIdSchema.safeParse(params?.id);
	const pluginId = params?.pluginId ?? '';
	if (!mapId.success) return respondError('Map not found.', 404);
	if (!(await isMapOwner(supabase, mapId.data, user.id))) {
		return respondError('Only the map owner can change plugins.', 403);
	}

	const { error } = await supabase
		.from('map_plugins')
		.delete()
		.eq('map_id', mapId.data)
		.eq('plugin_id', pluginId);
	if (error)
		return respondError('Failed to turn the plugin off.', 500, error.message);
	return respondSuccess({ pluginId });
});
