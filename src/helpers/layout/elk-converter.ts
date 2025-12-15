/**
 * ELK Graph Converter
 * Converts between React Flow and ELK.js graph formats
 */

import generateUuid from '@/helpers/generate-uuid';
import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type { Waypoint } from '@/types/path-types';
import type {
	ElkEdge,
	ElkEdgeSection,
	ElkNode,
	LayoutConfig,
	LayoutResult,
} from '@/types/layout-types';
import { buildGroupLayoutOptions, buildLayoutOptions, getRecommendedCurveType } from './elk-config';

// Default dimensions for nodes without explicit size
const DEFAULT_NODE_WIDTH = 200;
const DEFAULT_NODE_HEIGHT = 80;

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
			edges: internalEdges.map((e) => convertEdgeToElk(e)),
		});
	}

	// Add non-grouped nodes at root level
	const groupedNodeIds = new Set(
		groupNodes.flatMap((g) => (g.data.metadata?.groupChildren as string[]) || [])
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

	elkGraph.edges = rootEdges.map((e) => convertEdgeToElk(e));

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
function convertEdgeToElk(edge: AppEdge): ElkEdge {
	return {
		id: edge.id,
		sources: [edge.source],
		targets: [edge.target],
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
	const edgeWaypointsMap = new Map<string, Waypoint[]>();

	// Extract positions from ELK nodes (including nested children)
	extractPositions(elkGraph, 0, 0, positionMap);

	// Extract edge waypoints
	extractEdgeWaypoints(elkGraph, edgeWaypointsMap);

	// Get recommended curve type for this layout direction
	const curveType = getRecommendedCurveType(config.direction);

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

	// Update edges with waypoints from ELK
	const updatedEdges: AppEdge[] = originalEdges.map((edge) => {
		const waypoints = edgeWaypointsMap.get(edge.id);
		const edgeData = edge.data!; // Edge data is guaranteed by React Flow

		// If no waypoints from ELK, preserve existing or clear
		if (!waypoints || waypoints.length === 0) {
			return {
				...edge,
				type: 'floatingEdge' as const, // Use floating edge for edges without waypoints
				data: {
					...edgeData,
					metadata: {
						...edgeData.metadata,
						waypoints: undefined,
						curveType: undefined,
					},
				},
			} as AppEdge;
		}

		// Update edge with new waypoints
		return {
			...edge,
			type: 'waypointEdge' as const,
			data: {
				...edgeData,
				metadata: {
					...edgeData.metadata,
					pathType: 'waypoint' as const,
					waypoints,
					curveType,
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
	if (elkNode.id !== 'root' && elkNode.x !== undefined && elkNode.y !== undefined) {
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
 * Extract edge waypoints from ELK graph sections
 */
function extractEdgeWaypoints(
	elkNode: ElkNode,
	waypointsMap: Map<string, Waypoint[]>
): void {
	// Process edges at this level
	if (elkNode.edges) {
		for (const elkEdge of elkNode.edges) {
			const waypoints = extractWaypointsFromSections(elkEdge.sections);
			if (waypoints.length > 0) {
				waypointsMap.set(elkEdge.id, waypoints);
			}
		}
	}

	// Recursively process children
	if (elkNode.children) {
		for (const child of elkNode.children) {
			extractEdgeWaypoints(child, waypointsMap);
		}
	}
}

/**
 * Convert ELK edge sections to our Waypoint format
 */
function extractWaypointsFromSections(sections?: ElkEdgeSection[]): Waypoint[] {
	if (!sections || sections.length === 0) return [];

	const waypoints: Waypoint[] = [];

	for (const section of sections) {
		// Add bend points as waypoints
		if (section.bendPoints) {
			for (const bend of section.bendPoints) {
				waypoints.push({
					id: generateUuid(),
					x: bend.x,
					y: bend.y,
				});
			}
		}
	}

	// Optimize: remove collinear points
	return optimizeWaypoints(waypoints);
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
function areCollinear(p1: Waypoint, p2: Waypoint, p3: Waypoint, threshold: number): boolean {
	// Calculate the area of the triangle formed by the three points
	// If area is small, points are collinear
	const area = Math.abs((p2.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p2.y - p1.y));
	return area < threshold;
}
