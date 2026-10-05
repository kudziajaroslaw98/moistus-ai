/**
 * First-party plugins a map owner can turn on. Each one is a normal plugin (manifest +
 * code) served from `public/plugins/<id>/<version>/`, built only on the public API.
 * The server checks plugin ids against this list before enabling them on a map.
 */
export interface PluginCatalogEntry {
	id: string;
	version: string;
	/** Folder holding manifest.json and the plugin code, ending in `/`. */
	baseUrl: string;
}

export const FIRST_PARTY_PLUGINS: readonly PluginCatalogEntry[] = [
	{
		id: 'shiko.metric',
		version: '0.1.0',
		baseUrl: '/plugins/shiko.metric/0.1.0/',
	},
];

export function findCatalogPlugin(
	pluginId: string
): PluginCatalogEntry | undefined {
	return FIRST_PARTY_PLUGINS.find((entry) => entry.id === pluginId);
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
