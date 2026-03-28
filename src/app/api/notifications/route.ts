import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import type { NotificationRecord } from '@/types/notification';
import { z } from 'zod';

const querySchema = z.object({});

interface NotificationsListResponse {
	notifications: NotificationRecord[];
	unreadCount: number;
}

export const GET = withApiValidation<
	z.infer<typeof querySchema>,
	NotificationsListResponse
>(querySchema, async (req, _validatedBody, supabase, user) => {
	try {
		const url = new URL(req.url);
		const rawLimit = url.searchParams.get('limit');
		const rawMapId = url.searchParams.get('mapId');
		const parsedLimit = rawLimit !== null ? parseInt(rawLimit, 10) : 30;
		const limit = Math.min(
			Math.max(Number.isFinite(parsedLimit) ? parsedLimit : 30, 1),
			100
		);
		const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
		const mapIdResult =
			rawMapId === null ? { success: true, data: null } : z.string().uuid().safeParse(rawMapId);

		if (!mapIdResult.success) {
			return respondError('Invalid mapId query parameter', 400);
		}

		const filterMapId = mapIdResult.data;

		let notificationsQuery = supabase
			.from('notifications')
			.select('*')
			.eq('recipient_user_id', user.id)
			.order('created_at', { ascending: false });

		let unreadCountQuery = supabase
			.from('notifications')
			.select('id', { head: true, count: 'exact' })
			.eq('recipient_user_id', user.id)
			.eq('is_read', false);

		if (unreadOnly) {
			notificationsQuery = notificationsQuery.eq('is_read', false);
		}

		if (filterMapId) {
			notificationsQuery = notificationsQuery.eq('map_id', filterMapId);
			unreadCountQuery = unreadCountQuery.eq('map_id', filterMapId);
		}

		notificationsQuery = notificationsQuery.limit(limit);

		const [
			{ data: notifications, error: notificationsError },
			{ count, error: countError },
		] = await Promise.all([notificationsQuery, unreadCountQuery]);

		if (notificationsError || countError) {
			console.error('[notifications] failed to fetch notifications', {
				notificationsError,
				countError,
			});
			return respondError('Failed to fetch notifications', 500);
		}

		return respondSuccess(
			{
				notifications: (notifications ?? []) as NotificationRecord[],
				unreadCount: count ?? 0,
			},
			200,
			'Notifications fetched'
		);
	} catch (error) {
		console.error('[notifications] GET failed', error);
		return respondError('Failed to fetch notifications', 500);
	}
});
