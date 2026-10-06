/**
 * @jest-environment node
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	newQuickJSWASMModuleFromVariant,
	type QuickJSWASMModule,
} from 'quickjs-emscripten-core';
import type { PluginBranchNode } from './branch-context';
import { pluginManifestSchema } from './manifest-schema';
import {
	assignListRowIds,
	parsePluginFieldInput,
	validatePluginData,
	type PluginData,
} from './plugin-fields';
import { createPluginSandbox, type PluginSandbox } from './runtime/sandbox';
import { nodeTestVariant } from './runtime/test-quickjs-variant';

let QuickJS: QuickJSWASMModule;
beforeAll(async () => {
	QuickJS = await newQuickJSWASMModuleFromVariant(nodeTestVariant());
});

const file = (id: string, name: string) =>
	readFileSync(
		join(process.cwd(), 'public/plugins', id, '0.1.0', name),
		'utf8'
	);

/** Loads a plugin, parses `text` as the node editor would, and gives row ids. */
function load(id: string, text: string) {
	const kind = pluginManifestSchema.parse(JSON.parse(file(id, 'manifest.json')))
		.nodeKinds[0];
	const parsed = parsePluginFieldInput(text, kind);
	expect(parsed.errors).toEqual([]);
	const sandbox = createPluginSandbox(QuickJS, file(id, 'plugin.js'));
	return { kind, sandbox, data: assignListRowIds(kind, parsed.data) };
}

const ctx = (today = '2026-10-06', canEdit = true) => ({ canEdit, today });
const json = (
	sandbox: PluginSandbox,
	kind: string,
	data: PluginData,
	today?: string
) => JSON.stringify(sandbox.render(kind, data, ctx(today)).tree);

describe('Countdown', () => {
	it('counts days from the viewer’s date', () => {
		const { sandbox, data } = load(
			'shiko.countdown',
			'Beta launch date:2026-11-12'
		);
		try {
			expect(json(sandbox, 'countdown', data)).toContain('"value":"37"');
			expect(json(sandbox, 'countdown', data)).toContain('Thu 12 Nov');
			expect(json(sandbox, 'countdown', data, '2026-11-11')).toContain(
				'day to go'
			);
			expect(json(sandbox, 'countdown', data, '2026-11-12')).toContain(
				'"value":"Today"'
			);
			expect(json(sandbox, 'countdown', data, '2026-11-20')).toContain(
				'days ago'
			);
			expect(sandbox.render('countdown', data, ctx()).summary).toBe(
				'Beta launch: 2026-11-12'
			);
		} finally {
			sandbox.dispose();
		}
	});
});

describe('Kanban', () => {
	const text =
		'Launch todo:["Build it", "Test"] doing:["Design"] done:["Spec"]';

	it('is a wide node with the three columns side by side', () => {
		const { kind, sandbox, data } = load('shiko.kanban', text);
		try {
			expect(kind.width).toBe('wide');
			const view = sandbox.render('kanban', data, ctx()).tree as {
				children: Array<{
					type: string;
					equal?: boolean;
					children?: Array<{ key?: string }>;
				}>;
			};
			const board = view.children.find((child) => child.type === 'row');
			expect(board?.equal).toBe(true);
			expect(board?.children?.map((column) => column.key)).toEqual([
				'todo',
				'doing',
				'done',
			]);
			expect(json(sandbox, 'kanban', data)).toContain(
				'"label":"Move to Doing","action":"move"'
			);
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

			const next = sandbox.action(
				'kanban',
				'move',
				data,
				{ id: build.id, to: 'doing' },
				ctx()
			) as PluginData;

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
			expect(
				sandbox.action(
					'kanban',
					'move',
					data,
					{ id: 'gone00', to: 'done' },
					ctx()
				)
			).toEqual(data);
		} finally {
			sandbox.dispose();
		}
	});

	it('shows no move buttons to viewers', () => {
		const { sandbox, data } = load('shiko.kanban', text);
		try {
			expect(
				JSON.stringify(
					sandbox.render('kanban', data, ctx(undefined, false)).tree
				)
			).not.toContain('"type":"button"');
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
			const next = sandbox.action(
				'budget',
				'togglePaid',
				data,
				{ id: hotel.id },
				ctx()
			) as PluginData;
			expect(
				(next.items as Array<{ paid: boolean }>).map((item) => item.paid)
			).toEqual([true, true, false]);
		} finally {
			sandbox.dispose();
		}
	});

	it('says how much over the limit it is', () => {
		const { sandbox, data } = load(
			'shiko.budget',
			'Lunch limit:10 items:[["Pizza", 14]]'
		);
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
			expect(sandbox.render('decision', data, ctx()).summary).toBe(
				'Pick a laptop: Air leads with 8'
			);
		} finally {
			sandbox.dispose();
		}
	});
});

const branchNode = (
	id: string,
	extra: Partial<PluginBranchNode> = {}
): PluginBranchNode => ({
	id,
	depth: 1,
	type: 'note',
	text: id,
	tasks: null,
	status: null,
	priority: null,
	assignees: [],
	due: null,
	tags: [],
	...extra,
});
const withBranch = (branch: PluginBranchNode[], today = '2026-10-06') => ({
	canEdit: true,
	today,
	branch,
});

describe('Branch progress', () => {
	it('adds up the tasks in the nodes under it', () => {
		const { sandbox, data } = load('shiko.branch-progress', 'Launch checklist');
		try {
			const branch = [
				branchNode('a', { tasks: { done: 2, total: 3 } }),
				branchNode('b', { depth: 2, tasks: { done: 1, total: 1 } }),
				branchNode('c'),
			];
			const view = JSON.stringify(
				sandbox.render('progress', data, withBranch(branch)).tree
			);
			expect(view).toContain('"value":"3"');
			expect(view).toContain('of 4 tasks done');
			expect(view).toContain('"value":0.75');
			expect(
				JSON.stringify(
					sandbox.render('progress', data, withBranch([branchNode('c')])).tree
				)
			).toContain('No tasks under this node yet.');
		} finally {
			sandbox.dispose();
		}
	});
});

describe('Upcoming', () => {
	it('lists open dated nodes soonest first, with how far away they are', () => {
		const { sandbox, data } = load('shiko.upcoming', 'Release dates limit:3');
		try {
			const branch = [
				branchNode('later', { due: '2026-10-20' }),
				branchNode('late', { due: '2026-10-04' }),
				branchNode('today', { due: '2026-10-06' }),
				branchNode('done', { due: '2026-10-05', status: 'completed' }),
				branchNode('soon', { due: '2026-10-09' }),
				branchNode('undated'),
			];
			const tree = sandbox.render('upcoming', data, withBranch(branch))
				.tree as {
				children: Array<{ key?: string }>;
			};
			expect(tree.children.map((child) => child.key).filter(Boolean)).toEqual([
				'late',
				'today',
				'soon',
			]);
			const view = JSON.stringify(tree);
			expect(view).toContain('"tone":"danger","type":"badge","label":"2 days late"');
			expect(view).toContain('"label":"Today"');
			expect(view).toContain('"label":"In 3 days"');
			expect(view).toContain('1 more date');
		} finally {
			sandbox.dispose();
		}
	});
});

describe('Workload', () => {
	it('counts nodes and open tasks per person, busiest first', () => {
		const { sandbox, data } = load('shiko.workload', 'Sprint 12');
		try {
			const branch = [
				branchNode('a', { assignees: ['ana'], tasks: { done: 1, total: 3 } }),
				branchNode('b', { assignees: ['ben', 'ana'] }),
				branchNode('c', { assignees: ['ben'], tasks: { done: 0, total: 1 } }),
				branchNode('d'),
				// Other plugin nodes in the branch aren't work to assign.
				branchNode('progress', { type: 'plugin' }),
			];
			const tree = sandbox.render('workload', data, withBranch(branch))
				.tree as {
				children: Array<{ key?: string }>;
			};
			expect(tree.children.map((child) => child.key).filter(Boolean)).toEqual([
				'ana',
				'ben',
			]);
			const view = JSON.stringify(tree);
			expect(view).toContain('2 open tasks · 2 nodes');
			expect(view).toContain('1 open task · 2 nodes');
			expect(view).toContain('1 node not assigned');
		} finally {
			sandbox.dispose();
		}
	});
});

describe('GitHub issue', () => {
	it('asks for the issue on the first pass and saves title, state and labels on the second', () => {
		const { kind, sandbox, data } = load(
			'shiko.github-issue',
			'https://github.com/vercel/next.js/pull/42'
		);
		try {
			const first = sandbox.refresh('github', data, ctx(), null);
			expect(first.requests).toEqual([
				'https://api.github.com/repos/vercel/next.js/issues/42',
			]);

			const second = sandbox.refresh('github', data, ctx(), {
				[first.requests[0]]: {
					status: 'ok',
					code: 200,
					json: {
						title: 'Add the app router',
						state: 'closed',
						pull_request: { merged_at: '2026-01-01T00:00:00Z' },
						labels: [{ name: 'feature' }, { name: 'router' }],
					},
				},
			});
			const saved = assignListRowIds(kind, second.data as PluginData, data);
			expect(validatePluginData(kind, saved).ok).toBe(true);
			expect(saved).toMatchObject({
				title: 'Add the app router',
				state: 'merged',
				pull: true,
				labels: [{ name: 'feature' }, { name: 'router' }],
				error: '',
			});
			const view = json(sandbox, 'github', saved);
			expect(view).toContain('vercel/next.js #42 · pull request');
			expect(view).toContain('"tone":"info","type":"badge","label":"Merged"');
			expect(view).toContain('"label":"router"');
		} finally {
			sandbox.dispose();
		}
	});

	it('explains GitHub’s errors and asks for nothing when the address is not an issue', () => {
		const { sandbox, data } = load('shiko.github-issue', 'vercel/next.js#1');
		try {
			const url = sandbox.refresh('github', data, ctx(), null).requests[0];
			const failed = sandbox.refresh('github', data, ctx(), {
				[url]: {
					status: 'error',
					code: 403,
					message: 'api.github.com answered 403',
				},
			});
			expect((failed.data as PluginData).error).toBe(
				'GitHub limits requests without an account. Try again in a while.'
			);

			const bad = load('shiko.github-issue', 'not an issue');
			try {
				expect(
					bad.sandbox.refresh('github', bad.data, ctx(), null).requests
				).toEqual([]);
				expect(json(bad.sandbox, 'github', bad.data)).toContain(
					'Write owner/repo#123'
				);
			} finally {
				bad.sandbox.dispose();
			}
		} finally {
			sandbox.dispose();
		}
	});
});

describe('Wikipedia summary', () => {
	it('fetches the topic’s summary as text', () => {
		const { kind, sandbox, data } = load('shiko.wikipedia', 'Ada Lovelace');
		try {
			const first = sandbox.refresh('wiki', data, ctx(), null);
			expect(first.requests).toEqual([
				'https://en.wikipedia.org/api/rest_v1/page/summary/Ada_Lovelace',
			]);

			const second = sandbox.refresh('wiki', data, ctx(), {
				[first.requests[0]]: {
					status: 'ok',
					code: 200,
					json: {
						type: 'standard',
						title: 'Ada Lovelace',
						extract: 'x '.repeat(400),
					},
				},
			});
			const saved = second.data as PluginData;
			expect(validatePluginData(kind, saved).ok).toBe(true);
			expect(String(saved.summary).length).toBeLessThanOrEqual(500);
			expect(saved.ambiguous).toBe(false);
		} finally {
			sandbox.dispose();
		}
	});

	it('says when a name has several meanings or no article', () => {
		const { sandbox, data } = load('shiko.wikipedia', 'Mercury');
		try {
			const url = sandbox.refresh('wiki', data, ctx(), null).requests[0];
			const ambiguous = sandbox.refresh('wiki', data, ctx(), {
				[url]: {
					status: 'ok',
					code: 200,
					json: {
						type: 'disambiguation',
						title: 'Mercury',
						extract: 'Mercury may refer to:',
					},
				},
			}).data as PluginData;
			expect(json(sandbox, 'wiki', ambiguous)).toContain('several meanings');

			const missing = sandbox.refresh('wiki', data, ctx(), {
				[url]: {
					status: 'error',
					code: 404,
					message: 'en.wikipedia.org answered 404',
				},
			}).data as PluginData;
			expect(missing.error).toBe('Wikipedia has no article called “Mercury”.');
		} finally {
			sandbox.dispose();
		}
	});
});
