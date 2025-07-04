import { defaultEdgeData } from '@/constants/default-edge-data';
import { STORE_SAVE_DEBOUNCE_MS } from '@/constants/store-save-debounce-ms';
import generateUuid from '@/helpers/generate-uuid';
import mergeEdgeData from '@/helpers/merge-edge-data';
import withLoadingAndToast from '@/helpers/with-loading-and-toast';
import type { AppEdge } from '@/types/app-edge';
import type { EdgeData } from '@/types/edge-data';
import { debouncePerKey } from '@/utils/debounce-per-key';
import { applyEdgeChanges } from '@xyflow/react';
import { toast } from 'sonner';
import type { StateCreator } from 'zustand';
import type { AppState, EdgesSlice } from '../app-state';

export const createEdgeSlice: StateCreator<AppState, [], [], EdgesSlice> = (
	set,
	get
) => {
	// Handle real-time edge events
	const handleEdgeRealtimeEvent = (payload: any) => {
		const { eventType, new: newRecord, old: oldRecord } = payload;
		const { edges, lastSavedEdgeTimestamps } = get();

		// Skip if this change was made by current user recently (prevent loops)
		const edgeId = newRecord?.id || oldRecord?.id;
		if (edgeId && lastSavedEdgeTimestamps[edgeId]) {
			const timeSinceLastSave = Date.now() - lastSavedEdgeTimestamps[edgeId];
			if (timeSinceLastSave < 1000) {
				// Skip if saved within last second
				return;
			}
		}

		switch (eventType) {
			case 'INSERT': {
				if (newRecord) {
					// Check if edge already exists (prevent duplicates)
					const existingEdge = edges.find((e) => e.id === newRecord.id);
					if (!existingEdge) {
						const newEdge: AppEdge = {
							id: newRecord.id,
							source: newRecord.source,
							target: newRecord.target,
							type: 'floatingEdge',
							animated: newRecord.animated || false,
							label: newRecord.label,
							style: {
								stroke: newRecord.style?.stroke || '#6c757d',
								strokeWidth: newRecord.style?.strokeWidth || 2,
							},
							markerEnd: newRecord.markerEnd,
							data: newRecord,
						};

						set({ edges: [...edges, newEdge] });
						console.log('Real-time: Edge added', newRecord.id);
					}
				}
				break;
			}
			case 'UPDATE': {
				if (newRecord) {
					const updatedEdges = edges.map((edge) => {
						if (edge.id === newRecord.id) {
							return {
								...edge,
								source: newRecord.source,
								target: newRecord.target,
								animated: newRecord.animated || false,
								label: newRecord.label,
								style: {
									stroke:
										newRecord.style?.stroke || edge.style?.stroke || '#6c757d',
									strokeWidth:
										newRecord.style?.strokeWidth ||
										edge.style?.strokeWidth ||
										2,
								},
								markerEnd: newRecord.markerEnd,
								data: newRecord,
							};
						}
						return edge;
					});

					set({ edges: updatedEdges });
					console.log('Real-time: Edge updated', newRecord.id);
				}
				break;
			}
			case 'DELETE': {
				if (oldRecord) {
					const filteredEdges = edges.filter(
						(edge) => edge.id !== oldRecord.id
					);
					set({ edges: filteredEdges });
					console.log('Real-time: Edge deleted', oldRecord.id);
				}
				break;
			}
		}
	};

	return {
		// state
		edges: [],
		lastSavedEdgeTimestamps: {},
		_edgesSubscription: null,

		// handlers
		onEdgesChange: (changes) => {
			// Apply changes as before
			const updatedEdges = applyEdgeChanges(changes, get().edges);
			set({ edges: updatedEdges });

			// Trigger debounced saves for relevant edge changes
			changes.forEach((change) => {
				if (change.type === 'remove') {
					// Edge removal is handled elsewhere
					return;
				} else if (change.type === 'select') {
					// No need to save for selection changes
					return;
				} else if (change.type === 'add') {
					// New edges are handled elsewhere
					return;
				} else if (change.type === 'replace') {
					// Data changes should trigger a save
					get().triggerEdgeSave(change.id);
				}
			});
		},
		onConnect: (connection) => {
			if (!connection.source || !connection.target) return;

			const addEdge = get().addEdge;
			const newEdge = mergeEdgeData(defaultEdgeData(), {
				id: generateUuid(),
				source: connection.source,
				target: connection.target,
			});

			addEdge(connection.source, connection.target, newEdge);
		},

		// setters
		setEdges: (edges) => {
			set({ edges });
		},

		// getters
		getEdge: (id: string) => {
			const edges = get().edges;
			return edges.find((edge) => edge.id === id);
		},
		getVisibleEdges: (): AppEdge[] => {
			const { edges, nodes } = get();
			const visibleNodes = get().getVisibleNodes();
			const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
			const collapsedNodeIds = new Set(
				nodes
					.filter((node) => node.data.metadata?.isCollapsed)
					.map((node) => node.id)
			);

			// Return edges where:
			// 1. Both source and target are visible, OR
			// 2. Source is visible and target is a collapsed node (to show connection to collapsed branch)
			return edges.filter((edge) => {
				const sourceVisible = visibleNodeIds.has(edge.source);
				const targetVisible = visibleNodeIds.has(edge.target);
				const targetIsCollapsed = collapsedNodeIds.has(edge.target);

				return (
					(sourceVisible && targetVisible) ||
					(sourceVisible && targetIsCollapsed)
				);
			});
		},

		// actions
		addEdge: withLoadingAndToast(
			async (
				sourceId: string,
				targetId: string,
				data: Partial<EdgeData>,
				toastId?: string
			) => {
				const { supabase, mapId, edges, nodes, addStateToHistory } = get();

				if (!mapId) {
					throw new Error('Cannot add connection: Map ID missing.');
				}

				const user = await supabase?.auth.getUser();
				if (!user?.data.user) throw new Error('User not authenticated.');

				const existingEdge = edges.find(
					(e) =>
						(e.source === sourceId && e.target === targetId) ||
						(e.source === targetId && e.target === sourceId)
				);

				if (existingEdge) {
					throw new Error('Edge already exists.');
				}

				const newEdge = mergeEdgeData(defaultEdgeData(), {
					type: 'floatingEdge',
					...data,
					map_id: mapId!,
					user_id: user.data.user.id,
				});

				const { data: insertedEdgeData, error: insertError } = await supabase
					.from('edges')
					.insert(newEdge)
					.select()
					.single();

				if (insertError) {
					throw new Error(insertError.message || 'Failed to insert edge.');
				}

				const newFlowEdge: AppEdge = {
					id: insertedEdgeData.id,
					source: insertedEdgeData.source,
					target: insertedEdgeData.target,
					type: 'floatingEdge', // Ensure type is floatingEdge
					animated: false,
					label: insertedEdgeData.label,
					style: {
						stroke: insertedEdgeData.style?.stroke || '#6c757d',
						strokeWidth: insertedEdgeData.style?.strokeWidth || 2,
					},
					markerEnd: insertedEdgeData.markerEnd,
					data: insertedEdgeData,
				};

				const finalEdges = [...edges, newFlowEdge];

				const { error: parentUpdateError } = await supabase
					.from('nodes')
					.update({ parent_id: sourceId, updated_at: new Date().toISOString() })
					.eq('id', targetId);

				if (parentUpdateError) {
					toast.warning(
						'Connection saved, but failed to set parent relationship in DB.',
						{ id: toastId }
					);
				}

				const finalNodes = nodes.map((node) => {
					if (node.id === targetId) {
						return {
							...node,
							parent_id: sourceId,
						};
					}

					return node;
				});

				set({
					edges: finalEdges,
					nodes: finalNodes,
				});

				addStateToHistory('addEdge', { edges: finalEdges, nodes: nodes });
				return newFlowEdge;
			},
			'isAddingContent',
			{
				initialMessage: 'Adding edge...',
				errorMessage: 'Failed to add edge.',
				successMessage: 'Edge added successfully.',
			}
		),
		deleteEdges: withLoadingAndToast(
			async (edgesToDelete: AppEdge[]) => {
				const { supabase, mapId, edges, nodes, addStateToHistory } = get();
				const deleteIds = edgesToDelete.map((edge) => edge.id);

				if (!mapId) {
					throw new Error('Cannot delete edge: Map ID missing.');
				}

				const user = await supabase?.auth.getUser();
				if (!user?.data.user) throw new Error('User not authenticated.');

				const { error: deleteError } = await supabase
					.from('edges')
					.delete()
					.in('id', deleteIds)
					.eq('map_id', mapId);

				if (deleteError) {
					throw new Error(deleteError.message || 'Failed to delete edge.');
				}

				const finalEdges = edges.filter((e) => !deleteIds.includes(e.id));

				const updatedNodes = nodes.map((node) => {
					const newParents = node.parentId
						? edgesToDelete.filter((edge) => edge.source !== node.id)
						: [];

					return {
						...node,
						parentId: newParents.length > 0 ? newParents[0].target : undefined,
					};
				});

				set({
					edges: finalEdges,
					nodes: updatedNodes,
				});

				addStateToHistory('deleteEdge', { edges: finalEdges, nodes: nodes });
			},
			'isAddingContent',
			{
				initialMessage: 'Deleting edge...',
				errorMessage: 'Failed to delete edge.',
				successMessage: 'Edge deleted successfully.',
			}
		),
		updateEdge: async (props: { edgeId: string; data: Partial<EdgeData> }) => {
			const { edges, nodes, addStateToHistory, mapId, supabase } = get();
			const { edgeId, data } = props;

			const user = (await supabase?.auth.getUser())?.data.user;

			if (!user) {
				toast.error('User not authenticated.');
				return;
			}

			// Update edge in local state first
			const finalEdges = edges.map((edge) => {
				if (edge.id === edgeId) {
					return {
						...edge,
						id: edgeId,
						data: {
							...edge.data,
							...data,
							id: edgeId,
							map_id: mapId!,
							user_id: user.id,
							style: {
								...edge.style,
								...data.style,
							},
							metadata: {
								...edge.data?.metadata,
								...data.metadata,
							},
							aiData: {
								...edge.data?.aiData,
								...data.aiData,
							},
						},
					};
				}

				return edge;
			}) as AppEdge[];

			set({
				edges: finalEdges,
			});

			// Trigger debounced save to persist changes
			get().triggerEdgeSave(edgeId);

			addStateToHistory('updateEdge', { edges: finalEdges, nodes: nodes });
		},
		triggerEdgeSave: debouncePerKey(
			async (edgeId: string) => {
				const { edges, supabase, mapId, addStateToHistory, nodes } = get();
				const edge = edges.find((e) => e.id === edgeId);

				if (!edge || !edge.data) {
					console.error(`Edge with id ${edgeId} not found or has invalid data`);
					throw new Error(
						`Edge with id ${edgeId} not found or has invalid data`
					);
				}

				set((state) => ({
					lastSavedEdgeTimestamps: {
						...state.lastSavedEdgeTimestamps,
						[edgeId]: Date.now(),
					},
				}));

				if (!mapId) {
					console.error('Cannot save edge: No mapId defined');
					throw new Error('Cannot save dge: No mapId defined');
				}

				const user_id = (await supabase.auth.getUser()).data.user?.id;

				if (!user_id) {
					throw new Error('Not authenticated');
				}

				const defaultEdge: Partial<EdgeData> = defaultEdgeData();

				// Prepare edge data for saving, ensuring type safety
				const edgeData: EdgeData = {
					...defaultEdge,
					...edge.data,
					user_id: user_id,
					id: edgeId,
					map_id: mapId,
					source: edge.source || '',
					target: edge.target || '',
					updated_at: new Date().toISOString(),
					animated: edge.data?.animated || defaultEdge.animated,
					metadata: {
						...defaultEdge.metadata!,
						...edge.data?.metadata,
					},
					aiData: {
						...defaultEdge.aiData,
						...edge.data?.aiData,
					},
					style: {
						...defaultEdge.style!,
						...edge.data?.style,
					},
				};

				// Save edge data to Supabase
				const { data: dbEdge, error } = await supabase
					.from('edges')
					.update(edgeData)
					.eq('id', edgeId)
					.select()
					.single();

				if (error) {
					console.error('Error saving edge:', error);
					throw new Error('Failed to save edge changes');
				}

				const finalEdges = edges.map((edge) => {
					if (edge.id === edgeId) {
						return {
							...edge,
							data: mergeEdgeData(edge.data ?? {}, dbEdge),
							animated: JSON.parse(dbEdge.animated),
							style: dbEdge.style,
						};
					}

					return edge;
				}) as AppEdge[];

				set({
					edges: finalEdges,
				});

				addStateToHistory('updateEdge', { edges: finalEdges, nodes: nodes });
			},
			STORE_SAVE_DEBOUNCE_MS,
			(edgeId: string) => edgeId // getKey function for triggerEdgeSave
		),
		setParentConnection: (edgeId: string) => {
			const {
				edges,
				nodes,
				triggerEdgeSave,
				triggerNodeSave,
				addStateToHistory,
			} = get();

			const edge = edges.find((e) => e.id === edgeId);

			if (!edge) {
				toast.error('Edge not found');
				return;
			}

			const targetNodeIdx = nodes.findIndex((n) => n.id === edge.target);

			if (targetNodeIdx === -1) {
				toast.error('Target node not found');
				return;
			}

			// Optimistic update
			const updatedEdges = edges.map((e) =>
				e.id === edgeId
					? {
							...e,
							data: {
								...e.data,
								metadata: {
									...(e.data?.metadata ?? {}),
								},
							},
						}
					: e
			);
			const updatedNodes = nodes.map((n, idx) =>
				idx === targetNodeIdx
					? {
							...n,
							data: {
								...n.data,
								parent_id: edge.source,
							},
						}
					: n
			);

			set({ edges: updatedEdges as AppEdge[], nodes: updatedNodes });

			// Debounced save and history
			triggerEdgeSave(edgeId);
			triggerNodeSave(edge.target);
			addStateToHistory('setParentConnection', {
				nodes: updatedNodes,
				edges: updatedEdges as AppEdge[],
			});
		},

		subscribeToEdges: async (mapId: string) => {
			const { supabase, _edgesSubscription } = get();

			// Unsubscribe from existing subscription first
			if (_edgesSubscription) {
				await _edgesSubscription.unsubscribe();
			}

			try {
				const channel = supabase
					.channel(`mind-map-edges-${mapId}`)
					.on(
						'postgres_changes',
						{
							event: '*',
							schema: 'public',
							table: 'edges',
							filter: `map_id=eq.${mapId}`,
						},
						handleEdgeRealtimeEvent
					)
					.subscribe((status: string) => {
						if (status === 'SUBSCRIBED') {
							console.log(
								'Subscribed to edges real-time updates for map:',
								mapId
							);
						} else if (status === 'CHANNEL_ERROR') {
							console.error('Error subscribing to edges real-time updates');
						}
					});

				set({ _edgesSubscription: channel });
			} catch (error) {
				console.error('Failed to subscribe to edges updates:', error);
			}
		},

		unsubscribeFromEdges: async () => {
			const { _edgesSubscription } = get();

			if (_edgesSubscription) {
				try {
					await _edgesSubscription.unsubscribe();
					set({ _edgesSubscription: null });
					console.log('Unsubscribed from edges real-time updates');
				} catch (error) {
					console.error('Error unsubscribing from edges updates:', error);
				}
			}
		},
	};
};
