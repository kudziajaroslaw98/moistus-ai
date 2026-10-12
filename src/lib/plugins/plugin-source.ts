import { catalogManifestUrl, findCatalogVersion } from './catalog';
import { sha256Hex } from './code-fingerprint';

/** Whether the code on screen is the code Shiko reviewed. */
export type FingerprintCheck = 'match' | 'mismatch' | 'unavailable';

/** One published version of a catalog plugin, as the code view shows it. */
export interface PluginSource {
	pluginId: string;
	version: string;
	/** The manifest, indented for reading. */
	manifestText: string;
	/** Icon and powers, to color the sheet like the plugin's card. */
	icon: string | null;
	permissions: string[];
	/** The code file's name, from the manifest's `main`. */
	mainName: string;
	code: string;
	/** SHA-256 of `code` as this browser computed it; null where Web Crypto is missing. */
	sha256: string | null;
	fingerprint: FingerprintCheck;
}

async function fetchText(url: string | URL, what: string): Promise<string> {
	const response = await fetch(url);
	if (!response.ok)
		throw new Error(`Couldn't load ${what} (${response.status})`);
	return response.text();
}

/**
 * Reads a published version's manifest and code from where the app serves them (the
 * same URLs the map loader uses) and checks the code against the fingerprint the
 * catalog stores for it. Read-only: nothing here runs the code.
 */
export async function fetchPluginSource(
	pluginId: string,
	version: string
): Promise<PluginSource> {
	const manifestUrl = catalogManifestUrl(pluginId, version);
	const manifestRaw = await fetchText(manifestUrl, 'the manifest');

	let manifest: { main?: unknown; icon?: unknown; permissions?: unknown };
	try {
		manifest = JSON.parse(manifestRaw);
	} catch {
		throw new Error('The manifest isn’t valid JSON');
	}
	const mainName =
		typeof manifest.main === 'string' ? manifest.main : 'plugin.js';
	const code = await fetchText(
		new URL(mainName, new URL(manifestUrl, window.location.href)),
		mainName
	);

	const expected = findCatalogVersion(pluginId, version)?.sha256;
	const sha256 = await sha256Hex(code);
	const fingerprint: FingerprintCheck =
		sha256 === null || !expected
			? 'unavailable'
			: sha256 === expected
				? 'match'
				: 'mismatch';

	return {
		pluginId,
		version,
		manifestText: JSON.stringify(manifest, null, 2),
		icon: typeof manifest.icon === 'string' ? manifest.icon : null,
		permissions: Array.isArray(manifest.permissions)
			? manifest.permissions.filter(
					(permission): permission is string => typeof permission === 'string'
				)
			: [],
		mainName,
		code,
		sha256,
		fingerprint,
	};
}
