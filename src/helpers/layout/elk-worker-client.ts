/**
 * ELK.js Web Worker Client
 * Manages ELK instance with Web Worker support for off-main-thread computation
 */

import type { ELK } from 'elkjs/lib/elk-api';
import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type { ElkLayoutParams, LayoutConfig, LayoutResult } from '@/types/layout-types';
import { convertFromElkGraph, convertToElkGraph } from './elk-converter';

// ELK instance singleton - reused across layout calls
let elkInstance: ELK | null = null;
let initPromise: Promise<ELK> | null = null;

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
	const { nodes, edges, config, selectedNodeIds } = params;

	// Filter nodes/edges if selectedNodeIds provided
	const nodesToLayout = selectedNodeIds
		? filterSelectedSubgraph(nodes, edges, selectedNodeIds)
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
 * Merge layout results for selected-only layout back into full graph
 * Preserves positions of unselected nodes while updating selected ones
 */
function mergeLayoutResult(
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

		const edgeData = edge.data!;
		const layoutedEdgeData = layoutedEdge.data!;

		// Offset waypoints to match node offset
		const waypoints = layoutedEdgeData.metadata?.waypoints?.map((wp) => ({
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
					...edgeData.metadata,
					...layoutedEdgeData.metadata,
					waypoints,
				},
			},
		} as AppEdge;
	});

	return { nodes: mergedNodes, edges: mergedEdges };
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
		const width = node.measured?.width ?? node.width ?? 200;
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
