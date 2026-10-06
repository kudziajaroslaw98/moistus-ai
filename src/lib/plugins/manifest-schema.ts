import { z } from 'zod';

/** Plugin API version this host implements. */
export const PLUGIN_API_VERSION = 1;

/** Icons a plugin can use for itself and its node kinds; mapped to Lucide in plugin-icons.ts. */
export const PLUGIN_ICON_KEYS = [
	'gauge',
	'columns',
	'puzzle',
	'target',
	'chart',
	'list-checks',
	'calendar',
	'timer',
	'flag',
	'star',
	'lightbulb',
	'file-text',
	'wallet',
	'scale',
] as const;
export type PluginIconKey = (typeof PLUGIN_ICON_KEYS)[number];

/** Capabilities a plugin can ask for. M1 only has `node:own` (its own nodes, no network). */
export const PLUGIN_PERMISSIONS = ['node:own'] as const;
export type PluginPermission = (typeof PLUGIN_PERMISSIONS)[number];

/** Built-in `$` triggers and system types a plugin kind can't take over. */
export const RESERVED_PLUGIN_KINDS = new Set([
	'note',
	'task',
	'code',
	'image',
	'link',
	'question',
	'annotation',
	'text',
	'reference',
	'resource',
	'group',
	'comment',
	'ghost',
	'extension',
	'default',
	// "$plugins" is the "More node types…" entry in the `$` list.
	'plugins',
]);

/** Node card widths in px. `wide` fits side-by-side columns (a Kanban board). */
export const PLUGIN_KIND_WIDTHS = { normal: 320, wide: 700 } as const;
export type PluginKindWidth = keyof typeof PLUGIN_KIND_WIDTHS;

export const PLUGIN_LIMITS = {
	nodeKinds: 8,
	fields: 12,
	enumOptions: 20,
	examples: 3,
	stringMaxLength: 500,
	defaultStringMaxLength: 200,
	/** Max serialized size of a node's plugin data, and of its saved snapshot. */
	dataBytes: 16 * 1024,
	/** Rows in one list field (also the default when a list sets no maxItems). */
	listItems: 30,
	listColumns: 6,
} as const;

/** Shiko's own key on every list row; plugins read it but columns can't use the name. */
export const LIST_ROW_ID_KEY = 'id';

// Plugin and field names appear in typed editor syntax (`target:2000`), so keep them plain.
const pluginIdSchema = z
	.string()
	.max(80)
	.regex(
		/^[a-z0-9]+(\.[a-z0-9-]+)+$/,
		'Use a reverse-DNS id like "shiko.metric"'
	);
const fieldNameSchema = z
	.string()
	.regex(
		/^[a-z][a-zA-Z0-9]{0,23}$/,
		'Field names start with a lowercase letter'
	);
const enumOptionSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,29}$/);

const fieldBase = {
	title: z.string().trim().min(1).max(40),
	description: z.string().trim().max(140).optional(),
};

const columnBase = {
	name: fieldNameSchema,
	title: z.string().trim().min(1).max(40),
	description: z.string().trim().max(140).optional(),
};

/** One column of a list field; rows are typed as `["Hotel", 520, paid]` in that order. */
export const pluginListColumnSchema = z.discriminatedUnion('type', [
	z.strictObject({
		...columnBase,
		type: z.literal('string'),
		required: z.boolean().optional(),
		maxLength: z
			.number()
			.int()
			.min(1)
			.max(PLUGIN_LIMITS.stringMaxLength)
			.optional(),
	}),
	z.strictObject({
		...columnBase,
		type: z.enum(['number', 'integer']),
		required: z.boolean().optional(),
		default: z.number().finite().optional(),
		min: z.number().finite().optional(),
		max: z.number().finite().optional(),
	}),
	/** Typed as the column's name (`paid`) when true; left out when false. */
	z.strictObject({ ...columnBase, type: z.literal('boolean') }),
	z.strictObject({
		...columnBase,
		type: z.literal('enum'),
		required: z.boolean().optional(),
		default: enumOptionSchema.optional(),
		options: z.array(enumOptionSchema).min(1).max(PLUGIN_LIMITS.enumOptions),
	}),
]);
export type PluginListColumn = z.infer<typeof pluginListColumnSchema>;

export const pluginFieldSpecSchema = z.discriminatedUnion('type', [
	z.strictObject({
		...fieldBase,
		type: z.literal('string'),
		required: z.boolean().optional(),
		default: z.string().optional(),
		maxLength: z
			.number()
			.int()
			.min(1)
			.max(PLUGIN_LIMITS.stringMaxLength)
			.optional(),
	}),
	z.strictObject({
		...fieldBase,
		type: z.enum(['number', 'integer']),
		required: z.boolean().optional(),
		default: z.number().finite().optional(),
		min: z.number().finite().optional(),
		max: z.number().finite().optional(),
	}),
	z.strictObject({
		...fieldBase,
		type: z.literal('boolean'),
		default: z.boolean().optional(),
	}),
	z.strictObject({
		...fieldBase,
		type: z.literal('enum'),
		required: z.boolean().optional(),
		default: enumOptionSchema.optional(),
		options: z.array(enumOptionSchema).min(1).max(PLUGIN_LIMITS.enumOptions),
	}),
	/** A calendar date, typed and stored as YYYY-MM-DD. */
	z.strictObject({
		...fieldBase,
		type: z.literal('date'),
		required: z.boolean().optional(),
	}),
	/** Rows of typed columns: `items:[["Flights", 640, paid], ["Hotel", 520]]`. */
	z.strictObject({
		...fieldBase,
		type: z.literal('list'),
		/** At least one row. */
		required: z.boolean().optional(),
		columns: z
			.array(pluginListColumnSchema)
			.min(1)
			.max(PLUGIN_LIMITS.listColumns),
		maxItems: z.number().int().min(1).max(PLUGIN_LIMITS.listItems).optional(),
	}),
]);
export type PluginFieldSpec = z.infer<typeof pluginFieldSpecSchema>;
export type PluginListFieldSpec = Extract<PluginFieldSpec, { type: 'list' }>;

export const pluginNodeKindSchema = z
	.strictObject({
		/** Also the editor trigger: `$metric`. Letters only, like built-in triggers. */
		kind: z
			.string()
			.regex(/^[a-z]{2,20}$/, 'Kinds are 2–20 lowercase letters')
			.refine(
				(kind) => !RESERVED_PLUGIN_KINDS.has(kind),
				'This kind is reserved'
			),
		label: z.string().trim().min(1).max(30),
		description: z.string().trim().max(140),
		icon: z.enum(PLUGIN_ICON_KEYS),
		/** String field that free text typed in the node editor goes into. */
		labelField: fieldNameSchema,
		fields: z
			.record(fieldNameSchema, pluginFieldSpecSchema)
			.refine(
				(fields) => Object.keys(fields).length <= PLUGIN_LIMITS.fields,
				`Up to ${PLUGIN_LIMITS.fields} fields`
			),
		examples: z
			.array(z.string().max(200))
			.max(PLUGIN_LIMITS.examples)
			.default([]),
		/** How wide this kind's nodes are; most kinds stay `normal`. */
		width: z.enum(['normal', 'wide']).optional(),
	})
	.superRefine((kind, ctx) => {
		const labelSpec = kind.fields[kind.labelField];
		if (!labelSpec || labelSpec.type !== 'string') {
			ctx.addIssue({
				code: 'custom',
				path: ['labelField'],
				message: 'labelField must name a string field',
			});
		}
		for (const [name, spec] of Object.entries(kind.fields)) {
			if (
				(spec.type === 'number' || spec.type === 'integer') &&
				spec.min !== undefined
			) {
				if (spec.max !== undefined && spec.min > spec.max) {
					ctx.addIssue({
						code: 'custom',
						path: ['fields', name],
						message: 'min is above max',
					});
				}
			}
			if (
				spec.type === 'enum' &&
				spec.default &&
				!spec.options.includes(spec.default)
			) {
				ctx.addIssue({
					code: 'custom',
					path: ['fields', name],
					message: 'default must be one of the options',
				});
			}
			if (spec.type === 'list') {
				const names = spec.columns.map((column) => column.name);
				if (new Set(names).size !== names.length) {
					ctx.addIssue({
						code: 'custom',
						path: ['fields', name, 'columns'],
						message: 'Column names must be unique',
					});
				}
				if (names.includes(LIST_ROW_ID_KEY)) {
					ctx.addIssue({
						code: 'custom',
						path: ['fields', name, 'columns'],
						message: `"${LIST_ROW_ID_KEY}" is reserved for Shiko's row ids`,
					});
				}
				for (const column of spec.columns) {
					if (
						column.type === 'enum' &&
						column.default &&
						!column.options.includes(column.default)
					) {
						ctx.addIssue({
							code: 'custom',
							path: ['fields', name, 'columns'],
							message: `${column.name}: default must be one of the options`,
						});
					}
				}
			}
		}
	});
export type PluginNodeKind = z.infer<typeof pluginNodeKindSchema>;

export const pluginManifestSchema = z
	.strictObject({
		id: pluginIdSchema,
		name: z.string().trim().min(1).max(40),
		version: z
			.string()
			.regex(/^\d+\.\d+\.\d+$/, 'Use a semver version like 1.0.0'),
		apiVersion: z.literal(PLUGIN_API_VERSION),
		author: z.string().trim().min(1).max(60),
		description: z.string().trim().max(140),
		icon: z.enum(PLUGIN_ICON_KEYS),
		permissions: z
			.array(z.enum(PLUGIN_PERMISSIONS))
			.min(1)
			.max(PLUGIN_PERMISSIONS.length),
		/** Plugin code, relative to the manifest. */
		main: z
			.string()
			.regex(/^[a-zA-Z0-9_\-/]+\.js$/, 'main must be a relative .js path')
			.refine((path) => !path.startsWith('/'), 'main must be relative'),
		nodeKinds: z
			.array(pluginNodeKindSchema)
			.min(1)
			.max(PLUGIN_LIMITS.nodeKinds),
	})
	.superRefine((manifest, ctx) => {
		const kinds = manifest.nodeKinds.map((kind) => kind.kind);
		if (new Set(kinds).size !== kinds.length) {
			ctx.addIssue({
				code: 'custom',
				path: ['nodeKinds'],
				message: 'Kinds must be unique',
			});
		}
	});
export type PluginManifest = z.infer<typeof pluginManifestSchema>;

/** Readable one-line reason a manifest was rejected, for Settings and dev loading. */
export function describeManifestError(error: z.ZodError): string {
	const issue = error.issues[0];
	if (!issue) return 'The manifest is not valid.';
	const path = issue.path.join('.');
	return path ? `${path}: ${issue.message}` : issue.message;
}
