import { createClient } from '@/helpers/supabase/server';
import { createDodoClient, getProductId, getAppUrl } from '@/helpers/dodo/client';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
	try {
		const { planId, billingInterval } = (await req.json()) as {
			planId: string;
			billingInterval: 'monthly' | 'yearly';
		};

		if (!planId || !billingInterval) {
			return NextResponse.json(
				{ error: 'Missing required fields: planId, billingInterval' },
				{ status: 400 }
			);
		}

		const supabase = await createClient();

		// Get the current user
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Check if user already has an active subscription
		const { data: existingSubscription } = await supabase
			.from('user_subscriptions')
			.select('*')
			.eq('user_id', user.id)
			.in('status', ['active', 'trialing', 'on_hold'])
			.single();

		if (existingSubscription) {
			return NextResponse.json(
				{ error: 'User already has an active subscription' },
				{ status: 400 }
			);
		}

		const dodo = createDodoClient();
		const productId = getProductId(billingInterval);
		const appUrl = getAppUrl();

		// Create checkout session
		// Dodo handles customer creation, tax calculation, and payment
		const session = await dodo.checkoutSessions.create({
			product_cart: [
				{
					product_id: productId,
					quantity: 1,
				},
			],
			customer: {
				email: user.email || '',
				name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
			},
			// Metadata to link checkout to our user
			metadata: {
				user_id: user.id,
				plan_id: planId,
				billing_interval: billingInterval,
			},
			return_url: `${appUrl}/dashboard?checkout=success`,
		});

		return NextResponse.json({
			checkoutUrl: session.checkout_url,
			sessionId: session.session_id,
		});
	} catch (error) {
		console.error('Checkout creation error:', error);
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: 'Failed to create checkout session',
			},
			{ status: 500 }
		);
	}
}
