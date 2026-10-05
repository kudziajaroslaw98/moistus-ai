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
