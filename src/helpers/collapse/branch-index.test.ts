import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type { NodeData } from '@/types/node-data';
import {
	buildBranchIndex,
	buildHiddenOwnerById,
	getBranchIndex,
	getCollapsedAncestorIds,
} from './branch-index';

function node(
	id: string,
	metadata: NodeData['metadata'] = {},
	nodeType: NodeData['node_type'] = 'defaultNode'
): AppNode {
	return {
		id,
		type: nodeType,
		position: { x: 0, y: 0 },
		data: {
			id,
			map_id: 'map-1',
			parent_id: null,
			content: `${id} content`,
			position_x: 0,
			position_y: 0,
			node_type: nodeType,
			created_at: '2026-10-03T00:00:00.000Z',
			updated_at: '2026-10-03T00:00:00.000Z',
			metadata,
		},
	};
}

function edge(source: string, target: string, extra: Partial<AppEdge['data']> = {}): AppEdge {
	return {
		id: `${source}->${target}`,
		source,
		target,
		data: { id: `${source}->${target}`, source, target, ...extra } as AppEdge['data'],
	};
}

const tasks = (done: number, total: number) =>
	Array.from({ length: total }, (_, index) => ({
		id: `t${index}`,
		text: `task ${index}`,
		isComplete: index < done,
	}));

describe('buildBranchIndex', () => {
	const nodes = [
		node('root', { isCollapsed: true, tasks: tasks(1, 2) }),
		node('a', { status: 'in-progress', tasks: tasks(2, 3) }),
		node('b', { status: 'completed', priority: 'high' }),
		node('c', { isCollapsed: true, status: 'draft' }),
		node('d', { priority: 'high', status: 'on-hold' }),
		node('note', { anchorNodeId: 'a', annotationType: 'warning' }, 'annotationNode'),
		node('solo'),
	];
	const edges = [
		edge('root', 'a', { label: 'needs' }),
		edge('root', 'b'),
		edge('a', 'c'),
		edge('c', 'd'),
		edge('d', 'root'), // cycle
		edge('solo', 'a', { aiData: { isSuggested: true } }),
	];

	it('lists direct structural children and skips suggestion edges', () => {
		const index = buildBranchIndex(nodes, edges);
		expect(index.childIdsById.get('root')).toEqual(['a', 'b']);
		expect(index.childIdsById.has('solo')).toBe(false);
	});

	it('summarizes collapsed branches across all depths, cycle-safe', () => {
		const summary = buildBranchIndex(nodes, edges).summaries.get('root')!;

		expect(summary.hiddenIds).toEqual(['a', 'c', 'd', 'b']);
		expect(summary.tasks).toEqual({ done: 3, total: 5 });
		expect(summary.pendingStatusCount).toBe(3);
		expect(summary.severity).toBe('critical');
		expect(summary.outline.map((row) => [row.id, row.depth, row.edgeLabel])).toEqual([
			['a', 0, 'needs'],
			['c', 1, null],
			['d', 2, null],
			['b', 0, null],
		]);
		expect(summary.outline[1].isCollapsed).toBe(true);
	});

	it('uses anchored warning annotations for a warning severity', () => {
		const index = buildBranchIndex(
			[
				node('root', { isCollapsed: true }),
				node('a'),
				node('note', { anchorNodeId: 'a', annotationType: 'warning' }, 'annotationNode'),
			],
			[edge('root', 'a')]
		);
		const summary = index.summaries.get('root')!;
		expect(summary.severity).toBe('warning');
		expect(summary.hiddenIds).toEqual(['a']);
	});

	it('only summarizes collapsed nodes that have children', () => {
		const index = buildBranchIndex(
			[node('leaf', { isCollapsed: true }), node('open'), node('child')],
			[edge('open', 'child')]
		);
		expect([...index.summaries.keys()]).toEqual([]);
	});

	it('memoizes by array identity', () => {
		const first = getBranchIndex(nodes, edges);
		expect(getBranchIndex(nodes, edges)).toBe(first);
		expect(getBranchIndex([...nodes], edges)).not.toBe(first);
	});
});

describe('getCollapsedAncestorIds', () => {
	it('returns every collapsed ancestor hiding the target', () => {
		const nodes = [
			node('root', { isCollapsed: true }),
			node('mid'),
			node('inner', { isCollapsed: true }),
			node('target'),
			node('note', { anchorNodeId: 'target' }, 'annotationNode'),
		];
		const edges = [edge('root', 'mid'), edge('mid', 'inner'), edge('inner', 'target')];

		expect(getCollapsedAncestorIds('target', nodes, edges).sort()).toEqual([
			'inner',
			'root',
		]);
		expect(getCollapsedAncestorIds('note', nodes, edges).sort()).toEqual([
			'inner',
			'root',
		]);
		expect(getCollapsedAncestorIds('root', nodes, edges)).toEqual([]);
	});
});

describe('buildHiddenOwnerById', () => {
	it('maps hidden nodes to the outermost visible collapsed node', () => {
		const nodes = [
			node('root', { isCollapsed: true }),
			node('inner', { isCollapsed: true }),
			node('leaf'),
			node('note', { anchorNodeId: 'leaf' }, 'annotationNode'),
		];
		const index = buildBranchIndex(nodes, [edge('root', 'inner'), edge('inner', 'leaf')]);
		const owners = buildHiddenOwnerById(
			index,
			new Set(['root']),
			new Map([['note', 'leaf']])
		);
		expect(owners).toEqual(
			new Map([
				['inner', 'root'],
				['leaf', 'root'],
				['note', 'root'],
			])
		);
	});
});
