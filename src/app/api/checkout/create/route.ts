import { getCheckoutErrorResponse } from '@/helpers/subscription/checkout-error';
import { PRO_PLAN_ID } from '@/helpers/subscription/checkout-intent';
import { createClient } from '@/helpers/supabase/server';
import { createPolarClient, getAppUrl, getProductId } from '@/lib/polar';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const CheckoutSchema = z.object({
	planId: z.literal(PRO_PLAN_ID, {
		error: 'Only the Pro plan can be purchased through checkout',
	}),
	billingInterval: z.enum(['monthly', 'yearly'], {
		error: 'Billing interval must be "monthly" or "yearly"',
	}),
});

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		console.log('[Checkout] Request body:', body);

		const parseResult = CheckoutSchema.safeParse(body);
		if (!parseResult.success) {
			const errorMessage = parseResult.error.issues
				.map((issue) => issue.message)
				.join(', ');
			console.log('[Checkout] Validation failed:', errorMessage);
			return NextResponse.json({ error: errorMessage }, { status: 400 });
		}

		const { planId, billingInterval } = parseResult.data;

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
			userId: user.id,
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
		const checkoutError = getCheckoutErrorResponse(error);
		console.error('Checkout creation error:', {
			name: error instanceof Error ? error.name : 'UnknownError',
			status: checkoutError.status,
		});

		return NextResponse.json(
			{ error: checkoutError.error },
			{ status: checkoutError.status }
		);
	}
}
