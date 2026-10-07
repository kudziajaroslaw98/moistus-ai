import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import { createNotifications } from '@/lib/notifications/notification-service';
import { findCatalogPlugin } from '@/lib/plugins/catalog';
import { requirePluginAdmin } from '@/lib/plugins/server/require-plugin-admin';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

const target = {
	pluginId: z.string().max(80),
	version: z
		.string()
		.regex(/^\d+\.\d+\.\d+$/)
		.nullable(),
};
const actionSchema = z.discriminatedUnion('action', [
	z.object({
		action: z.literal('disable'),
		...target,
		reason: z.string().trim().min(1).max(300),
	}),
	z.object({ action: z.literal('enable'), ...target }),
	z.object({ action: z.literal('dismiss'), ...target }),
]);
type Action = z.infer<typeof actionSchema>;

/** Closes the open reports a decision answers (every version when the whole plugin is off). */
async function closeReports(
	admin: SupabaseClient,
	{ pluginId, version }: Action,
	status: 'dismissed' | 'actioned',
	userId: string
) {
	let query = admin
		.from('plugin_reports')
		.update({
			status,
			resolved_by: userId,
			resolved_at: new Date().toISOString(),
		})
		.eq('plugin_id', pluginId)
		.eq('status', 'open');
	if (version) query = query.eq('version', version);
	await query;
}

/** Tells the owner of every affected map what happened and that nothing else changed. */
async function notifyOwners(
	admin: SupabaseClient,
	action: Extract<Action, { action: 'disable' }>,
	name: string,
	userId: string,
	stamp: string
) {
	let query = admin
		.from('map_plugins')
		.select('map_id')
		.eq('plugin_id', action.pluginId);
	if (action.version) query = query.eq('version', action.version);
	const { data: rows } = await query;
	const mapIds = ((rows ?? []) as Array<{ map_id: string }>).map(
		(row) => row.map_id
	);
	if (mapIds.length === 0) return 0;

	const [{ data: maps }, { data: nodes }] = await Promise.all([
		admin.from('mind_maps').select('id, user_id, title').in('id', mapIds),
		admin
			.from('nodes')
			.select('map_id')
			.in('map_id', mapIds)
			.eq('metadata->extension->>pluginId', action.pluginId),
	]);
	const nodeCount = (mapId: string) =>
		((nodes ?? []) as Array<{ map_id: string }>).filter(
			(node) => node.map_id === mapId
		).length;
	const reason = /[.!?]$/.test(action.reason)
		? action.reason
		: `${action.reason}.`;

	await createNotifications(
		(
			(maps ?? []) as Array<{
				id: string;
				user_id: string;
				title: string | null;
			}>
		).map((map) => {
			const count = nodeCount(map.id);
			return {
				recipientUserId: map.user_id,
				actorUserId: userId,
				mapId: map.id,
				eventType: 'plugin_disabled' as const,
				title: `Shiko turned off ${name} on ${map.title || 'Untitled map'}`,
				body: `${reason} ${count === 1 ? 'Its node shows its' : `Its ${count} nodes show their`} last saved view. Nothing else on the map changed.`,
				metadata: { pluginId: action.pluginId, version: action.version },
				dedupeKey: `plugin_disabled:${action.pluginId}:${action.version ?? 'all'}:${map.id}:${stamp}`,
			};
		})
	);
	return mapIds.length;
}

/**
 * Shiko's reviewers act on reports: turn a plugin (or one version) off everywhere, turn
 * it back on, or dismiss the reports. Turned-off code stops loading on every map, its
 * nodes show their saved view and map owners are told why.
 */
export const POST = withApiValidation<Action, { affectedMaps: number }>(
	actionSchema,
	async (_req, body, _supabase, user) => {
		const gate = await requirePluginAdmin(user);
		if ('response' in gate) return gate.response;
		const { admin } = gate;

		const shiko = findCatalogPlugin(body.pluginId);
		const { data: plugin } = await admin
			.from('plugins')
			.select('id, name')
			.eq('id', body.pluginId)
			.maybeSingle();
		if (!shiko && !plugin) return respondError('Unknown plugin.', 404);
		if (shiko && body.version) {
			return respondError(
				'Shiko’s own plugins are turned off as a whole.',
				400
			);
		}
		const name =
			shiko?.name ?? (plugin?.name as string | undefined) ?? body.pluginId;

		if (body.action === 'dismiss') {
			await closeReports(admin, body, 'dismissed', user.id);
			return respondSuccess({ affectedMaps: 0 });
		}

		const now = new Date().toISOString();
		const fields =
			body.action === 'disable'
				? {
						disabled_reason: body.reason,
						disabled_at: now,
						disabled_by: user.id,
					}
				: { disabled_reason: null, disabled_at: null, disabled_by: null };
		const { error } = body.version
			? await admin
					.from('plugin_versions')
					.update(fields)
					.eq('plugin_id', body.pluginId)
					.eq('version', body.version)
			: plugin
				? await admin.from('plugins').update(fields).eq('id', body.pluginId)
				: // Shiko's own plugin: a row only to record that it's off.
					await admin
						.from('plugins')
						.insert({ id: body.pluginId, author_id: null, name, ...fields });
		if (error)
			return respondError('Could not change the plugin.', 500, error.message);

		if (body.action === 'enable') return respondSuccess({ affectedMaps: 0 });
		await closeReports(admin, body, 'actioned', user.id);
		const affectedMaps = await notifyOwners(admin, body, name, user.id, now);
		return respondSuccess({ affectedMaps });
	}
);
