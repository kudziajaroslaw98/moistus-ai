import { createClient } from '@/helpers/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
	apiVersion: '2025-07-30.basil',
});

export async function POST(
	req: NextRequest,
	context: { params: Promise<{ id: string }> }
) {
	const params = await context.params;
	const supabase = await createClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	// IDOR Protection
	const { data: subscription, error } = await supabase
		.from('user_subscriptions')
		.select('*')
		.eq('id', params.id)
		.eq('user_id', user.id)
		.single();

	if (error || !subscription) {
		return NextResponse.json(
			{ error: 'Subscription not found' },
			{ status: 404 }
		);
	}

	// Remove cancel flag
	await stripe.subscriptions.update(subscription.stripe_subscription_id, {
		cancel_at_period_end: false,
	});

	// Update database
	await supabase
		.from('user_subscriptions')
		.update({
			cancel_at_period_end: false,
			canceled_at: null,
			updated_at: new Date().toISOString(),
		})
		.eq('id', params.id);

	return NextResponse.json({ success: true });
}
