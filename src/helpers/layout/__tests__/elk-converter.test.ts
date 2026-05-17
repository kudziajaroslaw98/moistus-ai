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

	it('adds an ELK-only synthetic root for radial multi-root graphs', () => {
		const elkGraph = convertToElkGraph(
			[
				createNode('a', 0, 0),
				createNode('b', 220, 0),
				createNode('c', 440, 0),
				createNode('d', 660, 0),
			],
			[createEdge('edge-1', null, 'a', 'b')],
			{
				...DEFAULT_LAYOUT_CONFIG,
				presetId: 'radial-tree',
			}
		);

		const syntheticRoot = elkGraph.children?.find((child) =>
			child.id.startsWith('__moistus_radial_root__')
		);
		expect(syntheticRoot).toMatchObject({
			width: 1,
			height: 1,
		});
		expect(elkGraph.layoutOptions).toMatchObject({
			'elk.processingOrder.rootSelection': 'FIXED',
			'elk.processingOrder.preferredRoot': syntheticRoot?.id,
		});

		const syntheticTargets = elkGraph.edges
			?.filter((edge) => edge.sources[0] === syntheticRoot?.id)
			.map((edge) => edge.targets[0]);

		expect(syntheticTargets).toEqual(['a', 'c', 'd']);
		expect(elkGraph.edges).toHaveLength(4);
	});

	it('keeps single-root radial trees free of synthetic graph helpers', () => {
		const elkGraph = convertToElkGraph(
			[
				createNode('a', 0, 0),
				createNode('b', 220, 0),
				createNode('c', 440, 0),
			],
			[
				createEdge('edge-1', null, 'a', 'b'),
				createEdge('edge-2', null, 'a', 'c'),
			],
			{
				...DEFAULT_LAYOUT_CONFIG,
				presetId: 'radial-tree',
			}
		);

		expect(
			elkGraph.children?.some((child) =>
				child.id.startsWith('__moistus_radial_root__')
			)
		).toBe(false);
		expect(elkGraph.layoutOptions).toMatchObject({
			'elk.processingOrder.rootSelection': 'FIXED',
			'elk.processingOrder.preferredRoot': 'a',
		});
	});

	it('sends cyclic radial inputs to ELK as a spanning tree', () => {
		const elkGraph = convertToElkGraph(
			[
				createNode('a', 0, 0),
				createNode('b', 220, 0),
				createNode('c', 440, 0),
				createNode('d', 660, 0),
			],
			[
				createEdge('edge-1', null, 'a', 'b'),
				createEdge('edge-2', null, 'b', 'c'),
				createEdge('edge-3', null, 'c', 'a'),
				createEdge('edge-4', null, 'b', 'd'),
			],
			{
				...DEFAULT_LAYOUT_CONFIG,
				presetId: 'radial-tree',
			}
		);

		expect(
			elkGraph.children?.some((child) =>
				child.id.startsWith('__moistus_radial_root__')
			)
		).toBe(false);
		expect(elkGraph.layoutOptions).toMatchObject({
			'elk.processingOrder.rootSelection': 'FIXED',
			'elk.processingOrder.preferredRoot': 'a',
		});
		expect(elkGraph.edges).toHaveLength(3);
		expect(elkGraph.edges?.map((edge) => edge.id)).toEqual([
			'edge-1',
			'__moistus_radial_root__:tree:a:c',
			'edge-4',
		]);
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

	it('uses linear path labels and normalizes duplicate bend points for non-layered presets', () => {
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

		expect(result.edges[0]?.data?.metadata?.routingStyle).toBe('elk');
		expect(result.edges[0]?.data?.metadata?.curveType).toBe('linear');
		expect(result.edges[0]?.data?.metadata?.elkLabel).toBeUndefined();
		expect(result.edges[0]?.data?.metadata?.waypoints).toEqual([
			{ id: 'mock-uuid', x: 170, y: 30 },
		]);
	});
});
