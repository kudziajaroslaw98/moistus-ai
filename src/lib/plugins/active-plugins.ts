import type { ActivePluginKind, LoadedPlugin } from '@/types/plugins';

/** A ready plugin's node kind, or null when that plugin isn't running on this map. */
export function findActivePluginKind(
	loadedPlugins: Record<string, LoadedPlugin>,
	pluginId: string,
	kindName: string
): ActivePluginKind | null {
	for (const plugin of Object.values(loadedPlugins)) {
		if (plugin.status !== 'ready' || plugin.manifest?.id !== pluginId) continue;
		const kind = plugin.manifest.nodeKinds.find(
			(candidate) => candidate.kind === kindName
		);
		return kind
			? { manifest: plugin.manifest, kind, source: plugin.source }
			: null;
	}
	return null;
}

/** Display name for a kind when its plugin isn't loaded: "metric" → "Metric". */
export function humanizeKind(kind: string): string {
	return kind ? kind.charAt(0).toUpperCase() + kind.slice(1) : 'Plugin node';
}
