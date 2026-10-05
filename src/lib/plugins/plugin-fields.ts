import {
	PLUGIN_LIMITS,
	type PluginFieldSpec,
	type PluginNodeKind,
} from '@/lib/plugins/manifest-schema';
import { jsonBytes } from '@/lib/plugins/ui-tree';

/**
 * Typed field syntax for plugin nodes in the node editor:
 * `Weekly active users value:1240 target:2000 unit:users`. Only the kind's own fields
 * are read; anything else (including words that look like built-in patterns) stays in
 * the label. String values with spaces are quoted: `unit:"k €"`.
 */

export type PluginFieldValue = string | number | boolean;
export type PluginData = Record<string, PluginFieldValue>;

export interface PluginFieldError {
	field: string;
	message: string;
}

export interface PluginFieldToken {
	/** Offsets into the parsed text, for highlighting. */
	from: number;
	to: number;
	field: string;
	valid: boolean;
}

export interface ParsedPluginFields {
	label: string;
	data: PluginData;
	errors: PluginFieldError[];
	tokens: PluginFieldToken[];
}

/** `name:value` or `name:"quoted value"`, starting a line or after whitespace. */
const FIELD_TOKEN = /(^|\s)([a-z][a-zA-Z0-9]{0,23}):(?:"([^"\n]*)"|([^\s"]+))/g;

/** Where the given fields appear in editor text (for highlighting). */
export function scanPluginFieldTokens(
	text: string,
	fieldNames: ReadonlySet<string>
): Array<{ from: number; to: number; field: string }> {
	const tokens: Array<{ from: number; to: number; field: string }> = [];
	for (const match of text.matchAll(FIELD_TOKEN)) {
		const [whole, lead, name] = match;
		if (!fieldNames.has(name)) continue;
		const from = (match.index ?? 0) + lead.length;
		tokens.push({ from, to: (match.index ?? 0) + whole.length, field: name });
	}
	return tokens;
}

const TRUE_WORDS = new Set(['true', 'yes', 'on', '1']);
const FALSE_WORDS = new Set(['false', 'no', 'off', '0']);

type Coerced =
	{ ok: true; value: PluginFieldValue } | { ok: false; message: string };

function stringMaxLength(spec: Extract<PluginFieldSpec, { type: 'string' }>) {
	return spec.maxLength ?? PLUGIN_LIMITS.defaultStringMaxLength;
}

function checkNumber(
	spec: Extract<PluginFieldSpec, { type: 'number' | 'integer' }>,
	value: number
): Coerced {
	if (!Number.isFinite(value))
		return { ok: false, message: `${spec.title} must be a number` };
	if (spec.type === 'integer' && !Number.isInteger(value)) {
		return { ok: false, message: `${spec.title} must be a whole number` };
	}
	if (spec.min !== undefined && value < spec.min) {
		return { ok: false, message: `${spec.title} must be at least ${spec.min}` };
	}
	if (spec.max !== undefined && value > spec.max) {
		return { ok: false, message: `${spec.title} must be at most ${spec.max}` };
	}
	return { ok: true, value };
}

/** Reads one typed value from editor text. */
function coerceTyped(spec: PluginFieldSpec, raw: string): Coerced {
	switch (spec.type) {
		case 'string':
			return raw.length > stringMaxLength(spec)
				? {
						ok: false,
						message: `${spec.title} can be up to ${stringMaxLength(spec)} characters`,
					}
				: { ok: true, value: raw };
		case 'number':
		case 'integer':
			return raw.trim() === ''
				? { ok: false, message: `${spec.title} must be a number` }
				: checkNumber(spec, Number(raw));
		case 'boolean': {
			const word = raw.toLowerCase();
			if (TRUE_WORDS.has(word)) return { ok: true, value: true };
			if (FALSE_WORDS.has(word)) return { ok: true, value: false };
			return { ok: false, message: `${spec.title} must be yes or no` };
		}
		case 'enum':
			return spec.options.includes(raw)
				? { ok: true, value: raw }
				: {
						ok: false,
						message: `${spec.title} must be one of: ${spec.options.join(', ')}`,
					};
	}
}

function isRequired(spec: PluginFieldSpec): boolean {
	return spec.type !== 'boolean' && spec.required === true;
}

/** Field errors keyed by field, so a repeated field reports only its last value. */
type FieldErrors = Map<string, string>;

function applyDefaultsAndRequired(
	kind: PluginNodeKind,
	data: PluginData,
	errors: FieldErrors
) {
	for (const [name, spec] of Object.entries(kind.fields)) {
		if (data[name] !== undefined || errors.has(name)) continue;
		if (spec.default !== undefined) data[name] = spec.default;
		else if (isRequired(spec)) errors.set(name, `${spec.title} is required`);
	}
}

const toErrorList = (errors: FieldErrors): PluginFieldError[] =>
	[...errors].map(([field, message]) => ({ field, message }));

export function parsePluginFieldInput(
	text: string,
	kind: PluginNodeKind
): ParsedPluginFields {
	const data: PluginData = {};
	const errors: FieldErrors = new Map();
	const tokens: PluginFieldToken[] = [];
	const freeText: string[] = [];
	let lastIndex = 0;

	for (const match of text.matchAll(FIELD_TOKEN)) {
		const [whole, lead, name, quoted, bare] = match;
		const spec = Object.hasOwn(kind.fields, name)
			? kind.fields[name]
			: undefined;
		if (!spec) continue; // Not one of this kind's fields: stays in the label.

		const from = (match.index ?? 0) + lead.length;
		const to = (match.index ?? 0) + whole.length;
		freeText.push(text.slice(lastIndex, from));
		lastIndex = to;

		const result = coerceTyped(spec, quoted ?? bare);
		tokens.push({ from, to, field: name, valid: result.ok });
		if (result.ok) {
			data[name] = result.value;
			errors.delete(name);
		} else {
			delete data[name];
			errors.set(name, result.message);
		}
	}
	freeText.push(text.slice(lastIndex));

	const label = freeText.join(' ').replace(/\s+/g, ' ').trim();
	const labelSpec = kind.fields[kind.labelField];
	if (
		label &&
		data[kind.labelField] === undefined &&
		labelSpec?.type === 'string'
	) {
		const result = coerceTyped(labelSpec, label);
		if (result.ok) data[kind.labelField] = result.value;
		else errors.set(kind.labelField, result.message);
	}

	applyDefaultsAndRequired(kind, data, errors);

	const resolvedLabel = data[kind.labelField];
	return {
		label: typeof resolvedLabel === 'string' ? resolvedLabel : label,
		data,
		errors: toErrorList(errors),
		tokens,
	};
}

function serializeValue(value: PluginFieldValue): string {
	if (typeof value !== 'string') return String(value);
	return value === '' || /\s/.test(value) ? `"${value}"` : value;
}

function looksLikeField(text: string, kind: PluginNodeKind): boolean {
	return [...text.matchAll(FIELD_TOKEN)].some(([, , name]) =>
		Object.hasOwn(kind.fields, name)
	);
}

/** Node data back to editor text, so editing a plugin node round-trips. */
export function serializePluginFieldInput(
	kind: PluginNodeKind,
	data: PluginData
): string {
	const parts: string[] = [];
	const label = data[kind.labelField];
	if (typeof label === 'string' && label !== '') {
		// Quote a label that would otherwise be read back as fields.
		parts.push(
			looksLikeField(label, kind) && !label.includes('"')
				? `${kind.labelField}:"${label}"`
				: label
		);
	}
	for (const [name, spec] of Object.entries(kind.fields)) {
		if (name === kind.labelField) continue;
		const value = data[name];
		if (value === undefined) continue;
		// Defaults come back on parse, so leave them out unless the field is required.
		if (
			spec.default !== undefined &&
			value === spec.default &&
			!isRequired(spec)
		)
			continue;
		parts.push(`${name}:${serializeValue(value)}`);
	}
	return parts.join(' ');
}

/** Strictly checks a value against its field (no text coercion), for data plugins return. */
function checkValue(
	name: string,
	spec: PluginFieldSpec,
	value: unknown,
	isLabel: boolean
): Coerced {
	switch (spec.type) {
		case 'string':
			if (typeof value !== 'string')
				return { ok: false, message: `${name} must be text` };
			// Quoted field values can't contain `"`; the free-text label can.
			if (!isLabel && value.includes('"')) {
				return { ok: false, message: `${name} can't contain double quotes` };
			}
			return coerceTyped(spec, value);
		case 'number':
		case 'integer':
			return typeof value === 'number'
				? checkNumber(spec, value)
				: { ok: false, message: `${name} must be a number` };
		case 'boolean':
			return typeof value === 'boolean'
				? { ok: true, value }
				: { ok: false, message: `${name} must be true or false` };
		case 'enum':
			return typeof value === 'string' && spec.options.includes(value)
				? { ok: true, value }
				: {
						ok: false,
						message: `${name} must be one of: ${spec.options.join(', ')}`,
					};
	}
}

export type PluginDataResult =
	{ ok: true; data: PluginData } | { ok: false; errors: PluginFieldError[] };

/** Validates data a plugin action returned (or data loaded from a node) against its kind. */
export function validatePluginData(
	kind: PluginNodeKind,
	input: unknown
): PluginDataResult {
	if (typeof input !== 'object' || input === null || Array.isArray(input)) {
		return {
			ok: false,
			errors: [{ field: '', message: 'Data must be an object' }],
		};
	}
	if (jsonBytes(input) > PLUGIN_LIMITS.dataBytes) {
		return {
			ok: false,
			errors: [
				{
					field: '',
					message: `Data is larger than ${PLUGIN_LIMITS.dataBytes} bytes`,
				},
			],
		};
	}

	const data: PluginData = {};
	const errors: FieldErrors = new Map();
	for (const [name, value] of Object.entries(input)) {
		const spec = Object.hasOwn(kind.fields, name)
			? kind.fields[name]
			: undefined;
		if (!spec) {
			errors.set(name, `${name} is not a field of ${kind.label}`);
			continue;
		}
		if (value === undefined || value === null) continue;
		const result = checkValue(name, spec, value, name === kind.labelField);
		if (result.ok) data[name] = result.value;
		else errors.set(name, result.message);
	}
	applyDefaultsAndRequired(kind, data, errors);

	return errors.size > 0
		? { ok: false, errors: toErrorList(errors) }
		: { ok: true, data };
}
