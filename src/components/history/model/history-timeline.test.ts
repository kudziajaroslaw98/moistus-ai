import type { HistoryItem as HistoryMeta } from '@/types/history-state';
import {
	buildHistoryRowSubject,
	buildHistoryRowTitle,
	buildHistoryTimeline,
	countChangesUndoneByRevert,
	countHistoryByFilter,
	formatHistoryDayLabel,
	formatHistoryRowTime,
	getHistoryFilterCategory,
} from './history-timeline';

const NOW = new Date(2026, 9, 3, 12, 30).getTime();
const MINUTE = 60_000;

let idCounter = 0;

function event(overrides: Partial<HistoryMeta> = {}): HistoryMeta {
	idCounter += 1;
	return {
		id: `event-${idCounter}`,
		type: 'event',
		actionName: 'updateNode',
		operationType: 'update',
		entityType: 'node',
		timestamp: NOW,
		userId: 'user-1',
		...overrides,
	};
}

function resize(nodeId: string, fields: string[], timestamp: number) {
	return event({
		actionName: 'resizeNode',
		fieldLabels: fields,
		timestamp,
		subjects: [
			{
				id: nodeId,
				type: 'node',
				nodeType: 'groupNode',
				label: `Group node #${nodeId.slice(0, 8)}`,
			},
		],
	});
}

function collapse(nodeId: string, timestamp: number) {
	return event({
		actionName: 'setNodesCollapsed',
		fieldLabels: ['Collapsed state'],
		timestamp,
		subjects: [{ id: nodeId, type: 'node', nodeType: 'textNode' }],
	});
}

describe('getHistoryFilterCategory', () => {
	it.each([
		[{ actionName: 'addNode' }, 'added'],
		[{ actionName: 'deleteNodes' }, 'removed'],
		[{ actionName: 'addEdge' }, 'links'],
		[{ actionName: 'updateEdge' }, 'links'],
		[{ actionName: 'resizeNode' }, 'edits'],
		[{ actionName: 'moveNodes' }, 'edits'],
		[{ actionName: 'setNodesCollapsed' }, 'edits'],
		[{ actionName: 'customThing', operationType: 'add' }, 'added'],
		[{ actionName: 'customThing', entityType: 'edge' }, 'links'],
		[
			{ type: 'snapshot' as const, actionName: 'Manual Checkpoint' },
			'checkpoint',
		],
	])('%o -> %s', (overrides, expected) => {
		expect(getHistoryFilterCategory(event(overrides))).toBe(expected);
	});
});

describe('countHistoryByFilter', () => {
	it('counts changes per chip and leaves checkpoints out', () => {
		const counts = countHistoryByFilter([
			event({ type: 'snapshot', actionName: 'Manual Checkpoint' }),
			event({ actionName: 'addNode' }),
			event({ actionName: 'addEdge' }),
			event({ actionName: 'resizeNode' }),
			event({ actionName: 'resizeNode' }),
		]);

		expect(counts).toEqual({
			all: 4,
			edits: 2,
			added: 1,
			removed: 0,
			links: 1,
		});
	});
});

describe('buildHistoryRowTitle', () => {
	it('names the action and the single node type without repeating itself', () => {
		expect(
			buildHistoryRowTitle(resize('60d6f625aa', ['Width', 'Height'], NOW))
		).toBe('Resized group');
	});

	it('describes property edits by field', () => {
		expect(buildHistoryRowTitle(collapse('n1', NOW))).toBe(
			'Collapsed state changed'
		);
		expect(
			buildHistoryRowTitle(event({ fieldLabels: ['Title', 'Tags', 'Status'] }))
		).toBe('3 properties changed');
	});

	it('mentions a connection created alongside a node', () => {
		expect(
			buildHistoryRowTitle(
				event({
					actionName: 'addNode',
					subjects: [
						{ id: 'n1', type: 'node', nodeType: 'codeNode' },
						{ id: 'e1', type: 'edge' },
					],
				})
			)
		).toBe('Added node + connection');
	});

	it('labels checkpoints', () => {
		expect(
			buildHistoryRowTitle(
				event({
					type: 'snapshot',
					actionName: 'Manual Checkpoint',
					isMajor: true,
				})
			)
		).toBe('Checkpoint');
	});
});

describe('buildHistoryRowSubject', () => {
	it('uses a short id when only a fallback label is known', () => {
		expect(
			buildHistoryRowSubject(resize('60d6f625aa', ['Height'], NOW))
		).toEqual({
			typeLabel: 'Group',
			tone: 'text-sky-300',
			names: ['#60d6f625'],
			namesAreIds: true,
			moreCount: 0,
			detail: 'Height',
		});
	});

	it('prefers a live node label when one resolves', () => {
		const subject = buildHistoryRowSubject(
			resize('60d6f625aa', ['Height'], NOW),
			() => 'Launch plan'
		);
		expect(subject?.names).toEqual(['Launch plan']);
		expect(subject?.namesAreIds).toBe(false);
	});

	it('summarizes mixed node types', () => {
		const subject = buildHistoryRowSubject(
			event({
				subjects: [
					{ id: 'a', type: 'node', nodeType: 'annotationNode' },
					{ id: 'b', type: 'node', nodeType: 'codeNode' },
					{ id: 'c', type: 'node', nodeType: 'codeNode' },
				],
			})
		);
		expect(subject?.typeLabel).toBe('Nodes');
		expect(subject?.names).toEqual(['Annotation, Code ×2']);
	});

	it('lists two ids and counts the rest for same-type nodes', () => {
		const subject = buildHistoryRowSubject(
			event({
				subjects: ['a1', 'b2', 'c3', 'd4'].map((id) => ({
					id,
					type: 'node' as const,
					nodeType: 'textNode',
				})),
			})
		);
		expect(subject).toMatchObject({
			typeLabel: 'Text nodes',
			names: ['#a1', '#b2'],
			moreCount: 2,
		});
	});

	it('shows connection endpoints when known', () => {
		const subject = buildHistoryRowSubject(
			event({
				actionName: 'updateEdge',
				entityType: 'edge',
				subjects: [
					{
						id: 'e1',
						type: 'edge',
						sourceLabel: 'Idea',
						targetLabel: 'Plan',
					},
				],
			})
		);
		expect(subject).toMatchObject({
			typeLabel: 'Connection',
			names: ['Idea → Plan'],
		});
	});
});

describe('buildHistoryTimeline', () => {
	it('splits by day, newest first, and collapses identical runs', () => {
		const yesterday = NOW - 24 * 60 * MINUTE;
		// historyMeta is ascending (oldest first), like the store.
		const items = [
			collapse('a', yesterday),
			collapse('b', yesterday + MINUTE),
			collapse('c', yesterday + 2 * MINUTE),
			resize('g1', ['Width', 'Height'], NOW - 3 * MINUTE),
			resize('g1', ['Width', 'Height'], NOW - 2 * MINUTE),
			resize('g1', ['Height'], NOW - MINUTE),
		];

		const sections = buildHistoryTimeline(items, {
			historyIndex: items.length - 1,
			filter: 'all',
			now: NOW,
		});

		expect(sections.map((section) => section.label)).toEqual([
			'Today',
			'Yesterday',
		]);
		expect(sections[0].changeCount).toBe(3);

		const [current, group] = sections[0].rows;
		expect(current.kind).toBe('single');
		expect(current.kind === 'single' && current.entry.isCurrent).toBe(true);
		expect(group.kind).toBe('group');
		expect(
			group.kind === 'group' && group.entries.map((e) => e.originalIndex)
		).toEqual([4, 3]);

		expect(sections[1].rows).toHaveLength(1);
		expect(
			sections[1].rows[0].kind === 'group' && sections[1].rows[0].entries
		).toHaveLength(3);
	});

	it('never groups the current entry or changes by different people', () => {
		const items = [
			collapse('a', NOW - 3 * MINUTE),
			{ ...collapse('b', NOW - 2 * MINUTE), userId: 'user-2' },
			collapse('c', NOW - MINUTE),
		];

		const sections = buildHistoryTimeline(items, {
			historyIndex: 0,
			filter: 'all',
			now: NOW,
		});

		expect(sections[0].rows.map((row) => row.kind)).toEqual([
			'single',
			'single',
			'single',
		]);
	});

	it('does not group recipe changes with the same change made by hand', () => {
		const items = [
			collapse('a', NOW - 3 * MINUTE),
			{ ...collapse('b', NOW - 2 * MINUTE), actorLabel: 'Pre-mortem' },
			{ ...collapse('c', NOW - MINUTE), actorLabel: 'Pre-mortem' },
		];

		const sections = buildHistoryTimeline(items, {
			historyIndex: -1,
			filter: 'all',
			now: NOW,
		});

		expect(sections[0].rows.map((row) => row.kind)).toEqual(['group', 'single']);
	});

	it('applies the filter before grouping', () => {
		const items = [
			collapse('a', NOW - 3 * MINUTE),
			event({ actionName: 'addNode', timestamp: NOW - 2 * MINUTE }),
			collapse('b', NOW - MINUTE),
		];

		const sections = buildHistoryTimeline(items, {
			historyIndex: -1,
			filter: 'edits',
			now: NOW,
		});

		expect(sections[0].rows).toHaveLength(1);
		expect(sections[0].rows[0].kind).toBe('group');
	});
});

describe('time and revert helpers', () => {
	it('formats day headers', () => {
		expect(formatHistoryDayLabel(NOW - MINUTE, NOW)).toBe('Today');
		expect(
			formatHistoryDayLabel(new Date(2026, 8, 22, 12).getTime(), NOW)
		).toBe('Sep 22');
		expect(
			formatHistoryDayLabel(new Date(2025, 8, 22, 12).getTime(), NOW)
		).toBe('Sep 22, 2025');
	});

	it('formats row times compactly', () => {
		expect(formatHistoryRowTime(NOW - 10_000, NOW)).toBe('Just now');
		expect(formatHistoryRowTime(NOW - 8 * MINUTE, NOW)).toBe('8 min ago');
		expect(
			formatHistoryRowTime(new Date(2026, 9, 3, 9, 5).getTime(), NOW)
		).toBe('9:05 AM');
	});

	it('counts entries a revert rolls back', () => {
		expect(countChangesUndoneByRevert(3, 8)).toBe(5);
		expect(countChangesUndoneByRevert(8, 3)).toBe(0);
	});
});
