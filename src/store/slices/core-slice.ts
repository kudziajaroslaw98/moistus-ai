import { getSharedSupabaseClient } from '@/helpers/supabase/shared-client';
import { transformSupabaseData } from '@/helpers/transform-supabase-data';
import {
	generateFallbackAvatar,
	generateFunName,
	generateUserColor,
	type UserProfile,
} from '@/helpers/user-profile-helpers';
import withLoadingAndToast from '@/helpers/with-loading-and-toast';
import type { EdgesTableType } from '@/types/edges-table-type';
import type { MindMapData } from '@/types/mind-map-data';
import type { NodesTableType } from '@/types/nodes-table-type';
import type { User } from '@supabase/supabase-js';
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
	userProfile: null,
	activeTool: 'default',

	// Actions
	setActiveTool: (activeTool) => set({ activeTool }),
	setMindMap: (mindMap) => set({ mindMap }),
	setReactFlowInstance: (reactFlowInstance) => set({ reactFlowInstance }),
	setMapId: (mapId) => set({ mapId }),
	setCurrentUser: (currentUser) => {
		set({ currentUser });
		// Auto-generate user profile when current user changes
		const userProfile = get().generateUserProfile(currentUser);
		set({ userProfile });
	},
	setUserProfile: (userProfile) => set({ userProfile }),

	generateUserProfile: (user: User | null): UserProfile | null => {
		if (!user) return null;

		const displayName =
			user.user_metadata?.display_name ||
			user.user_metadata?.full_name ||
			user.email?.split('@')[0] ||
			generateFunName(user.id);

		const isAnonymous =
			!user.email || user.user_metadata?.is_anonymous === true;

		return {
			id: user.id,
			email: user.email,
			displayName,
			avatarUrl:
				user.user_metadata?.avatar_url || generateFallbackAvatar(user.id),
			color: generateUserColor(user.id),
			isAnonymous,
		};
	},

	getCurrentUser: async () => {
		const { data } = await get().supabase.auth.getUser();
		const currentUser = data?.user;

		set({ currentUser });

		// Auto-generate user profile
		const userProfile = get().generateUserProfile(currentUser);
		set({ userProfile });

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
		async (mapId: string) => {
			if (!mapId) {
				throw new Error('Map ID is required.');
			}

			// const { data: mindMapData, error: mindMapError } = await get()
			// 	.supabase.from('mind_maps')
			// 	.select(
			// 		`
			//            id,
			//            user_id,
			//            created_at,
			//            updated_at,
			//            description,
			//            title,
			//            tags,
			//            visibility,
			//            thumbnailUrl,
			//            nodes (
			//            id,
			//              map_id,
			//              parent_id,
			//              content,
			//              position_x,
			//              position_y,
			//              width,
			//              height,
			//              node_type,
			//              tags,
			//              status,
			//              importance,
			//              sourceUrl,
			//              metadata,
			//              aiData,
			//              created_at,
			//              updated_at
			//            ),
			//            edges (
			//              id,
			//              map_id,
			//              source,
			//              target,
			//              label,
			//              type,
			//               animated,
			//              markerEnd,
			//              markerStart,
			//              style,
			//              metadata,
			//              aiData,
			//              created_at,
			//              updated_at
			//            )
			//          `
			// 	)
			// 	.eq('id', mapId)
			// 	.single();

			const { data: mindMapData, error: mindMapError } = await get()
				.supabase.from('map_graph_aggregated_view')
				.select('*')
				.eq('map_id', mapId)
				.single();

			if (mindMapError) {
				console.error('Error fetching from Supabase:', mindMapError);
				throw new Error(
					mindMapError.message || 'Failed to fetch mind map data.'
				);
			}

			if (!mindMapData) {
				throw new Error('Mind map not found.');
			}

			const transformedData = transformSupabaseData(
				mindMapData as unknown as MindMapData & {
					nodes: NodesTableType[];
					edges: EdgesTableType[];
				}
			);

			set({
				mindMap: transformedData.mindMap,
				nodes: transformedData.reactFlowNodes,
				edges: transformedData.reactFlowEdges,
			});

			// Start real-time subscriptions after successful data load
			await get().subscribeToRealtimeUpdates(mapId);
		},
		'isStateLoading',
		{
			initialMessage: 'Fetching mind map data...',
			errorMessage: 'Failed to fetch mind map data.',
			successMessage: 'Mind map data fetched successfully.',
		}
	),

	subscribeToRealtimeUpdates: async (mapId: string) => {
		try {
			console.log('Starting real-time subscriptions for map:', mapId);
			await Promise.all([
				get().subscribeToNodes(mapId),
				get().subscribeToEdges(mapId),
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
			]);
			console.log('Real-time subscriptions stopped successfully');
		} catch (error) {
			console.error('Failed to stop real-time subscriptions:', error);
		}
	},
});
