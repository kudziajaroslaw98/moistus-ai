import { createClient } from '@/helpers/supabase/client';
import {
	ActiveUser,
	ActivityFilters,
	PresenceStatus,
	UpdatePresenceRequest,
} from '@/types/collaboration-types';
import { RealtimeChannel } from '@supabase/supabase-js';
import { throttle } from 'throttle-debounce';
import { StateCreator } from 'zustand';
import type { CollaborationSlice } from '../app-state';

const CURSOR_UPDATE_THROTTLE = 16; // ~60fps
const PRESENCE_UPDATE_THROTTLE = 1000; // 1 second
const MAX_ACTIVITIES_IN_MEMORY = 500;

const supabase = createClient();

export const createCollaborationSlice: StateCreator<
	CollaborationSlice,
	[],
	[],
	CollaborationSlice
> = (set, get) => {
	let presenceChannel: RealtimeChannel | null = null;
	let currentMapId: string | null = null;
	let heartbeatInterval: NodeJS.Timeout | null = null;

	// Color palette for user identification
	const userColors = [
		'#3B82F6',
		'#EF4444',
		'#10B981',
		'#F59E0B',
		'#8B5CF6',
		'#06B6D4',
		'#F97316',
		'#84CC16',
		'#EC4899',
		'#6366F1',
		'#14B8A6',
		'#F472B6',
		'#A855F7',
		'#2DD4BF',
		'#FB923C',
	];

	const generateUserColor = (userId: string): string => {
		let hash = 0;

		for (let i = 0; i < userId.length; i++) {
			hash = userId.charCodeAt(i) + ((hash << 5) - hash);
		}

		return userColors[Math.abs(hash) % userColors.length];
	};

	const throttledCursorUpdate = throttle(
		CURSOR_UPDATE_THROTTLE,
		(
			position: { x: number; y: number },
			viewport: { x: number; y: number; zoom: number }
		) => {
			if (!presenceChannel || !currentMapId) return;

			const state = get();
			const currentUser = state.getActiveCollaborationUser();
			if (!currentUser) return;

			presenceChannel.send({
				type: 'broadcast',
				event: 'cursor_move',
				payload: {
					user_id: currentUser.user_id,
					position,
					viewport,
					interaction_state: 'moving',
				},
			});
		}
	);

	const throttledPresenceUpdate = throttle(
		PRESENCE_UPDATE_THROTTLE,
		async (updates: Partial<UpdatePresenceRequest>) => {
			if (!currentMapId) return;

			try {
				const { data: currentUser } = await supabase.auth.getUser();
				if (!currentUser.user) return;

				await supabase.from('user_presence').upsert({
					user_id: currentUser.user.id,
					map_id: currentMapId,
					...updates,
					last_activity: new Date().toISOString(),
				}, {
					onConflict: 'user_id,map_id'
				});
			} catch (error) {
				console.error('Failed to update presence:', error);
			}
		}
	);

	const setupHeartbeat = () => {
		if (heartbeatInterval) clearInterval(heartbeatInterval);

		heartbeatInterval = setInterval(() => {
			throttledPresenceUpdate({ last_activity: new Date().toISOString() });
		}, 30000); // 30 seconds
	};

	const cleanupHeartbeat = () => {
		if (heartbeatInterval) {
			clearInterval(heartbeatInterval);
			heartbeatInterval = null;
		}
	};

	return {
		// Initial state
		isConnected: false,
		isConnecting: false,
		connectionError: undefined,
		currentSession: undefined,
		presenceChannel: null,
		activeUsers: [],
		activeCollaborationUser: undefined,
		cursors: [],
		showCursors: true,
		selections: [],
		nodeStates: {},
		activities: [],
		activityFilters: {},
		isLoadingActivities: false,
		showActivityFeed: false,
		showPresenceIndicators: true,
		conflictModal: undefined,
		cursorUpdateThrottle: CURSOR_UPDATE_THROTTLE,
		maxActivitiesInMemory: MAX_ACTIVITIES_IN_MEMORY,

		// Connection management
		connect: async (mapId: string) => {
			set({ isConnecting: true, connectionError: undefined });

			try {
				currentMapId = mapId;

				// Create Supabase realtime channel
				const channel = supabase
					.channel(`mind-map-${mapId}`, {
						config: {
							presence: {
								key: 'user_id',
							},
						},
					})
					.on('presence', { event: 'sync' }, () => {
						// Simplified presence sync - just log for now
						console.log('Presence synced');
					})
					.on(
						'presence',
						{ event: 'join' },
						({ newPresences }: { newPresences: Record<string, unknown>[] }) => {
							console.log('User joined:', newPresences);
						}
					)
					.on(
						'presence',
						{ event: 'leave' },
						({
							leftPresences,
						}: {
							leftPresences: Record<string, unknown>[];
						}) => {
							console.log('User left:', leftPresences);
						}
					)
					.subscribe(async (status: string) => {
						if (status === 'SUBSCRIBED') {
							presenceChannel = channel;
							set({
								isConnected: true,
								isConnecting: false,
								presenceChannel: channel,
							});

							setupHeartbeat();
							await get().joinMap(mapId);
						} else {
							throw new Error('Failed to subscribe to realtime channel');
						}
					});
			} catch (error) {
				console.error('Failed to connect to collaboration:', error);
				set({
					isConnecting: false,
					connectionError: 'Failed to establish real-time connection',
				});
			}
		},

		disconnect: async () => {
			if (presenceChannel) {
				await presenceChannel.unsubscribe();
				presenceChannel = null;
			}

			cleanupHeartbeat();
			currentMapId = null;

			set({
				isConnected: false,
				isConnecting: false,
				presenceChannel: null,
				activeUsers: [],
				cursors: [],
				selections: [],
				activeCollaborationUser: undefined,
			});
		},

		// Presence management
		joinMap: async (mapId: string) => {
			try {
				const { data: currentUser } = await supabase.auth.getUser();
				if (!currentUser.user) return;

				const userColor = generateUserColor(currentUser.user.id);

				const presenceData = {
					user_id: currentUser.user.id,
					map_id: mapId,
					status: 'active' as PresenceStatus,
					user_color: userColor,
					session_id: crypto.randomUUID(),
					last_activity: new Date().toISOString(),
				};

				await supabase.from('user_presence').upsert(presenceData, {
					onConflict: 'user_id,map_id'
				});

				if (presenceChannel) {
					await presenceChannel.track({
						user_id: currentUser.user.id,
						name:
							currentUser.user.user_metadata?.display_name ||
							currentUser.user.email,
						email: currentUser.user.email,
						avatar_url: currentUser.user.user_metadata?.avatar_url,
						user_color: userColor,
						status: 'active',
						last_activity: new Date().toISOString(),
						session_id: presenceData.session_id,
					});
				}

				const activeUser: ActiveUser = {
					id: crypto.randomUUID(),
					user_id: currentUser.user.id,
					name:
						currentUser.user.user_metadata?.display_name ||
						currentUser.user.email ||
						'',
					email: currentUser.user.email || '',
					avatar_url: currentUser.user.user_metadata?.avatar_url,
					presence: {
						...presenceData,
						id: crypto.randomUUID(),
						created_at: new Date().toISOString(),
						updated_at: new Date().toISOString(),
					},
				};

				set({ activeCollaborationUser: activeUser });
			} catch (error) {
				console.error('Failed to join map:', error);
			}
		},

		leaveMap: async () => {
			try {
				const { data: currentUser } = await supabase.auth.getUser();
				if (!currentUser.user || !currentMapId) return;

				await supabase
					.from('user_presence')
					.delete()
					.eq('user_id', currentUser.user.id)
					.eq('map_id', currentMapId);

				if (presenceChannel) {
					await presenceChannel.untrack();
				}
			} catch (error) {
				console.error('Failed to leave map:', error);
			}
		},

		updatePresence: async (updates: Partial<UpdatePresenceRequest>) => {
			throttledPresenceUpdate(updates);
		},

		setUserStatus: async (status: PresenceStatus) => {
			await get().updatePresence({ status });

			set((state) => ({
				activeCollaborationUser: state.activeCollaborationUser
					? {
							...state.activeCollaborationUser,
							presence: { ...state.activeCollaborationUser.presence, status },
						}
					: undefined,
			}));
		},

		// Cursor tracking
		updateCursor: (
			position: { x: number; y: number },
			viewport: { x: number; y: number; zoom: number }
		) => {
			throttledCursorUpdate(position, viewport);
		},

		setCursorInteractionState: () => {
			// Simplified implementation
		},

		toggleCursorVisibility: (show: boolean) => {
			set({ showCursors: show });
		},

		// Node selection management
		selectNode: async () => {
			// Simplified implementation
		},

		deselectNode: async () => {
			// Simplified implementation
		},

		clearSelections: async () => {
			// Simplified implementation
		},

		setNodeEditingState: () => {
			// Simplified implementation
		},

		checkEditPermission: () => {
			return true; // Simplified implementation
		},

		// Activity tracking
		logActivity: async () => {
			// Simplified implementation
		},

		loadActivities: async () => {
			// Simplified implementation
		},

		setActivityFilters: (filters: Partial<ActivityFilters>) => {
			set((state) => ({
				activityFilters: { ...state.activityFilters, ...filters },
			}));
		},

		clearActivityFilters: () => {
			set({ activityFilters: {} });
		},

		// UI state management
		toggleActivityFeed: () => {
			set((state) => ({ showActivityFeed: !state.showActivityFeed }));
		},

		togglePresenceIndicators: () => {
			set((state) => ({
				showPresenceIndicators: !state.showPresenceIndicators,
			}));
		},

		// Utility functions
		getUserColor: (userId: string) => generateUserColor(userId),

		isUserActive: (userId: string) => {
			const user = get().activeUsers.find((u) => u.user_id === userId);
			return user?.presence.status === 'active';
		},

		getNodeCollaborativeState: (nodeId: string) => {
			const state = get();
			return (
				state.nodeStates[nodeId] || {
					node_id: nodeId,
					selections: state.selections.filter((s) => s.node_id === nodeId),
					is_being_edited: false,
					edit_queue: [],
				}
			);
		},

		getActiveCollaborationUser: () => get().activeCollaborationUser,

		// Internal state management
		_addActiveUser: (user: ActiveUser) => {
			set((state) => ({
				activeUsers: [
					...state.activeUsers.filter((u) => u.user_id !== user.user_id),
					user,
				],
			}));
		},

		_removeActiveUser: (userId: string) => {
			set((state) => ({
				activeUsers: state.activeUsers.filter((u) => u.user_id !== userId),
				cursors: state.cursors.filter((c) => c.user_id !== userId),
				selections: state.selections.filter((s) => s.user_id !== userId),
			}));
		},

		_updateActiveUser: (userId: string, updates: Partial<ActiveUser>) => {
			set((state) => ({
				activeUsers: state.activeUsers.map((user) =>
					user.user_id === userId ? { ...user, ...updates } : user
				),
			}));
		},
	};
};
