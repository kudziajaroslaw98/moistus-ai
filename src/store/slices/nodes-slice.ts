import { defaultEdgeData } from '@/constants/default-edge-data';
import { STORE_SAVE_DEBOUNCE_MS } from '@/constants/store-save-debounce-ms';
import { fetchResourceMetadata } from '@/helpers/fetch-resource-metadata';
import generateUuid from '@/helpers/generate-uuid';
import withLoadingAndToast from '@/helpers/with-loading-and-toast';
import {
	broadcast,
	BROADCAST_EVENTS,
	subscribeToSyncEvents,
	type NodeBroadcastPayload,
} from '@/lib/realtime/broadcast-channel';
import {
	getEdgeActorId,
	getNodeActorId,
	serializeEdgeForRealtime,
	serializeNodeForRealtime,
	toPgReal,
} from '@/lib/realtime/graph-sync';
import { stableStringify } from '@/lib/realtime/util';
import { AvailableNodeTypes } from '@/registry/node-registry';
import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type { EdgeData } from '@/types/edge-data';
import type { NodeData } from '@/types/node-data';
import { NodesTableType } from '@/types/nodes-table-type';
import type { CreateNodeWithEdgeResponse } from '@/types/rpc-responses';
import { debouncePerKey } from '@/utils/debounce-per-key';
import { applyNodeChanges, XYPosition } from '@xyflow/react';
import { toast } from 'sonner';
import type { StateCreator } from 'zustand';
import type { AppState, NodesSlice } from '../app-state';

function toComparableNodeRecord(
	record: Record<string, unknown>
): Record<string, unknown> {
	const comparable = { ...record };
	delete comparable.updated_at;
	delete comparable.position_x;
	delete comparable.position_y;
	delete comparable.width;
	delete comparable.height;
	delete comparable.node_type;
	delete comparable.parent_id;
	delete comparable.created_at;
	return comparable;
}

function getNodeWidth(node: AppNode): number | null {
	if (typeof node.width === 'number') return node.width;
	if (typeof node.data?.width === 'number') return node.data.width;
	return null;
}

function getNodeHeight(node: AppNode): number | null {
	if (typeof node.height === 'number') return node.height;
	if (typeof node.data?.height === 'number') return node.data.height;
	return null;
}

function hasMeaningfulNodeDifference(previous: AppNode, next: AppNode): boolean {
	if ((previous.type || 'defaultNode') !== (next.type || 'defaultNode')) {
		return true;
	}

	if (
		toPgReal(previous.position.x) !== toPgReal(next.position.x) ||
		toPgReal(previous.position.y) !== toPgReal(next.position.y)
	) {
		return true;
	}

	if (getNodeWidth(previous) !== getNodeWidth(next)) return true;
	if (getNodeHeight(previous) !== getNodeHeight(next)) return true;

	const previousParent = previous.parentId ?? previous.data?.parent_id ?? null;
	const nextParent = next.parentId ?? next.data?.parent_id ?? null;
	if (previousParent !== nextParent) return true;

	const previousData = toComparableNodeRecord(
		(previous.data ?? {}) as Record<string, unknown>
	);
	const nextData = toComparableNodeRecord(
		(next.data ?? {}) as Record<string, unknown>
	);

	return stableStringify(previousData) !== stableStringify(nextData);
}

function hasMeaningfulPositionChange(previous: AppNode, next: AppNode): boolean {
	return (
		toPgReal(previous.position.x) !== toPgReal(next.position.x) ||
		toPgReal(previous.position.y) !== toPgReal(next.position.y)
	);
}

function hasMeaningfulDimensionChange(
	previous: AppNode,
	next: AppNode
): boolean {
	return (
		getNodeWidth(previous) !== getNodeWidth(next) ||
		getNodeHeight(previous) !== getNodeHeight(next)
	);
}

export const createNodeSlice: StateCreator<AppState, [], [], NodesSlice> = (
	set,
	get
) => {
	// Handle broadcast node create events
	const handleNodeCreate = (payload: NodeBroadcastPayload) => {
		const { currentUser, nodes, markNodeAsSystemUpdate } = get();

		// Ignore our own broadcasts
		if (payload.userId === currentUser?.id) return;

		// Mark as system update to prevent save loop
		markNodeAsSystemUpdate(payload.id);

		const newRecord = payload.data as NodesTableType;
		if (!newRecord) return;

		// Check if node already exists (prevent duplicates)
		const existingNode = nodes.find((n) => n.id === payload.id);
		if (existingNode) return;

		const newNode: AppNode = {
			id: newRecord.id,
			position: {
				x: newRecord.position_x,
				y: newRecord.position_y,
			},
			data: newRecord,
			type: newRecord.node_type || 'defaultNode',
			zIndex: newRecord.node_type === 'commentNode' ? 100 : undefined,
		};

		set({ nodes: [...nodes, newNode] });
	};

	// Handle broadcast node update events
	const handleNodeUpdate = (payload: NodeBroadcastPayload) => {
		const { currentUser, nodes, markNodeAsSystemUpdate } = get();

		// Ignore our own broadcasts
		if (payload.userId === currentUser?.id) return;

		// Mark as system update to prevent save loop
		markNodeAsSystemUpdate(payload.id);

		const newRecord = payload.data as NodesTableType;
		if (!newRecord) return;

		const updatedNodes = nodes.map((node) => {
			if (node.id === payload.id) {
				return {
					...node,
					position: {
						x: newRecord.position_x,
						y: newRecord.position_y,
					},
					data: newRecord,
					type: newRecord.node_type || node.type,
					zIndex: newRecord.node_type === 'commentNode' ? 100 : node.zIndex,
				};
			}
			return node;
		});

		set({ nodes: updatedNodes });
	};

	// Handle broadcast node delete events
	const handleNodeDelete = (payload: NodeBroadcastPayload) => {
		const { currentUser, nodes, markNodeAsSystemUpdate } = get();

		// Ignore our own broadcasts
		if (payload.userId === currentUser?.id) return;

		// Mark as system update to prevent save loop
		markNodeAsSystemUpdate(payload.id);

		const filteredNodes = nodes.filter((node) => node.id !== payload.id);
		set({ nodes: filteredNodes });
	};

	const triggerNodeSaveDebounced = debouncePerKey(
		async (nodeId: string) => {
			const { nodes, supabase, mapId, currentUser } = get();
			const node = nodes.find((n) => n.id === nodeId);

			if (!node || !node.data) {
				console.error(`Node with id ${nodeId} not found or has invalid data`);
				throw new Error(
					`Node with id ${nodeId} not found or has invalid data`
				);
			}

			if (!mapId) {
				console.error('Cannot save node: No mapId defined');
				throw new Error('Cannot save node: No mapId defined');
			}

			const user_id = (await supabase.auth.getUser()).data.user?.id;

			if (!user_id) {
				throw new Error('Not authenticated');
			}

			// Keep stable creator identity on updates.
			const stableUserId =
				typeof node.data.user_id === 'string' &&
				node.data.user_id.trim().length > 0
					? node.data.user_id
					: user_id;
			const nodeData: NodesTableType = {
				id: nodeId,
				map_id: mapId,
				user_id: stableUserId,
				content: node.data.content || '',
				metadata: node.data.metadata || {},
				aiData: node.data.aiData || {},
				position_x: toPgReal(node.position.x),
				position_y: toPgReal(node.position.y),
				width: node.width,
				height: node.height,
				node_type: (node.type || 'defaultNode') as AvailableNodeTypes,
				updated_at: new Date().toISOString(),
				created_at: node.data.created_at,
				parent_id: node.parentId || node.data.parent_id || null,
			};

			// Save node data to Supabase
			const { error } = await supabase
				.from('nodes')
				.update(nodeData)
				.eq('id', nodeId)
				.eq('map_id', mapId);

			if (error) {
				console.error('Error saving node:', error);
				throw new Error('Failed to save node changes');
			}
		},
		STORE_SAVE_DEBOUNCE_MS,
		(nodeId: string) => nodeId
	);
	/** Module-level set tracking nodes mid-drag. Cleared on drag commit. */
	const pendingDraggedNodeIds = new Set<string>();

	return {
		nodes: [],
		selectedNodes: [],
		systemUpdatedNodes: new Map(),
		_nodesSubscription: null,
		_nodesSubscriptionPending: false,

		// System update tracking helpers
		markNodeAsSystemUpdate: (nodeId: string) => {
			set((state) => {
				const newMap = new Map(state.systemUpdatedNodes);
				newMap.set(nodeId, Date.now());
				return { systemUpdatedNodes: newMap };
			});
		},

		shouldSkipNodeSave: (nodeId: string) => {
			const timestamp = get().systemUpdatedNodes.get(nodeId);
			if (!timestamp) return false;

			// Pure check: remote/system markers are valid only for a short window.
			const age = Date.now() - timestamp;
			return age <= 3000;
		},

		onNodesChange: (changes) => {
			const { mapId, currentUser } = get();
			const previousNodes = get().nodes;
			const previousEdges = get().edges;
			const previousNodeById = new Map(
				previousNodes.map((node) => [node.id, node])
			);
			// Apply changes as before
			const updatedNodes = applyNodeChanges(changes, previousNodes);

			// Handle group movement synchronization
			const finalNodes = [...updatedNodes];
			const processedGroupIds = new Set<string>();

			changes.forEach((change) => {
				if (change.type === 'position' && change.position) {
					const movedNode = finalNodes.find((n) => n.id === change.id);

					// If a group is moved, move its children (during dragging and after)
					if (
						movedNode?.data.metadata?.isGroup &&
						!processedGroupIds.has(change.id)
					) {
						processedGroupIds.add(change.id);
						const groupChildren =
							(movedNode.data.metadata.groupChildren as string[]) || [];
						const oldPosition = get().nodes.find(
							(n) => n.id === change.id
						)?.position;

						if (oldPosition && groupChildren.length > 0) {
							const deltaX = change.position.x - oldPosition.x;
							const deltaY = change.position.y - oldPosition.y;

							groupChildren.forEach((childId) => {
								const childIndex = finalNodes.findIndex(
									(n) => n.id === childId
								);

								if (childIndex !== -1) {
									finalNodes[childIndex] = {
										...finalNodes[childIndex],
										position: {
											x: finalNodes[childIndex].position.x + deltaX,
											y: finalNodes[childIndex].position.y + deltaY,
										},
									};
								}
							});
						}
					}
				}
			});

			set({ nodes: finalNodes });
			const finalNodeById = new Map(finalNodes.map((node) => [node.id, node]));
			const nodesToPersist = new Set<string>();
			const nodesToBroadcast = new Set<string>();
			const consumedSystemNodeIds = new Set<string>();
			const movedNodeIds = new Set<string>();
			const resizedNodeIds = new Set<string>();
			const replacedNodeIds = new Set<string>();

			// Trigger debounced saves for relevant node changes
			changes.forEach((change) => {
				// Skip if change doesn't have an id (add/remove types)
				if (!('id' in change)) return;

				// Skip saves for system-updated nodes or during revert
				if (get().shouldSkipNodeSave(change.id)) {
					consumedSystemNodeIds.add(change.id);
					return;
				}

				if (change.type === 'position' && change.position) {
					const previousNode = previousNodeById.get(change.id);
					const nextNode = finalNodeById.get(change.id);
					if (!previousNode || !nextNode) return;

					const hasPositionChanged = hasMeaningfulPositionChange(
						previousNode,
						nextNode
					);
					if (change.dragging === true) {
						pendingDraggedNodeIds.add(change.id);
						return;
					}

					const isDragCommit = change.dragging === false;
					const wasDragged = isDragCommit
						? pendingDraggedNodeIds.delete(change.id)
						: false;
					if (!hasPositionChanged && !wasDragged) return;

					nodesToPersist.add(change.id);
					nodesToBroadcast.add(change.id);
					movedNodeIds.add(change.id);

					// Also persist moved children when group is moved.
					const movedNode = finalNodeById.get(change.id);
					if (!movedNode?.data.metadata?.isGroup) return;

					const groupChildren =
						(movedNode.data.metadata.groupChildren as string[]) || [];
					groupChildren.forEach((childId) => {
						const nextChildNode = finalNodeById.get(childId);
						if (!nextChildNode) return;

						const previousChildNode = previousNodeById.get(childId);
						const childPositionChanged =
							previousChildNode &&
							hasMeaningfulPositionChange(previousChildNode, nextChildNode);
						if (!childPositionChanged && !wasDragged) return;

						nodesToPersist.add(childId);
						nodesToBroadcast.add(childId);
						movedNodeIds.add(childId);
					});
				} else if (
					change.type === 'dimensions' &&
					change.dimensions &&
					change.resizing === false
				) {
					const previousNode = previousNodeById.get(change.id);
					const nextNode = finalNodeById.get(change.id);
					if (!previousNode || !nextNode) return;
					if (!hasMeaningfulDimensionChange(previousNode, nextNode)) return;

					nodesToPersist.add(change.id);
					nodesToBroadcast.add(change.id);
					resizedNodeIds.add(change.id);
				} else if (change.type === 'replace') {
					// Data changes should trigger a save
					const previousNode = previousNodeById.get(change.id);
					const nextNode = finalNodeById.get(change.id);
					if (!previousNode || !nextNode) return;
					if (!hasMeaningfulNodeDifference(previousNode, nextNode)) return;

					nodesToPersist.add(change.id);
					nodesToBroadcast.add(change.id);
					replacedNodeIds.add(change.id);
				}
			});

			if (get().systemUpdatedNodes.size > 0) {
				const now = Date.now();
				set((state) => {
					const nextMarkers = new Map(state.systemUpdatedNodes);
					let changed = false;

					for (const id of consumedSystemNodeIds) {
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

					return changed ? { systemUpdatedNodes: nextMarkers } : {};
				});
			}

			for (const nodeId of nodesToBroadcast) {
				if (mapId) {
					const node = finalNodeById.get(nodeId);
					if (node) {
						const userId = getNodeActorId(node, currentUser?.id);
						const nodeData = serializeNodeForRealtime(node, mapId, userId);
						void broadcast(mapId, BROADCAST_EVENTS.NODE_UPDATE, {
							id: nodeId,
							data: nodeData,
							userId,
							timestamp: Date.now(),
						}).catch((error) => {
							console.warn('[nodes] Failed to sync Yjs node update:', error);
						});
					}
				}
			}

			for (const nodeId of nodesToPersist) {
				get().triggerNodeSave(nodeId);
			}

			if (nodesToPersist.size > 0) {
				let actionName = 'saveNodeProperties';
				if (
					replacedNodeIds.size === 0 &&
					resizedNodeIds.size === 0 &&
					movedNodeIds.size > 0
				) {
					actionName = movedNodeIds.size > 1 ? 'moveNodes' : 'moveNode';
				} else if (
					replacedNodeIds.size === 0 &&
					movedNodeIds.size === 0 &&
					resizedNodeIds.size > 0
				) {
					actionName = resizedNodeIds.size > 1 ? 'resizeNodes' : 'resizeNode';
				}

				void get().persistDeltaEvent(
					actionName,
					{ nodes: previousNodes, edges: previousEdges },
					{ nodes: get().nodes, edges: get().edges }
				);
			}
		},

		setNodes: (nodes) => {
			set({ nodes });
		},
		setSelectedNodes: (selectedNodes) => {
			set({ selectedNodes });
		},

		getNode: (id: string) => {
			const nodes = get().nodes;
			return nodes.find((node) => node.id === id);
		},

		addNode: withLoadingAndToast(
			async (props: {
				parentNode: Partial<AppNode> | null;
				content?: string;
				nodeType?: AvailableNodeTypes;
				data?: Partial<NodeData>;
				position?: { x: number; y: number };
				nodeId?: string;
				toastId?: string;
			}) => {
				const { nodeType = 'defaultNode' } = props;
				const { parentNode, position, data = {}, content = 'New node' } = props;
				const { mapId, supabase, nodes, edges, currentSubscription } = get();

				if (!mapId) {
					throw new Error('Cannot add node: Map ID missing.');
				}

				// Check node creation limit - server-side authoritative, client-side fallback
				const devBypass = process.env.NEXT_PUBLIC_DEV_BYPASS_LIMITS === 'true';

				if (!devBypass) {
					const isPro =
						currentSubscription?.plan?.name === 'pro' ||
						currentSubscription?.plan?.name === 'enterprise';
					const limit = currentSubscription?.plan?.limits?.nodesPerMap ?? 50; // Free tier default

					if (!isPro && limit !== -1) {
						// Server-side check first (authoritative, prevents race conditions)
						if (mapId) {
							try {
								const response = await fetch('/api/nodes/check-limit', {
									method: 'POST',
									headers: { 'Content-Type': 'application/json' },
									body: JSON.stringify({ mapId }),
								});

								if (response.status === 402) {
									// Trigger upgrade modal
									get().setPopoverOpen?.({ upgradeUser: true });
									const data = await response.json();
									throw new Error(
										data.error ||
											`Node limit reached. Upgrade to Pro for unlimited nodes.`
									);
								}

								if (!response.ok) {
									// API error - fall back to client-side check
									throw new Error('API unavailable');
								}

								// Server confirmed we're under limit, proceed
							} catch (error) {
								// Network/API error - fall back to client-side check
								if (
									error instanceof Error &&
									error.message.includes('limit reached')
								) {
									throw error; // Re-throw limit errors
								}

								// Client-side fallback when server unavailable
								const currentNodeCount = nodes.length;
								if (currentNodeCount >= limit) {
									get().setPopoverOpen?.({ upgradeUser: true });
									throw new Error(
										`Node limit reached (${limit} nodes per map). Upgrade to Pro for unlimited nodes.`
									);
								}
							}
						} else {
							// No mapId - use client-side check only
							const currentNodeCount = nodes.length;
							if (currentNodeCount >= limit) {
								get().setPopoverOpen?.({ upgradeUser: true });
								throw new Error(
									`Node limit reached (${limit} nodes per map). Upgrade to Pro for unlimited nodes.`
								);
							}
						}
					}
				}

				const newNodeId = props.nodeId ?? generateUuid();
				let newNodePosition: XYPosition = {
					x: 0,
					y: 0,
				};

				if (position) {
					newNodePosition = position;
				} else if (parentNode && parentNode.position) {
					// Use improved parent-relative positioning with better spacing
					const parentHeight = parentNode.measured?.height ?? 200;

					// Calculate position based on number of existing children
					newNodePosition = {
						x: parentNode.position.x,
						y: parentNode.position.y + parentHeight + 60,
					};
				}

				const user = await supabase?.auth.getSession();
				if (!user?.data.session) throw new Error('User not authenticated.');
				const actorId = user.data.session.user.id;

				// Prepare edge defaults for RPC
				const edgeDefaults = defaultEdgeData();
				const edgeId = parentNode?.id ? generateUuid() : null;
				const nowIso = new Date().toISOString();

				const optimisticNodeData = {
					...data,
					id: newNodeId,
					map_id: mapId,
					user_id: actorId,
					content,
					metadata: data.metadata ?? {},
					aiData: data.aiData ?? {},
					position_x: newNodePosition.x,
					position_y: newNodePosition.y,
					width: data.width ?? null,
					height: data.height ?? null,
					node_type: nodeType,
					updated_at: nowIso,
					created_at: nowIso,
					parent_id: parentNode?.id ?? null,
				} as unknown as NodesTableType;

				const optimisticNode: AppNode = {
					id: newNodeId,
					position: {
						x: newNodePosition.x,
						y: newNodePosition.y,
					},
					data: optimisticNodeData,
					type: nodeType,
					zIndex: nodeType === 'commentNode' ? 100 : undefined,
				};

				const optimisticEdgeData =
					edgeId && parentNode?.id
						? ({
								...edgeDefaults,
								id: edgeId,
								map_id: mapId,
								user_id: actorId,
								source: parentNode.id,
								target: newNodeId,
								updated_at: nowIso,
								created_at: nowIso,
							} as EdgeData)
						: null;

				const optimisticFlowEdge: AppEdge | null = optimisticEdgeData
					? {
							id: optimisticEdgeData.id,
							source: optimisticEdgeData.source,
							target: optimisticEdgeData.target,
							type: 'floatingEdge',
							animated: optimisticEdgeData.animated || false,
							label: optimisticEdgeData.label,
							style: {
								stroke: optimisticEdgeData.style?.stroke || '#6c757d',
								strokeWidth: optimisticEdgeData.style?.strokeWidth || 2,
							},
							markerEnd: optimisticEdgeData.markerEnd,
							data: optimisticEdgeData,
						}
					: null;

				set((state) => ({
					nodes: state.nodes.some((node) => node.id === newNodeId)
						? state.nodes
						: [...state.nodes, optimisticNode],
					edges:
						optimisticFlowEdge &&
						!state.edges.some((edge) => edge.id === optimisticFlowEdge.id)
							? [...state.edges, optimisticFlowEdge]
							: state.edges,
				}));

				const nodeEventUserId = getNodeActorId(optimisticNode, actorId);
				const nodeRealtimeData = serializeNodeForRealtime(
					optimisticNode,
					mapId,
					nodeEventUserId
				);

				try {
					await broadcast(mapId, BROADCAST_EVENTS.NODE_CREATE, {
						id: newNodeId,
						data: nodeRealtimeData,
						userId: nodeEventUserId,
						timestamp: Date.now(),
					});
				} catch (error) {
					console.warn('[nodes] Failed to sync Yjs node create:', error);
				}

				if (optimisticFlowEdge) {
					const edgeEventUserId = getEdgeActorId(optimisticFlowEdge, actorId);
					const edgeRealtimeData = serializeEdgeForRealtime(
						optimisticFlowEdge,
						mapId,
						edgeEventUserId
					);

					try {
						await broadcast(mapId, BROADCAST_EVENTS.EDGE_CREATE, {
							id: optimisticFlowEdge.id,
							data: edgeRealtimeData,
							userId: edgeEventUserId,
							timestamp: Date.now(),
						});
					} catch (error) {
						console.warn('[nodes] Failed to sync Yjs edge create:', error);
					}
				}

				// Single atomic RPC call to create node + edge
				const { data: rpcResult, error: rpcError } = await supabase.rpc(
					'create_node_with_parent_edge',
					{
						p_node_id: newNodeId,
						p_user_id: user.data.session.user.id,
						p_map_id: mapId,
						p_parent_id: parentNode?.id ?? null,
						p_content: content,
						p_position_x: newNodePosition.x,
						p_position_y: newNodePosition.y,
						p_node_type: nodeType,
						p_width: data.width ?? null,
						p_height: data.height ?? null,
						p_metadata: data.metadata ?? null,
						p_tags: data.tags ?? null,
						p_status: data.status ?? null,
						p_importance: data.importance ?? null,
						p_source_url: data.sourceUrl ?? null,
						p_ai_data: data.aiData ?? null,
						p_edge_id: edgeId,
						p_edge_style: edgeDefaults.style,
						p_edge_metadata: edgeDefaults.metadata,
					}
				);

				if (rpcError || !rpcResult) {
					set((state) => ({
						nodes: state.nodes.filter((node) => node.id !== newNodeId),
						edges: edgeId
							? state.edges.filter((edge) => edge.id !== edgeId)
							: state.edges,
					}));

					try {
						await broadcast(mapId, BROADCAST_EVENTS.NODE_DELETE, {
							id: newNodeId,
							userId: actorId,
							timestamp: Date.now(),
						});
					} catch (error) {
						console.warn(
							'[nodes] Failed to rollback Yjs node create after DB error:',
							error
						);
					}

					if (edgeId) {
						try {
							await broadcast(mapId, BROADCAST_EVENTS.EDGE_DELETE, {
								id: edgeId,
								userId: actorId,
								timestamp: Date.now(),
							});
						} catch (error) {
							console.warn(
								'[nodes] Failed to rollback Yjs edge create after DB error:',
								error
							);
						}
					}

					throw new Error(
						rpcError?.message || 'Failed to save new node to database.'
					);
				}

				const result = rpcResult as CreateNodeWithEdgeResponse;
				const insertedNodeData = result.node as NodesTableType;
				const insertedEdgeData = result.edge;

				const persistedNode: AppNode = {
					id: insertedNodeData.id,
					position: {
						x: insertedNodeData.position_x,
						y: insertedNodeData.position_y,
					},
					data: insertedNodeData,
					type: insertedNodeData.node_type || 'defaultNode',
					zIndex:
						insertedNodeData.node_type === 'commentNode' ? 100 : undefined,
				};

				const persistedEdge = insertedEdgeData
					? ({
							id: insertedEdgeData.id,
							source: insertedEdgeData.source,
							target: insertedEdgeData.target,
							type: 'floatingEdge',
							animated: insertedEdgeData.animated === true,
							label: insertedEdgeData.label,
							style: {
								stroke: insertedEdgeData.style?.stroke || '#6c757d',
								strokeWidth: insertedEdgeData.style?.strokeWidth || 2,
							},
							markerEnd: insertedEdgeData.markerEnd,
							data: insertedEdgeData,
						} satisfies AppEdge)
					: null;

				set((state) => {
					const nextNodes = state.nodes.some((node) => node.id === newNodeId)
						? state.nodes.map((node) =>
								node.id === newNodeId ? persistedNode : node
							)
						: [...state.nodes, persistedNode];

					let nextEdges = state.edges;
					if (persistedEdge) {
						nextEdges = state.edges.some((edge) => edge.id === persistedEdge.id)
							? state.edges.map((edge) =>
									edge.id === persistedEdge.id ? persistedEdge : edge
								)
							: [...state.edges, persistedEdge];
					} else if (edgeId) {
						nextEdges = state.edges.filter((edge) => edge.id !== edgeId);
					}

					return {
						nodes: nextNodes,
						edges: nextEdges,
					};
				});

				// Persist delta to DB for history tracking
				get().persistDeltaEvent(
					'addNode',
					{ nodes, edges },
					{ nodes: get().nodes, edges: get().edges }
				);

				// Auto-fetch metadata for resource nodes (fire-and-forget)
				if (nodeType === 'resourceNode' && data.metadata?.url) {
					get().fetchResourceNodeMetadata(
						newNodeId,
						data.metadata.url as string
					);
				}
			},
			'isAddingContent',
			{
				initialMessage: 'Adding node...',
				errorMessage: 'Failed to add node.',
				successMessage: 'Node added successfully.',
			}
		),
		updateNode: async (props: { nodeId: string; data: Partial<NodeData> }) => {
			const prevNodes = get().nodes;
			const prevEdges = get().edges;
			const { nodeId, data } = props;
			let updatedNode: AppNode | null = null;

			// First update the local state
			set((state) => ({
				nodes: state.nodes.map((node) => {
					if (node.id === nodeId) {
						updatedNode = {
							...node,
							type: data.node_type || node.type,
							position: {
								x: data.position_x ?? node.position.x,
								y: data.position_y ?? node.position.y,
							},
							data: {
								...node.data,
								...data,
								metadata: {
									...node.data.metadata,
									...data.metadata,
								},
								aiData: {
									...(node.data.aiData || {}),
									...(data.aiData || {}),
								},
							},
						};

						return updatedNode;
					}

					return node;
				}),
				nodeInfo: updatedNode,
			}));

			const { mapId, currentUser } = get();
			if (mapId && updatedNode) {
				const userId = getNodeActorId(updatedNode, currentUser?.id);
				const nodeData = serializeNodeForRealtime(updatedNode, mapId, userId);
				void broadcast(mapId, BROADCAST_EVENTS.NODE_UPDATE, {
					id: nodeId,
					data: nodeData,
					userId,
					timestamp: Date.now(),
				}).catch((error) => {
					console.warn('[nodes] Failed to sync Yjs node update:', error);
				});
			}

			// Trigger debounced save to persist changes
			get().triggerNodeSave(nodeId);

			// Persist delta to DB for history tracking
			get().persistDeltaEvent(
				'saveNodeProperties',
				{ nodes: prevNodes, edges: prevEdges },
				{ nodes: get().nodes, edges: get().edges }
			);
		},
		deleteNodes: withLoadingAndToast(
			async (nodesToDelete: AppNode[]) => {
				const { mapId, supabase, edges, nodes: allNodes } = get();

				if (!mapId || !nodesToDelete) return;

				// Capture previous state for history tracking
				const prevNodes = [...allNodes];
				const prevEdges = [...edges];

				const edgesToDelete = edges.filter((edge) =>
					nodesToDelete.some(
						(node) => edge.source === node.id || edge.target === node.id
					)
				);

				const user_id = (await supabase.auth.getSession()).data.session?.user
					?.id;
				if (!user_id) throw new Error('User not authenticated.');

				const nodeIdsToDelete = new Set(nodesToDelete.map((node) => node.id));
				const edgeIdsToDelete = new Set(edgesToDelete.map((edge) => edge.id));

				const finalNodes = allNodes.filter((node) => !nodeIdsToDelete.has(node.id));
				const finalEdges = edges.filter((edge) => !edgeIdsToDelete.has(edge.id));

				set({
					nodes: finalNodes,
					edges: finalEdges,
				});

				for (const node of nodesToDelete) {
					try {
						await broadcast(mapId, BROADCAST_EVENTS.NODE_DELETE, {
							id: node.id,
							userId: user_id,
							timestamp: Date.now(),
						});
					} catch (error) {
						console.warn('[nodes] Failed to sync Yjs node delete:', error);
					}
				}

				for (const edge of edgesToDelete) {
					try {
						await broadcast(mapId, BROADCAST_EVENTS.EDGE_DELETE, {
							id: edge.id,
							userId: user_id,
							timestamp: Date.now(),
						});
					} catch (error) {
						console.warn('[nodes] Failed to sync Yjs edge delete:', error);
					}
				}

				const { error: deleteError } = await supabase
					.from('nodes')
					.delete()
					.in(
						'id',
						nodesToDelete.map((node) => node.id)
					)
					.eq('map_id', mapId);

				if (deleteError) {
					set((state) => {
						const restoredNodeIds = new Set(state.nodes.map((node) => node.id));
						const restoredEdgeIds = new Set(state.edges.map((edge) => edge.id));

						return {
							nodes: [
								...state.nodes,
								...nodesToDelete.filter(
									(node) => !restoredNodeIds.has(node.id)
								),
							],
							edges: [
								...state.edges,
								...edgesToDelete.filter(
									(edge) => !restoredEdgeIds.has(edge.id)
								),
							],
						};
					});

					for (const node of nodesToDelete) {
						const eventUserId = getNodeActorId(node, user_id);
						const nodeData = serializeNodeForRealtime(
							node,
							mapId,
							eventUserId
						);
						try {
							await broadcast(mapId, BROADCAST_EVENTS.NODE_CREATE, {
								id: node.id,
								data: nodeData,
								userId: eventUserId,
								timestamp: Date.now(),
							});
						} catch (error) {
							console.warn(
								'[nodes] Failed to rollback Yjs node delete after DB error:',
								error
							);
						}
					}

					for (const edge of edgesToDelete) {
						const eventUserId = getEdgeActorId(edge, user_id);
						const edgeData = serializeEdgeForRealtime(
							edge,
							mapId,
							eventUserId
						);
						try {
							await broadcast(mapId, BROADCAST_EVENTS.EDGE_CREATE, {
								id: edge.id,
								data: edgeData,
								userId: eventUserId,
								timestamp: Date.now(),
							});
						} catch (error) {
							console.warn(
								'[nodes] Failed to rollback Yjs edge delete after DB error:',
								error
							);
						}
					}

					throw new Error(deleteError.message || 'Failed to delete nodes.');
				}

				// Determine action name based on deletion count
				const actionName =
					nodesToDelete.length === 1 ? 'deleteNode' : 'deleteNodes';

				// Persist delta to DB for history tracking
				get().persistDeltaEvent(
					actionName,
					{ nodes: prevNodes, edges: prevEdges },
					{ nodes: get().nodes, edges: get().edges }
				);
			},
			'isAddingContent',
			{
				initialMessage: 'Deleting nodes...',
				errorMessage: 'Failed to delete nodes.',
				successMessage: 'Nodes deleted successfully.',
			}
		),

		triggerNodeSave: triggerNodeSaveDebounced,
		flushPendingNodeSaves: async () => {
			await triggerNodeSaveDebounced.flushAll();
		},
		getDirectChildrenCount: (nodeId: string): number => {
			const { edges } = get();
			return edges.filter((edge) => edge.source === nodeId).length;
		},

		getDescendantNodeIds: (nodeId: string): string[] => {
			const { edges } = get();
			const descendants: string[] = [];
			const visited = new Set<string>();

			const findDescendants = (currentNodeId: string) => {
				if (visited.has(currentNodeId)) return;
				visited.add(currentNodeId);

				const childEdges = edges.filter(
					(edge) => edge.source === currentNodeId
				);

				for (const edge of childEdges) {
					if (!visited.has(edge.target)) {
						descendants.push(edge.target);
						findDescendants(edge.target);
					}
				}
			};

			findDescendants(nodeId);
			return descendants;
		},

		getVisibleNodes: (): AppNode[] => {
			const { nodes } = get();
			const collapsedNodes = nodes.filter(
				(node) => node.data.metadata?.isCollapsed
			);
			const hiddenNodeIds = new Set<string>();

			// Collect all descendant IDs of collapsed nodes
			for (const collapsedNode of collapsedNodes) {
				const descendants = get().getDescendantNodeIds(collapsedNode.id);
				descendants.forEach((id) => hiddenNodeIds.add(id));
			}

			// Filter out hidden nodes first
			const visibleNodes = nodes.filter((node) => !hiddenNodeIds.has(node.id));

			// Now handle groups - hide groups if all their children are hidden
			const groupNodes = visibleNodes.filter(
				(node) => node.data.metadata?.isGroup
			);
			const finalHiddenNodeIds = new Set(hiddenNodeIds);

			for (const groupNode of groupNodes) {
				const groupChildren =
					(groupNode.data.metadata?.groupChildren as string[]) || [];

				// If all group children are hidden, hide the group too
				if (
					groupChildren.length > 0 &&
					groupChildren.every((childId) => hiddenNodeIds.has(childId))
				) {
					finalHiddenNodeIds.add(groupNode.id);
				}
			}

			// Filter by comment mode
			const { isCommentMode } = get();
			const baseVisibleNodes = nodes.filter(
				(node) => !finalHiddenNodeIds.has(node.id)
			);

			if (isCommentMode) {
				// In comment mode: show ALL nodes (comments + regular)
				return baseVisibleNodes;
			} else {
				// Normal mode: show all nodes except comment nodes
				return baseVisibleNodes.filter(
					(node) => node.data.node_type !== 'commentNode'
				);
			}
		},

		toggleNodeCollapse: async (nodeId: string): Promise<void> => {
			const { nodes, updateNode } = get();
			const node = nodes.find((n) => n.id === nodeId);

			if (!node) {
				console.error(`Node with id ${nodeId} not found`);
				return;
			}

			const currentCollapsedState = node.data.metadata?.isCollapsed ?? false;
			const newCollapsedState = !currentCollapsedState;

			// Update the node's collapse state (history tracked via updateNode -> persistDeltaEvent)
			await updateNode({
				nodeId,
				data: {
					metadata: {
						...node.data.metadata,
						isCollapsed: newCollapsedState,
					},
				},
			});
		},

		subscribeToNodes: async (mapId: string) => {
			// Guard against concurrent subscription attempts
			if (get()._nodesSubscriptionPending) {
				return;
			}
			set({ _nodesSubscriptionPending: true });

			try {
				// Clean up existing subscription before creating new one
				const existingSub = get()._nodesSubscription;
				if (
					existingSub &&
					typeof (existingSub as any).unsubscribe === 'function'
				) {
					try {
						await (existingSub as any).unsubscribe();
					} catch (e) {
						console.warn(
							'[broadcast] Failed to unsubscribe previous nodes subscription:',
							e
						);
					}
					set({ _nodesSubscription: null });
				}

				// Use secure broadcast channel instead of postgres_changes
				// This provides RLS-protected real-time sync via private channels
				const cleanup = await subscribeToSyncEvents(mapId, {
					onNodeCreate: handleNodeCreate,
					onNodeUpdate: handleNodeUpdate,
					onNodeDelete: handleNodeDelete,
				});

				// Store cleanup function for later unsubscription
				// Note: _nodesSubscription is typed as RealtimeChannel | null but we now store
				// the cleanup function as an object with unsubscribe method for compatibility
				set({
					_nodesSubscription: { unsubscribe: cleanup } as unknown as ReturnType<
						typeof get
					>['_nodesSubscription'],
				});
			} catch (error) {
				console.error('[broadcast] Failed to subscribe to node events:', error);
			} finally {
				set({ _nodesSubscriptionPending: false });
			}
		},

		unsubscribeFromNodes: async () => {
			const { _nodesSubscription } = get();

			if (_nodesSubscription) {
				try {
					// Call cleanup function (decrements ref count, unsubscribes when count reaches 0)
					if (typeof (_nodesSubscription as any).unsubscribe === 'function') {
						await (_nodesSubscription as any).unsubscribe();
					}
					set({ _nodesSubscription: null });
				} catch (error) {
					console.error(
						'[broadcast] Error unsubscribing from node events:',
						error
					);
				}
			}
		},

		/**
		 * Fetches metadata for a resource node from the URL.
		 * Auto-populates title, image, and AI summary.
		 * Called automatically after resource node creation.
		 */
		fetchResourceNodeMetadata: async (nodeId: string, url: string) => {
			const { updateNode } = get();

			try {
				// Mark node as fetching metadata
				await updateNode({
					nodeId,
					data: {
						metadata: {
							isFetchingMetadata: true,
							metadataFetchError: null,
						},
					},
				});

				// Fetch metadata from URL (includes AI summary)
				const metadata = await fetchResourceMetadata(url, true);

				// Update node with fetched metadata
				await updateNode({
					nodeId,
					data: {
						metadata: {
							title: metadata.title || undefined,
							imageUrl: metadata.imageUrl || undefined,
							summary: metadata.summary || undefined,
							// Auto-enable display when data exists
							showThumbnail: !!metadata.imageUrl,
							showSummary: !!metadata.summary,
							isFetchingMetadata: false,
							metadataFetchedAt: new Date().toISOString(),
						},
					},
				});
			} catch (error) {
				// Silent failure for auto-fetch - just update error state
				console.error('Failed to fetch resource metadata:', error);
				await updateNode({
					nodeId,
					data: {
						metadata: {
							isFetchingMetadata: false,
							metadataFetchError:
								error instanceof Error ? error.message : 'Failed to fetch',
						},
					},
				});
			}
		},
	};
};
