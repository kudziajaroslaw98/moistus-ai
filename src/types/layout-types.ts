/**
 * Layout System Types
 * ELK.js-based automatic layout for mind map nodes
 */

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

// ELK.js graph types (for converter)
export interface ElkNode {
	id: string;
	x?: number;
	y?: number;
	width: number;
	height: number;
	layoutOptions?: Record<string, string | number | boolean>;
	children?: ElkNode[];
	edges?: ElkEdge[];
	labels?: ElkLabel[];
}

export interface ElkEdge {
	id: string;
	sources: string[];
	targets: string[];
	sections?: ElkEdgeSection[];
	layoutOptions?: Record<string, string | number | boolean>;
}

export interface ElkEdgeSection {
	id: string;
	startPoint: { x: number; y: number };
	endPoint: { x: number; y: number };
	bendPoints?: Array<{ x: number; y: number }>;
	incomingShape?: string;
	outgoingShape?: string;
}

export interface ElkLabel {
	id: string;
	text: string;
	x?: number;
	y?: number;
	width?: number;
	height?: number;
}

// ELK root graph (extends ElkNode with root-level properties)
export interface ElkGraph extends ElkNode {
	layoutOptions: Record<string, string | number | boolean>;
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
