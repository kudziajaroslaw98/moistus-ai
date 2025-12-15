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
import withLoadingAndToast from '@/helpers/with-loading-and-toast';
import type { EdgesTableType } from '@/types/edges-table-type';
import type { MindMapData } from '@/types/mind-map-data';
import type { NodesTableType } from '@/types/nodes-table-type';
import { UserProfile } from '@/types/user-profile-types';
import type { User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import type { StateCreator } from 'zustand';
import type { AppState, CoreDataSlice } from '../app-state';

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
	mapAccessError: null,

	// Actions
	setActiveTool: (activeTool) => set({ activeTool }),
	setMindMap: (mindMap) => set({ mindMap }),
	setReactFlowInstance: (reactFlowInstance) => set({ reactFlowInstance }),
	setMapId: (mapId) => set({ mapId }),
	setCurrentUser: (currentUser) => {
		set({ currentUser });
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

		set({ currentUser });

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

			// Clear any previous access error
			set({ mapAccessError: null });

			const { data: mindMapData, error: mindMapError } = await get()
				.supabase.from('map_graph_aggregated_view')
				.select('*')
				.eq('map_id', mapId)
				.single();

			// Handle potential access denial (PGRST116 = no rows returned)
			if (mindMapError) {
				console.error('Error fetching from Supabase:', mindMapError);

				// Check if this is an access/not-found error
				if (
					mindMapError.code === 'PGRST116' ||
					mindMapError.message?.includes('no rows')
				) {
					try {
						// Call check-access API to determine the reason
						const response = await fetch(`/api/maps/${mapId}/check-access`);

						if (response.ok) {
							const result = await response.json();
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
								if (toastId) toast.dismiss(toastId);
								return;
							} else if (status === 'not_found') {
								set({
									mapAccessError: {
										type: 'not_found',
										isAnonymous: is_anonymous,
									},
								});
								// Dismiss loading toast silently - UI handles error state
								if (toastId) toast.dismiss(toastId);
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

				throw new Error(
					mindMapError.message || 'Failed to fetch mind map data.'
				);
			}

			if (!mindMapData) {
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
				if (toastId) toast.dismiss(toastId);
				return;
			}

			const transformedData = transformSupabaseData(
				mindMapData as unknown as SupabaseMapData
			);

			set({
				mindMap: transformedData.mindMap,
				nodes: transformedData.reactFlowNodes,
				edges: transformedData.reactFlowEdges,
			});

			// Fetch comments metadata for comment nodes
			await get().fetchComments(mapId);

			// Start real-time subscriptions after successful data load
			await get().subscribeToRealtimeUpdates(mapId);

			// Show success toast only when map data was actually loaded
			if (toastId) {
				toast.success('Mind map data fetched successfully.', { id: toastId });
			}
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
			const updatedMap = result.data?.map;

			if (updatedMap) {
				// Optimistic update: Update local state immediately
				set({ mindMap: updatedMap });
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
			console.log('Starting real-time subscriptions for map:', mapId);
			await Promise.all([
				get().subscribeToNodes(mapId),
				get().subscribeToEdges(mapId),
				get().subscribeToCommentUpdates(mapId),
			]);
			console.log('Real-time subscriptions started successfully');
		} catch (error) {
			console.error('Failed to start real-time subscriptions:', error);
		}
	},

	unsubscribeFromRealtimeUpdates: async () => {
		try {
			console.log('Stopping real-time subscriptions');
			await Promise.all([
				get().unsubscribeFromNodes(),
				get().unsubscribeFromEdges(),
				get().unsubscribeFromCommentUpdates(),
			]);
			console.log('Real-time subscriptions stopped successfully');
		} catch (error) {
			console.error('Failed to stop real-time subscriptions:', error);
		}
	},

	reset: () => {
		// This will be overridden in the store creator
	},
});
