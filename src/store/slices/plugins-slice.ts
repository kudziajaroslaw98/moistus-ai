import { findActivePluginKind } from '@/lib/plugins/active-plugins';
import { findCatalogPlugin, isLocalDevPluginUrl } from '@/lib/plugins/catalog';
import {
	describeManifestError,
	pluginManifestSchema,
	type PluginManifest,
} from '@/lib/plugins/manifest-schema';
import { MAX_PLUGIN_CODE_BYTES } from '@/lib/plugins/limits';
import { loadPluginHost } from '@/lib/plugins/runtime/load-plugin-host';
import type {
	LoadedPlugin,
	MapPluginRecord,
	PluginSource,
	PluginsSlice,
} from '@/types/plugins';
import { toast } from 'sonner';
import type { StateCreator } from 'zustand';
import type { AppState } from '../app-state';

const DEV_PLUGINS_STORAGE_KEY = 'shiko_dev_plugins_v1';
const REFRESH_INTERVAL_MS = 10_000;

let lastRefreshAt = 0;

const devPluginsKey = (userId: string, mapId: string) =>
	`${DEV_PLUGINS_STORAGE_KEY}:${userId}:${mapId}`;

function readDevPluginUrls(userId: string, mapId: string): string[] {
	try {
		const raw = window.localStorage.getItem(devPluginsKey(userId, mapId));
		const parsed: unknown = raw ? JSON.parse(raw) : [];
		return Array.isArray(parsed)
			? parsed.filter(
					(url): url is string =>
						typeof url === 'string' && isLocalDevPluginUrl(url)
				)
			: [];
	} catch {
		return [];
	}
}

function writeDevPluginUrls(userId: string, mapId: string, urls: string[]) {
	try {
		window.localStorage.setItem(
			devPluginsKey(userId, mapId),
			JSON.stringify(urls)
		);
	} catch {
		// Blocked storage: developer plugins last until reload.
	}
}

async function fetchManifest(
	manifestUrl: string,
	source: PluginSource
): Promise<PluginManifest> {
	const response = await fetch(manifestUrl, {
		cache: source === 'dev' ? 'no-store' : 'default',
	});
	if (!response.ok)
		throw new Error(`Couldn't load the manifest (${response.status})`);
	const parsed = pluginManifestSchema.safeParse(await response.json());
	if (!parsed.success) throw new Error(describeManifestError(parsed.error));
	return parsed.data;
}

async function fetchCode(
	manifestUrl: string,
	manifest: PluginManifest,
	source: PluginSource
) {
	const codeUrl = new URL(
		manifest.main,
		new URL(manifestUrl, window.location.href)
	);
	const response = await fetch(codeUrl, {
		cache: source === 'dev' ? 'no-store' : 'default',
	});
	if (!response.ok)
		throw new Error(`Couldn't load the plugin code (${response.status})`);
	const code = await response.text();
	if (code.length > MAX_PLUGIN_CODE_BYTES) {
		throw new Error('The plugin code is larger than 256 KB');
	}
	return code;
}


export const createPluginsSlice: StateCreator<
	AppState,
	[],
	[],
	PluginsSlice
> = (set, get) => {
	const isOwner = () => {
		const { mindMap, currentUser } = get();
		return Boolean(
			mindMap &&
			currentUser &&
			!currentUser.is_anonymous &&
			mindMap.user_id === currentUser.id
		);
	};

	let loadGeneration = 0;
	const patchLoaded = (key: string, patch: Partial<LoadedPlugin>) =>
		set((state) => {
			const current = state.loadedPlugins[key];
			if (!current) return {};
			return {
				loadedPlugins: {
					...state.loadedPlugins,
					[key]: { ...current, ...patch },
				},
			};
		});

	const unloadKey = (key: string) => {
		const plugin = get().loadedPlugins[key];
		set((state) => {
			const { [key]: _removed, ...rest } = state.loadedPlugins;
			return { loadedPlugins: rest };
		});
		if (plugin?.manifest) {
			const pluginId = plugin.manifest.id;
			void loadPluginHost().then((host) => host.unload(pluginId));
		}
	};

	/** Fetches, validates and starts one plugin. Stale results (map changed) are dropped. */
	const loadPlugin = async (
		key: string,
		source: PluginSource,
		manifestUrl: string
	) => {
		const mapId = get().mapId;
		set((state) => ({
			loadedPlugins: {
				...state.loadedPlugins,
				[key]: {
					key,
					source,
					manifestUrl,
					status: 'loading',
					manifest: null,
					error: null,
					generation: 0,
				},
			},
		}));
		const isCurrent = () =>
			get().mapId === mapId &&
			get().loadedPlugins[key]?.manifestUrl === manifestUrl;

		try {
			const manifest = await fetchManifest(manifestUrl, source);
			if (source === 'catalog') {
				const entry = findCatalogPlugin(key);
				if (manifest.id !== key || manifest.version !== entry?.version) {
					throw new Error('The manifest does not match the catalog');
				}
			} else {
				const takenByOther = Object.values(get().loadedPlugins).some(
					(other) => other.key !== key && other.manifest?.id === manifest.id
				);
				if (takenByOther)
					throw new Error(`${manifest.id} is already loaded on this map`);
			}
			const code = await fetchCode(manifestUrl, manifest, source);
			const host = await loadPluginHost();
			const kinds = await host.load(manifest.id, code);
			const missing = manifest.nodeKinds.find(
				(kind) => !kinds.includes(kind.kind)
			);
			if (missing)
				throw new Error(`The plugin code doesn't define "${missing.kind}"`);

			if (!isCurrent()) {
				host.unload(manifest.id);
				return;
			}
			patchLoaded(key, {
				status: 'ready',
				manifest,
				error: null,
				generation: ++loadGeneration,
			});
		} catch (error) {
			if (!isCurrent()) return;
			patchLoaded(key, {
				status: 'error',
				error:
					error instanceof Error
						? error.message
						: 'The plugin could not be loaded',
			});
		}
	};

	const syncLoadedWithMap = (records: MapPluginRecord[], devUrls: string[]) => {
		const wanted = new Map<
			string,
			{ source: PluginSource; manifestUrl: string }
		>();
		for (const record of records) {
			const entry = findCatalogPlugin(record.pluginId);
			if (entry)
				wanted.set(entry.id, {
					source: 'catalog',
					manifestUrl: `${entry.baseUrl}manifest.json`,
				});
		}
		for (const url of devUrls)
			wanted.set(url, { source: 'dev', manifestUrl: url });

		for (const key of Object.keys(get().loadedPlugins)) {
			if (!wanted.has(key)) unloadKey(key);
		}
		for (const [key, target] of wanted) {
			if (!get().loadedPlugins[key])
				void loadPlugin(key, target.source, target.manifestUrl);
		}
	};

	return {
		mapPlugins: [],
		mapPluginsLoaded: false,
		loadedPlugins: {},
		devPluginUrls: [],

		fetchMapPlugins: async (mapId) => {
			const { data, error } = await get()
				.supabase.from('map_plugins')
				.select('plugin_id, version')
				.eq('map_id', mapId);
			if (get().mapId !== mapId) return;
			if (error) {
				// Offline or a transient failure: nodes keep showing their saved view.
				console.warn('[plugins] Could not load map plugins', error.message);
				return;
			}

			const records: MapPluginRecord[] = (data ?? []).map((row) => ({
				pluginId: row.plugin_id as string,
				version: row.version as string,
			}));
			const userId = get().currentUser?.id;
			const devPluginUrls =
				isOwner() && userId ? readDevPluginUrls(userId, mapId) : [];
			set({ mapPlugins: records, mapPluginsLoaded: true, devPluginUrls });
			syncLoadedWithMap(records, devPluginUrls);
		},

		refreshMapPluginsSoon: () => {
			const mapId = get().mapId;
			if (!mapId || Date.now() - lastRefreshAt < REFRESH_INTERVAL_MS) return;
			lastRefreshAt = Date.now();
			void get().fetchMapPlugins(mapId);
		},

		setMapPluginEnabled: async (pluginId, enabled) => {
			const mapId = get().mapId;
			if (!mapId || !isOwner()) return false;
			try {
				const response = await fetch(
					`/api/maps/${mapId}/plugins/${encodeURIComponent(pluginId)}`,
					{ method: enabled ? 'PUT' : 'DELETE' }
				);
				if (!response.ok) {
					const body = (await response.json().catch(() => null)) as {
						error?: string;
					} | null;
					throw new Error(body?.error ?? 'Could not change the plugin');
				}
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : 'Could not change the plugin'
				);
				return false;
			}
			if (get().mapId !== mapId) return true;

			const entry = findCatalogPlugin(pluginId);
			const records = enabled
				? [
						...get().mapPlugins.filter(
							(record) => record.pluginId !== pluginId
						),
						{ pluginId, version: entry?.version ?? '0.0.0' },
					]
				: get().mapPlugins.filter((record) => record.pluginId !== pluginId);
			set({ mapPlugins: records });
			syncLoadedWithMap(records, get().devPluginUrls);
			return true;
		},

		addDevPlugin: async (manifestUrl) => {
			const mapId = get().mapId;
			const userId = get().currentUser?.id;
			const url = manifestUrl.trim();
			if (!mapId || !userId || !isOwner()) {
				return {
					ok: false,
					error: 'Only the map owner can load developer plugins.',
				};
			}
			if (!isLocalDevPluginUrl(url)) {
				return {
					ok: false,
					error: 'Use a manifest.json URL on http://localhost or 127.0.0.1.',
				};
			}
			if (get().devPluginUrls.includes(url)) return { ok: true };

			const devPluginUrls = [...get().devPluginUrls, url];
			set({ devPluginUrls });
			writeDevPluginUrls(userId, mapId, devPluginUrls);
			await loadPlugin(url, 'dev', url);
			const loaded = get().loadedPlugins[url];
			return loaded?.status === 'error'
				? { ok: false, error: loaded.error ?? 'The plugin could not be loaded' }
				: { ok: true };
		},

		removeDevPlugin: (manifestUrl) => {
			const mapId = get().mapId;
			const userId = get().currentUser?.id;
			const devPluginUrls = get().devPluginUrls.filter(
				(url) => url !== manifestUrl
			);
			set({ devPluginUrls });
			if (mapId && userId) writeDevPluginUrls(userId, mapId, devPluginUrls);
			unloadKey(manifestUrl);
		},

		reloadDevPlugin: async (manifestUrl) => {
			if (!get().devPluginUrls.includes(manifestUrl)) return;
			unloadKey(manifestUrl);
			await loadPlugin(manifestUrl, 'dev', manifestUrl);
		},

		resetPlugins: () => {
			for (const key of Object.keys(get().loadedPlugins)) unloadKey(key);
			set({
				mapPlugins: [],
				mapPluginsLoaded: false,
				loadedPlugins: {},
				devPluginUrls: [],
			});
		},

		openPluginsPanel: () => {
			get().setPopoverOpen({ plugins: true, recipes: false, mapSettings: false });
		},

		getActivePluginKind: (pluginId, kindName) =>
			findActivePluginKind(get().loadedPlugins, pluginId, kindName),
	};
};
