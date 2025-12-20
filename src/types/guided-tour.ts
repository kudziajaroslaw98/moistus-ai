/**
 * Guided Tour Types
 *
 * Type definitions for the Prezi-style guided tour feature.
 * Replaces the old presentation mode with canvas-based navigation.
 */

/** A saved tour path with ordered node IDs */
export interface TourPath {
	id: string;
	name: string;
	nodeIds: string[];
	createdAt: Date;
}

/** Options for starting a tour */
export interface StartTourOptions {
	/** Custom path of node IDs (overrides auto-ordering) */
	path?: string[];
	/** Start from a specific node (for auto-ordering) */
	startNodeId?: string;
	/** Use a saved path by ID */
	savedPathId?: string;
}

/** Current tour stop information */
export interface TourStop {
	nodeId: string;
	index: number;
	total: number;
	title: string;
	content: string | null;
	nodeType: string;
}

/** Visibility levels for spotlight effect */
export type SpotlightVisibility = 'focused' | 'connected' | 'dimmed';

/** Node spotlight state for rendering */
export interface NodeSpotlightState {
	visibility: SpotlightVisibility;
	opacity: number; // 1.0 for focused, 0.6 for connected, 0.2 for dimmed
}

/** Guided tour state */
export interface GuidedTourState {
	// Core tour state
	isTourActive: boolean;
	tourPath: string[]; // Ordered node IDs
	currentPathIndex: number;

	// Path building mode
	isPathEditMode: boolean;
	pendingPath: string[]; // Path being built (before saving)
	savedPaths: TourPath[];

	// Display options
	spotlightNodeId: string | null;
	showInfoBar: boolean;
	autoAdvanceEnabled: boolean;
	autoAdvanceDelay: number; // Seconds between auto-advances
}

/** Guided tour actions */
export interface GuidedTourActions {
	// Tour control
	startTour: (options?: StartTourOptions) => void;
	stopTour: () => void;
	nextStop: () => void;
	prevStop: () => void;
	goToStop: (index: number) => void;

	// Path building
	enterPathEditMode: () => void;
	exitPathEditMode: () => void;
	addNodeToPath: (nodeId: string) => void;
	removeNodeFromPath: (nodeId: string) => void;
	clearPendingPath: () => void;
	savePath: (name: string) => void;
	deletePath: (pathId: string) => void;
	reorderPath: (fromIndex: number, toIndex: number) => void;

	// Display
	toggleInfoBar: () => void;
	setAutoAdvance: (enabled: boolean, delay?: number) => void;

	// Computed
	getCurrentStop: () => TourStop | null;
	getTotalStops: () => number;
	getProgress: () => number; // 0 to 1
	getNodeSpotlightState: (nodeId: string) => NodeSpotlightState;
	isNodeInCurrentPath: (nodeId: string) => boolean;
}

/** Combined slice type */
export interface GuidedTourSlice extends GuidedTourState, GuidedTourActions {}

/** Default state values */
export const INITIAL_GUIDED_TOUR_STATE: GuidedTourState = {
	isTourActive: false,
	tourPath: [],
	currentPathIndex: 0,
	isPathEditMode: false,
	pendingPath: [],
	savedPaths: [],
	spotlightNodeId: null,
	showInfoBar: true,
	autoAdvanceEnabled: false,
	autoAdvanceDelay: 5,
};

/** Spotlight opacity values */
export const SPOTLIGHT_OPACITY = {
	focused: 1.0,
	connected: 0.6,
	dimmed: 0.2,
} as const;
