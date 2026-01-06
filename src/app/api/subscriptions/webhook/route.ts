import { createServiceRoleClient } from '@/helpers/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
	apiVersion: '2025-12-15.clover',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Extend Invoice type to include webhook-specific properties
interface WebhookInvoice extends Stripe.Invoice {
	subscription: string | Stripe.Subscription | null;
	payment_intent: string | Stripe.PaymentIntent | null;
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
	const supabase = createServiceRoleClient();

	// Find the user by Stripe customer ID
	const { data: userSubscription, error: queryError } = await supabase
		.from('user_subscriptions')
		.select('*')
		.eq('stripe_subscription_id', subscription.id)
		.single();

	if (queryError) {
		console.error('Error querying subscription:', subscription.id, queryError);
		return;
	}

	if (!userSubscription) {
		console.error('Subscription not found in database:', subscription.id);
		return;
	}

	// Defensive guards: Verify subscription items structure
	if (!subscription.items) {
		console.error('Subscription missing items structure:', subscription.id);
		return;
	}

	if (
		!Array.isArray(subscription.items.data) ||
		subscription.items.data.length === 0
	) {
		console.error(
			'Subscription items.data is empty or not an array:',
			subscription.id,
			subscription.items
		);
		return;
	}

	const firstItem = subscription.items.data[0];
	if (!firstItem) {
		console.error('Subscription first item is undefined:', subscription.id);
		return;
	}

	// Verify required period fields
	if (
		typeof firstItem.current_period_start !== 'number' ||
		typeof firstItem.current_period_end !== 'number'
	) {
		console.error(
			'Subscription item missing required period fields:',
			subscription.id,
			firstItem
		);
		return;
	}

	// Optional: Verify price structure if needed
	if (firstItem.price) {
		const price = firstItem.price;
		if (!price.product) {
			console.warn(
				'Subscription price missing product:',
				subscription.id,
				price
			);
		}
		if (price.recurring && !price.recurring.interval) {
			console.warn(
				'Subscription recurring price missing interval:',
				subscription.id,
				price
			);
		}
		if (typeof price.unit_amount !== 'number') {
			console.warn(
				'Subscription price missing or invalid unit_amount:',
				subscription.id,
				price
			);
		}
		if (!price.currency) {
			console.warn(
				'Subscription price missing currency:',
				subscription.id,
				price
			);
		}
	}

	const currentPeriodStart = firstItem.current_period_start * 1000;
	const currentPeriodEnd = firstItem.current_period_end * 1000;

	// Update subscription status
	const { error } = await supabase
		.from('user_subscriptions')
		.update({
			status: subscription.status,
			current_period_start: new Date(currentPeriodStart).toISOString(),
			current_period_end: new Date(currentPeriodEnd).toISOString(),
			cancel_at_period_end: subscription.cancel_at_period_end,
			canceled_at: subscription.canceled_at
				? new Date(subscription.canceled_at * 1000).toISOString()
				: null,
			updated_at: new Date().toISOString(),
		})
		.eq('stripe_subscription_id', subscription.id);

	if (error) {
		console.error('Error updating subscription:', error);
	}
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
	const supabase = createServiceRoleClient();

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

async function handlePaymentSuccess(invoice: WebhookInvoice) {
	const supabase = createServiceRoleClient();

	// Extract subscription ID (can be string or expanded object)
	const subscriptionId =
		typeof invoice.subscription === 'string'
			? invoice.subscription
			: invoice.subscription?.id;

	// If no subscription on invoice, try to find by customer
	let userSubscription;
	let queryError;

	if (subscriptionId) {
		console.log(
			`Processing payment for invoice ${invoice.id}, subscription: ${subscriptionId}`
		);

		// Find the user subscription by subscription ID
		const result = await supabase
			.from('user_subscriptions')
			.select('*')
			.eq('stripe_subscription_id', subscriptionId)
			.single();

		userSubscription = result.data;
		queryError = result.error;
	} else {
		console.log(
			`Invoice ${invoice.id} has no subscription, looking up by customer: ${invoice.customer}`
		);

		// Fallback: find by customer ID
		const customerId =
			typeof invoice.customer === 'string'
				? invoice.customer
				: invoice.customer?.id;

		if (customerId) {
			const result = await supabase
				.from('user_subscriptions')
				.select('*')
				.eq('stripe_customer_id', customerId)
				.order('created_at', { ascending: false })
				.limit(1)
				.single();

			userSubscription = result.data;
			queryError = result.error;
		}
	}

	if (queryError) {
		console.error('Query error looking up subscription:', queryError);
		return;
	}

	if (!userSubscription) {
		console.error(
			`No subscription found in DB for invoice ${invoice.id} (subscription: ${subscriptionId}, customer: ${invoice.customer})`
		);
		return;
	}

	console.log(
		`Found subscription ${userSubscription.stripe_subscription_id} for user ${userSubscription.user_id}`
	);

	// Extract payment intent ID (can be string or expanded object)
	const paymentIntentId =
		typeof invoice.payment_intent === 'string'
			? invoice.payment_intent
			: invoice.payment_intent?.id;

	// Record payment in history
	const { error } = await supabase.from('payment_history').insert({
		user_id: userSubscription.user_id,
		subscription_id: userSubscription.id,
		stripe_payment_intent_id: paymentIntentId as string,
		amount: invoice.amount_paid / 100, // Convert from cents
		currency: invoice.currency.toUpperCase(),
		status: 'succeeded',
		description: `Payment for ${invoice.period_start ? new Date(invoice.period_start * 1000).toLocaleDateString() : 'subscription'}`,
		metadata: {
			stripe_invoice_id: invoice.id,
			stripe_subscription_id: subscriptionId,
		},
	});

	if (error) {
		console.error('Error recording payment:', error);
	}
}

async function handlePaymentFailed(invoice: WebhookInvoice) {
	const supabase = createServiceRoleClient();

	// Extract subscription ID (can be string or expanded object)
	const subscriptionId =
		typeof invoice.subscription === 'string'
			? invoice.subscription
			: invoice.subscription?.id;

	// If no subscription on invoice, try to find by customer
	let userSubscription;
	let queryError;

	if (subscriptionId) {
		const result = await supabase
			.from('user_subscriptions')
			.select('*')
			.eq('stripe_subscription_id', subscriptionId)
			.single();

		userSubscription = result.data;
		queryError = result.error;
	} else {
		// Fallback: find by customer ID
		const customerId =
			typeof invoice.customer === 'string'
				? invoice.customer
				: invoice.customer?.id;

		if (customerId) {
			const result = await supabase
				.from('user_subscriptions')
				.select('*')
				.eq('stripe_customer_id', customerId)
				.order('created_at', { ascending: false })
				.limit(1)
				.single();

			userSubscription = result.data;
			queryError = result.error;
		}
	}

	if (queryError || !userSubscription) {
		console.error('Subscription not found for failed invoice:', invoice.id);
		return;
	}

	// Extract payment intent ID (can be string or expanded object)
	const paymentIntentId =
		typeof invoice.payment_intent === 'string'
			? invoice.payment_intent
			: invoice.payment_intent?.id;

	// Record failed payment
	const { error } = await supabase.from('payment_history').insert({
		user_id: userSubscription.user_id,
		subscription_id: userSubscription.id,
		stripe_payment_intent_id: paymentIntentId as string,
		amount: invoice.amount_due / 100,
		currency: invoice.currency.toUpperCase(),
		status: 'failed',
		description: 'Payment failed',
		metadata: {
			stripe_invoice_id: invoice.id,
			stripe_subscription_id: subscriptionId,
			failure_reason: invoice.last_finalization_error?.message,
		},
	});

	if (error) {
		console.error('Error recording failed payment:', error);
	}
}

async function handleTrialEnding(subscription: Stripe.Subscription) {
	const supabase = createServiceRoleClient();

	const { data: userSub } = await supabase
		.from('user_subscriptions')
		.select('user_id, trial_end')
		.eq('stripe_subscription_id', subscription.id)
		.single();

	if (userSub) {
		// TODO: Send email notification
		// TODO: Create in-app notification
		console.log(`Trial ending soon for user: ${userSub.user_id}`);
		// You can add email/notification logic here
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
				await handlePaymentSuccess(event.data.object as WebhookInvoice);
				break;

			case 'invoice.payment_failed':
				await handlePaymentFailed(event.data.object as WebhookInvoice);
				break;

			case 'customer.subscription.trial_will_end':
				// 3 days before trial ends
				await handleTrialEnding(event.data.object as Stripe.Subscription);
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
