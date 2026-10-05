import type {
	PluginManifest,
	PluginNodeKind,
} from '@/lib/plugins/manifest-schema';

/** A plugin the map owner turned on (a `map_plugins` row). */
export interface MapPluginRecord {
	pluginId: string;
	version: string;
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
}

export interface ActivePluginKind {
	manifest: PluginManifest;
	kind: PluginNodeKind;
	source: PluginSource;
}

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
	addDevPlugin: (
		manifestUrl: string
	) => Promise<{ ok: boolean; error?: string }>;
	removeDevPlugin: (manifestUrl: string) => void;
	reloadDevPlugin: (manifestUrl: string) => Promise<void>;
	resetPlugins: () => void;
	/** A ready plugin's kind, or null when it isn't loaded on this map. */
	getActivePluginKind: (
		pluginId: string,
		kind: string
	) => ActivePluginKind | null;
}
