import type { NotificationRecord } from '@/types/notification';

export interface NotificationsCachePayload {
	notifications: NotificationRecord[];
	unreadCount: number;
}

export const NOTIFICATIONS_SCOPE_ALL = '__all__';

export const buildNotificationsCacheKey = (
	userId: string,
	filterMapId: string | null
): string => `notifications:${userId}:${filterMapId ?? NOTIFICATIONS_SCOPE_ALL}`;

export const parseNotificationsCachePayload = (
	payload: unknown
): NotificationsCachePayload | null => {
	if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
		return null;
	}

	const record = payload as {
		notifications?: unknown;
		unreadCount?: unknown;
	};

	return {
		notifications: Array.isArray(record.notifications)
			? (record.notifications as NotificationRecord[])
			: [],
		unreadCount:
			typeof record.unreadCount === 'number' ? record.unreadCount : 0,
	};
};
