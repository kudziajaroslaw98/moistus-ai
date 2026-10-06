import type {
	PluginFieldSpec,
	PluginListColumn,
	PluginManifest,
	PluginNodeKind,
} from '@/lib/plugins/manifest-schema';
import type { ParsedPluginFields } from '@/lib/plugins/plugin-fields';
import { PLUGIN_ICONS } from '@/lib/plugins/plugin-icons';
import {
	fallbackSummary,
	type PluginRenderResult,
} from '@/lib/plugins/runtime/plugin-host';
import type { NodeExtensionData } from '@/types/extensions';
import type { ActivePluginKind } from '@/types/plugins';
import type {
	NodeTypeConfig,
	ParsingPattern,
} from './core/config/node-type-config';

/**
 * Node editor support for plugin node kinds: header/examples/Syntax Help come from the
 * kind's manifest, and saving builds `metadata.extension` from the typed fields.
 */

const COLUMN_EXAMPLE: Record<PluginListColumn['type'], (column: PluginListColumn) => string> = {
	string: (column) => `"${column.title}"`,
	number: () => '10',
	integer: () => '3',
	boolean: (column) => column.name,
	enum: (column) => (column.type === 'enum' ? column.options[0] : ''),
};

function fieldExample(name: string, spec: PluginFieldSpec): string {
	switch (spec.type) {
		case 'string':
			return `${name}:text`;
		case 'number':
			return `${name}:10`;
		case 'integer':
			return `${name}:3`;
		case 'boolean':
			return `${name}:yes`;
		case 'enum':
			return `${name}:${spec.options[0]}`;
		case 'date':
			return `${name}:2026-12-31`;
		case 'list': {
			const values = spec.columns.map((column) => COLUMN_EXAMPLE[column.type](column));
			return spec.columns.length === 1
				? `${name}:[${values[0]}]`
				: `${name}:[[${values.join(', ')}]]`;
		}
	}
}

function fieldDescription(kind: PluginNodeKind, name: string): string {
	const spec = kind.fields[name];
	const type =
		spec.type === 'integer'
			? 'whole number'
			: spec.type === 'enum'
				? 'choice'
				: spec.type === 'list'
					? spec.columns.length === 1
						? `list of ${spec.columns[0].title.toLowerCase()}`
						: `list of [${spec.columns.map((column) => column.name).join(', ')}]`
					: spec.type;
	const required = spec.type !== 'boolean' && spec.required ? ', required' : '';
	return `${spec.title}${spec.description ? ` · ${spec.description}` : ''} (${type}${required})`;
}

/** Syntax Help rows for a list's columns, in the order rows are typed. */
function columnPatterns(spec: Extract<PluginFieldSpec, { type: 'list' }>): ParsingPattern[] {
	if (spec.columns.length === 1) return [];
	return spec.columns.map((column, index) => ({
		pattern: `  ${index + 1}. ${column.name}`,
		description: `${column.title}${column.description ? ` · ${column.description}` : ''} (${
			column.type === 'boolean'
				? `write ${column.name}, or leave it out`
				: column.type === 'integer'
					? 'whole number'
					: column.type === 'enum'
						? `one of ${column.options.join(', ')}`
						: column.type === 'string'
							? 'text in quotes'
							: column.type
		}${column.type !== 'boolean' && column.required ? ', required' : ''})`,
		category: 'metadata',
	}));
}

/** Syntax Help patterns generated from the kind's fields. */
export function buildPluginKindPatterns(
	kind: PluginNodeKind
): ParsingPattern[] {
	const fieldPatterns = Object.entries(kind.fields)
		.filter(([name]) => name !== kind.labelField)
		.flatMap(([name, spec]): ParsingPattern[] => [
			{
				pattern: `${name}:`,
				description: fieldDescription(kind, name),
				category: 'metadata',
				examples: [fieldExample(name, spec)],
				insertText: spec.type === 'list' ? `${name}:[` : `${name}:`,
			},
			...(spec.type === 'list' ? columnPatterns(spec) : []),
		]);
	return [
		{
			pattern: `$${kind.kind}`,
			description: `Switch to ${kind.label}`,
			category: 'metadata',
			examples: kind.examples
				.slice(0, 1)
				.map((example) => `$${kind.kind} ${example}`),
		},
		...fieldPatterns,
		{
			pattern: 'text',
			description: `Everything else becomes the ${kind.fields[kind.labelField]?.title.toLowerCase() ?? 'label'}`,
			category: 'content',
		},
	];
}

export function buildPluginKindConfig(
	active: ActivePluginKind
): NodeTypeConfig {
	return {
		icon: PLUGIN_ICONS[active.kind.icon],
		label: active.kind.label,
		examples: active.kind.examples,
		parsingPatterns: buildPluginKindPatterns(active.kind),
	};
}

/** What the node editor saves for a plugin node: summary as content, plugin data and view. */
export function buildPluginNodeSaveData(
	active: ActivePluginKind,
	parsed: ParsedPluginFields,
	rendered: PluginRenderResult | null,
	existing?: NodeExtensionData | null
) {
	const manifest: PluginManifest = active.manifest;
	// A saved view of the old data would mislead people without the plugin, so it's
	// replaced, or dropped when the plugin couldn't render.
	const { snapshot: _staleSnapshot, ...kept } = existing ?? {};
	const extension: NodeExtensionData = {
		...kept,
		pluginId: manifest.id,
		kind: active.kind.kind,
		kindLabel: active.kind.label,
		version: manifest.version,
		data: parsed.data,
		...(rendered ? { snapshot: rendered.tree } : {}),
	};
	return {
		content: rendered?.summary ?? fallbackSummary(active.kind, parsed.data),
		metadata: { extension },
		patterns: [] as unknown[],
	};
}
