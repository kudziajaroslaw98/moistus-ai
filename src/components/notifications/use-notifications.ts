'use client';

import {
	subscribeToNotificationChannel,
	type NotificationChannelSubscription,
} from '@/lib/realtime/notification-channel';
import {
	getWorkspaceCacheRecord,
	setWorkspaceCacheRecord,
} from '@/lib/offline/indexed-db';
import { queueMutation } from '@/lib/offline/offline-mutation-adapter';
import {
	buildNotificationsCacheKey,
	NOTIFICATIONS_SCOPE_ALL,
	parseNotificationsCachePayload,
} from '@/lib/notifications/notifications-cache';
import useAppStore from '@/store/mind-map-store';
import type { NotificationRecord } from '@/types/notification';
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useShallow } from 'zustand/shallow';

interface NotificationsApiResponse {
	status: 'success' | 'error';
	data?: {
		notifications: NotificationRecord[];
		unreadCount: number;
	};
}

interface UseNotificationsOptions {
	filterMapId?: string | null;
	enabled?: boolean;
}

export interface UseNotificationsResult {
	notifications: NotificationRecord[];
	visibleNotifications: NotificationRecord[];
	visibleUnreadCount: number;
	isLoading: boolean;
	error: string | null;
	refreshNotifications: () => Promise<void>;
	markAllAsRead: () => Promise<void>;
	markNotificationAsRead: (notificationId: string) => Promise<void>;
}

interface NotificationsSnapshot {
	notifications: NotificationRecord[];
	unreadCount: number;
	isLoading: boolean;
	error: string | null;
}

interface NotificationsScopeState {
	filterMapId: string | null;
	snapshot: NotificationsSnapshot;
	hasFetched: boolean;
	listeners: Set<() => void>;
	request: Promise<void> | null;
}

const EMPTY_NOTIFICATIONS_SNAPSHOT: NotificationsSnapshot = {
	notifications: [],
	unreadCount: 0,
	isLoading: false,
	error: null,
};

const createNotificationsSnapshot = (
	overrides: Partial<NotificationsSnapshot> = {}
): NotificationsSnapshot => ({
	notifications: EMPTY_NOTIFICATIONS_SNAPSHOT.notifications,
	unreadCount: EMPTY_NOTIFICATIONS_SNAPSHOT.unreadCount,
	isLoading: EMPTY_NOTIFICATIONS_SNAPSHOT.isLoading,
	error: EMPTY_NOTIFICATIONS_SNAPSHOT.error,
	...overrides,
});

const createScopeState = (
	filterMapId: string | null
): NotificationsScopeState => ({
	filterMapId,
	snapshot: EMPTY_NOTIFICATIONS_SNAPSHOT,
	hasFetched: false,
	listeners: new Set(),
	request: null,
});

class SharedNotificationsManager {
	private currentUserId: string | null = null;
	private channelSubscription: NotificationChannelSubscription | null = null;
	private channelSubscriptionPromise: Promise<void> | null = null;
	private scopes = new Map<string, NotificationsScopeState>();

	private getScopeKey(filterMapId: string | null): string {
		return filterMapId ?? NOTIFICATIONS_SCOPE_ALL;
	}

	private getCacheKey(filterMapId: string | null, userId: string): string {
		return buildNotificationsCacheKey(userId, filterMapId);
	}

	private ensureScope(filterMapId: string | null): NotificationsScopeState {
		const scopeKey = this.getScopeKey(filterMapId);
		const existingScope = this.scopes.get(scopeKey);
		if (existingScope) {
			return existingScope;
		}

		const nextScope = createScopeState(filterMapId);
		this.scopes.set(scopeKey, nextScope);
		return nextScope;
	}

	private emit(scope: NotificationsScopeState) {
		scope.listeners.forEach((listener) => {
			listener();
		});
	}

	private emitAll() {
		this.scopes.forEach((scope) => {
			this.emit(scope);
		});
	}

	private hasActiveListeners(): boolean {
		return Array.from(this.scopes.values()).some(
			(scope) => scope.listeners.size > 0
		);
	}

	private teardownRealtimeIfIdle() {
		if (this.hasActiveListeners()) {
			return;
		}

		this.channelSubscription?.disconnect();
		this.channelSubscription = null;
	}

	private updateSnapshot(
		scope: NotificationsScopeState,
		overrides: Partial<NotificationsSnapshot>
	) {
		scope.snapshot = createNotificationsSnapshot({
			...scope.snapshot,
			...overrides,
			});
	}

	private async persistScopeCache(scope: NotificationsScopeState) {
		if (!this.currentUserId) {
			return;
		}

		await setWorkspaceCacheRecord(
			this.getCacheKey(scope.filterMapId, this.currentUserId),
			{
				notifications: scope.snapshot.notifications,
				unreadCount: scope.snapshot.unreadCount,
			}
		);
	}

	private isScopeAffectedByReadUpdate(
		scopeFilterMapId: string | null,
		targetFilterMapId: string | null
	): boolean {
		if (targetFilterMapId === null) {
			return true;
		}

		return scopeFilterMapId === null || scopeFilterMapId === targetFilterMapId;
	}

	private async applyOptimisticReadUpdate(
		targetFilterMapId: string | null,
		updater: (notifications: NotificationRecord[]) => NotificationRecord[]
	) {
		const affectedScopes = Array.from(this.scopes.values()).filter((scope) =>
			this.isScopeAffectedByReadUpdate(scope.filterMapId, targetFilterMapId)
		);

		await Promise.all(
			affectedScopes.map(async (scope) => {
				const nextNotifications = updater(scope.snapshot.notifications);
				this.updateSnapshot(scope, {
					notifications: nextNotifications,
					unreadCount: nextNotifications.filter((notification) => !notification.is_read)
						.length,
					error: null,
				});
				this.emit(scope);

				try {
					await this.persistScopeCache(scope);
				} catch (cacheError) {
					console.warn('[use-notifications] failed to persist optimistic cache', {
						filterMapId: scope.filterMapId,
						cacheError,
					});
				}
			})
		);
	}

	private resetScope(scope: NotificationsScopeState) {
		scope.snapshot = EMPTY_NOTIFICATIONS_SNAPSHOT;
		scope.hasFetched = false;
		scope.request = null;
	}

	private setCurrentUser(userId: string | null) {
		if (this.currentUserId === userId) {
			return;
		}

		this.channelSubscription?.disconnect();
		this.channelSubscription = null;
		this.channelSubscriptionPromise = null;
		this.currentUserId = userId;
		this.scopes.forEach((scope) => {
			this.resetScope(scope);
		});
		this.emitAll();
	}

	private buildRequestUrl(filterMapId: string | null): string {
		const query = new URLSearchParams({ limit: '30' });
		if (filterMapId) {
			query.set('mapId', filterMapId);
		}

		return `/api/notifications?${query.toString()}`;
	}

	private async refreshActiveScopes() {
		const activeScopes = Array.from(this.scopes.values()).filter(
			(scope) => scope.listeners.size > 0
		);

		await Promise.all(
			activeScopes.map((scope) => this.fetchAndUpdate(scope.filterMapId))
		);
	}

	getSnapshot(filterMapId: string | null): NotificationsSnapshot {
		const scope = this.scopes.get(this.getScopeKey(filterMapId));
		if (!scope) {
			return EMPTY_NOTIFICATIONS_SNAPSHOT;
		}

		return scope.snapshot;
	}

	subscribe(
		userId: string,
		filterMapId: string | null,
		listener: () => void
	): () => void {
		this.setCurrentUser(userId);

		const scope = this.ensureScope(filterMapId);
		scope.listeners.add(listener);

		void this.init(userId);
		if (!scope.hasFetched && !scope.request) {
			void this.fetchAndUpdate(filterMapId);
		}

		return () => {
			scope.listeners.delete(listener);
			if (scope.listeners.size === 0) {
				this.scopes.delete(this.getScopeKey(filterMapId));
				this.teardownRealtimeIfIdle();
			}
		};
	}

	clearUser() {
		this.setCurrentUser(null);
	}

	async init(userId: string) {
		this.setCurrentUser(userId);

		if (this.channelSubscription || this.channelSubscriptionPromise) {
			return this.channelSubscriptionPromise ?? Promise.resolve();
		}

		this.channelSubscriptionPromise = subscribeToNotificationChannel(userId, {
			onEvent: () => {
				void this.refreshActiveScopes();
			},
			onOpen: () => {
				void this.refreshActiveScopes();
			},
			onError: (event) => {
				console.warn('[use-notifications] notification channel error', event);
			},
			onClose: (event) => {
				if (event.code !== 1000 && event.reason !== 'client_unsubscribe') {
					console.warn('[use-notifications] notification channel closed', {
						code: event.code,
						reason: event.reason,
					});
				}
			},
		})
			.then((subscription) => {
				if (this.currentUserId !== userId) {
					subscription.disconnect();
					return;
				}

				if (!this.hasActiveListeners()) {
					subscription.disconnect();
					return;
				}

				this.channelSubscription = subscription;
			})
			.catch((subscriptionError) => {
				console.warn(
					'[use-notifications] failed to subscribe to notification channel',
					{
						userId,
						error:
							subscriptionError instanceof Error
								? subscriptionError.message
								: 'Unknown error',
					}
				);
			})
			.finally(() => {
				this.channelSubscriptionPromise = null;
			});

		return this.channelSubscriptionPromise;
	}

	async fetchAndUpdate(filterMapId: string | null) {
		const scope = this.ensureScope(filterMapId);
		if (!this.currentUserId) {
			this.resetScope(scope);
			this.emit(scope);
			return;
		}

		if (scope.request) {
			return scope.request;
		}

		this.updateSnapshot(scope, {
			isLoading: true,
			error: null,
		});
		this.emit(scope);

		const requestUserId = this.currentUserId;
		scope.request = (async () => {
			try {
				const response = await fetch(this.buildRequestUrl(filterMapId));
				if (!response.ok) {
					throw new Error('Failed to fetch notifications');
				}

				const payload = (await response.json()) as NotificationsApiResponse;
				if (payload.status !== 'success' || !payload.data) {
					throw new Error('Invalid notifications response');
				}

				if (this.currentUserId !== requestUserId) {
					return;
				}

					this.updateSnapshot(scope, {
						notifications: payload.data.notifications ?? [],
						unreadCount: payload.data.unreadCount ?? 0,
					});
					scope.hasFetched = true;
					try {
						await this.persistScopeCache(scope);
					} catch (cacheError) {
						console.warn('[use-notifications] failed to persist notifications cache', {
							filterMapId,
							cacheError,
						});
					}
				} catch (fetchError) {
					if (this.currentUserId !== requestUserId) {
						return;
					}

					const cachedRecord = await getWorkspaceCacheRecord(
						this.getCacheKey(filterMapId, requestUserId)
					);
					const cachedPayload = parseNotificationsCachePayload(cachedRecord?.payload);
					if (cachedPayload) {
						this.updateSnapshot(scope, {
						notifications: cachedPayload.notifications,
						unreadCount: cachedPayload.unreadCount,
						error: null,
					});
					scope.hasFetched = true;
					return;
				}

				this.updateSnapshot(scope, {
					error:
						fetchError instanceof Error
							? fetchError.message
							: 'Failed to fetch notifications',
				});
			} finally {
				if (this.currentUserId === requestUserId) {
					this.updateSnapshot(scope, { isLoading: false });
					scope.request = null;
					this.emit(scope);
				}
			}
		})();

		return scope.request;
	}

		async markAllAsRead(filterMapId: string | null) {
		const scope = this.ensureScope(filterMapId);
		if (!this.currentUserId || scope.snapshot.unreadCount === 0) {
			return;
		}

			try {
				const now = new Date().toISOString();
				const result = await queueMutation({
					entity: 'notifications',
					action: 'update',
					payload: {
						table: 'notifications',
						values: {
							is_read: true,
							read_at: now,
							updated_at: now,
						},
						match: {
							recipient_user_id: this.currentUserId,
						...(filterMapId ? { map_id: filterMapId } : {}),
					},
				},
				executeOnline: async () => {
					const response = await fetch('/api/notifications/mark-all-read', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(filterMapId ? { mapId: filterMapId } : {}),
					});

					if (!response.ok) {
						throw new Error(
							`Failed to mark all notifications as read (${response.status})`
						);
						}
					},
				});

				if (result.status === 'queued') {
					await this.applyOptimisticReadUpdate(filterMapId, (notifications) =>
						notifications.map((notification) => {
							const shouldMarkRead =
								filterMapId === null || notification.map_id === filterMapId;

							if (!shouldMarkRead || notification.is_read) {
								return notification;
							}

							return {
								...notification,
								is_read: true,
								read_at: now,
								updated_at: now,
							};
						})
					);
				}

				await this.refreshActiveScopes();
			} catch (markAllError) {
				console.warn('[use-notifications] failed to mark all as read', markAllError);
		}
	}

	async markNotificationAsRead(
		filterMapId: string | null,
		notificationId: string
	) {
		const scope = this.ensureScope(filterMapId);
		const targetNotification = scope.snapshot.notifications.find(
			(notification) => notification.id === notificationId
		);

		if (!this.currentUserId || !targetNotification || targetNotification.is_read) {
			return;
		}

			try {
				const now = new Date().toISOString();
				const result = await queueMutation({
					entity: 'notifications',
					action: 'update',
					payload: {
						table: 'notifications',
						values: {
							is_read: true,
							read_at: now,
							updated_at: now,
						},
						match: {
							id: notificationId,
						recipient_user_id: this.currentUserId,
					},
				},
				executeOnline: async () => {
					const response = await fetch(`/api/notifications/${notificationId}/read`, {
						method: 'PATCH',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ read: true }),
					});

					if (!response.ok) {
						throw new Error(
							`Failed to mark notification as read (${response.status})`
						);
						}
					},
				});

				if (result.status === 'queued') {
					await this.applyOptimisticReadUpdate(filterMapId, (notifications) =>
						notifications.map((notification) =>
							notification.id === notificationId && !notification.is_read
								? {
										...notification,
										is_read: true,
										read_at: now,
										updated_at: now,
								  }
								: notification
						)
					);
				}

				await this.refreshActiveScopes();
			} catch (markError) {
				console.warn('[use-notifications] failed to mark notification as read', {
				notificationId,
				markError,
			});
		}
	}

	resetForTests() {
		this.channelSubscription?.disconnect();
		this.channelSubscription = null;
		this.channelSubscriptionPromise = null;
		this.currentUserId = null;
		this.scopes.clear();
	}
}

const sharedNotifications = new SharedNotificationsManager();

export function resetSharedNotificationsForTests() {
	sharedNotifications.resetForTests();
}

export function useNotifications({
	filterMapId = null,
	enabled = true,
}: UseNotificationsOptions = {}): UseNotificationsResult {
	const { currentUser } = useAppStore(
		useShallow((state) => ({
			currentUser: state.currentUser,
		}))
	);
	const subscribe = useCallback(
		(listener: () => void) => {
			if (!enabled || !currentUser?.id) {
				return () => undefined;
			}

			return sharedNotifications.subscribe(currentUser.id, filterMapId, listener);
		},
		[currentUser?.id, enabled, filterMapId]
	);

	const getSnapshot = useCallback(() => {
		if (!enabled || !currentUser?.id) {
			return EMPTY_NOTIFICATIONS_SNAPSHOT;
		}

		return sharedNotifications.getSnapshot(filterMapId);
	}, [currentUser?.id, enabled, filterMapId]);

	const snapshot = useSyncExternalStore(
		subscribe,
		getSnapshot,
		() => EMPTY_NOTIFICATIONS_SNAPSHOT
	);
	const { notifications, unreadCount, isLoading, error } = snapshot;

	useEffect(() => {
		if (!currentUser?.id) {
			sharedNotifications.clearUser();
		}
	}, [currentUser?.id]);

	useEffect(() => {
		if (!enabled || !currentUser?.id) {
			return;
		}

		void sharedNotifications.init(currentUser.id);
	}, [currentUser?.id, enabled]);

	const visibleNotifications = notifications;
	const visibleUnreadCount = unreadCount;

	const refreshNotifications = useCallback(async () => {
		if (!enabled || !currentUser?.id) {
			return;
		}

		await sharedNotifications.fetchAndUpdate(filterMapId);
	}, [currentUser?.id, enabled, filterMapId]);

	useEffect(() => {
		if (!enabled || !currentUser?.id) {
			return;
		}

		void refreshNotifications();
	}, [currentUser?.id, enabled, filterMapId, refreshNotifications]);

	const markAllAsRead = useCallback(async () => {
		if (!enabled) {
			return;
		}

		await sharedNotifications.markAllAsRead(filterMapId);
	}, [enabled, filterMapId]);

	const markNotificationAsRead = useCallback(
		async (notificationId: string) => {
			if (!enabled) {
				return;
			}

			await sharedNotifications.markNotificationAsRead(
				filterMapId,
				notificationId
			);
		},
		[enabled, filterMapId]
	);

	return {
		notifications,
		visibleNotifications,
		visibleUnreadCount,
		isLoading,
		error,
		refreshNotifications,
		markAllAsRead,
		markNotificationAsRead,
	};
}

export function formatRelativeNotificationTime(date: Date | string): string {
	const timestamp = typeof date === 'string' ? new Date(date) : date;
	const diffSeconds = Math.floor((Date.now() - timestamp.getTime()) / 1000);

	if (diffSeconds < 60) return 'just now';
	if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
	if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
	if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;
	return `${Math.floor(diffSeconds / 604800)}w ago`;
}
