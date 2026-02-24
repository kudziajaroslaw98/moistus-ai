import { getSharedSupabaseClient } from '@/helpers/supabase/shared-client';
import {
	subscribeToPermissionChannel,
	type PermissionChannelEvent,
} from '@/lib/realtime/permission-channel';
import { reconnectYjsRoomsForMap } from '@/lib/realtime/yjs-provider';
import { StateCreator } from 'zustand';
import type { AppState, PermissionsSlice } from '../app-state';

const supabase = getSharedSupabaseClient();

function toEpochMillis(iso: string | null | undefined): number {
	if (!iso) return Number.NEGATIVE_INFINITY;
	const parsed = Date.parse(iso);
	return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}

function readIsAnonymous(state: AppState): boolean {
	const currentUser = state.currentUser as { is_anonymous?: boolean } | null;
	return Boolean(state.authUser?.is_anonymous ?? currentUser?.is_anonymous);
}

export const createPermissionsSlice: StateCreator<
	AppState,
	[],
	[],
	PermissionsSlice
> = (set, get) => ({
	permissions: {
		role: null,
		can_view: true,
		can_comment: false,
		can_edit: false,
		updated_at: null,
	},
	permissionsMapId: null,
	permissionsUserId: null,
	isPermissionsLoading: false,
	permissionsError: null,
	_permissionsUnsubscribe: null,

	fetchInitialPermissions: async (mapId: string) => {
		set({
			isPermissionsLoading: true,
			permissionsError: null,
			permissionsMapId: mapId,
			permissions: {
				role: null,
				can_view: true,
				can_comment: false,
				can_edit: false,
				updated_at: null,
			},
		});

		const isRequestCurrent = () => get().permissionsMapId === mapId;

		try {
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!isRequestCurrent()) {
				return;
			}

			if (user?.id) {
				set({ permissionsUserId: user.id });
			}

			const response = await fetch(`/api/maps/${mapId}/permissions`);
			if (!isRequestCurrent()) {
				return;
			}

			if (!response.ok) {
				set({
					isPermissionsLoading: false,
					permissionsError: `Failed to fetch permissions (${response.status})`,
				});
				return;
			}

			const result = (await response.json()) as {
				data?: {
					role?: 'owner' | 'editor' | 'commentator' | 'viewer';
					can_view?: boolean;
					can_comment?: boolean;
					can_edit?: boolean;
					updated_at?: string;
				};
			};
			const payload = result.data;
			if (!isRequestCurrent()) {
				return;
			}

			if (!payload) {
				set({
					isPermissionsLoading: false,
					permissionsError: 'Permission payload missing',
				});
				return;
			}

			set({
				isPermissionsLoading: false,
				permissionsError: null,
				permissions: {
					role: payload.role ?? null,
					can_view: Boolean(payload.can_view),
					can_comment: Boolean(payload.can_comment),
					can_edit: Boolean(payload.can_edit),
					updated_at: payload.updated_at ?? new Date().toISOString(),
				},
			});
		} catch (error) {
			if (!isRequestCurrent()) {
				return;
			}

			set({
				isPermissionsLoading: false,
				permissionsError:
					error instanceof Error
						? error.message
						: 'Failed to fetch permissions',
			});
		}
	},

	subscribeToPermissionUpdates: async (mapId: string) => {
		get().unsubscribeFromPermissionUpdates();
		set({
			permissionsMapId: mapId,
			permissionsError: null,
		});

		const applyAccessRevokedKick = (source: 'event' | 'socket_close') => {
			const state = get();
			if (state.permissionsMapId !== mapId) return;

			console.info('[permissions-slice] applying access revoked kick', {
				mapId,
				source,
			});

			state.setMapAccessError({
				type: 'access_denied',
				isAnonymous: readIsAnonymous(state),
			});
			state.unsubscribeFromPermissionUpdates();
			void state.unsubscribeFromRealtimeUpdates();
		};

		try {
			const subscription = await subscribeToPermissionChannel(mapId, {
				onEvent: (event) => get().applyPermissionEvent(event),
				onOpen: () => {
					console.info('[permissions-slice] permission channel connected', {
						mapId,
					});
					set((state) =>
						state.permissionsMapId === mapId ? { permissionsError: null } : {}
					);
				},
				onClose: (event) => {
					if (event.code === 1000 && event.reason === 'client_unsubscribe') {
						return;
					}

					if (event.code === 4403 && event.reason === 'access_revoked') {
						applyAccessRevokedKick('socket_close');
						return;
					}

					console.warn('[permissions-slice] permission channel closed', {
						mapId,
						code: event.code,
						reason: event.reason,
					});
					set((state) =>
						state.permissionsMapId === mapId
							? {
									permissionsError:
										'Permission realtime disconnected. Reconnecting...',
								}
							: {}
					);
				},
				onError: () => {
					console.warn('[permissions-slice] permission channel error', {
						mapId,
					});
					set((state) =>
						state.permissionsMapId === mapId
							? {
									permissionsError:
										'Permission realtime connection issue. Reconnecting...',
								}
							: {}
					);
				},
			});

			if (get().permissionsMapId !== mapId) {
				subscription.disconnect();
				return;
			}

			set({
				_permissionsUnsubscribe: subscription.disconnect,
			});
		} catch (error) {
			set({
				permissionsError:
					error instanceof Error
						? error.message
						: 'Failed to subscribe to permission updates',
			});
		}
	},

	unsubscribeFromPermissionUpdates: () => {
		const unsubscribe = get()._permissionsUnsubscribe;
		if (unsubscribe) {
			unsubscribe();
		}
		set({ _permissionsUnsubscribe: null });
	},

	applyPermissionEvent: (event: PermissionChannelEvent) => {
		const state = get();
		const activeMapId = state.permissionsMapId;
		if (!activeMapId || event.mapId !== activeMapId) {
			return;
		}

		const currentUserId =
			state.permissionsUserId ?? state.currentUser?.id ?? null;
		if (!currentUserId || event.targetUserId !== currentUserId) {
			return;
		}

		if (event.type === 'permissions:revoked') {
			console.info('[permissions-slice] applying access revoked kick', {
				mapId: event.mapId,
				source: 'event',
			});
			state.setMapAccessError({
				type: 'access_denied',
				isAnonymous: readIsAnonymous(state),
			});
			state.unsubscribeFromPermissionUpdates();
			void state.unsubscribeFromRealtimeUpdates();
			return;
		}

		const currentVersion = toEpochMillis(state.permissions.updated_at);
		const nextVersion = toEpochMillis(event.updatedAt);
		if (nextVersion <= currentVersion) {
			return;
		}

		const previousCanEdit = Boolean(state.permissions.can_edit);
		const nextCanEdit = Boolean(event.can_edit);

		set({
			permissions: {
				role: event.role,
				can_view: event.can_view,
				can_comment: event.can_comment,
				can_edit: event.can_edit,
				updated_at: event.updatedAt,
			},
			permissionsError: null,
		});

		if (previousCanEdit !== nextCanEdit) {
			const reconnectedRooms = reconnectYjsRoomsForMap(event.mapId);
			console.info(
				'[permissions-slice] can_edit changed; attempted Yjs reconnect',
				{
					mapId: event.mapId,
					userId: event.targetUserId,
					previousCanEdit,
					nextCanEdit,
					reconnectedRooms,
				}
			);
		}
	},

	clearPermissionsState: () => {
		get().unsubscribeFromPermissionUpdates();
		set({
			permissions: {
				role: null,
				can_view: true,
				can_comment: false,
				can_edit: false,
				updated_at: null,
			},
			permissionsMapId: null,
			permissionsUserId: null,
			isPermissionsLoading: false,
			permissionsError: null,
		});
	},
});
