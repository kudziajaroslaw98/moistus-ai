import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type { NodeData } from '@/types/node-data';
import {
	countMatchesInsideCollapsed,
	normalizeSearchText,
	searchNodes,
} from './canvas-search';
import { getNodeSemanticText } from './node-semantic-text';

function node(
	id: string,
	content: string,
	position: { x: number; y: number },
	metadata: NodeData['metadata'] = {},
	nodeType: NodeData['node_type'] = 'defaultNode'
): AppNode {
	return {
		id,
		type: nodeType,
		position,
		data: {
			id,
			map_id: 'map-1',
			parent_id: null,
			content,
			position_x: position.x,
			position_y: position.y,
			node_type: nodeType,
			created_at: '2026-10-03T00:00:00.000Z',
			updated_at: '2026-10-03T00:00:00.000Z',
			metadata,
		},
	};
}

const edge = (source: string, target: string): AppEdge => ({
	id: `${source}-${target}`,
	source,
	target,
	data: { id: `${source}-${target}`, source, target } as AppEdge['data'],
});

describe('canvas search', () => {
	const nodes = [
		node('b', 'Debounce the save', { x: 0, y: 200 }),
		node('a', 'Intro', { x: 0, y: 0 }, { title: 'Zażółć DEBOUNCE' }),
		node('t', 'Checklist', { x: 50, y: 200 }, {
			tasks: [{ id: '1', text: 'add debounce test', isComplete: false }],
		}),
		node('g', 'debounce ghost', { x: 0, y: 0 }, {}, 'ghostNode'),
		node('c', 'debounce comment', { x: 0, y: 0 }, {}, 'commentNode'),
	];

	it('normalizes case and diacritics', () => {
		expect(normalizeSearchText('  Zażółć  GĘŚLĄ ')).toBe('zazolc gesla');
	});

	it('matches titles, content and checklist rows in reading order', () => {
		expect(searchNodes(nodes, 'debounce')).toEqual(['a', 'b', 't']);
		expect(searchNodes(nodes, 'zazolc')).toEqual(['a']);
		expect(searchNodes(nodes, '   ')).toEqual([]);
	});

	it('counts matches hidden inside visible collapsed nodes', () => {
		const tree = [
			node('root', 'Mind maps', { x: 0, y: 0 }, { isCollapsed: true }),
			node('x', 'debounce here', { x: 0, y: 100 }),
			node('y', 'debounce there', { x: 0, y: 200 }),
		];
		const counts = countMatchesInsideCollapsed(
			tree,
			[edge('root', 'x'), edge('x', 'y')],
			['x', 'y']
		);
		expect(counts).toEqual(new Map([['root', 2]]));
	});

	it('keeps AI semantic text unchanged', () => {
		expect(
			getNodeSemanticText(node('n', 'Body', { x: 0, y: 0 }, { title: 'Title' }))
		).toBe('Title | Body');
		expect(getNodeSemanticText(node('e', '', { x: 0, y: 0 }))).toBe('[no content]');
	});
});
