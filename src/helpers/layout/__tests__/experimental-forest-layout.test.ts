import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type { LayoutConfig } from '@/types/layout-types';
import {
	runCompactForestFallback,
	runDirectionalForestLayout,
	runRadialBalloonLayout,
} from '../experimental-forest-layout';

const LAYOUT_CONFIG: LayoutConfig = {
	direction: 'LEFT_RIGHT',
	nodeSpacing: 50,
	layerSpacing: 100,
	animateTransition: true,
};

function createNode(id: string): AppNode {
	return {
		id,
		type: 'defaultNode',
		position: { x: 0, y: 0 },
		width: 120,
		height: 60,
		data: {
			id,
			map_id: 'map-1',
			user_id: 'user-1',
			content: id,
			metadata: {},
			aiData: {},
			position_x: 0,
			position_y: 0,
			node_type: 'defaultNode',
			created_at: '2026-07-17T00:00:00.000Z',
			updated_at: '2026-07-17T00:00:00.000Z',
			parent_id: null,
		},
	} as AppNode;
}

function createEdge(id: string, source: string, target: string): AppEdge {
	return {
		id,
		source,
		target,
		type: 'floatingEdge',
		data: {
			id,
			map_id: 'map-1',
			user_id: 'user-1',
			source,
			target,
			label: null,
			animated: false,
			metadata: {
				pathType: 'waypoint',
				routingStyle: 'elk',
				waypoints: [{ x: 10, y: 20 }],
				elkLabel: {
					x: 10,
					y: 20,
					width: 80,
					height: 24,
					centerX: 50,
					centerY: 32,
				},
			},
			aiData: {},
			created_at: '2026-07-17T00:00:00.000Z',
			updated_at: '2026-07-17T00:00:00.000Z',
		},
	} as AppEdge;
}

function createNodeIds(count: number, prefix = 'node'): string[] {
	return Array.from({ length: count }, (_, index) => `${prefix}-${index}`);
}

function createChainGraph(count = 81): { nodes: AppNode[]; edges: AppEdge[] } {
	const ids = createNodeIds(count);
	return {
		nodes: ids.map(createNode),
		edges: ids
			.slice(1)
			.map((id, index) => createEdge(`edge-${index}`, ids[index]!, id)),
	};
}

function createStarGraph(count = 81): { nodes: AppNode[]; edges: AppEdge[] } {
	const ids = createNodeIds(count);
	return {
		nodes: ids.map(createNode),
		edges: ids
			.slice(1)
			.map((id, index) => createEdge(`edge-${index}`, ids[0]!, id)),
	};
}

function createCycleGraph(count = 81): { nodes: AppNode[]; edges: AppEdge[] } {
	const ids = createNodeIds(count);
	return {
		nodes: ids.map(createNode),
		edges: ids.map((id, index) =>
			createEdge(`edge-${index}`, id, ids[(index + 1) % ids.length]!)
		),
	};
}

function createDenseGraph(count = 81): { nodes: AppNode[]; edges: AppEdge[] } {
	const ids = createNodeIds(count);
	return {
		nodes: ids.map(createNode),
		edges: ids.flatMap((id, index) => [
			createEdge(`next-${index}`, id, ids[(index + 1) % ids.length]!),
			createEdge(`cross-${index}`, id, ids[(index + 13) % ids.length]!),
		]),
	};
}

function createDisconnectedGraph(): { nodes: AppNode[]; edges: AppEdge[] } {
	const first = createNodeIds(41, 'first');
	const second = createNodeIds(40, 'second');
	return {
		nodes: [...first, ...second].map(createNode),
		edges: [
			...first
				.slice(1)
				.map((id, index) => createEdge(`first-${index}`, first[index]!, id)),
			...second
				.slice(1)
				.map((id, index) => createEdge(`second-${index}`, second[0]!, id)),
		],
	};
}

function expectFiniteUniquePositions(nodes: AppNode[]): void {
	const positions = new Set<string>();
	for (const node of nodes) {
		expect(Number.isFinite(node.position.x)).toBe(true);
		expect(Number.isFinite(node.position.y)).toBe(true);
		positions.add(
			`${Math.round(node.position.x)}:${Math.round(node.position.y)}`
		);
	}
	expect(positions.size).toBe(nodes.length);
}

describe('experimental forest layouts', () => {
	it.each([
		['chain', createChainGraph()],
		['star', createStarGraph()],
		['cycle', createCycleGraph()],
		['dense graph', createDenseGraph()],
		['disconnected graph', createDisconnectedGraph()],
	])(
		'places every node in an 80+ node %s without recursive traversal',
		(_, graph) => {
			for (const direction of ['RIGHT', 'DOWN'] as const) {
				const result = runDirectionalForestLayout(
					graph.nodes,
					graph.edges,
					LAYOUT_CONFIG,
					direction
				);

				expectFiniteUniquePositions(result.nodes);
				expect(result.edges.map((edge) => edge.id)).toEqual(
					graph.edges.map((edge) => edge.id)
				);
			}

			const radialResult = runRadialBalloonLayout(graph.nodes, graph.edges, {
				...LAYOUT_CONFIG,
				presetId: 'radial-tree',
			});
			expectFiniteUniquePositions(radialResult.nodes);
		}
	);

	it('keeps a directed chain monotonic for each directional preset', () => {
		const graph = createChainGraph();
		const right = runDirectionalForestLayout(
			graph.nodes,
			graph.edges,
			LAYOUT_CONFIG,
			'RIGHT'
		);
		const down = runDirectionalForestLayout(
			graph.nodes,
			graph.edges,
			LAYOUT_CONFIG,
			'DOWN'
		);
		const rightPositions = new Map(
			right.nodes.map((node) => [node.id, node.position])
		);
		const downPositions = new Map(
			down.nodes.map((node) => [node.id, node.position])
		);

		for (let index = 1; index < graph.nodes.length; index += 1) {
			const previousId = graph.nodes[index - 1]!.id;
			const currentId = graph.nodes[index]!.id;
			expect(rightPositions.get(currentId)!.x).toBeGreaterThan(
				rightPositions.get(previousId)!.x
			);
			expect(downPositions.get(currentId)!.y).toBeGreaterThan(
				downPositions.get(previousId)!.y
			);
		}
	});

	it('arranges radial hub children around their hub and preserves cross-links', () => {
		const hub = 'hub';
		const children = createNodeIds(12, 'child');
		const nodes = [hub, ...children].map(createNode);
		const edges = [
			...children.map((child, index) => createEdge(`hub-${index}`, hub, child)),
			createEdge('cross-link', children[0]!, children[7]!),
		];
		const result = runRadialBalloonLayout(nodes, edges, {
			...LAYOUT_CONFIG,
			presetId: 'radial-tree',
		});
		const positions = new Map(
			result.nodes.map((node) => [node.id, node.position])
		);
		const hubCenter = getCenter(positions.get(hub)!);
		const childCenters = children.map((child) =>
			getCenter(positions.get(child)!)
		);

		expectFiniteUniquePositions(result.nodes);
		expect(childCenters.some((center) => center.x > hubCenter.x)).toBe(true);
		expect(childCenters.some((center) => center.x < hubCenter.x)).toBe(true);
		expect(childCenters.some((center) => center.y > hubCenter.y)).toBe(true);
		expect(childCenters.some((center) => center.y < hubCenter.y)).toBe(true);
		expect(result.edges.map((edge) => edge.id)).toEqual(
			edges.map((edge) => edge.id)
		);
	});

	it('uses compact deterministic fallback geometry and clears stale ELK metadata', () => {
		const graph = createChainGraph();
		const first = runCompactForestFallback(
			graph.nodes,
			graph.edges,
			LAYOUT_CONFIG
		);
		const second = runCompactForestFallback(
			graph.nodes,
			graph.edges,
			LAYOUT_CONFIG
		);
		const xValues = first.nodes.map((node) => node.position.x);
		const yValues = first.nodes.map((node) => node.position.y);

		expectFiniteUniquePositions(first.nodes);
		expect(Math.max(...xValues) - Math.min(...xValues)).toBeLessThan(2_000);
		expect(Math.max(...yValues) - Math.min(...yValues)).toBeLessThan(2_000);
		expect(first.nodes.map((node) => node.position)).toEqual(
			second.nodes.map((node) => node.position)
		);
		expect(first.edges[0]).toMatchObject({ type: 'waypointEdge' });
		expect(first.edges[0]?.data?.metadata).toMatchObject({
			pathType: 'waypoint',
			curveType: 'linear',
			routingStyle: 'custom-layout',
		});
		expect(first.edges[0]?.data?.metadata?.waypoints).toBeUndefined();
		expect(first.edges[0]?.data?.metadata?.elkLabel).toBeUndefined();
	});
});

function getCenter(position: { x: number; y: number }): {
	x: number;
	y: number;
} {
	return { x: position.x + 60, y: position.y + 30 };
}
