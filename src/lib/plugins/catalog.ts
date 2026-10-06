import type { PluginPermission } from './manifest-schema';

/** One reviewed release of a catalog plugin. Published versions never change. */
export interface PluginCatalogVersion {
	version: string;
	/** SHA-256 of the reviewed plugin code; the loader refuses anything else. */
	sha256: string;
	/** Must equal the manifest's; owners see changes here before they update. */
	permissions: readonly PluginPermission[];
	/** What changed, shown to owners before they update. */
	notes: string;
}

/**
 * A first-party plugin a map owner can turn on. Each version is a normal plugin
 * (manifest + code) served from `public/plugins/<id>/<version>/`, built only on the
 * public API. Old versions stay hosted, because every map is pinned to one version
 * (`map_plugins.version`) until its owner updates or rolls back.
 */
export interface PluginCatalogEntry {
	id: string;
	/** Oldest first; the last one is what owners turn on and update to. */
	versions: readonly PluginCatalogVersion[];
}

export const FIRST_PARTY_PLUGINS: readonly PluginCatalogEntry[] = [
	{
		id: 'shiko.metric',
		versions: [
			{
				version: '0.1.0',
				sha256:
					'cfb0e054317a721aa853414c17b5ff4b781135bfbc3fb01f777df1ef1d6214b4',
				permissions: ['node:own'],
				notes: 'Track a number against a target.',
			},
			{
				version: '0.2.0',
				sha256:
					'3297e20d2cd6b69786b603ee402106a2adff5e9ad29e424133d7b7232425032a',
				permissions: ['node:own'],
				notes: 'Adds a trend arrow next to the value and fixes rounding for decimals.',
			},
		],
	},
	{
		id: 'shiko.countdown',
		versions: [
			{
				version: '0.1.0',
				sha256:
					'787c76c1784c7a8213b5684a837db002477da7ce37fcaac44ae0380e5e0127b7',
				permissions: ['node:own'],
				notes: 'Days left until a date.',
			},
		],
	},
	{
		id: 'shiko.kanban',
		versions: [
			{
				version: '0.1.0',
				sha256:
					'c532588ad944959784602d56082c69cbdf0f76d907aacd61afd4c73231a45b83',
				permissions: ['node:own'],
				notes: 'Cards you move from To do to Done.',
			},
		],
	},
	{
		id: 'shiko.decision-matrix',
		versions: [
			{
				version: '0.1.0',
				sha256:
					'eec656fce36b9a675af050bfcb31b4cb4f53117d37c95d5c4786c4172825d753',
				permissions: ['node:own'],
				notes: 'Score options against your criteria.',
			},
		],
	},
	{
		id: 'shiko.okr',
		versions: [
			{
				version: '0.1.0',
				sha256:
					'f3429fb0b8d11de3cf0b5515fd35cc867c54c4b6dfb70a75ac87b9f008e8a8b5',
				permissions: ['node:own'],
				notes: 'An objective and its key results.',
			},
		],
	},
	{
		id: 'shiko.budget',
		versions: [
			{
				version: '0.1.0',
				sha256:
					'1f46e49902d34d82e59b3412f969ef4491d5c1ef914540c8c4ae07fc042a3c62',
				permissions: ['node:own'],
				notes: 'Items against a limit, with what you paid.',
			},
		],
	},
	{
		id: 'shiko.branch-progress',
		versions: [
			{
				version: '0.1.0',
				sha256:
					'cf50dab9988c70ee342b52501715e64262fe652659204f1fbfd58baef24bb68a',
				permissions: ['node:own', 'branch:read'],
				notes: 'Tasks done in the branch under it.',
			},
		],
	},
	{
		id: 'shiko.upcoming',
		versions: [
			{
				version: '0.1.0',
				sha256:
					'69ae20a678e8ca15c44b55b0cfb663b227ef17df4e62e9df495f6a313bb87b82',
				permissions: ['node:own', 'branch:read'],
				notes: "What's due next in the branch under it.",
			},
		],
	},
	{
		id: 'shiko.workload',
		versions: [
			{
				version: '0.1.0',
				sha256:
					'60237b9b5b22222c0a037e87f9005618be293b02b2e8b9594fe5df0915fa06bb',
				permissions: ['node:own', 'branch:read'],
				notes: 'Open tasks per person in the branch under it.',
			},
		],
	},
	{
		id: 'shiko.github-issue',
		versions: [
			{
				version: '0.1.0',
				sha256:
					'eed8908c9116783af715cc502f805496ca38cb358fe1d25dfd8e85fc2b682109',
				permissions: ['node:own', 'network:api.github.com'],
				notes: 'A public issue or pull request: title, state and labels.',
			},
		],
	},
	{
		id: 'shiko.wikipedia',
		versions: [
			{
				version: '0.1.0',
				sha256:
					'62574bb69ecddcc87f70ca01520ce415a93109dda1f9e04288ef90b22df79319',
				permissions: ['node:own', 'network:en.wikipedia.org'],
				notes: "A topic's first paragraph from English Wikipedia.",
			},
		],
	},
];

export function findCatalogPlugin(
	pluginId: string
): PluginCatalogEntry | undefined {
	return FIRST_PARTY_PLUGINS.find((entry) => entry.id === pluginId);
}

export function findCatalogVersion(
	pluginId: string,
	version: string
): PluginCatalogVersion | undefined {
	return findCatalogPlugin(pluginId)?.versions.find(
		(candidate) => candidate.version === version
	);
}

export function latestCatalogVersion(
	entry: PluginCatalogEntry
): PluginCatalogVersion {
	return entry.versions[entry.versions.length - 1];
}

export function catalogManifestUrl(pluginId: string, version: string): string {
	return `/plugins/${pluginId}/${version}/manifest.json`;
}

/** Compares `x.y.z` versions: negative when `a` is older than `b`. */
export function compareVersions(a: string, b: string): number {
	const left = a.split('.').map(Number);
	const right = b.split('.').map(Number);
	for (let index = 0; index < 3; index++) {
		const difference = (left[index] ?? 0) - (right[index] ?? 0);
		if (difference !== 0) return difference;
	}
	return 0;
}

/** Versions newer than `version`, newest first (what an update would bring). */
export function newerCatalogVersions(
	entry: PluginCatalogEntry,
	version: string
): PluginCatalogVersion[] {
	return entry.versions
		.filter((candidate) => compareVersions(candidate.version, version) > 0)
		.reverse();
}

/** The newest catalog version when it's newer than `version`, else null. */
export function availableCatalogUpdate(
	pluginId: string,
	version: string
): PluginCatalogVersion | null {
	const entry = findCatalogPlugin(pluginId);
	if (!entry) return null;
	const latest = latestCatalogVersion(entry);
	return compareVersions(latest.version, version) > 0 ? latest : null;
}

/** Powers a move from one version to another adds and drops. */
export function permissionChanges(
	from: readonly PluginPermission[],
	to: readonly PluginPermission[]
): { added: PluginPermission[]; removed: PluginPermission[] } {
	return {
		added: to.filter((permission) => !from.includes(permission)),
		removed: from.filter((permission) => !to.includes(permission)),
	};
}

/**
 * Whether a request to turn on (or move to) a version confirms the powers that version has.
 * Own-node plugins need nothing; a plugin that reads the branch or reaches a site must be
 * sent with exactly its powers, which the owner saw before saying yes.
 */
export function powersConfirmed(
	expected: readonly string[],
	confirmed: readonly string[] | undefined
): boolean {
	if (expected.every((permission) => permission === 'node:own')) return true;
	return (
		confirmed !== undefined &&
		confirmed.length === expected.length &&
		expected.every((permission) => confirmed.includes(permission))
	);
}

/** The request that turns a catalog plugin on, off or to another version for a map. */
export function mapPluginRequest(
	mapId: string,
	pluginId: string,
	change: { enabled: boolean } | { version: string }
): [string, RequestInit] {
	const url = `/api/maps/${mapId}/plugins/${encodeURIComponent(pluginId)}`;
	if ('enabled' in change && !change.enabled) return [url, { method: 'DELETE' }];
	const entry = findCatalogPlugin(pluginId);
	const target =
		'version' in change
			? findCatalogVersion(pluginId, change.version)
			: entry
				? latestCatalogVersion(entry)
				: undefined;
	return [
		url,
		{
			method: 'version' in change ? 'PATCH' : 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				...('version' in change ? { version: change.version } : {}),
				permissions: target?.permissions ?? [],
			}),
		},
	];
}

/** Developer plugins load only from the developer's own machine. */
export function isLocalDevPluginUrl(value: string): boolean {
	try {
		const url = new URL(value);
		return (
			url.protocol === 'http:' &&
			(url.hostname === 'localhost' || url.hostname === '127.0.0.1') &&
			url.pathname.endsWith('.json')
		);
	} catch {
		return false;
	}
}
