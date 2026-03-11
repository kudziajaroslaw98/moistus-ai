/**
 * ELK.js Web Worker Client
 * Manages ELK instance with Web Worker support for off-main-thread computation
 */

import type { ELK } from 'elkjs/lib/elk-api';
import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type {
	ElkLayoutParams,
	LayoutConfig,
	LayoutResult,
} from '@/types/layout-types';
import { convertFromElkGraph, convertToElkGraph } from './elk-converter';

// ELK instance singleton - reused across layout calls
let elkInstance: ELK | null = null;
let initPromise: Promise<ELK> | null = null;
const DEFAULT_LOCAL_LAYOUT_ALPHA = 0.35;

export interface LocalLayoutNeighborhood {
	movableNodeIds: Set<string>;
	anchorNodeIds: Set<string>;
}

export interface LocalLayoutParams {
	centerNodeId: string;
	radius?: number;
}

/**
 * Initialize ELK.js with Web Worker support
 * Uses singleton pattern to avoid recreating workers
 */
export async function initializeElk(): Promise<ELK> {
	// Return existing instance if available
	if (elkInstance) {
		return elkInstance;
	}

	// Return existing init promise if in progress (prevents race conditions)
	if (initPromise) {
		return initPromise;
	}

	// Create new initialization promise
	initPromise = (async () => {
		// Dynamic import to avoid SSR issues
		const ELK = (await import('elkjs/lib/elk-api')).default;

		elkInstance = new ELK({
			workerUrl: '/elk-worker.min.js',
		});

		return elkInstance;
	})();

	try {
		return await initPromise;
	} catch (error) {
		// Clear promise on failure so retry is possible
		initPromise = null;
		throw error;
	}
}

/**
 * Terminate the ELK Web Worker
 * Call this when cleaning up or if worker needs to be reset
 */
export function terminateElk(): void {
	if (elkInstance) {
		elkInstance.terminateWorker();
		elkInstance = null;
		initPromise = null;
	}
}

/**
 * Run ELK layout algorithm on the provided graph
 * This executes in a Web Worker to avoid blocking the main thread
 */
export async function runElkLayout(params: ElkLayoutParams): Promise<LayoutResult> {
	const {
		nodes,
		edges,
		config,
		selectedNodeIds,
		movableNodeIds,
		anchorNodeIds,
		collisionProtectedNodeIds,
		localLayoutAlpha,
	} = params;

	// Filter nodes/edges if selectedNodeIds provided
	const nodesToLayout = selectedNodeIds
		? filterSelectedSubgraph(nodes, edges, selectedNodeIds)
		: movableNodeIds && movableNodeIds.size > 0
			? filterLocalSubgraph(nodes, edges, movableNodeIds, anchorNodeIds)
			: { nodes, edges };

	// Skip layout if no nodes
	if (nodesToLayout.nodes.length === 0) {
		return { nodes, edges };
	}

	// Initialize ELK
	const elk = await initializeElk();

	// Convert to ELK format
	const elkGraph = convertToElkGraph(nodesToLayout.nodes, nodesToLayout.edges, config);

	try {
		// Run layout in Web Worker
		const layoutedGraph = await elk.layout(elkGraph);

		// Convert back to React Flow format
		const result = convertFromElkGraph(
			layoutedGraph,
			nodesToLayout.nodes,
			nodesToLayout.edges,
			config
		);

		// If we only laid out selected nodes, merge with unchanged nodes
		if (selectedNodeIds) {
			return mergeLayoutResult(nodes, edges, result, selectedNodeIds, config);
		}

		// If we only laid out a local node neighborhood, merge only affected nodes/edges.
		if (movableNodeIds && movableNodeIds.size > 0) {
			return mergeLocalLayoutResult(
				nodes,
				edges,
				result,
				movableNodeIds,
				anchorNodeIds,
				localLayoutAlpha,
				config,
				collisionProtectedNodeIds
			);
		}

		return result;
	} catch (error) {
		// Handle specific ELK errors
		if (error instanceof Error) {
			if (error.message.includes('timeout')) {
				throw new Error('Layout computation timed out. Try with fewer nodes.');
			}
			if (error.message.includes('Worker')) {
				// Worker crashed - reset instance for next attempt
				terminateElk();
				throw new Error('Layout worker crashed. Please try again.');
			}
		}
		throw error;
	}
}

/**
 * Filter to only selected nodes and edges between them
 */
function filterSelectedSubgraph(
	nodes: AppNode[],
	edges: AppEdge[],
	selectedNodeIds: Set<string>
): { nodes: AppNode[]; edges: AppEdge[] } {
	const selectedNodes = nodes.filter((n) => selectedNodeIds.has(n.id));
	const selectedEdges = edges.filter(
		(e) => selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target)
	);

	return { nodes: selectedNodes, edges: selectedEdges };
}

/**
 * Build local graph around a center node with radius-based movable nodes
 * and boundary nodes marked as anchors.
 */
export function buildLocalLayoutNeighborhood(
	nodes: AppNode[],
	edges: AppEdge[],
	params: LocalLayoutParams
): LocalLayoutNeighborhood {
	const { centerNodeId } = params;
	const requestedRadius = params.radius ?? 1;
	const normalizedRadius =
		Number.isFinite(requestedRadius) && requestedRadius >= 0
			? Math.floor(requestedRadius)
			: 1;

	const movableNodeIds = new Set<string>();
	const anchorNodeIds = new Set<string>();

	const centerExists = nodes.some((node) => node.id === centerNodeId);
	if (!centerExists) {
		return { movableNodeIds, anchorNodeIds };
	}

	const adjacency = new Map<string, string[]>();
	for (const edge of edges) {
		const sourceNeighbors = adjacency.get(edge.source) ?? [];
		sourceNeighbors.push(edge.target);
		adjacency.set(edge.source, sourceNeighbors);

		const targetNeighbors = adjacency.get(edge.target) ?? [];
		targetNeighbors.push(edge.source);
		adjacency.set(edge.target, targetNeighbors);
	}

	const queue: Array<{ nodeId: string; distance: number }> = [
		{ nodeId: centerNodeId, distance: 0 },
	];
	const visited = new Map<string, number>([[centerNodeId, 0]]);

	while (queue.length > 0) {
		const current = queue.shift();
		if (!current) {
			break;
		}

		const { nodeId, distance } = current;
		if (distance <= normalizedRadius) {
			movableNodeIds.add(nodeId);
		}

		if (distance > normalizedRadius) {
			continue;
		}

		const neighbors = adjacency.get(nodeId) ?? [];
		for (const neighborId of neighbors) {
			const knownDistance = visited.get(neighborId);
			if (knownDistance !== undefined) {
				continue;
			}

			if (distance < normalizedRadius) {
				visited.set(neighborId, distance + 1);
				queue.push({ nodeId: neighborId, distance: distance + 1 });
			} else {
				anchorNodeIds.add(neighborId);
			}
		}
	}

	return { movableNodeIds, anchorNodeIds };
}

/**
 * Filter nodes and edges for local layout.
 */
function filterLocalSubgraph(
	nodes: AppNode[],
	edges: AppEdge[],
	movableNodeIds: Set<string>,
	anchorNodeIds?: Set<string>
): { nodes: AppNode[]; edges: AppEdge[] } {
	const allowedNodeIds = new Set([
		...movableNodeIds,
		...(anchorNodeIds ?? new Set<string>()),
	]);

	const localNodes = nodes.filter((node) => allowedNodeIds.has(node.id));
	const localEdges = edges.filter(
		(edge) => allowedNodeIds.has(edge.source) && allowedNodeIds.has(edge.target)
	);

	return { nodes: localNodes, edges: localEdges };
}

/**
 * Merge layout results for selected-only layout back into full graph
 * Preserves positions of unselected nodes while updating selected ones
 */
export function mergeLayoutResult(
	allNodes: AppNode[],
	allEdges: AppEdge[],
	layoutResult: LayoutResult,
	selectedNodeIds: Set<string>,
	config: LayoutConfig
): LayoutResult {
	// Calculate bounding box of original selected nodes
	const originalBounds = calculateBoundingBox(
		allNodes.filter((n) => selectedNodeIds.has(n.id))
	);

	// Calculate bounding box of layouted nodes
	const layoutedBounds = calculateBoundingBox(layoutResult.nodes);

	// Calculate offset to preserve original center position
	const offsetX = originalBounds.centerX - layoutedBounds.centerX;
	const offsetY = originalBounds.centerY - layoutedBounds.centerY;

	// Create map of layouted positions with offset
	const positionMap = new Map<string, { x: number; y: number }>();
	for (const node of layoutResult.nodes) {
		positionMap.set(node.id, {
			x: node.position.x + offsetX,
			y: node.position.y + offsetY,
		});
	}

	// Create map of layouted edge data
	const edgeDataMap = new Map<string, AppEdge>();
	for (const edge of layoutResult.edges) {
		edgeDataMap.set(edge.id, edge);
	}

	// Merge nodes - use layouted positions for selected, keep original for others
	const mergedNodes = allNodes.map((node) => {
		const newPosition = positionMap.get(node.id);
		if (!newPosition) return node;

		return {
			...node,
			position: newPosition,
			data: {
				...node.data,
				position_x: newPosition.x,
				position_y: newPosition.y,
			},
		};
	});

	// Merge edges - update waypoints for edges between selected nodes
	const mergedEdges: AppEdge[] = allEdges.map((edge) => {
		const layoutedEdge = edgeDataMap.get(edge.id);
		if (!layoutedEdge) return edge;

		// Early return if edge data is missing - preserve original edge
		const edgeData = edge.data;
		const layoutedEdgeData = layoutedEdge.data;
		if (!edgeData || !layoutedEdgeData) return edge;

		// Offset waypoints to match node offset (only if waypoints exist)
		const layoutedWaypoints = layoutedEdgeData.metadata?.waypoints;
		const waypoints = layoutedWaypoints?.map((wp) => ({
			...wp,
			x: wp.x + offsetX,
			y: wp.y + offsetY,
		}));

		return {
			...edge,
			type: layoutedEdge.type,
			data: {
				...edgeData,
				metadata: {
					...(edgeData.metadata ?? {}),
					...(layoutedEdgeData.metadata ?? {}),
					...(waypoints && { waypoints }),
				},
			},
		} as AppEdge;
	});

	return { nodes: mergedNodes, edges: mergedEdges };
}

/**
 * Merge layout result from a local neighborhood layout back into full graph.
 *
 * Anchors are kept fixed, while movable nodes are moved using smoothing.
 */
export function mergeLocalLayoutResult(
	allNodes: AppNode[],
	allEdges: AppEdge[],
	layoutResult: LayoutResult,
	movableNodeIds: Set<string>,
	anchorNodeIds?: Set<string>,
	alpha?: number,
	config?: LayoutConfig,
	collisionProtectedNodeIds?: Set<string>
): LayoutResult {
	const effectiveAlpha = localLayoutAlphaIsValid(alpha)
		? alpha
		: DEFAULT_LOCAL_LAYOUT_ALPHA;
	const effectiveConfig: LayoutConfig = config ?? {
		direction: 'TOP_BOTTOM',
		nodeSpacing: 50,
		layerSpacing: 100,
		animateTransition: true,
	};

	const anchorSet = anchorNodeIds ?? new Set<string>();
	const collisionProtectedSet = new Set<string>();
	for (const id of collisionProtectedNodeIds ?? []) {
		if (!anchorSet.has(id)) {
			collisionProtectedSet.add(id);
		}
	}

	const currentPositions = new Map<string, { x: number; y: number }>();
	const prevPositions = new Map<string, { x: number; y: number }>();
	for (const node of allNodes) {
		currentPositions.set(node.id, {
			x: node.position.x,
			y: node.position.y,
		});

		if (movableNodeIds.has(node.id) || anchorSet.has(node.id)) {
			prevPositions.set(node.id, {
				x: node.position.x,
				y: node.position.y,
			});
		}
	}

	const proposedPositions = new Map<string, { x: number; y: number }>();
	for (const node of layoutResult.nodes) {
		proposedPositions.set(node.id, {
			x: node.position.x,
			y: node.position.y,
		});
	}

	const anchorAdjustment = calculateAnchorAdjustment(prevPositions, proposedPositions, anchorSet);

	const normalize = (position: { x: number; y: number }) => ({
		x: position.x + anchorAdjustment.offsetX,
		y: position.y + anchorAdjustment.offsetY,
	});

	const getAlignedPosition = (
		nodeId: string
	): { x: number; y: number } | undefined => {
		const proposed = proposedPositions.get(nodeId);
		if (proposed) {
			return normalize(proposed);
		}
		return currentPositions.get(nodeId);
	};

	const smoothedPositions = new Map<string, { x: number; y: number }>();
	for (const [id, proposed] of proposedPositions.entries()) {
		if (!movableNodeIds.has(id) && !anchorSet.has(id)) {
			continue;
		}

		const previous = prevPositions.get(id);
		if (!previous) {
			smoothedPositions.set(id, normalize(proposed));
			continue;
		}

		if (anchorSet.has(id)) {
			smoothedPositions.set(id, {
				x: previous.x,
				y: previous.y,
			});
			continue;
		}

		const aligned = normalize(proposed);
		smoothedPositions.set(id, {
			x: previous.x + (aligned.x - previous.x) * effectiveAlpha,
			y: previous.y + (aligned.y - previous.y) * effectiveAlpha,
		});
	}

	const { resolvedPositions } = resolveLocalCollisions(
		allNodes,
		smoothedPositions,
		collisionProtectedSet,
		effectiveConfig
	);

	const getFinalPosition = (nodeId: string): { x: number; y: number } | undefined =>
		resolvedPositions.get(nodeId) ?? currentPositions.get(nodeId);

	const getNodeDelta = (nodeId: string): { x: number; y: number } => {
		const aligned = getAlignedPosition(nodeId);
		const final = getFinalPosition(nodeId);
		if (!aligned || !final) {
			return { x: 0, y: 0 };
		}

		return {
			x: final.x - aligned.x,
			y: final.y - aligned.y,
		};
	};

	const mergedNodes = allNodes.map((node) => {
		const newPosition = resolvedPositions.get(node.id);
		if (!newPosition) return node;

		return {
			...node,
			position: newPosition,
			data: {
				...node.data,
				position_x: newPosition.x,
				position_y: newPosition.y,
			},
		};
	});

	const layoutedEdgeMap = new Map<string, AppEdge>();
	for (const edge of layoutResult.edges) {
		layoutedEdgeMap.set(edge.id, edge);
	}

	const mergedEdges: AppEdge[] = allEdges.map((edge) => {
		const shouldUpdateEdge =
			movableNodeIds.has(edge.source) ||
			movableNodeIds.has(edge.target) ||
			anchorSet.has(edge.source) ||
			anchorSet.has(edge.target);
		if (!shouldUpdateEdge) {
			return edge;
		}

		const layoutedEdge = layoutedEdgeMap.get(edge.id);
		if (!layoutedEdge) {
			return edge;
		}

		const edgeData = edge.data;
		const layoutedEdgeData = layoutedEdge.data;
		if (!edgeData || !layoutedEdgeData) return edge;

		const existingMetadata = edgeData.metadata ?? {};
		const isWaypointEdge =
			edge.type === 'waypointEdge' || existingMetadata.pathType === 'waypoint';

		// Local layout should not silently switch standard edges to waypoint routing.
		if (!isWaypointEdge) {
			return edge;
		}

		const sourceDelta = getNodeDelta(edge.source);
		const targetDelta = getNodeDelta(edge.target);
		const waypointOffsetX = (sourceDelta.x + targetDelta.x) / 2;
		const waypointOffsetY = (sourceDelta.y + targetDelta.y) / 2;

		const transformedWaypoints = layoutedEdgeData.metadata?.waypoints?.map((wp) => ({
			...wp,
			x: wp.x + waypointOffsetX,
			y: wp.y + waypointOffsetY,
		}));

		return {
			...edge,
			type: 'waypointEdge',
			data: {
				...edgeData,
				metadata: {
					...existingMetadata,
					pathType: 'waypoint',
					curveType:
						layoutedEdgeData.metadata?.curveType ?? existingMetadata.curveType,
					sourceAnchor: undefined,
					targetAnchor: undefined,
					...(transformedWaypoints && { waypoints: transformedWaypoints }),
				},
			},
		} as AppEdge;
	});

	return { nodes: mergedNodes, edges: mergedEdges };
}

function resolveLocalCollisions(
	allNodes: AppNode[],
	finalPositions: Map<string, { x: number; y: number }>,
	collisionProtectedNodeIds: Set<string>,
	config: LayoutConfig
): { resolvedPositions: Map<string, { x: number; y: number }> } {
	if (collisionProtectedNodeIds.size === 0) {
		return { resolvedPositions: finalPositions };
	}

	const nodeById = new Map(allNodes.map((node) => [node.id, node]));
	const staticObstacleNodes = allNodes.filter(
		(node) => !collisionProtectedNodeIds.has(node.id)
	);

	const axis = getPrimaryAxis(config.direction);
	const padding = Math.max(24, config.nodeSpacing * 0.6);

	let requiredShiftMagnitude = 0;

	for (const protectedNodeId of collisionProtectedNodeIds) {
		const protectedNode = nodeById.get(protectedNodeId);
		if (!protectedNode) continue;

		const protectedPosition =
			finalPositions.get(protectedNodeId) ?? protectedNode.position;
		const protectedRect = getNodeRect(protectedNode, protectedPosition);

		for (const obstacleNode of staticObstacleNodes) {
			const obstaclePosition =
				finalPositions.get(obstacleNode.id) ?? obstacleNode.position;
			const obstacleRect = getNodeRect(obstacleNode, obstaclePosition);

			if (!rectanglesOverlapWithPadding(protectedRect, obstacleRect, padding)) {
				continue;
			}

			const requiredShift = getRequiredAxisShift(
				protectedRect,
				obstacleRect,
				axis,
				padding
			);
			requiredShiftMagnitude = Math.max(requiredShiftMagnitude, requiredShift);
		}
	}

	if (requiredShiftMagnitude <= 0) {
		return { resolvedPositions: finalPositions };
	}

	const shiftX = axis.axis === 'x' ? axis.sign * requiredShiftMagnitude : 0;
	const shiftY = axis.axis === 'y' ? axis.sign * requiredShiftMagnitude : 0;

	const resolvedPositions = new Map(finalPositions);
	for (const protectedNodeId of collisionProtectedNodeIds) {
		const protectedNode = nodeById.get(protectedNodeId);
		if (!protectedNode) continue;

		const currentPosition =
			resolvedPositions.get(protectedNodeId) ?? protectedNode.position;
		resolvedPositions.set(protectedNodeId, {
			x: currentPosition.x + shiftX,
			y: currentPosition.y + shiftY,
		});
	}

	return { resolvedPositions };
}

function getPrimaryAxis(direction: LayoutConfig['direction']): {
	axis: 'x' | 'y';
	sign: 1 | -1;
} {
	switch (direction) {
		case 'LEFT_RIGHT':
			return { axis: 'x', sign: 1 };
		case 'TOP_BOTTOM':
		default:
			return { axis: 'y', sign: 1 };
	}
}

function getRequiredAxisShift(
	movable: { left: number; right: number; top: number; bottom: number },
	obstacle: { left: number; right: number; top: number; bottom: number },
	axis: { axis: 'x' | 'y'; sign: 1 | -1 },
	padding: number
): number {
	if (axis.axis === 'x') {
		if (axis.sign > 0) {
			return obstacle.right + padding - movable.left;
		}
		return movable.right - (obstacle.left - padding);
	}

	if (axis.sign > 0) {
		return obstacle.bottom + padding - movable.top;
	}
	return movable.bottom - (obstacle.top - padding);
}

function rectanglesOverlapWithPadding(
	a: { left: number; right: number; top: number; bottom: number },
	b: { left: number; right: number; top: number; bottom: number },
	padding: number
): boolean {
	return (
		a.left < b.right + padding &&
		a.right > b.left - padding &&
		a.top < b.bottom + padding &&
		a.bottom > b.top - padding
	);
}

function getNodeRect(
	node: AppNode,
	position: { x: number; y: number }
): { left: number; right: number; top: number; bottom: number } {
	const width = node.measured?.width ?? node.width ?? 320;
	const height = node.measured?.height ?? node.height ?? 80;

	return {
		left: position.x,
		right: position.x + width,
		top: position.y,
		bottom: position.y + height,
	};
}

function localLayoutAlphaIsValid(alpha?: number): alpha is number {
	return typeof alpha === 'number' && Number.isFinite(alpha) && alpha >= 0 && alpha <= 1;
}

function calculateAnchorAdjustment(
	prevPositions: Map<string, { x: number; y: number }>,
	proposedPositions: Map<string, { x: number; y: number }>,
	anchorSet: Set<string>
): { offsetX: number; offsetY: number } {
	let totalOffsetX = 0;
	let totalOffsetY = 0;
	let sampleCount = 0;

	for (const anchorId of anchorSet) {
		const prev = prevPositions.get(anchorId);
		const proposed = proposedPositions.get(anchorId);
		if (!prev || !proposed) continue;

		totalOffsetX += prev.x - proposed.x;
		totalOffsetY += prev.y - proposed.y;
		sampleCount += 1;
	}

	if (sampleCount === 0) {
		return { offsetX: 0, offsetY: 0 };
	}

	return {
		offsetX: totalOffsetX / sampleCount,
		offsetY: totalOffsetY / sampleCount,
	};
}

/**
 * Calculate bounding box of a set of nodes
 */
function calculateBoundingBox(nodes: AppNode[]): {
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
	centerX: number;
	centerY: number;
} {
	if (nodes.length === 0) {
		return { minX: 0, maxX: 0, minY: 0, maxY: 0, centerX: 0, centerY: 0 };
	}

	let minX = Infinity;
	let maxX = -Infinity;
	let minY = Infinity;
	let maxY = -Infinity;

	for (const node of nodes) {
		const x = node.position.x;
		const y = node.position.y;
		const width = node.measured?.width ?? node.width ?? 320;
		const height = node.measured?.height ?? node.height ?? 80;

		minX = Math.min(minX, x);
		maxX = Math.max(maxX, x + width);
		minY = Math.min(minY, y);
		maxY = Math.max(maxY, y + height);
	}

	return {
		minX,
		maxX,
		minY,
		maxY,
		centerX: (minX + maxX) / 2,
		centerY: (minY + maxY) / 2,
	};
}
