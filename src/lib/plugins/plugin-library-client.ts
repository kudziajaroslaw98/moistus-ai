import {
	getPluginLibrary,
	setPluginLibrary,
	type PluginLibraryResponse,
} from '@/lib/plugins/catalog';

/** How long a fetched library counts as fresh (turning a plugin off reaches maps this fast). */
const LIBRARY_FRESH_MS = 30_000;

let inFlight: Promise<void> | null = null;
let fetchedAt = 0;

/**
 * Loads the plugin library (published community plugins and what Shiko turned off) into
 * the catalog. Never throws: offline or failing, Shiko's own plugins keep working.
 */
export function refreshPluginLibrary(options: { force?: boolean } = {}): Promise<void> {
	if (
		!options.force &&
		getPluginLibrary().loaded &&
		Date.now() - fetchedAt < LIBRARY_FRESH_MS
	) {
		return Promise.resolve();
	}
	if (inFlight) return inFlight;
	inFlight = fetch('/api/plugins/catalog', { cache: 'no-store' })
		.then(async (response) => {
			const body = (await response.json().catch(() => null)) as {
				data?: PluginLibraryResponse;
			} | null;
			if (!response.ok || !body?.data) {
				throw new Error(`The plugin library didn't load (${response.status})`);
			}
			setPluginLibrary(body.data);
			fetchedAt = Date.now();
		})
		.catch((error: unknown) => {
			console.warn(
				'[plugins] Could not load the plugin library',
				error instanceof Error ? error.message : error
			);
		})
		.finally(() => {
			inFlight = null;
		});
	return inFlight;
}
