import { defaultEdgeData } from '@/constants/default-edge-data';
import { ceilToGrid, GRID_SIZE } from '@/constants/grid';
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
import { AvailableNodeTypes } from '@/registry/node-registry';
import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type { NodeData } from '@/types/node-data';
import { NodesTableType } from '@/types/nodes-table-type';
import type { CreateNodeWithEdgeResponse } from '@/types/rpc-responses';
import { debouncePerKey } from '@/utils/debounce-per-key';
import { applyNodeChanges, XYPosition } from '@xyflow/react';
import { toast } from 'sonner';
import type { StateCreator } from 'zustand';
import type { AppState, NodesSlice } from '../app-state';

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
			width: newRecord.width || undefined,
			height: newRecord.height || undefined,
			zIndex: newRecord.node_type === 'commentNode' ? 100 : undefined,
		};

		set({ nodes: [...nodes, newNode] });
		console.log('[broadcast] Node created:', payload.id);
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
					width: newRecord.width || node.width,
					height: newRecord.height || node.height,
					zIndex: newRecord.node_type === 'commentNode' ? 100 : node.zIndex,
				};
			}
			return node;
		});

		set({ nodes: updatedNodes });
		console.log('[broadcast] Node updated:', payload.id);
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
		console.log('[broadcast] Node deleted:', payload.id);
	};

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

			// Skip if marked within last 3 seconds
			const age = Date.now() - timestamp;
			if (age > 3000) {
				// Clean up stale entry
				const newMap = new Map(get().systemUpdatedNodes);
				newMap.delete(nodeId);
				set({ systemUpdatedNodes: newMap });
				return false;
			}

			if (!get().isReverting && !get().isLayouting) {
				return false;
			}

			return true;
		},

		onNodesChange: (changes) => {
			// Apply changes as before
			const updatedNodes = applyNodeChanges(changes, get().nodes);

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

			// Trigger debounced saves for relevant node changes
			changes.forEach((change) => {
				// Skip if change doesn't have an id (add/remove types)
				if (!('id' in change)) return;

				// Skip saves for system-updated nodes or during revert
				if (get().shouldSkipNodeSave(change.id)) {
					return;
				}

				// Only save when changes are complete (not during dragging/resizing)
				if (
					change.type === 'position' &&
					change.position &&
					change.dragging === false
				) {
					get().triggerNodeSave(change.id);

					// Also save moved children when group is moved
					const movedNode = finalNodes.find((n) => n.id === change.id);

					if (movedNode?.data.metadata?.isGroup) {
						const groupChildren =
							(movedNode.data.metadata.groupChildren as string[]) || [];
						groupChildren.forEach((childId) => {
							get().triggerNodeSave(childId);
						});
					}
				} else if (
					change.type === 'dimensions' &&
					change.dimensions &&
					change.resizing === false
				) {
					get().triggerNodeSave(change.id);
				} else if (change.type === 'replace') {
					// Data changes should trigger a save
					get().triggerNodeSave(change.id);
				}
			});
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
				toastId?: string;
			}) => {
				let { nodeType = 'defaultNode' } = props;
				const { parentNode, position, data = {}, content = 'New node' } = props;
				const {
					mapId,
					supabase,
					nodes,
					edges,
					currentSubscription,
				} = get();

				if (!mapId) {
					toast.loading(
						"Attempted to add node with unknown type: ${nodeType}. Falling back to 'defaultNode'.",
						{ id: props.toastId }
					);
					nodeType = 'defaultNode';
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

				const newNodeId = generateUuid();
				let newNode: AppNode | null = null;
				let newNodePosition: XYPosition = {
					x: 0,
					y: 0,
				};

				if (position) {
					newNodePosition = position;
				} else if (parentNode && parentNode.position) {
					// Use improved parent-relative positioning with better spacing
					const parentHeight = parentNode.height || 60;

					// Calculate position based on number of existing children
					newNodePosition = {
						x: parentNode.position.x,
						y: parentNode.position.y + parentHeight + 60,
					};
				}

				const user = await supabase?.auth.getSession();
				if (!user?.data.session) throw new Error('User not authenticated.');

				// Prepare edge defaults for RPC
				const edgeDefaults = defaultEdgeData();
				const edgeId = parentNode?.id ? generateUuid() : null;

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
					throw new Error(
						rpcError?.message || 'Failed to save new node to database.'
					);
				}

				const result = rpcResult as CreateNodeWithEdgeResponse;
				const insertedNodeData = result.node;
				const insertedEdgeData = result.edge;

				newNode = {
					id: insertedNodeData.id,
					position: {
						x: insertedNodeData.position_x,
						y: insertedNodeData.position_y,
					},

					data: insertedNodeData,
					type: insertedNodeData.node_type || 'defaultNode',

					width: insertedNodeData.width || undefined,
					height: insertedNodeData.height || undefined,
					zIndex:
						insertedNodeData.node_type === 'commentNode' ? 100 : undefined,
				};

				const finalNodes = [...nodes, newNode];
				const finalEdges = [...edges];

				// Add edge to state if RPC created one (when parent was provided)
				if (insertedEdgeData) {
					const newFlowEdge: AppEdge = {
						id: insertedEdgeData.id,
						source: insertedEdgeData.source,
						target: insertedEdgeData.target,
						type: 'floatingEdge',
						animated: false,
						label: insertedEdgeData.label,
						style: {
							stroke: insertedEdgeData.style?.stroke || '#6c757d',
							strokeWidth: insertedEdgeData.style?.strokeWidth || 2,
						},
						markerEnd: insertedEdgeData.markerEnd,
						data: insertedEdgeData,
					};
					finalEdges.push(newFlowEdge);
				}

				// Persist delta to DB for history tracking
				get().persistDeltaEvent(
					'addNode',
					{ nodes, edges },
					{ nodes: finalNodes, edges: finalEdges }
				);

				set({
					nodes: finalNodes,
					edges: finalEdges,
				});

				// Broadcast node creation to other clients
				// mapId is guaranteed non-null here (checked at function start)
				if (mapId) {
					await broadcast(mapId, BROADCAST_EVENTS.NODE_CREATE, {
						id: newNodeId,
						data: insertedNodeData as unknown as Record<string, unknown>,
						userId: user.data.session.user.id,
						timestamp: Date.now(),
					});

					// Also broadcast edge creation if one was created
					if (insertedEdgeData) {
						await broadcast(mapId, BROADCAST_EVENTS.EDGE_CREATE, {
							id: insertedEdgeData.id,
							data: insertedEdgeData as unknown as Record<string, unknown>,
							userId: user.data.session.user.id,
							timestamp: Date.now(),
						});
					}
				}

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
							width: data.width || node.width,
							height: data.height || node.height,
							position: {
								x: data.position_x || node.position.x,
								y: data.position_y || node.position.y,
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

			// Trigger debounced save to persist changes
			get().triggerNodeSave(nodeId);

			// Persist delta to DB for history tracking
			get().persistDeltaEvent(
				'saveNodeProperties',
				{ nodes: prevNodes, edges: prevEdges },
				{ nodes: get().nodes, edges: get().edges }
			);
		},
		updateNodeDimensions: (
			nodeId: string,
			width: number,
			height: number,
			imageSize?: { width: number; height: number }
		) => {
			const prevNodes = get().nodes;
			const prevEdges = get().edges;
			const { nodes } = get();
			const node = nodes.find((n) => n.id === nodeId);

			if (!node) return;

			// Snap incoming dimensions up to GRID_SIZE before comparing
			const snappedWidth = ceilToGrid(width, GRID_SIZE);
			const snappedHeight = ceilToGrid(height, GRID_SIZE);

			// Check if dimensions have actually changed (>5px threshold)
			const currentWidth = node.measured?.width || node.width || 0;
			const currentHeight = node.measured?.height || node.height || 0;
			const widthChanged = Math.abs(snappedWidth - currentWidth) > 15;
			const heightChanged = Math.abs(snappedHeight - currentHeight) > 15;

			// If dimensions haven't changed significantly, skip update
			if (!widthChanged && !heightChanged) {
				return;
			}

			// Update the node dimensions in local state
			set((state) => ({
				nodes: state.nodes.map((node) => {
					if (node.id === nodeId) {
						return {
							...node,
							// Update both the node dimensions and data dimensions
							width: snappedWidth,
							height: snappedHeight,
							measured: {
								width: snappedWidth,
								height: snappedHeight,
							},
							data: {
								...node.data,
								width: snappedWidth,
								height: snappedHeight,
								metadata: {
									...node.data.metadata,
									imageSize: imageSize,
								},
							},
						};
					}

					return node;
				}),
			}));

			// Trigger debounced save to persist dimension changes
			get().triggerNodeSave(nodeId);

			// Persist delta to DB for history tracking
			get().persistDeltaEvent(
				'updateNodeDimensions',
				{ nodes: prevNodes, edges: prevEdges },
				{ nodes: get().nodes, edges: get().edges }
			);
		},
		deleteNodes: withLoadingAndToast(
			async (nodesToDelete: AppNode[]) => {
				const {
					mapId,
					supabase,
					edges,
					nodes: allNodes,
				} = get();

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

				const { data: newNodes, error: deleteError } = await supabase
					.from('nodes')
					.delete()
					.in(
						'id',
						nodesToDelete.map((node) => node.id)
					)
					.eq('map_id', mapId)
					.select();

				if (deleteError) {
					throw new Error(deleteError.message || 'Failed to delete nodes.');
				}

				const finalNodes = allNodes.filter((n) => !nodesToDelete.includes(n));
				const finalEdges = edges.filter((e) => !edgesToDelete.includes(e));

				// Determine action name based on deletion count
				const actionName =
					nodesToDelete.length === 1 ? 'deleteNode' : 'deleteNodes';

				// Persist delta to DB for history tracking
				get().persistDeltaEvent(
					actionName,
					{ nodes: prevNodes, edges: prevEdges },
					{ nodes: finalNodes, edges: finalEdges }
				);

				set({
					nodes: finalNodes,
					edges: finalEdges,
				});

				// Broadcast node deletions to other clients
				for (const node of nodesToDelete) {
					await broadcast(mapId, BROADCAST_EVENTS.NODE_DELETE, {
						id: node.id,
						userId: user_id,
						timestamp: Date.now(),
					});
				}

				// Broadcast edge deletions that were cascaded
				for (const edge of edgesToDelete) {
					await broadcast(mapId, BROADCAST_EVENTS.EDGE_DELETE, {
						id: edge.id,
						userId: user_id,
						timestamp: Date.now(),
					});
				}
			},
			'isAddingContent',
			{
				initialMessage: 'Deleting nodes...',
				errorMessage: 'Failed to delete nodes.',
				successMessage: 'Nodes deleted successfully.',
			}
		),

		triggerNodeSave: debouncePerKey(
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

				const user_id = (await supabase.auth.getSession()).data.session?.user
					?.id;

				if (!user_id) {
					throw new Error('Not authenticated');
				}

				// Prepare node data for saving, ensuring type safety
				const nodeData: NodesTableType = {
					id: nodeId,
					map_id: mapId,
					user_id: user_id,
					content: node.data.content || '',
					metadata: node.data.metadata || {},
					aiData: node.data.aiData || {},
					position_x: node.position.x,
					position_y: node.position.y,
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

				// Broadcast update to other clients after successful save
				await broadcast(mapId, BROADCAST_EVENTS.NODE_UPDATE, {
					id: nodeId,
					data: nodeData as unknown as Record<string, unknown>,
					userId: currentUser?.id || user_id,
					timestamp: Date.now(),
				});
			},
			STORE_SAVE_DEBOUNCE_MS,
			(nodeId: string) => nodeId // getKey function for triggerNodeSave
		),
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
				console.log('[broadcast] Node subscription already pending, skipping');
				return;
			}
			set({ _nodesSubscriptionPending: true });

			try {
				// Clean up existing subscription before creating new one
				const existingSub = get()._nodesSubscription;
				if (existingSub && typeof (existingSub as any).unsubscribe === 'function') {
					try {
						await (existingSub as any).unsubscribe();
					} catch (e) {
						console.warn('[broadcast] Failed to unsubscribe previous nodes subscription:', e);
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

				console.log('[broadcast] Subscribed to node events for map:', mapId);
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
					console.log('[broadcast] Unsubscribed from node events');
				} catch (error) {
					console.error('[broadcast] Error unsubscribing from node events:', error);
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
