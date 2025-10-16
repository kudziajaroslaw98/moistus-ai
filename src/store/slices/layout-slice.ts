import withLoadingAndToast from '@/helpers/with-loading-and-toast';
import type { LayoutDirection } from '@/types/layout-direction';
import type {
	ELKLayoutConfig,
	SpecificLayoutConfig,
} from '@/types/layout-types';
import {
	applyDirectionalLayout,
	getELKLayoutPresets,
	layoutWithELK,
} from '@/utils/elk-graph-utils';
import { toast } from 'sonner';
import type { StateCreator } from 'zustand';
import type { AppState, LayoutSlice } from '../app-state';

export const createLayoutSlice: StateCreator<AppState, [], [], LayoutSlice> = (
	set,
	get
) => ({
	// state
	currentLayoutConfig: null,
	availableLayouts: getELKLayoutPresets(),

	// setters
	setLayoutConfig: (config: SpecificLayoutConfig) => {
		set({ currentLayoutConfig: config });
	},

	// getters
	getLayoutPresets: () => {
		return getELKLayoutPresets();
	},

	// actions
	applyLayout: withLoadingAndToast(
		async (direction: LayoutDirection) => {
			const {
				nodes,
				edges,
				setNodes,
				reactFlowInstance,
				addStateToHistory,
				persistDeltaEvent,
				unsubscribeFromRealtimeUpdates,
				subscribeToRealtimeUpdates,
				supabase,
				mapId,
			} = get();

			if (nodes.length === 0) {
				toast.error('Nothing to layout. Add some nodes first.');
				return;
			}

			// Use ELK.js for layout computation with enhanced options
			const result = await applyDirectionalLayout(nodes, edges, direction);

			// Post-process positions to ensure better distribution
			const updatedNodes = nodes.map((node) => {
				const layoutNode = result.nodes.find((n) => n.id === node.id);
				if (!layoutNode) return node;

				return {
					...node,
					position: {
						x: layoutNode.position.x,
						y: layoutNode.position.y,
					},
				};
			});

			// Determine which nodes actually changed position
			const changedNodes = updatedNodes.filter((n) => {
				const prev = nodes.find((p) => p.id === n.id);
				if (!prev) return false;
				return (
					prev.position.x !== n.position.x || prev.position.y !== n.position.y
				);
			});

			// Update UI immediately
			setNodes(updatedNodes);

			// Bulk persist only if something changed and we have required context
			try {
				await unsubscribeFromRealtimeUpdates();

				if (changedNodes.length > 0 && mapId && supabase) {
					const session = await supabase.auth.getSession();
					const userId = session.data.session?.user?.id;
					if (!userId) {
						throw new Error('Not authenticated');
					}

					const nowIso = new Date().toISOString();
					const rows = changedNodes.map((n) => ({
						id: n.id,
						map_id: mapId,
						user_id: userId,
						position_x: n.position.x,
						position_y: n.position.y,
						updated_at: nowIso,
					}));

					if (rows.length > 0) {
						const { error } = await supabase
							.from('nodes')
							.upsert(rows, { onConflict: 'id' });
						if (error) throw error;
					}

					// Record a single history event for the entire layout
					addStateToHistory(`applyLayout (${direction})`, {
						nodes: updatedNodes,
						edges,
					});
					await persistDeltaEvent(
						`applyLayout (${direction})`,
						{ nodes, edges },
						{ nodes: updatedNodes, edges }
					);
				}
			} finally {
				if (mapId) {
					await subscribeToRealtimeUpdates(mapId);
				}
			}

			setTimeout(() => {
				reactFlowInstance?.fitView({ padding: 0.1, duration: 300 });
			}, 50);
		},
		'isApplyingLayout',
		{
			initialMessage: 'Applying layout...',
			successMessage: 'Layout applied.',
			errorMessage: 'Failed to apply layout.',
		}
	),
	applyAdvancedLayout: withLoadingAndToast(
		async (config: SpecificLayoutConfig) => {
			const {
				nodes,
				edges,
				setNodes,
				reactFlowInstance,
				addStateToHistory,
				persistDeltaEvent,
				unsubscribeFromRealtimeUpdates,
				subscribeToRealtimeUpdates,
				supabase,
				mapId,
			} = get();

			if (nodes.length === 0) {
				toast.error('Nothing to layout. Add some nodes first.');
				return;
			}

			// Check if it's an ELK layout config
			if ('algorithm' in config && config.algorithm.startsWith('elk.')) {
				const elkConfig = config as ELKLayoutConfig;

				const result = await layoutWithELK(nodes, edges, {
					algorithm: elkConfig.algorithm,
					direction: elkConfig.direction,
					layoutOptions: elkConfig.layoutOptions,
					useWorker: false,
				});

				const updatedNodes = nodes.map((node) => {
					const layoutNode = result.nodes.find((ln) => ln.id === node.id);
					return layoutNode ? { ...node, position: layoutNode.position } : node;
				});

				// Determine which nodes actually changed position
				const changedNodes = updatedNodes.filter((n) => {
					const prev = nodes.find((p) => p.id === n.id);
					if (!prev) return false;
					return (
						prev.position.x !== n.position.x || prev.position.y !== n.position.y
					);
				});

				// Update UI immediately
				setNodes(updatedNodes);

				try {
					await unsubscribeFromRealtimeUpdates();

					if (changedNodes.length > 0 && mapId && supabase) {
						const session = await supabase.auth.getSession();
						const userId = session.data.session?.user?.id;
						if (!userId) {
							throw new Error('Not authenticated');
						}

						const nowIso = new Date().toISOString();
						const rows = changedNodes.map((n) => ({
							id: n.id,
							map_id: mapId,
							user_id: userId,
							position_x: n.position.x,
							position_y: n.position.y,
							updated_at: nowIso,
						}));

						if (rows.length > 0) {
							const { error } = await supabase
								.from('nodes')
								.upsert(rows, { onConflict: 'id' });
							if (error) throw error;
						}

						addStateToHistory('applyAdvancedLayout', {
							nodes: updatedNodes,
							edges,
						});
						await persistDeltaEvent(
							'applyAdvancedLayout',
							{ nodes, edges },
							{ nodes: updatedNodes, edges }
						);
					}
				} finally {
					if (mapId) {
						await subscribeToRealtimeUpdates(mapId);
					}
				}

				setTimeout(() => {
					reactFlowInstance?.fitView({ padding: 0.1, duration: 300 });
				}, 50);
			} else {
				// Fallback for non-ELK configs (if any remain)
				throw new Error('Unsupported layout configuration');
			}

			set({ currentLayoutConfig: config });
		},
		'isApplyingLayout',
		{
			initialMessage: 'Applying advanced layout...',
			successMessage: 'Advanced layout applied successfully',
			errorMessage: 'Failed to apply advanced layout',
		}
	),
});
