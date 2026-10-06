import type {
	DisabledPlugin,
	PluginCatalogEntry,
	PluginCatalogVersion,
} from '@/lib/plugins/catalog';
import { compareVersions } from '@/lib/plugins/catalog';
import type { PluginPermission } from '@/lib/plugins/manifest-schema';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side reads of the plugin library tables (`plugins`, `plugin_versions`,
 * `plugin_reports`). Those tables have no RLS policies, so every caller passes the
 * service-role client and checks who is asking first.
 */

/** Every column except `code`, which only the files route and review read. */
export const PLUGIN_VERSION_COLUMNS =
	'plugin_id, version, status, manifest, code_sha256, permissions, author_hosts, notes, submitter_note, submitted_by, submitted_at, reviewed_at, review_message, published_at, disabled_reason, disabled_at';

export interface PluginVersionRow {
	plugin_id: string;
	version: string;
	status: 'in_review' | 'changes_requested' | 'published';
	manifest: Record<string, unknown>;
	code_sha256: string;
	permissions: string[];
	author_hosts: string[];
	notes: string;
	submitter_note: string;
	submitted_by: string;
	submitted_at: string;
	reviewed_at: string | null;
	review_message: string | null;
	published_at: string | null;
	disabled_reason: string | null;
	disabled_at: string | null;
}

export interface PluginRow {
	id: string;
	author_id: string | null;
	name: string;
	created_at: string;
	disabled_reason: string | null;
	disabled_at: string | null;
}

export function toCatalogVersion(row: PluginVersionRow): PluginCatalogVersion {
	return {
		version: row.version,
		sha256: row.code_sha256,
		permissions: row.permissions as PluginPermission[],
		notes: row.notes,
		...(row.author_hosts.length > 0 ? { authorHosts: row.author_hosts } : {}),
	};
}

/** Display names for user ids (profiles are server-read; fall back to "Someone"). */
export async function displayNames(
	admin: SupabaseClient,
	userIds: string[]
): Promise<Map<string, string>> {
	const unique = [...new Set(userIds)];
	const names = new Map<string, string>();
	if (unique.length === 0) return names;
	const { data } = await admin
		.from('user_profiles')
		.select('user_id, display_name, full_name')
		.in('user_id', unique);
	for (const row of data ?? []) {
		const name =
			(typeof row.display_name === 'string' && row.display_name.trim()) ||
			(typeof row.full_name === 'string' && row.full_name.trim()) ||
			'';
		if (name) names.set(row.user_id as string, name.slice(0, 60));
	}
	return names;
}

export async function isPluginAdmin(
	admin: SupabaseClient,
	userId: string
): Promise<boolean> {
	const { data } = await admin
		.from('user_profiles')
		.select('role')
		.eq('user_id', userId)
		.maybeSingle();
	return data?.role === 'admin';
}

/** What `/api/plugins/catalog` returns: published library plugins and what's turned off. */
export async function loadPluginLibrary(admin: SupabaseClient): Promise<{
	plugins: PluginCatalogEntry[];
	disabled: DisabledPlugin[];
}> {
	const [{ data: plugins, error: pluginsError }, { data: versions, error: versionsError }] =
		await Promise.all([
			admin
				.from('plugins')
				.select('id, author_id, name, created_at, disabled_reason, disabled_at'),
			admin
				.from('plugin_versions')
				.select(PLUGIN_VERSION_COLUMNS)
				.or('status.eq.published,disabled_at.not.is.null'),
		]);
	if (pluginsError) throw new Error(pluginsError.message);
	if (versionsError) throw new Error(versionsError.message);

	const pluginRows = (plugins ?? []) as PluginRow[];
	const versionRows = (versions ?? []) as PluginVersionRow[];
	const names = await displayNames(
		admin,
		pluginRows.flatMap((row) => (row.author_id ? [row.author_id] : []))
	);

	const disabled: DisabledPlugin[] = [
		...pluginRows
			.filter((row) => row.disabled_at)
			.map((row) => ({
				pluginId: row.id,
				version: null,
				reason: row.disabled_reason ?? 'Turned off by Shiko',
			})),
		...versionRows
			.filter((row) => row.disabled_at)
			.map((row) => ({
				pluginId: row.plugin_id,
				version: row.version,
				reason: row.disabled_reason ?? 'Turned off by Shiko',
			})),
	];

	const entries: PluginCatalogEntry[] = pluginRows
		// Shiko's own plugins have rows only to record that they're off.
		.filter((row) => row.author_id)
		.map((row) => ({
			id: row.id,
			source: 'community' as const,
			author: names.get(row.author_id!) ?? 'Someone',
			versions: versionRows
				.filter((version) => version.plugin_id === row.id && version.status === 'published')
				.sort((a, b) => compareVersions(a.version, b.version))
				.map(toCatalogVersion),
		}))
		.filter((entry) => entry.versions.length > 0);

	return { plugins: entries, disabled };
}

/** Why a plugin or one of its versions is turned off everywhere, or null. */
export async function pluginDisabledReason(
	admin: SupabaseClient,
	pluginId: string,
	version: string
): Promise<string | null> {
	const [{ data: plugin }, { data: row }] = await Promise.all([
		admin
			.from('plugins')
			.select('disabled_at, disabled_reason')
			.eq('id', pluginId)
			.maybeSingle(),
		admin
			.from('plugin_versions')
			.select('disabled_at, disabled_reason')
			.eq('plugin_id', pluginId)
			.eq('version', version)
			.maybeSingle(),
	]);
	if (plugin?.disabled_at) return plugin.disabled_reason ?? 'Turned off by Shiko';
	if (row?.disabled_at) return row.disabled_reason ?? 'Turned off by Shiko';
	return null;
}

/** A community plugin's published versions, oldest first (empty when none). */
export async function publishedCommunityVersions(
	admin: SupabaseClient,
	pluginId: string
): Promise<PluginCatalogVersion[]> {
	const { data, error } = await admin
		.from('plugin_versions')
		.select(PLUGIN_VERSION_COLUMNS)
		.eq('plugin_id', pluginId)
		.eq('status', 'published');
	if (error) throw new Error(error.message);
	return ((data ?? []) as PluginVersionRow[])
		.sort((a, b) => compareVersions(a.version, b.version))
		.map(toCatalogVersion);
}
