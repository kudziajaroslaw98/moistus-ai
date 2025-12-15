/**
 * Layout System Types
 * ELK.js-based automatic layout for mind map nodes
 */

// Re-export ELK types for use in converters
export type {
	ElkNode,
	ElkExtendedEdge as ElkEdge,
	ElkEdgeSection,
	ElkLabel,
	LayoutOptions as ElkLayoutOptions,
} from 'elkjs/lib/elk-api';

// Layout direction options
export type LayoutDirection =
	| 'LEFT_RIGHT'
	| 'RIGHT_LEFT'
	| 'TOP_BOTTOM'
	| 'BOTTOM_TOP'
	| 'RADIAL';

// Layout algorithm options (ELK algorithms)
export type LayoutAlgorithm = 'layered' | 'stress' | 'force' | 'radial';

// Configuration for layout operations
export interface LayoutConfig {
	direction: LayoutDirection;
	nodeSpacing: number; // Spacing between nodes at same level
	layerSpacing: number; // Spacing between hierarchy levels
	animateTransition: boolean; // Whether to animate position changes
}

// Default configuration values
export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
	direction: 'LEFT_RIGHT',
	nodeSpacing: 50,
	layerSpacing: 100,
	animateTransition: true,
};

// Result of a layout operation
export interface LayoutResult {
	nodes: import('@/types/app-node').AppNode[];
	edges: import('@/types/app-edge').AppEdge[];
}

// Bounding box for selected nodes layout
export interface BoundingBox {
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
	centerX: number;
	centerY: number;
	width: number;
	height: number;
}

// Parameters for running ELK layout
export interface ElkLayoutParams {
	nodes: import('@/types/app-node').AppNode[];
	edges: import('@/types/app-edge').AppEdge[];
	config: LayoutConfig;
	selectedNodeIds?: Set<string>; // If provided, only layout these nodes
}

// Layout slice state and actions (for Zustand)
export interface LayoutSlice {
	// State
	layoutConfig: LayoutConfig;
	isLayouting: boolean;
	layoutError: string | null;
	lastLayoutTimestamp: number;

	// Actions
	setLayoutConfig: (config: Partial<LayoutConfig>) => void;
	applyLayout: (direction?: LayoutDirection) => Promise<void>;
	applyLayoutToSelected: () => Promise<void>;
	resetLayoutConfig: () => void;
}
