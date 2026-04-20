import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import { buildCounterpointPromptContext, selectCounterpointRelevantNodes } from './ai-counterpoint-context';

function createNode(id: string): AppNode {
	return {
		id,
		type: 'defaultNode',
		position: { x: 0, y: 0 },
		data: {
			id,
			map_id: 'map-1',
			user_id: 'user-1',
			content: `Node ${id}`,
			metadata: {},
			aiData: {},
			position_x: 0,
			position_y: 0,
			node_type: 'defaultNode',
			created_at: '2026-04-19T00:00:00.000Z',
			updated_at: '2026-04-19T00:00:00.000Z',
			parent_id: null,
		},
	} as AppNode;
}

function createEdge(id: string, source: string, target: string): AppEdge {
	return {
		id,
		source,
		target,
		type: 'waypointEdge',
		data: {
			id,
			map_id: 'map-1',
			user_id: 'user-1',
			source,
			target,
			label: null,
			animated: false,
			metadata: {},
			aiData: {},
			created_at: '2026-04-19T00:00:00.000Z',
			updated_at: '2026-04-19T00:00:00.000Z',
		},
	} as AppEdge;
}

describe('ai-counterpoint-context', () => {
	it('keeps the focus node plus connected neighbors first', () => {
		const nodes = ['focus', 'neighbor-a', 'neighbor-b', 'other'].map(createNode);
		const edges = [
			createEdge('e1', 'focus', 'neighbor-a'),
			createEdge('e2', 'neighbor-b', 'focus'),
		];

		const relevantNodes = selectCounterpointRelevantNodes(nodes, edges, {
			trigger: 'magic-wand',
			sourceNodeId: 'focus',
		});

		expect(relevantNodes.map((node) => node.id)).toEqual([
			'focus',
			'neighbor-a',
			'neighbor-b',
		]);
	});

	it('falls back to the last six nodes when there is no focused source node', () => {
		const nodes = ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7'].map(createNode);

		const relevantNodes = selectCounterpointRelevantNodes(nodes, [], {
			trigger: 'auto',
		});

		expect(relevantNodes.map((node) => node.id)).toEqual([
			'n2',
			'n3',
			'n4',
			'n5',
			'n6',
			'n7',
		]);
	});

	it('builds aliased NODE rows for the selected counterpoint context', () => {
		const promptContext = buildCounterpointPromptContext({
			nodes: [createNode('focus'), createNode('neighbor')],
			edges: [createEdge('e1', 'focus', 'neighbor')],
			context: {
				trigger: 'magic-wand',
				sourceNodeId: 'focus',
			},
		});

		expect(promptContext.aliasMap.nodeIdToAlias.get('focus')).toBe(1);
		expect(promptContext.aliasMap.nodeIdToAlias.get('neighbor')).toBe(2);
		expect(promptContext.contextRows[0]).toContain('NODE=[1');
		expect(promptContext.contextRows[1]).toContain('NODE=[2');
	});
});
