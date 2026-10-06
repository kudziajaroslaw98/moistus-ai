import type {
	PluginManifest,
	PluginNodeKind,
} from '@/lib/plugins/manifest-schema';

/** Identifies a plugin node kind: the plugin and one of its kinds. */
export interface PluginKindRef {
	pluginId: string;
	kind: string;
}

/** A plugin the map owner turned on (a `map_plugins` row). */
export interface MapPluginRecord {
	pluginId: string;
	/** The catalog version this map is pinned to. */
	version: string;
	/** The version the owner updated from, so they can roll back to it. */
	previousVersion: string | null;
	/** When the plugin was last turned on, updated or rolled back. */
	updatedAt: string | null;
}

export type PluginSource = 'catalog' | 'dev';

export type LoadedPluginStatus = 'loading' | 'ready' | 'error';

/** A plugin this browser is loading or has loaded for the open map. */
export interface LoadedPlugin {
	/** Catalog plugin id, or the manifest URL for developer plugins. */
	key: string;
	source: PluginSource;
	manifestUrl: string;
	status: LoadedPluginStatus;
	/** Set once the manifest is valid. */
	manifest: PluginManifest | null;
	error: string | null;
	/** New for every successful (re)load, so views drawn by older code aren't reused. */
	generation: number;
	/** Kinds whose code defines `actions.refresh` (set once loaded). */
	refreshKinds?: string[];
}

export interface ActivePluginKind {
	manifest: PluginManifest;
	kind: PluginNodeKind;
	source: PluginSource;
	/** The loaded plugin's generation (see `LoadedPlugin.generation`). */
	generation: number;
	/** The plugin reaches a site and this kind defines `refresh`: editors can refresh it. */
	canRefresh?: boolean;
	/** The plugin has `branch:read`: render and actions get `ctx.branch`. */
	readsBranch?: boolean;
}

/** A refresh running on a node, or why the last one failed (this browser only). */
export type PluginRefreshState =
	| { status: 'running' }
	| { status: 'error'; message: string };

export interface PluginsSlice {
	mapPlugins: MapPluginRecord[];
	/** Whether `mapPlugins` reflects the server (false while loading or offline). */
	mapPluginsLoaded: boolean;
	loadedPlugins: Record<string, LoadedPlugin>;
	/** Developer plugin manifest URLs for this map, stored in this browser only. */
	devPluginUrls: string[];
	fetchMapPlugins: (mapId: string) => Promise<void>;
	/** Re-reads the map's plugins at most every few seconds (a collaborator may have changed them). */
	refreshMapPluginsSoon: () => void;
	setMapPluginEnabled: (pluginId: string, enabled: boolean) => Promise<boolean>;
	/** Owner: move the map to another catalog version (Update or Roll back). */
	setMapPluginVersion: (pluginId: string, version: string) => Promise<boolean>;
	addDevPlugin: (
		manifestUrl: string
	) => Promise<{ ok: boolean; error?: string }>;
	removeDevPlugin: (manifestUrl: string) => void;
	/** Loads or unloads developer plugins after Developer mode (or the profile) changes. */
	syncDeveloperPlugins: () => void;
	reloadDevPlugin: (manifestUrl: string) => Promise<void>;
	resetPlugins: () => void;
	/** Opens the Plugins side panel (closes the other right-hand panels). */
	openPluginsPanel: () => void;
	/** Refreshes running or failed in this browser, by node id. */
	pluginRefreshes: Record<string, PluginRefreshState>;
	/**
	 * Editors: runs a network plugin node's `refresh` (two passes, Shiko fetches the URLs
	 * it asks for) and saves the result as one History entry credited to the plugin.
	 * Resolves false when nothing was saved or a request failed (see `pluginRefreshes`).
	 */
	refreshPluginNode: (nodeId: string) => Promise<boolean>;
	/** A ready plugin's kind, or null when it isn't loaded on this map. */
	getActivePluginKind: (
		pluginId: string,
		kind: string
	) => ActivePluginKind | null;
}
