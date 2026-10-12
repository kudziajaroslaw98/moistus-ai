import type { CatalogChip } from '@/components/dashboard/catalog-card';
import { formatTimeAgo } from '@/components/plugins/plugin-update-details';
import { compareVersions } from '@/lib/plugins/catalog';
import type { PluginDraftSummary } from '@/types/plugin-drafts';
import type { MyPlugin, MyPluginVersion } from '@/types/plugin-library';

/** One line of the My plugins list: a plugin, its drafts, or both. */
export interface MyPluginRow {
	pluginId: string;
	name: string;
	/** A `PLUGIN_ICONS` key. */
	icon: string;
	description: string;
	/** Absent for a plugin that was never submitted. */
	plugin: MyPlugin | null;
	/** Newest first. */
	drafts: PluginDraftSummary[];
	chips: CatalogChip[];
	meta: string;
	/** Changes requested, turned off, an open report, or a draft failing its checks. */
	needsAttention: boolean;
	hasDraft: boolean;
	inReview: boolean;
	published: boolean;
	/** Most recent thing that happened to it (ms), for ordering. */
	activityAt: number;
}

export type MyPluginFilter =
	'all' | 'attention' | 'drafts' | 'review' | 'published';

export const MY_PLUGIN_FILTERS: ReadonlyArray<{
	id: MyPluginFilter;
	label: string;
}> = [
	{ id: 'all', label: 'All' },
	{ id: 'attention', label: 'Needs attention' },
	{ id: 'drafts', label: 'Drafts' },
	{ id: 'review', label: 'In review' },
	{ id: 'published', label: 'Published' },
];

const plural = (count: number, one: string, many: string) =>
	`${count} ${count === 1 ? one : many}`;

function timeOf(iso: string | null): number {
	const time = iso ? new Date(iso).getTime() : 0;
	return Number.isNaN(time) ? 0 : time;
}

/** The newest request for changes, unless a newer version is already in review. */
function openChangesRequest(plugin: MyPlugin): MyPluginVersion | null {
	const waiting = plugin.versions.find(
		(version) => version.status === 'in_review'
	);
	const changes = plugin.versions.find(
		(version) => version.status === 'changes_requested'
	);
	return changes &&
		(!waiting || compareVersions(changes.version, waiting.version) > 0)
		? changes
		: null;
}

function failingChecks(draft: PluginDraftSummary | undefined): number {
	const summary = draft?.checkSummary;
	return summary ? summary.total - summary.passed : 0;
}

function pluginChips(plugin: MyPlugin): CatalogChip[] {
	const live = plugin.versions.find(
		(version) => version.status === 'published'
	);
	const waiting = plugin.versions.find(
		(version) => version.status === 'in_review'
	);
	return [
		...(plugin.disabledReason
			? [{ label: 'Turned off', tone: 'red' as const }]
			: []),
		...(live
			? [{ label: `Published ${live.version}`, tone: 'green' as const }]
			: []),
		...(waiting
			? [{ label: `${waiting.version} in review`, tone: 'amber' as const }]
			: []),
		...(openChangesRequest(plugin)
			? [{ label: 'Changes requested', tone: 'red' as const }]
			: []),
		...(plugin.openReports > 0
			? [
					{
						label: plural(plugin.openReports, 'open report', 'open reports'),
						tone: 'amber' as const,
					},
				]
			: []),
	];
}

function draftChips(
	drafts: PluginDraftSummary[],
	hasPlugin: boolean,
	now: number
): CatalogChip[] {
	const newest = drafts[0];
	if (!newest) return [];
	const failing = failingChecks(newest);
	const summary = newest.checkSummary;
	return [
		{
			// A plugin that was never submitted says how fresh the draft is, since
			// that is all there is to say about it.
			label:
				drafts.length > 1
					? `${drafts.length} drafts`
					: hasPlugin
						? 'Draft'
						: `Draft · edited ${formatTimeAgo(newest.updatedAt, now)}`,
			tone: 'neutral',
		},
		...(failing > 0
			? [
					{
						label: plural(failing, 'check failing', 'checks failing'),
						tone: 'red' as const,
					},
				]
			: []),
		...(!hasPlugin && summary && summary.total > 0 && failing === 0
			? [{ label: `All ${summary.total} pass`, tone: 'green' as const }]
			: []),
	];
}

/** Shiko's message when changes were requested, else the plugin's own description. */
function describe(
	plugin: MyPlugin | null,
	newest: PluginDraftSummary | undefined
) {
	const latest = plugin?.versions[0];
	if (latest?.status === 'changes_requested' && latest.reviewMessage)
		return `Shiko: “${latest.reviewMessage}”`;
	return plugin?.description || newest?.description || 'No description yet.';
}

function describeMeta(plugin: MyPlugin | null, now: number): string {
	if (!plugin) return 'Never submitted';
	if (plugin.versions.some((version) => version.status === 'published'))
		return `On in ${plural(plugin.mapCount, 'map', 'maps')} · ${plural(plugin.openReports, 'report', 'reports')}`;
	const waiting = plugin.versions.find(
		(version) => version.status === 'in_review'
	);
	return waiting
		? `Submitted ${formatTimeAgo(waiting.submittedAt, now)}`
		: 'Not published yet';
}

/**
 * One row per plugin id: submitted plugins with the drafts that share their id (a
 * draft started with "Edit as new draft" keeps it), and drafts of plugins that were
 * never submitted. Plugins that need a look come first, then the most recently touched.
 */
export function buildMyPluginRows(
	plugins: readonly MyPlugin[],
	drafts: readonly PluginDraftSummary[],
	now = Date.now()
): MyPluginRow[] {
	const draftsById = new Map<string, PluginDraftSummary[]>();
	for (const draft of drafts) {
		draftsById.set(draft.pluginId, [
			...(draftsById.get(draft.pluginId) ?? []),
			draft,
		]);
	}
	for (const list of draftsById.values())
		list.sort((a, b) => timeOf(b.updatedAt) - timeOf(a.updatedAt));

	const fromPlugin = (plugin: MyPlugin): MyPluginRow => {
		const own = draftsById.get(plugin.id) ?? [];
		draftsById.delete(plugin.id);
		return {
			pluginId: plugin.id,
			name: plugin.name,
			icon: plugin.icon,
			description: describe(plugin, own[0]),
			plugin,
			drafts: own,
			chips: [...pluginChips(plugin), ...draftChips(own, true, now)],
			meta: describeMeta(plugin, now),
			needsAttention:
				Boolean(plugin.disabledReason) ||
				openChangesRequest(plugin) !== null ||
				plugin.openReports > 0 ||
				failingChecks(own[0]) > 0,
			hasDraft: own.length > 0,
			inReview: plugin.versions.some(
				(version) => version.status === 'in_review'
			),
			published: plugin.versions.some(
				(version) => version.status === 'published'
			),
			activityAt: Math.max(
				...plugin.versions.flatMap((version) => [
					timeOf(version.submittedAt),
					timeOf(version.reviewedAt),
					timeOf(version.publishedAt),
				]),
				...own.map((draft) => timeOf(draft.updatedAt)),
				0
			),
		};
	};

	const rows = plugins.map(fromPlugin);

	// What is left are drafts of plugins that were never submitted.
	for (const [pluginId, list] of draftsById) {
		const newest = list[0];
		rows.push({
			pluginId,
			name: newest.name || 'Untitled plugin',
			icon: newest.icon,
			description: describe(null, newest),
			plugin: null,
			drafts: list,
			chips: draftChips(list, false, now),
			meta: describeMeta(null, now),
			needsAttention: failingChecks(newest) > 0,
			hasDraft: true,
			inReview: false,
			published: false,
			activityAt: timeOf(newest.updatedAt),
		});
	}

	return rows.sort(
		(a, b) =>
			Number(b.needsAttention) - Number(a.needsAttention) ||
			b.activityAt - a.activityAt ||
			a.name.localeCompare(b.name)
	);
}

export function matchesPluginFilter(
	row: MyPluginRow,
	filter: MyPluginFilter
): boolean {
	switch (filter) {
		case 'attention':
			return row.needsAttention;
		case 'drafts':
			return row.hasDraft;
		case 'review':
			return row.inReview;
		case 'published':
			return row.published;
		default:
			return true;
	}
}

export function matchesPluginQuery(row: MyPluginRow, query: string): boolean {
	const needle = query.trim().toLowerCase();
	return (
		!needle ||
		`${row.name} ${row.pluginId} ${row.description}`
			.toLowerCase()
			.includes(needle)
	);
}

/** How many rows each filter would show (the chips' counts). */
export function countPluginFilters(
	rows: readonly MyPluginRow[]
): Record<MyPluginFilter, number> {
	return Object.fromEntries(
		MY_PLUGIN_FILTERS.map(({ id }) => [
			id,
			rows.filter((row) => matchesPluginFilter(row, id)).length,
		])
	) as Record<MyPluginFilter, number>;
}
