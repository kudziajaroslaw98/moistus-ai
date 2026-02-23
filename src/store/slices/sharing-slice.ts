import { getSharedSupabaseClient } from '@/helpers/supabase/shared-client';
import { generateFallbackAvatar } from '@/helpers/user-profile-helpers';
import { ShareAccessWithProfile } from '@/types/share-access-with-profiles';
import { SharedUser, ShareToken, SharingError } from '@/types/sharing-types';
import { StateCreator } from 'zustand';
import {
	AppState,
	OAuthProvider,
	SharingSlice,
	UpgradeStep,
} from '../app-state';

const supabase = getSharedSupabaseClient();

// Simplified types for anonymous auth system

export interface JoinRoomResult {
	map_id: string;
	map_title: string;
	map_description?: string;
	permissions: any;
	user_id: string;
	is_anonymous: boolean;
	user_display_name: string;
	user_avatar?: string;
	realtime_room: string;
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

export const createSharingSlice: StateCreator<
	AppState,
	[],
	[],
	SharingSlice
> = (set, get) => {
	return {
		// Initial state
		shareTokens: [],
		currentShares: [],
		activeToken: undefined,
		isCreatingToken: false,
		isJoiningRoom: false,
		authUser: undefined,
		sharingError: undefined,
		lastJoinResult: undefined,
		_sharingSubscription: undefined,

		// Upgrade state (for anonymous -> full user conversion)
		upgradeStep: 'idle' as UpgradeStep,
		upgradeEmail: null,
		upgradeDisplayName: null,
		upgradePendingPassword: null,
		upgradeError: null,
		isUpgrading: false,

		getCurrentShareUsers: async () => {
			const { supabase, mapId, setState } = get();

			const {
				data,
				error,
			}: { data: ShareAccessWithProfile[] | null; error: Error | null } =
				await supabase
					.from('share_access_with_profiles')
					.select(`*`)
					.eq('map_id', mapId);

			if (error || !data) {
				console.error('[SharingSlice] Error fetching current shares:', error);
				return;
			}

			const currentShares: SharedUser[] = data.map((shareAccessProfile) => ({
				id: shareAccessProfile.profile_user_id,
				user_id: shareAccessProfile.user_id,
				name: shareAccessProfile.full_name,
				email: shareAccessProfile.email,
				avatar_url: generateFallbackAvatar(shareAccessProfile.user_id),
				profile: {
					display_name: shareAccessProfile.display_name,
					role: shareAccessProfile.role,
				},
				isAnonymous: shareAccessProfile.is_anonymous,
				share: {
					// Use share_access.id for deletion (numeric converted to string)
					id: String(shareAccessProfile.id),
					map_id: shareAccessProfile.map_id,
					user_id: shareAccessProfile.user_id,
					can_edit: shareAccessProfile.can_edit,
					can_comment: shareAccessProfile.can_comment,
					can_view: shareAccessProfile.can_view,
					role: shareAccessProfile.role,
					shared_by: shareAccessProfile.token_created_by,
					shared_at: shareAccessProfile.created_at,
					created_at: shareAccessProfile.created_at,
					updated_at: shareAccessProfile.updated_at,
				},
			}));

			setState({
				currentShares: currentShares,
			});
		},

		// Ensure user is authenticated (anonymous or full)
		ensureAuthenticated: async (displayName?: string) => {
			try {
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

					set({ authUser, sharingError: undefined });
					return true;
				}

				// No valid session, create anonymous user
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

				// Wait a moment for the profile to be created by the trigger
				await new Promise((resolve) => setTimeout(resolve, 100));

				// Get the newly created profile (created by database trigger)
				const { data: newProfile, error: profileError } = await supabase
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

				// If trigger didn't create profile, create it now with is_anonymous=true
				if (profileError || !newProfile) {
					await supabase.from('user_profiles').insert({
						user_id: authData.user.id,
						display_name: defaultDisplayName,
						avatar_url: avatarUrl,
						is_anonymous: true,
					});
				} else if (newProfile && !newProfile.is_anonymous) {
					// Profile was created by trigger but is_anonymous not set - update it
					await supabase
						.from('user_profiles')
						.update({ is_anonymous: true })
						.eq('user_id', authData.user.id);
				}

				const anonymousUser: AnonymousUser = {
					user_id: authData.user.id,
					display_name: defaultDisplayName,
					avatar_url: avatarUrl,
					is_anonymous: true,
					created_at: new Date().toISOString(),
				};

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

				// Prepend to match server order (newest first via created_at DESC)
				set((state) => ({
					shareTokens: [token, ...state.shareTokens],
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

		// Legacy upgrade method - kept for backwards compatibility
		/** @deprecated Use initiateEmailUpgrade + verifyUpgradeOtp + completeUpgradeWithPassword instead */
		upgradeAnonymousUser: async (
			email: string,
			password: string,
			displayName?: string
		) => {
			try {
				// Get user from Supabase auth directly - source of truth for is_anonymous
				const {
					data: { user },
				} = await supabase.auth.getUser();

				if (!user?.is_anonymous) {
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

				// Update current user state (get fresh local state)
				const currentAuthUser = get().authUser;
				if (currentAuthUser) {
					const updatedUser: AnonymousUser = {
						...currentAuthUser,
						display_name: result.data.profile.display_name,
						is_anonymous: false,
					};

					set({
						authUser: updatedUser,
						sharingError: undefined,
					});
				}

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

		// ============================================
		// NEW MULTI-STEP UPGRADE METHODS
		// ============================================

		/**
		 * Step 1: Initiate email upgrade - sends verification OTP to email
		 */
		initiateEmailUpgrade: async (email: string, displayName?: string) => {
			set({
				isUpgrading: true,
				upgradeError: null,
				upgradeStep: 'enter_email',
			});

			try {
				// Get user from Supabase auth directly - source of truth for is_anonymous
				const {
					data: { user },
				} = await supabase.auth.getUser();

				if (!user?.is_anonymous) {
					throw new Error('User is not anonymous or not found');
				}

				const response = await fetch('/api/auth/upgrade-anonymous/initiate', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						email,
						display_name: displayName,
					}),
				});

				const result = await response.json();

				if (!response.ok) {
					throw new Error(result.error || 'Failed to send verification email');
				}

				set({
					upgradeStep: 'set_password', // New flow: email → password → OTP
					upgradeEmail: email,
					upgradeDisplayName: displayName || null,
					isUpgrading: false,
				});

				return true;
			} catch (error) {
				set({
					upgradeError:
						error instanceof Error
							? error.message
							: 'Failed to initiate upgrade',
					upgradeStep: 'error',
					isUpgrading: false,
				});
				return false;
			}
		},

		/**
		 * Step 3: Verify OTP code and set password (completes upgrade)
		 * Password and displayName are collected before this step and stored in state
		 */
		verifyUpgradeOtp: async (otp: string) => {
			const {
				upgradeEmail: email,
				upgradePendingPassword: password,
				upgradeDisplayName: displayName,
			} = get();

			if (!email) {
				set({
					upgradeError: 'No email found. Please start over.',
					upgradeStep: 'error',
				});
				return false;
			}

			if (!password) {
				set({
					upgradeError: 'No password found. Please go back and set a password.',
					upgradeStep: 'error',
				});
				return false;
			}

			set({ isUpgrading: true, upgradeError: null });

			try {
				const response = await fetch('/api/auth/upgrade-anonymous/verify-otp', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ email, otp, password, displayName }),
				});

				const result = await response.json();

				if (!response.ok) {
					throw new Error(result.error || 'Invalid verification code');
				}

				// CRITICAL: After OTP verification, the server creates a new session.
				// We must refresh the client-side Supabase session to pick up the new cookies.
				// Without this, subsequent API calls will fail with "Auth session missing"
				await supabase.auth.getUser();

				// Update auth user if profile returned
				if (result.profile) {
					set({ authUser: result.profile });
				}

				set({
					upgradeStep: 'completed',
					upgradePendingPassword: null, // Clear password from memory
					isUpgrading: false,
				});

				return true;
			} catch (error) {
				set({
					upgradeError:
						error instanceof Error ? error.message : 'Verification failed',
					isUpgrading: false,
				});
				return false;
			}
		},

		/**
		 * Step 3: Set password after email verification - completes upgrade
		 */
		completeUpgradeWithPassword: async (password: string) => {
			set({ isUpgrading: true, upgradeError: null });

			try {
				const displayName = get().upgradeDisplayName;

				const response = await fetch(
					'/api/auth/upgrade-anonymous/set-password',
					{
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							password,
							display_name: displayName,
						}),
					}
				);

				const result = await response.json();

				if (!response.ok) {
					throw new Error(result.error || 'Failed to set password');
				}

				// Update current user state
				const currentUser = get().authUser;
				if (currentUser) {
					const updatedUser: AnonymousUser = {
						...currentUser,
						display_name:
							result.data?.profile?.display_name || currentUser.display_name,
						is_anonymous: false,
					};

					set({
						authUser: updatedUser,
						upgradeStep: 'completed',
						isUpgrading: false,
						sharingError: undefined,
					});
				} else {
					set({
						upgradeStep: 'completed',
						isUpgrading: false,
					});
				}

				return true;
			} catch (error) {
				set({
					upgradeError:
						error instanceof Error
							? error.message
							: 'Failed to complete upgrade',
					upgradeStep: 'error',
					isUpgrading: false,
				});
				return false;
			}
		},

		/**
		 * Alternative: Initiate OAuth upgrade (redirects to provider)
		 */
		initiateOAuthUpgrade: async (provider: OAuthProvider) => {
			set({
				isUpgrading: true,
				upgradeError: null,
				upgradeStep: 'oauth_pending',
			});

			try {
				// Get user from Supabase auth directly - source of truth for is_anonymous
				const {
					data: { user },
				} = await supabase.auth.getUser();

				if (!user?.is_anonymous) {
					throw new Error('User is not anonymous or not found');
				}

				// Use linkIdentity to link OAuth provider to anonymous user
				const { data, error } = await supabase.auth.linkIdentity({
					provider,
					options: {
						redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname)}`,
					},
				});

				if (error) {
					throw error;
				}

				// If linkIdentity returns a URL, redirect to it
				if (data?.url) {
					window.location.href = data.url;
				}

				// Note: isUpgrading will remain true until callback completes
			} catch (error) {
				set({
					upgradeError:
						error instanceof Error ? error.message : 'Failed to start OAuth',
					upgradeStep: 'error',
					isUpgrading: false,
				});
			}
		},

		/**
		 * Resend verification OTP
		 */
		resendUpgradeOtp: async () => {
			const email = get().upgradeEmail;
			const displayName = get().upgradeDisplayName;

			if (!email) {
				set({
					upgradeError: 'No email found. Please start over.',
					upgradeStep: 'error',
				});
				return false;
			}

			// Re-initiate with same email
			return get().initiateEmailUpgrade(email, displayName || undefined);
		},

		/**
		 * Reset upgrade state to initial
		 */
		resetUpgradeState: () => {
			set({
				upgradeStep: 'idle',
				upgradeEmail: null,
				upgradeDisplayName: null,
				upgradePendingPassword: null,
				upgradeError: null,
				isUpgrading: false,
			});
		},

		/**
		 * Set upgrade step manually (for UI navigation)
		 */
		setUpgradeStep: (step: UpgradeStep) => {
			set({ upgradeStep: step, upgradeError: null });
		},

		/**
		 * Store pending password (used between set_password and verify_otp steps)
		 */
		setUpgradePendingPassword: (password: string | null) => {
			set({ upgradePendingPassword: password });
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

		// Delete individual user access from a shared map
		deleteShare: async (shareId: string) => {
			try {
				const response = await fetch(`/api/share/delete-share/${shareId}`, {
					method: 'DELETE',
				});

				if (!response.ok) {
					const error = await response.json();
					throw new Error(error.error || 'Failed to delete share');
				}

				// Remove from currentShares state
				set((state) => ({
					currentShares: (state.currentShares ?? []).filter(
						(share) => share.share.id !== shareId
					),
				}));
			} catch (error) {
				const sharingError: SharingError = {
					code: 'UNKNOWN',
					message:
						error instanceof Error ? error.message : 'Failed to delete share',
				};

				set({ sharingError });
				throw sharingError;
			}
		},

		// Update share role with optimistic update
		updateShareRole: async (shareId: string, newRole: string) => {
			// Store previous state for rollback
			const previousShares = get().currentShares ?? [];
			const shareToUpdate = previousShares.find((s) => s.share.id === shareId);
			const previousRole = shareToUpdate?.share.role;

			// Derive permission flags from role
			const getPermissions = (role: string) => {
				switch (role) {
					case 'editor':
						return { can_edit: true, can_comment: true, can_view: true };
					case 'commentator':
						return { can_edit: false, can_comment: true, can_view: true };
					case 'viewer':
					default:
						return { can_edit: false, can_comment: false, can_view: true };
				}
			};

			const newPermissions = getPermissions(newRole);

			// Optimistic update
			set((state) => ({
				currentShares: (state.currentShares ?? []).map((share) =>
					share.share.id === shareId
						? {
								...share,
								share: {
									...share.share,
									role: newRole as 'owner' | 'editor' | 'commentator' | 'viewer',
									...newPermissions,
								},
							}
						: share
				),
			}));

			try {
				const response = await fetch(`/api/share/update-share/${shareId}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ role: newRole }),
				});

				if (!response.ok) {
					const error = await response.json();
					throw new Error(error.error || 'Failed to update share');
				}
			} catch (error) {
				// Rollback on error
				if (previousRole) {
					const prevPermissions = getPermissions(previousRole);
					set((state) => ({
						currentShares: (state.currentShares ?? []).map((share) =>
							share.share.id === shareId
								? {
										...share,
										share: {
											...share.share,
											role: previousRole as
												| 'owner'
												| 'editor'
												| 'commentator'
												| 'viewer',
											...prevPermissions,
										},
									}
								: share
						),
					}));
				}

				const sharingError: SharingError = {
					code: 'UNKNOWN',
					message:
						error instanceof Error
							? error.message
							: 'Failed to update share role',
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
				const channel = supabase.channel(`sharing_updates_${mapId}`).on(
					'postgres_changes',
					{
						event: '*',
						schema: 'public',
						table: 'share_tokens',
						filter: `map_id=eq.${mapId}`,
					},
					() => {
						// Refresh tokens when changes occur
						get().refreshTokens();
					}
				);

				const subscription = channel.subscribe();

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
			// Clean up subscriptions before resetting state
			get().unsubscribeFromSharing();

			set({
				shareTokens: [],
				activeToken: undefined,
				isCreatingToken: false,
				isJoiningRoom: false,
				authUser: undefined,
				sharingError: undefined,
				lastJoinResult: undefined,
				_sharingSubscription: undefined,
				// Reset upgrade state
				upgradeStep: 'idle',
				upgradeEmail: null,
				upgradeDisplayName: null,
				upgradePendingPassword: null,
				upgradeError: null,
				isUpgrading: false,
			});
		},
	};
};

// Export the type for use in other parts of the app
export type { AnonymousUser, SharingSlice };
