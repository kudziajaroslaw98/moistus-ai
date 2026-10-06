/**
 * @jest-environment node
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	newQuickJSWASMModuleFromVariant,
	type QuickJSWASMModule,
} from 'quickjs-emscripten-core';
import { pluginManifestSchema } from './manifest-schema';
import {
	assignListRowIds,
	parsePluginFieldInput,
	type PluginData,
} from './plugin-fields';
import { createPluginSandbox, type PluginSandbox } from './runtime/sandbox';
import { nodeTestVariant } from './runtime/test-quickjs-variant';

let QuickJS: QuickJSWASMModule;
beforeAll(async () => {
	QuickJS = await newQuickJSWASMModuleFromVariant(nodeTestVariant());
});

const file = (id: string, name: string) =>
	readFileSync(join(process.cwd(), 'public/plugins', id, '0.1.0', name), 'utf8');

/** Loads a plugin, parses `text` as the node editor would, and gives row ids. */
function load(id: string, text: string) {
	const kind = pluginManifestSchema.parse(JSON.parse(file(id, 'manifest.json'))).nodeKinds[0];
	const parsed = parsePluginFieldInput(text, kind);
	expect(parsed.errors).toEqual([]);
	const sandbox = createPluginSandbox(QuickJS, file(id, 'plugin.js'));
	return { kind, sandbox, data: assignListRowIds(kind, parsed.data) };
}

const ctx = (today = '2026-10-06', canEdit = true) => ({ canEdit, today });
const json = (sandbox: PluginSandbox, kind: string, data: PluginData, today?: string) =>
	JSON.stringify(sandbox.render(kind, data, ctx(today)).tree);

describe('Countdown', () => {
	it('counts days from the viewer’s date', () => {
		const { sandbox, data } = load('shiko.countdown', 'Beta launch date:2026-11-12');
		try {
			expect(json(sandbox, 'countdown', data)).toContain('"value":"37"');
			expect(json(sandbox, 'countdown', data)).toContain('Thu 12 Nov');
			expect(json(sandbox, 'countdown', data, '2026-11-11')).toContain('day to go');
			expect(json(sandbox, 'countdown', data, '2026-11-12')).toContain('"value":"Today"');
			expect(json(sandbox, 'countdown', data, '2026-11-20')).toContain('days ago');
			expect(sandbox.render('countdown', data, ctx()).summary).toBe('Beta launch: 2026-11-12');
		} finally {
			sandbox.dispose();
		}
	});
});

describe('Kanban', () => {
	const text = 'Launch todo:["Build it", "Test"] doing:["Design"] done:["Spec"]';

	it('is a wide node with the three columns side by side', () => {
		const { kind, sandbox, data } = load('shiko.kanban', text);
		try {
			expect(kind.width).toBe('wide');
			const view = sandbox.render('kanban', data, ctx()).tree as {
				children: Array<{ type: string; equal?: boolean; children?: Array<{ key?: string }> }>;
			};
			const board = view.children.find((child) => child.type === 'row');
			expect(board?.equal).toBe(true);
			expect(board?.children?.map((column) => column.key)).toEqual(['todo', 'doing', 'done']);
			expect(json(sandbox, 'kanban', data)).toContain('"label":"Move to Doing","action":"move"');
			expect(json(sandbox, 'kanban', data)).toContain('"iconOnly":true');
		} finally {
			sandbox.dispose();
		}
	});

	it('moves the card a button names, keyed by its id', () => {
		const { sandbox, data } = load('shiko.kanban', text);
		try {
			const build = (data.todo as Array<{ id: string }>)[0];
			expect(json(sandbox, 'kanban', data)).toContain(`"key":"${build.id}"`);

			const next = sandbox.action('kanban', 'move', data, { id: build.id, to: 'doing' }, ctx()) as PluginData;

			expect(next.todo).toEqual([expect.objectContaining({ text: 'Test' })]);
			expect(next.doing).toEqual([
				expect.objectContaining({ text: 'Design' }),
				{ id: build.id, text: 'Build it' },
			]);
		} finally {
			sandbox.dispose();
		}
	});

	it('leaves the board alone when the card is already gone', () => {
		const { sandbox, data } = load('shiko.kanban', text);
		try {
			expect(sandbox.action('kanban', 'move', data, { id: 'gone00', to: 'done' }, ctx())).toEqual(data);
		} finally {
			sandbox.dispose();
		}
	});

	it('shows no move buttons to viewers', () => {
		const { sandbox, data } = load('shiko.kanban', text);
		try {
			expect(JSON.stringify(sandbox.render('kanban', data, ctx(undefined, false)).tree)).not.toContain(
				'"type":"button"'
			);
		} finally {
			sandbox.dispose();
		}
	});
});

describe('Budget', () => {
	it('adds up items, shows what is left and ticks paid by id', () => {
		const { sandbox, data } = load(
			'shiko.budget',
			'Trip limit:2000 unit:€ items:[["Flights", 640, paid], ["Hotel", 520], ["Food", 300]]'
		);
		try {
			const view = json(sandbox, 'budget', data);
			expect(view).toContain('1,460 €');
			expect(view).toContain('540 € left');
			expect(view).toContain('Paid 640 € of 1,460 €');

			const hotel = (data.items as Array<{ id: string }>)[1];
			const next = sandbox.action('budget', 'togglePaid', data, { id: hotel.id }, ctx()) as PluginData;
			expect((next.items as Array<{ paid: boolean }>).map((item) => item.paid)).toEqual([true, true, false]);
		} finally {
			sandbox.dispose();
		}
	});

	it('says how much over the limit it is', () => {
		const { sandbox, data } = load('shiko.budget', 'Lunch limit:10 items:[["Pizza", 14]]');
		try {
			expect(json(sandbox, 'budget', data)).toContain('4 over');
		} finally {
			sandbox.dispose();
		}
	});
});

describe('OKR', () => {
	it('averages key result progress', () => {
		const { sandbox, data } = load(
			'shiko.okr',
			'Grow the beta results:[["300 signups", 120, 300], ["NPS of 50", 35, 50]]'
		);
		try {
			const view = json(sandbox, 'okr', data);
			expect(view).toContain('55% · Behind');
			expect(view).toContain('120 of 300');
		} finally {
			sandbox.dispose();
		}
	});
});

describe('Decision matrix', () => {
	it('marks the option with the highest total as best', () => {
		const { sandbox, data } = load(
			'shiko.decision-matrix',
			'Pick a laptop criteria:["Price", "Battery"] options:[["Air", 3, 5], ["ThinkPad", 4]]'
		);
		try {
			const view = json(sandbox, 'decision', data);
			expect(view).toContain('"value":"8 pts"');
			expect(view).toContain('Battery –');
			expect(view.match(/"label":"Best"/g)).toHaveLength(1);
			expect(sandbox.render('decision', data, ctx()).summary).toBe('Pick a laptop: Air leads with 8');
		} finally {
			sandbox.dispose();
		}
	});
});
