import { MAX_PLUGIN_CODE_BYTES, SANDBOX_LIMITS } from '@/lib/plugins/limits';
import {
	PLUGIN_API_VERSION,
	PLUGIN_ICON_KEYS,
	PLUGIN_LIMITS,
	PLUGIN_PERMISSIONS,
} from '@/lib/plugins/manifest-schema';
import { PLUGIN_UI_ICON_NAMES, PLUGIN_UI_LIMITS } from '@/lib/plugins/ui-tree';

/**
 * Reference tables for the "Build a plugin" guide, built from the same constants the
 * runtime enforces so the guide can't drift from what Shiko accepts.
 */

export interface GuideRow {
	name: string;
	description: string;
}

const formatBytes = (bytes: number) =>
	bytes >= 1024 * 1024 ? `${bytes / (1024 * 1024)} MB` : `${bytes / 1024} KB`;

const permissions = PLUGIN_PERMISSIONS.map((permission) => `"${permission}"`).join(', ');

export const MANIFEST_ROWS: GuideRow[] = [
	{ name: 'id', description: 'Reverse-DNS and lowercase, like dev.yourname.counter' },
	{ name: 'name, description', description: 'Shown in the Plugins panel (up to 40 and 140 characters)' },
	{ name: 'version', description: 'Three numbers, like 1.0.0' },
	{ name: 'apiVersion', description: `Always ${PLUGIN_API_VERSION}` },
	{ name: 'icon', description: PLUGIN_ICON_KEYS.join(', ') },
	{ name: 'permissions', description: `Always [${permissions}] for now: the plugin sees and changes only its own nodes` },
	{ name: 'main', description: 'The code file, relative to manifest.json' },
	{ name: 'nodeKinds', description: `Up to ${PLUGIN_LIMITS.nodeKinds} kinds of node` },
];

export const NODE_KIND_ROWS: GuideRow[] = [
	{ name: 'kind', description: '2–20 lowercase letters. It becomes the $ trigger, so built-in names like note or task are taken.' },
	{ name: 'label, description, icon', description: 'How the kind shows up in the $ list and on its nodes' },
	{ name: 'labelField', description: 'The string field that plain text goes into' },
	{ name: 'fields', description: `Up to ${PLUGIN_LIMITS.fields}, keyed by name (a lowercase letter, then letters or digits)` },
	{ name: 'examples', description: `Up to ${PLUGIN_LIMITS.examples} lines shown in Syntax Help` },
];

export const FIELD_TYPE_ROWS: GuideRow[] = [
	{ name: 'string', description: `title, description, required, default, maxLength (up to ${PLUGIN_LIMITS.stringMaxLength})` },
	{ name: 'number, integer', description: 'title, description, required, default, min, max' },
	{ name: 'boolean', description: 'title, description, default (typed as yes or no)' },
	{ name: 'enum', description: `title, description, options (up to ${PLUGIN_LIMITS.enumOptions}), required, default` },
];

/** Every view piece a plugin can return. `type` must match ui-tree.ts (checked by a test). */
export const UI_CALLS: Array<GuideRow & { type: string }> = [
	{ type: 'stack', name: 'ui.stack(options, children)', description: 'Pieces on top of each other. gap 0–4, align' },
	{ type: 'row', name: 'ui.row(options, children)', description: 'Pieces side by side. gap, align, justify, wrap' },
	{ type: 'text', name: 'ui.text(value, options)', description: `Up to ${PLUGIN_UI_LIMITS.text} characters. size sm–xl, tone default / muted / strong, weight` },
	{ type: 'badge', name: 'ui.badge(label, options)', description: 'tone neutral / success / warning / danger / info' },
	{ type: 'progress', name: 'ui.progress(value, options)', description: 'value from 0 to 1. label, showValue' },
	{ type: 'button', name: 'ui.button(label, action, options)', description: `Runs actions[action]. icon, payload (up to ${formatBytes(PLUGIN_UI_LIMITS.payloadBytes)})` },
	{ type: 'checkbox', name: 'ui.checkbox(label, checked, action, options)', description: 'Runs actions[action]. payload' },
	{ type: 'divider', name: 'ui.divider()', description: 'A line between pieces' },
	{ type: 'icon', name: 'ui.icon(name, options)', description: `tone. name is one of ${PLUGIN_UI_ICON_NAMES.join(', ')}` },
];

export const LIMIT_ROWS: GuideRow[] = [
	{ name: 'plugin.js', description: formatBytes(MAX_PLUGIN_CODE_BYTES) },
	{ name: 'Memory', description: `${formatBytes(SANDBOX_LIMITS.memoryBytes)} per plugin` },
	{ name: 'Loading the code', description: `${SANDBOX_LIMITS.loadMs} ms` },
	{ name: 'render', description: `${SANDBOX_LIMITS.renderMs} ms` },
	{ name: 'An action', description: `${SANDBOX_LIMITS.actionMs} ms` },
	{ name: 'A node’s data', description: formatBytes(PLUGIN_LIMITS.dataBytes) },
	{ name: 'A view', description: `${PLUGIN_UI_LIMITS.nodes} pieces, ${PLUGIN_UI_LIMITS.depth} levels deep, ${formatBytes(PLUGIN_LIMITS.dataBytes)}` },
];
