import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import { findCatalogPlugin } from '@/lib/plugins/catalog';
import {
	displayNames,
	mapCounts,
	type PluginRow,
} from '@/lib/plugins/server/plugin-library';
import { requirePluginAdmin } from '@/lib/plugins/server/require-plugin-admin';
import type {
	PluginReportGroup,
	PluginReportReason,
} from '@/types/plugin-library';
import { z } from 'zod';

interface ReportRow {
	id: string;
	plugin_id: string;
	version: string | null;
	reporter_id: string;
	reason: PluginReportReason;
	details: string;
	node_data: unknown;
	created_at: string;
}

/**
 * Open reports grouped by plugin version, plus everything that's turned off (so it can
 * be turned back on). Reviewers see the attached node data; authors never do.
 */
export const GET = withApiValidation<unknown, { groups: PluginReportGroup[] }>(
	z.any().nullish(),
	async (_req, _body, _supabase, user) => {
		const gate = await requirePluginAdmin(user);
		if ('response' in gate) return gate.response;
		const { admin } = gate;

		const [
			{ data: reports, error },
			{ data: offPlugins },
			{ data: offVersions },
		] = await Promise.all([
			admin
				.from('plugin_reports')
				.select(
					'id, plugin_id, version, reporter_id, reason, details, node_data, created_at'
				)
				.eq('status', 'open')
				.order('created_at', { ascending: false }),
			admin
				.from('plugins')
				.select('id, author_id, name, created_at, disabled_reason, disabled_at')
				.not('disabled_at', 'is', null),
			admin
				.from('plugin_versions')
				.select('plugin_id, version, disabled_reason')
				.not('disabled_at', 'is', null),
		]);
		if (error)
			return respondError('Could not load reports.', 500, error.message);

		const rows = (reports ?? []) as ReportRow[];
		const disabledPlugins = (offPlugins ?? []) as PluginRow[];
		const disabledVersions = (offVersions ?? []) as Array<{
			plugin_id: string;
			version: string;
			disabled_reason: string | null;
		}>;

		const keys = new Map<
			string,
			{ pluginId: string; version: string | null }
		>();
		for (const row of rows)
			keys.set(`${row.plugin_id}@${row.version ?? ''}`, {
				pluginId: row.plugin_id,
				version: row.version,
			});
		for (const row of disabledPlugins) {
			if (![...keys.values()].some((key) => key.pluginId === row.id))
				keys.set(`${row.id}@`, { pluginId: row.id, version: null });
		}
		for (const row of disabledVersions)
			keys.set(`${row.plugin_id}@${row.version}`, {
				pluginId: row.plugin_id,
				version: row.version,
			});

		const ids = [...new Set([...keys.values()].map((key) => key.pluginId))];
		const [{ data: plugins }, counts] = await Promise.all([
			ids.length
				? admin
						.from('plugins')
						.select(
							'id, author_id, name, created_at, disabled_reason, disabled_at'
						)
						.in('id', ids)
				: Promise.resolve({ data: [] }),
			mapCounts(admin, ids),
		]);
		const pluginRows = (plugins ?? []) as PluginRow[];
		const names = await displayNames(
			admin,
			pluginRows.flatMap((row) => (row.author_id ? [row.author_id] : []))
		);

		const groups: PluginReportGroup[] = [...keys.values()].map(
			({ pluginId, version }) => {
				const plugin = pluginRows.find((row) => row.id === pluginId);
				const shiko = findCatalogPlugin(pluginId);
				const groupReports = rows.filter(
					(row) => row.plugin_id === pluginId && row.version === version
				);
				const reasonCounts: Partial<Record<PluginReportReason, number>> = {};
				for (const row of groupReports)
					reasonCounts[row.reason] = (reasonCounts[row.reason] ?? 0) + 1;
				return {
					pluginId,
					version,
					name: shiko?.name ?? plugin?.name ?? pluginId,
					author: shiko
						? 'Shiko'
						: plugin?.author_id
							? (names.get(plugin.author_id) ?? 'Someone')
							: 'Someone',
					mapCount: counts.get(pluginId) ?? 0,
					reporters: new Set(groupReports.map((row) => row.reporter_id)).size,
					counts: reasonCounts,
					reports: groupReports.map((row) => ({
						id: row.id,
						reason: row.reason,
						details: row.details,
						createdAt: row.created_at,
						nodeData: row.node_data,
					})),
					pluginDisabledReason: plugin?.disabled_at
						? (plugin.disabled_reason ?? 'Turned off by Shiko')
						: null,
					versionDisabledReason:
						disabledVersions.find(
							(row) => row.plugin_id === pluginId && row.version === version
						)?.disabled_reason ?? null,
					isShiko: Boolean(shiko),
				};
			}
		);
		// Most-reported first; turned-off plugins without open reports last.
		groups.sort((a, b) => b.reports.length - a.reports.length);
		return respondSuccess({ groups });
	}
);
