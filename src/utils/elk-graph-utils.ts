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
// ELK.js will be dynamically imported to avoid SSR issues

// Direction mapping from our format to ELK format
const directionToELK = (direction: LayoutDirection): string => {
	switch (direction) {
		case 'TB':
			return 'DOWN';
		case 'BT':
			return 'UP';
		case 'LR':
			return 'RIGHT';
		case 'RL':
			return 'LEFT';
		default:
			return 'DOWN';
	}
};

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

	const elkNodes: ELKNode[] = nodes.map((node) => ({
		id: node.id,
		width: node.width || 320,
		height: node.height || 100,
		// Preserve existing position as initial position hint
		x: node.position?.x || 0,
		y: node.position?.y || 0,
	}));

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

	// Calculate bounds for the layout
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

// Get default layout options for different ELK algorithms
const getDefaultLayoutOptions = (
	algorithm: ELKAlgorithm,
	direction: LayoutDirection = 'TB'
): Record<string, any> => {
	const baseOptions = {
		'elk.algorithm': algorithm,
	};

	switch (algorithm) {
		case 'elk.layered':
			return {
				...baseOptions,
				'elk.direction': directionToELK(direction),
				'elk.layered.spacing.nodeNodeBetweenLayers': 150,
				'elk.layered.spacing.nodeNode': 80,
				'elk.layered.nodePlacement.strategy': 'SIMPLE',
				'elk.spacing.nodeNode': 80,
				'elk.spacing.edgeNode': 40,
			};

		case 'elk.force':
			return {
				...baseOptions,
				'elk.force.temperature': 0.001,
				'elk.force.iterations': 300,
				'elk.force.repulsivePower': 0.5,
				'elk.spacing.nodeNode': 80,
			};

		case 'elk.radial':
			return {
				...baseOptions,
				'elk.radial.radius': 200,
				'elk.radial.compactor': 'NONE',
				'elk.spacing.nodeNode': 80,
			};

		case 'org.eclipse.elk.circular':
			return {
				...baseOptions,
				'elk.spacing.nodeNode': 80,
			};

		case 'elk.box':
			return {
				...baseOptions,
				'elk.box.packingMode': 'SIMPLE',
				'elk.spacing.nodeNode': 20,
			};

		case 'elk.mrtree':
			return {
				...baseOptions,
				'elk.mrtree.searchOrder': 'DFS',
				'elk.spacing.nodeNode': 80,
				'elk.spacing.nodeNodeBetweenLayers': 150,
			};

		case 'elk.stress':
			return {
				...baseOptions,
				'elk.stress.iterations': 300,
				'elk.spacing.nodeNode': 80,
			};

		case 'elk.random':
			return {
				...baseOptions,
				'elk.random.seed': 1,
				'elk.spacing.nodeNode': 80,
			};

		default:
			return baseOptions;
	}
};

// Dynamically import ELK.js to avoid SSR issues
const getELKInstance = async (): Promise<any> => {
	if (typeof window === 'undefined') {
		// Server-side: return null, layout will be skipped
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

// Validate input data
const validateLayoutInput = (nodes: AppNode[], edges: AppEdge[]): void => {
	if (!Array.isArray(nodes)) {
		throw new Error('Nodes must be an array');
	}

	if (!Array.isArray(edges)) {
		throw new Error('Edges must be an array');
	}

	// Check for duplicate node IDs
	const nodeIds = nodes.map((n) => n.id);
	const duplicateNodes = nodeIds.filter(
		(id, index) => nodeIds.indexOf(id) !== index
	);

	if (duplicateNodes.length > 0) {
		throw new Error(`Duplicate node IDs found: ${duplicateNodes.join(', ')}`);
	}

	// Validate edge references
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
		// Validate input
		validateLayoutInput(nodes, edges);

		if (nodes.length === 0) {
			return { nodes: [], edges: [] };
		}

		// Transform to ELK format
		const elkGraph = transformToELKGraph(nodes, edges);

		// Prepare layout options
		const defaultOptions = getDefaultLayoutOptions(
			config.algorithm,
			config.direction || 'TB'
		);
		const layoutOptions = {
			...defaultOptions,
			...config.layoutOptions,
		};

		// Create ELK instance (dynamic import for Next.js compatibility)
		const elk = await getELKInstance();

		if (!elk) {
			throw new Error('ELK.js not available (likely server-side rendering)');
		}

		// Perform layout
		const layoutedGraph = await elk.layout(elkGraph, {
			layoutOptions,
		});

		// Transform back to React Flow format
		const result = transformFromELKGraph(layoutedGraph);

		return result;
	} catch (error) {
		console.error('ELK layout failed:', error);
		throw new Error(
			`Layout failed: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}
};

// Utility function for quick directional layouts
export const applyDirectionalLayout = async (
	nodes: AppNode[],
	edges: AppEdge[],
	direction: LayoutDirection
): Promise<LayoutResult> => {
	return layoutWithELK(nodes, edges, {
		algorithm: 'elk.layered',
		direction,
		useWorker: false,
	});
};

// Get ELK algorithm presets with configurations
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
				layoutOptions: {
					'elk.direction': 'DOWN',
					'elk.layered.spacing.nodeNodeBetweenLayers': 150,
					'elk.layered.spacing.nodeNode': 80,
				},
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
				layoutOptions: {
					'elk.direction': 'RIGHT',
					'elk.layered.spacing.nodeNodeBetweenLayers': 150,
					'elk.layered.spacing.nodeNode': 80,
				},
			},
		},
		{
			id: 'elk-layered-bt',
			name: 'Layered (Bottom-Top)',
			description: 'Hierarchical layout flowing from bottom to top',
			category: 'hierarchical' as const,
			config: {
				algorithm: 'elk.layered' as ELKAlgorithm,
				direction: 'BT' as LayoutDirection,
				layoutOptions: {
					'elk.direction': 'UP',
					'elk.layered.spacing.nodeNodeBetweenLayers': 150,
					'elk.layered.spacing.nodeNode': 80,
				},
			},
		},
		{
			id: 'elk-layered-rl',
			name: 'Layered (Right-Left)',
			description: 'Hierarchical layout flowing from right to left',
			category: 'hierarchical' as const,
			config: {
				algorithm: 'elk.layered' as ELKAlgorithm,
				direction: 'RL' as LayoutDirection,
				layoutOptions: {
					'elk.direction': 'LEFT',
					'elk.layered.spacing.nodeNodeBetweenLayers': 150,
					'elk.layered.spacing.nodeNode': 80,
				},
			},
		},
		{
			id: 'elk-force',
			name: 'Force-Directed',
			description: 'Physics-based organic layout using force simulation',
			category: 'force' as const,
			config: {
				algorithm: 'elk.force' as ELKAlgorithm,
				layoutOptions: {
					'elk.force.temperature': 0.001,
					'elk.force.iterations': 300,
					'elk.force.repulsivePower': 0.5,
					'elk.spacing.nodeNode': 80,
				},
			},
		},
		{
			id: 'elk-radial',
			name: 'Radial',
			description: 'Radial tree arrangement from center outward',
			category: 'geometric' as const,
			config: {
				algorithm: 'elk.radial' as ELKAlgorithm,
				layoutOptions: {
					'elk.radial.radius': 200,
					'elk.radial.compactor': 'NONE',
					'elk.spacing.nodeNode': 80,
				},
			},
		},
		{
			id: 'elk-circular',
			name: 'Circular',
			description: 'Circular node arrangement',
			category: 'geometric' as const,
			config: {
				algorithm: 'org.eclipse.elk.circular' as ELKAlgorithm,
				layoutOptions: {
					'elk.spacing.nodeNode': 80,
				},
			},
		},
		{
			id: 'elk-box',
			name: 'Box Packing',
			description: 'Efficient space utilization with box packing',
			category: 'geometric' as const,
			config: {
				algorithm: 'elk.box' as ELKAlgorithm,
				layoutOptions: {
					'elk.box.packingMode': 'SIMPLE',
					'elk.spacing.nodeNode': 20,
				},
			},
		},
		{
			id: 'elk-mrtree',
			name: 'Multi-Root Tree',
			description: 'Multi-rooted tree layout for forest structures',
			category: 'hierarchical' as const,
			config: {
				algorithm: 'elk.mrtree' as ELKAlgorithm,
				layoutOptions: {
					'elk.mrtree.searchOrder': 'DFS',
					'elk.spacing.nodeNode': 80,
					'elk.spacing.nodeNodeBetweenLayers': 150,
				},
			},
		},
		{
			id: 'elk-stress',
			name: 'Stress Minimization',
			description: 'Layout based on stress minimization algorithm',
			category: 'force' as const,
			config: {
				algorithm: 'elk.stress' as ELKAlgorithm,
				layoutOptions: {
					'elk.stress.iterations': 300,
					'elk.spacing.nodeNode': 80,
				},
			},
		},
		{
			id: 'elk-random',
			name: 'Random',
			description: 'Random node placement for testing purposes',
			category: 'custom' as const,
			config: {
				algorithm: 'elk.random' as ELKAlgorithm,
				layoutOptions: {
					'elk.random.seed': 1,
					'elk.spacing.nodeNode': 80,
				},
			},
		},
	];
};

// Cache for layout results to improve performance
const layoutCache = new Map<string, LayoutResult>();

// Generate cache key for layout operations
const getCacheKey = (
	nodes: AppNode[],
	edges: AppEdge[],
	algorithm: ELKAlgorithm,
	direction?: LayoutDirection,
	options?: Record<string, any>
): string => {
	const nodeData = nodes
		.map((n) => `${n.id}:${n.width || 320}:${n.height || 100}`)
		.sort()
		.join(',');
	const edgeData = edges
		.map((e) => `${e.source}->${e.target}`)
		.sort()
		.join(',');

	return JSON.stringify({
		nodes: nodeData,
		edges: edgeData,
		algorithm,
		direction,
		options,
	});
};

// Cached layout function for better performance
export const layoutWithELKCached = async (
	nodes: AppNode[],
	edges: AppEdge[],
	config: {
		algorithm: ELKAlgorithm;
		direction?: LayoutDirection;
		layoutOptions?: Record<string, any>;
		useWorker?: boolean;
		useCache?: boolean;
	}
): Promise<LayoutResult> => {
	if (!config.useCache) {
		return layoutWithELK(nodes, edges, config);
	}

	const cacheKey = getCacheKey(
		nodes,
		edges,
		config.algorithm,
		config.direction,
		config.layoutOptions
	);

	if (layoutCache.has(cacheKey)) {
		return layoutCache.get(cacheKey)!;
	}

	const result = await layoutWithELK(nodes, edges, config);
	layoutCache.set(cacheKey, result);

	// Limit cache size to prevent memory issues
	if (layoutCache.size > 50) {
		const firstKey = layoutCache.keys().next().value;

		if (firstKey) {
			layoutCache.delete(firstKey);
		}
	}

	return result;
};

// Clear layout cache
export const clearLayoutCache = (): void => {
	layoutCache.clear();
};
