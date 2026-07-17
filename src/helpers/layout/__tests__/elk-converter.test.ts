import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';

jest.mock('@/helpers/generate-uuid', () => jest.fn(() => 'mock-uuid'));

import {
	convertFromElkGraph,
	convertToElkGraph,
} from '../elk-converter';

const DEFAULT_LAYOUT_CONFIG = {
	direction: 'LEFT_RIGHT' as const,
	nodeSpacing: 50,
	layerSpacing: 100,
	animateTransition: true,
};

function createNode(id: string, x: number, y: number): AppNode {
	return {
		id,
		type: 'defaultNode',
		position: { x, y },
		width: 120,
		height: 60,
		data: {
			id,
			map_id: 'map-1',
			user_id: 'user-1',
			content: id,
			metadata: {},
			aiData: {},
			position_x: x,
			position_y: y,
			node_type: 'defaultNode',
			created_at: '2026-04-15T00:00:00.000Z',
			updated_at: '2026-04-15T00:00:00.000Z',
			parent_id: null,
			width: 120,
			height: 60,
		},
	} as AppNode;
}

function createEdge(
	id: string,
	label: string | null = null,
	source = 'a',
	target = 'b'
): AppEdge {
	return {
		id,
		source,
		target,
		type: 'waypointEdge',
		label,
		data: {
			id,
			map_id: 'map-1',
			user_id: 'user-1',
			source,
			target,
			label,
			animated: false,
			metadata: {
				pathType: 'waypoint',
			},
			aiData: {},
			created_at: '2026-04-15T00:00:00.000Z',
			updated_at: '2026-04-15T00:00:00.000Z',
		},
	} as AppEdge;
}

describe('elk-converter', () => {
	it('includes sized ELK labels for labeled AppEdges', () => {
		const elkGraph = convertToElkGraph(
			[createNode('a', 0, 0), createNode('b', 220, 0)],
			[createEdge('edge-1', 'Depends on')],
			DEFAULT_LAYOUT_CONFIG
		);

		expect(elkGraph.edges).toHaveLength(1);
		expect(elkGraph.edges?.[0]?.labels).toHaveLength(1);
		expect(elkGraph.edges?.[0]?.labels?.[0]).toMatchObject({
			id: 'edge-1:label',
			text: 'Depends on',
			layoutOptions: {
				'elk.edgeLabels.placement': 'CENTER',
				'elk.edgeLabels.inline': 'true',
			},
		});
		expect(elkGraph.edges?.[0]?.labels?.[0]?.width).toBeGreaterThan(32);
		expect(elkGraph.edges?.[0]?.labels?.[0]?.height).toBe(24);
	});

	it('omits ELK labels for non-layered presets', () => {
		const elkGraph = convertToElkGraph(
			[createNode('a', 0, 0), createNode('b', 220, 0)],
			[createEdge('edge-1', 'Depends on')],
			{
				...DEFAULT_LAYOUT_CONFIG,
				presetId: 'radial-tree',
			}
		);

		expect(elkGraph.edges).toHaveLength(1);
		expect(elkGraph.edges?.[0]?.labels).toBeUndefined();
	});

	it('snaps horizontal ELK labels onto the routed segment centerline', () => {
		const result = convertFromElkGraph(
			{
				id: 'root',
				children: [
					{ id: 'a', x: 0, y: 0, width: 120, height: 60 },
					{ id: 'b', x: 220, y: 0, width: 120, height: 60 },
				],
				edges: [
					{
						id: 'edge-1',
						sources: ['a'],
						targets: ['b'],
						labels: [
							{
								id: 'edge-1:label',
								text: 'Depends on',
								x: 145,
								y: 44,
								width: 92,
								height: 24,
							},
						],
						sections: [
							{
								id: 'edge-1:s0',
								startPoint: { x: 120, y: 30 },
								endPoint: { x: 220, y: 30 },
								incomingShape: 'a',
								outgoingShape: 'b',
							},
						],
					},
				],
			},
			[createNode('a', 0, 0), createNode('b', 220, 0)],
			[createEdge('edge-1', 'Depends on')],
			DEFAULT_LAYOUT_CONFIG
		);

		expect(result.edges[0]?.type).toBe('waypointEdge');
		expect(result.edges[0]?.data?.metadata?.routingStyle).toBe('elk');
		expect(result.edges[0]?.data?.metadata?.elkLabel).toEqual({
			x: 145,
			y: 18,
			width: 92,
			height: 24,
			centerX: 191,
			centerY: 30,
		});
	});

	it('snaps vertical ELK labels onto the routed segment centerline', () => {
		const result = convertFromElkGraph(
			{
				id: 'root',
				children: [
					{ id: 'a', x: 0, y: 0, width: 120, height: 60 },
					{ id: 'b', x: 0, y: 220, width: 120, height: 60 },
				],
				edges: [
					{
						id: 'edge-1',
						sources: ['a'],
						targets: ['b'],
						labels: [
							{
								id: 'edge-1:label',
								text: 'Depends on',
								x: 96,
								y: 88,
								width: 92,
								height: 24,
							},
						],
						sections: [
							{
								id: 'edge-1:s0',
								startPoint: { x: 120, y: 30 },
								endPoint: { x: 120, y: 220 },
								incomingShape: 'a',
								outgoingShape: 'b',
							},
						],
					},
				],
			},
			[createNode('a', 0, 0), createNode('b', 0, 220)],
			[createEdge('edge-1', 'Depends on')],
			DEFAULT_LAYOUT_CONFIG
		);

		expect(result.edges[0]?.data?.metadata?.routingStyle).toBe('elk');
		expect(result.edges[0]?.data?.metadata?.elkLabel).toEqual({
			x: 74,
			y: 88,
			width: 92,
			height: 24,
			centerX: 120,
			centerY: 100,
		});
	});

	it('clears stale ELK label metadata when the layout result has no label', () => {
		const edge = createEdge('edge-1', 'Depends on');
		edge.data!.metadata = {
			pathType: 'waypoint',
			routingStyle: 'elk',
			elkLabel: {
				x: 10,
				y: 20,
				width: 90,
				height: 24,
				centerX: 55,
				centerY: 32,
			},
		};

		const result = convertFromElkGraph(
			{
				id: 'root',
				children: [
					{ id: 'a', x: 0, y: 0, width: 120, height: 60 },
					{ id: 'b', x: 220, y: 0, width: 120, height: 60 },
				],
				edges: [
					{
						id: 'edge-1',
						sources: ['a'],
						targets: ['b'],
						sections: [
							{
								id: 'edge-1:s0',
								startPoint: { x: 120, y: 30 },
								endPoint: { x: 220, y: 30 },
								incomingShape: 'a',
								outgoingShape: 'b',
							},
						],
					},
				],
			},
			[createNode('a', 0, 0), createNode('b', 220, 0)],
			[edge],
			DEFAULT_LAYOUT_CONFIG
		);

		expect(result.edges[0]?.data?.metadata?.routingStyle).toBe('elk');
		expect(result.edges[0]?.data?.metadata?.elkLabel).toBeUndefined();
	});

	it('uses straight path labels and clears ELK geometry for non-layered presets', () => {
		const edge = createEdge('edge-1', 'Depends on');
		edge.data!.metadata = {
			pathType: 'waypoint',
			routingStyle: 'elk',
			elkLabel: {
				x: 10,
				y: 20,
				width: 90,
				height: 24,
				centerX: 55,
				centerY: 32,
			},
		};

		const result = convertFromElkGraph(
			{
				id: 'root',
				children: [
					{ id: 'a', x: 0, y: 0, width: 120, height: 60 },
					{ id: 'b', x: 220, y: 0, width: 120, height: 60 },
				],
				edges: [
					{
						id: 'edge-1',
						sources: ['a'],
						targets: ['b'],
						labels: [
							{
								id: 'edge-1:label',
								text: 'Depends on',
								x: 0,
								y: 0,
								width: 92,
								height: 24,
							},
						],
						sections: [
							{
								id: 'edge-1:s0',
								startPoint: { x: 120, y: 30 },
								endPoint: { x: 220, y: 30 },
								bendPoints: [
									{ x: 120, y: 30 },
									{ x: 170, y: 30 },
									{ x: 170, y: 30 },
									{ x: 220, y: 30 },
								],
								incomingShape: 'a',
								outgoingShape: 'b',
							},
						],
					},
				],
			},
			[createNode('a', 0, 0), createNode('b', 220, 0)],
			[edge],
			{
				...DEFAULT_LAYOUT_CONFIG,
				presetId: 'radial-tree',
			}
		);

		expect(result.edges[0]?.type).toBe('waypointEdge');
		expect(result.edges[0]?.data?.metadata?.routingStyle).toBe('custom-layout');
		expect(result.edges[0]?.data?.metadata?.curveType).toBe('linear');
		expect(result.edges[0]?.data?.metadata?.elkLabel).toBeUndefined();
		expect(result.edges[0]?.data?.metadata?.waypoints).toBeUndefined();
	});
});
