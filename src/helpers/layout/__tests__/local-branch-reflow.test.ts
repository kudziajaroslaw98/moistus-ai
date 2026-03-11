import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import { DEFAULT_LAYOUT_CONFIG } from '@/types/layout-types';
import {
	applyLocalCreateBranchReflow,
	applyLocalEditBranchReflow,
} from '../local-branch-reflow';

function createNode(
	id: string,
	x: number,
	y: number,
	width = 200,
	height = 80
): AppNode {
	return {
		id,
		position: { x, y },
		width,
		height,
		data: {
			id,
			map_id: 'map-1',
			parent_id: null,
			content: id,
			position_x: x,
			position_y: y,
			width,
			height,
			created_at: '2026-03-11T00:00:00.000Z',
			updated_at: '2026-03-11T00:00:00.000Z',
			metadata: {},
		},
		type: 'defaultNode',
	} as AppNode;
}

function createEdge(
	id: string,
	source: string,
	target: string,
	metadata?: NonNullable<AppEdge['data']>['metadata'],
	type = 'floatingEdge'
): AppEdge {
	return {
		id,
		source,
		target,
		type,
		data: {
			id,
			map_id: 'map-1',
			user_id: 'user-1',
			source,
			target,
			metadata: metadata ?? { pathType: 'bezier' },
		},
	} as AppEdge;
}

describe('local-branch-reflow', () => {
	it('adds new top-bottom children on the same sibling row without moving earlier siblings', () => {
		const nodes = [
			createNode('root', 0, 0),
			createNode('child-a', 0, 180),
			createNode('grandchild-a', 120, 300),
			createNode('child-b', 40, 120),
			createNode('outside', 900, 900),
		];
		const edges = [
			createEdge('root-a', 'root', 'child-a'),
			createEdge('a-grandchild', 'child-a', 'grandchild-a'),
			createEdge('root-b', 'root', 'child-b'),
		];

		const result = applyLocalCreateBranchReflow({
			changedNodeId: 'child-b',
			nodes,
			edges,
			config: { ...DEFAULT_LAYOUT_CONFIG, direction: 'TOP_BOTTOM' },
		});

		const byNodeId = new Map(result.nodes.map((node) => [node.id, node]));

		expect(byNodeId.get('root')?.position).toEqual({ x: 0, y: 0 });
		expect(byNodeId.get('outside')?.position).toEqual({ x: 900, y: 900 });
		expect(byNodeId.get('child-a')?.position).toEqual({ x: 0, y: 180 });
		expect(byNodeId.get('grandchild-a')?.position).toEqual({ x: 120, y: 300 });
		expect(byNodeId.get('child-b')?.position).toEqual({ x: 380, y: 180 });
		expect(result.affectedNodeIds).toEqual(new Set(['child-b']));
		expect(result.affectedEdgeIds.size).toBe(0);
	});

	it('pushes only later sibling subtrees on edit growth and translates internal waypoint edges', () => {
		const nodes = [
			createNode('root', 0, 0),
			createNode('child-a', 0, 180, 200, 200),
			createNode('child-b', 0, 250),
			createNode('grandchild-b', 0, 370),
			createNode('outside', 600, 600),
		];
		const edges = [
			createEdge('root-a', 'root', 'child-a'),
			createEdge('root-b', 'root', 'child-b'),
			createEdge(
				'b-grandchild',
				'child-b',
				'grandchild-b',
				{
					pathType: 'waypoint',
					waypoints: [{ id: 'wp-1', x: 100, y: 320 }],
				},
				'waypointEdge'
			),
		];

		const result = applyLocalEditBranchReflow({
			changedNodeId: 'child-a',
			nodes,
			edges,
			config: { ...DEFAULT_LAYOUT_CONFIG, direction: 'TOP_BOTTOM' },
		});

		const byNodeId = new Map(result.nodes.map((node) => [node.id, node]));
		const byEdgeId = new Map(result.edges.map((edge) => [edge.id, edge]));

		expect(byNodeId.get('root')?.position).toEqual({ x: 0, y: 0 });
		expect(byNodeId.get('child-a')?.position).toEqual({ x: 0, y: 180 });
		expect(byNodeId.get('child-b')?.position).toEqual({ x: 260, y: 250 });
		expect(byNodeId.get('grandchild-b')?.position).toEqual({ x: 260, y: 370 });
		expect(byNodeId.get('outside')?.position).toEqual({ x: 600, y: 600 });
		expect(byEdgeId.get('b-grandchild')?.data?.metadata?.waypoints).toEqual([
			{ id: 'wp-1', x: 360, y: 320 },
		]);
		expect(result.affectedNodeIds).toEqual(new Set(['child-b', 'grandchild-b']));
		expect(result.affectedEdgeIds).toEqual(new Set(['b-grandchild']));
	});

	it('uses sibling-axis-only movement for left-to-right local edit reflow', () => {
		const nodes = [
			createNode('root', 0, 0),
			createNode('child-a', 220, 0, 220, 120),
			createNode('child-b', 260, 50),
			createNode('grandchild-b', 420, 50),
		];
		const edges = [
			createEdge('root-a', 'root', 'child-a'),
			createEdge('root-b', 'root', 'child-b'),
			createEdge('b-grandchild', 'child-b', 'grandchild-b'),
		];

		const result = applyLocalEditBranchReflow({
			changedNodeId: 'child-a',
			nodes,
			edges,
			config: { ...DEFAULT_LAYOUT_CONFIG, direction: 'LEFT_RIGHT' },
		});

		const byNodeId = new Map(result.nodes.map((node) => [node.id, node]));

		expect(byNodeId.get('child-b')?.position).toEqual({ x: 260, y: 180 });
		expect(byNodeId.get('grandchild-b')?.position).toEqual({ x: 420, y: 180 });
	});

	it('opens a top-bottom corridor by pushing parent-sibling branches outward on x', () => {
		const nodes = [
			createNode('root', 0, 0),
			createNode('left', -260, 180),
			createNode('left-child', -260, 320),
			createNode('left-grandchild', -260, 460),
			createNode('middle', 0, 180),
			createNode('middle-parent', 0, 320),
			createNode('middle-existing', 0, 460),
			createNode('middle-new', 0, 460),
			createNode('right', 260, 180),
			createNode('right-child', 260, 320),
			createNode('right-grandchild', 260, 460),
			createNode('outside', 1200, 1200),
		];
		const edges = [
			createEdge('root-left', 'root', 'left'),
			createEdge('left-child-edge', 'left', 'left-child'),
			createEdge('left-grandchild-edge', 'left-child', 'left-grandchild'),
			createEdge('root-middle', 'root', 'middle'),
			createEdge('middle-parent-edge', 'middle', 'middle-parent'),
			createEdge('middle-existing-edge', 'middle-parent', 'middle-existing'),
			createEdge('middle-new-edge', 'middle-parent', 'middle-new'),
			createEdge('root-right', 'root', 'right'),
			createEdge('right-child-edge', 'right', 'right-child'),
			createEdge('right-grandchild-edge', 'right-child', 'right-grandchild'),
		];

		const result = applyLocalCreateBranchReflow({
			changedNodeId: 'middle-new',
			nodes,
			edges,
			config: { ...DEFAULT_LAYOUT_CONFIG, direction: 'TOP_BOTTOM' },
		});

		const byNodeId = new Map(result.nodes.map((node) => [node.id, node]));

		expect(byNodeId.get('middle')?.position).toEqual({ x: 0, y: 180 });
		expect(byNodeId.get('middle-parent')?.position).toEqual({ x: 0, y: 320 });
		expect(byNodeId.get('middle-existing')?.position).toEqual({ x: 0, y: 460 });
		expect(byNodeId.get('middle-new')?.position).toEqual({ x: 260, y: 460 });
		expect(byNodeId.get('right')?.position).toEqual({ x: 510, y: 180 });
		expect(byNodeId.get('right-child')?.position).toEqual({ x: 510, y: 320 });
		expect(byNodeId.get('right-grandchild')?.position).toEqual({
			x: 510,
			y: 460,
		});
		expect(byNodeId.get('left')?.position).toEqual({ x: -260, y: 180 });
		expect(byNodeId.get('outside')?.position).toEqual({ x: 1200, y: 1200 });
		expect(result.affectedNodeIds).toEqual(
			new Set(['middle-new', 'right', 'right-child', 'right-grandchild'])
		);
	});

	it('opens a left-right corridor by pushing parent-sibling branches outward on y', () => {
		const nodes = [
			createNode('root', 0, 0),
			createNode('top', 220, -260),
			createNode('top-child', 420, -260),
			createNode('top-grandchild', 620, -260),
			createNode('middle', 220, 0),
			createNode('middle-parent', 420, 0),
			createNode('middle-existing', 620, 0),
			createNode('middle-new', 620, 0),
			createNode('bottom', 220, 260),
			createNode('bottom-child', 420, 260),
			createNode('bottom-grandchild', 620, 260),
			createNode('outside', 1200, 1200),
		];
		const edges = [
			createEdge('root-top', 'root', 'top'),
			createEdge('top-child-edge', 'top', 'top-child'),
			createEdge('top-grandchild-edge', 'top-child', 'top-grandchild'),
			createEdge('root-middle', 'root', 'middle'),
			createEdge('middle-parent-edge', 'middle', 'middle-parent'),
			createEdge('middle-existing-edge', 'middle-parent', 'middle-existing'),
			createEdge('middle-new-edge', 'middle-parent', 'middle-new'),
			createEdge('root-bottom', 'root', 'bottom'),
			createEdge('bottom-child-edge', 'bottom', 'bottom-child'),
			createEdge(
				'bottom-grandchild-edge',
				'bottom-child',
				'bottom-grandchild'
			),
		];

		const result = applyLocalCreateBranchReflow({
			changedNodeId: 'middle-new',
			nodes,
			edges,
			config: { ...DEFAULT_LAYOUT_CONFIG, direction: 'LEFT_RIGHT' },
		});

		const byNodeId = new Map(result.nodes.map((node) => [node.id, node]));

		expect(byNodeId.get('middle')?.position).toEqual({ x: 220, y: 0 });
		expect(byNodeId.get('middle-parent')?.position).toEqual({ x: 420, y: 0 });
		expect(byNodeId.get('middle-existing')?.position).toEqual({ x: 620, y: 0 });
		expect(byNodeId.get('middle-new')?.position).toEqual({ x: 620, y: 140 });
		expect(byNodeId.get('bottom')?.position).toEqual({ x: 220, y: 270 });
		expect(byNodeId.get('bottom-child')?.position).toEqual({ x: 420, y: 270 });
		expect(byNodeId.get('bottom-grandchild')?.position).toEqual({
			x: 620,
			y: 270,
		});
		expect(byNodeId.get('top')?.position).toEqual({ x: 220, y: -260 });
		expect(byNodeId.get('outside')?.position).toEqual({ x: 1200, y: 1200 });
		expect(result.affectedNodeIds).toEqual(
			new Set(['middle-new', 'bottom', 'bottom-child', 'bottom-grandchild'])
		);
	});
});
