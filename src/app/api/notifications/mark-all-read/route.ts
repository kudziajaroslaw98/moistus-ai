import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import { z } from 'zod';

const markAllReadSchema = z.object({
	mapId: z.string().uuid().optional(),
});

interface MarkAllReadResponse {
	updatedCount: number;
}

export const POST = withApiValidation<
	z.infer<typeof markAllReadSchema>,
	MarkAllReadResponse
>(markAllReadSchema, async (_req, validatedBody, supabase, user) => {
	try {
		let query = supabase
			.from('notifications')
			.update({
				is_read: true,
				read_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			})
			.eq('recipient_user_id', user.id)
			.eq('is_read', false);

		if (validatedBody.mapId) {
			query = query.eq('map_id', validatedBody.mapId);
		}

		const { data, error } = await query.select('id');

		if (error) {
			console.error('[notifications] mark-all-read failed', error);
			return respondError('Failed to mark notifications as read', 500);
		}

		return respondSuccess(
			{
				updatedCount: data?.length ?? 0,
			},
			200,
			'Notifications marked as read'
		);
	} catch (error) {
		console.error('[notifications] mark-all-read route failed', error);
		return respondError('Failed to mark notifications as read', 500);
	}
});
