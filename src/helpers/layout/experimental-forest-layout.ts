import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type { LayoutConfig, LayoutResult } from '@/types/layout-types';

const DEFAULT_NODE_WIDTH = 320;
const DEFAULT_NODE_HEIGHT = 80;
const GRAPH_PADDING = 80;
const COMPONENT_SPACING = 280;
const MIN_RADIAL_RADIUS = 260;

export type DirectionalTreeDirection = 'RIGHT' | 'DOWN';

interface Point2D {
	x: number;
	y: number;
}

interface NodeSize {
	width: number;
	height: number;
}

interface Neighbor {
	id: string;
	isOutgoing: boolean;
}

interface ForestComponent {
	nodeIds: string[];
	rootId: string;
	children: Map<string, string[]>;
	depths: Map<string, number>;
	traversal: string[];
	weights: Map<string, number>;
}

interface ComponentLayout {
	nodeIds: string[];
	positions: Map<string, Point2D>;
	bounds: LayoutBounds;
}

interface LayoutBounds {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
	width: number;
	height: number;
}

export function runDirectionalForestLayout(
	nodes: AppNode[],
	edges: AppEdge[],
	config: LayoutConfig,
	direction: DirectionalTreeDirection
): LayoutResult {
	const { components, nodeSizes } = buildForest(nodes, edges);
	const componentLayouts = components.map((component) =>
		layoutDirectionalComponent(component, nodeSizes, config, direction)
	);

	return createLayoutResult(nodes, edges, packComponents(componentLayouts));
}

export function runRadialBalloonLayout(
	nodes: AppNode[],
	edges: AppEdge[],
	config: LayoutConfig
): LayoutResult {
	const { components, nodeSizes } = buildForest(nodes, edges);
	const componentLayouts = components.map((component) =>
		layoutRadialComponent(component, nodeSizes, config)
	);

	return createLayoutResult(nodes, edges, packComponents(componentLayouts));
}

export function runCompactForestFallback(
	nodes: AppNode[],
	edges: AppEdge[],
	config: LayoutConfig
): LayoutResult {
	const { components, nodeSizes } = buildForest(nodes, edges);
	const componentLayouts = components.map((component) =>
		layoutCompactComponent(component, nodeSizes, config)
	);

	return createLayoutResult(nodes, edges, packComponents(componentLayouts));
}

export function normalizeExperimentalEdges(edges: AppEdge[]): AppEdge[] {
	return edges.map(
		(edge) =>
			({
				...edge,
				type: 'waypointEdge',
				data: {
					...(edge.data ?? ({} as AppEdge['data'])),
					metadata: {
						...(edge.data?.metadata ?? {}),
						pathType: 'waypoint',
						waypoints: undefined,
						curveType: 'linear',
						routingStyle: 'custom-layout',
						sourceAnchor: undefined,
						targetAnchor: undefined,
						elkLabel: undefined,
					},
				},
			}) as AppEdge
	);
}

export function hasUsableLayoutPositions(
	nodes: AppNode[],
	expectedNodeIds: Iterable<string>
): boolean {
	const expectedIds = new Set(expectedNodeIds);
	if (nodes.length !== expectedIds.size) {
		return false;
	}

	const positionKeys = new Set<string>();
	for (const node of nodes) {
		if (
			!expectedIds.has(node.id) ||
			!Number.isFinite(node.position.x) ||
			!Number.isFinite(node.position.y)
		) {
			return false;
		}

		const key = `${Math.round(node.position.x)}:${Math.round(node.position.y)}`;
		if (positionKeys.has(key)) {
			return false;
		}
		positionKeys.add(key);
	}

	return true;
}

function buildForest(
	nodes: AppNode[],
	edges: AppEdge[]
): { components: ForestComponent[]; nodeSizes: Map<string, NodeSize> } {
	const nodeIds = nodes.map((node) => node.id);
	const nodeIdSet = new Set(nodeIds);
	const nodeOrder = new Map(nodes.map((node, index) => [node.id, index]));
	const nodeSizes = new Map(
		nodes.map((node) => [node.id, getNodeSize(node)] as const)
	);
	const incomingCounts = new Map(nodeIds.map((nodeId) => [nodeId, 0]));
	const adjacency = new Map(
		nodeIds.map((nodeId) => [nodeId, [] as Neighbor[]])
	);

	for (const edge of edges) {
		if (
			edge.source === edge.target ||
			!nodeIdSet.has(edge.source) ||
			!nodeIdSet.has(edge.target)
		) {
			continue;
		}

		addNeighbor(adjacency, edge.source, edge.target, true);
		addNeighbor(adjacency, edge.target, edge.source, false);
		incomingCounts.set(edge.target, (incomingCounts.get(edge.target) ?? 0) + 1);
	}

	const components = findComponents(nodeIds, adjacency).map(
		(nodeIdsInComponent) =>
			buildForestComponent(
				nodeIdsInComponent,
				adjacency,
				incomingCounts,
				nodeOrder
			)
	);

	return { components, nodeSizes };
}

function addNeighbor(
	adjacency: Map<string, Neighbor[]>,
	sourceId: string,
	targetId: string,
	isOutgoing: boolean
): void {
	const neighbors = adjacency.get(sourceId);
	if (!neighbors) {
		return;
	}

	const existing = neighbors.find((neighbor) => neighbor.id === targetId);
	if (existing) {
		existing.isOutgoing ||= isOutgoing;
		return;
	}

	neighbors.push({ id: targetId, isOutgoing });
}

function findComponents(
	nodeIds: string[],
	adjacency: Map<string, Neighbor[]>
): string[][] {
	const visited = new Set<string>();
	const components: string[][] = [];

	for (const nodeId of nodeIds) {
		if (visited.has(nodeId)) {
			continue;
		}

		const component: string[] = [];
		const queue = [nodeId];
		visited.add(nodeId);

		for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
			const currentId = queue[queueIndex];
			if (!currentId) {
				continue;
			}

			component.push(currentId);
			for (const neighbor of adjacency.get(currentId) ?? []) {
				if (visited.has(neighbor.id)) {
					continue;
				}

				visited.add(neighbor.id);
				queue.push(neighbor.id);
			}
		}

		components.push(component);
	}

	return components;
}

function buildForestComponent(
	nodeIds: string[],
	adjacency: Map<string, Neighbor[]>,
	incomingCounts: Map<string, number>,
	nodeOrder: Map<string, number>
): ForestComponent {
	const rootId = pickRoot(nodeIds, adjacency, incomingCounts, nodeOrder);
	const children = new Map(nodeIds.map((nodeId) => [nodeId, [] as string[]]));
	const depths = new Map<string, number>([[rootId, 0]]);
	const traversal: string[] = [];
	const visited = new Set<string>([rootId]);
	const queue = [rootId];

	for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
		const currentId = queue[queueIndex];
		if (!currentId) {
			continue;
		}

		traversal.push(currentId);
		const neighbors = [...(adjacency.get(currentId) ?? [])]
			.filter((neighbor) => !visited.has(neighbor.id))
			.sort((first, second) =>
				compareNeighbors(first, second, adjacency, nodeOrder)
			);

		for (const neighbor of neighbors) {
			visited.add(neighbor.id);
			queue.push(neighbor.id);
			children.get(currentId)?.push(neighbor.id);
			depths.set(neighbor.id, (depths.get(currentId) ?? 0) + 1);
		}
	}

	const weights = new Map<string, number>(nodeIds.map((nodeId) => [nodeId, 1]));
	for (let index = traversal.length - 1; index >= 0; index -= 1) {
		const nodeId = traversal[index];
		if (!nodeId) {
			continue;
		}

		const weight = (children.get(nodeId) ?? []).reduce(
			(sum, childId) => sum + (weights.get(childId) ?? 1),
			1
		);
		weights.set(nodeId, weight);
	}

	return { nodeIds, rootId, children, depths, traversal, weights };
}

function pickRoot(
	nodeIds: string[],
	adjacency: Map<string, Neighbor[]>,
	incomingCounts: Map<string, number>,
	nodeOrder: Map<string, number>
): string {
	const rootCandidates = nodeIds.filter(
		(nodeId) => (incomingCounts.get(nodeId) ?? 0) === 0
	);
	const candidates = rootCandidates.length > 0 ? rootCandidates : nodeIds;

	return [...candidates].sort((first, second) => {
		const degreeDelta =
			(adjacency.get(second)?.length ?? 0) -
			(adjacency.get(first)?.length ?? 0);
		if (degreeDelta !== 0) {
			return degreeDelta;
		}

		return (nodeOrder.get(first) ?? 0) - (nodeOrder.get(second) ?? 0);
	})[0]!;
}

function compareNeighbors(
	first: Neighbor,
	second: Neighbor,
	adjacency: Map<string, Neighbor[]>,
	nodeOrder: Map<string, number>
): number {
	if (first.isOutgoing !== second.isOutgoing) {
		return first.isOutgoing ? -1 : 1;
	}

	const degreeDelta =
		(adjacency.get(second.id)?.length ?? 0) -
		(adjacency.get(first.id)?.length ?? 0);
	if (degreeDelta !== 0) {
		return degreeDelta;
	}

	return (nodeOrder.get(first.id) ?? 0) - (nodeOrder.get(second.id) ?? 0);
}

function layoutDirectionalComponent(
	component: ForestComponent,
	nodeSizes: Map<string, NodeSize>,
	config: LayoutConfig,
	direction: DirectionalTreeDirection
): ComponentLayout {
	const siblingSpacing = Math.max(config.nodeSpacing, 90);
	const layerSpacing = Math.max(config.layerSpacing, 150);
	const secondarySpans = new Map<string, number>();
	const maxPrimaryByDepth = new Map<number, number>();

	for (const nodeId of component.traversal) {
		const depth = component.depths.get(nodeId) ?? 0;
		const size = nodeSizes.get(nodeId) ?? getDefaultNodeSize();
		const primarySize = direction === 'RIGHT' ? size.width : size.height;
		maxPrimaryByDepth.set(
			depth,
			Math.max(maxPrimaryByDepth.get(depth) ?? 0, primarySize)
		);
	}

	for (let index = component.traversal.length - 1; index >= 0; index -= 1) {
		const nodeId = component.traversal[index];
		if (!nodeId) {
			continue;
		}

		const size = nodeSizes.get(nodeId) ?? getDefaultNodeSize();
		const ownSecondary = direction === 'RIGHT' ? size.height : size.width;
		const children = component.children.get(nodeId) ?? [];
		const childSpan = children.reduce(
			(sum, childId, childIndex) =>
				sum +
				(secondarySpans.get(childId) ?? ownSecondary) +
				(childIndex > 0 ? siblingSpacing : 0),
			0
		);
		secondarySpans.set(nodeId, Math.max(ownSecondary, childSpan));
	}

	const levelCenters = buildLevelCenters(maxPrimaryByDepth, layerSpacing);
	const positions = new Map<string, Point2D>();
	const stack: Array<{ nodeId: string; secondaryStart: number }> = [
		{ nodeId: component.rootId, secondaryStart: 0 },
	];

	while (stack.length > 0) {
		const current = stack.pop();
		if (!current) {
			continue;
		}

		const { nodeId, secondaryStart } = current;
		const size = nodeSizes.get(nodeId) ?? getDefaultNodeSize();
		const depth = component.depths.get(nodeId) ?? 0;
		const secondaryCenter =
			secondaryStart + (secondarySpans.get(nodeId) ?? 0) / 2;
		const primaryCenter = levelCenters.get(depth) ?? 0;
		positions.set(
			nodeId,
			direction === 'RIGHT'
				? {
						x: primaryCenter - size.width / 2,
						y: secondaryCenter - size.height / 2,
					}
				: {
						x: secondaryCenter - size.width / 2,
						y: primaryCenter - size.height / 2,
					}
		);

		const children = component.children.get(nodeId) ?? [];
		const childTotalSpan = children.reduce(
			(sum, childId, childIndex) =>
				sum +
				(secondarySpans.get(childId) ?? 0) +
				(childIndex > 0 ? siblingSpacing : 0),
			0
		);
		let childStart =
			secondaryStart + ((secondarySpans.get(nodeId) ?? 0) - childTotalSpan) / 2;
		const childPlacements = children.map((childId) => {
			const placement = { nodeId: childId, secondaryStart: childStart };
			childStart += (secondarySpans.get(childId) ?? 0) + siblingSpacing;
			return placement;
		});

		for (let index = childPlacements.length - 1; index >= 0; index -= 1) {
			const placement = childPlacements[index];
			if (placement) {
				stack.push(placement);
			}
		}
	}

	return {
		nodeIds: component.nodeIds,
		positions,
		bounds: calculateBounds(component.nodeIds, positions, nodeSizes),
	};
}

function buildLevelCenters(
	maxPrimaryByDepth: Map<number, number>,
	layerSpacing: number
): Map<number, number> {
	const maxDepth = Math.max(...maxPrimaryByDepth.keys(), 0);
	const centers = new Map<number, number>();
	let previousSize = 0;
	let center = 0;

	for (let depth = 0; depth <= maxDepth; depth += 1) {
		const size = maxPrimaryByDepth.get(depth) ?? 0;
		if (depth === 0) {
			center = size / 2;
		} else {
			center += previousSize / 2 + layerSpacing + size / 2;
		}
		centers.set(depth, center);
		previousSize = size;
	}

	return centers;
}

function layoutRadialComponent(
	component: ForestComponent,
	nodeSizes: Map<string, NodeSize>,
	config: LayoutConfig
): ComponentLayout {
	const centers = new Map<string, Point2D>([
		[component.rootId, { x: 0, y: 0 }],
	]);
	const queue: Array<{ nodeId: string; parentAngle: number; depth: number }> = [
		{ nodeId: component.rootId, parentAngle: -Math.PI / 2, depth: 0 },
	];

	for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
		const current = queue[queueIndex];
		if (!current) {
			continue;
		}

		const parentCenter = centers.get(current.nodeId);
		if (!parentCenter) {
			continue;
		}

		const children = component.children.get(current.nodeId) ?? [];
		if (children.length === 0) {
			continue;
		}

		const arc = getRadialArc(children.length, current.depth);
		const startAngle =
			current.depth === 0 ? -Math.PI / 2 : current.parentAngle - arc / 2;
		const radius = getRadialRadius(
			current.nodeId,
			children,
			nodeSizes,
			config,
			arc
		);
		const totalWeight = children.reduce(
			(sum, childId) => sum + (component.weights.get(childId) ?? 1),
			0
		);
		let cursorWeight = 0;

		for (const childId of children) {
			const childWeight = component.weights.get(childId) ?? 1;
			const angle =
				children.length === 1
					? current.parentAngle
					: startAngle +
						arc * ((cursorWeight + childWeight / 2) / Math.max(totalWeight, 1));
			centers.set(childId, {
				x: parentCenter.x + Math.cos(angle) * radius,
				y: parentCenter.y + Math.sin(angle) * radius,
			});
			queue.push({
				nodeId: childId,
				parentAngle: angle,
				depth: current.depth + 1,
			});
			cursorWeight += childWeight;
		}
	}

	const positions = new Map<string, Point2D>();
	for (const nodeId of component.nodeIds) {
		const center = centers.get(nodeId) ?? { x: 0, y: 0 };
		const size = nodeSizes.get(nodeId) ?? getDefaultNodeSize();
		positions.set(nodeId, {
			x: center.x - size.width / 2,
			y: center.y - size.height / 2,
		});
	}

	return {
		nodeIds: component.nodeIds,
		positions,
		bounds: calculateBounds(component.nodeIds, positions, nodeSizes),
	};
}

function layoutCompactComponent(
	component: ForestComponent,
	nodeSizes: Map<string, NodeSize>,
	config: LayoutConfig
): ComponentLayout {
	const maxWidth = Math.max(
		...component.nodeIds.map(
			(nodeId) => (nodeSizes.get(nodeId) ?? getDefaultNodeSize()).width
		)
	);
	const maxHeight = Math.max(
		...component.nodeIds.map(
			(nodeId) => (nodeSizes.get(nodeId) ?? getDefaultNodeSize()).height
		)
	);
	const spacing = Math.max(config.nodeSpacing, 80);
	const columns = Math.max(1, Math.ceil(Math.sqrt(component.traversal.length)));
	const positions = new Map<string, Point2D>();

	for (const [index, nodeId] of component.traversal.entries()) {
		const size = nodeSizes.get(nodeId) ?? getDefaultNodeSize();
		const column = index % columns;
		const row = Math.floor(index / columns);
		positions.set(nodeId, {
			x: column * (maxWidth + spacing) + (maxWidth - size.width) / 2,
			y: row * (maxHeight + spacing) + (maxHeight - size.height) / 2,
		});
	}

	return {
		nodeIds: component.nodeIds,
		positions,
		bounds: calculateBounds(component.nodeIds, positions, nodeSizes),
	};
}

function getRadialArc(childCount: number, depth: number): number {
	if (depth === 0) {
		return Math.PI * 2;
	}

	if (childCount >= 6) {
		return Math.PI * 1.85;
	}

	return Math.max(Math.PI / 2, Math.min(Math.PI * 1.2, childCount * 0.8));
}

function getRadialRadius(
	nodeId: string,
	children: string[],
	nodeSizes: Map<string, NodeSize>,
	config: LayoutConfig,
	arc: number
): number {
	const parentSize = nodeSizes.get(nodeId) ?? getDefaultNodeSize();
	const childSizes = children.map(
		(childId) => nodeSizes.get(childId) ?? getDefaultNodeSize()
	);
	const widestChild = Math.max(
		...childSizes.map((size) => Math.max(size.width, size.height)),
		DEFAULT_NODE_WIDTH
	);
	const averageChildSpan =
		childSizes.reduce(
			(sum, size) => sum + Math.max(size.width, size.height),
			0
		) / Math.max(childSizes.length, 1);
	const siblingSpacing = Math.max(config.nodeSpacing, 90);
	const circumferenceRadius =
		(children.length * (widestChild + siblingSpacing)) /
		Math.max(arc, Math.PI / 2);
	const separationRadius =
		Math.max(parentSize.width, parentSize.height) / 2 +
		averageChildSpan / 2 +
		Math.max(config.layerSpacing, 140);

	return Math.max(
		MIN_RADIAL_RADIUS,
		circumferenceRadius,
		separationRadius,
		config.layerSpacing * 2
	);
}

function createLayoutResult(
	nodes: AppNode[],
	edges: AppEdge[],
	positions: Map<string, Point2D>
): LayoutResult {
	const updatedNodes = nodes.map((node) => {
		const position = positions.get(node.id);
		if (!position) {
			return node;
		}

		return {
			...node,
			position,
			data: {
				...node.data,
				position_x: position.x,
				position_y: position.y,
			},
		};
	});

	return { nodes: updatedNodes, edges: normalizeExperimentalEdges(edges) };
}

function packComponents(
	componentLayouts: ComponentLayout[]
): Map<string, Point2D> {
	const sortedLayouts = [...componentLayouts].sort((first, second) => {
		const areaDelta =
			second.bounds.width * second.bounds.height -
			first.bounds.width * first.bounds.height;
		return areaDelta !== 0
			? areaDelta
			: first.nodeIds[0]!.localeCompare(second.nodeIds[0]!);
	});
	const totalArea = sortedLayouts.reduce(
		(sum, layout) => sum + layout.bounds.width * layout.bounds.height,
		0
	);
	const targetRowWidth = Math.max(1600, Math.sqrt(totalArea) * 1.35);
	const packedPositions = new Map<string, Point2D>();
	let cursorX = GRAPH_PADDING;
	let cursorY = GRAPH_PADDING;
	let rowHeight = 0;

	for (const layout of sortedLayouts) {
		if (
			cursorX > GRAPH_PADDING &&
			cursorX + layout.bounds.width > targetRowWidth
		) {
			cursorX = GRAPH_PADDING;
			cursorY += rowHeight + COMPONENT_SPACING;
			rowHeight = 0;
		}

		const offsetX = cursorX - layout.bounds.minX;
		const offsetY = cursorY - layout.bounds.minY;
		for (const nodeId of layout.nodeIds) {
			const position = layout.positions.get(nodeId);
			if (position) {
				packedPositions.set(nodeId, {
					x: position.x + offsetX,
					y: position.y + offsetY,
				});
			}
		}

		cursorX += layout.bounds.width + COMPONENT_SPACING;
		rowHeight = Math.max(rowHeight, layout.bounds.height);
	}

	return packedPositions;
}

function calculateBounds(
	nodeIds: string[],
	positions: Map<string, Point2D>,
	nodeSizes: Map<string, NodeSize>
): LayoutBounds {
	let minX = Number.POSITIVE_INFINITY;
	let minY = Number.POSITIVE_INFINITY;
	let maxX = Number.NEGATIVE_INFINITY;
	let maxY = Number.NEGATIVE_INFINITY;

	for (const nodeId of nodeIds) {
		const position = positions.get(nodeId);
		const size = nodeSizes.get(nodeId);
		if (!position || !size) {
			continue;
		}

		minX = Math.min(minX, position.x);
		minY = Math.min(minY, position.y);
		maxX = Math.max(maxX, position.x + size.width);
		maxY = Math.max(maxY, position.y + size.height);
	}

	if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
		return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
	}

	return {
		minX,
		minY,
		maxX,
		maxY,
		width: maxX - minX,
		height: maxY - minY,
	};
}

function getNodeSize(node: AppNode): NodeSize {
	return {
		width: node.measured?.width ?? node.width ?? DEFAULT_NODE_WIDTH,
		height: node.measured?.height ?? node.height ?? DEFAULT_NODE_HEIGHT,
	};
}

function getDefaultNodeSize(): NodeSize {
	return { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT };
}
