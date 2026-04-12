import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import { z } from 'zod';

const subscribeSchema = z.object({
	subscription: z.object({
		endpoint: z.string().url(),
		expirationTime: z.number().nullable().optional(),
		keys: z.object({
			p256dh: z.string().min(1),
			auth: z.string().min(1),
		}),
	}),
});

export const POST = withApiValidation<
	z.infer<typeof subscribeSchema>,
	{ subscriptionId: string }
>(subscribeSchema, async (request, body, supabase, user) => {
	const userAgent = request.headers.get('user-agent');

	const { data, error } = await supabase
		.from('push_subscriptions')
		.upsert(
			{
				user_id: user.id,
				endpoint: body.subscription.endpoint,
				p256dh: body.subscription.keys.p256dh,
				auth: body.subscription.keys.auth,
				content_encoding: 'aes128gcm',
				user_agent: userAgent,
				expiration_time: body.subscription.expirationTime
					? new Date(body.subscription.expirationTime).toISOString()
					: null,
				last_used_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			},
			{
				onConflict: 'user_id,endpoint',
			}
		)
		.select('id')
		.single();

	if (error || !data) {
		console.error('[push/subscribe] failed to upsert subscription', error);
		return respondError('Failed to register push subscription', 500, error?.message);
	}

	return respondSuccess(
		{
			subscriptionId: data.id,
		},
		200,
		'Push subscription registered'
	);
});

const unsubscribeSchema = z.object({
	endpoint: z.string().url(),
});

export const DELETE = withApiValidation<
	z.infer<typeof unsubscribeSchema>,
	{ removed: boolean }
>(unsubscribeSchema, async (_request, body, supabase, user) => {
	const { error } = await supabase
		.from('push_subscriptions')
		.delete()
		.eq('user_id', user.id)
		.eq('endpoint', body.endpoint);

	if (error) {
		console.error('[push/subscribe] failed to delete subscription', error);
		return respondError('Failed to unregister push subscription', 500, error.message);
	}

	return respondSuccess(
		{
			removed: true,
		},
		200,
		'Push subscription removed'
	);
});

