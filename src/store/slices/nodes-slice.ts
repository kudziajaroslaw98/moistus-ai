import { ceilToGrid, GRID_SIZE } from '@/constants/grid';
import { STORE_SAVE_DEBOUNCE_MS } from '@/constants/store-save-debounce-ms';
import generateUuid from '@/helpers/generate-uuid';
import withLoadingAndToast from '@/helpers/with-loading-and-toast';
import { AvailableNodeTypes } from '@/registry/node-registry';
import type { AppNode } from '@/types/app-node';
import type { NodeData } from '@/types/node-data';
import { NodesTableType } from '@/types/nodes-table-type';
import { debouncePerKey } from '@/utils/debounce-per-key';
import { applyNodeChanges, XYPosition } from '@xyflow/react';
import { toast } from 'sonner';
import type { StateCreator } from 'zustand';
import type { AppState, NodesSlice } from '../app-state';

export const createNodeSlice: StateCreator<AppState, [], [], NodesSlice> = (
	set,
	get
) => {
	// Handle real-time node events
	const handleNodeRealtimeEvent = (payload: any) => {
		const { eventType, new: newRecord, old: oldRecord } = payload;
		const { nodes, lastSavedNodeTimestamps } = get();

		// Skip if this change was made by current user recently (prevent loops)
		const nodeId = newRecord?.id || oldRecord?.id;

		if (nodeId && lastSavedNodeTimestamps[nodeId]) {
			const timeSinceLastSave = Date.now() - lastSavedNodeTimestamps[nodeId];

			if (timeSinceLastSave < 1000) {
				// Skip if saved within last second
				return;
			}
		}

		switch (eventType) {
			case 'INSERT': {
				if (newRecord) {
					// Check if node already exists (prevent duplicates)
					const existingNode = nodes.find((n) => n.id === newRecord.id);

					if (!existingNode) {
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
						};

						set({ nodes: [...nodes, newNode] });
						console.log('Real-time: Node added', newRecord.id);
					}
				}

				break;
			}

			case 'UPDATE': {
				if (newRecord) {
					const existingNode = nodes.find((n) => n.id === newRecord.id);
					const oldPosition = existingNode
						? { x: existingNode.position.x, y: existingNode.position.y }
						: null;
					const newPosition = {
						x: newRecord.position_x,
						y: newRecord.position_y,
					};

					// Check if this node was recently moved locally (within last 2 seconds)
					const wasRecentlyMoved =
						lastSavedNodeTimestamps[newRecord.id] &&
						Date.now() - lastSavedNodeTimestamps[newRecord.id] < 2000;

					const positionChanged =
						oldPosition &&
						(oldPosition.x !== newPosition.x ||
							oldPosition.y !== newPosition.y);

					const updatedNodes = nodes.map((node) => {
						if (node.id === newRecord.id) {
							// Only update position if it wasn't recently moved locally
							const shouldUpdatePosition =
								!wasRecentlyMoved || !positionChanged;

							return {
								...node,
								position: shouldUpdatePosition
									? {
											x: newRecord.position_x,
											y: newRecord.position_y,
										}
									: node.position,
								data: newRecord,
								type: newRecord.node_type || node.type,
								width: newRecord.width || node.width,
								height: newRecord.height || node.height,
							};
						}

						return node;
					});

					set({ nodes: updatedNodes });
					console.log('Real-time: Node updated', newRecord.id);
				}

				break;
			}

			case 'DELETE': {
				if (oldRecord) {
					const filteredNodes = nodes.filter(
						(node) => node.id !== oldRecord.id
					);
					set({ nodes: filteredNodes });
					console.log('Real-time: Node deleted', oldRecord.id);
				}

				break;
			}
		}
	};

	return {
		nodes: [],
		selectedNodes: [],
		lastSavedNodeTimestamps: {},
		_nodesSubscription: null,

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
				} else if (change.type === 'select' || change.type === 'remove') {
					// No need to save for these change types
					return;
				} else if (change.type === 'add') {
					// New nodes are handled elsewhere
					return;
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

			// Update selectedNodeId for comments panel
			if (selectedNodes.length === 1) {
				set({ selectedNodeId: selectedNodes[0].id });
			} else {
				set({ selectedNodeId: null });
			}
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
					addStateToHistory,
					currentSubscription,
				} = get();

				if (!mapId) {
					toast.loading(
						"Attempted to add node with unknown type: ${nodeType}. Falling back to 'defaultNode'.",
						{ id: props.toastId }
					);
					nodeType = 'defaultNode';
				}

				// Check node creation limit for free tier users
				const devBypass = process.env.NEXT_PUBLIC_DEV_BYPASS_LIMITS === 'true';

				if (!devBypass) {
					const isPro =
						currentSubscription?.plan?.name === 'pro' ||
						currentSubscription?.plan?.name === 'enterprise';
					const limit = currentSubscription?.plan?.limits?.nodesPerMap ?? 50; // Free tier default

					if (!isPro && limit !== -1) {
						const currentNodeCount = nodes.length;

						if (currentNodeCount >= limit) {
							// Throw error which will be displayed as a toast by withLoadingAndToast
							throw new Error(
								`Node limit reached (${limit} nodes per map). Upgrade to Pro for unlimited nodes.`
							);
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

				const newNodeDbData: Omit<NodeData, 'created_at' | 'updated_at'> & {
					created_at?: string;
					updated_at?: string;
				} = {
					id: newNodeId,
					user_id: user.data.session.user.id,
					map_id: mapId,
					parent_id: parentNode?.id,
					content: content,
					position_x: newNodePosition.x,
					position_y: newNodePosition.y,
					node_type: nodeType,
					...data,
				};

				const { data: insertedNodeData, error: nodeInsertError } =
					await supabase
						.from('nodes')
						.insert([newNodeDbData])
						.select('*')
						.single();

				if (nodeInsertError || !insertedNodeData) {
					throw new Error(
						nodeInsertError?.message || 'Failed to save new node to database.'
					);
				}

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
				};

				const finalNodes = [...nodes, newNode];
				const finalEdges = [...edges];

				const addEdge = get().addEdge;

				if (parentNode && parentNode.id) {
					const newEdge = await addEdge(
						parentNode.id,
						newNode.id,
						{
							source: parentNode.id,
							target: newNode.id,
						},
						props.toastId
					);

					finalEdges.push(newEdge);
				}

				addStateToHistory('addNode', { nodes: finalNodes, edges: finalEdges });
				// Persist precise delta (prev vs next)
				get().persistDeltaEvent(
					'addNode',
					{ nodes, edges },
					{ nodes: finalNodes, edges: finalEdges }
				);

				set({
					nodes: finalNodes,
					edges: finalEdges,
				});
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

			// Record delta event in history (only changed fields will be saved)
			get().addStateToHistory('saveNodeProperties', {
				nodes: get().nodes,
				edges: get().edges,
			});
			// Persist precise delta
			get().persistDeltaEvent(
				'saveNodeProperties',
				{ nodes: prevNodes, edges: prevEdges },
				{ nodes: get().nodes, edges: get().edges }
			);
		},
		updateNodeDimensions: (nodeId: string, width: number, height: number) => {
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
			const widthChanged = Math.abs(snappedWidth - currentWidth) > 5;
			const heightChanged = Math.abs(snappedHeight - currentHeight) > 5;

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
							},
						};
					}

					return node;
				}),
			}));

			// Trigger debounced save to persist dimension changes
			get().triggerNodeSave(nodeId);

			// Record delta event in history for dimension change
			get().addStateToHistory('updateNodeDimensions', {
				nodes: get().nodes,
				edges: get().edges,
			});
			// Persist precise delta for dimension change
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
					addStateToHistory,
				} = get();

				if (!mapId || !nodesToDelete) return;

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
					.eq('user_id', user_id)
					.select();

				if (deleteError) {
					throw new Error(deleteError.message || 'Failed to delete nodes.');
				}

				const finalNodes = allNodes.filter((n) => !nodesToDelete.includes(n));
				const finalEdges = edges.filter((e) => !edgesToDelete.includes(e));

				addStateToHistory('deleteNode', {
					nodes: finalNodes,
					edges: finalEdges,
				});

				set({
					nodes: finalNodes,
					edges: finalEdges,
				});
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
				const { nodes, supabase, mapId } = get();
				const node = nodes.find((n) => n.id === nodeId);

				if (!node || !node.data) {
					console.error(`Node with id ${nodeId} not found or has invalid data`);
					throw new Error(
						`Node with id ${nodeId} not found or has invalid data`
					);
				}

				set((state) => ({
					lastSavedNodeTimestamps: {
						...state.lastSavedNodeTimestamps,
						[nodeId]: Date.now(),
					},
				}));

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
				supabase
					.from('nodes')
					.update(nodeData)
					.eq('id', nodeId)
					.eq('map_id', mapId)
					.then(({ error }) => {
						if (error) {
							console.error('Error saving node:', error);
							throw new Error('Failed to save node changes');
						}
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

			// Return only visible nodes (excluding groups with all hidden children)
			return nodes.filter((node) => !finalHiddenNodeIds.has(node.id));
		},

		toggleNodeCollapse: async (nodeId: string): Promise<void> => {
			const { nodes, updateNode, addStateToHistory } = get();
			const node = nodes.find((n) => n.id === nodeId);

			if (!node) {
				console.error(`Node with id ${nodeId} not found`);
				return;
			}

			const currentCollapsedState = node.data.metadata?.isCollapsed ?? false;
			const newCollapsedState = !currentCollapsedState;

			// Update the node's collapse state
			await updateNode({
				nodeId,
				data: {
					metadata: {
						...node.data.metadata,
						isCollapsed: newCollapsedState,
					},
				},
			});

			// Add to history for undo/redo
			addStateToHistory(newCollapsedState ? 'collapseNode' : 'expandNode', {
				nodes: get().nodes,
				edges: get().edges,
			});
		},

		subscribeToNodes: async (mapId: string) => {
			const { supabase, _nodesSubscription } = get();

			// Unsubscribe from existing subscription first
			if (_nodesSubscription) {
				await _nodesSubscription.unsubscribe();
			}

			try {
				const channel = supabase
					.channel(`mind-map-nodes-${mapId}`)
					.on(
						'postgres_changes',
						{
							event: '*',
							schema: 'public',
							table: 'nodes',
							filter: `map_id=eq.${mapId}`,
						},
						handleNodeRealtimeEvent
					)
					.subscribe((status: string) => {
						if (status === 'SUBSCRIBED') {
							console.log(
								'Subscribed to nodes real-time updates for map:',
								mapId
							);
						} else if (status === 'CHANNEL_ERROR') {
							console.error('Error subscribing to nodes real-time updates');
						}
					});

				set({ _nodesSubscription: channel });
			} catch (error) {
				console.error('Failed to subscribe to nodes updates:', error);
			}
		},

		unsubscribeFromNodes: async () => {
			const { _nodesSubscription } = get();

			if (_nodesSubscription) {
				try {
					await _nodesSubscription.unsubscribe();
					set({ _nodesSubscription: null });
					console.log('Unsubscribed from nodes real-time updates');
				} catch (error) {
					console.error('Error unsubscribing from nodes updates:', error);
				}
			}
		},
	};
};
