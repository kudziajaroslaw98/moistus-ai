import { createDefaultAnchor } from '@/helpers/get-anchor-position';
import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type { EdgeData } from '@/types/edge-data';
import type { LayoutDirection } from '@/types/layout-types';
import type { EdgeAnchor, Waypoint } from '@/types/path-types';

const FALLBACK_NODE_WIDTH = 320;
const FALLBACK_NODE_HEIGHT = 80;
const POSITION_EPSILON = 0.01;

interface Point {
	x: number;
	y: number;
}

interface Bounds {
	x: number;
	y: number;
	width: number;
	height: number;
}

interface RouteAutoWaypointEdgesParams {
	nodes: AppNode[];
	edges: AppEdge[];
	direction: LayoutDirection;
	edgeIds?: Iterable<string>;
	connectedNodeIds?: Iterable<string>;
	legacyOnly?: boolean;
}

export interface RouteAutoWaypointEdgesResult {
	edges: AppEdge[];
	affectedEdgeIds: Set<string>;
}

export function getRenderableEdgeType(edgeData: Partial<EdgeData>): string {
	if (edgeData.aiData?.isSuggested) {
		return 'suggestedConnection';
	}

	if (edgeData.metadata?.isGhostEdge) {
		return edgeData.type ?? 'floatingEdge';
	}

	return 'waypointEdge';
}

export function isSpecialNonAutoRoutedEdge(
	edgeData: Partial<EdgeData> | null | undefined
): boolean {
	if (!edgeData) {
		return false;
	}

	return (
		edgeData.aiData?.isSuggested === true ||
		edgeData.metadata?.isGhostEdge === true
	);
}

export function rerouteAutoWaypointEdges({
	nodes,
	edges,
	direction,
	edgeIds,
	connectedNodeIds,
	legacyOnly = false,
}: RouteAutoWaypointEdgesParams): RouteAutoWaypointEdgesResult {
	const nodeById = new Map(nodes.map((node) => [node.id, node]));
	const selectedEdgeIds = edgeIds ? new Set(edgeIds) : null;
	const selectedNodeIds = connectedNodeIds ? new Set(connectedNodeIds) : null;
	const affectedEdgeIds = new Set<string>();

	const updatedEdges = edges.map((edge) => {
		if (isSpecialNonAutoRoutedEdge(edge.data)) {
			return edge;
		}

		const isSelected =
			selectedEdgeIds !== null
				? selectedEdgeIds.has(edge.id)
				: selectedNodeIds !== null
					? selectedNodeIds.has(edge.source) || selectedNodeIds.has(edge.target)
					: true;

		if (!isSelected) {
			return edge;
		}

		if (legacyOnly && edge.data?.metadata?.routingStyle) {
			return edge;
		}

		const sourceNode = nodeById.get(edge.source);
		const targetNode = nodeById.get(edge.target);
		if (!sourceNode || !targetNode) {
			return edge;
		}

		const routedEdge = routeEdgeOrthogonally(edge, sourceNode, targetNode, direction);
		if (getRoutingSignature(edge) === getRoutingSignature(routedEdge)) {
			return routedEdge;
		}

		affectedEdgeIds.add(edge.id);
		return routedEdge;
	});

	return {
		edges: updatedEdges,
		affectedEdgeIds,
	};
}

function getEdgeDataOrFallback(edge: AppEdge): EdgeData {
	if (edge.data) {
		return edge.data;
	}

	return {
		id: edge.id,
		map_id: '',
		user_id: '',
		source: edge.source,
		target: edge.target,
		label: null,
		animated: false,
		metadata: {},
		aiData: {},
		created_at: '',
		updated_at: '',
	};
}

function routeEdgeOrthogonally(
	edge: AppEdge,
	sourceNode: AppNode,
	targetNode: AppNode,
	direction: LayoutDirection
): AppEdge {
	const edgeData = getEdgeDataOrFallback(edge);
	const sourceBounds = getNodeBounds(sourceNode);
	const targetBounds = getNodeBounds(targetNode);
	const { sourceAnchor, targetAnchor } = getDefaultAnchors(direction);
	const sourcePoint = getAnchorPoint(sourceBounds, sourceAnchor);
	const targetPoint = getAnchorPoint(targetBounds, targetAnchor);
	const waypoints = buildOrthogonalWaypoints(
		edge.id,
		direction,
		sourcePoint,
		targetPoint
	);

	return {
		...edge,
		type: 'waypointEdge',
		data: {
			...edgeData,
			type: 'waypointEdge',
			source: edge.source,
			target: edge.target,
			metadata: {
				...(edgeData.metadata ?? {}),
				pathType: 'waypoint',
				curveType: 'smoothstep',
				routingStyle: 'orthogonal',
				sourceAnchor,
				targetAnchor,
				waypoints: waypoints.length > 0 ? waypoints : undefined,
			},
		},
	};
}

function getNodeBounds(node: AppNode): Bounds {
	return {
		x: node.position.x,
		y: node.position.y,
		width:
			node.measured?.width ??
			node.width ??
			node.data?.width ??
			FALLBACK_NODE_WIDTH,
		height:
			node.measured?.height ??
			node.height ??
			node.data?.height ??
			FALLBACK_NODE_HEIGHT,
	};
}

function getDefaultAnchors(direction: LayoutDirection): {
	sourceAnchor: EdgeAnchor;
	targetAnchor: EdgeAnchor;
} {
	if (direction === 'LEFT_RIGHT') {
		return {
			sourceAnchor: createDefaultAnchor('right'),
			targetAnchor: createDefaultAnchor('left'),
		};
	}

	return {
		sourceAnchor: createDefaultAnchor('bottom'),
		targetAnchor: createDefaultAnchor('top'),
	};
}

function getAnchorPoint(bounds: Bounds, anchor: EdgeAnchor): Point {
	switch (anchor.side) {
		case 'top':
			return {
				x: bounds.x + bounds.width * anchor.offset,
				y: bounds.y,
			};
		case 'bottom':
			return {
				x: bounds.x + bounds.width * anchor.offset,
				y: bounds.y + bounds.height,
			};
		case 'left':
			return {
				x: bounds.x,
				y: bounds.y + bounds.height * anchor.offset,
			};
		case 'right':
			return {
				x: bounds.x + bounds.width,
				y: bounds.y + bounds.height * anchor.offset,
			};
	}
}

function buildOrthogonalWaypoints(
	edgeId: string,
	direction: LayoutDirection,
	sourcePoint: Point,
	targetPoint: Point
): Waypoint[] {
	if (direction === 'LEFT_RIGHT') {
		if (Math.abs(sourcePoint.y - targetPoint.y) <= POSITION_EPSILON) {
			return [];
		}

		const midX = roundCoordinate((sourcePoint.x + targetPoint.x) / 2);
		return [
			createWaypoint(edgeId, 0, midX, sourcePoint.y),
			createWaypoint(edgeId, 1, midX, targetPoint.y),
		];
	}

	if (Math.abs(sourcePoint.x - targetPoint.x) <= POSITION_EPSILON) {
		return [];
	}

	const midY = roundCoordinate((sourcePoint.y + targetPoint.y) / 2);
	return [
		createWaypoint(edgeId, 0, sourcePoint.x, midY),
		createWaypoint(edgeId, 1, targetPoint.x, midY),
	];
}

function createWaypoint(
	edgeId: string,
	index: number,
	x: number,
	y: number
): Waypoint {
	return {
		id: `${edgeId}:wp:${index}`,
		x: roundCoordinate(x),
		y: roundCoordinate(y),
	};
}

function roundCoordinate(value: number): number {
	return Math.round(value * 100) / 100;
}

function getRoutingSignature(edge: AppEdge): string {
	return JSON.stringify({
		type: edge.type,
		pathType: edge.data?.metadata?.pathType ?? null,
		curveType: edge.data?.metadata?.curveType ?? null,
		routingStyle: edge.data?.metadata?.routingStyle ?? null,
		sourceAnchor: edge.data?.metadata?.sourceAnchor ?? null,
		targetAnchor: edge.data?.metadata?.targetAnchor ?? null,
		waypoints: edge.data?.metadata?.waypoints ?? null,
	});
}
