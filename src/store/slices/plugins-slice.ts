import { applyGraphOps, canEditMap } from '@/lib/extensions/graph-ops';
import { findActivePluginKind } from '@/lib/plugins/active-plugins';
import { pluginCallContext } from '@/lib/plugins/call-context';
import {
	catalogManifestUrl,
	disabledReason,
	findCatalogVersion,
	isLocalDevPluginUrl,
	mapPluginRequest,
	type PluginCatalogVersion,
} from '@/lib/plugins/catalog';
import {
	describeManifestError,
	networkHostsOf,
	pluginManifestSchema,
	type PluginManifest,
} from '@/lib/plugins/manifest-schema';
import { blockedPluginHosts } from '@/lib/plugins/network';
import { requestPluginJson } from '@/lib/plugins/network-client';
import { refreshPluginLibrary } from '@/lib/plugins/plugin-library-client';
import { validatePluginData } from '@/lib/plugins/plugin-fields';
import { sha256Hex } from '@/lib/plugins/code-fingerprint';
import { MAX_PLUGIN_CODE_BYTES } from '@/lib/plugins/limits';
import { loadPluginHost } from '@/lib/plugins/runtime/load-plugin-host';
import type {
	LoadedPlugin,
	MapPluginRecord,
	PluginRefreshState,
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
	request: [string, RequestInit]
): Promise<MapPluginRecord | null> {
	const response = await fetch(...request);
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
			const blocked = blockedPluginHosts();
			const blockedHost = networkHostsOf(manifest.permissions).find((host) =>
				blocked.includes(host)
			);
			if (blockedHost) throw new Error(`Plugins can’t reach ${blockedHost}`);
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
				refreshKinds: manifest.nodeKinds
					.map((kind) => kind.kind)
					.filter((kind) => host.canRefresh(manifest.id, kind)),
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
		const turnedOff = new Map<string, string>();
		for (const record of records) {
			const reason = disabledReason(record.pluginId, record.version);
			if (reason) turnedOff.set(record.pluginId, reason);
			wanted.set(record.pluginId, {
				source: 'catalog',
				manifestUrl: catalogManifestUrl(record.pluginId, record.version),
				catalogVersion: findCatalogVersion(record.pluginId, record.version),
			});
		}
		for (const url of devUrls)
			wanted.set(url, { source: 'dev', manifestUrl: url });

		for (const [key, loaded] of Object.entries(get().loadedPlugins)) {
			const stillWanted = wanted.get(key)?.manifestUrl === loaded.manifestUrl;
			// Code Shiko turned off stops running at once; its nodes show their saved view.
			const nowOff = turnedOff.has(key) && loaded.disabledReason === undefined;
			if (!stillWanted || nowOff) unloadKey(key);
		}
		for (const [key, target] of wanted) {
			const reason = turnedOff.get(key);
			if (reason) {
				if (get().loadedPlugins[key]?.disabledReason === reason) continue;
				set((state) => ({
					loadedPlugins: {
						...state.loadedPlugins,
						[key]: {
							key,
							source: 'catalog',
							manifestUrl: target.manifestUrl,
							status: 'error',
							manifest: null,
							error: `Turned off by Shiko: ${reason}`,
							generation: 0,
							disabledReason: reason,
						},
					},
				}));
				continue;
			}
			if (get().loadedPlugins[key]?.disabledReason !== undefined) unloadKey(key);
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

	const setRefresh = (nodeId: string, next: PluginRefreshState | null) =>
		set((state) => {
			const { [nodeId]: _previous, ...rest } = state.pluginRefreshes;
			return { pluginRefreshes: next ? { ...rest, [nodeId]: next } : rest };
		});

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
		pluginRefreshes: {},

		fetchMapPlugins: async (mapId, options) => {
			// Library plugins and turn-offs come from the server; Shiko's ship with the app.
			const [{ data, error }] = await Promise.all([
				get()
					.supabase.from('map_plugins')
					.select('plugin_id, version, previous_version, updated_at')
					.eq('map_id', mapId),
				refreshPluginLibrary({ force: options?.forceLibrary }),
			]);
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
			void get().fetchMapPlugins(mapId, { forceLibrary: true });
		},

		setMapPluginEnabled: async (pluginId, enabled) => {
			const mapId = get().mapId;
			if (!mapId || !isOwner()) return false;
			let saved: MapPluginRecord | null;
			try {
				saved = await requestMapPlugin(
					mapPluginRequest(mapId, pluginId, { enabled })
				);
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
				saved = await requestMapPlugin(
					mapPluginRequest(mapId, pluginId, { version })
				);
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
				pluginRefreshes: {},
			});
		},

		openPluginsPanel: () => {
			get().setPopoverOpen({ plugins: true, recipes: false, mapSettings: false });
		},

		refreshPluginNode: async (nodeId) => {
			const state = get();
			const mapId = state.mapId;
			const extension = state.nodes.find((node) => node.id === nodeId)?.data
				.metadata?.extension;
			// Viewers never refresh: only someone who can edit the map sends requests.
			if (!mapId || !extension || !canEditMap(state)) return false;
			const active = findActivePluginKind(
				state.loadedPlugins,
				extension.pluginId,
				extension.kind
			);
			if (!active?.canRefresh) return false;
			if (state.pluginRefreshes[nodeId]?.status === 'running') return false;

			const checked = validatePluginData(active.kind, extension.data);
			if (!checked.ok) {
				setRefresh(nodeId, {
					status: 'error',
					message: `${active.kind.label} data on this node isn't valid`,
				});
				return false;
			}
			setRefresh(nodeId, { status: 'running' });
			// Reviewed versions: the server names their sites. Developer plugins: their own.
			const target =
				active.source === 'catalog'
					? {
							kind: 'reviewed' as const,
							pluginId: active.manifest.id,
							version: active.manifest.version,
						}
					: {
							kind: 'developer' as const,
							hosts: networkHostsOf(active.manifest.permissions),
						};
			try {
				const host = await loadPluginHost();
				const ctx = pluginCallContext(true);
				const { data, responses } = await host.refresh(
					active.manifest.id,
					active.kind,
					checked.data,
					ctx,
					(urls) => requestPluginJson(urls, target)
				);
				const rendered = await host.render(
					active.manifest.id,
					active.kind,
					data,
					ctx
				);

				// Someone may have edited the node while the requests ran: keep their change.
				const latest = get().nodes.find((node) => node.id === nodeId)?.data
					.metadata?.extension;
				if (get().mapId !== mapId || !latest) {
					setRefresh(nodeId, null);
					return false;
				}
				if (JSON.stringify(latest.data) !== JSON.stringify(extension.data)) {
					setRefresh(nodeId, {
						status: 'error',
						message: 'The node changed while refreshing. Try again.',
					});
					return false;
				}

				const failed = Object.values(responses).find(
					(response) => response.status === 'error'
				);
				const result = await applyGraphOps(
					get,
					[
						{
							type: 'updateNode',
							nodeId,
							data: {
								content: rendered.summary,
								metadata: {
									extension: {
										...latest,
										kindLabel: active.kind.label,
										width: active.kind.width,
										version: active.manifest.version,
										data,
										snapshot: rendered.tree,
										// "Updated …" means every request came back.
										fetchedAt: failed
											? latest.fetchedAt
											: new Date().toISOString(),
									},
								},
							},
						},
					],
					{ kind: 'plugin', id: active.manifest.id, label: active.manifest.name },
					{ label: 'updateNode' }
				);
				if (!result.ok) throw new Error(result.error);
				setRefresh(
					nodeId,
					failed?.status === 'error'
						? { status: 'error', message: failed.message }
						: null
				);
				return !failed;
			} catch (error) {
				setRefresh(nodeId, {
					status: 'error',
					message:
						error instanceof Error
							? error.message
							: `${active.manifest.name} couldn't refresh`,
				});
				return false;
			}
		},

		getActivePluginKind: (pluginId, kindName) =>
			findActivePluginKind(get().loadedPlugins, pluginId, kindName),
	};
};
