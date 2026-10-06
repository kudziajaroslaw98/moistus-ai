import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import {
	compareVersions,
	findCatalogPlugin,
	findCatalogVersion,
	latestCatalogVersion,
	powersConfirmed,
} from '@/lib/plugins/catalog';
import type { MapPluginRecord } from '@/types/plugins';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { z } from 'zod';

type MapPluginParams = { id: string; pluginId: string };

const mapIdSchema = z.string().uuid();
/** The powers the owner saw and approved; required for plugins beyond their own nodes. */
const permissionsSchema = z.array(z.string().max(270)).max(8).optional();
const enableBodySchema = z.object({ permissions: permissionsSchema });
const versionBodySchema = z.object({
	version: z.string().regex(/^\d+\.\d+\.\d+$/),
	permissions: permissionsSchema,
});

const powersNotConfirmed = () =>
	respondError(
		'This plugin’s powers changed. Reload the page and review them again.',
		409
	);

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

const guestError = (user: User) =>
	user.is_anonymous
		? respondError('Create an account to use plugins.', 403, 'Anonymous user')
		: null;

/** Turn a first-party plugin on for a map, pinned to its latest version. Owner only. */
export const PUT = withApiValidation<
	z.infer<typeof enableBodySchema>,
	MapPluginRecord,
	MapPluginParams
>(enableBodySchema, async (_req, body, supabase, user, params) => {
	const guest = guestError(user);
	if (guest) return guest;
	const mapId = mapIdSchema.safeParse(params?.id);
	const plugin = findCatalogPlugin(params?.pluginId ?? '');
	if (!mapId.success) return respondError('Map not found.', 404);
	if (!plugin) return respondError('Unknown plugin.', 404);
	if (!(await isMapOwner(supabase, mapId.data, user.id))) {
		return respondError('Only the map owner can change plugins.', 403);
	}

	const { version, permissions } = latestCatalogVersion(plugin);
	if (!powersConfirmed(permissions, body.permissions)) return powersNotConfirmed();
	const updatedAt = new Date().toISOString();
	const { error } = await supabase.from('map_plugins').upsert(
		{
			map_id: mapId.data,
			plugin_id: plugin.id,
			version,
			previous_version: null,
			updated_at: updatedAt,
			enabled_by: user.id,
		},
		{ onConflict: 'map_id,plugin_id' }
	);
	if (error)
		return respondError('Failed to turn the plugin on.', 500, error.message);
	return respondSuccess({
		pluginId: plugin.id,
		version,
		previousVersion: null,
		updatedAt,
	});
});

/**
 * Move a map to another catalog version of a plugin that's on: Update or Roll back.
 * Owner only. Updating remembers the old version so the owner can roll back to it.
 */
export const PATCH = withApiValidation<
	z.infer<typeof versionBodySchema>,
	MapPluginRecord,
	MapPluginParams
>(versionBodySchema, async (_req, body, supabase, user, params) => {
	const guest = guestError(user);
	if (guest) return guest;
	const mapId = mapIdSchema.safeParse(params?.id);
	const pluginId = params?.pluginId ?? '';
	if (!mapId.success) return respondError('Map not found.', 404);
	const target = findCatalogVersion(pluginId, body.version);
	if (!target) return respondError('Unknown plugin version.', 404);
	if (!powersConfirmed(target.permissions, body.permissions)) return powersNotConfirmed();
	if (!(await isMapOwner(supabase, mapId.data, user.id))) {
		return respondError('Only the map owner can change plugins.', 403);
	}

	const { data: current, error: readError } = await supabase
		.from('map_plugins')
		.select('version, previous_version, updated_at')
		.eq('map_id', mapId.data)
		.eq('plugin_id', pluginId)
		.maybeSingle();
	if (readError)
		return respondError('Failed to change the plugin.', 500, readError.message);
	if (!current) return respondError('Turn the plugin on first.', 404);
	if (current.version === body.version) {
		return respondSuccess({
			pluginId,
			version: current.version,
			previousVersion: current.previous_version,
			updatedAt: current.updated_at,
		});
	}

	const previousVersion =
		compareVersions(body.version, current.version) > 0 ? current.version : null;
	const updatedAt = new Date().toISOString();
	const { error } = await supabase
		.from('map_plugins')
		.update({
			version: body.version,
			previous_version: previousVersion,
			updated_at: updatedAt,
			enabled_by: user.id,
		})
		.eq('map_id', mapId.data)
		.eq('plugin_id', pluginId);
	if (error)
		return respondError('Failed to change the plugin.', 500, error.message);
	return respondSuccess({
		pluginId,
		version: body.version,
		previousVersion,
		updatedAt,
	});
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
