/**
 * Helpers for plugin playground drafts: the id Shiko gives a draft, and the small
 * manifest edits the server makes without running the full schema (a draft may hold
 * half-typed JSON, so none of these throw on bad input).
 */
import { PLUGIN_ICON_KEYS, type PluginIconKey } from './manifest-schema';

const SLUG_MAX = 30;

function slugOf(name: string): string {
	const slug = name
		.normalize('NFKD')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, SLUG_MAX)
		.replace(/-+$/g, '');
	return slug || 'plugin';
}

/**
 * The plugin id Shiko assigns when a draft is created: `dev.<name>-<8 hex of the draft id>`.
 * The name part is frozen at creation, so renaming the plugin later never changes its id.
 * Matches the manifest id pattern and never starts with the reserved `shiko.` prefix.
 */
export function draftPluginId(name: string, draftId: string): string {
	const suffix = draftId
		.replace(/[^0-9a-f]/gi, '')
		.slice(0, 8)
		.toLowerCase();
	return `dev.${slugOf(name)}-${suffix}`;
}

/** The text as a JSON object, or null when it isn't valid JSON or isn't an object. */
export function parseObject(text: string): Record<string, unknown> | null {
	try {
		const value: unknown = JSON.parse(text);
		return value && typeof value === 'object' && !Array.isArray(value)
			? (value as Record<string, unknown>)
			: null;
	} catch {
		return null;
	}
}

/** The manifest text with `id` set to `pluginId` (first key), or null if it isn't a JSON object. */
export function withManifestId(text: string, pluginId: string): string | null {
	const parsed = parseObject(text);
	if (!parsed) return null;
	const { id: _replaced, ...rest } = parsed;
	return JSON.stringify({ id: pluginId, ...rest }, null, 2);
}

/**
 * Why a save must be refused because of the id, or null. Half-typed JSON is allowed
 * through (the editor locks the id line; this is the server-side guarantee once the
 * text parses).
 */
export function manifestIdProblem(
	text: string,
	pluginId: string
): string | null {
	const parsed = parseObject(text);
	if (!parsed) return null;
	return parsed.id === pluginId
		? null
		: `Shiko sets the id of this plugin (${pluginId}). Leave the "id" line as it is.`;
}

export interface DraftManifestSummary {
	name: string;
	icon: PluginIconKey;
	description: string;
}

const NAME_MAX = 40;
const DESCRIPTION_MAX = 140;

/** What a drafts list shows for a plugin, read from its manifest text; null if unreadable. */
export function draftManifestSummary(
	text: string
): DraftManifestSummary | null {
	const parsed = parseObject(text);
	if (!parsed) return null;
	const icon = (PLUGIN_ICON_KEYS as readonly unknown[]).includes(parsed.icon)
		? (parsed.icon as PluginIconKey)
		: 'puzzle';
	return {
		name: typeof parsed.name === 'string' ? parsed.name.slice(0, NAME_MAX) : '',
		icon,
		description:
			typeof parsed.description === 'string'
				? parsed.description.slice(0, DESCRIPTION_MAX)
				: '',
	};
}

/** `0.1.0` becomes `0.1.1`: the version a draft of a published plugin starts with. */
export function nextPatchVersion(version: string): string {
	const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
	return match ? `${match[1]}.${match[2]}.${Number(match[3]) + 1}` : version;
}
