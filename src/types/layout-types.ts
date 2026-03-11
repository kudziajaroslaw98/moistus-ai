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
export const SUPPORTED_LAYOUT_DIRECTIONS = [
	'LEFT_RIGHT',
	'TOP_BOTTOM',
] as const;

export type LayoutDirection = (typeof SUPPORTED_LAYOUT_DIRECTIONS)[number];
export type LayoutAnimationReason = 'full' | 'local';

export function normalizeLayoutDirection(
	direction: string | null | undefined
): LayoutDirection | null {
	switch (direction) {
		case 'LEFT_RIGHT':
		case 'RIGHT_LEFT':
			return 'LEFT_RIGHT';
		case 'TOP_BOTTOM':
		case 'BOTTOM_TOP':
		case 'RADIAL':
			return 'TOP_BOTTOM';
		default:
			return null;
	}
}

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
	movableNodeIds?: Set<string>; // If provided, only these nodes are movable in local layout
	anchorNodeIds?: Set<string>; // If provided, these nodes are fixed anchors in local layout
	collisionProtectedNodeIds?: Set<string>; // If provided, these nodes may be branch-shifted during local collision recovery
	localLayoutAlpha?: number; // Smoothing factor for movable nodes
}

// Layout slice state and actions (for Zustand)
export interface LayoutSlice {
	// State
	layoutConfig: LayoutConfig;
	isLayouting: boolean;
	layoutError: string | null;
	lastLayoutTimestamp: number;
	layoutAnimationVersion: number;
	layoutAnimationReason: LayoutAnimationReason | null;
	animatedNodeIds: string[];
	animatedEdgeIds: string[];

	// Actions
	setLayoutConfig: (config: Partial<LayoutConfig>) => void;
	applyLayout: (direction?: LayoutDirection) => Promise<void>;
	applyLayoutToSelected: () => Promise<void>;
	applyLayoutAroundNode: (nodeId: string, opts?: { radius?: number; alpha?: number }) => Promise<void>;
	queueLocalLayoutOnResize: (nodeId: string) => void;
	clearQueuedLocalLayoutOnResize: (nodeId: string) => void;
	runQueuedLocalLayoutOnResize: (nodeId: string) => Promise<void>;
	resetLayoutConfig: () => void;
}
