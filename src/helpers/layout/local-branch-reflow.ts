import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type { LayoutConfig, LayoutResult } from '@/types/layout-types';
import type { Waypoint } from '@/types/path-types';

const FALLBACK_NODE_WIDTH = 320;
const FALLBACK_NODE_HEIGHT = 80;
const DELTA_EPSILON = 0.01;

type AxisKey = 'x' | 'y';

interface DirectionBehavior {
	laneAxis: AxisKey;
	siblingAxis: AxisKey;
}

interface Bounds {
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
	width: number;
	height: number;
	centerX: number;
	centerY: number;
}

interface Delta {
	x: number;
	y: number;
}

interface LocalBranchReflowParams {
	changedNodeId: string;
	nodes: AppNode[];
	edges: AppEdge[];
	config: LayoutConfig;
}

interface GraphIndex {
	nodeById: Map<string, AppNode>;
	outgoing: Map<string, string[]>;
}

/**
 * Result contract for deterministic local branch reflow helpers.
 *
 * Assumptions:
 * - Inputs are existing canvas `AppNode` / `AppEdge` records using parent-child
 *   relationships encoded as `edge.source -> edge.target`.
 * - The helpers only reposition existing nodes and translate existing waypoint
 *   metadata; they do not create or delete graph records.
 *
 * Result semantics:
 * - `affectedNodeIds` includes only pre-existing node ids whose position changed.
 * - `affectedEdgeIds` includes only pre-existing waypoint-edge ids whose
 *   waypoint arrays were translated to match a subtree move.
 * - Callers are responsible for persisting the returned `nodes` / `edges` and
 *   any follow-up rerouting or realtime side effects.
 */
export interface LocalBranchReflowResult extends LayoutResult {
	affectedNodeIds: Set<string>;
	affectedEdgeIds: Set<string>;
}

/**
 * Reflows a newly created branch without moving the edited branch's ancestors.
 *
 * Guarantees:
 * - Keeps the changed branch anchored to its intended lane.
 * - Re-packs same-depth siblings inside the local branch.
 * - Expands cousin-branch corridors outward when the grown branch would collide
 *   with neighboring subtrees.
 * - Returns only in-memory graph changes; callers must persist and broadcast.
 */
export function applyLocalCreateBranchReflow({
	changedNodeId,
	nodes,
	edges,
	config,
}: LocalBranchReflowParams): LocalBranchReflowResult {
	const graph = buildGraphIndex(nodes, edges);
	const parentId = getPrimaryParentId(changedNodeId, edges);
	const changedNode = graph.nodeById.get(changedNodeId);
	if (!changedNode) {
		return createNoopResult(nodes, edges);
	}
	const growthRootId = parentId ?? changedNodeId;
	const nodeDeltaById = new Map<string, Delta>();

	if (!parentId) {
		return finalizeLocalBranchReflow({
			growthRootId,
			nodes,
			edges,
			config,
			graph,
			nodeDeltaById,
		});
	}

	const parentNode = graph.nodeById.get(parentId);
	if (!parentNode) {
		return createNoopResult(nodes, edges);
	}

	const siblingIds = [...(graph.outgoing.get(parentId) ?? [])].filter(
		(nodeId) => graph.nodeById.has(nodeId)
	);
	if (!siblingIds.includes(changedNodeId)) {
		return createNoopResult(nodes, edges);
	}

	const behavior = getDirectionBehavior(config);
	const orderedSiblingIds = [...siblingIds].sort((leftId, rightId) =>
		compareBySiblingAxis(
			getNodeBounds(graph.nodeById.get(leftId)!),
			getNodeBounds(graph.nodeById.get(rightId)!),
			behavior.siblingAxis
		)
	);

	const existingSiblingIds = orderedSiblingIds.filter(
		(nodeId) => nodeId !== changedNodeId
	);
	const changedNodeBounds = getNodeBounds(changedNode);
	const changedSubtreeNodeIds = collectSubtreeNodeIds(
		changedNodeId,
		graph.outgoing
	);
	const changedSubtreeBounds = getSubtreeBounds(
		changedSubtreeNodeIds,
		graph.nodeById
	);
	const gap = getLocalGap(config);

	if (existingSiblingIds.length === 0) {
		const parentBounds = getNodeBounds(parentNode);
		const targetLaneStart =
			getAxisMax(parentBounds, behavior.laneAxis) + config.layerSpacing;
		const targetSiblingStart =
			getAxisCenter(parentBounds, behavior.siblingAxis) -
			getAxisSize(changedNodeBounds, behavior.siblingAxis) / 2;
		const delta = buildDelta(
			behavior,
			targetLaneStart - getAxisMin(changedNodeBounds, behavior.laneAxis),
			targetSiblingStart - getAxisMin(changedNodeBounds, behavior.siblingAxis)
		);

		for (const localNodeId of changedSubtreeNodeIds) {
			nodeDeltaById.set(localNodeId, delta);
		}

		return finalizeLocalBranchReflow({
			growthRootId,
			nodes,
			edges,
			config,
			graph,
			nodeDeltaById,
		});
	}

	const referenceSibling = graph.nodeById.get(existingSiblingIds[0]);
	const lastSiblingId = existingSiblingIds[existingSiblingIds.length - 1];
	if (!referenceSibling || !lastSiblingId) {
		return createNoopResult(nodes, edges);
	}

	const referenceSiblingBounds = getNodeBounds(referenceSibling);
	const lastSiblingSubtreeBounds = getSubtreeBounds(
		collectSubtreeNodeIds(lastSiblingId, graph.outgoing),
		graph.nodeById
	);
	const targetLaneStart = getAxisMin(referenceSiblingBounds, behavior.laneAxis);
	const targetSiblingStart =
		getAxisMax(lastSiblingSubtreeBounds, behavior.siblingAxis) + gap;

	const delta = buildDelta(
		behavior,
		targetLaneStart - getAxisMin(changedNodeBounds, behavior.laneAxis),
		targetSiblingStart - getAxisMin(changedSubtreeBounds, behavior.siblingAxis)
	);

	for (const localNodeId of changedSubtreeNodeIds) {
		nodeDeltaById.set(localNodeId, delta);
	}

	return finalizeLocalBranchReflow({
		growthRootId,
		nodes,
		edges,
		config,
		graph,
		nodeDeltaById,
	});
}

/**
 * Reflows an edited branch after node size/content changes grow the subtree.
 *
 * Guarantees:
 * - Preserves the edited branch root's anchor position.
 * - Pushes only later sibling subtrees on the affected carrier axis.
 * - Translates internal waypoint edges when an entire subtree moves together.
 * - Returns only the computed graph delta; callers must persist and broadcast.
 */
export function applyLocalEditBranchReflow({
	changedNodeId,
	nodes,
	edges,
	config,
}: LocalBranchReflowParams): LocalBranchReflowResult {
	const graph = buildGraphIndex(nodes, edges);
	const parentId = getPrimaryParentId(changedNodeId, edges);
	const growthRootId = parentId ?? changedNodeId;
	const nodeDeltaById = new Map<string, Delta>();

	if (parentId) {
		const siblingIds = [...(graph.outgoing.get(parentId) ?? [])].filter(
			(nodeId) => graph.nodeById.has(nodeId)
		);

		if (siblingIds.length >= 2 && siblingIds.includes(changedNodeId)) {
			const behavior = getDirectionBehavior(config);
			const orderedSiblingIds = [...siblingIds].sort((leftId, rightId) =>
				compareBySiblingAxis(
					getNodeBounds(graph.nodeById.get(leftId)!),
					getNodeBounds(graph.nodeById.get(rightId)!),
					behavior.siblingAxis
				)
			);
			const changedIndex = orderedSiblingIds.indexOf(changedNodeId);

			if (changedIndex !== -1 && changedIndex < orderedSiblingIds.length - 1) {
				const subtreeNodeIdsByRoot = new Map<string, Set<string>>();
				const subtreeBoundsByRoot = new Map<string, Bounds>();
				for (const siblingId of orderedSiblingIds) {
					const subtreeNodeIds = collectSubtreeNodeIds(
						siblingId,
						graph.outgoing
					);
					subtreeNodeIdsByRoot.set(siblingId, subtreeNodeIds);
					subtreeBoundsByRoot.set(
						siblingId,
						getSubtreeBounds(subtreeNodeIds, graph.nodeById)
					);
				}

				const changedSubtreeBounds = subtreeBoundsByRoot.get(changedNodeId);
				if (changedSubtreeBounds) {
					const gap = getLocalGap(config);
					let siblingCursor =
						getAxisMax(changedSubtreeBounds, behavior.siblingAxis) + gap;

					for (const siblingId of orderedSiblingIds.slice(changedIndex + 1)) {
						const subtreeBounds = subtreeBoundsByRoot.get(siblingId);
						const subtreeNodeIds = subtreeNodeIdsByRoot.get(siblingId);
						if (!subtreeBounds || !subtreeNodeIds) {
							continue;
						}

						const deltaAlongSiblingAxis = Math.max(
							0,
							siblingCursor - getAxisMin(subtreeBounds, behavior.siblingAxis)
						);
						if (deltaAlongSiblingAxis <= DELTA_EPSILON) {
							siblingCursor =
								getAxisMax(subtreeBounds, behavior.siblingAxis) + gap;
							continue;
						}

						const delta = buildDelta(behavior, 0, deltaAlongSiblingAxis);
						for (const nodeId of subtreeNodeIds) {
							nodeDeltaById.set(nodeId, delta);
						}

						siblingCursor =
							getAxisMax(subtreeBounds, behavior.siblingAxis) +
							deltaAlongSiblingAxis +
							gap;
					}
				}
			}
		}
	}

	return finalizeLocalBranchReflow({
		growthRootId,
		nodes,
		edges,
		config,
		graph,
		nodeDeltaById,
	});
}

function buildGraphIndex(nodes: AppNode[], edges: AppEdge[]): GraphIndex {
	const nodeById = new Map(nodes.map((node) => [node.id, node]));
	const outgoing = new Map<string, string[]>();

	for (const edge of edges) {
		const nextIds = outgoing.get(edge.source) ?? [];
		nextIds.push(edge.target);
		outgoing.set(edge.source, nextIds);
	}

	return { nodeById, outgoing };
}

function finalizeLocalBranchReflow({
	growthRootId,
	nodes,
	edges,
	config,
	graph,
	nodeDeltaById,
}: {
	growthRootId: string;
	nodes: AppNode[];
	edges: AppEdge[];
	config: LayoutConfig;
	graph: GraphIndex;
	nodeDeltaById: Map<string, Delta>;
}): LocalBranchReflowResult {
	const initialResult = applyBranchReflow(nodes, edges, nodeDeltaById);
	const corridorResult = applyCarrierCorridorExpansion({
		growthRootId,
		nodes: initialResult.nodes,
		edges: initialResult.edges,
		config,
		graph,
	});

	return {
		nodes: corridorResult.nodes,
		edges: corridorResult.edges,
		affectedNodeIds: new Set([
			...initialResult.affectedNodeIds,
			...corridorResult.affectedNodeIds,
		]),
		affectedEdgeIds: new Set([
			...initialResult.affectedEdgeIds,
			...corridorResult.affectedEdgeIds,
		]),
	};
}

function getPrimaryParentId(nodeId: string, edges: AppEdge[]): string | null {
	const parentEdge = edges.find((edge) => edge.target === nodeId);
	return parentEdge?.source ?? null;
}

function collectSubtreeNodeIds(
	rootId: string,
	outgoing: Map<string, string[]>
): Set<string> {
	const visited = new Set<string>();
	const queue = [rootId];

	while (queue.length > 0) {
		const currentId = queue.shift();
		if (!currentId || visited.has(currentId)) {
			continue;
		}

		visited.add(currentId);
		for (const nextId of outgoing.get(currentId) ?? []) {
			if (!visited.has(nextId)) {
				queue.push(nextId);
			}
		}
	}

	return visited;
}

function getNodeBounds(node: AppNode): Bounds {
	const width =
		node.measured?.width ??
		node.width ??
		node.data.width ??
		FALLBACK_NODE_WIDTH;
	const height =
		node.measured?.height ??
		node.height ??
		node.data.height ??
		FALLBACK_NODE_HEIGHT;
	const minX = node.position.x;
	const minY = node.position.y;
	const maxX = minX + width;
	const maxY = minY + height;

	return {
		minX,
		maxX,
		minY,
		maxY,
		width,
		height,
		centerX: minX + width / 2,
		centerY: minY + height / 2,
	};
}

function getSubtreeBounds(
	nodeIds: Set<string>,
	nodeById: Map<string, AppNode>,
	nodeDeltaById?: Map<string, Delta>
): Bounds {
	let minX = Number.POSITIVE_INFINITY;
	let minY = Number.POSITIVE_INFINITY;
	let maxX = Number.NEGATIVE_INFINITY;
	let maxY = Number.NEGATIVE_INFINITY;

	for (const nodeId of nodeIds) {
		const node = nodeById.get(nodeId);
		if (!node) {
			continue;
		}

		const delta = nodeDeltaById?.get(nodeId);
		const bounds = delta
			? translateBounds(getNodeBounds(node), delta)
			: getNodeBounds(node);
		minX = Math.min(minX, bounds.minX);
		minY = Math.min(minY, bounds.minY);
		maxX = Math.max(maxX, bounds.maxX);
		maxY = Math.max(maxY, bounds.maxY);
	}

	return {
		minX,
		minY,
		maxX,
		maxY,
		width: maxX - minX,
		height: maxY - minY,
		centerX: minX + (maxX - minX) / 2,
		centerY: minY + (maxY - minY) / 2,
	};
}

function getDirectionBehavior(config: LayoutConfig): DirectionBehavior {
	if (config.direction === 'LEFT_RIGHT') {
		return {
			laneAxis: 'x',
			siblingAxis: 'y',
		};
	}

	return {
		laneAxis: 'y',
		siblingAxis: 'x',
	};
}

function compareBySiblingAxis(
	leftBounds: Bounds,
	rightBounds: Bounds,
	siblingAxis: AxisKey
): number {
	return (
		getAxisCenter(leftBounds, siblingAxis) -
		getAxisCenter(rightBounds, siblingAxis)
	);
}

function getLocalGap(config: LayoutConfig): number {
	return Math.max(24, config.layerSpacing * 0.6);
}

function getCorridorClearance(config: LayoutConfig): number {
	return Math.max(24, config.nodeSpacing);
}

function buildDelta(
	behavior: DirectionBehavior,
	laneDelta: number,
	siblingDelta: number
): Delta {
	return behavior.laneAxis === 'x'
		? { x: laneDelta, y: siblingDelta }
		: { x: siblingDelta, y: laneDelta };
}

function applyCarrierCorridorExpansion({
	growthRootId,
	nodes,
	edges,
	config,
	graph,
}: {
	growthRootId: string;
	nodes: AppNode[];
	edges: AppEdge[];
	config: LayoutConfig;
	graph: GraphIndex;
}): LocalBranchReflowResult {
	const nodeById = new Map(nodes.map((node) => [node.id, node]));
	const behavior = getDirectionBehavior(config);
	const clearance = getCorridorClearance(config);
	const nodeDeltaById = new Map<string, Delta>();
	for (const carrierRootId of getAncestorChain(growthRootId, edges)) {
		const carrierRootIds = getCarrierRootIdsAtLayer(
			carrierRootId,
			nodes,
			edges,
			graph.outgoing
		);
		if (carrierRootIds.length < 2 || !carrierRootIds.includes(carrierRootId)) {
			continue;
		}

		const subtreeNodeIdsByRoot = new Map<string, Set<string>>();
		const subtreeBoundsByRoot = new Map<string, Bounds>();

		for (const rootId of carrierRootIds) {
			const subtreeNodeIds = collectSubtreeNodeIds(rootId, graph.outgoing);
			subtreeNodeIdsByRoot.set(rootId, subtreeNodeIds);
			subtreeBoundsByRoot.set(
				rootId,
				getSubtreeBounds(subtreeNodeIds, nodeById, nodeDeltaById)
			);
		}

		const carrierBounds = subtreeBoundsByRoot.get(carrierRootId);
		if (!carrierBounds) {
			continue;
		}

		const hasExternalOverlap = carrierRootIds
			.filter((rootId) => rootId !== carrierRootId)
			.some((rootId) =>
				boundsOverlapWithPadding(
					subtreeBoundsByRoot.get(rootId),
					carrierBounds,
					clearance
				)
			);
		if (!hasExternalOverlap) {
			continue;
		}

		const orderedCarrierRootIds = [...carrierRootIds].sort((leftId, rightId) =>
			compareBySiblingAxis(
				subtreeBoundsByRoot.get(leftId)!,
				subtreeBoundsByRoot.get(rightId)!,
				behavior.siblingAxis
			)
		);
		const carrierIndex = orderedCarrierRootIds.indexOf(carrierRootId);
		if (carrierIndex === -1) {
			continue;
		}

		const leftRootIds = orderedCarrierRootIds.slice(0, carrierIndex).reverse();
		const rightRootIds = orderedCarrierRootIds.slice(carrierIndex + 1);

		applySideExpansion({
			rootIds: leftRootIds,
			direction: 'negative',
			referenceBounds: carrierBounds,
			clearance,
			behavior,
			subtreeNodeIdsByRoot,
			subtreeBoundsByRoot,
			nodeDeltaById,
		});
		applySideExpansion({
			rootIds: rightRootIds,
			direction: 'positive',
			referenceBounds: carrierBounds,
			clearance,
			behavior,
			subtreeNodeIdsByRoot,
			subtreeBoundsByRoot,
			nodeDeltaById,
		});
	}

	return applyBranchReflow(nodes, edges, nodeDeltaById);
}

function getCarrierRootIdsAtLayer(
	carrierRootId: string,
	nodes: AppNode[],
	edges: AppEdge[],
	outgoing: Map<string, string[]>
): string[] {
	const carrierParentId = getPrimaryParentId(carrierRootId, edges);

	if (carrierParentId) {
		return [...(outgoing.get(carrierParentId) ?? [])];
	}

	return getTopLevelRootIds(nodes, edges);
}

function getTopLevelRootIds(nodes: AppNode[], edges: AppEdge[]): string[] {
	const childNodeIds = new Set(edges.map((edge) => edge.target));
	return nodes
		.filter((node) => !childNodeIds.has(node.id))
		.map((node) => node.id);
}

function getAncestorChain(nodeId: string, edges: AppEdge[]): string[] {
	const ancestors: string[] = [];
	let currentId: string | null = nodeId;

	while (currentId) {
		ancestors.push(currentId);
		currentId = getPrimaryParentId(currentId, edges);
	}

	return ancestors;
}

function applySideExpansion({
	rootIds,
	direction,
	referenceBounds,
	clearance,
	behavior,
	subtreeNodeIdsByRoot,
	subtreeBoundsByRoot,
	nodeDeltaById,
}: {
	rootIds: string[];
	direction: 'negative' | 'positive';
	referenceBounds: Bounds;
	clearance: number;
	behavior: DirectionBehavior;
	subtreeNodeIdsByRoot: Map<string, Set<string>>;
	subtreeBoundsByRoot: Map<string, Bounds>;
	nodeDeltaById: Map<string, Delta>;
}): void {
	if (
		rootIds.length === 0 ||
		!rootIds.some((rootId) =>
			boundsOverlapWithPadding(
				subtreeBoundsByRoot.get(rootId),
				referenceBounds,
				clearance
			)
		)
	) {
		return;
	}

	let boundary =
		direction === 'negative'
			? getAxisMin(referenceBounds, behavior.siblingAxis) - clearance
			: getAxisMax(referenceBounds, behavior.siblingAxis) + clearance;

	for (const rootId of rootIds) {
		const subtreeBounds = subtreeBoundsByRoot.get(rootId);
		const subtreeNodeIds = subtreeNodeIdsByRoot.get(rootId);
		if (!subtreeBounds || !subtreeNodeIds) {
			continue;
		}

		const siblingDelta =
			direction === 'negative'
				? Math.min(
						0,
						boundary - getAxisMax(subtreeBounds, behavior.siblingAxis)
					)
				: Math.max(
						0,
						boundary - getAxisMin(subtreeBounds, behavior.siblingAxis)
					);
		const delta = buildDelta(behavior, 0, siblingDelta);

		if (hasMeaningfulDelta(delta)) {
			for (const nodeId of subtreeNodeIds) {
				const existingDelta = nodeDeltaById.get(nodeId);
				nodeDeltaById.set(
					nodeId,
					existingDelta
						? {
								x: existingDelta.x + delta.x,
								y: existingDelta.y + delta.y,
							}
						: delta
				);
			}
		}

		const shiftedBounds = translateBounds(subtreeBounds, delta);
		boundary =
			direction === 'negative'
				? getAxisMin(shiftedBounds, behavior.siblingAxis) - clearance
				: getAxisMax(shiftedBounds, behavior.siblingAxis) + clearance;
	}
}

function applyBranchReflow(
	nodes: AppNode[],
	edges: AppEdge[],
	nodeDeltaById: Map<string, Delta>
): LocalBranchReflowResult {
	const affectedNodeIds = new Set<string>();
	const affectedEdgeIds = new Set<string>();

	if (nodeDeltaById.size === 0) {
		return createNoopResult(nodes, edges);
	}

	const nextNodes = nodes.map((node) => {
		const delta = nodeDeltaById.get(node.id);
		if (!delta || !hasMeaningfulDelta(delta)) {
			return node;
		}

		affectedNodeIds.add(node.id);
		return {
			...node,
			position: {
				x: node.position.x + delta.x,
				y: node.position.y + delta.y,
			},
		};
	});

	const nextEdges = edges.map((edge) => {
		if (!isWaypointEdge(edge) || !edge.data?.metadata?.waypoints?.length) {
			return edge;
		}

		const sourceDelta = nodeDeltaById.get(edge.source);
		const targetDelta = nodeDeltaById.get(edge.target);
		if (
			!sourceDelta ||
			!targetDelta ||
			!deltasEqual(sourceDelta, targetDelta)
		) {
			return edge;
		}

		affectedEdgeIds.add(edge.id);
		return {
			...edge,
			data: {
				...edge.data,
				metadata: {
					...(edge.data?.metadata ?? {}),
					waypoints: translateWaypoints(
						edge.data?.metadata?.waypoints ?? [],
						sourceDelta
					),
				},
			},
		};
	});

	return {
		nodes: nextNodes,
		edges: nextEdges,
		affectedNodeIds,
		affectedEdgeIds,
	};
}

function createNoopResult(
	nodes: AppNode[],
	edges: AppEdge[]
): LocalBranchReflowResult {
	return {
		nodes,
		edges,
		affectedNodeIds: new Set<string>(),
		affectedEdgeIds: new Set<string>(),
	};
}

function isWaypointEdge(edge: AppEdge): boolean {
	return (
		edge.type === 'waypointEdge' || edge.data?.metadata?.pathType === 'waypoint'
	);
}

function translateWaypoints(waypoints: Waypoint[], delta: Delta): Waypoint[] {
	return waypoints.map((waypoint) => ({
		...waypoint,
		x: waypoint.x + delta.x,
		y: waypoint.y + delta.y,
	}));
}

function hasMeaningfulDelta(delta: Delta): boolean {
	return Math.abs(delta.x) > DELTA_EPSILON || Math.abs(delta.y) > DELTA_EPSILON;
}

function deltasEqual(left: Delta, right: Delta): boolean {
	return (
		Math.abs(left.x - right.x) <= DELTA_EPSILON &&
		Math.abs(left.y - right.y) <= DELTA_EPSILON
	);
}

function getAxisMin(bounds: Bounds, axis: AxisKey): number {
	return axis === 'x' ? bounds.minX : bounds.minY;
}

function getAxisMax(bounds: Bounds, axis: AxisKey): number {
	return axis === 'x' ? bounds.maxX : bounds.maxY;
}

function getAxisCenter(bounds: Bounds, axis: AxisKey): number {
	return axis === 'x' ? bounds.centerX : bounds.centerY;
}

function getAxisSize(bounds: Bounds, axis: AxisKey): number {
	return axis === 'x' ? bounds.width : bounds.height;
}

function translateBounds(bounds: Bounds, delta: Delta): Bounds {
	return {
		...bounds,
		minX: bounds.minX + delta.x,
		maxX: bounds.maxX + delta.x,
		minY: bounds.minY + delta.y,
		maxY: bounds.maxY + delta.y,
		centerX: bounds.centerX + delta.x,
		centerY: bounds.centerY + delta.y,
	};
}

function boundsOverlapWithPadding(
	left: Bounds | undefined,
	right: Bounds,
	padding: number
): boolean {
	if (!left) {
		return false;
	}

	return !(
		left.maxX + padding <= right.minX ||
		left.minX - padding >= right.maxX ||
		left.maxY + padding <= right.minY ||
		left.minY - padding >= right.maxY
	);
}
