import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import { createServiceRoleClient } from '@/helpers/supabase/server';
import { compareVersions } from '@/lib/plugins/catalog';
import {
	PLUGIN_VERSION_COLUMNS,
	type PluginRow,
	type PluginVersionRow,
} from '@/lib/plugins/server/plugin-library';
import type { MyPlugin } from '@/types/plugin-library';
import { z } from 'zod';

/**
 * The signed-in author's library plugins (My plugins): every version with its review
 * status and the reviewer's message, how many maps use it and open reports. Reporters
 * stay anonymous: authors see a count, never who reported or what they attached.
 */
export const GET = withApiValidation<unknown, { plugins: MyPlugin[] }>(
	z.any().nullish(),
	async (_req, _body, _supabase, user) => {
		const admin = createServiceRoleClient();
		const { data: plugins, error } = await admin
			.from('plugins')
			.select('id, author_id, name, created_at, disabled_reason, disabled_at')
			.eq('author_id', user.id)
			.order('created_at', { ascending: false });
		if (error)
			return respondError('Could not load your plugins.', 500, error.message);

		const rows = (plugins ?? []) as PluginRow[];
		const ids = rows.map((row) => row.id);
		if (ids.length === 0) return respondSuccess({ plugins: [] });

		const [{ data: versions }, { data: maps }, { data: reports }] =
			await Promise.all([
				admin
					.from('plugin_versions')
					.select(PLUGIN_VERSION_COLUMNS)
					.in('plugin_id', ids),
				admin.from('map_plugins').select('plugin_id').in('plugin_id', ids),
				admin
					.from('plugin_reports')
					.select('plugin_id')
					.in('plugin_id', ids)
					.eq('status', 'open'),
			]);
		const count = (list: Array<{ plugin_id: string }> | null, id: string) =>
			(list ?? []).filter((row) => row.plugin_id === id).length;

		const result: MyPlugin[] = rows.map((row) => ({
			id: row.id,
			name: row.name,
			mapCount: count(maps as Array<{ plugin_id: string }> | null, row.id),
			openReports: count(
				reports as Array<{ plugin_id: string }> | null,
				row.id
			),
			disabledReason: row.disabled_at
				? (row.disabled_reason ?? 'Turned off by Shiko')
				: null,
			versions: ((versions ?? []) as PluginVersionRow[])
				.filter((version) => version.plugin_id === row.id)
				.sort((a, b) => compareVersions(b.version, a.version))
				.map((version) => ({
					version: version.version,
					status: version.status,
					notes: version.notes,
					submittedAt: version.submitted_at,
					reviewedAt: version.reviewed_at,
					reviewMessage: version.review_message,
					publishedAt: version.published_at,
					disabledReason: version.disabled_at
						? (version.disabled_reason ?? 'Turned off by Shiko')
						: null,
				})),
		}));
		return respondSuccess({ plugins: result });
	}
);
