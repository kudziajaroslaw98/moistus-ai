/**
 * Layout Slice
 * Manages ELK.js-based automatic layout state and actions
 */

import { runElkLayout } from '@/helpers/layout';
import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import {
	DEFAULT_LAYOUT_CONFIG,
	LayoutConfig,
	LayoutDirection,
	LayoutSlice,
} from '@/types/layout-types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { StateCreator } from 'zustand';
import { AppState } from '../app-state';

/**
 * Batch update node positions in database (single DB call)
 */
async function batchUpdateNodePositions(
	nodes: AppNode[],
	supabase: SupabaseClient,
	mapId: string
): Promise<void> {
	if (nodes.length === 0) return;

	const updates = nodes.map((node) => ({
		id: node.id,
		map_id: mapId,
		position_x: node.position.x,
		position_y: node.position.y,
		updated_at: new Date().toISOString(),
	}));

	const { error } = await supabase
		.from('nodes')
		.upsert(updates, { onConflict: 'id' });

	if (error) {
		console.error('Failed to batch update node positions:', error);
		throw error;
	}
}

/**
 * Batch update edge metadata in database (single DB call)
 */
async function batchUpdateEdgeMetadata(
	edges: AppEdge[],
	supabase: SupabaseClient,
	mapId: string
): Promise<void> {
	if (edges.length === 0) return;

	const updates = edges.map((edge) => ({
		id: edge.id,
		map_id: mapId,
		metadata: edge.data?.metadata ?? null,
		updated_at: new Date().toISOString(),
	}));

	const { error } = await supabase
		.from('edges')
		.upsert(updates, { onConflict: 'id' });

	if (error) {
		console.error('Failed to batch update edge metadata:', error);
		throw error;
	}
}

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
			setMindMapContent,
			addStateToHistory,
			persistDeltaEvent,
			layoutConfig,
			isLayouting,
			setLoadingStates,
			supabase,
			mapId,
			subscribeToRealtimeUpdates,
			unsubscribeFromRealtimeUpdates,
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

			await unsubscribeFromRealtimeUpdates();

			// Batch update state (single update, not per-node)
			setMindMapContent({ nodes: result.nodes, edges: result.edges });

			// Batch persist to database (2 parallel DB calls)
			if (supabase && mapId) {
				await Promise.all([
					batchUpdateNodePositions(result.nodes, supabase, mapId),
					batchUpdateEdgeMetadata(result.edges, supabase, mapId),
				]);
			}

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
			if (mapId) {
				await new Promise((r) => setTimeout(r, 150));
				await subscribeToRealtimeUpdates(mapId);
			}
		}
	},

	applyLayoutToSelected: async () => {
		const {
			nodes,
			edges,
			setMindMapContent,
			addStateToHistory,
			persistDeltaEvent,
			layoutConfig,
			isLayouting,
			setLoadingStates,
			selectedNodes,
			supabase,
			mapId,
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
			setMindMapContent({ nodes: result.nodes, edges: result.edges });

			// Batch persist only affected nodes/edges to database
			if (supabase && mapId) {
				const affectedNodes = result.nodes.filter((n) =>
					selectedNodeIds.has(n.id)
				);
				const affectedEdges = result.edges.filter(
					(e) => selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target)
				);
				await Promise.all([
					batchUpdateNodePositions(affectedNodes, supabase, mapId),
					batchUpdateEdgeMetadata(affectedEdges, supabase, mapId),
				]);
			}

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
