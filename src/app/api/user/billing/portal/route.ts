import { createClient } from '@/helpers/supabase/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
	apiVersion: '2025-10-29.clover',
});

export async function POST() {
	try {
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Get user's Stripe customer ID from their subscription
		const { data: subscription, error } = await supabase
			.from('user_subscriptions')
			.select('stripe_customer_id')
			.eq('user_id', user.id)
			.not('stripe_customer_id', 'is', null)
			.order('created_at', { ascending: false })
			.limit(1)
			.single();

		if (error || !subscription?.stripe_customer_id) {
			return NextResponse.json(
				{ error: 'No billing account found. Subscribe to a plan first.' },
				{ status: 404 }
			);
		}

		// Determine return URL
		const returnUrl =
			process.env.NEXT_PUBLIC_APP_URL ||
			process.env.VERCEL_URL ||
			'http://localhost:3000';

		// Create billing portal session
		const session = await stripe.billingPortal.sessions.create({
			customer: subscription.stripe_customer_id,
			return_url: `${returnUrl}/dashboard?settings=billing`,
		});

		return NextResponse.json({ url: session.url });
	} catch (error) {
		console.error('Portal session error:', error);
		return NextResponse.json(
			{ error: 'Failed to create portal session' },
			{ status: 500 }
		);
	}
}
