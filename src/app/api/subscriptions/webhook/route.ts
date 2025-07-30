import { createClient } from '@/helpers/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
	apiVersion: '2025-06-30.basil',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
	const supabase = await createClient();

	// Find the user by Stripe customer ID
	const { data: userSubscription } = await supabase
		.from('user_subscriptions')
		.select('*')
		.eq('stripe_subscription_id', subscription.id)
		.single();

	if (!userSubscription) {
		console.error('Subscription not found in database:', subscription.id);
		return;
	}

	const currentPeriodStart = subscription.items.data[0].current_period_start;
	const currentPeriodEnd = subscription.items.data[0].current_period_end;

	// Update subscription status
	const { error } = await supabase
		.from('user_subscriptions')
		.update({
			status: subscription.status,
			current_period_start: new Date(currentPeriodStart).toISOString(),
			current_period_end: new Date(currentPeriodEnd).toISOString(),
			cancel_at_period_end: subscription.cancel_at_period_end,
			canceled_at: subscription.canceled_at
				? new Date(subscription.canceled_at).toISOString()
				: null,
			updated_at: new Date().toISOString(),
		})
		.eq('stripe_subscription_id', subscription.id);

	if (error) {
		console.error('Error updating subscription:', error);
	}
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
	const supabase = await createClient();

	// Update subscription status to canceled
	const { error } = await supabase
		.from('user_subscriptions')
		.update({
			status: 'canceled',
			canceled_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		})
		.eq('stripe_subscription_id', subscription.id);

	if (error) {
		console.error('Error canceling subscription:', error);
	}
}

async function handlePaymentSuccess(invoice: Stripe.Invoice) {
	const supabase = await createClient();

	// Find the user subscription
	const { data: userSubscription } = await supabase
		.from('user_subscriptions')
		.select('*')
		.eq('stripe_subscription_id', invoice.subscription)
		.single();

	if (!userSubscription) {
		console.error('Subscription not found for invoice:', invoice.id);
		return;
	}

	// Record payment in history
	const { error } = await supabase.from('payment_history').insert({
		user_id: userSubscription.user_id,
		subscription_id: userSubscription.id,
		stripe_payment_intent_id: invoice.payment_intent as string,
		amount: invoice.amount_paid / 100, // Convert from cents
		currency: invoice.currency.toUpperCase(),
		status: 'succeeded',
		description: `Payment for ${invoice.period_start ? new Date(invoice.period_start * 1000).toLocaleDateString() : 'subscription'}`,
		metadata: {
			stripe_invoice_id: invoice.id,
			stripe_subscription_id: invoice.subscription,
		},
	});

	if (error) {
		console.error('Error recording payment:', error);
	}
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
	const supabase = await createClient();

	// Find the user subscription
	const { data: userSubscription } = await supabase
		.from('user_subscriptions')
		.select('*')
		.eq('stripe_subscription_id', invoice.subscription)
		.single();

	if (!userSubscription) {
		console.error('Subscription not found for failed invoice:', invoice.id);
		return;
	}

	// Record failed payment
	const { error } = await supabase.from('payment_history').insert({
		user_id: userSubscription.user_id,
		subscription_id: userSubscription.id,
		stripe_payment_intent_id: invoice.payment_intent as string,
		amount: invoice.amount_due / 100,
		currency: invoice.currency.toUpperCase(),
		status: 'failed',
		description: 'Payment failed',
		metadata: {
			stripe_invoice_id: invoice.id,
			stripe_subscription_id: invoice.subscription,
			failure_reason: invoice.last_finalization_error?.message,
		},
	});

	if (error) {
		console.error('Error recording failed payment:', error);
	}
}

export async function POST(req: NextRequest) {
	const body = await req.text();
	const sig = req.headers.get('stripe-signature')!;

	let event: Stripe.Event;

	try {
		event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
	} catch (err) {
		console.error('Webhook signature verification failed:', err);
		return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
	}

	try {
		switch (event.type) {
			case 'customer.subscription.created':
			case 'customer.subscription.updated':
				await handleSubscriptionChange(
					event.data.object as Stripe.Subscription
				);
				break;

			case 'customer.subscription.deleted':
				await handleSubscriptionDeleted(
					event.data.object as Stripe.Subscription
				);
				break;

			case 'invoice.payment_succeeded':
				await handlePaymentSuccess(event.data.object as Stripe.Invoice);
				break;

			case 'invoice.payment_failed':
				await handlePaymentFailed(event.data.object as Stripe.Invoice);
				break;

			default:
				console.log(`Unhandled event type: ${event.type}`);
		}

		return NextResponse.json({ received: true });
	} catch (error) {
		console.error('Webhook handler error:', error);
		return NextResponse.json(
			{ error: 'Webhook handler error' },
			{ status: 500 }
		);
	}
}
