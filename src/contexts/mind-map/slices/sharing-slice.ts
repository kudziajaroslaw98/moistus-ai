import { createClient } from '@/helpers/supabase/client';
import {
	CreateGuestUserRequest,
	CreateRoomCodeRequest,
	GuestUser,
	JoinRoomRequest,
	ShareAccessLog,
	ShareAccessType,
	ShareAccessValidation,
	ShareToken,
	SharingError,
} from '@/types/sharing-types';
import { StateCreator } from 'zustand';
import type { SharingSlice } from '../app-state';

const supabase = createClient();

export const createSharingSlice: StateCreator<
	SharingSlice,
	[],
	[],
	SharingSlice
> = (set, get) => {
	let sharingChannel: any = null;
	let currentMapId: string | null = null;

	// Helper function to generate guest session ID
	const generateGuestSessionId = (): string => {
		return `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	};

	// Helper function to generate browser fingerprint
	const generateFingerprint = (): string => {
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');

		if (ctx) {
			ctx.textBaseline = 'top';
			ctx.font = '14px Arial';
			ctx.fillText('Browser fingerprint', 2, 2);
		}

		const fingerprint = [
			navigator.userAgent,
			navigator.language,
			screen.width + 'x' + screen.height,
			new Date().getTimezoneOffset(),
			canvas.toDataURL(),
		].join('|');

		// Simple hash function
		let hash = 0;

		for (let i = 0; i < fingerprint.length; i++) {
			const char = fingerprint.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32-bit integer
		}

		return Math.abs(hash).toString(16);
	};

	return {
		// Initial state
		shareTokens: [],
		activeToken: undefined,
		isCreatingToken: false,
		guestUsers: [],
		currentGuestUser: undefined,
		isGuestSession: false,
		accessLogs: [],
		currentUsers: 0,
		isJoiningRoom: false,
		isValidatingAccess: false,
		sharingError: undefined,
		sharingChannel: undefined,
		isConnectedToSharing: false,

		// Room code management
		createRoomCode: async (request: CreateRoomCodeRequest) => {
			set({ isCreatingToken: true, sharingError: undefined });

			try {
				const { data: currentUser } = await supabase.auth.getUser();

				if (!currentUser.user) {
					throw new Error('User not authenticated');
				}

				const response = await fetch('/api/share/create-room-code', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						...request,
						created_by: currentUser.user.id,
					}),
				});

				if (!response.ok) {
					const error = await response.json();
					throw new Error(error.message || 'Failed to create room code');
				}

				const token: ShareToken = await response.json();

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

		refreshRoomCode: async (tokenId: string) => {
			try {
				const response = await fetch(
					`/api/share/refresh-room-code/${tokenId}`,
					{
						method: 'POST',
					}
				);

				if (!response.ok) {
					throw new Error('Failed to refresh room code');
				}

				const updatedToken: ShareToken = await response.json();

				set((state) => ({
					shareTokens: state.shareTokens.map((token) =>
						token.id === tokenId ? updatedToken : token
					),
					activeToken:
						state.activeToken?.id === tokenId
							? updatedToken
							: state.activeToken,
				}));

				return updatedToken;
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

		revokeRoomCode: async (tokenId: string) => {
			try {
				const response = await fetch(`/api/share/revoke-room-code/${tokenId}`, {
					method: 'DELETE',
				});

				if (!response.ok) {
					throw new Error('Failed to revoke room code');
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

		updateTokenPermissions: async (
			tokenId: string,
			permissions: Partial<ShareToken['permissions']>
		) => {
			try {
				const response = await fetch(
					`/api/share/update-permissions/${tokenId}`,
					{
						method: 'PUT',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ permissions }),
					}
				);

				if (!response.ok) {
					throw new Error('Failed to update permissions');
				}

				const updatedToken: ShareToken = await response.json();

				set((state) => ({
					shareTokens: state.shareTokens.map((token) =>
						token.id === tokenId ? updatedToken : token
					),
					activeToken:
						state.activeToken?.id === tokenId
							? updatedToken
							: state.activeToken,
				}));

				return updatedToken;
			} catch (error) {
				const sharingError: SharingError = {
					code: 'UNKNOWN',
					message:
						error instanceof Error
							? error.message
							: 'Failed to update permissions',
				};

				set({ sharingError });
				throw sharingError;
			}
		},

		// Room joining and access
		validateRoomAccess: async (token: string) => {
			set({ isValidatingAccess: true, sharingError: undefined });

			try {
				const response = await fetch('/api/share/validate-access', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ token }),
				});

				const validation: ShareAccessValidation = await response.json();

				set({ isValidatingAccess: false });

				if (!validation.is_valid) {
					const sharingError: SharingError = {
						code: validation.error_message?.includes('expired')
							? 'ROOM_EXPIRED'
							: validation.error_message?.includes('full')
								? 'ROOM_FULL'
								: 'INVALID_ROOM_CODE',
						message: validation.error_message || 'Invalid room code',
					};

					set({ sharingError });
					throw sharingError;
				}

				return validation;
			} catch (error) {
				const sharingError: SharingError = {
					code: 'UNKNOWN',
					message:
						error instanceof Error
							? error.message
							: 'Failed to validate access',
				};

				set({
					isValidatingAccess: false,
					sharingError,
				});

				throw sharingError;
			}
		},

		joinRoom: async (request: JoinRoomRequest) => {
			set({ isJoiningRoom: true, sharingError: undefined });

			try {
				// First validate access
				const validation = await get().validateRoomAccess(request.token);

				if (!validation.is_valid) {
					throw new Error(validation.error_message || 'Cannot join room');
				}

				const { data: currentUser } = await supabase.auth.getUser();
				const isGuest = !currentUser.user;

				let guestUser: GuestUser | undefined;

				// Create guest user if not authenticated
				if (isGuest && request.guest_info) {
					guestUser = await get().createGuestUser(request.guest_info);
				}

				// Log the access
				await get().logAccess(validation.share_token_id, 'join', {
					is_guest: isGuest,
					guest_user_id: guestUser?.id,
					user_agent: navigator.userAgent,
				});

				set({
					isJoiningRoom: false,
					isGuestSession: isGuest,
					currentGuestUser: guestUser,
				});

				return {
					mapId: validation.map_id,
					permissions: validation.permissions,
					isGuest,
				};
			} catch (error) {
				const sharingError: SharingError = {
					code: 'UNKNOWN',
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

		leaveRoom: async (tokenId: string) => {
			try {
				await get().logAccess(tokenId, 'leave');

				// Clean up state
				set((state) => ({
					activeToken:
						state.activeToken?.id === tokenId ? undefined : state.activeToken,
					currentGuestUser: undefined,
					isGuestSession: false,
				}));
			} catch (error) {
				console.error('Failed to log room leave:', error);
			}
		},

		// Guest user management
		createGuestUser: async (request: CreateGuestUserRequest) => {
			try {
				const response = await fetch('/api/share/create-guest-user', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						...request,
						fingerprint_hash: request.fingerprint_hash || generateFingerprint(),
					}),
				});

				if (!response.ok) {
					throw new Error('Failed to create guest user');
				}

				const guestUser: GuestUser = await response.json();

				set((state) => ({
					guestUsers: [...state.guestUsers, guestUser],
					currentGuestUser: guestUser,
					isGuestSession: true,
				}));

				return guestUser;
			} catch (error) {
				const sharingError: SharingError = {
					code: 'GUEST_SESSION_INVALID',
					message:
						error instanceof Error
							? error.message
							: 'Failed to create guest session',
				};

				set({ sharingError });
				throw sharingError;
			}
		},

		updateGuestUser: async (guestId: string, updates: Partial<GuestUser>) => {
			try {
				const response = await fetch(
					`/api/share/update-guest-user/${guestId}`,
					{
						method: 'PUT',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(updates),
					}
				);

				if (!response.ok) {
					throw new Error('Failed to update guest user');
				}

				const updatedGuest: GuestUser = await response.json();

				set((state) => ({
					guestUsers: state.guestUsers.map((guest) =>
						guest.id === guestId ? updatedGuest : guest
					),
					currentGuestUser:
						state.currentGuestUser?.id === guestId
							? updatedGuest
							: state.currentGuestUser,
				}));

				return updatedGuest;
			} catch (error) {
				const sharingError: SharingError = {
					code: 'UNKNOWN',
					message:
						error instanceof Error
							? error.message
							: 'Failed to update guest user',
				};

				set({ sharingError });
				throw sharingError;
			}
		},

		convertGuestToUser: async (guestId: string, userId: string) => {
			try {
				const response = await fetch(`/api/share/convert-guest/${guestId}`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ user_id: userId }),
				});

				if (!response.ok) {
					throw new Error('Failed to convert guest user');
				}

				set((state) => ({
					currentGuestUser: undefined,
					isGuestSession: false,
					guestUsers: state.guestUsers.map((guest) =>
						guest.id === guestId
							? {
									...guest,
									converted_user_id: userId,
									conversion_date: new Date().toISOString(),
								}
							: guest
					),
				}));
			} catch (error) {
				const sharingError: SharingError = {
					code: 'UNKNOWN',
					message:
						error instanceof Error
							? error.message
							: 'Failed to convert guest user',
				};

				set({ sharingError });
				throw sharingError;
			}
		},

		endGuestSession: async () => {
			const state = get();

			if (state.currentGuestUser) {
				try {
					await fetch(
						`/api/share/end-guest-session/${state.currentGuestUser.id}`,
						{
							method: 'POST',
						}
					);
				} catch (error) {
					console.error('Failed to end guest session:', error);
				}
			}

			set({
				currentGuestUser: undefined,
				isGuestSession: false,
			});
		},

		// Access logging
		logAccess: async (
			tokenId: string,
			accessType: ShareAccessType,
			metadata?: Record<string, unknown>
		) => {
			try {
				const state = get();
				const { data: currentUser } = await supabase.auth.getUser();

				await fetch('/api/share/log-access', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						share_token_id: tokenId,
						user_id: currentUser.user?.id,
						guest_user_id: state.currentGuestUser?.id,
						access_type: accessType,
						metadata: {
							...metadata,
							timestamp: new Date().toISOString(),
							user_agent: navigator.userAgent,
						},
					}),
				});
			} catch (error) {
				console.error('Failed to log access:', error);
			}
		},

		loadAccessLogs: async (tokenId: string) => {
			try {
				const response = await fetch(`/api/share/access-logs/${tokenId}`);

				if (response.ok) {
					const logs: ShareAccessLog[] = await response.json();
					set({ accessLogs: logs });
				}
			} catch (error) {
				console.error('Failed to load access logs:', error);
			}
		},

		// Real-time sharing
		subscribeToSharingUpdates: async (mapId: string) => {
			if (sharingChannel) {
				await get().unsubscribeFromSharing();
			}

			currentMapId = mapId;

			try {
				sharingChannel = supabase
					.channel(`sharing-${mapId}`)
					.on('broadcast', { event: 'user_joined' }, (payload) => {
						console.log('User joined:', payload);
						// Handle user join events
					})
					.on('broadcast', { event: 'user_left' }, (payload) => {
						console.log('User left:', payload);
						// Handle user leave events
					})
					.on('broadcast', { event: 'room_code_updated' }, (payload) => {
						const updatedToken = payload.payload as ShareToken;
						set((state) => ({
							shareTokens: state.shareTokens.map((token) =>
								token.id === updatedToken.id ? updatedToken : token
							),
						}));
					})
					.subscribe((status) => {
						if (status === 'SUBSCRIBED') {
							set({
								sharingChannel,
								isConnectedToSharing: true,
							});
						}
					});
			} catch (error) {
				console.error('Failed to subscribe to sharing updates:', error);
				set({ isConnectedToSharing: false });
			}
		},

		unsubscribeFromSharing: async () => {
			if (sharingChannel) {
				await sharingChannel.unsubscribe();
				sharingChannel = null;
			}

			set({
				sharingChannel: undefined,
				isConnectedToSharing: false,
			});

			currentMapId = null;
		},

		// Utility functions
		generateRoomCode: async () => {
			try {
				const response = await fetch('/api/share/generate-room-code', {
					method: 'POST',
				});

				if (!response.ok) {
					throw new Error('Failed to generate room code');
				}

				const { token } = await response.json();
				return token;
			} catch (error) {
				throw new Error('Failed to generate room code');
			}
		},

		validatePermissions: (token: ShareToken, action: string) => {
			const permissions = token.permissions;

			switch (action) {
				case 'edit':
					return permissions.can_edit;
				case 'comment':
					return permissions.can_comment;
				case 'view':
					return permissions.can_view;
				default:
					return false;
			}
		},

		getUserCount: async (tokenId: string) => {
			try {
				const response = await fetch(`/api/share/user-count/${tokenId}`);

				if (response.ok) {
					const { count } = await response.json();
					return count;
				}

				return 0;
			} catch (error) {
				console.error('Failed to get user count:', error);
				return 0;
			}
		},

		isTokenExpired: (token: ShareToken) => {
			if (!token.expires_at) return false;
			return new Date(token.expires_at) < new Date();
		},

		// State management
		setActiveToken: (token: ShareToken | undefined) => {
			set({ activeToken: token });
		},

		setSharingError: (error: SharingError | undefined) => {
			set({ sharingError: error });
		},

		clearSharingData: () => {
			set({
				shareTokens: [],
				activeToken: undefined,
				guestUsers: [],
				currentGuestUser: undefined,
				isGuestSession: false,
				accessLogs: [],
				currentUsers: 0,
				sharingError: undefined,
			});
		},

		// Internal state management
		_addShareToken: (token: ShareToken) => {
			set((state) => ({
				shareTokens: [...state.shareTokens, token],
			}));
		},

		_updateShareToken: (tokenId: string, updates: Partial<ShareToken>) => {
			set((state) => ({
				shareTokens: state.shareTokens.map((token) =>
					token.id === tokenId ? { ...token, ...updates } : token
				),
				activeToken:
					state.activeToken?.id === tokenId
						? { ...state.activeToken, ...updates }
						: state.activeToken,
			}));
		},

		_removeShareToken: (tokenId: string) => {
			set((state) => ({
				shareTokens: state.shareTokens.filter((token) => token.id !== tokenId),
				activeToken:
					state.activeToken?.id === tokenId ? undefined : state.activeToken,
			}));
		},

		_addGuestUser: (user: GuestUser) => {
			set((state) => ({
				guestUsers: [...state.guestUsers, user],
			}));
		},

		_updateGuestUser: (userId: string, updates: Partial<GuestUser>) => {
			set((state) => ({
				guestUsers: state.guestUsers.map((user) =>
					user.id === userId ? { ...user, ...updates } : user
				),
				currentGuestUser:
					state.currentGuestUser?.id === userId
						? { ...state.currentGuestUser, ...updates }
						: state.currentGuestUser,
			}));
		},

		_removeGuestUser: (userId: string) => {
			set((state) => ({
				guestUsers: state.guestUsers.filter((user) => user.id !== userId),
				currentGuestUser:
					state.currentGuestUser?.id === userId
						? undefined
						: state.currentGuestUser,
			}));
		},
	};
};
