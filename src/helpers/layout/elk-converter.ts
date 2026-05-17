/**
 * ELK Graph Converter
 * Converts between React Flow and ELK.js graph formats
 */

import generateUuid from '@/helpers/generate-uuid';
import { projectToNodePerimeter } from '@/helpers/get-anchor-position';
import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type { ElkLabelLayout } from '@/types/edge-data';
import type {
	ElkEdge,
	ElkEdgeSection,
	ElkLabel,
	ElkNode,
	LayoutConfig,
	LayoutResult,
} from '@/types/layout-types';
import type { EdgeAnchor, Waypoint } from '@/types/path-types';
import {
	buildEdgeLabelLayoutOptions,
	buildGroupLayoutOptions,
	buildLayoutOptions,
	getRecommendedCurveType,
	usesElkEdgeLabels,
} from './elk-config';
import { measureElkEdgeLabel } from './elk-edge-label-measurement';

// Default dimensions for nodes without explicit size
const DEFAULT_NODE_WIDTH = 320;
const DEFAULT_NODE_HEIGHT = 80;

/**
 * Layout data extracted from ELK edge sections
 * Includes waypoints and anchor positions for source/target
 */
interface ElkEdgeLayoutData {
	waypoints: Waypoint[];
	sourceAnchor?: EdgeAnchor;
	targetAnchor?: EdgeAnchor;
	elkLabel?: ElkLabelLayout;
}

interface Point2D {
	x: number;
	y: number;
}

function getEdgeLabelText(edge: AppEdge): string | null {
	const label = edge.data?.label ?? edge.label;
	if (typeof label !== 'string') {
		return null;
	}

	const trimmedLabel = label.trim();
	return trimmedLabel.length > 0 ? trimmedLabel : null;
}

function convertEdgeLabelToElk(edge: AppEdge, labelText: string): ElkLabel {
	const { width, height } = measureElkEdgeLabel(labelText);

	return {
		id: `${edge.id}:label`,
		text: labelText,
		width,
		height,
		layoutOptions: buildEdgeLabelLayoutOptions(),
	};
}

function extractElkLabelLayout(
	elkLabels: ElkLabel[] | undefined,
	sections: ElkEdgeSection[] | undefined
): ElkLabelLayout | undefined {
	const elkLabel = elkLabels?.[0];
	if (
		!elkLabel ||
		typeof elkLabel.x !== 'number' ||
		typeof elkLabel.y !== 'number' ||
		typeof elkLabel.width !== 'number' ||
		typeof elkLabel.height !== 'number'
	) {
		return undefined;
	}

	const centerPoint = snapPointToEdgeSections(
		{
			x: elkLabel.x + elkLabel.width / 2,
			y: elkLabel.y + elkLabel.height / 2,
		},
		sections
	);

	return {
		x: centerPoint.x - elkLabel.width / 2,
		y: centerPoint.y - elkLabel.height / 2,
		width: elkLabel.width,
		height: elkLabel.height,
		centerX: centerPoint.x,
		centerY: centerPoint.y,
	};
}

function snapPointToEdgeSections(
	point: Point2D,
	sections: ElkEdgeSection[] | undefined
): Point2D {
	const segments = buildEdgeSegments(sections);
	if (segments.length === 0) {
		return point;
	}

	let closestPoint = point;
	let closestDistanceSquared = Number.POSITIVE_INFINITY;

	for (const segment of segments) {
		const projectedPoint = projectPointOntoSegment(point, segment.start, segment.end);
		const distanceSquared = getDistanceSquared(point, projectedPoint);
		if (distanceSquared < closestDistanceSquared) {
			closestDistanceSquared = distanceSquared;
			closestPoint = projectedPoint;
		}
	}

	return closestPoint;
}

function buildEdgeSegments(
	sections: ElkEdgeSection[] | undefined
): Array<{ start: Point2D; end: Point2D }> {
	if (!sections || sections.length === 0) {
		return [];
	}

	const segments: Array<{ start: Point2D; end: Point2D }> = [];

	for (const section of sections) {
		const points = [
			section.startPoint,
			...(section.bendPoints ?? []),
			section.endPoint,
		].filter(isFinitePoint);

		for (let index = 0; index < points.length - 1; index += 1) {
			const start = points[index];
			const end = points[index + 1];
			if (!start || !end || pointsAreEqual(start, end)) {
				continue;
			}

			segments.push({ start, end });
		}
	}

	return segments;
}

function isFinitePoint(point: Point2D | undefined): point is Point2D {
	return !!point && Number.isFinite(point.x) && Number.isFinite(point.y);
}

function pointsAreEqual(first: Point2D, second: Point2D): boolean {
	return first.x === second.x && first.y === second.y;
}

function projectPointOntoSegment(
	point: Point2D,
	segmentStart: Point2D,
	segmentEnd: Point2D
): Point2D {
	const deltaX = segmentEnd.x - segmentStart.x;
	const deltaY = segmentEnd.y - segmentStart.y;
	const segmentLengthSquared = deltaX * deltaX + deltaY * deltaY;

	if (segmentLengthSquared === 0) {
		return segmentStart;
	}

	const rawT =
		((point.x - segmentStart.x) * deltaX + (point.y - segmentStart.y) * deltaY) /
		segmentLengthSquared;
	const t = Math.min(1, Math.max(0, rawT));

	return {
		x: segmentStart.x + deltaX * t,
		y: segmentStart.y + deltaY * t,
	};
}

function getDistanceSquared(first: Point2D, second: Point2D): number {
	const deltaX = first.x - second.x;
	const deltaY = first.y - second.y;
	return deltaX * deltaX + deltaY * deltaY;
}

/**
 * Convert an ELK absolute point to an EdgeAnchor relative to a node's border.
 * Uses projectToNodePerimeter to find the side and offset.
 */
function elkPointToAnchor(
	point: { x: number; y: number },
	nodeId: string,
	positionMap: Map<string, { x: number; y: number }>,
	originalNodes: AppNode[]
): EdgeAnchor | undefined {
	const nodePosition = positionMap.get(nodeId);
	const originalNode = originalNodes.find((n) => n.id === nodeId);

	if (!nodePosition || !originalNode) {
		return undefined;
	}

	const width =
		originalNode.measured?.width ?? originalNode.width ?? DEFAULT_NODE_WIDTH;
	const height =
		originalNode.measured?.height ?? originalNode.height ?? DEFAULT_NODE_HEIGHT;

	// Create a node-like structure compatible with projectToNodePerimeter
	const nodeLike = {
		internals: { positionAbsolute: nodePosition },
		measured: { width, height },
	};

	return projectToNodePerimeter(nodeLike, point);
}

/**
 * Convert React Flow nodes and edges to ELK graph format
 */
export function convertToElkGraph(
	nodes: AppNode[],
	edges: AppEdge[],
	config: LayoutConfig
): ElkNode {
	// Separate group nodes and regular nodes
	const groupNodes = nodes.filter((n) => n.data.metadata?.isGroup);
	const regularNodes = nodes.filter((n) => !n.data.metadata?.isGroup);

	// Build a map of node ID to group ID
	const nodeToGroupMap = new Map<string, string>();
	for (const group of groupNodes) {
		const children = (group.data.metadata?.groupChildren as string[]) || [];
		for (const childId of children) {
			nodeToGroupMap.set(childId, group.id);
		}
	}

	// Create root graph
	const includeEdgeLabels = usesElkEdgeLabels(config);
	const elkGraph: ElkNode = {
		id: 'root',
		layoutOptions: buildLayoutOptions(config),
		children: [],
		edges: [],
	};

	// Process groups as compound nodes with children
	for (const group of groupNodes) {
		const childIds = (group.data.metadata?.groupChildren as string[]) || [];
		const childNodes = regularNodes.filter((n) => childIds.includes(n.id));

		// Find edges internal to this group
		const internalEdges = edges.filter(
			(e) => childIds.includes(e.source) && childIds.includes(e.target)
		);

		elkGraph.children!.push({
			id: group.id,
			width: group.measured?.width ?? group.width ?? DEFAULT_NODE_WIDTH,
			height: group.measured?.height ?? group.height ?? DEFAULT_NODE_HEIGHT,
			layoutOptions: buildGroupLayoutOptions(),
			children: childNodes.map((n) => convertNodeToElk(n)),
			edges: internalEdges.map((e) => convertEdgeToElk(e, includeEdgeLabels)),
		});
	}

	// Add non-grouped nodes at root level
	const groupedNodeIds = new Set(
		groupNodes.flatMap(
			(g) => (g.data.metadata?.groupChildren as string[]) || []
		)
	);
	const ungroupedNodes = regularNodes.filter((n) => !groupedNodeIds.has(n.id));

	elkGraph.children!.push(...ungroupedNodes.map((n) => convertNodeToElk(n)));

	// Add root-level edges (edges not entirely within a group)
	const rootEdges = edges.filter((e) => {
		const sourceInGroup = groupedNodeIds.has(e.source);
		const targetInGroup = groupedNodeIds.has(e.target);
		// Include if either endpoint is not in a group, or they're in different groups
		return (
			!sourceInGroup ||
			!targetInGroup ||
			nodeToGroupMap.get(e.source) !== nodeToGroupMap.get(e.target)
		);
	});

	elkGraph.edges = rootEdges.map((e) => convertEdgeToElk(e, includeEdgeLabels));

	return elkGraph;
}

/**
 * Convert a single React Flow node to ELK node format
 */
function convertNodeToElk(node: AppNode): ElkNode {
	return {
		id: node.id,
		width: node.measured?.width ?? node.width ?? DEFAULT_NODE_WIDTH,
		height: node.measured?.height ?? node.height ?? DEFAULT_NODE_HEIGHT,
		// Don't set x/y - let ELK calculate positions
	};
}

/**
 * Convert a single React Flow edge to ELK edge format
 */
function convertEdgeToElk(edge: AppEdge, includeLabels: boolean): ElkEdge {
	const labelText = getEdgeLabelText(edge);

	return {
		id: edge.id,
		sources: [edge.source],
		targets: [edge.target],
		...(includeLabels && labelText && {
			labels: [convertEdgeLabelToElk(edge, labelText)],
		}),
	};
}

/**
 * Convert ELK layout result back to React Flow format
 */
export function convertFromElkGraph(
	elkGraph: ElkNode,
	originalNodes: AppNode[],
	originalEdges: AppEdge[],
	config: LayoutConfig
): LayoutResult {
	// Build position map from ELK result
	const positionMap = new Map<string, { x: number; y: number }>();
	const edgeLayoutDataMap = new Map<string, ElkEdgeLayoutData>();

	// Extract positions from ELK nodes (including nested children)
	// Must be done FIRST as edge anchor extraction depends on node positions
	extractPositions(elkGraph, 0, 0, positionMap);

	// Extract edge layout data (waypoints AND anchors)
	const includeElkLabels = usesElkEdgeLabels(config);
	extractEdgeLayoutData(
		elkGraph,
		edgeLayoutDataMap,
		positionMap,
		originalNodes,
		includeElkLabels
	);

	// Get recommended curve type for this layout direction
	const curveType = getRecommendedCurveType(config);

	// Update nodes with new positions
	const updatedNodes: AppNode[] = originalNodes.map((node) => {
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

	// Update edges with waypoints AND anchors from ELK
	const updatedEdges: AppEdge[] = originalEdges.map((edge) => {
		const layoutData = edgeLayoutDataMap.get(edge.id);
		// Safely handle edges with missing data by providing defaults
		const edgeData = edge.data ?? ({} as AppEdge['data']);
		const edgeMetadata = edgeData?.metadata ?? {};

		// If no layout data from ELK, use floating edge
		if (
			!layoutData ||
			(layoutData.waypoints.length === 0 &&
				!layoutData.sourceAnchor &&
				!layoutData.targetAnchor)
		) {
			return {
				...edge,
				type: 'floatingEdge' as const,
				data: {
					...edgeData,
					metadata: {
						...edgeMetadata,
						waypoints: undefined,
						curveType: undefined,
						routingStyle: undefined,
						sourceAnchor: undefined,
						targetAnchor: undefined,
						elkLabel: undefined,
					},
				},
			} as AppEdge;
		}

		// Update edge with waypoints AND anchors from ELK routing
		return {
			...edge,
			type: 'waypointEdge' as const,
			data: {
				...edgeData,
				metadata: {
					...edgeMetadata,
					pathType: 'waypoint' as const,
					waypoints: layoutData.waypoints,
					curveType,
					routingStyle: 'elk' as const,
					sourceAnchor: layoutData.sourceAnchor,
					targetAnchor: layoutData.targetAnchor,
					elkLabel: layoutData.elkLabel,
				},
			},
		} as AppEdge;
	});

	return { nodes: updatedNodes, edges: updatedEdges };
}

/**
 * Recursively extract positions from ELK graph
 * @param elkNode Current ELK node to process
 * @param offsetX Parent's absolute X position
 * @param offsetY Parent's absolute Y position
 * @param positionMap Map to store extracted positions
 */
function extractPositions(
	elkNode: ElkNode,
	offsetX: number,
	offsetY: number,
	positionMap: Map<string, { x: number; y: number }>
): void {
	// Skip the root node (id='root')
	if (
		elkNode.id !== 'root' &&
		elkNode.x !== undefined &&
		elkNode.y !== undefined
	) {
		positionMap.set(elkNode.id, {
			x: offsetX + elkNode.x,
			y: offsetY + elkNode.y,
		});
	}

	// Process children recursively
	if (elkNode.children) {
		const childOffsetX = elkNode.id === 'root' ? 0 : offsetX + (elkNode.x ?? 0);
		const childOffsetY = elkNode.id === 'root' ? 0 : offsetY + (elkNode.y ?? 0);

		for (const child of elkNode.children) {
			extractPositions(child, childOffsetX, childOffsetY, positionMap);
		}
	}
}

/**
 * Extract edge layout data (waypoints and anchors) from ELK graph sections
 */
function extractEdgeLayoutData(
	elkNode: ElkNode,
	edgeDataMap: Map<string, ElkEdgeLayoutData>,
	positionMap: Map<string, { x: number; y: number }>,
	originalNodes: AppNode[],
	includeElkLabels: boolean
): void {
	// Process edges at this level
	if (elkNode.edges) {
		for (const elkEdge of elkNode.edges) {
			// ELK uses arrays for sources/targets, but our edges have single source/target
			const sourceNodeId = elkEdge.sources[0];
			const targetNodeId = elkEdge.targets[0];

			const layoutData = extractWaypointsAndAnchors(
				elkEdge.sections,
				elkEdge.labels,
				sourceNodeId,
				targetNodeId,
				positionMap,
				originalNodes,
				includeElkLabels
			);

			// Store if we got meaningful data (waypoints or anchors)
			if (
				layoutData.waypoints.length > 0 ||
				layoutData.sourceAnchor ||
				layoutData.targetAnchor
			) {
				edgeDataMap.set(elkEdge.id, layoutData);
			}
		}
	}

	// Recursively process children
	if (elkNode.children) {
		for (const child of elkNode.children) {
			extractEdgeLayoutData(
				child,
				edgeDataMap,
				positionMap,
				originalNodes,
				includeElkLabels
			);
		}
	}
}

/**
 * Convert ELK edge sections to waypoints and anchors.
 * Extracts startPoint/endPoint as anchors and bendPoints as waypoints.
 */
function extractWaypointsAndAnchors(
	sections: ElkEdgeSection[] | undefined,
	elkLabels: ElkLabel[] | undefined,
	sourceNodeId: string,
	targetNodeId: string,
	positionMap: Map<string, { x: number; y: number }>,
	originalNodes: AppNode[],
	includeElkLabels: boolean
): ElkEdgeLayoutData {
	const result: ElkEdgeLayoutData = {
		waypoints: [],
		sourceAnchor: undefined,
		targetAnchor: undefined,
		elkLabel: includeElkLabels
			? extractElkLabelLayout(elkLabels, sections)
			: undefined,
	};

	if (!sections || sections.length === 0) {
		return result;
	}

	for (const section of sections) {
		// Extract startPoint as sourceAnchor (from first section with startPoint)
		if (section.startPoint && !result.sourceAnchor) {
			result.sourceAnchor = elkPointToAnchor(
				section.startPoint,
				sourceNodeId,
				positionMap,
				originalNodes
			);
		}

		// Add bend points as waypoints, ignoring duplicate section endpoints.
		for (const bend of getNormalizedBendPoints(section)) {
			result.waypoints.push({
				id: generateUuid(),
				x: bend.x,
				y: bend.y,
			});
		}

		// Extract endPoint as targetAnchor (last section's endPoint wins)
		if (section.endPoint) {
			result.targetAnchor = elkPointToAnchor(
				section.endPoint,
				targetNodeId,
				positionMap,
				originalNodes
			);
		}
	}

	// Optimize: remove collinear waypoints
	result.waypoints = optimizeWaypoints(result.waypoints);

	return result;
}

function getNormalizedBendPoints(section: ElkEdgeSection): Point2D[] {
	const normalizedBends: Point2D[] = [];
	const startPoint = isFinitePoint(section.startPoint)
		? section.startPoint
		: undefined;
	const endPoint = isFinitePoint(section.endPoint) ? section.endPoint : undefined;
	let previousPoint = startPoint;

	for (const bend of section.bendPoints ?? []) {
		if (!isFinitePoint(bend)) {
			continue;
		}

		if (previousPoint && pointsAreEqual(bend, previousPoint)) {
			continue;
		}

		if (endPoint && pointsAreEqual(bend, endPoint)) {
			continue;
		}

		normalizedBends.push(bend);
		previousPoint = bend;
	}

	return normalizedBends;
}

/**
 * Remove collinear waypoints that don't add value
 * Reduces visual clutter and improves edge rendering performance
 */
function optimizeWaypoints(waypoints: Waypoint[]): Waypoint[] {
	if (waypoints.length < 3) return waypoints;

	const optimized: Waypoint[] = [waypoints[0]];

	for (let i = 1; i < waypoints.length - 1; i++) {
		const prev = optimized[optimized.length - 1];
		const curr = waypoints[i];
		const next = waypoints[i + 1];

		// Check if points are collinear (within threshold)
		if (!areCollinear(prev, curr, next, 2)) {
			optimized.push(curr);
		}
	}

	optimized.push(waypoints[waypoints.length - 1]);
	return optimized;
}

/**
 * Check if three points are approximately collinear
 * Uses cross product area calculation
 */
function areCollinear(
	p1: Waypoint,
	p2: Waypoint,
	p3: Waypoint,
	threshold: number
): boolean {
	// Calculate the area of the triangle formed by the three points
	// If area is small, points are collinear
	const area = Math.abs(
		(p2.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p2.y - p1.y)
	);
	return area < threshold;
}
