import type {
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

const FIELD_EXAMPLE: Record<string, (name: string) => string> = {
	string: (name) => `${name}:text`,
	number: (name) => `${name}:10`,
	integer: (name) => `${name}:3`,
	boolean: (name) => `${name}:yes`,
};

function fieldDescription(kind: PluginNodeKind, name: string): string {
	const spec = kind.fields[name];
	const type =
		spec.type === 'integer'
			? 'whole number'
			: spec.type === 'enum'
				? 'choice'
				: spec.type;
	const required = spec.type !== 'boolean' && spec.required ? ', required' : '';
	return `${spec.title}${spec.description ? ` · ${spec.description}` : ''} (${type}${required})`;
}

/** Syntax Help patterns generated from the kind's fields. */
export function buildPluginKindPatterns(
	kind: PluginNodeKind
): ParsingPattern[] {
	const fieldPatterns = Object.entries(kind.fields)
		.filter(([name]) => name !== kind.labelField)
		.map(([name, spec]): ParsingPattern => ({
			pattern: `${name}:`,
			description: fieldDescription(kind, name),
			category: 'metadata',
			examples: [
				spec.type === 'enum'
					? `${name}:${spec.options[0]}`
					: (FIELD_EXAMPLE[spec.type]?.(name) ?? `${name}:`),
			],
			insertText: `${name}:`,
		}));
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
