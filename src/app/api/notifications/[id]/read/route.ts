import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import { z } from 'zod';

const markReadSchema = z.object({
	read: z.boolean().default(true),
});

interface MarkReadResponse {
	id: string;
	is_read: boolean;
	read_at: string | null;
}

export const PATCH = withApiValidation<
	z.infer<typeof markReadSchema>,
	MarkReadResponse,
	{ id: string }
>(markReadSchema, async (_req, validatedBody, supabase, user, params) => {
	try {
		const notificationId = params?.id;
		if (!notificationId) {
			return respondError('Notification ID is required', 400);
		}

		const now = new Date().toISOString();
		const { data, error } = await supabase
			.from('notifications')
			.update({
				is_read: validatedBody.read,
				read_at: validatedBody.read ? now : null,
				updated_at: now,
			})
			.eq('id', notificationId)
			.eq('recipient_user_id', user.id)
			.select('id, is_read, read_at')
			.maybeSingle();

		if (error) {
			console.error('[notifications] mark-read failed', error);
			return respondError('Failed to update notification', 500);
		}

		if (!data) {
			return respondError('Notification not found', 404);
		}

		return respondSuccess(
			{
				id: data.id,
				is_read: data.is_read,
				read_at: data.read_at,
			},
			200,
			'Notification updated'
		);
	} catch (error) {
		console.error('[notifications] mark-read route failed', error);
		return respondError('Failed to update notification', 500);
	}
});
