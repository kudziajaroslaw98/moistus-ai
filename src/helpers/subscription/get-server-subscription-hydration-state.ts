import type {
	SubscriptionHydrationState,
	UserSubscriptionRecord,
} from '@/helpers/subscription/subscription-hydration';
import { serializeUserSubscription } from '@/helpers/subscription/subscription-hydration';
import { createClient } from '@/helpers/supabase/server';

export async function getServerSubscriptionHydrationState(
	userId: string
): Promise<SubscriptionHydrationState> {
	const supabase = await createClient();

	try {
		const { data, error } = await supabase
			.from('user_subscriptions')
			.select(
				`
					*,
					plan:subscription_plans (*)
				`
			)
			.eq('user_id', userId)
			.in('status', ['active', 'trialing'])
			.order('created_at', { ascending: false })
			.limit(1)
			.maybeSingle();

		if (error) {
			console.error(
				'[subscription-hydration] Failed to fetch server subscription snapshot:',
				error
			);

			return {
				currentSubscription: null,
				hasResolvedSubscription: false,
			};
		}

		return {
			currentSubscription: data
				? serializeUserSubscription(data as UserSubscriptionRecord)
				: null,
			hasResolvedSubscription: true,
		};
	} catch (error) {
		console.error(
			'[subscription-hydration] Unexpected server subscription snapshot error:',
			error
		);

		return {
			currentSubscription: null,
			hasResolvedSubscription: false,
		};
	}
}
