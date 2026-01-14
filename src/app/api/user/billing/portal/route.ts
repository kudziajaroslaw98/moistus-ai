import { createClient } from '@/helpers/supabase/server';
import { createDodoClient } from '@/helpers/dodo/client';
import { NextResponse } from 'next/server';

export async function POST() {
	try {
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Get user's Dodo customer ID from their subscription
		const { data: subscription, error } = await supabase
			.from('user_subscriptions')
			.select('dodo_customer_id')
			.eq('user_id', user.id)
			.not('dodo_customer_id', 'is', null)
			.order('created_at', { ascending: false })
			.limit(1)
			.single();

		if (error || !subscription?.dodo_customer_id) {
			return NextResponse.json(
				{ error: 'No billing account found. Subscribe to a plan first.' },
				{ status: 404 }
			);
		}

		const dodo = createDodoClient();

		// Create customer portal session
		// Note: Return URL is configured in Dodo dashboard, not via API
		const portal = await dodo.customers.customerPortal.create(
			subscription.dodo_customer_id
		);

		return NextResponse.json({ url: portal.link });
	} catch (error) {
		console.error('Portal session error:', error);
		return NextResponse.json(
			{ error: 'Failed to create portal session' },
			{ status: 500 }
		);
	}
}
