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

/**
 * Powers a plugin can ask for. Every plugin has `node:own` (its own nodes). On top of it a
 * plugin may read the branch under its node (`branch:read`) or reach up to three sites
 * (`network:<host>`), never both: a plugin that can read other people's text can't send
 * anything out, and one that reaches a site only ever sends what's typed into its node.
 */
export type PluginPermission = 'node:own' | 'branch:read' | `network:${string}`;

export const PLUGIN_POWER_LIMITS = { networkHosts: 3 } as const;

const NETWORK_PREFIX = 'network:';

// Names that never resolve to a public site (or name the visitor's own network).
const PRIVATE_HOST_SUFFIXES = [
	'localhost',
	'local',
	'localdomain',
	'internal',
	'intranet',
	'lan',
	'home',
	'corp',
	'private',
	'test',
	'example',
	'invalid',
	'arpa',
	'onion',
];
// Lowercase DNS labels with a letter-led top-level label, so IP addresses don't match.
const HOST_PATTERN =
	/^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,61}[a-z0-9]$/;

/** Why `host` can't be a plugin's network host, or null when it can. */
export function networkHostProblem(host: string): string | null {
	if (!HOST_PATTERN.test(host)) {
		return `"${host}" isn't a public host name (lowercase, like api.github.com; no IP addresses or ports)`;
	}
	const last = host.slice(host.lastIndexOf('.') + 1);
	if (PRIVATE_HOST_SUFFIXES.includes(last)) {
		return `"${host}" is a private or reserved name`;
	}
	return null;
}

/** The host of a `network:<host>` power, or null for other powers. */
export function networkHostOf(permission: string): string | null {
	return permission.startsWith(NETWORK_PREFIX)
		? permission.slice(NETWORK_PREFIX.length)
		: null;
}

/** Every site a plugin may reach, from its powers. */
export function networkHostsOf(permissions: readonly string[]): string[] {
	return permissions.flatMap((permission) => {
		const host = networkHostOf(permission);
		return host ? [host] : [];
	});
}

const permissionSchema = z
	.string()
	.max(270)
	.superRefine((value, ctx) => {
		if (value === 'node:own' || value === 'branch:read') return;
		const host = networkHostOf(value);
		const problem = host
			? networkHostProblem(host)
			: `Unknown power "${value}" (use node:own, branch:read or network:<host>)`;
		if (problem) ctx.addIssue({ code: 'custom', message: problem });
	})
	.transform((value) => value as PluginPermission);

/** Who runs a site a plugin reaches; shown to owners and editors before anything is sent. */
const networkHostInfoSchema = z.strictObject({
	/** "GitHub". */
	operator: z.string().trim().min(1).max(60),
	/** The operator's privacy policy, an https link. */
	privacyPolicy: z
		.string()
		.max(300)
		.refine((link) => {
			try {
				return new URL(link).protocol === 'https:';
			} catch {
				return false;
			}
		}, 'privacyPolicy must be an https link'),
	/** What the plugin sends there, as a plural noun: "issue addresses". */
	sends: z.string().trim().min(1).max(80),
});
export type PluginNetworkHostInfo = z.infer<typeof networkHostInfoSchema>;

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
	/**
	 * `refresh`: only the plugin's refresh fills it (data fetched from a site). It's checked
	 * like any field but isn't typed in the node editor, and can't be required.
	 */
	setBy: z.literal('refresh').optional(),
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
			if (spec.setBy === 'refresh' && 'required' in spec && spec.required) {
				ctx.addIssue({
					code: 'custom',
					path: ['fields', name],
					message: 'A field set by refresh can’t be required',
				});
			}
			if (spec.setBy === 'refresh' && name === kind.labelField) {
				ctx.addIssue({
					code: 'custom',
					path: ['fields', name],
					message: 'The labelField is typed, so refresh can’t set it',
				});
			}
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
			.array(permissionSchema)
			.min(1)
			.max(PLUGIN_POWER_LIMITS.networkHosts + 1),
		/** One entry per `network:<host>` power. */
		networkHosts: z.record(z.string(), networkHostInfoSchema).optional(),
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
		const { permissions } = manifest;
		const hosts = networkHostsOf(permissions);
		const issue = (path: Array<string | number>, message: string) =>
			ctx.addIssue({ code: 'custom', path, message });

		if (new Set(permissions).size !== permissions.length)
			issue(['permissions'], 'Each power can be listed once');
		if (!permissions.includes('node:own'))
			issue(['permissions'], 'Every plugin needs "node:own"');
		if (hosts.length > PLUGIN_POWER_LIMITS.networkHosts)
			issue(['permissions'], `Up to ${PLUGIN_POWER_LIMITS.networkHosts} sites`);
		if (hosts.length > 0 && permissions.includes('branch:read'))
			issue(
				['permissions'],
				'A plugin can reach sites or read the branch, not both'
			);
		for (const host of hosts) {
			if (!manifest.networkHosts?.[host])
				issue(['networkHosts'], `Say who runs ${host}: networkHosts["${host}"]`);
		}
		for (const host of Object.keys(manifest.networkHosts ?? {})) {
			if (!hosts.includes(host))
				issue(['networkHosts', host], `${host} isn't in permissions as network:${host}`);
		}
		const setByRefresh = manifest.nodeKinds.some((kind) =>
			Object.values(kind.fields).some((spec) => spec.setBy === 'refresh')
		);
		if (setByRefresh && hosts.length === 0)
			issue(['nodeKinds'], 'Fields set by refresh need a network:<host> power');

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
