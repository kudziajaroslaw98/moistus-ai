import { findActivePluginKind } from '@/lib/plugins/active-plugins';
import {
	catalogManifestUrl,
	findCatalogVersion,
	isLocalDevPluginUrl,
	type PluginCatalogVersion,
} from '@/lib/plugins/catalog';
import {
	describeManifestError,
	pluginManifestSchema,
	type PluginManifest,
} from '@/lib/plugins/manifest-schema';
import { sha256Hex } from '@/lib/plugins/code-fingerprint';
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
	source: PluginSource,
	expectedSha256?: string
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
	if (expectedSha256) {
		const actual = await sha256Hex(code);
		if (actual === null) {
			// Web Crypto is missing only on insecure origins (LAN http in development).
			if (process.env.NODE_ENV === 'production') {
				throw new Error('This browser can’t verify the plugin code');
			}
			console.warn('[plugins] Skipping the code fingerprint check (no Web Crypto)');
		} else if (actual !== expectedSha256) {
			throw new Error('The plugin code doesn’t match the reviewed version');
		}
	}
	return code;
}

function samePermissions(
	a: readonly string[],
	b: readonly string[]
): boolean {
	return a.length === b.length && a.every((permission) => b.includes(permission));
}

interface MapPluginsResponse {
	data?: MapPluginRecord;
	error?: string;
}

/** Calls the per-map plugin route; returns the saved record or throws its error. */
async function requestMapPlugin(
	mapId: string,
	pluginId: string,
	init: RequestInit
): Promise<MapPluginRecord | null> {
	const response = await fetch(
		`/api/maps/${mapId}/plugins/${encodeURIComponent(pluginId)}`,
		init
	);
	const body = (await response.json().catch(() => null)) as MapPluginsResponse | null;
	if (!response.ok) throw new Error(body?.error ?? 'Could not change the plugin');
	return body?.data ?? null;
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

	// Developer plugins (localhost) are an authoring tool behind the account's Developer mode.
	const isDeveloperMode = () =>
		get().userProfile?.preferences?.developerMode === true;
	const devUrlsForMap = (mapId: string) => {
		const userId = get().currentUser?.id;
		return isOwner() && isDeveloperMode() && userId
			? readDevPluginUrls(userId, mapId)
			: [];
	};

	let loadGeneration = 0;
	// The host keeps one copy of each plugin id. The last load to send code owns it, so
	// a stale load (older version, other map) never unloads code a newer load sent.
	const hostClaims = new Map<string, number>();
	let claimCounter = 0;
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

	/**
	 * Fetches, validates and starts one plugin. Catalog plugins must match the reviewed
	 * `catalogVersion` exactly. Stale results (map or pinned version changed) are dropped.
	 */
	const loadPlugin = async (
		key: string,
		source: PluginSource,
		manifestUrl: string,
		catalogVersion?: PluginCatalogVersion
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
				if (
					!catalogVersion ||
					manifest.id !== key ||
					manifest.version !== catalogVersion.version ||
					!samePermissions(manifest.permissions, catalogVersion.permissions)
				) {
					throw new Error('The manifest does not match the catalog');
				}
			} else {
				const takenByOther = Object.values(get().loadedPlugins).some(
					(other) => other.key !== key && other.manifest?.id === manifest.id
				);
				if (takenByOther)
					throw new Error(`${manifest.id} is already loaded on this map`);
			}
			const code = await fetchCode(
				manifestUrl,
				manifest,
				source,
				source === 'catalog' ? catalogVersion?.sha256 : undefined
			);
			const host = await loadPluginHost();
			if (!isCurrent()) return;
			const claim = ++claimCounter;
			hostClaims.set(manifest.id, claim);
			const kinds = await host.load(manifest.id, code);
			const missing = manifest.nodeKinds.find(
				(kind) => !kinds.includes(kind.kind)
			);
			if (missing)
				throw new Error(`The plugin code doesn't define "${missing.kind}"`);

			if (!isCurrent()) {
				if (hostClaims.get(manifest.id) === claim) {
					hostClaims.delete(manifest.id);
					host.unload(manifest.id);
				}
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

	/** Loads each map plugin at its pinned version (reloading when that changes). */
	const syncLoadedWithMap = (records: MapPluginRecord[], devUrls: string[]) => {
		const wanted = new Map<
			string,
			{
				source: PluginSource;
				manifestUrl: string;
				catalogVersion?: PluginCatalogVersion;
			}
		>();
		for (const record of records) {
			wanted.set(record.pluginId, {
				source: 'catalog',
				manifestUrl: catalogManifestUrl(record.pluginId, record.version),
				catalogVersion: findCatalogVersion(record.pluginId, record.version),
			});
		}
		for (const url of devUrls)
			wanted.set(url, { source: 'dev', manifestUrl: url });

		for (const [key, loaded] of Object.entries(get().loadedPlugins)) {
			if (wanted.get(key)?.manifestUrl !== loaded.manifestUrl) unloadKey(key);
		}
		for (const [key, target] of wanted) {
			if (get().loadedPlugins[key]) continue;
			if (target.source === 'catalog' && !target.catalogVersion) {
				// Pinned to a version this app doesn't know (e.g. an older deploy).
				set((state) => ({
					loadedPlugins: {
						...state.loadedPlugins,
						[key]: {
							key,
							source: 'catalog',
							manifestUrl: target.manifestUrl,
							status: 'error',
							manifest: null,
							error: 'This map uses a version of the plugin this app doesn’t have',
							generation: 0,
						},
					},
				}));
				continue;
			}
			void loadPlugin(key, target.source, target.manifestUrl, target.catalogVersion);
		}
	};

	/** Saves a changed record locally and loads the version it pins. */
	const applyRecord = (record: MapPluginRecord) => {
		const records = [
			...get().mapPlugins.filter((existing) => existing.pluginId !== record.pluginId),
			record,
		];
		set({ mapPlugins: records });
		syncLoadedWithMap(records, get().devPluginUrls);
	};

	return {
		mapPlugins: [],
		mapPluginsLoaded: false,
		loadedPlugins: {},
		devPluginUrls: [],

		fetchMapPlugins: async (mapId) => {
			const { data, error } = await get()
				.supabase.from('map_plugins')
				.select('plugin_id, version, previous_version, updated_at')
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
				previousVersion: (row.previous_version as string | null) ?? null,
				updatedAt: (row.updated_at as string | null) ?? null,
			}));
			const devPluginUrls = devUrlsForMap(mapId);
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
			let saved: MapPluginRecord | null;
			try {
				saved = await requestMapPlugin(mapId, pluginId, {
					method: enabled ? 'PUT' : 'DELETE',
				});
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : 'Could not change the plugin'
				);
				return false;
			}
			if (get().mapId !== mapId) return true;

			if (enabled && saved) {
				applyRecord(saved);
			} else {
				const records = get().mapPlugins.filter(
					(record) => record.pluginId !== pluginId
				);
				set({ mapPlugins: records });
				syncLoadedWithMap(records, get().devPluginUrls);
			}
			return true;
		},

		setMapPluginVersion: async (pluginId, version) => {
			const mapId = get().mapId;
			if (!mapId || !isOwner()) return false;
			let saved: MapPluginRecord | null;
			try {
				saved = await requestMapPlugin(mapId, pluginId, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ version }),
				});
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : 'Could not change the plugin'
				);
				return false;
			}
			if (get().mapId === mapId && saved) applyRecord(saved);
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
			if (!isDeveloperMode()) {
				return {
					ok: false,
					error: 'Turn on Developer mode to load plugins from localhost.',
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

		syncDeveloperPlugins: () => {
			const mapId = get().mapId;
			if (!mapId || !get().mapPluginsLoaded) return;
			const devPluginUrls = devUrlsForMap(mapId);
			const current = get().devPluginUrls;
			if (
				devPluginUrls.length === current.length &&
				devPluginUrls.every((url, index) => url === current[index])
			)
				return;
			set({ devPluginUrls });
			syncLoadedWithMap(get().mapPlugins, devPluginUrls);
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
