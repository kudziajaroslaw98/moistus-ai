import metricManifest from '../../../public/plugins/shiko.metric/0.1.0/manifest.json';
import { pluginManifestSchema, pluginNodeKindSchema } from './manifest-schema';
import { issueManifest } from './runtime/test-network-plugin';
import {
	assignListRowIds,
	editorKind,
	keepRefreshFields,
	parsePluginFieldInput,
	scanPluginFieldTokens,
	serializePluginFieldInput,
	validatePluginData,
} from './plugin-fields';

const metric = pluginManifestSchema.parse(metricManifest).nodeKinds[0];

describe('parsePluginFieldInput', () => {
	it('reads the kind’s fields and keeps the rest as the label', () => {
		const parsed = parsePluginFieldInput(
			'Weekly active users value:1240 target:2000 unit:users step:100',
			metric
		);

		expect(parsed.errors).toEqual([]);
		expect(parsed.label).toBe('Weekly active users');
		expect(parsed.data).toEqual({
			label: 'Weekly active users',
			value: 1240,
			target: 2000,
			unit: 'users',
			step: 100,
		});
		expect(parsed.tokens.map((token) => token.field)).toEqual([
			'value',
			'target',
			'unit',
			'step',
		]);
	});

	it('treats words that look like built-in syntax as label text', () => {
		const parsed = parsePluginFieldInput(
			'Signups #growth status:done target:300',
			metric
		);

		expect(parsed.label).toBe('Signups #growth status:done');
		expect(parsed.data.target).toBe(300);
	});

	it('supports quoted values and fields on any line', () => {
		const parsed = parsePluginFieldInput(
			'Revenue\nvalue:12 target:50 unit:"k €"',
			metric
		);

		expect(parsed.label).toBe('Revenue');
		expect(parsed.data.unit).toBe('k €');
	});

	it('applies defaults and reports required fields', () => {
		const parsed = parsePluginFieldInput('Weekly active users', metric);

		expect(parsed.data).toMatchObject({ value: 0, step: 1 });
		expect(parsed.errors).toEqual([
			{ field: 'target', message: 'Target is required' },
		]);
	});

	it('reports invalid values with the field title', () => {
		const parsed = parsePluginFieldInput('Users target:lots step:-5', metric);

		expect(parsed.errors).toEqual([
			{ field: 'target', message: 'Target must be a number' },
			{ field: 'step', message: 'Step must be at least 0' },
		]);
		expect(parsed.tokens.every((token) => !token.valid)).toBe(true);
	});

	it('uses the last value when a field repeats', () => {
		const parsed = parsePluginFieldInput('Users target:x target:10', metric);

		expect(parsed.errors).toEqual([]);
		expect(parsed.data.target).toBe(10);
	});
});

describe('serializePluginFieldInput', () => {
	it('round-trips through the parser', () => {
		const data = {
			label: 'Weekly active users',
			value: 1240,
			target: 2000,
			unit: 'k €',
			step: 100,
		};
		const text = serializePluginFieldInput(metric, data);

		expect(text).toBe(
			'Weekly active users value:1240 target:2000 unit:"k €" step:100'
		);
		expect(parsePluginFieldInput(text, metric).data).toEqual(data);
	});

	it('leaves out values equal to their default', () => {
		expect(
			serializePluginFieldInput(metric, {
				label: 'Users',
				value: 0,
				target: 10,
				step: 1,
			})
		).toBe('Users target:10');
	});

	it('quotes a label that would read back as fields', () => {
		const data = { label: 'Ratio value:3', value: 0, target: 10, step: 1 };
		const text = serializePluginFieldInput(metric, data);

		expect(text).toBe('label:"Ratio value:3" target:10');
		expect(parsePluginFieldInput(text, metric).data).toEqual(data);
	});
});

describe('validatePluginData', () => {
	it('accepts valid data and fills defaults', () => {
		expect(validatePluginData(metric, { label: 'Users', target: 10 })).toEqual({
			ok: true,
			data: { label: 'Users', target: 10, value: 0, step: 1 },
		});
	});

	it('does not coerce types or accept unknown fields', () => {
		const result = validatePluginData(metric, {
			label: 'Users',
			target: '10',
			secret: 1,
		});

		expect(result.ok).toBe(false);
		expect(!result.ok && result.errors.map((error) => error.field)).toEqual([
			'target',
			'secret',
		]);
	});

	it('rejects quotes in quoted fields but allows them in the label', () => {
		expect(
			validatePluginData(metric, { label: 'The "best" one', target: 1 }).ok
		).toBe(true);
		expect(
			validatePluginData(metric, { label: 'A', target: 1, unit: 'a"b' }).ok
		).toBe(false);
	});

	it('rejects oversized data', () => {
		expect(
			validatePluginData(metric, { label: 'x'.repeat(20_000), target: 1 }).ok
		).toBe(false);
	});
});

describe('scanPluginFieldTokens', () => {
	it('finds only the given fields, for highlighting', () => {
		const text = 'Users status:done target:2000 unit:"k €"';

		expect(scanPluginFieldTokens(text, new Set(['target', 'unit']))).toEqual([
			{ from: 18, to: 29, field: 'target' },
			{ from: 30, to: 40, field: 'unit' },
		]);
	});
});

describe('list and date fields', () => {
	const budget = pluginNodeKindSchema.parse({
		kind: 'budget',
		label: 'Budget',
		description: 'Items against a limit',
		icon: 'wallet',
		labelField: 'name',
		fields: {
			name: { type: 'string', title: 'Name', required: true },
			limit: { type: 'number', title: 'Limit', min: 0 },
			due: { type: 'date', title: 'Due' },
			items: {
				type: 'list',
				title: 'Items',
				maxItems: 3,
				columns: [
					{ name: 'name', type: 'string', title: 'Name', required: true },
					{ name: 'amount', type: 'number', title: 'Amount', required: true },
					{ name: 'paid', type: 'boolean', title: 'Paid' },
				],
			},
		},
		examples: ['Trip limit:2000 items:[["Hotel", 520]]'],
	});
	const board = pluginNodeKindSchema.parse({
		kind: 'board',
		label: 'Board',
		description: 'Cards in columns',
		icon: 'columns',
		labelField: 'name',
		fields: {
			name: { type: 'string', title: 'Name' },
			todo: {
				type: 'list',
				title: 'To do',
				columns: [{ name: 'text', type: 'string', title: 'Card', required: true }],
			},
		},
	});

	it('reads rows of typed columns, across lines, with yes/no as the column’s word', () => {
		const parsed = parsePluginFieldInput(
			'Trip to Lisbon limit:2000\nitems:[\n  ["Flights", 640, paid],\n  ["Hotel", 520],\n]',
			budget
		);

		expect(parsed.errors).toEqual([]);
		expect(parsed.label).toBe('Trip to Lisbon');
		expect(parsed.data.items).toEqual([
			{ name: 'Flights', amount: 640, paid: true },
			{ name: 'Hotel', amount: 520, paid: false },
		]);
		expect(parsed.tokens.map((token) => token.field)).toEqual(['limit', 'items']);
	});

	it('lets a one-column list skip the inner brackets', () => {
		const parsed = parsePluginFieldInput('Launch todo:["Build it", "Test on iPad"]', board);

		expect(parsed.errors).toEqual([]);
		expect(parsed.data.todo).toEqual([{ text: 'Build it' }, { text: 'Test on iPad' }]);
	});

	it('never reads fields out of text inside a list', () => {
		const parsed = parsePluginFieldInput('Trip items:[["limit:5 coffee", 5]]', budget);

		expect(parsed.data.limit).toBeUndefined();
		expect(parsed.label).toBe('Trip');
	});

	it.each([
		['Trip items:[["Taxi"]]', 'Items, row 1: Amount is required'],
		['Trip items:[["Taxi", "lots"]]', 'Items, row 1: Amount must be a number'],
		['Trip items:[["Taxi", 5, paid, 1]]', 'Items, row 1 has 4 values; each row is [name, amount, paid]'],
		['Trip items:[["Taxi", 5, maybe]]', 'Items, row 1: Paid: write paid, or leave it out'],
		['Trip items:[["Taxi", 5]', 'Items: a ] is missing'],
		['Trip items:[["Taxi" 5]]', 'Items: a comma is missing'],
		['Trip items:[[1], [2], [3], [4]]', 'Items can have up to 3 rows'],
		['Trip items:Taxi', 'Items is a list: write items:[ … ]'],
		['Trip due:2026-02-30', 'Due must be a date like 2026-12-31'],
	])('explains what is wrong: %s', (text, message) => {
		const parsed = parsePluginFieldInput(text, budget);

		expect(parsed.errors.map((error) => error.message)).toContain(message);
	});

	it('reads dates', () => {
		expect(parsePluginFieldInput('Trip due:2026-11-12', budget).data.due).toBe('2026-11-12');
	});

	it('writes lists back so they read the same', () => {
		const data = {
			name: 'Trip',
			limit: 2000,
			items: [
				{ id: 'a1', name: 'Flights', amount: 640, paid: true },
				{ id: 'b2', name: 'Hotel', amount: 520, paid: false },
			],
		};

		const text = serializePluginFieldInput(budget, data);

		expect(text).toBe('Trip limit:2000\nitems:[\n  ["Flights", 640, paid],\n  ["Hotel", 520]\n]');
		expect(parsePluginFieldInput(text, budget).data.items).toEqual([
			{ name: 'Flights', amount: 640, paid: true },
			{ name: 'Hotel', amount: 520, paid: false },
		]);
		expect(
			serializePluginFieldInput(board, { name: 'Launch', todo: [{ id: 'x', text: 'Build it' }] })
		).toBe('Launch\ntodo:["Build it"]');
	});

	it('checks list data strictly, allowing Shiko’s row ids', () => {
		expect(
			validatePluginData(budget, {
				name: 'Trip',
				items: [{ id: 'abc123', name: 'Hotel', amount: 520 }],
			})
		).toEqual({
			ok: true,
			data: { name: 'Trip', items: [{ id: 'abc123', name: 'Hotel', amount: 520, paid: false }] },
		});
		expect(
			validatePluginData(budget, { name: 'Trip', items: [{ name: 'Hotel', cost: 5 }] })
		).toMatchObject({ ok: false });
		expect(
			validatePluginData(budget, { name: 'Trip', items: [{ id: 'Not An Id', name: 'Hotel', amount: 1 }] })
		).toMatchObject({ ok: false });
	});
});

describe('assignListRowIds', () => {
	const kind = pluginNodeKindSchema.parse({
		kind: 'board',
		label: 'Board',
		description: '',
		icon: 'columns',
		labelField: 'name',
		fields: {
			name: { type: 'string', title: 'Name' },
			cards: {
				type: 'list',
				title: 'Cards',
				columns: [{ name: 'text', type: 'string', title: 'Card', required: true }],
			},
		},
	});
	const rows = (data: { cards?: unknown }) => data.cards as Array<{ id: string; text: string }>;

	it('gives new rows unique ids and keeps the ones rows already have', () => {
		const first = assignListRowIds(kind, { cards: [{ text: 'A' }, { text: 'B' }] });
		const [a, b] = rows(first);

		expect(a.id).toMatch(/^[a-z0-9]{6}$/);
		expect(b.id).not.toBe(a.id);
		expect(rows(assignListRowIds(kind, first, first))).toEqual(rows(first));
	});

	it('keeps ids through an editor save: unchanged rows by content, an edited row by position', () => {
		const before = { cards: [{ id: 'aaaaaa', text: 'A' }, { id: 'bbbbbb', text: 'B' }] };

		const reordered = rows(assignListRowIds(kind, { cards: [{ text: 'B' }, { text: 'A' }] }, before));
		expect(reordered.map((row) => row.id)).toEqual(['bbbbbb', 'aaaaaa']);

		const edited = rows(assignListRowIds(kind, { cards: [{ text: 'A!' }, { text: 'B' }, { text: 'C' }] }, before));
		expect(edited[0].id).toBe('aaaaaa');
		expect(edited[1].id).toBe('bbbbbb');
		expect(edited[2].id).not.toMatch(/^(aaaaaa|bbbbbb)$/);
	});

	it('replaces repeated ids', () => {
		const fixed = rows(assignListRowIds(kind, { cards: [{ id: 'same', text: 'A' }, { id: 'same', text: 'B' }] }));

		expect(fixed[0].id).toBe('same');
		expect(fixed[1].id).not.toBe('same');
	});
});

describe('fields set by refresh', () => {
	const issue = pluginManifestSchema.parse(issueManifest).nodeKinds[0];

	it('are not typed in the editor', () => {
		expect(Object.keys(editorKind(issue).fields)).toEqual(['label', 'repo', 'number']);
		const parsed = parsePluginFieldInput('Login bug repo:shiko/app number:482 title:Hacked', issue);
		expect(parsed.errors).toEqual([]);
		expect(parsed.data).toEqual({
			label: 'Login bug title:Hacked',
			repo: 'shiko/app',
			number: 482,
		});
	});

	it('stay out of the text the editor opens with, and are kept on save', () => {
		const saved = { label: 'Login bug', repo: 'shiko/app', number: 482, title: 'Fix login', state: 'open' };
		expect(serializePluginFieldInput(issue, saved)).toBe('Login bug repo:shiko/app number:482');

		const typed = parsePluginFieldInput('Login bug repo:shiko/app number:483', issue).data;
		expect(keepRefreshFields(issue, typed, saved)).toEqual({
			label: 'Login bug',
			repo: 'shiko/app',
			number: 483,
			title: 'Fix login',
			state: 'open',
		});
		expect(validatePluginData(issue, keepRefreshFields(issue, typed, saved)).ok).toBe(true);
	});
});
