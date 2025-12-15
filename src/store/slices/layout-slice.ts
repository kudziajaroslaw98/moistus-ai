/**
 * Layout Slice
 * Manages ELK.js-based automatic layout state and actions
 */

import { runElkLayout } from '@/helpers/layout';
import {
	DEFAULT_LAYOUT_CONFIG,
	LayoutConfig,
	LayoutDirection,
	LayoutSlice,
} from '@/types/layout-types';
import { toast } from 'sonner';
import { StateCreator } from 'zustand';
import { AppState } from '../app-state';

export const createLayoutSlice: StateCreator<AppState, [], [], LayoutSlice> = (
	set,
	get
) => ({
	// Initial state
	layoutConfig: DEFAULT_LAYOUT_CONFIG,
	isLayouting: false,
	layoutError: null,
	lastLayoutTimestamp: 0,

	// Actions
	setLayoutConfig: (config: Partial<LayoutConfig>) => {
		set((state) => ({
			layoutConfig: { ...state.layoutConfig, ...config },
		}));
	},

	applyLayout: async (direction?: LayoutDirection) => {
		const {
			nodes,
			edges,
			setNodes,
			setEdges,
			addStateToHistory,
			persistDeltaEvent,
			layoutConfig,
			isLayouting,
			setLoadingStates,
			selectedNodes,
		} = get();

		// Prevent concurrent layouts
		if (isLayouting) {
			toast.info('Layout already in progress...');
			return;
		}

		// Skip if no nodes
		if (nodes.length === 0) {
			toast.info('No nodes to layout');
			return;
		}

		// Capture previous state for history (before any modifications)
		const prevNodes = [...nodes];
		const prevEdges = [...edges];

		// Determine layout config
		const effectiveConfig: LayoutConfig = {
			...layoutConfig,
			direction: direction ?? layoutConfig.direction,
		};

		// Set loading state
		set({ isLayouting: true, layoutError: null });
		setLoadingStates?.({ isStateLoading: true });

		// Show loading toast
		const toastId = toast.loading(
			`Applying ${getDirectionLabel(effectiveConfig.direction)} layout...`
		);

		try {
			// Run layout in Web Worker
			const result = await runElkLayout({
				nodes,
				edges,
				config: effectiveConfig,
			});

			// Batch update state (single update, not per-node)
			setNodes(result.nodes);
			setEdges(result.edges);

			// Record to history as single action for undo/redo
			addStateToHistory('applyLayout', {
				nodes: result.nodes,
				edges: result.edges,
			});

			// Persist delta to database
			await persistDeltaEvent(
				'applyLayout',
				{ nodes: prevNodes, edges: prevEdges },
				{ nodes: result.nodes, edges: result.edges }
			);

			// Update config if direction changed
			if (direction && direction !== layoutConfig.direction) {
				set({ layoutConfig: { ...layoutConfig, direction } });
			}

			set({ lastLayoutTimestamp: Date.now() });

			toast.success('Layout applied successfully', { id: toastId });
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Layout failed';
			set({ layoutError: errorMessage });
			toast.error(errorMessage, { id: toastId });
			console.error('Layout error:', error);
		} finally {
			set({ isLayouting: false });
			setLoadingStates?.({ isStateLoading: false });
		}
	},

	applyLayoutToSelected: async () => {
		const {
			nodes,
			edges,
			setNodes,
			setEdges,
			addStateToHistory,
			persistDeltaEvent,
			layoutConfig,
			isLayouting,
			setLoadingStates,
			selectedNodes,
		} = get();

		// Prevent concurrent layouts
		if (isLayouting) {
			toast.info('Layout already in progress...');
			return;
		}

		// Need at least 2 selected nodes
		if (selectedNodes.length < 2) {
			toast.info('Select at least 2 nodes to layout');
			return;
		}

		// Capture previous state for history
		const prevNodes = [...nodes];
		const prevEdges = [...edges];

		// Get selected node IDs
		const selectedNodeIds = new Set(selectedNodes.map((n) => n.id));

		// Set loading state
		set({ isLayouting: true, layoutError: null });
		setLoadingStates?.({ isStateLoading: true });

		const toastId = toast.loading(
			`Applying layout to ${selectedNodes.length} selected nodes...`
		);

		try {
			// Run layout only on selected nodes
			const result = await runElkLayout({
				nodes,
				edges,
				config: layoutConfig,
				selectedNodeIds,
			});

			// Batch update state
			setNodes(result.nodes);
			setEdges(result.edges);

			// Record to history as single action
			addStateToHistory('applyLayoutToSelected', {
				nodes: result.nodes,
				edges: result.edges,
			});

			// Persist delta to database
			await persistDeltaEvent(
				'applyLayoutToSelected',
				{ nodes: prevNodes, edges: prevEdges },
				{ nodes: result.nodes, edges: result.edges }
			);

			set({ lastLayoutTimestamp: Date.now() });

			toast.success(`Layout applied to ${selectedNodes.length} nodes`, {
				id: toastId,
			});
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Layout failed';
			set({ layoutError: errorMessage });
			toast.error(errorMessage, { id: toastId });
			console.error('Layout error:', error);
		} finally {
			set({ isLayouting: false });
			setLoadingStates?.({ isStateLoading: false });
		}
	},

	resetLayoutConfig: () => {
		set({ layoutConfig: DEFAULT_LAYOUT_CONFIG });
	},
});

/**
 * Get human-readable label for layout direction
 */
function getDirectionLabel(direction: LayoutDirection): string {
	const labels: Record<LayoutDirection, string> = {
		LEFT_RIGHT: 'Left to Right',
		RIGHT_LEFT: 'Right to Left',
		TOP_BOTTOM: 'Top to Bottom',
		BOTTOM_TOP: 'Bottom to Top',
		RADIAL: 'Radial',
	};
	return labels[direction];
}
