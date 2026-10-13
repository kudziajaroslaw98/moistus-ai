import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import { compareVersions } from '@/lib/plugins/catalog';
import {
	displayNames,
	mapCounts,
	PLUGIN_VERSION_COLUMNS,
	type PluginVersionRow,
} from '@/lib/plugins/server/plugin-library';
import { requirePluginAdmin } from '@/lib/plugins/server/require-plugin-admin';
import type { PluginSubmission } from '@/types/plugin-library';
import { z } from 'zod';

/** Versions waiting for review, oldest first, with what each would update from. */
export const GET = withApiValidation<
	unknown,
	{ submissions: PluginSubmission[] }
>(z.any().nullish(), async (_req, _body, _supabase, user) => {
	const gate = await requirePluginAdmin(user);
	if ('response' in gate) return gate.response;
	const { admin } = gate;

	const { data, error } = await admin
		.from('plugin_versions')
		.select(PLUGIN_VERSION_COLUMNS)
		.eq('status', 'in_review')
		.order('submitted_at', { ascending: true });
	if (error)
		return respondError('Could not load submissions.', 500, error.message);
	const pending = (data ?? []) as PluginVersionRow[];
	const ids = [...new Set(pending.map((row) => row.plugin_id))];
	if (ids.length === 0) return respondSuccess({ submissions: [] });

	const [{ data: published }, names, counts] = await Promise.all([
		admin
			.from('plugin_versions')
			.select('plugin_id, version, permissions')
			.in('plugin_id', ids)
			.eq('status', 'published'),
		displayNames(
			admin,
			pending.map((row) => row.submitted_by)
		),
		mapCounts(admin, ids),
	]);
	const publishedRows = (published ?? []) as Array<{
		plugin_id: string;
		version: string;
		permissions: string[];
	}>;

	const submissions: PluginSubmission[] = pending.map((row) => {
		const previous = publishedRows
			.filter((candidate) => candidate.plugin_id === row.plugin_id)
			.sort((a, b) => compareVersions(b.version, a.version))[0];
		return {
			pluginId: row.plugin_id,
			version: row.version,
			name:
				typeof row.manifest.name === 'string'
					? row.manifest.name
					: row.plugin_id,
			author: names.get(row.submitted_by) ?? 'Someone',
			submittedAt: row.submitted_at,
			submitterNote: row.submitter_note,
			notes: row.notes,
			sha256: row.code_sha256,
			manifest: row.manifest,
			permissions: row.permissions,
			previous: previous
				? { version: previous.version, permissions: previous.permissions }
				: null,
			mapCount: counts.get(row.plugin_id) ?? 0,
		};
	});
	return respondSuccess({ submissions });
});
