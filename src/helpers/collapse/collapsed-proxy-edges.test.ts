import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type { NodeData } from '@/types/node-data';
import { buildVisibleEdgesWithCollapsedProxies } from './collapsed-proxy-edges';

function node(id: string, metadata: NodeData['metadata'] = {}): AppNode {
	return {
		id,
		type: 'defaultNode',
		position: { x: 0, y: 0 },
		data: {
			id,
			map_id: 'map-1',
			parent_id: null,
			content: id,
			position_x: 0,
			position_y: 0,
			node_type: 'defaultNode',
			created_at: '2026-10-03T00:00:00.000Z',
			updated_at: '2026-10-03T00:00:00.000Z',
			metadata,
		},
	};
}

function edge(
	id: string,
	source: string,
	target: string,
	extra: Record<string, unknown> = {}
): AppEdge {
	return {
		id,
		source,
		target,
		data: { id, source, target, ...extra } as unknown as AppEdge['data'],
	};
}

describe('buildVisibleEdgesWithCollapsedProxies', () => {
	// root(collapsed) -> a -> b ; other -> a, other -> b (cross-links) ; a -> other
	const nodes = [node('root', { isCollapsed: true }), node('a'), node('b'), node('other')];
	const edges = [
		edge('tree-1', 'root', 'a'),
		edge('tree-2', 'a', 'b'),
		edge('x1', 'other', 'a', { label: 'depends on' }),
		edge('x2', 'other', 'b'),
		edge('x3', 'a', 'other', { label: 'feeds' }),
		edge('s1', 'other', 'b', { aiData: { isSuggested: true } }),
	];
	const visible = new Set(['root', 'other']);

	it('drops tree edges and merges cross-links per display pair', () => {
		const result = buildVisibleEdgesWithCollapsedProxies(nodes, edges, visible);

		expect(result.map((item) => item.id)).toEqual([
			'collapsed-proxy:other->root',
			'collapsed-proxy:root->other',
		]);
		const incoming = result[0];
		expect(incoming).toEqual(
			expect.objectContaining({
				source: 'other',
				target: 'root',
				type: 'collapsedProxy',
				selectable: false,
				deletable: false,
			})
		);
		expect(incoming.data).toEqual({
			label: 'depends on',
			collapsedProxy: { originalEdgeIds: ['x1', 'x2'], count: 2 },
		});
		expect(result[1].data).toEqual({
			label: 'feeds',
			collapsedProxy: { originalEdgeIds: ['x3'], count: 1 },
		});
	});

	it('keeps edges between visible nodes untouched', () => {
		const plain = edge('p', 'root', 'other');
		const result = buildVisibleEdgesWithCollapsedProxies(nodes, [plain], visible);
		expect(result).toEqual([plain]);
	});

	it('attaches nested hidden nodes to the outermost visible collapsed node', () => {
		const nested = [
			node('root', { isCollapsed: true }),
			node('inner', { isCollapsed: true }),
			node('deep'),
			node('other'),
		];
		const result = buildVisibleEdgesWithCollapsedProxies(
			nested,
			[edge('t1', 'root', 'inner'), edge('t2', 'inner', 'deep'), edge('x', 'deep', 'other')],
			new Set(['root', 'other'])
		);
		expect(result.map((item) => [item.source, item.target])).toEqual([
			['root', 'other'],
		]);
	});
});
