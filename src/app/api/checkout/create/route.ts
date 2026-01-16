import { createPolarClient, getAppUrl, getProductId } from '@/lib/polar';
import { createClient } from '@/helpers/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		console.log('[Checkout] Request body:', body);

		const { planId, billingInterval } = body as {
			planId: string;
			billingInterval: 'monthly' | 'yearly';
		};

		if (!planId || !billingInterval) {
			console.log('[Checkout] Missing fields:', { planId, billingInterval });
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
			.in('status', ['active', 'trialing'])
			.single();

		if (existingSubscription) {
			return NextResponse.json(
				{ error: 'User already has an active subscription' },
				{ status: 400 }
			);
		}

		const polar = createPolarClient();
		const productId = getProductId(billingInterval);
		const appUrl = getAppUrl();

		// Create Polar checkout session
		// Polar handles customer creation, tax calculation, and payment as MoR
		console.log('[Checkout] Creating Polar session with:', {
			productId,
			appUrl,
			userEmail: user.email,
		});

		const checkout = await polar.checkouts.create({
			products: [productId],
			successUrl: `${appUrl}/dashboard?checkout=success`,
			customerEmail: user.email || undefined,
			customerName:
				user.user_metadata?.full_name || user.email?.split('@')[0] || undefined,
			metadata: {
				user_id: user.id,
				plan_id: planId,
				billing_interval: billingInterval,
			},
		});

		console.log('[Checkout] Session created:', {
			sessionId: checkout.id,
			checkoutUrl: checkout.url,
		});

		return NextResponse.json({
			checkoutUrl: checkout.url,
			sessionId: checkout.id,
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
