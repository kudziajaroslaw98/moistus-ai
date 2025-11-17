import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type {
	ELKAlgorithm,
	ELKEdge,
	ELKGraph,
	ELKNode,
	LayoutDirection,
	LayoutResult,
} from '@/types/layout-types';
import { getNodeDimensions } from './node-dimension-utils';

// Transform React Flow format to ELK format
export const transformToELKGraph = (
	nodes: AppNode[],
	edges: AppEdge[]
): ELKGraph => {
	if (!nodes || nodes.length === 0) {
		return {
			id: 'root',
			children: [],
			edges: [],
		};
	}

	const elkNodes: ELKNode[] = nodes.map((node) => {
		const dimensions = getNodeDimensions(node);

		const padding = 30;
		const width = dimensions.width + padding;
		const height = dimensions.height + padding;

		return {
			id: node.id,
			width,
			height,
			x: node.position?.x || 0,
			y: node.position?.y || 0,
		};
	});

	const elkEdges: ELKEdge[] = edges.map((edge) => ({
		id: edge.id,
		sources: [edge.source],
		targets: [edge.target],
	}));

	return {
		id: 'root',
		children: elkNodes,
		edges: elkEdges,
	};
};

// Transform ELK format back to React Flow format
export const transformFromELKGraph = (elkGraph: ELKGraph): LayoutResult => {
	const nodes =
		elkGraph.children?.map((child) => ({
			id: child.id,
			position: {
				x: child.x || 0,
				y: child.y || 0,
			},
		})) || [];

	const edges =
		elkGraph.edges?.map((edge) => ({
			id: edge.id,
			source: edge.sources[0],
			target: edge.targets[0],
		})) || [];

	const bounds = nodes.length > 0 ? calculateBounds(nodes) : undefined;

	return {
		nodes,
		edges,
		bounds,
	};
};

// Calculate layout bounds
const calculateBounds = (
	nodes: Array<{ id: string; position: { x: number; y: number } }>
) => {
	if (nodes.length === 0) return undefined;

	const positions = nodes.map((n) => n.position);
	const minX = Math.min(...positions.map((p) => p.x));
	const minY = Math.min(...positions.map((p) => p.y));
	const maxX = Math.max(...positions.map((p) => p.x));
	const maxY = Math.max(...positions.map((p) => p.y));

	return { minX, minY, maxX, maxY };
};

// Validate input data
const validateLayoutInput = (nodes: AppNode[], edges: AppEdge[]): void => {
	if (!Array.isArray(nodes)) {
		throw new Error('Nodes must be an array');
	}

	if (!Array.isArray(edges)) {
		throw new Error('Edges must be an array');
	}

	const nodeIds = nodes.map((n) => n.id);
	const duplicateNodes = nodeIds.filter(
		(id, index) => nodeIds.indexOf(id) !== index
	);

	if (duplicateNodes.length > 0) {
		throw new Error(`Duplicate node IDs found: ${duplicateNodes.join(', ')}`);
	}

	const nodeIdSet = new Set(nodeIds);

	for (const edge of edges) {
		if (!nodeIdSet.has(edge.source)) {
			throw new Error(
				`Edge ${edge.id} references unknown source: ${edge.source}`
			);
		}

		if (!nodeIdSet.has(edge.target)) {
			throw new Error(
				`Edge ${edge.id} references unknown target: ${edge.target}`
			);
		}
	}
};

// Dynamically import ELK.js to avoid SSR issues
const getELKInstance = async (): Promise<any> => {
	if (typeof window === 'undefined') {
		return null;
	}

	try {
		const ELK = (await import('elkjs')).default;
		return new ELK();
	} catch (error) {
		console.error('Failed to load ELK.js:', error);
		return null;
	}
};

// Main layout function using ELK.js
export const layoutWithELK = async (
	nodes: AppNode[],
	edges: AppEdge[],
	config: {
		algorithm: ELKAlgorithm;
		direction?: LayoutDirection;
		layoutOptions?: Record<string, any>;
		useWorker?: boolean;
	}
): Promise<LayoutResult> => {
	try {
		validateLayoutInput(nodes, edges);

		if (nodes.length === 0) {
			return { nodes: [], edges: [] };
		}

		const elkGraph = transformToELKGraph(nodes, edges);
		const layoutOptions = config.layoutOptions || {};

		const elk = await getELKInstance();

		if (!elk) {
			throw new Error('ELK.js not available (likely server-side rendering)');
		}

		const layoutedGraph = await elk.layout(elkGraph, {
			layoutOptions,
		});

		const result = transformFromELKGraph(layoutedGraph);

		return result;
	} catch (error) {
		console.error('ELK layout failed:', error);
		throw new Error(
			`Layout failed: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}
};

// Optimized directional layout for mind maps
export const applyDirectionalLayout = async (
	nodes: AppNode[],
	edges: AppEdge[],
	direction: LayoutDirection
): Promise<LayoutResult> => {
	return layoutWithELK(nodes, edges, {
		algorithm: 'elk.layered',
		direction,
		layoutOptions: {
			// Core spacing - distance between layers and nodes
			'elk.layered.spacing.nodeNodeBetweenLayers': '100',
			'elk.layered.spacing.nodeNode': '80',
			'elk.layered.spacing.edgeEdge': '40',
			'elk.layered.spacing.edgeNodeBetweenLayers': '80',

			// NETWORK_SIMPLEX for stable, uniform layout
			'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
			'elk.layered.nodePlacement.favorStraightEdges': true,

			// Better layering strategy for hierarchy detection
			'elk.layered.layering.strategy': 'LONGEST_PATH',

			// Crossing minimization for cleaner edges
			'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
			'elk.layered.crossingMinimization.greedySwitch': 'TWO_SIDED',

			// Cycle breaking for proper hierarchy
			'elk.layered.cycleBreaking.strategy': 'DEPTH_FIRST',

			// Aggressive compaction to push nodes left
			'elk.layered.compaction.postCompaction.strategy': 'LEFT',
			'elk.layered.compaction.connectedComponents': true,

			// Quality settings
			'elk.layered.thoroughness': 15,
			'elk.layered.unnecessaryBendpoints': true,

			// Component spacing
			'spacing.componentComponent': '100',

			// Padding around the entire graph
			'elk.padding': '[top=30,left=30,bottom=30,right=30]',
		},
		useWorker: false,
	});
};

// Layout presets for UI selection
export const getELKLayoutPresets = () => {
	return [
		{
			id: 'elk-layered-tb',
			name: 'Layered (Top-Bottom)',
			description: 'Hierarchical layout flowing from top to bottom',
			category: 'hierarchical' as const,
			config: {
				algorithm: 'elk.layered' as ELKAlgorithm,
				direction: 'TB' as LayoutDirection,
				layoutOptions: {},
			},
		},
		{
			id: 'elk-layered-lr',
			name: 'Layered (Left-Right)',
			description: 'Hierarchical layout flowing from left to right',
			category: 'hierarchical' as const,
			config: {
				algorithm: 'elk.layered' as ELKAlgorithm,
				direction: 'LR' as LayoutDirection,
				layoutOptions: {},
			},
		},
		{
			id: 'elk-force',
			name: 'Force-Directed',
			description: 'Physics-based organic layout',
			category: 'force' as const,
			config: {
				algorithm: 'elk.force' as ELKAlgorithm,
				layoutOptions: {},
			},
		},
		{
			id: 'elk-radial',
			name: 'Radial',
			description: 'Radial tree arrangement',
			category: 'geometric' as const,
			config: {
				algorithm: 'elk.radial' as ELKAlgorithm,
				layoutOptions: {},
			},
		},
	];
};
