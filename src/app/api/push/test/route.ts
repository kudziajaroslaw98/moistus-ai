import { respondError, respondSuccess } from '@/helpers/api/responses';
import { createServiceRoleClient } from '@/helpers/supabase/server';
import { sendWebPushNotification } from '@/lib/push/web-push';
import { createClient } from '@/helpers/supabase/server';

export async function POST() {
	try {
		const supabase = await createClient();
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();
		if (authError || !user) {
			return respondError('Not authenticated', 401, 'Not authenticated');
		}

		const admin = createServiceRoleClient();
		const { data: subscriptions, error: subscriptionsError } = await admin
			.from('push_subscriptions')
			.select('*')
			.eq('user_id', user.id);

		if (subscriptionsError) {
			return respondError(
				'Failed to load push subscriptions',
				500,
				subscriptionsError.message
			);
		}

		if (!subscriptions || subscriptions.length === 0) {
			return respondError(
				'No push subscriptions found',
				404,
				'No push subscriptions found'
			);
		}

		const delivered = await Promise.all(
			subscriptions.map((subscription) =>
				sendWebPushNotification({
					subscription: {
						endpoint: subscription.endpoint,
						keys: {
							p256dh: subscription.p256dh,
							auth: subscription.auth,
						},
						expirationTime: subscription.expiration_time
							? new Date(subscription.expiration_time).getTime()
							: null,
					},
					payload: {
						title: 'Shiko test notification',
						body: 'Push notifications are enabled and working.',
						navigate: '/dashboard',
						tag: 'shiko-push-test',
					},
				})
			)
		);

		return respondSuccess(
			{
				attempted: subscriptions.length,
				delivered: delivered.filter(Boolean).length,
			},
			200,
			'Push test complete'
		);
	} catch (error) {
		console.error('[push/test] failed', error);
		return respondError('Failed to send test push', 500, 'Internal server error');
	}
}

