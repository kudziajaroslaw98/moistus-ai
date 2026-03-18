'use client';

import { subscribeToNotificationChannel } from '@/lib/realtime/notification-channel';
import useAppStore from '@/store/mind-map-store';
import type { NotificationRecord } from '@/types/notification';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

export function useNotifications({
	filterMapId = null,
	enabled = true,
}: UseNotificationsOptions = {}): UseNotificationsResult {
	const { currentUser } = useAppStore(
		useShallow((state) => ({
			currentUser: state.currentUser,
		}))
	);
	const [isLoading, setIsLoading] = useState(false);
	const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const [error, setError] = useState<string | null>(null);

	const visibleNotifications = useMemo(() => {
		if (!filterMapId) {
			return notifications;
		}

		return notifications.filter(
			(notification) => notification.map_id === filterMapId
		);
	}, [notifications, filterMapId]);

	const visibleUnreadCount = useMemo(() => {
		if (!filterMapId) {
			return unreadCount;
		}

		return visibleNotifications.filter((notification) => !notification.is_read)
			.length;
	}, [filterMapId, unreadCount, visibleNotifications]);

	const refreshNotifications = useCallback(async () => {
		if (!enabled || !currentUser?.id) {
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const response = await fetch('/api/notifications?limit=30');
			if (!response.ok) {
				throw new Error('Failed to fetch notifications');
			}

			const payload = (await response.json()) as NotificationsApiResponse;
			if (payload.status !== 'success' || !payload.data) {
				throw new Error('Invalid notifications response');
			}

			setNotifications(payload.data.notifications ?? []);
			setUnreadCount(payload.data.unreadCount ?? 0);
		} catch (fetchError) {
			setError(
				fetchError instanceof Error
					? fetchError.message
					: 'Failed to fetch notifications'
			);
		} finally {
			setIsLoading(false);
		}
	}, [currentUser?.id, enabled]);

	useEffect(() => {
		if (!enabled || !currentUser?.id) {
			setNotifications([]);
			setUnreadCount(0);
			setError(null);
			setIsLoading(false);
			return;
		}

		void refreshNotifications();
	}, [currentUser?.id, enabled, refreshNotifications]);

	useEffect(() => {
		if (!enabled || !currentUser?.id) {
			return;
		}

		let unsubscribe: (() => void) | null = null;
		let cancelled = false;

		void subscribeToNotificationChannel(currentUser.id, {
			onEvent: () => {
				void refreshNotifications();
			},
			onOpen: () => {
				void refreshNotifications();
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
				if (cancelled) {
					subscription.disconnect();
					return;
				}

				unsubscribe = subscription.disconnect;
			})
			.catch((subscriptionError) => {
				if (!cancelled) {
					console.warn(
						'[use-notifications] failed to subscribe to notification channel',
						{
							userId: currentUser.id,
							error:
								subscriptionError instanceof Error
									? subscriptionError.message
									: 'Unknown error',
						}
					);
				}
			});

		return () => {
			cancelled = true;
			unsubscribe?.();
		};
	}, [currentUser?.id, enabled, refreshNotifications]);

	const markAllAsRead = useCallback(async () => {
		if (!enabled || visibleUnreadCount === 0) {
			return;
		}

		try {
			const response = await fetch('/api/notifications/mark-all-read', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(filterMapId ? { mapId: filterMapId } : {}),
			});

			if (!response.ok) {
				console.warn('[use-notifications] failed to mark all as read', {
					status: response.status,
					statusText: response.statusText,
				});
				return;
			}

			setNotifications((current) =>
				current.map((notification) => {
					const isVisibleTarget = filterMapId
						? notification.map_id === filterMapId
						: true;

					if (!isVisibleTarget || notification.is_read) {
						return notification;
					}

					return {
						...notification,
						is_read: true,
						read_at: new Date().toISOString(),
					};
				})
			);
			setUnreadCount((current) =>
				filterMapId ? Math.max(0, current - visibleUnreadCount) : 0
			);
			void refreshNotifications();
		} catch (markAllError) {
			console.warn('[use-notifications] failed to mark all as read', markAllError);
		}
	}, [enabled, filterMapId, refreshNotifications, visibleUnreadCount]);

	const markNotificationAsRead = useCallback(
		async (notificationId: string) => {
			const targetNotification = notifications.find(
				(notification) => notification.id === notificationId
			);

			if (!enabled || !targetNotification || targetNotification.is_read) {
				return;
			}

			try {
				const response = await fetch(`/api/notifications/${notificationId}/read`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ read: true }),
				});

				if (!response.ok) {
					console.warn('[use-notifications] failed to mark notification as read', {
						notificationId,
						status: response.status,
					});
					return;
				}

				setNotifications((current) =>
					current.map((notification) =>
						notification.id === notificationId
							? {
									...notification,
									is_read: true,
									read_at: new Date().toISOString(),
								}
							: notification
					)
				);
				setUnreadCount((current) => Math.max(0, current - 1));
			} catch (markError) {
				console.warn(
					'[use-notifications] failed to mark notification as read',
					{
						notificationId,
						markError,
					}
				);
			}
		},
		[enabled, notifications]
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
