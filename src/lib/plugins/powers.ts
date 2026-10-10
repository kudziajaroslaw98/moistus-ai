import {
	networkHostOf,
	type PluginManifest,
	type PluginNetworkHostInfo,
	type PluginPermission,
} from './manifest-schema';

/** A site a plugin may reach, with who runs it (from the manifest's `networkHosts`). */
export interface PluginSite extends PluginNetworkHostInfo {
	host: string;
}

/** What a plugin can reach beyond its own nodes, for cards, sheets and notes. */
export type PluginPowers =
	| { kind: 'own' }
	| { kind: 'branch' }
	| { kind: 'network'; sites: PluginSite[] };

export function pluginPowers(manifest: PluginManifest): PluginPowers {
	const sites = manifest.permissions.flatMap((permission): PluginSite[] => {
		const host = networkHostOf(permission);
		const info = host ? manifest.networkHosts?.[host] : undefined;
		return host && info ? [{ host, ...info }] : [];
	});
	if (sites.length > 0) return { kind: 'network', sites };
	if (manifest.permissions.includes('branch:read')) return { kind: 'branch' };
	return { kind: 'own' };
}

/** Short name of one power, as in "New powers: reaches api.github.com". */
export function describePermission(permission: PluginPermission): string {
	if (permission === 'node:own') return 'its own nodes';
	if (permission === 'branch:read') return 'reads the nodes under it';
	return `reaches ${networkHostOf(permission)}`;
}

/**
 * Whether the plugin's author receives what's sent: " The plugin's author doesn't receive
 * it." for reviewed plugins, or who runs which site when the reviewer marked the author's
 * own hosts. Empty for developer plugins (the author is the person loading it).
 */
export function authorReceivesNote(
	sites: readonly PluginSite[],
	reviewed: boolean,
	authorHosts: readonly string[] = [],
	pronoun: 'it' | 'them' = 'it'
): string {
	if (!reviewed) return '';
	const own = sites.filter((site) => authorHosts.includes(site.host));
	return own.length === 0
		? ` The plugin’s author doesn’t receive ${pronoun}.`
		: ` The plugin’s author runs ${listHosts(own)}, so they receive what goes there.`;
}

/** "api.github.com" or "api.github.com and en.wikipedia.org". */
export function listHosts(sites: readonly PluginSite[]): string {
	const hosts = sites.map((site) => site.host);
	return hosts.length <= 1
		? (hosts[0] ?? '')
		: `${hosts.slice(0, -1).join(', ')} and ${hosts[hosts.length - 1]}`;
}

/** Cover accent per kind of power (HSL hue): none green, reads its branch violet, sends to a site blue. */
export const PLUGIN_POWER_HUES: Record<PluginPowers['kind'], number> = {
	own: 152,
	branch: 270,
	network: 214,
};

/** The kind of power in a permission list (as stored with a published version). */
export function powerKindOfPermissions(
	permissions: readonly string[]
): PluginPowers['kind'] {
	if (permissions.some((permission) => networkHostOf(permission)))
		return 'network';
	if (permissions.includes('branch:read')) return 'branch';
	return 'own';
}

/** One short line for a card's detail row: "No powers", "Reads its branch", "Sends to api.github.com". */
export function describePowerKind(permissions: readonly string[]): string {
	const kind = powerKindOfPermissions(permissions);
	if (kind === 'branch') return 'Reads its branch';
	if (kind === 'own') return 'No powers';
	const hosts = permissions
		.map((permission) => networkHostOf(permission))
		.filter((host): host is string => Boolean(host));
	return `Sends to ${hosts.join(', ')}`;
}
