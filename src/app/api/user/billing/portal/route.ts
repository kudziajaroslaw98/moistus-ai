import { createClient } from '@/helpers/supabase/server';
import { CustomerPortal } from '@polar-sh/nextjs';

/**
 * Customer billing portal using @polar-sh/nextjs adapter.
 * Automatically redirects to Polar's customer portal.
 * @see https://polar.sh/docs/integrate/sdk/adapters/nextjs
 */
export const GET = CustomerPortal({
	accessToken: process.env.POLAR_ACCESS_TOKEN!,
	server: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',

	getCustomerId: async () => {
		const supabase = await createClient();

		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError) {
			throw new Error(`Authentication failed: ${authError.message}`);
		}

		if (!user) {
			throw new Error('Unauthorized: No authenticated user found');
		}

		// Get user's Polar customer ID from their subscription
		const { data: subscription, error: subscriptionError } = await supabase
			.from('user_subscriptions')
			.select('polar_customer_id')
			.eq('user_id', user.id)
			.not('polar_customer_id', 'is', null)
			.order('created_at', { ascending: false })
			.limit(1)
			.single();

		if (subscriptionError && subscriptionError.code !== 'PGRST116') {
			throw new Error(`Failed to fetch subscription: ${subscriptionError.message}`);
		}

		if (!subscription?.polar_customer_id) {
			throw new Error('No billing account found. Subscribe to a plan first.');
		}

		return subscription.polar_customer_id;
	},
});
