/**
 * Guided Tour Slice
 *
 * Manages Prezi-style guided tour state for navigating mind maps.
 * Replaces the old presentation mode with canvas-based zoom navigation.
 */

import type { AppNode } from '@/types/app-node';
import type {
	GuidedTourSlice,
	GuidedTourState,
	NodeSpotlightState,
	StartTourOptions,
	TourPath,
	TourStop,
} from '@/types/guided-tour';
import { INITIAL_GUIDED_TOUR_STATE, SPOTLIGHT_OPACITY } from '@/types/guided-tour';
import type { StateCreator } from 'zustand';
import type { AppState } from '../app-state';

/**
 * Calculate angle from parent to child node (clockwise from 12 o'clock)
 * Returns angle in radians [0, 2π)
 */
function getAngleFromParent(parent: AppNode, child: AppNode): number {
	const dx = child.position.x - parent.position.x;
	const dy = child.position.y - parent.position.y;
	// atan2(dx, -dy) gives angle from 12 o'clock position, clockwise
	const angle = Math.atan2(dx, -dy);
	// Normalize to [0, 2π)
	return (angle + 2 * Math.PI) % (2 * Math.PI);
}

/**
 * Sort nodes by position based on layout direction
 */
function sortRootsByPosition(
	nodes: AppNode[],
	layoutDirection: string
): AppNode[] {
	return [...nodes].sort((a, b) => {
		switch (layoutDirection) {
			case 'LEFT_RIGHT':
			case 'RIGHT_LEFT':
				// Sort by Y (top-to-bottom), then X
				return a.position.y - b.position.y || a.position.x - b.position.x;
			case 'TOP_BOTTOM':
			case 'BOTTOM_TOP':
				// Sort by X (left-to-right), then Y
				return a.position.x - b.position.x || a.position.y - b.position.y;
			case 'RADIAL':
			default:
				// Sort by distance from center (closest first)
				const centerX = nodes.reduce((sum, n) => sum + n.position.x, 0) / nodes.length;
				const centerY = nodes.reduce((sum, n) => sum + n.position.y, 0) / nodes.length;
				const distA = Math.hypot(a.position.x - centerX, a.position.y - centerY);
				const distB = Math.hypot(b.position.x - centerX, b.position.y - centerY);
				return distA - distB;
		}
	});
}

/**
 * Build ordered path using angle-based sorting (depth-first traversal)
 */
function buildDefaultPath(
	nodes: AppNode[],
	edges: { source: string; target: string }[],
	layoutDirection: string,
	startNodeId?: string
): string[] {
	if (nodes.length === 0) return [];

	// Build adjacency map: parent -> children
	const childrenMap = new Map<string, string[]>();
	const targetIds = new Set<string>();

	edges.forEach((edge) => {
		targetIds.add(edge.target);
		const children = childrenMap.get(edge.source) || [];
		children.push(edge.target);
		childrenMap.set(edge.source, children);
	});

	// Node lookup
	const nodeMap = new Map(nodes.map((n) => [n.id, n]));

	// Find root nodes (no incoming edges) or use specified start node
	let rootNodes: AppNode[];
	if (startNodeId) {
		const startNode = nodeMap.get(startNodeId);
		rootNodes = startNode ? [startNode] : [];
	} else {
		rootNodes = nodes.filter((n) => !targetIds.has(n.id) && n.type !== 'ghostNode');
	}

	// Sort roots by layout-aware position
	rootNodes = sortRootsByPosition(rootNodes, layoutDirection);

	// If no roots found, use all non-ghost nodes sorted by position
	if (rootNodes.length === 0) {
		rootNodes = sortRootsByPosition(
			nodes.filter((n) => n.type !== 'ghostNode'),
			layoutDirection
		);
	}

	// Depth-first traversal with angle-sorted children
	const visited = new Set<string>();
	const path: string[] = [];

	function traverse(nodeId: string, parentNode?: AppNode) {
		if (visited.has(nodeId)) return;

		const node = nodeMap.get(nodeId);
		if (!node || node.type === 'ghostNode') return;

		visited.add(nodeId);
		path.push(nodeId);

		// Get and sort children by angle from this node
		const childIds = childrenMap.get(nodeId) || [];
		const sortedChildIds = [...childIds].sort((aId, bId) => {
			const aNode = nodeMap.get(aId);
			const bNode = nodeMap.get(bId);
			if (!aNode || !bNode) return 0;
			return getAngleFromParent(node, aNode) - getAngleFromParent(node, bNode);
		});

		// Recurse into children
		for (const childId of sortedChildIds) {
			traverse(childId, node);
		}
	}

	// Start from each root
	for (const root of rootNodes) {
		traverse(root.id);
	}

	return path;
}

/**
 * Extract title from node
 */
function extractNodeTitle(node: AppNode): string {
	if (node.data?.metadata?.title) {
		return String(node.data.metadata.title);
	}
	if (node.data?.content) {
		const firstLine = node.data.content.split('\n')[0];
		return firstLine.length > 50 ? firstLine.slice(0, 50) + '...' : firstLine;
	}
	return 'Untitled';
}

/**
 * Generate unique path ID
 */
function generatePathId(): string {
	return `path-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const createGuidedTourSlice: StateCreator<
	AppState,
	[],
	[],
	GuidedTourSlice
> = (set, get) => ({
	...INITIAL_GUIDED_TOUR_STATE,

	// ─────────────────────────────────────────────────────────────
	// Tour Control
	// ─────────────────────────────────────────────────────────────

	startTour: (options?: StartTourOptions) => {
		const { nodes, edges, layoutConfig, savedPaths } = get();

		let tourPath: string[];

		if (options?.savedPathId) {
			// Use saved path
			const savedPath = savedPaths.find((p) => p.id === options.savedPathId);
			if (savedPath) {
				// Filter out nodes that no longer exist
				tourPath = savedPath.nodeIds.filter((id) => nodes.some((n) => n.id === id));
			} else {
				console.warn('Saved path not found:', options.savedPathId);
				return;
			}
		} else if (options?.path) {
			// Use provided custom path
			tourPath = options.path.filter((id) => nodes.some((n) => n.id === id));
		} else {
			// Build auto path
			tourPath = buildDefaultPath(nodes, edges, layoutConfig.direction, options?.startNodeId);
		}

		if (tourPath.length === 0) {
			console.warn('No nodes to tour');
			return;
		}

		// Find starting index if startNodeId specified
		let startIndex = 0;
		if (options?.startNodeId) {
			const idx = tourPath.indexOf(options.startNodeId);
			if (idx !== -1) startIndex = idx;
		}

		set({
			isTourActive: true,
			tourPath,
			currentPathIndex: startIndex,
			spotlightNodeId: tourPath[startIndex],
			isPathEditMode: false,
		});
	},

	stopTour: () => {
		set({
			isTourActive: false,
			tourPath: [],
			currentPathIndex: 0,
			spotlightNodeId: null,
		});
	},

	nextStop: () => {
		const { currentPathIndex, tourPath } = get();
		if (currentPathIndex < tourPath.length - 1) {
			const newIndex = currentPathIndex + 1;
			set({
				currentPathIndex: newIndex,
				spotlightNodeId: tourPath[newIndex],
			});
		}
	},

	prevStop: () => {
		const { currentPathIndex, tourPath } = get();
		if (currentPathIndex > 0) {
			const newIndex = currentPathIndex - 1;
			set({
				currentPathIndex: newIndex,
				spotlightNodeId: tourPath[newIndex],
			});
		}
	},

	goToStop: (index: number) => {
		const { tourPath } = get();
		if (index >= 0 && index < tourPath.length) {
			set({
				currentPathIndex: index,
				spotlightNodeId: tourPath[index],
			});
		}
	},

	// ─────────────────────────────────────────────────────────────
	// Path Building
	// ─────────────────────────────────────────────────────────────

	enterPathEditMode: () => {
		set({
			isPathEditMode: true,
			pendingPath: [],
			isTourActive: false,
		});
	},

	exitPathEditMode: () => {
		set({
			isPathEditMode: false,
			pendingPath: [],
		});
	},

	addNodeToPath: (nodeId: string) => {
		const { pendingPath, nodes } = get();
		// Don't add if already in path or node doesn't exist
		if (pendingPath.includes(nodeId)) return;
		if (!nodes.some((n) => n.id === nodeId)) return;

		set({ pendingPath: [...pendingPath, nodeId] });
	},

	removeNodeFromPath: (nodeId: string) => {
		const { pendingPath } = get();
		set({ pendingPath: pendingPath.filter((id) => id !== nodeId) });
	},

	clearPendingPath: () => {
		set({ pendingPath: [] });
	},

	savePath: (name: string) => {
		const { pendingPath, savedPaths } = get();
		if (pendingPath.length === 0) return;

		const newPath: TourPath = {
			id: generatePathId(),
			name: name.trim() || 'Untitled Path',
			nodeIds: [...pendingPath],
			createdAt: new Date(),
		};

		set({
			savedPaths: [...savedPaths, newPath],
			pendingPath: [],
			isPathEditMode: false,
		});
	},

	deletePath: (pathId: string) => {
		const { savedPaths } = get();
		set({ savedPaths: savedPaths.filter((p) => p.id !== pathId) });
	},

	reorderPath: (fromIndex: number, toIndex: number) => {
		const { pendingPath } = get();
		if (fromIndex < 0 || fromIndex >= pendingPath.length) return;
		if (toIndex < 0 || toIndex >= pendingPath.length) return;

		const newPath = [...pendingPath];
		const [removed] = newPath.splice(fromIndex, 1);
		newPath.splice(toIndex, 0, removed);

		set({ pendingPath: newPath });
	},

	// ─────────────────────────────────────────────────────────────
	// Display Options
	// ─────────────────────────────────────────────────────────────

	toggleInfoBar: () => {
		set((state) => ({ showInfoBar: !state.showInfoBar }));
	},

	setAutoAdvance: (enabled: boolean, delay?: number) => {
		set({
			autoAdvanceEnabled: enabled,
			...(delay !== undefined && { autoAdvanceDelay: Math.max(1, Math.min(30, delay)) }),
		});
	},

	// ─────────────────────────────────────────────────────────────
	// Computed Values
	// ─────────────────────────────────────────────────────────────

	getCurrentStop: (): TourStop | null => {
		const { isTourActive, tourPath, currentPathIndex, nodes } = get();
		if (!isTourActive || tourPath.length === 0) return null;

		const nodeId = tourPath[currentPathIndex];
		const node = nodes.find((n) => n.id === nodeId);
		if (!node) return null;

		return {
			nodeId,
			index: currentPathIndex,
			total: tourPath.length,
			title: extractNodeTitle(node),
			content: node.data?.content || null,
			nodeType: node.type || 'defaultNode',
		};
	},

	getTotalStops: (): number => {
		return get().tourPath.length;
	},

	getProgress: (): number => {
		const { currentPathIndex, tourPath } = get();
		if (tourPath.length === 0) return 0;
		return (currentPathIndex + 1) / tourPath.length;
	},

	getNodeSpotlightState: (nodeId: string): NodeSpotlightState => {
		const { isTourActive, spotlightNodeId, edges } = get();

		if (!isTourActive || !spotlightNodeId) {
			return { visibility: 'focused', opacity: SPOTLIGHT_OPACITY.focused };
		}

		if (nodeId === spotlightNodeId) {
			return { visibility: 'focused', opacity: SPOTLIGHT_OPACITY.focused };
		}

		// Check if connected to spotlight node
		const isConnected = edges.some(
			(e) =>
				(e.source === spotlightNodeId && e.target === nodeId) ||
				(e.target === spotlightNodeId && e.source === nodeId)
		);

		if (isConnected) {
			return { visibility: 'connected', opacity: SPOTLIGHT_OPACITY.connected };
		}

		return { visibility: 'dimmed', opacity: SPOTLIGHT_OPACITY.dimmed };
	},

	isNodeInCurrentPath: (nodeId: string): boolean => {
		const { tourPath, pendingPath, isTourActive, isPathEditMode } = get();
		if (isPathEditMode) {
			return pendingPath.includes(nodeId);
		}
		if (isTourActive) {
			return tourPath.includes(nodeId);
		}
		return false;
	},
});
