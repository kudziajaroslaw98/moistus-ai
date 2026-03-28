import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type { LayoutResult } from '@/types/layout-types';
import * as workerClient from '../elk-worker-client';

const createNode = (id: string, x: number, y: number): AppNode =>
	({
		id,
		type: 'defaultNode',
		position: { x, y },
		data: {
			id,
			map_id: 'map-1',
			user_id: 'owner-id',
			content: id,
			metadata: {},
			aiData: {},
			position_x: x,
			position_y: y,
			node_type: 'defaultNode',
			created_at: '2026-01-01T00:00:00.000Z',
			updated_at: '2026-01-01T00:00:00.000Z',
			parent_id: null,
		},
	} as AppNode);

const createEdge = (
	id: string,
	source: string,
	target: string,
	metadata?: Record<string, unknown> | null,
	type: AppEdge['type'] = 'floatingEdge'
): AppEdge =>
	({
		id,
		source,
		target,
		type,
		data: {
			id,
			map_id: 'map-1',
			user_id: 'owner-id',
			source,
			target,
			label: null,
			animated: false,
			markerEnd: undefined,
			markerStart: undefined,
			metadata: metadata ?? {},
			aiData: {},
			created_at: '2026-01-01T00:00:00.000Z',
			updated_at: '2026-01-01T00:00:00.000Z',
		},
	} as unknown as AppEdge);

const withMetadata = (
	edge: AppEdge,
	metadata: Record<string, unknown>
): AppEdge =>
	({
		...edge,
		data: {
			...edge.data!,
			metadata: {
				...(edge.data!.metadata ?? {}),
				...metadata,
			},
		},
	} as AppEdge);

describe('elk-worker-client local layout helpers', () => {
	beforeEach(() => {
		jest.restoreAllMocks();
	});

	it('builds movable and anchor neighborhoods with radius defaults', () => {
		const nodes = [
			createNode('n1', 0, 0),
			createNode('n2', 100, 0),
			createNode('n3', 200, 0),
			createNode('n4', 300, 0),
			createNode('n5', 400, 0),
		];
		const edges = [
			createEdge('e1', 'n1', 'n2'),
			createEdge('e2', 'n2', 'n3'),
			createEdge('e3', 'n3', 'n4'),
			createEdge('e4', 'n4', 'n5'),
		];

		const { movableNodeIds, anchorNodeIds } =
			workerClient.buildLocalLayoutNeighborhood(nodes, edges, {
				centerNodeId: 'n3',
			});

		expect(movableNodeIds).toEqual(new Set(['n3', 'n2', 'n4']));
		expect(anchorNodeIds).toEqual(new Set(['n1', 'n5']));
	});

	it('keeps anchor nodes fixed and only smooths movable nodes', () => {
		const allNodes = [
			createNode('a', 0, 0),
			createNode('b', 10, 10),
			createNode('c', 30, 10),
			createNode('d', 40, 0),
			createNode('e', 100, 100),
			createNode('f', 200, 200),
		];

		const allEdges = [
			createEdge('ab', 'a', 'b', { pathType: 'waypoint' }, 'waypointEdge'),
			createEdge('bc', 'b', 'c', { pathType: 'waypoint' }, 'waypointEdge'),
			createEdge('ce', 'c', 'e', { pathType: 'waypoint' }, 'waypointEdge'),
			createEdge('ef', 'e', 'f', { pathType: 'orthogonal' }),
		];

		const layoutResult: LayoutResult = {
			nodes: [
				createNode('a', 0, 0),
				createNode('b', 10, 30),
				createNode('c', 30, 30),
				createNode('d', 40, 0),
			],
			edges: [
				withMetadata(allEdges[0], {
					waypoints: [{ x: 12, y: 9 }],
					curveType: 'basis',
				}),
				withMetadata(allEdges[1], {
					waypoints: [{ x: 50, y: 12 }],
					curveType: 'basis',
				}),
				withMetadata(allEdges[2], {
					waypoints: [{ x: 140, y: 11 }],
					curveType: 'basis',
				}),
				...allEdges.slice(3),
			],
		};

		const movableNodeIds = new Set(['b', 'c']);
		const anchorNodeIds = new Set(['a', 'd']);
		const alpha = 0.5;

		const merged = workerClient.mergeLocalLayoutResult(
			allNodes,
			allEdges,
			layoutResult,
			movableNodeIds,
			anchorNodeIds,
			alpha
		);

		const byId = new Map(merged.nodes.map((node) => [node.id, node.position]));

		expect(byId.get('a')).toEqual({ x: 0, y: 0 });
		expect(byId.get('d')).toEqual({ x: 40, y: 0 });
		expect(byId.get('e')).toEqual({ x: 100, y: 100 });
		expect(byId.get('f')).toEqual({ x: 200, y: 200 });

		// Movable nodes move halfway toward target due to alpha=0.5
		expect(byId.get('b')).toEqual({ x: 10, y: 20 });
		expect(byId.get('c')).toEqual({ x: 30, y: 20 });

		const byEdgeId = new Map(merged.edges.map((edge) => [edge.id, edge]));
		expect(byEdgeId.get('ab')?.data?.metadata?.waypoints).toEqual([
			{ x: 12, y: 4 },
		]);
		expect(byEdgeId.get('bc')?.data?.metadata?.waypoints).toEqual([
			{ x: 50, y: 2 },
		]);
		expect(byEdgeId.get('ce')?.data?.metadata?.waypoints).toEqual([
			{ x: 140, y: 6 },
		]);
		expect(byEdgeId.get('ef')?.data?.metadata?.waypoints).toBeUndefined();
	});

	it('shifts only protected branch descendants to avoid sibling overlap and keeps waypoint paths coherent', () => {
		const allNodes = [
			createNode('root', 100, 0),
			createNode('branch', 100, 120),
			createNode('leaf', 100, 240),
			createNode('sibling', 100, 200),
			createNode('far', 700, 120),
		];
		const allEdges = [
			createEdge('r-b', 'root', 'branch'),
			createEdge(
				'b-l',
				'branch',
				'leaf',
				{
					pathType: 'waypoint',
					waypoints: [{ x: 150, y: 300 }],
					curveType: 'smoothstep',
				},
				'waypointEdge'
			),
			createEdge('r-s', 'root', 'sibling'),
		];

		const layoutResult: LayoutResult = {
			nodes: [
				createNode('root', 100, 0),
				createNode('branch', 100, 130),
				createNode('leaf', 100, 250),
				createNode('sibling', 100, 200),
			],
			edges: [
				withMetadata(allEdges[1], {
					waypoints: [{ x: 150, y: 300 }],
					curveType: 'smoothstep',
				}),
			],
		};

		const merged = workerClient.mergeLocalLayoutResult(
			allNodes,
			allEdges,
			layoutResult,
			new Set(['branch', 'leaf']),
			new Set(['root']),
			1,
			{
				direction: 'TOP_BOTTOM',
				nodeSpacing: 50,
				layerSpacing: 100,
				animateTransition: true,
			},
			new Set(['branch', 'leaf'])
		);

		const byId = new Map(merged.nodes.map((node) => [node.id, node.position]));
		expect(byId.get('root')).toEqual({ x: 100, y: 0 });
		expect(byId.get('sibling')).toEqual({ x: 100, y: 200 });
		expect(byId.get('far')).toEqual({ x: 700, y: 120 });
		expect(byId.get('branch')).toEqual({ x: 100, y: 310 });
		expect(byId.get('leaf')).toEqual({ x: 100, y: 430 });

		const byEdgeId = new Map(merged.edges.map((edge) => [edge.id, edge]));
		expect(byEdgeId.get('b-l')?.data?.metadata?.waypoints).toEqual([
			{ x: 150, y: 480 },
		]);
	});

	it('uses primary-axis branch translation for LEFT_RIGHT collision recovery', () => {
		const allNodes = [
			createNode('root', 0, 100),
			createNode('branch', 100, 100),
			createNode('sibling', 180, 100),
		];
		const allEdges = [
			createEdge('r-b', 'root', 'branch'),
			createEdge('r-s', 'root', 'sibling'),
		];

		const layoutResult: LayoutResult = {
			nodes: [createNode('root', 0, 100), createNode('branch', 100, 100)],
			edges: [],
		};

		const merged = workerClient.mergeLocalLayoutResult(
			allNodes,
			allEdges,
			layoutResult,
			new Set(['branch']),
			new Set(['root']),
			1,
			{
				direction: 'LEFT_RIGHT',
				nodeSpacing: 50,
				layerSpacing: 100,
				animateTransition: true,
			},
			new Set(['branch'])
		);

		const byId = new Map(merged.nodes.map((node) => [node.id, node.position]));
		expect(byId.get('branch')).toEqual({ x: 530, y: 100 });
		expect(byId.get('branch')?.y).toBe(100);
		expect(byId.get('sibling')).toEqual({ x: 180, y: 100 });
	});

	it('mergeLayoutResult updates selected nodes and preserves the rest of the graph', () => {
		const allNodes = [
			createNode('a', 0, 0),
			createNode('b', 10, 10),
			createNode('c', 20, 20),
			createNode('d', 30, 30),
		];
		const allEdges = [
			createEdge('ab', 'a', 'b'),
			createEdge('bc', 'b', 'c'),
			createEdge('cd', 'c', 'd'),
		];

		const selectedNodes = new Set(['b', 'c']);
		const layoutResult: LayoutResult = {
			nodes: [createNode('b', 40, 0), createNode('c', 80, 0)],
			edges: [
				withMetadata(allEdges[0], {
					waypoints: [{ x: 40, y: 0 }],
				}),
				withMetadata(allEdges[1], {
					waypoints: [{ x: 60, y: 0 }],
				}),
			],
		};

		const merged = workerClient.mergeLayoutResult(
			allNodes,
			allEdges,
			layoutResult,
			selectedNodes,
			{
				direction: 'LEFT_RIGHT',
				nodeSpacing: 50,
				layerSpacing: 100,
				animateTransition: true,
			}
		);

		const byId = new Map(merged.nodes.map((node) => [node.id, node.position]));
		expect(byId.get('a')).toEqual({ x: 0, y: 0 });
		expect(byId.get('d')).toEqual({ x: 30, y: 30 });
		expect(byId.get('b')).toEqual({ x: -5, y: 15 });
		expect(byId.get('c')).toEqual({ x: 35, y: 15 });

		const byEdgeId = new Map(merged.edges.map((edge) => [edge.id, edge]));
		expect(byEdgeId.get('ab')?.data?.metadata?.waypoints).toEqual([
			{ x: -5, y: 15 },
		]);
		expect(byEdgeId.get('bc')?.data?.metadata?.waypoints).toEqual([
			{ x: 15, y: 15 },
		]);
		expect(byEdgeId.get('cd')?.data?.metadata).toEqual({
			...allEdges[2].data?.metadata,
		});
	});
});
