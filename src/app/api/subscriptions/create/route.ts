import { createClient } from '@/helpers/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
	apiVersion: '2025-06-30.basil',
});

export async function POST(req: NextRequest) {
	try {
		const { planId, priceId, paymentMethodId } = await req.json();

		if (!planId || !priceId || !paymentMethodId) {
			return NextResponse.json(
				{ error: 'Missing required fields' },
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

		// Check if user already has a subscription
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

		// Get or create Stripe customer
		let customerId: string;

		// Check if user already has a Stripe customer ID
		const { data: existingCustomer } = await supabase
			.from('user_subscriptions')
			.select('stripe_customer_id')
			.eq('user_id', user.id)
			.not('stripe_customer_id', 'is', null)
			.limit(1)
			.single();

		if (existingCustomer?.stripe_customer_id) {
			customerId = existingCustomer.stripe_customer_id;
		} else {
			// Create new Stripe customer
			const customer = await stripe.customers.create({
				email: user.email,
				metadata: {
					user_id: user.id,
				},
			});
			customerId = customer.id;
		}

		// Attach payment method to customer
		await stripe.paymentMethods.attach(paymentMethodId, {
			customer: customerId,
		});

		// Set as default payment method
		await stripe.customers.update(customerId, {
			invoice_settings: {
				default_payment_method: paymentMethodId,
			},
		});

		// Create subscription
		const subscription = await stripe.subscriptions.create({
			customer: customerId,
			items: [{ price: priceId }],
			payment_settings: {
				payment_method_types: ['card'],
				save_default_payment_method: 'on_subscription',
			},
			expand: ['latest_invoice.payment_intent'],
		});

		// Save subscription to database
		const { error: dbError } = await supabase
			.from('user_subscriptions')
			.insert({
				user_id: user.id,
				plan_id: planId,
				stripe_subscription_id: subscription.id,
				stripe_customer_id: customerId,
				status: subscription.status,
				current_period_start: new Date(
					subscription.current_period_start * 1000
				).toISOString(),
				current_period_end: new Date(
					subscription.current_period_end * 1000
				).toISOString(),
				cancel_at_period_end: subscription.cancel_at_period_end,
				metadata: {
					stripe_price_id: priceId,
				},
			});

		if (dbError) {
			// Cancel the Stripe subscription if database save fails
			await stripe.subscriptions.cancel(subscription.id);
			throw new Error('Failed to save subscription to database');
		}

		const latestInvoice = subscription.latest_invoice as Stripe.Invoice;
		const paymentIntent = latestInvoice.payment_intent as Stripe.PaymentIntent;

		return NextResponse.json({
			subscriptionId: subscription.id,
			clientSecret: paymentIntent.client_secret,
			status: subscription.status,
		});
	} catch (error) {
		console.error('Subscription creation error:', error);
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: 'Failed to create subscription',
			},
			{ status: 500 }
		);
	}
}
