/**
 * Layout Slice
 * Manages ELK.js-based automatic layout state and actions
 */

import { runElkLayout } from '@/helpers/layout';
import { replaceGraphState } from '@/lib/realtime/broadcast-channel';
import {
	getEdgeActorId,
	getNodeActorId,
	serializeEdgeForRealtime,
	serializeNodeForRealtime,
	toPgReal,
} from '@/lib/realtime/graph-sync';
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
		position_x: toPgReal(node.position.x),
		position_y: toPgReal(node.position.y),
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
			persistDeltaEvent,
			layoutConfig,
			isLayouting,
			setLoadingStates,
			supabase,
			mapId,
			currentUser,
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
			setMindMapContent({ nodes: result.nodes, edges: result.edges });

			if (mapId) {
				await replaceGraphState(mapId, {
					event: 'layout:apply',
					actorId: currentUser?.id ?? null,
					nodes: result.nodes.map((node) => {
						const actorId = getNodeActorId(node, currentUser?.id);
						return serializeNodeForRealtime(node, mapId, actorId);
					}),
					edges: result.edges
						.map((edge) => {
							const actorId = getEdgeActorId(edge, currentUser?.id);
							return serializeEdgeForRealtime(edge, mapId, actorId);
						})
						.filter((edge): edge is Record<string, unknown> => edge !== null),
				});
				if (supabase) {
					await Promise.all([
						batchUpdateNodePositions(result.nodes, supabase, mapId),
						batchUpdateEdgeMetadata(result.edges, supabase, mapId),
					]);
				}
			}

			// Persist delta to DB for history tracking
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
			setMindMapContent,
			persistDeltaEvent,
			layoutConfig,
			isLayouting,
			setLoadingStates,
			selectedNodes,
			supabase,
			mapId,
			currentUser,
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

			if (mapId) {
				await replaceGraphState(mapId, {
					event: 'layout:apply-selected',
					actorId: currentUser?.id ?? null,
					nodes: result.nodes.map((node) => {
						const actorId = getNodeActorId(node, currentUser?.id);
						return serializeNodeForRealtime(node, mapId, actorId);
					}),
					edges: result.edges
						.map((edge) => {
							const actorId = getEdgeActorId(edge, currentUser?.id);
							return serializeEdgeForRealtime(edge, mapId, actorId);
						})
						.filter((edge): edge is Record<string, unknown> => edge !== null),
				});
				if (supabase) {
					const affectedNodes = result.nodes.filter((n) =>
						selectedNodeIds.has(n.id)
					);
					const affectedEdges = result.edges.filter(
						(e) =>
							selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target)
					);
					await Promise.all([
						batchUpdateNodePositions(affectedNodes, supabase, mapId),
						batchUpdateEdgeMetadata(affectedEdges, supabase, mapId),
					]);
				}
			}

			// Persist delta to DB for history tracking
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
