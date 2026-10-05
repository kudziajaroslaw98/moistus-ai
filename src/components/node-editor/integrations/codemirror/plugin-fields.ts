import type { PluginNodeKind } from '@/lib/plugins/manifest-schema';
import { StateEffect, StateField, type EditorState } from '@codemirror/state';

/**
 * The plugin kind's fields while the editor is set to a plugin node type (`$metric`).
 * Highlighting, autocomplete and validation read it to switch from built-in patterns
 * to that kind's typed fields; null for every built-in node type.
 */
export interface PluginFieldSpecLite {
	name: string;
	title: string;
	type: 'string' | 'number' | 'integer' | 'boolean' | 'enum';
	options?: string[];
}

export const setPluginFieldsEffect = StateEffect.define<
	PluginFieldSpecLite[] | null
>();

export const pluginFieldsField = StateField.define<
	PluginFieldSpecLite[] | null
>({
	create: () => null,
	update(fields, transaction) {
		for (const effect of transaction.effects) {
			if (effect.is(setPluginFieldsEffect)) return effect.value;
		}
		return fields;
	},
});

export function readPluginFields(
	state: EditorState | undefined
): PluginFieldSpecLite[] | null {
	return state?.field(pluginFieldsField, false) ?? null;
}

/** The kind's typed fields (not its free-text label field) for the editor. */
export function toPluginFieldSpecs(
	kind: PluginNodeKind
): PluginFieldSpecLite[] {
	return Object.entries(kind.fields)
		.filter(([name]) => name !== kind.labelField)
		.map(([name, spec]) => ({
			name,
			title: spec.title,
			type: spec.type,
			...(spec.type === 'enum' ? { options: spec.options } : {}),
		}));
}
