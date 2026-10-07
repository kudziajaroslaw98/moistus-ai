import {
	MAX_PLUGIN_CODE_BYTES,
	PLUGIN_BRANCH_LIMITS,
	PLUGIN_REQUEST_LIMITS,
	SANDBOX_LIMITS,
} from '@/lib/plugins/limits';
import {
	PLUGIN_API_VERSION,
	PLUGIN_ICON_KEYS,
	PLUGIN_KIND_WIDTHS,
	PLUGIN_LIMITS,
	PLUGIN_POWER_LIMITS,
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

export const MANIFEST_ROWS: GuideRow[] = [
	{ name: 'id', description: 'Reverse-DNS and lowercase, like dev.yourname.counter' },
	{ name: 'name, description', description: 'Shown in the Plugins panel (up to 40 and 140 characters)' },
	{ name: 'version', description: 'Three numbers, like 1.0.0' },
	{ name: 'apiVersion', description: `Always ${PLUGIN_API_VERSION}` },
	{ name: 'icon', description: PLUGIN_ICON_KEYS.join(', ') },
	{ name: 'permissions', description: `"node:own" (its own nodes), plus either "branch:read" (read the nodes under it) or up to ${PLUGIN_POWER_LIMITS.networkHosts} "network:<host>" (fetch from that site when an editor refreshes), never both` },
	{ name: 'networkHosts', description: 'For each network host: operator (who runs it), privacyPolicy (an https link) and sends (what goes there, like "issue addresses"). Shown before anything is sent' },
	{ name: 'main', description: 'The code file, relative to manifest.json' },
	{ name: 'nodeKinds', description: `Up to ${PLUGIN_LIMITS.nodeKinds} kinds of node` },
];

export const NODE_KIND_ROWS: GuideRow[] = [
	{ name: 'kind', description: '2–20 lowercase letters. It becomes the $ trigger, so built-in names like note or task are taken.' },
	{ name: 'label, description, icon', description: 'How the kind shows up in the $ list and on its nodes' },
	{ name: 'labelField', description: 'The string field that plain text goes into' },
	{ name: 'fields', description: `Up to ${PLUGIN_LIMITS.fields}, keyed by name (a lowercase letter, then letters or digits). A field with setBy: "refresh" is filled only by your refresh action and isn't typed in the editor` },
	{ name: 'examples', description: `Up to ${PLUGIN_LIMITS.examples} lines shown in Syntax Help` },
	{ name: 'width', description: `normal (${PLUGIN_KIND_WIDTHS.normal} px, the default) or wide (${PLUGIN_KIND_WIDTHS.wide} px) for columns side by side, like a board` },
];

export const FIELD_TYPE_ROWS: GuideRow[] = [
	{ name: 'string', description: `title, description, required, default, maxLength (up to ${PLUGIN_LIMITS.stringMaxLength})` },
	{ name: 'number, integer', description: 'title, description, required, default, min, max' },
	{ name: 'boolean', description: 'title, description, default (typed as yes or no)' },
	{ name: 'enum', description: `title, description, options (up to ${PLUGIN_LIMITS.enumOptions}), required, default` },
	{ name: 'date', description: 'title, description, required (typed and stored as 2026-12-31)' },
	{
		name: 'list',
		description: `title, description, required, maxItems (up to ${PLUGIN_LIMITS.listItems}), columns (up to ${PLUGIN_LIMITS.listColumns}, each a string, number, integer, boolean or enum with a name). Typed as items:[["Hotel", 520, paid]]; a yes/no column is its own name. Each row reaches your code as an object with an id from Shiko.`,
	},
];

/** Every view piece a plugin can return. `type` must match ui-tree.ts (checked by a test). */
export const UI_CALLS: Array<GuideRow & { type: string }> = [
	{ type: 'stack', name: 'ui.stack(options, children)', description: 'Pieces on top of each other. gap 0–4, align. Any piece also takes key: give each list row its row.id' },
	{ type: 'row', name: 'ui.row(options, children)', description: 'Pieces side by side. gap, align, justify, wrap, or equal: true to give each piece the same width (columns)' },
	{ type: 'text', name: 'ui.text(value, options)', description: `Up to ${PLUGIN_UI_LIMITS.text} characters. size sm–xl, tone default / muted / strong, weight` },
	{ type: 'badge', name: 'ui.badge(label, options)', description: 'tone neutral / success / warning / danger / info' },
	{ type: 'progress', name: 'ui.progress(value, options)', description: 'value from 0 to 1. label, showValue' },
	{ type: 'button', name: 'ui.button(label, action, options)', description: `Runs actions[action]. icon, iconOnly (the label is read out and shown on hover), payload (up to ${formatBytes(PLUGIN_UI_LIMITS.payloadBytes)})` },
	{ type: 'checkbox', name: 'ui.checkbox(label, checked, action, options)', description: 'Runs actions[action]. payload' },
	{ type: 'divider', name: 'ui.divider(options)', description: 'A line between pieces' },
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
	{ name: 'Requests', description: `Only in refresh: ${PLUGIN_REQUEST_LIMITS.perRefresh} per refresh, each answer up to ${formatBytes(PLUGIN_REQUEST_LIMITS.responseBytes)} and ${PLUGIN_REQUEST_LIMITS.timeoutMs / 1000} s` },
	{ name: 'ctx.branch', description: `${PLUGIN_BRANCH_LIMITS.nodes} nodes, ${PLUGIN_BRANCH_LIMITS.text} characters of text each` },
];

/** The powers a manifest can ask for, beyond its own nodes. */
export const POWER_ROWS: GuideRow[] = [
	{
		name: 'network:<host>',
		description: `GET requests to that host over https, up to ${PLUGIN_POWER_LIMITS.networkHosts} hosts. For each one, say under networkHosts who runs it, link their privacy policy and say what you send; review checks all three. If it's your own server, link your own policy: people are told the plugin's author receives what it sends.`,
	},
	{
		name: 'branch:read',
		description: 'The nodes under yours: type, text, tasks done and total, status, priority, assigned people, due date and tags. Nothing leaves the browser.',
	},
	{
		name: 'Not both',
		description: 'A plugin can reach the internet or read the branch, never both. That way text other people wrote never leaves Shiko through a plugin.',
	},
];
