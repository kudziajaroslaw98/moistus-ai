import { getSharedSupabaseClient } from '@/helpers/supabase/shared-client';
import { ShareToken, SharingError } from '@/types/sharing-types';
import { StateCreator } from 'zustand';

const supabase = getSharedSupabaseClient();

// Simplified types for anonymous auth system

interface JoinRoomResult {
	map_id: string;
	map_title: string;
	map_description?: string;
	permissions: any;
	user_id: string;
	is_anonymous: boolean;
	user_display_name: string;
	user_avatar?: string;
	websocket_channel: string;
	share_token_id: string;
	join_method: string;
}

interface AnonymousUser {
	user_id: string;
	display_name: string;
	avatar_url?: string;
	is_anonymous: boolean;
	created_at: string;
}

// Simplified sharing slice interface
interface SharingSlice {
	// State
	shareTokens: ShareToken[];
	activeToken?: ShareToken;
	isCreatingToken: boolean;
	isJoiningRoom: boolean;
	authUser?: AnonymousUser;
	sharingError?: SharingError;
	lastJoinResult?: JoinRoomResult;
	_sharingSubscription?: any;

	// Actions
	createRoomCode: (
		mapId: string,
		options?: {
			role?: string;
			maxUsers?: number;
			expiresAt?: string;
		}
	) => Promise<ShareToken>;

	joinRoom: (roomCode: string, displayName?: string) => Promise<JoinRoomResult>;

	upgradeAnonymousUser: (
		email: string,
		password: string,
		displayName?: string
	) => Promise<boolean>;

	ensureAuthenticated: (displayName?: string) => Promise<boolean>;

	refreshTokens: () => Promise<void>;

	refreshRoomCode: (tokenId: string) => Promise<void>;

	revokeRoomCode: (tokenId: string) => Promise<void>;

	subscribeToSharingUpdates: (mapId: string) => void;

	unsubscribeFromSharing: () => void;

	clearError: () => void;

	reset: () => void;
}

export const createSharingSlice: StateCreator<
	SharingSlice,
	[],
	[],
	SharingSlice
> = (set, get) => {
	return {
		// Initial state
		shareTokens: [],
		activeToken: undefined,
		isCreatingToken: false,
		isJoiningRoom: false,
		authUser: undefined,
		sharingError: undefined,
		lastJoinResult: undefined,
		_sharingSubscription: undefined,

		// Ensure user is authenticated (anonymous or full)
		ensureAuthenticated: async (displayName?: string) => {
			try {
				console.log('ensureAuthenticated: Starting authentication check...');

				// First, check if we already have a session
				const {
					data: { session },
					error: sessionError,
				} = await supabase.auth.getSession();

				if (sessionError) {
					console.warn(
						'ensureAuthenticated: Session check failed:',
						sessionError
					);
				}

				// Then get the user
				const {
					data: { user },
					error: userError,
				} = await supabase.auth.getUser();

				if (userError) {
					console.warn('ensureAuthenticated: User check failed:', userError);
				}

				if (user && session) {
					console.log(
						'ensureAuthenticated: Existing user found, checking profile...'
					);

					// User already authenticated, get their profile
					const { data: profile, error: profileError } = await supabase
						.from('user_profiles')
						.select('display_name, avatar_url, is_anonymous')
						.eq('user_id', user.id)
						.single();

					if (profileError) {
						console.warn(
							'ensureAuthenticated: Profile fetch failed:',
							profileError
						);
						// Continue with fallback data
					}

					const authUser: AnonymousUser = {
						user_id: user.id,
						display_name:
							profile?.display_name ||
							displayName ||
							`User ${user.id.slice(0, 8)}`,
						avatar_url:
							profile?.avatar_url ||
							`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
						is_anonymous: profile?.is_anonymous || user.is_anonymous || false,
						created_at: user.created_at,
					};

					console.log('ensureAuthenticated: Using existing user:', {
						user_id: authUser.user_id,
						is_anonymous: authUser.is_anonymous,
					});

					set({ authUser, sharingError: undefined });
					return true;
				}

				// No valid session, create anonymous user
				console.log(
					'ensureAuthenticated: No existing session, creating anonymous user...'
				);

				const { data: authData, error: signInError } =
					await supabase.auth.signInAnonymously({
						options: {
							data: {
								display_name: displayName || `Anonymous User`,
							},
						},
					});

				if (signInError || !authData.user) {
					console.error(
						'ensureAuthenticated: Anonymous sign-in failed:',
						signInError
					);
					throw new Error(
						signInError?.message || 'Failed to authenticate anonymously'
					);
				}

				console.log(
					'ensureAuthenticated: Anonymous user created:',
					authData.user.id
				);

				// Wait a moment for the profile to be created by the trigger
				await new Promise((resolve) => setTimeout(resolve, 100));

				// Get the newly created profile (created by database trigger)
				const { data: newProfile } = await supabase
					.from('user_profiles')
					.select('display_name, avatar_url, is_anonymous')
					.eq('user_id', authData.user.id)
					.single();

				const defaultDisplayName =
					displayName ||
					newProfile?.display_name ||
					`User ${authData.user.id.slice(0, 8)}`;
				const avatarUrl =
					newProfile?.avatar_url ||
					`https://api.dicebear.com/7.x/avataaars/svg?seed=${authData.user.id}`;

				const anonymousUser: AnonymousUser = {
					user_id: authData.user.id,
					display_name: defaultDisplayName,
					avatar_url: avatarUrl,
					is_anonymous: true,
					created_at: new Date().toISOString(),
				};

				console.log('ensureAuthenticated: Anonymous user setup complete:', {
					user_id: anonymousUser.user_id,
					display_name: anonymousUser.display_name,
				});

				set({ authUser: anonymousUser, sharingError: undefined });
				return true;
			} catch (error) {
				console.error('ensureAuthenticated: Authentication failed:', error);

				const sharingError: SharingError = {
					code: 'PERMISSION_DENIED',
					message:
						error instanceof Error ? error.message : 'Authentication failed',
				};

				set({ sharingError });
				return false;
			}
		},

		// Create room code for sharing
		createRoomCode: async (mapId: string, options = {}) => {
			set({ isCreatingToken: true, sharingError: undefined });

			try {
				// Ensure user is authenticated
				const isAuthenticated = await get().ensureAuthenticated();

				if (!isAuthenticated) {
					throw new Error('Authentication required');
				}

				// Convert expiresAt ISO string to hours from now if provided
				let expiresInHours;

				if (options.expiresAt) {
					const expiresDate = new Date(options.expiresAt);
					const nowDate = new Date();
					const diffMs = expiresDate.getTime() - nowDate.getTime();
					expiresInHours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60))); // At least 1 hour
				}

				const response = await fetch('/api/share/create-room-code', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						map_id: mapId,
						role: options.role || 'viewer',
						max_users: options.maxUsers || 50,
						...(expiresInHours && { expires_in_hours: expiresInHours }),
					}),
				});

				if (!response.ok) {
					const error = await response.json();
					throw new Error(error.error || 'Failed to create room code');
				}

				const result = await response.json();
				const token: ShareToken = result.data;

				set((state) => ({
					shareTokens: [...state.shareTokens, token],
					activeToken: token,
					isCreatingToken: false,
				}));

				return token;
			} catch (error) {
				const sharingError: SharingError = {
					code: 'UNKNOWN',
					message:
						error instanceof Error
							? error.message
							: 'Failed to create room code',
				};

				set({
					isCreatingToken: false,
					sharingError,
				});

				throw sharingError;
			}
		},

		// Join room using room code
		joinRoom: async (roomCode: string, displayName?: string) => {
			set({ isJoiningRoom: true, sharingError: undefined });

			try {
				// Ensure user is authenticated first
				const isAuthenticated = await get().ensureAuthenticated(displayName);

				if (!isAuthenticated) {
					throw new Error('Failed to authenticate');
				}

				const response = await fetch('/api/share/join-room', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						token: roomCode.toUpperCase(),
						display_name: displayName,
					}),
				});

				if (!response.ok) {
					const error = await response.json();
					throw new Error(error.error || 'Failed to join room');
				}

				const result = await response.json();
				const joinResult: JoinRoomResult = result.data;

				set({
					isJoiningRoom: false,
					lastJoinResult: joinResult,
				});

				return joinResult;
			} catch (error) {
				const sharingError: SharingError = {
					code: 'INVALID_ROOM_CODE',
					message:
						error instanceof Error ? error.message : 'Failed to join room',
				};

				set({
					isJoiningRoom: false,
					sharingError,
				});

				throw sharingError;
			}
		},

		// Upgrade anonymous user to full user
		upgradeAnonymousUser: async (
			email: string,
			password: string,
			displayName?: string
		) => {
			try {
				const currentUser = get().authUser;

				if (!currentUser?.is_anonymous) {
					throw new Error('User is not anonymous or not found');
				}

				const response = await fetch('/api/auth/upgrade-anonymous', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						email,
						password,
						display_name: displayName,
					}),
				});

				if (!response.ok) {
					const error = await response.json();
					throw new Error(error.error || 'Failed to upgrade account');
				}

				const result = await response.json();

				// Update current user state
				const updatedUser: AnonymousUser = {
					...currentUser,
					display_name: result.data.profile.display_name,
					is_anonymous: false,
				};

				set({
					authUser: updatedUser,
					sharingError: undefined,
				});

				return true;
			} catch (error) {
				const sharingError: SharingError = {
					code: 'UNKNOWN',
					message:
						error instanceof Error
							? error.message
							: 'Failed to upgrade account',
				};

				set({ sharingError });
				return false;
			}
		},

		// Refresh user's share tokens
		refreshTokens: async () => {
			try {
				const {
					data: { user },
				} = await supabase.auth.getUser();
				if (!user) return;

				const { data: tokens, error } = await supabase
					.from('share_tokens')
					.select('*')
					.eq('created_by', user.id)
					.eq('is_active', true)
					.order('created_at', { ascending: false });

				if (error) {
					console.error('Failed to refresh tokens:', error);
					return;
				}

				set({ shareTokens: tokens || [] });
			} catch (error) {
				console.error('Failed to refresh tokens:', error);
			}
		},

		// Refresh/regenerate a room code
		refreshRoomCode: async (tokenId: string) => {
			try {
				const response = await fetch('/api/share/refresh-room-code', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ token_id: tokenId }),
				});

				if (!response.ok) {
					const error = await response.json();
					throw new Error(error.error || 'Failed to refresh room code');
				}

				const result = await response.json();
				const updatedToken: ShareToken = result.data;

				set((state) => ({
					shareTokens: state.shareTokens.map((token) =>
						token.id === tokenId ? updatedToken : token
					),
					activeToken:
						state.activeToken?.id === tokenId
							? updatedToken
							: state.activeToken,
				}));
			} catch (error) {
				const sharingError: SharingError = {
					code: 'UNKNOWN',
					message:
						error instanceof Error
							? error.message
							: 'Failed to refresh room code',
				};

				set({ sharingError });
				throw sharingError;
			}
		},

		// Revoke/deactivate a room code
		revokeRoomCode: async (tokenId: string) => {
			try {
				const response = await fetch('/api/share/revoke-room-code', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ token_id: tokenId }),
				});

				if (!response.ok) {
					const error = await response.json();
					throw new Error(error.error || 'Failed to revoke room code');
				}

				set((state) => ({
					shareTokens: state.shareTokens.filter(
						(token) => token.id !== tokenId
					),
					activeToken:
						state.activeToken?.id === tokenId ? undefined : state.activeToken,
				}));
			} catch (error) {
				const sharingError: SharingError = {
					code: 'UNKNOWN',
					message:
						error instanceof Error
							? error.message
							: 'Failed to revoke room code',
				};

				set({ sharingError });
				throw sharingError;
			}
		},

		// Subscribe to real-time sharing updates
		subscribeToSharingUpdates: (mapId: string) => {
			try {
				// Unsubscribe from any existing subscription
				get().unsubscribeFromSharing();

				// Subscribe to share_tokens changes for this map
				const subscription = supabase
					.channel(`sharing_updates_${mapId}`)
					.on(
						'postgres_changes',
						{
							event: '*',
							schema: 'public',
							table: 'share_tokens',
							filter: `map_id=eq.${mapId}`,
						},
						(payload) => {
							console.log('Sharing update received:', payload);
							// Refresh tokens when changes occur
							get().refreshTokens();
						}
					)
					.on(
						'postgres_changes',
						{
							event: '*',
							schema: 'public',
							table: 'mind_map_shares',
							filter: `map_id=eq.${mapId}`,
						},
						(payload) => {
							console.log('Share permissions update received:', payload);
							// Could trigger additional updates if needed
						}
					)
					.subscribe();

				set({ _sharingSubscription: subscription });
			} catch (error) {
				console.error('Failed to subscribe to sharing updates:', error);
			}
		},

		// Unsubscribe from real-time sharing updates
		unsubscribeFromSharing: () => {
			const state = get();

			if (state._sharingSubscription) {
				supabase.removeChannel(state._sharingSubscription);
				set({ _sharingSubscription: undefined });
			}
		},

		// Clear current error
		clearError: () => {
			set({ sharingError: undefined });
		},

		// Reset sharing state
		reset: () => {
			set({
				shareTokens: [],
				activeToken: undefined,
				isCreatingToken: false,
				isJoiningRoom: false,
				authUser: undefined,
				sharingError: undefined,
				lastJoinResult: undefined,
				_sharingSubscription: undefined,
			});
		},
	};
};

// Export the type for use in other parts of the app
export type { AnonymousUser, JoinRoomResult, SharingSlice };
