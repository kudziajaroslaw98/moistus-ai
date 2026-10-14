import { PLUGIN_LIMITS } from '@/lib/plugins/manifest-schema';
import { z } from 'zod';

/**
 * The declarative UI a plugin returns from `render()`. Shiko draws it with its own
 * components, so plugins never inject markup. There are deliberately no images, links,
 * markdown or HTML: a URL could carry node data out of the map.
 */

export const PLUGIN_UI_ICON_NAMES = [
	'plus',
	'minus',
	'check',
	'x',
	'refresh',
	'play',
	'pause',
	'arrow-up',
	'arrow-down',
	'arrow-left',
	'arrow-right',
	'star',
	'flag',
	'target',
	'circle',
	'circle-check',
	'circle-minus',
	'triangle-alert',
	'ellipsis',
	'list',
	'rotate-ccw',
	'trash',
] as const;
export type PluginUiIconName = (typeof PLUGIN_UI_ICON_NAMES)[number];

export const PLUGIN_UI_LIMITS = {
	depth: 8,
	nodes: 200,
	children: 50,
	text: 500,
	payloadBytes: 1024,
	menuItems: 10,
} as const;

type Gap = 0 | 1 | 2 | 3 | 4;
export type PluginUiTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';
type Tone = PluginUiTone;

/**
 * Asks Shiko to let the person click a node on the canvas, then runs the button's action
 * with `{ ...payload, nodeId }`. The bar says `title` (and `hint`); `marked` lists nodes to
 * number 1, 2, 3 while it's open (the ones already picked, in order).
 */
export interface PluginUiPick {
	title: string;
	hint?: string;
	marked?: string[];
}

export type PluginUiMenuItem =
	| {
			label: string;
			action: string;
			payload?: unknown;
			icon?: PluginUiIconName;
			danger?: boolean;
			pick?: PluginUiPick;
	  }
	| { separator: true };

/**
 * Every piece may carry a `key` (unique among its siblings, e.g. a list row's id) so the
 * view keeps focus and identity when rows move; without one, position is used.
 */
export type PluginUiNode = (
	| {
			type: 'stack';
			gap?: Gap;
			align?: 'start' | 'center' | 'end' | 'stretch';
			/** Draws the group as a tinted panel, in the same colors as a badge. */
			tone?: Tone;
			children: PluginUiNode[];
	  }
	| {
			type: 'row';
			gap?: Gap;
			align?: 'start' | 'center' | 'end' | 'baseline';
			justify?: 'start' | 'center' | 'end' | 'between';
			wrap?: boolean;
			/** Children share the row's width equally (board columns); justify and wrap don't apply. */
			equal?: boolean;
			/** Draws the group as a tinted panel, in the same colors as a badge. */
			tone?: Tone;
			children: PluginUiNode[];
	  }
	| {
			type: 'text';
			value: string;
			size?: 'sm' | 'md' | 'lg' | 'xl';
			tone?: 'default' | 'muted' | 'strong' | 'info' | 'success' | 'warning' | 'danger';
			weight?: 'normal' | 'medium' | 'semibold';
			strike?: boolean;
	  }
	| { type: 'badge'; label: string; tone?: Tone }
	| {
			type: 'progress';
			value: number;
			label?: string;
			showValue?: boolean;
			tone?: 'info' | 'success';
	  }
	| {
			type: 'button';
			label: string;
			action: string;
			icon?: PluginUiIconName;
			/** Shows only the icon; `label` becomes the button's accessible name and tooltip. */
			iconOnly?: boolean;
			payload?: unknown;
			pick?: PluginUiPick;
			/** Opens this node in the node editor instead of running the action (with a new line ready for a checklist). */
			edit?: boolean;
	  }
	| {
			/** A "⋯" button that opens a list of actions. `label` names the button for screen readers. */
			type: 'menu';
			label: string;
			items: PluginUiMenuItem[];
	  }
	| {
			type: 'checkbox';
			label: string;
			checked: boolean;
			action: string;
			payload?: unknown;
	  }
	| { type: 'divider' }
	| { type: 'icon'; name: PluginUiIconName; tone?: Tone }
) & { key?: string };

const gapSchema = z.union([
	z.literal(0),
	z.literal(1),
	z.literal(2),
	z.literal(3),
	z.literal(4),
]);
const toneSchema = z.enum(['neutral', 'success', 'warning', 'danger', 'info']);
const keySchema = z.string().min(1).max(64).optional();
const iconNameSchema = z.enum(PLUGIN_UI_ICON_NAMES);
const actionSchema = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,31}$/);
const payloadSchema = z
	.unknown()
	.refine(
		(payload) =>
			payload === undefined ||
			jsonBytes(payload) <= PLUGIN_UI_LIMITS.payloadBytes,
		`Action payloads can be up to ${PLUGIN_UI_LIMITS.payloadBytes} bytes`
	);

const pickSchema = z.strictObject({
	title: z.string().min(1).max(80),
	hint: z.string().max(120).optional(),
	marked: z
		.array(z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i))
		.max(100)
		.optional(),
});

const menuItemSchema = z.union([
	z.strictObject({
		label: z.string().min(1).max(30),
		action: actionSchema,
		payload: payloadSchema.optional(),
		icon: iconNameSchema.optional(),
		danger: z.boolean().optional(),
		pick: pickSchema.optional(),
	}),
	z.strictObject({ separator: z.literal(true) }),
]);

export const pluginUiNodeSchema: z.ZodType<PluginUiNode> = z.lazy(() =>
	z.discriminatedUnion('type', [
		z.strictObject({
			type: z.literal('stack'),
			key: keySchema,
			gap: gapSchema.optional(),
			align: z.enum(['start', 'center', 'end', 'stretch']).optional(),
			tone: toneSchema.optional(),
			children: z.array(pluginUiNodeSchema).max(PLUGIN_UI_LIMITS.children),
		}),
		z.strictObject({
			type: z.literal('row'),
			key: keySchema,
			gap: gapSchema.optional(),
			align: z.enum(['start', 'center', 'end', 'baseline']).optional(),
			justify: z.enum(['start', 'center', 'end', 'between']).optional(),
			wrap: z.boolean().optional(),
			equal: z.boolean().optional(),
			tone: toneSchema.optional(),
			children: z.array(pluginUiNodeSchema).max(PLUGIN_UI_LIMITS.children),
		}),
		z.strictObject({
			type: z.literal('text'),
			key: keySchema,
			value: z.string().max(PLUGIN_UI_LIMITS.text),
			size: z.enum(['sm', 'md', 'lg', 'xl']).optional(),
			tone: z
				.enum(['default', 'muted', 'strong', 'info', 'success', 'warning', 'danger'])
				.optional(),
			weight: z.enum(['normal', 'medium', 'semibold']).optional(),
			strike: z.boolean().optional(),
		}),
		z.strictObject({
			type: z.literal('badge'),
			key: keySchema,
			label: z.string().min(1).max(40),
			tone: toneSchema.optional(),
		}),
		z.strictObject({
			type: z.literal('progress'),
			key: keySchema,
			value: z.number().finite().min(0).max(1),
			label: z.string().max(60).optional(),
			showValue: z.boolean().optional(),
			tone: z.enum(['info', 'success']).optional(),
		}),
		z.strictObject({
			type: z.literal('button'),
			key: keySchema,
			label: z.string().min(1).max(30),
			action: actionSchema,
			icon: z.enum(PLUGIN_UI_ICON_NAMES).optional(),
			iconOnly: z.boolean().optional(),
			payload: payloadSchema.optional(),
			pick: pickSchema.optional(),
			edit: z.boolean().optional(),
		}),
		z.strictObject({
			type: z.literal('menu'),
			key: keySchema,
			label: z.string().min(1).max(60),
			items: z.array(menuItemSchema).min(1).max(PLUGIN_UI_LIMITS.menuItems),
		}),
		z.strictObject({
			type: z.literal('checkbox'),
			key: keySchema,
			label: z.string().min(1).max(120),
			checked: z.boolean(),
			action: actionSchema,
			payload: payloadSchema.optional(),
		}),
		z.strictObject({ type: z.literal('divider'), key: keySchema }),
		z.strictObject({
			type: z.literal('icon'),
			key: keySchema,
			name: z.enum(PLUGIN_UI_ICON_NAMES),
			tone: toneSchema.optional(),
		}),
	])
);

/**
 * The `pick` request of the button or menu item that runs `action` with `payload`. Shiko
 * looks it up in the view a plugin action just returned, to keep the pick bar and the
 * numbered nodes in step with the plugin's data.
 */
export function findPluginPick(
	tree: PluginUiNode,
	action: string,
	payload: unknown
): PluginUiPick | null {
	const wanted = JSON.stringify(payload ?? null);
	const matches = (candidate: { action: string; payload?: unknown }) =>
		candidate.action === action && JSON.stringify(candidate.payload ?? null) === wanted;

	switch (tree.type) {
		case 'button':
			return tree.pick && matches(tree) ? tree.pick : null;
		case 'menu':
			for (const item of tree.items) {
				if ('separator' in item) continue;
				if (item.pick && matches(item)) return item.pick;
			}
			return null;
		case 'stack':
		case 'row':
			for (const child of tree.children) {
				const found = findPluginPick(child, action, payload);
				if (found) return found;
			}
			return null;
		default:
			return null;
	}
}

/** UTF-8 size of a JSON value (no TextEncoder: jsdom tests don't have it). */
export function jsonBytes(value: unknown): number {
	let json: string | undefined;
	try {
		json = JSON.stringify(value);
	} catch {
		return Number.POSITIVE_INFINITY;
	}
	if (json === undefined) return 0;
	let bytes = 0;
	for (const char of json) {
		const code = char.codePointAt(0) ?? 0;
		bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
	}
	return bytes;
}

function measureTree(
	node: PluginUiNode,
	depth: number
): { depth: number; nodes: number } {
	if (node.type !== 'stack' && node.type !== 'row') return { depth, nodes: 1 };
	let maxDepth = depth;
	let nodes = 1;
	for (const child of node.children) {
		const measured = measureTree(child, depth + 1);
		maxDepth = Math.max(maxDepth, measured.depth);
		nodes += measured.nodes;
	}
	return { depth: maxDepth, nodes };
}

export type PluginTreeResult =
	{ ok: true; tree: PluginUiNode } | { ok: false; error: string };

/** Checks a plugin's render output: known primitives only, within size and depth limits. */
export function validatePluginTree(input: unknown): PluginTreeResult {
	if (jsonBytes(input) > PLUGIN_LIMITS.dataBytes) {
		return {
			ok: false,
			error: `The view is larger than ${PLUGIN_LIMITS.dataBytes} bytes`,
		};
	}
	const parsed = pluginUiNodeSchema.safeParse(input);
	if (!parsed.success) {
		const issue = parsed.error.issues[0];
		const path = issue?.path.join('.') || 'root';
		return {
			ok: false,
			error: `Invalid view at ${path}: ${issue?.message ?? 'unknown'}`,
		};
	}
	const { depth, nodes } = measureTree(parsed.data, 1);
	if (depth > PLUGIN_UI_LIMITS.depth) {
		return {
			ok: false,
			error: `The view is nested deeper than ${PLUGIN_UI_LIMITS.depth}`,
		};
	}
	if (nodes > PLUGIN_UI_LIMITS.nodes) {
		return {
			ok: false,
			error: `The view has more than ${PLUGIN_UI_LIMITS.nodes} elements`,
		};
	}
	return { ok: true, tree: parsed.data };
}
