import { rerouteAutoWaypointEdges } from '@/helpers/route-auto-waypoint-edges';
import { getSharedSupabaseClient } from '@/helpers/supabase/shared-client';
import {
	transformSupabaseData,
	type SupabaseMapData,
} from '@/helpers/transform-supabase-data';
import {
	generateFallbackAvatar,
	generateFunName,
	generateUserColor,
} from '@/helpers/user-profile-helpers';
import {
	getMapCacheRecord,
	setMapCacheRecord,
} from '@/lib/offline/indexed-db';
import { queueMutation } from '@/lib/offline/offline-mutation-adapter';
import withLoadingAndToast from '@/helpers/with-loading-and-toast';
import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import {
	DEFAULT_LAYOUT_CONFIG,
	normalizeLayoutDirection,
} from '@/types/layout-types';
import type { MindMapData } from '@/types/mind-map-data';
import { UserProfile } from '@/types/user-profile-types';
import type { User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import type { StateCreator } from 'zustand';
import type { AppState, CoreDataSlice } from '../app-state';

const isLikelyOfflineError = (message?: string | null): boolean => {
	if (!message) {
		return false;
	}
	const lowered = message.toLowerCase();
	return (
		lowered.includes('fetch') ||
		lowered.includes('network') ||
		lowered.includes('offline') ||
		lowered.includes('failed to fetch')
	);
};

const readCachedGraphData = (payload: unknown): SupabaseMapData | null => {
	if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
		return null;
	}

	const record = payload as { graphData?: unknown };
	if (!record.graphData || typeof record.graphData !== 'object') {
		return null;
	}

	return record.graphData as SupabaseMapData;
};

export const createCoreDataSlice: StateCreator<
	AppState,
	[],
	[],
	CoreDataSlice
> = (set, get) => ({
	// Initial state
	supabase: getSharedSupabaseClient(),
	mapId: null,
	reactFlowInstance: null,
	mindMap: null,
	currentUser: null,
	activeTool: 'default',
	mobileTapMultiSelectEnabled: false,
	mapAccessError: null,
	_realtimeUnsubscribePromise: null,

	// Actions
	setActiveTool: (activeTool) => {
		set({ activeTool });
		get().handleOnboardingToolModeChanged?.(activeTool);
	},
	setMobileTapMultiSelectEnabled: (mobileTapMultiSelectEnabled) =>
		set({ mobileTapMultiSelectEnabled }),
	setMindMap: (mindMap) => set({ mindMap }),
	setMindMapContent: (content: { nodes: AppNode[]; edges: AppEdge[] }) =>
		set({ nodes: content.nodes, edges: content.edges }),
	setReactFlowInstance: (reactFlowInstance) => set({ reactFlowInstance }),
	setMapId: (mapId) => set({ mapId }),
	setCurrentUser: (currentUser) => {
		set({ currentUser, ...(currentUser ? { isLoggingOut: false } : {}) });
		// Load user profile from database when current user changes
		if (currentUser) {
			void get()
				.loadUserProfile()
				.catch((err) =>
					console.error('[core-slice] loadUserProfile failed:', err)
				);
		}
	},
	setState: (state: Partial<AppState>) => set({ ...state }),
	setMapAccessError: (error) => set({ mapAccessError: error }),
	clearMapAccessError: () => set({ mapAccessError: null }),
	clearMindMapRuntimeState: () => {
		void get().unsubscribeFromRealtimeUpdates();
		get().unsubscribeFromSharing?.();
		get().unsubscribeFromCollaboratorUpdates?.();
		get().clearPermissionsState();
		get().stopStream?.();
		get().clearToast?.();

		set({
			mindMap: null,
			mapId: null,
			reactFlowInstance: null,
			activeTool: 'default',
			mobileTapMultiSelectEnabled: false,
			mapAccessError: null,
			nodes: [],
			edges: [],
			selectedNodes: [],
			systemUpdatedNodes: new Map(),
			systemUpdatedEdges: new Map(),
			realtimeSelectedNodes: [],
			comments: [],
			commentMessages: {},
			activeCommentId: null,
			isLoadingComments: false,
			commentError: null,
			historyMeta: [],
			historyIndex: -1,
			isReverting: false,
			revertingIndex: null,
			historyPageOffset: 0,
			historyHasMore: false,
			popoverOpen: {
				contextMenu: false,
				edgeEdit: false,
				history: false,
				mergeSuggestions: false,
				aiContent: false,
				generateFromNodesModal: false,
				sharePanel: false,
				joinRoom: false,
				permissionManager: false,
				roomCodeDisplay: false,
				guestSignup: false,
				aiChat: false,
				referenceSearch: false,
				mapSettings: false,
				upgradeUser: false,
			},
			edgeInfo: null,
			contextMenuState: {
				x: 0,
				y: 0,
				nodeId: null,
				edgeId: null,
			},
			isFocusMode: false,
			isCommentMode: false,
			isDraggingNodes: false,
			nodeEditor: {
				isOpen: false,
				mode: 'create',
				position: { x: 0, y: 0 },
				screenPosition: { x: 0, y: 0 },
				parentNode: null,
				existingNodeId: null,
				suggestedType: null,
				initialValue: null,
				onboardingSource: null,
			},
			commandPalette: {
				isOpen: false,
				position: { x: 0, y: 0 },
				searchQuery: '',
				selectedIndex: 0,
				filteredCommands: [],
				trigger: null,
				anchorPosition: 0,
				activeNodeType: 'defaultNode',
			},
			aiFeature: 'suggest-nodes',
			ghostNodes: [],
			isGeneratingSuggestions: false,
			suggestionError: null,
			mergeSuggestions: [],
			isStreaming: false,
			streamingError: null,
			activeStreamId: null,
			streamTrigger: null,
			chunks: [],
			streamingAPI: null,
			stopStreamCallback: null,
			lastTriggerTime: 0,
			pendingAnimations: new Map(),
			chatMessages: [],
			isChatStreaming: false,
			chatContext: {
				mapId: null,
				selectedNodeIds: [],
				contextMode: 'summary',
			},
			isChatOpen: false,
			shareTokens: [],
			currentShares: [],
			activeToken: undefined,
			sharingError: undefined,
			lastJoinResult: undefined,
			loadingStates: {
				isAddingContent: false,
				isStateLoading: false,
				isHistoryLoading: false,
				isGenerating: false,
				isSummarizing: false,
				isExtracting: false,
				isSearching: false,
				isGeneratingContent: false,
				isSuggestingConnections: false,
				isSummarizingBranch: false,
				isSuggestingMerges: false,
				isSavingNode: false,
				isSavingEdge: false,
				isLoadingComments: false,
				isSavingComment: false,
				isDeletingComment: false,
				isUpdatingMapSettings: false,
				isDeletingMap: false,
			},
		});
	},

	generateUserProfile: (user: User | null): UserProfile | null => {
		if (!user) return null;

		const displayName =
			user.user_metadata?.display_name ||
			user.user_metadata?.full_name ||
			user.email?.split('@')[0] ||
			generateFunName(user.id);

		const is_anonymous =
			!user.email || user.user_metadata?.is_anonymous === true;

		return {
			id: user.id,
			user_id: user.id,
			full_name: user.user_metadata?.full_name || displayName,
			display_name: displayName,
			avatar_url:
				user.user_metadata?.avatar_url || generateFallbackAvatar(user.id),
			bio: '',
			preferences: {},
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			color: generateUserColor(user.id),
			is_anonymous,
		};
	},

	getCurrentUser: async () => {
		const { data } = await get().supabase.auth.getUser();
		const currentUser = data?.user;

		set({ currentUser, ...(currentUser ? { isLoggingOut: false } : {}) });

		// Load user profile from database
		if (currentUser) {
			await get().loadUserProfile();
		}

		return currentUser;
	},

	centerOnNode: (nodeId: string) => {
		const { reactFlowInstance, nodes } = get();

		if (!reactFlowInstance) {
			console.warn('ReactFlow instance not available');
			return;
		}

		const node = nodes.find((n) => n.id === nodeId);

		if (!node) {
			console.warn(`Node with id ${nodeId} not found`);
			return;
		}

		// Center the view on the node with smooth animation
		reactFlowInstance.setCenter(
			node.position.x + (node.width || 0) / 2,
			node.position.y + (node.height || 0) / 2,
			{ zoom: 1.2, duration: 800 }
		);
		reactFlowInstance.updateNode(nodeId, { selected: true });
		get().setSelectedNodes([node]);
	},

	fetchMindMapData: withLoadingAndToast(
		async (mapId: string, toastId?: string | number) => {
			if (!mapId) {
				throw new Error('Map ID is required.');
			}

			const isRequestCurrent = () => get().mapId === mapId;
			const dismissLoadingToast = () => {
				if (toastId) {
					toast.dismiss(toastId);
				}
			};
			const abortIfStale = () => {
				if (isRequestCurrent()) {
					return false;
				}
				dismissLoadingToast();
				return true;
			};

			// Avoid stale permission state while switching maps.
			get().unsubscribeFromPermissionUpdates();
			get().clearPermissionsState();

			// Clear any previous access error
			set({ mapAccessError: null });

			const { data: mindMapData, error: mindMapError } = await get()
				.supabase.from('map_graph_aggregated_view')
				.select('*')
				.eq('map_id', mapId)
				.single();
			if (abortIfStale()) {
				return;
			}

				// Handle potential access denial (PGRST116 = no rows returned)
				if (mindMapError) {
					console.error('Error fetching from Supabase:', mindMapError);
					const offlineCache = await getMapCacheRecord(mapId);
					if (
						offlineCache?.payload &&
						isLikelyOfflineError(mindMapError.message)
					) {
						if (abortIfStale()) {
							return;
						}

						const cachedGraph = readCachedGraphData(offlineCache.payload);
						if (cachedGraph) {
							if (abortIfStale()) {
								return;
							}

							const cachedTransformed = transformSupabaseData(cachedGraph);
							const normalizedCachedEdges = rerouteAutoWaypointEdges({
								nodes: cachedTransformed.reactFlowNodes as AppNode[],
							edges: cachedTransformed.reactFlowEdges,
							direction:
								cachedTransformed.mindMap.layout_direction ??
								DEFAULT_LAYOUT_CONFIG.direction,
								legacyOnly: true,
							});

							if (abortIfStale()) {
								return;
							}

							set((state) => ({
								mindMap: cachedTransformed.mindMap,
								nodes: cachedTransformed.reactFlowNodes,
							edges: normalizedCachedEdges.edges,
							layoutConfig: {
								...state.layoutConfig,
								direction:
									cachedTransformed.mindMap.layout_direction ??
									DEFAULT_LAYOUT_CONFIG.direction,
								},
							}));

							if (toastId) {
								toast.success('Loaded cached map data (offline mode)', { id: toastId });
							}
							return;
						}
					}

				// Check if this is an access/not-found error
				if (
					mindMapError.code === 'PGRST116' ||
					mindMapError.message?.includes('no rows')
				) {
					try {
						// Call check-access API to determine the reason
						const response = await fetch(`/api/maps/${mapId}/check-access`);
						if (abortIfStale()) {
							return;
						}

						if (response.ok) {
							const result = await response.json();
							if (abortIfStale()) {
								return;
							}
							const { status } = result.data;
							const currentUser = get().currentUser;
							const userProfile = get().generateUserProfile(currentUser);
							const is_anonymous = userProfile?.is_anonymous ?? true;

							if (status === 'no_access') {
								set({
									mapAccessError: {
										type: 'access_denied',
										isAnonymous: is_anonymous,
									},
								});
								// Dismiss loading toast silently - UI handles error state
								dismissLoadingToast();
								return;
							}

							if (status === 'not_found') {
								set({
									mapAccessError: {
										type: 'not_found',
										isAnonymous: is_anonymous,
									},
								});
								// Dismiss loading toast silently - UI handles error state
								dismissLoadingToast();
								return;
							}
							// If status is 'owner' or 'shared', something else went wrong
							// Fall through to throw generic error
						}
					} catch (checkError) {
						console.error('Error checking map access:', checkError);
						// If check-access fails, fall through to generic error
					}
				}

				if (abortIfStale()) {
					return;
				}

				throw new Error(
					mindMapError.message || 'Failed to fetch mind map data.'
				);
			}

			if (!mindMapData) {
				if (abortIfStale()) {
					return;
				}
				// This shouldn't happen if error handling above is correct
				const currentUser = get().currentUser;
				const userProfile = get().generateUserProfile(currentUser);
				set({
					mapAccessError: {
						type: 'not_found',
						isAnonymous: userProfile?.is_anonymous ?? true,
					},
				});
				// Dismiss loading toast silently - UI handles error state
				dismissLoadingToast();
				return;
			}

			let graphData = mindMapData as unknown as SupabaseMapData;
			const currentUserId = get().currentUser?.id ?? null;
			const isTemplateMap = Boolean(graphData.is_template);
			const isTemplateOwner = Boolean(
				currentUserId && graphData.user_id === currentUserId
			);
			const hasEmptyTemplateGraph =
				(graphData.nodes?.length ?? 0) === 0 &&
				(graphData.edges?.length ?? 0) === 0;

			// Work around template RLS drift by hydrating graph data from server API.
			if (isTemplateMap && !isTemplateOwner && hasEmptyTemplateGraph) {
				try {
					const templateResponse = await fetch(`/api/templates/${mapId}`);
					if (abortIfStale()) {
						return;
					}

					if (templateResponse.ok) {
						const templateResult = (await templateResponse.json()) as {
							data?: { mindMapData?: SupabaseMapData };
						};
						if (abortIfStale()) {
							return;
						}

						if (templateResult.data?.mindMapData) {
							graphData = templateResult.data.mindMapData;
						}
					} else {
						console.warn(
							'[core-slice] template graph hydration failed:',
							templateResponse.status
						);
					}
				} catch (templateError) {
					console.warn(
						'[core-slice] template graph hydration error:',
						templateError
					);
				}
			}

			if (abortIfStale()) {
				return;
			}

			await setMapCacheRecord(mapId, {
				graphData,
			});

			const normalizedPersistedLayoutDirection = normalizeLayoutDirection(
				graphData.layout_direction
			);
			const shouldPersistNormalizedLayoutDirection =
				graphData.layout_direction !== null &&
				normalizedPersistedLayoutDirection !== null &&
				graphData.layout_direction !== normalizedPersistedLayoutDirection;

			const transformedData = transformSupabaseData(graphData);
			const normalizedEdgesResult = rerouteAutoWaypointEdges({
				nodes: transformedData.reactFlowNodes as AppNode[],
				edges: transformedData.reactFlowEdges,
				direction:
					transformedData.mindMap.layout_direction ??
					DEFAULT_LAYOUT_CONFIG.direction,
				legacyOnly: true,
			});
			if (abortIfStale()) {
				return;
			}

			set((state) => ({
				mindMap: transformedData.mindMap,
				nodes: transformedData.reactFlowNodes,
				edges: normalizedEdgesResult.edges,
				layoutConfig: {
					...state.layoutConfig,
					direction:
						transformedData.mindMap.layout_direction ??
						DEFAULT_LAYOUT_CONFIG.direction,
				},
			}));

			if (
				shouldPersistNormalizedLayoutDirection &&
				normalizedPersistedLayoutDirection
			) {
				void persistNormalizedLayoutDirection(
					mapId,
					get().supabase,
					normalizedPersistedLayoutDirection,
					graphData.map_updated_at
				);
			}

			if (normalizedEdgesResult.affectedEdgeIds.size > 0) {
				void persistNormalizedAutoRoutedEdges(
					mapId,
					get().supabase,
					normalizedEdgesResult.edges.filter((edge) =>
						normalizedEdgesResult.affectedEdgeIds.has(edge.id)
					)
				);
			}

			// Show success immediately - data is loaded and visible to user
			// Don't wait for background subscriptions which may hang
			if (toastId) {
				toast.success('Mind map loaded', { id: toastId });
			}
			if (abortIfStale()) {
				return;
			}

			// Only await what's needed for UI rendering (comments + permissions)
			// Subscriptions have 10s timeouts and shouldn't block isStateLoading
			await Promise.all([
				get().fetchComments(mapId),
				// Fetch permissions first; realtime updates apply deltas afterwards.
				get().fetchInitialPermissions(mapId),
			]);
			if (abortIfStale()) {
				return;
			}

			// Fire subscriptions in background - don't await
			// These have 10s timeouts and shouldn't gate UI/permissions
			get().subscribeToRealtimeUpdates(mapId);
			get().subscribeToPermissionUpdates(mapId);
		},
		'isStateLoading',
		{
			initialMessage: 'Fetching mind map data...',
			errorMessage: 'Failed to fetch mind map data.',
			successMessage: null, // Handled manually to avoid success toast on early returns
		}
	),

	updateMindMap: withLoadingAndToast(
		async (mapId: string, updates: Partial<MindMapData>) => {
			if (!mapId) {
				throw new Error('Map ID is required.');
			}

			const mutation = await queueMutation<MindMapData | null>({
				entity: 'mind_maps',
				action: 'update',
				baseVersion: get().mindMap?.updated_at ?? null,
				payload: {
					table: 'mind_maps',
					values: updates as Record<string, unknown>,
					match: {
						id: mapId,
					},
				},
				executeOnline: async () => {
					const response = await fetch(`/api/maps/${mapId}`, {
						method: 'PUT',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify(updates),
					});

					if (!response.ok) {
						const errorData = await response.json();
						throw new Error(errorData.error || 'Failed to update map.');
					}

					const result = await response.json();
					return (result.data?.map as MindMapData | undefined) ?? null;
				},
			});
			const updatedMap = mutation.status === 'applied' ? mutation.data : null;

			if (updatedMap) {
				set((state) => ({
					mindMap: updatedMap,
					layoutConfig: {
						...state.layoutConfig,
						direction:
							updatedMap.layout_direction ?? state.layoutConfig.direction,
					},
				}));
				} else {
					set((state) => ({
						mindMap: state.mindMap
							? ({
									...state.mindMap,
									...updates,
							  } as MindMapData)
							: state.mindMap,
						layoutConfig: {
							...state.layoutConfig,
							direction:
								updates.layout_direction ?? state.layoutConfig.direction,
						},
					}));
				}
		},
		'isUpdatingMapSettings',
		{
			initialMessage: 'Updating mind map settings...',
			errorMessage: 'Failed to update mind map settings.',
			successMessage: 'Mind map updated successfully.',
		}
	),

	deleteMindMap: withLoadingAndToast(
		async (mapId: string) => {
			if (!mapId) {
				throw new Error('Map ID is required.');
			}

			const response = await fetch(`/api/maps/${mapId}`, {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json',
				},
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to delete map.');
			}

			// Clean up local state
			set({
				mindMap: null,
				mapId: null,
				nodes: [],
				edges: [],
			});

			// Unsubscribe from real-time updates
			await get().unsubscribeFromRealtimeUpdates();

			// Navigate to dashboard
			// Using window.location for navigation from Zustand store
			if (typeof window !== 'undefined') {
				window.location.href = '/dashboard';
			}
		},
		'isDeletingMap',
		{
			initialMessage: 'Deleting mind map...',
			errorMessage: 'Failed to delete mind map.',
			successMessage: 'Mind map deleted successfully.',
		}
	),

	subscribeToRealtimeUpdates: async (mapId: string) => {
		try {
			await Promise.all([
				get().subscribeToNodes(mapId),
				get().subscribeToEdges(mapId),
				get().subscribeToCommentUpdates(mapId),
				get().subscribeToHistoryCurrent(mapId),
			]);
		} catch (error) {
			console.error('Failed to start real-time subscriptions:', error);
		}
	},

	unsubscribeFromRealtimeUpdates: async () => {
		const inFlight = get()._realtimeUnsubscribePromise;
		if (inFlight) {
			return inFlight;
		}

		const unsubscribePromise = (async () => {
			try {
				await Promise.all([
					get().unsubscribeFromNodes(),
					get().unsubscribeFromEdges(),
					get().unsubscribeFromCommentUpdates(),
					get().unsubscribeFromHistoryCurrent(),
				]);
				get().unsubscribeFromPermissionUpdates();
				get().clearPermissionsState();
			} catch (error) {
				console.error('Failed to stop real-time subscriptions:', error);
			} finally {
				set({ _realtimeUnsubscribePromise: null });
			}
		})();

		set({ _realtimeUnsubscribePromise: unsubscribePromise });
		return unsubscribePromise;
	},

	reset: () => {
		// This will be overridden in the store creator
	},
});

async function persistNormalizedLayoutDirection(
	mapId: string,
	supabase: AppState['supabase'],
	layoutDirection: 'LEFT_RIGHT' | 'TOP_BOTTOM',
	expectedUpdatedAt: string | null | undefined
): Promise<void> {
	if (!supabase || !expectedUpdatedAt) {
		return;
	}

	const { data, error } = await supabase
		.from('mind_maps')
		.update({
			layout_direction: layoutDirection,
			updated_at: new Date().toISOString(),
		})
		.eq('id', mapId)
		.eq('updated_at', expectedUpdatedAt)
		.select('id')
		.maybeSingle();

	if (error) {
		console.warn(
			'[core-slice] failed to normalize persisted layout direction',
			error
		);
		return;
	}

	if (!data) {
		console.warn(
			'[core-slice] skipped layout-direction normalization for stale snapshot',
			{ mapId, expectedUpdatedAt }
		);
	}
}

async function persistNormalizedAutoRoutedEdges(
	mapId: string,
	supabase: AppState['supabase'],
	edges: AppEdge[]
): Promise<void> {
	if (!supabase || edges.length === 0) {
		return;
	}

	await Promise.all(
		edges.map(async (edge) => {
			const expectedUpdatedAt = edge.data?.updated_at;
			if (!expectedUpdatedAt) {
				return;
			}

			const { data, error } = await supabase
				.from('edges')
				.update({
					metadata: edge.data?.metadata ?? null,
					updated_at: new Date().toISOString(),
				})
				.eq('id', edge.id)
				.eq('map_id', mapId)
				.eq('updated_at', expectedUpdatedAt)
				.select('id')
				.maybeSingle();

			if (error) {
				console.warn('[core-slice] failed to normalize edge routing metadata', {
					edgeId: edge.id,
					error,
				});
				return;
			}

			if (!data) {
				console.warn(
					'[core-slice] skipped edge-routing normalization for stale snapshot',
					{
						edgeId: edge.id,
						expectedUpdatedAt,
					}
				);
			}
		})
	);
}
