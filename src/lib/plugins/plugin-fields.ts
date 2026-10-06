import {
	LIST_ROW_ID_KEY,
	PLUGIN_LIMITS,
	type PluginFieldSpec,
	type PluginListColumn,
	type PluginListFieldSpec,
	type PluginNodeKind,
} from '@/lib/plugins/manifest-schema';
import { jsonBytes } from '@/lib/plugins/ui-tree';

/**
 * Typed field syntax for plugin nodes in the node editor:
 * `Weekly active users value:1240 target:2000 unit:users`. Only the kind's own fields
 * are read; anything else (including words that look like built-in patterns) stays in
 * the label. String values with spaces are quoted: `unit:"k €"`. List fields hold rows
 * of typed columns, written like JSON and free to span lines:
 * `items:[["Flights", 640, paid], ["Hotel", 520]]`.
 */

export type PluginScalar = string | number | boolean;
/** One list row: its columns plus Shiko's row `id` (see `assignListRowIds`). */
export type PluginListRow = Record<string, PluginScalar>;
export type PluginFieldValue = PluginScalar | PluginListRow[];
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
/** The start of a list value: `name:[`. */
const LIST_START = /(^|\s)([a-z][a-zA-Z0-9]{0,23}):\[/g;
const ROW_ID = /^[a-z0-9]{1,16}$/;

const TRUE_WORDS = new Set(['true', 'yes', 'on', '1']);
const FALSE_WORDS = new Set(['false', 'no', 'off', '0']);

type Coerced<T = PluginScalar> =
	{ ok: true; value: T } | { ok: false; message: string };

// ---------------------------------------------------------------------------
// Scalars

type ScalarSpec = Exclude<PluginFieldSpec, { type: 'list' }> | PluginListColumn;

function stringMaxLength(spec: { maxLength?: number }) {
	return spec.maxLength ?? PLUGIN_LIMITS.defaultStringMaxLength;
}

function checkNumber(
	spec: { title: string; type: 'number' | 'integer'; min?: number; max?: number },
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

/** A real calendar day written as YYYY-MM-DD. */
export function isPluginDate(value: string): boolean {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) return false;
	const [year, month, day] = match.slice(1).map(Number);
	const date = new Date(Date.UTC(year, month - 1, day));
	return (
		date.getUTCFullYear() === year &&
		date.getUTCMonth() === month - 1 &&
		date.getUTCDate() === day
	);
}

/** Reads one typed value from editor text. */
function coerceTyped(spec: ScalarSpec, raw: string): Coerced {
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
		case 'date':
			return isPluginDate(raw)
				? { ok: true, value: raw }
				: { ok: false, message: `${spec.title} must be a date like 2026-12-31` };
	}
}

function isRequired(spec: PluginFieldSpec | PluginListColumn): boolean {
	return spec.type !== 'boolean' && spec.required === true;
}

function defaultFor(spec: PluginFieldSpec | PluginListColumn) {
	return 'default' in spec ? spec.default : undefined;
}

// ---------------------------------------------------------------------------
// Lists in editor text

interface ListSpan {
	field: string;
	/** Start of `name:` and end after the closing `]` (or the end of the text). */
	from: number;
	to: number;
	/** The `[...]` text. */
	raw: string;
	closed: boolean;
}

/** Finds `name:[ ... ]` for the kind's list fields, skipping brackets inside strings. */
function scanListSpans(text: string, listFields: ReadonlySet<string>): ListSpan[] {
	const spans: ListSpan[] = [];
	const pattern = new RegExp(LIST_START.source, 'g');
	let match: RegExpExecArray | null;
	while ((match = pattern.exec(text))) {
		const [whole, lead, name] = match;
		if (!listFields.has(name)) continue;
		const from = match.index + lead.length;
		const open = match.index + whole.length - 1;
		let depth = 0;
		let inString = false;
		let end = -1;
		for (let index = open; index < text.length; index++) {
			const char = text[index];
			if (inString) {
				if (char === '"') inString = false;
			} else if (char === '"') inString = true;
			else if (char === '[') depth++;
			else if (char === ']' && --depth === 0) {
				end = index + 1;
				break;
			}
		}
		const to = end === -1 ? text.length : end;
		spans.push({ field: name, from, to, raw: text.slice(open, to), closed: end !== -1 });
		pattern.lastIndex = to;
	}
	return spans;
}

type ListToken =
	| { kind: 'open' }
	| { kind: 'close' }
	| { kind: 'comma' }
	| { kind: 'string' | 'number' | 'word'; text: string };

function tokenizeList(raw: string): ListToken[] | string {
	const tokens: ListToken[] = [];
	let index = 0;
	while (index < raw.length) {
		const char = raw[index];
		if (/\s/.test(char)) {
			index++;
		} else if (char === '[') {
			tokens.push({ kind: 'open' });
			index++;
		} else if (char === ']') {
			tokens.push({ kind: 'close' });
			index++;
		} else if (char === ',') {
			tokens.push({ kind: 'comma' });
			index++;
		} else if (char === '"') {
			const end = raw.indexOf('"', index + 1);
			if (end === -1) return 'a quote is never closed';
			tokens.push({ kind: 'string', text: raw.slice(index + 1, end) });
			index = end + 1;
		} else {
			const word = /^-?\d+(?:\.\d+)?(?![\w.])|^[A-Za-z][\w-]*/.exec(raw.slice(index));
			if (!word) return `unexpected "${char}"`;
			tokens.push({
				kind: /^-?\d/.test(word[0]) ? 'number' : 'word',
				text: word[0],
			});
			index += word[0].length;
		}
	}
	return tokens;
}

type ListValueToken = Extract<ListToken, { text: string }>;

/** `[item, item]` where an item is a value or `[value, value]`. Returns rows of values. */
function parseListRows(raw: string): ListValueToken[][] | string {
	const tokens = tokenizeList(raw);
	if (typeof tokens === 'string') return tokens;
	let position = 0;
	const peek = () => tokens[position];
	const rows: ListValueToken[][] = [];

	const readValues = (closing: boolean): ListValueToken[] | string => {
		const values: ListValueToken[] = [];
		while (position < tokens.length) {
			const token = peek();
			if (token.kind === 'close') return values;
			if (token.kind === 'open' || token.kind === 'comma') {
				return token.kind === 'open'
					? 'lists can only go one level deep inside a list'
					: 'there are two commas in a row';
			}
			values.push(token);
			position++;
			if (peek()?.kind === 'comma') position++;
			else if (peek()?.kind !== 'close') return 'a comma is missing';
		}
		return closing ? 'a ] is missing' : values;
	};

	if (peek()?.kind !== 'open') return 'a list starts with [';
	position++;
	while (position < tokens.length) {
		const token = peek();
		if (token.kind === 'close') break;
		if (token.kind === 'comma') return 'there are two commas in a row';
		if (token.kind === 'open') {
			position++;
			const values = readValues(true);
			if (typeof values === 'string') return values;
			position++; // the row's ]
			rows.push(values);
		} else {
			rows.push([token]);
			position++;
		}
		if (peek()?.kind === 'comma') position++;
		else if (peek() && peek().kind !== 'close') return 'a comma is missing';
	}
	if (peek()?.kind !== 'close') return 'a ] is missing';
	if (position !== tokens.length - 1) return 'there is text after the closing ]';
	return rows;
}

/** One typed list value for its column. */
function coerceColumn(column: PluginListColumn, token: ListValueToken): Coerced {
	switch (column.type) {
		case 'string':
			// Unquoted single words and numbers are fine as text too.
			return coerceTyped(column, token.text);
		case 'number':
		case 'integer':
			return token.kind === 'number'
				? coerceTyped(column, token.text)
				: { ok: false, message: `${column.title} must be a number` };
		case 'boolean': {
			const word = token.text.toLowerCase();
			if (token.kind === 'word' && word === column.name.toLowerCase())
				return { ok: true, value: true };
			if (TRUE_WORDS.has(word)) return { ok: true, value: true };
			if (FALSE_WORDS.has(word)) return { ok: true, value: false };
			return {
				ok: false,
				message: `${column.title}: write ${column.name}, or leave it out`,
			};
		}
		case 'enum':
			return coerceTyped(column, token.text);
	}
}

/** Fills missing columns with defaults (false for yes/no) or reports required ones. */
function completeRow(
	columns: readonly PluginListColumn[],
	row: PluginListRow
): string | null {
	for (const column of columns) {
		if (row[column.name] !== undefined) continue;
		const fallback = column.type === 'boolean' ? false : defaultFor(column);
		if (fallback !== undefined) row[column.name] = fallback;
		else if (isRequired(column)) return `${column.title} is required`;
	}
	return null;
}

function maxItems(spec: PluginListFieldSpec) {
	return spec.maxItems ?? PLUGIN_LIMITS.listItems;
}

function columnList(spec: PluginListFieldSpec) {
	return spec.columns.map((column) => column.name).join(', ');
}

function parseListValue(spec: PluginListFieldSpec, span: ListSpan): Coerced<PluginListRow[]> {
	if (!span.closed) return { ok: false, message: `${spec.title}: a ] is missing` };
	const rows = parseListRows(span.raw);
	if (typeof rows === 'string') return { ok: false, message: `${spec.title}: ${rows}` };
	if (rows.length > maxItems(spec)) {
		return { ok: false, message: `${spec.title} can have up to ${maxItems(spec)} rows` };
	}
	const result: PluginListRow[] = [];
	for (const [index, values] of rows.entries()) {
		const prefix = `${spec.title}, row ${index + 1}`;
		if (values.length > spec.columns.length) {
			return {
				ok: false,
				message: `${prefix} has ${values.length} values; each row is [${columnList(spec)}]`,
			};
		}
		const row: PluginListRow = {};
		for (const [position, token] of values.entries()) {
			const checked = coerceColumn(spec.columns[position], token);
			if (!checked.ok) return { ok: false, message: `${prefix}: ${checked.message}` };
			row[spec.columns[position].name] = checked.value;
		}
		const missing = completeRow(spec.columns, row);
		if (missing) return { ok: false, message: `${prefix}: ${missing}` };
		result.push(row);
	}
	return { ok: true, value: result };
}

// ---------------------------------------------------------------------------
// Parsing editor text

/** Field errors keyed by field, so a repeated field reports only its last value. */
type FieldErrors = Map<string, string>;

function applyDefaultsAndRequired(
	kind: PluginNodeKind,
	data: PluginData,
	errors: FieldErrors
) {
	for (const [name, spec] of Object.entries(kind.fields)) {
		if (data[name] !== undefined || errors.has(name)) continue;
		if (spec.type === 'list') {
			if (spec.required) errors.set(name, `${spec.title} needs at least one row`);
			else data[name] = [];
			continue;
		}
		const fallback = defaultFor(spec);
		if (fallback !== undefined) data[name] = fallback;
		else if (isRequired(spec)) errors.set(name, `${spec.title} is required`);
	}
}

const toErrorList = (errors: FieldErrors): PluginFieldError[] =>
	[...errors].map(([field, message]) => ({ field, message }));

const listFieldNames = (kind: PluginNodeKind) =>
	new Set(
		Object.entries(kind.fields)
			.filter(([, spec]) => spec.type === 'list')
			.map(([name]) => name)
	);

/** Blanks out list spans (keeping offsets and line breaks) so scalar fields skip them. */
function maskSpans(text: string, spans: readonly ListSpan[]): string {
	let masked = text;
	for (const span of spans) {
		const blank = text.slice(span.from, span.to).replace(/[^\n]/g, ' ');
		masked = masked.slice(0, span.from) + blank + masked.slice(span.to);
	}
	return masked;
}

/** Where the given fields appear in editor text (for highlighting). List fields mark `name:`. */
export function scanPluginFieldTokens(
	text: string,
	fieldNames: ReadonlySet<string>,
	listNames: ReadonlySet<string> = new Set()
): Array<{ from: number; to: number; field: string }> {
	const spans = scanListSpans(text, listNames);
	const tokens = spans.map((span) => ({
		from: span.from,
		to: span.from + span.field.length + 1,
		field: span.field,
	}));
	for (const match of maskSpans(text, spans).matchAll(FIELD_TOKEN)) {
		const [whole, lead, name] = match;
		if (!fieldNames.has(name) || listNames.has(name)) continue;
		const from = (match.index ?? 0) + lead.length;
		tokens.push({ from, to: (match.index ?? 0) + whole.length, field: name });
	}
	return tokens.sort((a, b) => a.from - b.from);
}

export function parsePluginFieldInput(
	text: string,
	kind: PluginNodeKind
): ParsedPluginFields {
	const data: PluginData = {};
	const errors: FieldErrors = new Map();
	const tokens: PluginFieldToken[] = [];

	const spans = scanListSpans(text, listFieldNames(kind));
	for (const span of spans) {
		const spec = kind.fields[span.field] as PluginListFieldSpec;
		const result = parseListValue(spec, span);
		tokens.push({
			from: span.from,
			to: span.from + span.field.length + 1,
			field: span.field,
			valid: result.ok,
		});
		if (result.ok) {
			data[span.field] = result.value;
			errors.delete(span.field);
		} else {
			delete data[span.field];
			errors.set(span.field, result.message);
		}
	}

	const masked = maskSpans(text, spans);
	const freeText: string[] = [];
	let lastIndex = 0;
	for (const match of masked.matchAll(FIELD_TOKEN)) {
		const [whole, lead, name, quoted, bare] = match;
		const spec = Object.hasOwn(kind.fields, name)
			? kind.fields[name]
			: undefined;
		if (!spec) continue; // Not one of this kind's fields: stays in the label.

		const from = (match.index ?? 0) + lead.length;
		const to = (match.index ?? 0) + whole.length;
		freeText.push(masked.slice(lastIndex, from));
		lastIndex = to;

		if (spec.type === 'list') {
			tokens.push({ from, to, field: name, valid: false });
			errors.set(name, `${spec.title} is a list: write ${name}:[ … ]`);
			continue;
		}
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
	freeText.push(masked.slice(lastIndex));

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
		tokens: tokens.sort((a, b) => a.from - b.from),
	};
}

// ---------------------------------------------------------------------------
// Writing data back as editor text

function serializeValue(value: PluginScalar): string {
	if (typeof value !== 'string') return String(value);
	return value === '' || /\s/.test(value) ? `"${value}"` : value;
}

function serializeColumnValue(column: PluginListColumn, value: PluginScalar): string {
	if (column.type === 'boolean') return value ? column.name : 'no';
	if (column.type === 'string') return `"${String(value)}"`;
	return String(value);
}

/** Placeholder for an unset optional column that later columns follow. */
function emptyColumnValue(column: PluginListColumn): string {
	switch (column.type) {
		case 'string':
			return '""';
		case 'number':
		case 'integer':
			return String(column.default ?? 0);
		case 'enum':
			return column.default ?? column.options[0];
		case 'boolean':
			return 'no';
	}
}

/** True when a column value can be left off the end of a row. */
function isOmittable(column: PluginListColumn, value: PluginScalar | undefined) {
	if (value === undefined) return true;
	if (column.type === 'boolean') return value === false;
	return defaultFor(column) !== undefined && value === defaultFor(column) && !isRequired(column);
}

function serializeList(name: string, spec: PluginListFieldSpec, rows: PluginListRow[]) {
	const items = rows.map((row) => {
		const values = spec.columns.map((column) => row[column.name]);
		let length = values.length;
		while (length > 1 && isOmittable(spec.columns[length - 1], values[length - 1])) length--;
		const parts = spec.columns
			.slice(0, length)
			.map((column, index) =>
				values[index] === undefined
					? emptyColumnValue(column)
					: serializeColumnValue(column, values[index])
			);
		return spec.columns.length === 1 ? parts[0] : `[${parts.join(', ')}]`;
	});
	const inline = `${name}:[${items.join(', ')}]`;
	if (spec.columns.length === 1 && inline.length <= 72) return inline;
	return `${name}:[\n${items.map((item) => `  ${item}`).join(',\n')}\n]`;
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
	const lists: string[] = [];
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
		if (spec.type === 'list') {
			if (Array.isArray(value) && value.length > 0) lists.push(serializeList(name, spec, value));
			continue;
		}
		if (Array.isArray(value)) continue;
		// Defaults come back on parse, so leave them out unless the field is required.
		const fallback = defaultFor(spec);
		if (fallback !== undefined && value === fallback && !isRequired(spec)) continue;
		parts.push(`${name}:${serializeValue(value)}`);
	}
	return [parts.join(' '), ...lists].filter(Boolean).join('\n');
}

// ---------------------------------------------------------------------------
// Checking data plugins return (and data loaded from nodes)

/** Strictly checks a value against its field (no text coercion), for data plugins return. */
function checkValue(
	name: string,
	spec: ScalarSpec,
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
		case 'date':
			return typeof value === 'string' && isPluginDate(value)
				? { ok: true, value }
				: { ok: false, message: `${name} must be a date like 2026-12-31` };
	}
}

function checkList(
	name: string,
	spec: PluginListFieldSpec,
	value: unknown
): Coerced<PluginListRow[]> {
	if (!Array.isArray(value)) return { ok: false, message: `${name} must be a list` };
	if (value.length > maxItems(spec)) {
		return { ok: false, message: `${name} can have up to ${maxItems(spec)} rows` };
	}
	if (spec.required && value.length === 0) {
		return { ok: false, message: `${name} needs at least one row` };
	}
	const columns = new Map(spec.columns.map((column) => [column.name, column]));
	const rows: PluginListRow[] = [];
	for (const [index, input] of value.entries()) {
		const prefix = `${name}[${index}]`;
		if (typeof input !== 'object' || input === null || Array.isArray(input)) {
			return { ok: false, message: `${prefix} must be an object` };
		}
		const row: PluginListRow = {};
		for (const [key, cell] of Object.entries(input)) {
			if (cell === undefined || cell === null) continue;
			if (key === LIST_ROW_ID_KEY) {
				if (typeof cell !== 'string' || !ROW_ID.test(cell)) {
					return { ok: false, message: `${prefix}.id must be a short lowercase id` };
				}
				row[key] = cell;
				continue;
			}
			const column = columns.get(key);
			if (!column) return { ok: false, message: `${prefix}.${key} is not a column of ${name}` };
			const checked = checkValue(`${prefix}.${key}`, column, cell, false);
			if (!checked.ok) return checked;
			row[key] = checked.value;
		}
		const missing = completeRow(spec.columns, row);
		if (missing) return { ok: false, message: `${prefix}: ${missing}` };
		rows.push(row);
	}
	return { ok: true, value: rows };
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
		const result =
			spec.type === 'list'
				? checkList(name, spec, value)
				: checkValue(name, spec, value, name === kind.labelField);
		if (result.ok) data[name] = result.value;
		else errors.set(name, result.message);
	}
	applyDefaultsAndRequired(kind, data, errors);

	return errors.size > 0
		? { ok: false, errors: toErrorList(errors) }
		: { ok: true, data };
}

// ---------------------------------------------------------------------------
// Row ids

function newRowId(taken: ReadonlySet<string>): string {
	for (;;) {
		const id = Math.random().toString(36).slice(2, 8);
		if (id.length === 6 && !taken.has(id)) return id;
	}
}

const rowContent = (row: PluginListRow) =>
	JSON.stringify(
		Object.entries(row)
			.filter(([key]) => key !== LIST_ROW_ID_KEY)
			.sort(([a], [b]) => a.localeCompare(b))
	);

/**
 * Gives every list row a stable `id`, so plugins can key their views and actions by row
 * rather than by position. Rows keep valid ids they already have; otherwise they take the
 * id of an unchanged row in `previous` (same content), then of the row at the same
 * position, then a new one. The editor never shows ids, so this is how an edit keeps them.
 */
export function assignListRowIds(
	kind: PluginNodeKind,
	data: PluginData,
	previous?: Record<string, unknown> | null
): PluginData {
	const next: PluginData = { ...data };
	for (const [name, spec] of Object.entries(kind.fields)) {
		const rows = data[name];
		if (spec.type !== 'list' || !Array.isArray(rows)) continue;
		const before = Array.isArray(previous?.[name])
			? (previous[name] as unknown[]).filter(
					(row): row is PluginListRow =>
						typeof row === 'object' &&
						row !== null &&
						typeof (row as PluginListRow)[LIST_ROW_ID_KEY] === 'string'
				)
			: [];
		const taken = new Set<string>();
		const ids: Array<string | undefined> = rows.map((row) => {
			const id = row[LIST_ROW_ID_KEY];
			if (typeof id === 'string' && ROW_ID.test(id) && !taken.has(id)) {
				taken.add(id);
				return id;
			}
			return undefined;
		});
		const free = () =>
			before.filter((row) => !taken.has(row[LIST_ROW_ID_KEY] as string));
		rows.forEach((row, index) => {
			if (ids[index]) return;
			const match = free().find((old) => rowContent(old) === rowContent(row));
			if (match) {
				ids[index] = match[LIST_ROW_ID_KEY] as string;
				taken.add(ids[index]!);
			}
		});
		rows.forEach((_row, index) => {
			if (ids[index]) return;
			const samePlace = before[index];
			const id = samePlace?.[LIST_ROW_ID_KEY] as string | undefined;
			ids[index] = id && !taken.has(id) ? id : newRowId(taken);
			taken.add(ids[index]!);
		});
		next[name] = rows.map((row, index) => ({ ...row, [LIST_ROW_ID_KEY]: ids[index]! }));
	}
	return next;
}
