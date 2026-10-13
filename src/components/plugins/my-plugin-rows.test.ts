import type { PluginDraftSummary } from '@/types/plugin-drafts';
import type { MyPlugin, MyPluginVersion } from '@/types/plugin-library';
import {
	buildMyPluginRows,
	countPluginFilters,
	matchesPluginFilter,
	matchesPluginQuery,
} from './my-plugin-rows';

const NOW = new Date('2026-10-11T12:00:00Z').getTime();
const hoursAgo = (hours: number) =>
	new Date(NOW - hours * 3_600_000).toISOString();

const version = (
	overrides: Partial<MyPluginVersion> &
		Pick<MyPluginVersion, 'version' | 'status'>
): MyPluginVersion => ({
	notes: '',
	submittedAt: hoursAgo(48),
	reviewedAt: null,
	reviewMessage: null,
	publishedAt: null,
	disabledReason: null,
	...overrides,
});

const plugin = (
	id: string,
	versions: MyPluginVersion[],
	overrides: Partial<MyPlugin> = {}
): MyPlugin => ({
	id,
	name: id.split('.').pop() ?? id,
	icon: 'book',
	description: '',
	permissions: ['node:own'],
	mapCount: 0,
	openReports: 0,
	disabledReason: null,
	versions,
	...overrides,
});

const draft = (
	pluginId: string,
	hours: number,
	overrides: Partial<PluginDraftSummary> = {}
): PluginDraftSummary => ({
	id: `${pluginId}-${hours}`,
	pluginId,
	name: pluginId,
	icon: 'puzzle',
	description: '',
	checkSummary: null,
	baseVersion: null,
	updatedAt: hoursAgo(hours),
	...overrides,
});

const labels = (row: { chips: Array<{ label: string }> }) =>
	row.chips.map((chip) => chip.label);

describe('buildMyPluginRows', () => {
	it('puts a published plugin and its new draft on one row', () => {
		const rows = buildMyPluginRows(
			[
				plugin(
					'com.example.reading',
					[
						version({
							version: '0.1.0',
							status: 'published',
							publishedAt: hoursAgo(40),
						}),
					],
					{ mapCount: 14 }
				),
			],
			[draft('com.example.reading', 2, { baseVersion: '0.1.0' })],
			NOW
		);

		expect(rows).toHaveLength(1);
		expect(labels(rows[0])).toEqual(['Published 0.1.0', 'Draft']);
		expect(rows[0].drafts).toHaveLength(1);
		expect(rows[0].meta).toBe('On in 14 maps · 0 reports');
	});

	it('gives a draft of a plugin that was never submitted its own row', () => {
		const rows = buildMyPluginRows(
			[],
			[
				draft('dev.counter', 2, {
					name: 'Counter',
					checkSummary: { passed: 5, total: 5 },
				}),
			],
			NOW
		);

		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({
			pluginId: 'dev.counter',
			name: 'Counter',
			icon: 'puzzle',
			plugin: null,
			meta: 'Never submitted',
		});
		expect(labels(rows[0])).toEqual([
			'Draft · edited 2 hours ago',
			'All 5 pass',
		]);
	});

	it('names an untitled draft and says how many drafts share an id', () => {
		const rows = buildMyPluginRows(
			[],
			[draft('dev.a', 5, { name: '' }), draft('dev.a', 1, { name: '' })],
			NOW
		);

		expect(rows).toHaveLength(1);
		expect(rows[0].name).toBe('Untitled plugin');
		expect(rows[0].drafts.map((item) => item.updatedAt)).toEqual([
			hoursAgo(1),
			hoursAgo(5),
		]);
		expect(labels(rows[0])).toEqual(['2 drafts']);
	});

	it('shows Shiko’s message while changes are requested, and drops it once a newer version is in review', () => {
		const requested = version({
			version: '0.1.0',
			status: 'changes_requested',
			reviewMessage: 'Add a confirm step.',
			reviewedAt: hoursAgo(10),
		});
		const [changes] = buildMyPluginRows(
			[plugin('a.b.habit', [requested])],
			[],
			NOW
		);
		expect(labels(changes)).toEqual(['Changes requested']);
		expect(changes.description).toBe('Shiko: “Add a confirm step.”');
		expect(changes.meta).toBe('Not published yet');
		expect(changes.needsAttention).toBe(true);

		const [resubmitted] = buildMyPluginRows(
			[
				plugin('a.b.habit', [
					version({
						version: '0.1.1',
						status: 'in_review',
						submittedAt: hoursAgo(1),
					}),
					requested,
				]),
			],
			[],
			NOW
		);
		expect(labels(resubmitted)).toEqual(['0.1.1 in review']);
		expect(resubmitted.needsAttention).toBe(false);
		expect(resubmitted.meta).toBe('Submitted 1 hour ago');
	});

	it('flags what needs a look: turned off, an open report, a draft failing its checks', () => {
		const rows = buildMyPluginRows(
			[
				plugin(
					'a.b.off',
					[version({ version: '1.0.0', status: 'published' })],
					{
						disabledReason: 'Sent data to a site it did not list.',
					}
				),
				plugin(
					'a.b.reported',
					[version({ version: '1.0.0', status: 'published' })],
					{
						openReports: 2,
					}
				),
				plugin('a.b.fine', [
					version({ version: '1.0.0', status: 'published' }),
				]),
			],
			[draft('dev.tally', 1, { checkSummary: { passed: 3, total: 5 } })],
			NOW
		);

		const byId = Object.fromEntries(rows.map((row) => [row.pluginId, row]));
		expect(byId['a.b.off'].needsAttention).toBe(true);
		expect(labels(byId['a.b.off'])).toContain('Turned off');
		expect(byId['a.b.reported'].needsAttention).toBe(true);
		expect(labels(byId['a.b.reported'])).toContain('2 open reports');
		expect(byId['dev.tally'].needsAttention).toBe(true);
		expect(labels(byId['dev.tally'])).toContain('2 checks failing');
		expect(byId['a.b.fine'].needsAttention).toBe(false);
	});

	it('lists plugins that need attention first, then the most recently touched', () => {
		const rows = buildMyPluginRows(
			[
				plugin('a.b.old', [
					version({
						version: '1.0.0',
						status: 'published',
						submittedAt: hoursAgo(500),
					}),
				]),
				plugin(
					'a.b.reported',
					[
						version({
							version: '1.0.0',
							status: 'published',
							submittedAt: hoursAgo(900),
						}),
					],
					{
						openReports: 1,
					}
				),
			],
			[draft('dev.fresh', 1)],
			NOW
		);

		expect(rows.map((row) => row.pluginId)).toEqual([
			'a.b.reported',
			'dev.fresh',
			'a.b.old',
		]);
	});

	it('does not treat a draft for a submitted plugin as a second plugin', () => {
		const rows = buildMyPluginRows(
			[plugin('a.b.one', [version({ version: '1.0.0', status: 'published' })])],
			[draft('a.b.one', 1), draft('dev.other', 2)],
			NOW
		);
		expect(rows.map((row) => row.pluginId).sort()).toEqual([
			'a.b.one',
			'dev.other',
		]);
	});
});

describe('filters', () => {
	const rows = buildMyPluginRows(
		[
			plugin('a.b.live', [version({ version: '1.0.0', status: 'published' })]),
			plugin('a.b.waiting', [
				version({ version: '0.1.0', status: 'in_review' }),
			]),
			plugin('a.b.both', [
				version({ version: '0.2.0', status: 'in_review' }),
				version({ version: '0.1.0', status: 'published' }),
			]),
		],
		[draft('dev.new', 1), draft('a.b.live', 3)],
		NOW
	);

	it('counts every row once per filter it belongs to', () => {
		expect(countPluginFilters(rows)).toEqual({
			all: 4,
			attention: 0,
			drafts: 2,
			review: 2,
			published: 2,
		});
	});

	it('keeps the rows of one filter', () => {
		expect(
			rows
				.filter((row) => matchesPluginFilter(row, 'review'))
				.map((row) => row.pluginId)
				.sort()
		).toEqual(['a.b.both', 'a.b.waiting']);
	});

	it('searches name, id and description, ignoring case', () => {
		const [live] = rows.filter((row) => row.pluginId === 'a.b.live');
		expect(matchesPluginQuery(live, ' LIVE ')).toBe(true);
		expect(matchesPluginQuery(live, 'a.b.')).toBe(true);
		expect(matchesPluginQuery(live, 'nothing like it')).toBe(false);
		expect(matchesPluginQuery(live, '')).toBe(true);
	});
});
