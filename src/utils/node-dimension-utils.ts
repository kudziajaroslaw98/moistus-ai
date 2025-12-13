import { GRID_SIZE, ceilToGrid } from '@/constants/grid';
import type { AppNode } from '@/types/app-node';
import type { NodeData } from '@/types/node-data';

// Default dimension constants
export const NODE_DIMENSION_DEFAULTS = {
	MIN_WIDTH: 288,
	MIN_HEIGHT: 64,
	MAX_WIDTH: 800,
	DEFAULT_WIDTH: 320,
	DEFAULT_HEIGHT: 64,
} as const;

// Node-specific dimension overrides (no maxHeight - let content determine height)
export const NODE_TYPE_DIMENSIONS: Record<
	string,
	{ minHeight?: number; maxHeight?: number }
> = {
	taskNode: { minHeight: 112 }, // Tasks can grow with content
	codeNode: { minHeight: 112 }, // Code blocks grow with lines
	imageNode: { minHeight: 112 }, // Images need minimum height
	groupNode: { minHeight: 208 }, // Groups grow with children
	commentNode: { minHeight: 400, maxHeight: 400 }, // Fixed height with internal scrolling
} as const;

export interface NodeDimensions {
	width: number;
	height: number;
}

export interface DimensionConstraints {
	minWidth: number;
	minHeight: number;
	maxWidth: number;
	maxHeight?: number; // Optional - undefined means unlimited
}

/**
 * Get the dimension constraints for a specific node type
 */
export function getNodeConstraints(nodeType?: string): DimensionConstraints {
	const typeOverrides = nodeType ? NODE_TYPE_DIMENSIONS[nodeType] : {};

	return {
		minWidth: NODE_DIMENSION_DEFAULTS.MIN_WIDTH,
		// Ceil minHeight to GRID_SIZE for consistent 16px steps
		minHeight: ceilToGrid(
			typeOverrides?.minHeight || NODE_DIMENSION_DEFAULTS.MIN_HEIGHT,
			GRID_SIZE
		),
		maxWidth: NODE_DIMENSION_DEFAULTS.MAX_WIDTH,
		// Use type-specific maxHeight if defined, otherwise no limit
		maxHeight: typeOverrides?.maxHeight
			? ceilToGrid(typeOverrides.maxHeight, GRID_SIZE)
			: undefined,
	};
}

/**
 * Get unified dimensions for a node, respecting constraints
 * Priority: constrained measured → data dimensions → defaults
 */
export function getNodeDimensions(
	node: AppNode | NodeData | undefined,
	constraints?: Partial<DimensionConstraints>
): NodeDimensions {
	if (!node) {
		return {
			width: NODE_DIMENSION_DEFAULTS.DEFAULT_WIDTH,
			height: NODE_DIMENSION_DEFAULTS.DEFAULT_HEIGHT,
		};
	}

	// Determine if this is an AppNode or NodeData
	const isAppNode = 'measured' in node || 'position' in node;
	const nodeType = isAppNode
		? (node as AppNode).type || (node as AppNode).data?.node_type
		: (node as NodeData).node_type;

	// Get constraints for this node type
	const finalConstraints = {
		...getNodeConstraints(nodeType),
		...constraints,
	};

	// Extract dimensions based on node type
	let width: number;
	let height: number;

	if (isAppNode) {
		const appNode = node as AppNode;
		// Priority: measured → width/height props → data dimensions → defaults
		width =
			appNode.measured?.width ||
			appNode.width ||
			appNode.data?.width ||
			NODE_DIMENSION_DEFAULTS.DEFAULT_WIDTH;
		height =
			appNode.measured?.height ||
			appNode.height ||
			appNode.data?.height ||
			NODE_DIMENSION_DEFAULTS.DEFAULT_HEIGHT;
	} else {
		const nodeData = node as NodeData;
		// For NodeData, use data dimensions or defaults
		width = nodeData.width || NODE_DIMENSION_DEFAULTS.DEFAULT_WIDTH;
		height = nodeData.height || NODE_DIMENSION_DEFAULTS.DEFAULT_HEIGHT;
	}

	// Apply constraints
	return enforceConstraints({ width, height }, finalConstraints);
}

/**
 * Enforce dimension constraints
 */
export function enforceConstraints(
	dimensions: NodeDimensions,
	constraints: DimensionConstraints
): NodeDimensions {
	return {
		width: Math.min(
			Math.max(dimensions.width, constraints.minWidth),
			constraints.maxWidth
		),
		height: constraints.maxHeight
			? Math.min(
					Math.max(dimensions.height, constraints.minHeight),
					constraints.maxHeight
				)
			: Math.max(dimensions.height, constraints.minHeight), // No max limit
	};
}

/**
 * Check if dimensions are within constraints
 */
export function areDimensionsValid(
	dimensions: NodeDimensions,
	constraints: DimensionConstraints
): boolean {
	const widthValid =
		dimensions.width >= constraints.minWidth &&
		dimensions.width <= constraints.maxWidth;
	const heightValid =
		dimensions.height >= constraints.minHeight &&
		(constraints.maxHeight === undefined ||
			dimensions.height <= constraints.maxHeight);

	return widthValid && heightValid;
}

/**
 * Calculate auto height based on content
 * Returns suggested height based on content type and amount
 */
export function calculateAutoHeight(
	node: AppNode | NodeData,
	baseHeight: number = NODE_DIMENSION_DEFAULTS.DEFAULT_HEIGHT
): number {
	const isAppNode = 'measured' in node || 'position' in node;
	const data = isAppNode ? (node as AppNode).data : (node as NodeData);
	const nodeType = isAppNode
		? (node as AppNode).type || data?.node_type
		: data?.node_type;

	let calculatedHeight = baseHeight;

	// Calculate based on content
	if (data?.content) {
		// Estimate height based on content length and type
		const contentLength = data.content.length;
		const lineHeight = 20; // Approximate line height in pixels
		const charsPerLine = 40; // Approximate characters per line
		const estimatedLines = Math.ceil(contentLength / charsPerLine);
		const contentHeight = estimatedLines * lineHeight;

		calculatedHeight = Math.max(baseHeight, contentHeight + 40); // Add padding
	}

	// Node type specific calculations
	if (nodeType === 'taskNode' && data?.metadata?.tasks) {
		const taskCount = data.metadata.tasks.length;
		const taskHeight = 32; // Height per task item
		calculatedHeight = Math.max(calculatedHeight, 80 + taskCount * taskHeight);
	}

	if (nodeType === 'codeNode' && data?.content) {
		const lines = data.content.split('\n').length;
		const codeLineHeight = 18;
		calculatedHeight = Math.max(calculatedHeight, 100 + lines * codeLineHeight);
	}

	// Apply constraints (only minimum, no maximum)
	const constraints = getNodeConstraints(nodeType);
	return Math.max(calculatedHeight, constraints.minHeight);
}

/**
 * Check if dimensions have changed significantly
 * Useful for avoiding unnecessary updates
 */
export function haveDimensionsChanged(
	oldDimensions: NodeDimensions,
	newDimensions: NodeDimensions,
	threshold: number = 5
): boolean {
	return (
		Math.abs(oldDimensions.width - newDimensions.width) > threshold ||
		Math.abs(oldDimensions.height - newDimensions.height) > threshold
	);
}

/**
 * Normalize dimensions from various sources
 * Handles null/undefined values and applies defaults
 */
export function normalizeDimensions(
	width?: number | null,
	height?: number | null,
	nodeType?: string
): NodeDimensions {
	const constraints = getNodeConstraints(nodeType);

	return {
		width: width ?? NODE_DIMENSION_DEFAULTS.DEFAULT_WIDTH,
		height: height ?? NODE_DIMENSION_DEFAULTS.DEFAULT_HEIGHT,
	};
}

/**
 * Compute soft max height based on content height plus buffer
 * Returns undefined if content height is 0 (not yet rendered)
 *
 * @param contentHeight - The measured content height
 * @param buffer - Extra space above content (default 200px)
 * @param explicitMax - Optional explicit max that takes precedence
 */
export function computeSoftMaxHeight(
	contentHeight: number,
	buffer: number = 200,
	explicitMax?: number
): number | undefined {
	// If content hasn't rendered yet, use explicit max or undefined
	if (contentHeight === 0) return explicitMax;

	const softMax = ceilToGrid(contentHeight + buffer, GRID_SIZE);

	// If explicit max is set, use the smaller of the two
	return explicitMax !== undefined ? Math.min(softMax, explicitMax) : softMax;
}

/**
 * Get dimension aspect ratio
 */
export function getAspectRatio(dimensions: NodeDimensions): number {
	return dimensions.width / dimensions.height;
}

/**
 * Maintain aspect ratio when resizing
 */
export function maintainAspectRatio(
	newDimensions: Partial<NodeDimensions>,
	originalDimensions: NodeDimensions,
	constraints: DimensionConstraints
): NodeDimensions {
	const aspectRatio = getAspectRatio(originalDimensions);

	if (newDimensions.width !== undefined) {
		// Width changed, adjust height
		const height = newDimensions.width / aspectRatio;
		return enforceConstraints(
			{ width: newDimensions.width, height },
			constraints
		);
	} else if (newDimensions.height !== undefined) {
		// Height changed, adjust width
		const width = newDimensions.height * aspectRatio;
		return enforceConstraints(
			{ width, height: newDimensions.height },
			constraints
		);
	}

	return originalDimensions;
}
