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

// Get default dimensions based on node type
const getNodeTypeDimensions = (nodeType: string | undefined): { width: number; height: number } => {
	// Define minimum dimensions for each node type
	// IMPORTANT: For layout purposes, we cap heights to prevent dominating the layout
	const nodeTypeDimensions: Record<string, { width: number; height: number }> = {
		// Compact nodes
		annotationNode: { width: 280, height: 60 },
		// Standard nodes
		defaultNode: { width: 320, height: 80 },
		textNode: { width: 320, height: 90 },
		// Content-heavy nodes - capped heights for layout
		taskNode: { width: 340, height: 100 }, // Capped from 150
		questionNode: { width: 340, height: 100 }, // Capped from 140
		codeNode: { width: 380, height: 120 }, // Capped from 200
		resourceNode: { width: 340, height: 80 },
		imageNode: { width: 320, height: 140 }, // Capped from 240
		// Container nodes
		groupNode: { width: 380, height: 150 }, // Capped from 300
		referenceNode: { width: 320, height: 80 },
	};

	return nodeTypeDimensions[nodeType || 'defaultNode'] || nodeTypeDimensions.defaultNode;
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

	const elkNodes: ELKNode[] = nodes.map((node) => {
		const fallbackDimensions = getNodeTypeDimensions(node.data?.node_type);
		const nodeType = node.data?.node_type || 'defaultNode';

		// Use measured dimensions if available, otherwise use type-specific defaults
		// Add minimal padding to measured dimensions
		const padding = 5;

		// For layout purposes, we cap heights to prevent tall nodes from breaking the layout
		// This is especially important for task nodes with many items
		let width = node.width
			? Math.max(node.width + padding, fallbackDimensions.width)
			: fallbackDimensions.width;

		let height = node.height
			? Math.max(node.height + padding, fallbackDimensions.height)
			: fallbackDimensions.height;

		return {
			id: node.id,
			width,
			height,
			// Preserve existing position as initial position hint
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

// Helper to get capped height for layout calculations
const getCappedNodeHeight = (nodeType: string, actualHeight: number): number => {
	const maxHeights: Record<string, number> = {
		taskNode: 120,
		questionNode: 120,
		codeNode: 140,
		imageNode: 160,
		groupNode: 180,
	};

	const maxHeight = maxHeights[nodeType];
	return maxHeight ? Math.min(actualHeight, maxHeight) : actualHeight;
};

// Get adaptive spacing based on node types in the graph
const getAdaptiveSpacing = (nodes: AppNode[], direction?: LayoutDirection): { horizontal: number; vertical: number; layer: number } => {
	// Count node types for better analysis
	const nodeTypeCounts: Record<string, number> = {};
	let maxNodeHeight = 0;
	let maxNodeWidth = 0;
	let totalHeight = 0;
	let totalWidth = 0;

	nodes.forEach(node => {
		const nodeType = node.data?.node_type || 'defaultNode';
		nodeTypeCounts[nodeType] = (nodeTypeCounts[nodeType] || 0) + 1;

		const dimensions = getNodeTypeDimensions(nodeType);
		const nodeHeight = node.height || dimensions.height;
		const nodeWidth = node.width || dimensions.width;

		maxNodeHeight = Math.max(maxNodeHeight, nodeHeight);
		maxNodeWidth = Math.max(maxNodeWidth, nodeWidth);
		totalHeight += nodeHeight;
		totalWidth += nodeWidth;
	});

	const avgHeight = totalHeight / Math.max(nodes.length, 1);
	const avgWidth = totalWidth / Math.max(nodes.length, 1);

	// Check what types of nodes we have
	const hasTaskNodes = nodeTypeCounts['taskNode'] > 0;
	const hasCodeNodes = nodeTypeCounts['codeNode'] > 0;
	const hasImageNodes = nodeTypeCounts['imageNode'] > 0;
	const hasGroupNodes = nodeTypeCounts['groupNode'] > 0;

	// Base spacing values - adjust based on direction
	const isHorizontal = direction === 'LR' || direction === 'RL';

	// Start with reasonable defaults based on average node dimensions
	let horizontalSpacing = 12; // Edge to node spacing
	let verticalSpacing = isHorizontal ? 25 : 30; // Space between nodes in same layer
	let layerSpacing = isHorizontal ? 70 : 55; // Space between hierarchical levels

	// Calculate the tallest node height for this graph (considering caps)
	let effectiveMaxHeight = 0;
	let effectiveAvgHeight = 0;
	let heightSum = 0;
	nodes.forEach(node => {
		const nodeType = node.data?.node_type || 'defaultNode';
		const dimensions = getNodeTypeDimensions(nodeType);
		const cappedHeight = getCappedNodeHeight(nodeType, node.height || dimensions.height);
		effectiveMaxHeight = Math.max(effectiveMaxHeight, cappedHeight);
		heightSum += cappedHeight;
	});
	effectiveAvgHeight = heightSum / Math.max(nodes.length, 1);

	// For horizontal layouts, optimize for left-to-right reading
	if (isHorizontal) {
		// Vertical spacing between nodes in same layer - tight but no overlap
		// Use average height as base, not max (to avoid too much space for outliers)
		verticalSpacing = Math.round(effectiveAvgHeight * 0.15);
		verticalSpacing = Math.max(verticalSpacing, 15); // Minimum 15px
		verticalSpacing = Math.min(verticalSpacing, 30); // Cap at 30px

		// Layer spacing - enough to read comfortably but compact
		layerSpacing = Math.round(avgWidth * 0.15);
		layerSpacing = Math.max(layerSpacing, 50); // Minimum 50px
		layerSpacing = Math.min(layerSpacing, 70); // Cap at 70px
	} else {
		// For vertical layouts
		verticalSpacing = Math.round(effectiveAvgHeight * 0.3);
		verticalSpacing = Math.max(verticalSpacing, 25);
		verticalSpacing = Math.min(verticalSpacing, 40);

		layerSpacing = Math.round(effectiveAvgHeight * 0.5);
		layerSpacing = Math.max(layerSpacing, 45);
		layerSpacing = Math.min(layerSpacing, 65);
	}

	// Adjust for specific node type concentrations
	if (hasTaskNodes) {
		const taskNodePercentage = nodeTypeCounts['taskNode'] / nodes.length;
		if (taskNodePercentage > 0.3) {
			// Task-heavy graph needs consistent spacing
			if (isHorizontal) {
				verticalSpacing = Math.max(verticalSpacing, 35);
				layerSpacing = Math.max(layerSpacing, 55);
			}
		}
	}

	// Code and image nodes need a bit more breathing room
	if (hasCodeNodes || hasImageNodes) {
		verticalSpacing = Math.max(verticalSpacing, isHorizontal ? 40 : 30);
		layerSpacing = Math.max(layerSpacing, 60);
	}

	// Group nodes need extra space for their children
	if (hasGroupNodes) {
		horizontalSpacing = Math.max(horizontalSpacing, 20);
		verticalSpacing = Math.max(verticalSpacing, 45);
		layerSpacing = Math.max(layerSpacing, 70);
	}

	// For very dense graphs, add minimal extra spacing
	if (nodes.length > 40) {
		verticalSpacing += 5;
		layerSpacing += 5;
	} else if (nodes.length < 10) {
		// For small graphs, we can afford more spacing for clarity
		verticalSpacing *= 1.2;
		layerSpacing *= 1.1;
	}

	return {
		horizontal: Math.round(horizontalSpacing),
		vertical: Math.round(verticalSpacing),
		layer: Math.round(layerSpacing)
	};
};

// Get default layout options for different ELK algorithms
const getDefaultLayoutOptions = (
	algorithm: ELKAlgorithm,
	direction: LayoutDirection = 'TB',
	nodes?: AppNode[]
): Record<string, any> => {
	const baseOptions = {
		'elk.algorithm': algorithm,
	};

	// Get adaptive spacing if nodes are provided
	const spacing = nodes ? getAdaptiveSpacing(nodes, direction) : { horizontal: 60, vertical: 80, layer: 150 };

	switch (algorithm) {
		case 'elk.layered':
			return {
				...baseOptions,
				'elk.direction': directionToELK(direction),
				// Layer spacing - distance between hierarchical levels
				'elk.layered.spacing.nodeNodeBetweenLayers': spacing.layer,
				// Node spacing within same layer
				'elk.layered.spacing.nodeNode': spacing.vertical,
				// Use NETWORK_SIMPLEX for better node positioning
				'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
				// Improve crossing minimization
				'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
				'elk.layered.crossingMinimization.greedySwitch': 'TWO_SIDED',
				// Better edge routing
				'elk.layered.edgeRouting.selfLoopPlacement': 'NORTH',
				// General spacing
				'elk.spacing.nodeNode': spacing.vertical,
				'elk.spacing.edgeNode': spacing.horizontal * 0.5,
				'elk.layered.spacing.edgeNodeBetweenLayers': spacing.layer * 0.3,
				'elk.layered.spacing.edgeEdgeBetweenLayers': spacing.horizontal * 0.3,
				// Compaction for better space utilization
				'elk.layered.compaction.connectedComponents': true,
				'elk.layered.highDegreeNodes.treatment': true,
				'elk.layered.highDegreeNodes.threshold': 5,
				// Port constraints for better edge connections
				'elk.port.borderOffset': 5,
			};

		case 'elk.force':
			return {
				...baseOptions,
				'elk.force.temperature': 0.001,
				'elk.force.iterations': 300,
				'elk.force.repulsivePower': 0.5,
				'elk.spacing.nodeNode': spacing.vertical,
			};

		case 'elk.radial':
			return {
				...baseOptions,
				'elk.radial.radius': Math.max(200, spacing.layer * 1.5),
				'elk.radial.compactor': 'NONE',
				'elk.spacing.nodeNode': spacing.vertical,
			};

		case 'org.eclipse.elk.circular':
			return {
				...baseOptions,
				'elk.spacing.nodeNode': spacing.vertical,
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
				'elk.spacing.nodeNode': spacing.vertical,
				'elk.spacing.nodeNodeBetweenLayers': spacing.layer,
			};

		case 'elk.stress':
			return {
				...baseOptions,
				'elk.stress.iterations': 300,
				'elk.spacing.nodeNode': spacing.vertical,
			};

		case 'elk.random':
			return {
				...baseOptions,
				'elk.random.seed': 1,
				'elk.spacing.nodeNode': spacing.vertical,
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

		// Prepare layout options with adaptive spacing
		// const defaultOptions = getDefaultLayoutOptions(
		// 	config.algorithm,
		// 	config.direction || 'TB',
		// 	nodes // Pass nodes for adaptive spacing calculation
		// );
		const layoutOptions = {
			// ...defaultOptions,
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
	// For mind maps, use optimized settings
	const adaptiveSpacing = getAdaptiveSpacing(nodes, direction);

	return layoutWithELK(nodes, edges, {
		algorithm: 'elk.layered',
		direction,
		layoutOptions: {
			// Core spacing configuration
			'elk.layered.spacing.nodeNodeBetweenLayers': '100',
			'elk.layered.spacing.nodeNode': '80',
			'elk.layered.spacing.edgeEdge': '40',
			'elk.layered.spacing.edgeNodeBetweenLayers': '40',

			// LINEAR_SEGMENTS for perfect alignment
			'elk.layered.nodePlacement.strategy': 'LINEAR_SEGMENTS',
			'elk.layered.nodePlacement.linearSegments.deflectionDampening': 0.1, // Stricter alignment
			// 'elk.layered.nodePlacement.favorStraightEdges': true,
			// 'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED', // Balance nodes in layer

			// Crossing minimization for cleaner edges
			// 'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
			// 'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
			// 'elk.layered.crossingMinimization.greedySwitch': 'TWO_SIDED',
			// 'elk.layered.crossingMinimization.semiInteractive': true,

			// Alignment for better vertical organization
			// 'elk.alignment': 'CENTER',
			// 'elk.contentAlignment': 'V_CENTER H_CENTER', // Center content in each node

			// Priority for hierarchical structure
			// 'elk.layered.priority.direction': 'OUTPUT_EDGES',
			// 'elk.layered.priority.straightness': 5, // Prioritize straight edges
			//
			 'org.eclipse.elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
    'org.eclipse.elk.layered.cycleBreaking.strategy': 'DEPTH_FIRST',

			// Compaction strategy for optimal space usage
			// 'elk.layered.compaction.connectedComponents': true,
			// 'elk.layered.compaction.postCompaction.strategy': direction === 'LR' ? 'LEFT' : 'UP',
			// 'elk.layered.compaction.postCompaction.constraints': 'QUADRATIC',

			// High quality settings
			'elk.layered.thoroughness': 15, // Increase for better quality
			'elk.layered.unnecessaryBendpoints': true, // Remove unnecessary bends

			// General spacing settings
			// 'elk.spacing.nodeNode': adaptiveSpacing.vertical,
			// 'elk.spacing.componentComponent': adaptiveSpacing.layer * 1.5,

    'spacing.componentComponent': '20',
			// 'elk.spacing.portPort': 3,

			// // Edge routing for cleaner paths
			// 'elk.edge.thickness': 2,
			// 'elk.layered.edgeRouting.orthogonal': true,

			// Padding
			'elk.padding': '[top=30,left=30,bottom=30,right=30]',
		},
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
					'elk.layered.spacing.nodeNodeBetweenLayers': 70,
					'elk.layered.spacing.nodeNode': 30,
					'elk.layered.spacing.edgeNodeBetweenLayers': 20,
					'elk.layered.spacing.edgeEdgeBetweenLayers': 10,
					'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
					'elk.layered.compaction.connectedComponents': true,
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
					'elk.layered.spacing.nodeNodeBetweenLayers': 80,
					'elk.layered.spacing.nodeNode': 30,
					'elk.layered.spacing.edgeNodeBetweenLayers': 20,
					'elk.layered.spacing.edgeEdgeBetweenLayers': 10,
					'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
					'elk.layered.compaction.connectedComponents': true,
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
					'elk.layered.spacing.nodeNodeBetweenLayers': 100,
					'elk.layered.spacing.nodeNode': 50,
					'elk.layered.spacing.edgeNodeBetweenLayers': 30,
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
					'elk.layered.spacing.nodeNodeBetweenLayers': 120,
					'elk.layered.spacing.nodeNode': 50,
					'elk.layered.spacing.edgeNodeBetweenLayers': 30,
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
					'elk.spacing.nodeNode': 60,
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
					'elk.radial.radius': 150,
					'elk.radial.compactor': 'NONE',
					'elk.spacing.nodeNode': 50,
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
					'elk.spacing.nodeNode': 50,
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
					'elk.padding': 15,
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
					'elk.spacing.nodeNode': 50,
					'elk.spacing.nodeNodeBetweenLayers': 100,
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
					'elk.spacing.nodeNode': 50,
					'elk.stress.desiredEdgeLength': 80,
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

// Layout density presets for user control
export type LayoutDensity = 'compact' | 'normal' | 'spacious' | 'comfortable';

export const getLayoutDensityMultiplier = (density: LayoutDensity): number => {
	switch (density) {
		case 'compact':
			return 0.7;
		case 'normal':
			return 1.0;
		case 'comfortable':
			return 1.3;
		case 'spacious':
			return 1.6;
		default:
			return 1.0;
	}
};

// Apply density to layout options
export const applyLayoutDensity = (
	layoutOptions: Record<string, any>,
	density: LayoutDensity
): Record<string, any> => {
	const multiplier = getLayoutDensityMultiplier(density);
	const adjustedOptions: Record<string, any> = {};

	for (const [key, value] of Object.entries(layoutOptions)) {
		// Apply multiplier to spacing-related options
		if (key.includes('spacing') || key.includes('radius') || key.includes('padding')) {
			adjustedOptions[key] = typeof value === 'number' ? Math.round(value * multiplier) : value;
		} else {
			adjustedOptions[key] = value;
		}
	}

	return adjustedOptions;
};
