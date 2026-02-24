import { defaultEdgeData } from '@/constants/default-edge-data';
import { STORE_SAVE_DEBOUNCE_MS } from '@/constants/store-save-debounce-ms';
import generateUuid from '@/helpers/generate-uuid';
import mergeEdgeData from '@/helpers/merge-edge-data';
import withLoadingAndToast from '@/helpers/with-loading-and-toast';
import {
	broadcast,
	BROADCAST_EVENTS,
	subscribeToSyncEvents,
	type EdgeBroadcastPayload,
} from '@/lib/realtime/broadcast-channel';
import {
	getEdgeActorId,
	getNodeActorId,
	serializeEdgeForRealtime,
	serializeNodeForRealtime,
} from '@/lib/realtime/graph-sync';
import { stableStringify } from '@/lib/realtime/util';
import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type { EdgeData } from '@/types/edge-data';
import { debouncePerKey } from '@/utils/debounce-per-key';
import { applyEdgeChanges } from '@xyflow/react';
import { toast } from 'sonner';
import type { StateCreator } from 'zustand';
import type { AppState, EdgesSlice } from '../app-state';

/** Safely parses a value that may be boolean, string "true"/"false", or undefined. */
function safeParseBooleanish(value: unknown): boolean {
	if (typeof value === 'boolean') return value;
	if (typeof value === 'string') {
		const trimmed = value.trim().toLowerCase();
		if (trimmed === 'true') return true;
		if (trimmed === 'false') return false;
	}
	return false;
}

// Utility function to determine edge type based on data
const getEdgeType = (edgeData: Partial<EdgeData>): string => {
	if (edgeData.aiData?.isSuggested) {
		return 'suggestedConnection';
	}

	// Check for waypoint edge type
	if (
		edgeData.type === 'waypointEdge' ||
		edgeData.metadata?.pathType === 'waypoint'
	) {
		return 'waypointEdge';
	}

	return 'floatingEdge';
};

function toComparableEdgeRecord(
	record: Record<string, unknown>
): Record<string, unknown> {
	const comparable = { ...record };
	delete comparable.updated_at;
	delete comparable.created_at;
	return comparable;
}

function normalizeEdgeForComparison(edge: AppEdge): Record<string, unknown> {
	const data = (edge.data ?? {}) as Record<string, unknown>;

	return {
		source: edge.source,
		target: edge.target,
		type: edge.type ?? data.type ?? null,
		label: edge.label ?? data.label ?? null,
		animated: edge.animated ?? data.animated ?? false,
		markerEnd: edge.markerEnd ?? data.markerEnd ?? null,
		markerStart: edge.markerStart ?? data.markerStart ?? null,
		style:
			(edge.style as unknown as Record<string, unknown> | undefined) ??
			(data.style as Record<string, unknown> | undefined) ??
			null,
		metadata: data.metadata ?? null,
		aiData: data.aiData ?? null,
		data: toComparableEdgeRecord(data),
	};
}

function hasMeaningfulEdgeDifference(
	previous: AppEdge,
	next: AppEdge
): boolean {
	return (
		stableStringify(normalizeEdgeForComparison(previous)) !==
		stableStringify(normalizeEdgeForComparison(next))
	);
}

function withNodeParent(node: AppNode, parentId: string | null): AppNode {
	return {
		...node,
		parentId: parentId ?? undefined,
		data: {
			...node.data,
			parent_id: parentId,
		},
	};
}

function recalculateParentsAfterEdgeDelete(
	nodes: AppNode[],
	edges: AppEdge[],
	deleteIds: Set<string>
): { updatedNodes: AppNode[]; changedNodes: AppNode[] } {
	const nodesWithDeletedIncoming = new Set<string>();
	const remainingIncomingParentByTarget = new Map<string, string>();

	for (const edge of edges) {
		if (deleteIds.has(edge.id)) {
			nodesWithDeletedIncoming.add(edge.target);
			continue;
		}

		if (!remainingIncomingParentByTarget.has(edge.target)) {
			remainingIncomingParentByTarget.set(edge.target, edge.source);
		}
	}

	const changedNodes: AppNode[] = [];
	const updatedNodes = nodes.map((node) => {
		if (!nodesWithDeletedIncoming.has(node.id)) {
			return node;
		}

		const nextParentId = remainingIncomingParentByTarget.get(node.id) ?? null;
		const prevParentId = node.parentId ?? node.data.parent_id ?? null;
		if (prevParentId === nextParentId) {
			return node;
		}

		const updatedNode = withNodeParent(node, nextParentId);
		changedNodes.push(updatedNode);
		return updatedNode;
	});

	return { updatedNodes, changedNodes };
}

export const createEdgeSlice: StateCreator<AppState, [], [], EdgesSlice> = (
	set,
	get
) => {
	// Handle broadcast edge create events
	const handleEdgeCreate = (payload: EdgeBroadcastPayload) => {
		const { currentUser, edges, markEdgeAsSystemUpdate } = get();

		// Ignore our own broadcasts
		if (payload.userId === currentUser?.id) return;

		// Mark as system update to prevent save loop
		markEdgeAsSystemUpdate(payload.id);

		const newRecord = payload.data as EdgeData;
		if (!newRecord) return;

		// Check if edge already exists (prevent duplicates)
		const existingEdge = edges.find((e) => e.id === payload.id);
		if (existingEdge) return;

		const newEdge: AppEdge = {
			id: newRecord.id,
			source: newRecord.source,
			target: newRecord.target,
			type: getEdgeType(newRecord),
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
	};

	// Handle broadcast edge update events
	const handleEdgeUpdate = (payload: EdgeBroadcastPayload) => {
		const { currentUser, edges, markEdgeAsSystemUpdate } = get();

		// Ignore our own broadcasts
		if (payload.userId === currentUser?.id) return;

		// Mark as system update to prevent save loop
		markEdgeAsSystemUpdate(payload.id);

		const newRecord = payload.data as EdgeData;
		if (!newRecord) return;

		const updatedEdges = edges.map((edge) => {
			if (edge.id === payload.id) {
				return {
					...edge,
					source: newRecord.source,
					target: newRecord.target,
					type: getEdgeType(newRecord),
					animated: newRecord.animated || false,
					label: newRecord.label,
					style: {
						stroke: newRecord.style?.stroke || edge.style?.stroke || '#6c757d',
						strokeWidth:
							newRecord.style?.strokeWidth || edge.style?.strokeWidth || 2,
					},
					markerEnd: newRecord.markerEnd,
					data: newRecord,
				};
			}
			return edge;
		});

		set({ edges: updatedEdges });
	};

	// Handle broadcast edge delete events
	const handleEdgeDelete = (payload: EdgeBroadcastPayload) => {
		const { currentUser, edges, markEdgeAsSystemUpdate } = get();

		// Ignore our own broadcasts
		if (payload.userId === currentUser?.id) return;

		// Mark as system update to prevent save loop
		markEdgeAsSystemUpdate(payload.id);

		const filteredEdges = edges.filter((edge) => edge.id !== payload.id);
		set({ edges: filteredEdges });
	};

	const triggerEdgeSaveDebounced = debouncePerKey(
		async (edgeId: string) => {
			const { edges, supabase, mapId } = get();
			const edge = edges.find((e) => e.id === edgeId);

			if (!edge || !edge.data) {
				console.error(`Edge with id ${edgeId} not found or has invalid data`);
				throw new Error(`Edge with id ${edgeId} not found or has invalid data`);
			}

			if (!mapId) {
				console.error('Cannot save edge: No mapId defined');
				throw new Error('Cannot save edge: No mapId defined');
			}

			const user_id = (await supabase.auth.getUser()).data.user?.id;

			if (!user_id) {
				throw new Error('Not authenticated');
			}

			const defaultEdge: Partial<EdgeData> = defaultEdgeData();

			// Keep stable creator identity on updates.
			const stableUserId =
				typeof edge.data?.user_id === 'string' &&
				edge.data.user_id.trim().length > 0
					? edge.data.user_id
					: user_id;
			const edgeData: EdgeData = {
				...defaultEdge,
				...edge.data,
				user_id: stableUserId,
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
						animated: safeParseBooleanish(dbEdge.animated),
						style: dbEdge.style,
					};
				}

				return edge;
			}) as AppEdge[];

			set({
				edges: finalEdges,
			});

			// Note: History delta already persisted by callers before debounced save.
		},
		STORE_SAVE_DEBOUNCE_MS,
		(edgeId: string) => edgeId
	);

	return {
		// state
		edges: [],
		systemUpdatedEdges: new Map(),
		_edgesSubscription: null,
		_edgesSubscriptionPending: false,

		// System update tracking helpers
		markEdgeAsSystemUpdate: (edgeId: string) => {
			set((state) => {
				const newMap = new Map(state.systemUpdatedEdges);
				newMap.set(edgeId, Date.now());
				return { systemUpdatedEdges: newMap };
			});
		},

		shouldSkipEdgeSave: (edgeId: string) => {
			const timestamp = get().systemUpdatedEdges.get(edgeId);
			if (!timestamp) return false;

			// Pure check: remote/system markers are valid only for a short window.
			const age = Date.now() - timestamp;
			return age <= 3000;
		},

		// handlers
		onEdgesChange: (changes) => {
			const { mapId, currentUser } = get();
			const previousNodes = get().nodes;
			const previousEdges = get().edges;
			const previousEdgeById = new Map(
				previousEdges.map((edge) => [edge.id, edge])
			);
			// Apply changes as before
			const updatedEdges = applyEdgeChanges(changes, previousEdges);
			set({ edges: updatedEdges });
			const updatedEdgeById = new Map(
				updatedEdges.map((edge) => [edge.id, edge])
			);
			const edgesToPersist = new Set<string>();
			const consumedSystemEdgeIds = new Set<string>();
			const updatedEdgeIds = new Set<string>();

			// Trigger debounced saves for relevant edge changes
			changes.forEach((change) => {
				// Skip if change doesn't have an id (add/remove types)
				if (!('id' in change)) return;

				// Skip saves for system-updated edges or during revert
				if (get().shouldSkipEdgeSave(change.id)) {
					consumedSystemEdgeIds.add(change.id);
					return;
				}

				if (change.type === 'replace') {
					// Data changes should trigger a save
					const previousEdge = previousEdgeById.get(change.id);
					const nextEdge = updatedEdgeById.get(change.id);
					if (!previousEdge || !nextEdge) return;
					if (!hasMeaningfulEdgeDifference(previousEdge, nextEdge)) return;

					edgesToPersist.add(change.id);
					updatedEdgeIds.add(change.id);
				}
			});

			if (get().systemUpdatedEdges.size > 0) {
				const now = Date.now();
				set((state) => {
					const nextMarkers = new Map(state.systemUpdatedEdges);
					let changed = false;

					for (const id of consumedSystemEdgeIds) {
						if (nextMarkers.delete(id)) {
							changed = true;
						}
					}

					for (const [id, timestamp] of nextMarkers.entries()) {
						if (now - timestamp > 3000) {
							nextMarkers.delete(id);
							changed = true;
						}
					}

					return changed ? { systemUpdatedEdges: nextMarkers } : {};
				});
			}

			for (const edgeId of edgesToPersist) {
				if (mapId) {
					const edge = updatedEdges.find((item) => item.id === edgeId);
					if (edge) {
						const userId = getEdgeActorId(edge, currentUser?.id);
						const edgeData = serializeEdgeForRealtime(edge, mapId, userId);
						if (edgeData) {
							void broadcast(mapId, BROADCAST_EVENTS.EDGE_UPDATE, {
								id: edgeId,
								data: edgeData,
								userId,
								timestamp: Date.now(),
							}).catch((error) => {
								console.warn('[edges] Failed to sync Yjs edge update:', error);
							});
						}
					}
				}

				get().triggerEdgeSave(edgeId);
			}

			if (edgesToPersist.size > 0) {
				void get().persistDeltaEvent(
					updatedEdgeIds.size > 1 ? 'updateEdges' : 'updateEdge',
					{ nodes: previousNodes, edges: previousEdges },
					{ nodes: get().nodes, edges: get().edges }
				);
			}
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
				const { supabase, mapId, edges, nodes } = get();

				if (!mapId) {
					throw new Error('Cannot add connection: Map ID missing.');
				}

				const user = await supabase?.auth.getUser();
				if (!user?.data.user) throw new Error('User not authenticated.');
				const actorId = user.data.user.id;

				const existingEdge = edges.find(
					(e) =>
						(e.source === sourceId && e.target === targetId) ||
						(e.source === targetId && e.target === sourceId)
				);

				if (existingEdge && existingEdge.data?.aiData?.isSuggested === false) {
					throw new Error('Edge already exists.');
				}

				const newEdge = mergeEdgeData(defaultEdgeData(), {
					...data,
					source: sourceId,
					target: targetId,
					map_id: mapId,
					user_id: actorId,
				});
				const normalizedEdgeData: EdgeData = {
					...(newEdge as EdgeData),
					id: typeof newEdge.id === 'string' ? newEdge.id : generateUuid(),
					source: sourceId,
					target: targetId,
					map_id: mapId,
					user_id: actorId,
				};

				// Determine edge type after merging data
				const edgeType = getEdgeType(normalizedEdgeData);
				const optimisticFlowEdge: AppEdge = {
					id: normalizedEdgeData.id,
					source: normalizedEdgeData.source,
					target: normalizedEdgeData.target,
					type: edgeType,
					animated: normalizedEdgeData.animated || false,
					label: normalizedEdgeData.label,
					style: {
						stroke: normalizedEdgeData.style?.stroke || '#6c757d',
						strokeWidth: normalizedEdgeData.style?.strokeWidth || 2,
					},
					markerEnd: normalizedEdgeData.markerEnd,
					data: normalizedEdgeData,
				};
				const previousTargetNode = nodes.find((node) => node.id === targetId);
				const optimisticTargetNode = previousTargetNode
					? withNodeParent(previousTargetNode, sourceId)
					: null;

				set((state) => ({
					edges: state.edges.some((edge) => edge.id === optimisticFlowEdge.id)
						? state.edges
						: [...state.edges, optimisticFlowEdge],
					nodes: optimisticTargetNode
						? state.nodes.map((node) =>
								node.id === targetId ? optimisticTargetNode : node
							)
						: state.nodes,
				}));

				const edgeEventUserId = getEdgeActorId(optimisticFlowEdge, actorId);
				const edgeRealtimeData = serializeEdgeForRealtime(
					optimisticFlowEdge,
					mapId,
					edgeEventUserId
				);

				if (edgeRealtimeData) {
					try {
						await broadcast(mapId, BROADCAST_EVENTS.EDGE_CREATE, {
							id: optimisticFlowEdge.id,
							data: edgeRealtimeData,
							userId: edgeEventUserId,
							timestamp: Date.now(),
						});
					} catch (error) {
						console.warn('[edges] Failed to sync Yjs edge create:', error);
					}
				}

				if (optimisticTargetNode) {
					const nodeEventUserId = getNodeActorId(optimisticTargetNode, actorId);
					const nodeRealtimeData = serializeNodeForRealtime(
						optimisticTargetNode,
						mapId,
						nodeEventUserId
					);

					try {
						await broadcast(mapId, BROADCAST_EVENTS.NODE_UPDATE, {
							id: optimisticTargetNode.id,
							data: nodeRealtimeData,
							userId: nodeEventUserId,
							timestamp: Date.now(),
						});
					} catch (error) {
						console.warn(
							'[edges] Failed to sync Yjs node parent update on edge create:',
							error
						);
					}
				}

				const { data: insertedEdgeData, error: insertError } = await supabase
					.from('edges')
					.insert(normalizedEdgeData)
					.select()
					.single();

				if (insertError) {
					set((state) => ({
						edges: state.edges.filter(
							(edge) => edge.id !== optimisticFlowEdge.id
						),
						nodes: previousTargetNode
							? state.nodes.map((node) =>
									node.id === previousTargetNode.id ? previousTargetNode : node
								)
							: state.nodes,
					}));

					try {
						await broadcast(mapId, BROADCAST_EVENTS.EDGE_DELETE, {
							id: optimisticFlowEdge.id,
							userId: actorId,
							timestamp: Date.now(),
						});
					} catch (error) {
						console.warn(
							'[edges] Failed to rollback Yjs edge create after DB error:',
							error
						);
					}

					if (previousTargetNode) {
						const nodeEventUserId = getNodeActorId(previousTargetNode, actorId);
						const nodeRealtimeData = serializeNodeForRealtime(
							previousTargetNode,
							mapId,
							nodeEventUserId
						);

						try {
							await broadcast(mapId, BROADCAST_EVENTS.NODE_UPDATE, {
								id: previousTargetNode.id,
								data: nodeRealtimeData,
								userId: nodeEventUserId,
								timestamp: Date.now(),
							});
						} catch (error) {
							console.warn(
								'[edges] Failed to rollback Yjs node parent update after DB error:',
								error
							);
						}
					}

					throw new Error(insertError.message || 'Failed to insert edge.');
				}

				const persistedFlowEdge: AppEdge = {
					id: insertedEdgeData.id,
					source: insertedEdgeData.source,
					target: insertedEdgeData.target,
					type: edgeType,
					animated: false,
					label: insertedEdgeData.label,
					style: {
						stroke: insertedEdgeData.style?.stroke || '#6c757d',
						strokeWidth: insertedEdgeData.style?.strokeWidth || 2,
					},
					markerEnd: insertedEdgeData.markerEnd,
					data: insertedEdgeData,
				};

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

				set((state) => ({
					edges: state.edges.some((edge) => edge.id === optimisticFlowEdge.id)
						? state.edges.map((edge) =>
								edge.id === optimisticFlowEdge.id ? persistedFlowEdge : edge
							)
						: [...state.edges, persistedFlowEdge],
					nodes: state.nodes.map((node) =>
						node.id === targetId ? withNodeParent(node, sourceId) : node
					),
				}));

				const finalNodes = get().nodes;
				const finalEdges = get().edges;

				// Persist delta to DB for history tracking
				get().persistDeltaEvent(
					'addEdge',
					{ nodes, edges },
					{ nodes: finalNodes, edges: finalEdges }
				);

				return persistedFlowEdge;
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
				const { supabase, mapId, edges, nodes } = get();
				const deleteIds = edgesToDelete.map((edge) => edge.id);
				const deleteIdSet = new Set(deleteIds);

				if (!mapId) {
					throw new Error('Cannot delete edge: Map ID missing.');
				}

				const user = await supabase?.auth.getUser();
				if (!user?.data.user) throw new Error('User not authenticated.');
				const actorId = user.data.user.id;

				const finalEdges = edges.filter((edge) => !deleteIdSet.has(edge.id));
				const { updatedNodes, changedNodes } =
					recalculateParentsAfterEdgeDelete(nodes, edges, deleteIdSet);

				set({
					edges: finalEdges,
					nodes: updatedNodes,
				});

				for (const edge of edgesToDelete) {
					try {
						await broadcast(mapId, BROADCAST_EVENTS.EDGE_DELETE, {
							id: edge.id,
							userId: actorId,
							timestamp: Date.now(),
						});
					} catch (error) {
						console.warn('[edges] Failed to sync Yjs edge delete:', error);
					}
				}

				for (const node of changedNodes) {
					const eventUserId = getNodeActorId(node, actorId);
					const nodeData = serializeNodeForRealtime(node, mapId, eventUserId);

					try {
						await broadcast(mapId, BROADCAST_EVENTS.NODE_UPDATE, {
							id: node.id,
							data: nodeData,
							userId: eventUserId,
							timestamp: Date.now(),
						});
					} catch (error) {
						console.warn(
							'[edges] Failed to sync Yjs node parent update on edge delete:',
							error
						);
					}
				}

				const { error: deleteError } = await supabase
					.from('edges')
					.delete()
					.in('id', deleteIds)
					.eq('map_id', mapId);

				if (deleteError) {
					set((state) => {
						const existingEdgeIds = new Set(state.edges.map((edge) => edge.id));
						return {
							edges: [
								...state.edges,
								...edgesToDelete.filter(
									(edge) => !existingEdgeIds.has(edge.id)
								),
							],
							nodes: state.nodes.map((node) => {
								const previousNode = nodes.find(
									(candidate) => candidate.id === node.id
								);
								return previousNode ?? node;
							}),
						};
					});

					for (const edge of edgesToDelete) {
						const eventUserId = getEdgeActorId(edge, actorId);
						const edgeData = serializeEdgeForRealtime(edge, mapId, eventUserId);
						if (edgeData) {
							try {
								await broadcast(mapId, BROADCAST_EVENTS.EDGE_CREATE, {
									id: edge.id,
									data: edgeData,
									userId: eventUserId,
									timestamp: Date.now(),
								});
							} catch (error) {
								console.warn(
									'[edges] Failed to rollback Yjs edge delete after DB error:',
									error
								);
							}
						}
					}

					for (const node of nodes) {
						if (!changedNodes.some((candidate) => candidate.id === node.id)) {
							continue;
						}

						const eventUserId = getNodeActorId(node, actorId);
						const nodeData = serializeNodeForRealtime(node, mapId, eventUserId);
						try {
							await broadcast(mapId, BROADCAST_EVENTS.NODE_UPDATE, {
								id: node.id,
								data: nodeData,
								userId: eventUserId,
								timestamp: Date.now(),
							});
						} catch (error) {
							console.warn(
								'[edges] Failed to rollback Yjs node update after DB error:',
								error
							);
						}
					}

					throw new Error(deleteError.message || 'Failed to delete edge.');
				}

				// Persist delta to DB for history tracking
				get().persistDeltaEvent(
					'deleteEdge',
					{ nodes, edges },
					{ nodes: get().nodes, edges: get().edges }
				);
			},
			'isAddingContent',
			{
				initialMessage: 'Deleting edge...',
				errorMessage: 'Failed to delete edge.',
				successMessage: 'Edge deleted successfully.',
			}
		),
		updateEdge: async (props: { edgeId: string; data: Partial<EdgeData> }) => {
			const { edges, nodes, mapId, supabase } = get();
			const { edgeId, data } = props;

			const user = (await supabase?.auth.getUser())?.data.user;
			if (!user) {
				toast.error('User not authenticated.');
				return;
			}

			// Update edge in local state first
			const finalEdges = edges.map((edge) => {
				if (edge.id !== edgeId) return edge;

				const stableUserId =
					typeof edge.data?.user_id === 'string' &&
					edge.data.user_id.trim().length > 0
						? edge.data.user_id
						: user.id;

				const mergedData = {
					...edge.data,
					...data,
					id: edgeId,
					map_id: mapId!,
					user_id: stableUserId,
					animated: data.animated === true,
					style: {
						...edge.data?.style,
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
				};

				// Determine edge type from merged data
				const edgeType = getEdgeType(mergedData);

				return {
					...edge,
					id: edgeId,
					type: edgeType, // Update the React Flow edge type
					data: mergedData,
				};
			}) as AppEdge[];

			set({
				edges: [...finalEdges],
			});

			if (mapId) {
				const updatedEdge = finalEdges.find((edge) => edge.id === edgeId);
				if (updatedEdge) {
					const userId = getEdgeActorId(updatedEdge, user.id);
					const edgeData = serializeEdgeForRealtime(updatedEdge, mapId, userId);
					if (edgeData) {
						void broadcast(mapId, BROADCAST_EVENTS.EDGE_UPDATE, {
							id: edgeId,
							data: edgeData,
							userId,
							timestamp: Date.now(),
						}).catch((error) => {
							console.warn('[edges] Failed to sync Yjs edge update:', error);
						});
					}
				}
			}

			// Trigger debounced save to persist changes
			get().triggerEdgeSave(edgeId);

			// Persist delta to DB for history tracking
			get().persistDeltaEvent(
				'updateEdge',
				{ nodes, edges },
				{ nodes, edges: finalEdges }
			);
		},
		triggerEdgeSave: triggerEdgeSaveDebounced,
		flushPendingEdgeSaves: async () => {
			await triggerEdgeSaveDebounced.flushAll();
		},
		setParentConnection: (edgeId: string) => {
			const {
				edges,
				nodes,
				mapId,
				currentUser,
				triggerEdgeSave,
				triggerNodeSave,
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
			) as AppEdge[];
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
			) as AppNode[];

			set({ edges: updatedEdges, nodes: updatedNodes });

			if (mapId) {
				const currentEdge = updatedEdges.find(
					(candidate) => candidate.id === edgeId
				);
				if (currentEdge) {
					const userId = getEdgeActorId(currentEdge, currentUser?.id);
					const edgeData = serializeEdgeForRealtime(currentEdge, mapId, userId);
					if (edgeData) {
						void broadcast(mapId, BROADCAST_EVENTS.EDGE_UPDATE, {
							id: edgeId,
							data: edgeData,
							userId,
							timestamp: Date.now(),
						}).catch((error) => {
							console.warn(
								'[edges] Failed to sync Yjs edge parent update:',
								error
							);
						});
					}
				}

				const currentNode = updatedNodes[targetNodeIdx];
				if (currentNode) {
					const userId = getNodeActorId(currentNode, currentUser?.id);
					const nodeData = serializeNodeForRealtime(currentNode, mapId, userId);
					void broadcast(mapId, BROADCAST_EVENTS.NODE_UPDATE, {
						id: currentNode.id,
						data: nodeData,
						userId,
						timestamp: Date.now(),
					}).catch((error) => {
						console.warn(
							'[edges] Failed to sync Yjs node parent update:',
							error
						);
					});
				}
			}

			// Debounced save
			triggerEdgeSave(edgeId);
			triggerNodeSave(edge.target);

			// Persist delta to DB for history tracking
			get().persistDeltaEvent(
				'setParentConnection',
				{ nodes, edges },
				{ nodes: updatedNodes, edges: updatedEdges as AppEdge[] }
			);
		},

		subscribeToEdges: async (mapId: string) => {
			// Guard against concurrent subscription attempts
			if (get()._edgesSubscriptionPending) {
				return;
			}
			set({ _edgesSubscriptionPending: true });

			try {
				// Clean up existing subscription before creating new one
				const existingSub = get()._edgesSubscription;
				if (
					existingSub &&
					typeof (existingSub as any).unsubscribe === 'function'
				) {
					try {
						await (existingSub as any).unsubscribe();
					} catch (e) {
						console.warn(
							'[broadcast] Failed to unsubscribe previous edges subscription:',
							e
						);
					}
					set({ _edgesSubscription: null });
				}

				// Use secure broadcast channel instead of postgres_changes
				// This provides RLS-protected real-time sync via private channels
				const cleanup = await subscribeToSyncEvents(mapId, {
					onEdgeCreate: handleEdgeCreate,
					onEdgeUpdate: handleEdgeUpdate,
					onEdgeDelete: handleEdgeDelete,
				});

				// Store cleanup function for later unsubscription
				set({
					_edgesSubscription: { unsubscribe: cleanup } as unknown as ReturnType<
						typeof get
					>['_edgesSubscription'],
				});
			} catch (error) {
				console.error('[broadcast] Failed to subscribe to edge events:', error);
			} finally {
				set({ _edgesSubscriptionPending: false });
			}
		},

		unsubscribeFromEdges: async () => {
			const { _edgesSubscription } = get();

			if (_edgesSubscription) {
				try {
					// Call cleanup function (decrements ref count, unsubscribes when count reaches 0)
					if (typeof (_edgesSubscription as any).unsubscribe === 'function') {
						await (_edgesSubscription as any).unsubscribe();
					}
					set({ _edgesSubscription: null });
				} catch (error) {
					console.error(
						'[broadcast] Error unsubscribing from edge events:',
						error
					);
				}
			}
		},
	};
};
