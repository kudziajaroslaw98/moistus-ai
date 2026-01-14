import { createServiceRoleClient } from '@/helpers/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import DodoPayments from 'dodopayments';

/**
 * Dodo webhook payload types.
 */
interface DodoCustomer {
	customer_id: string;
	email: string;
	name: string;
}

interface DodoSubscriptionData {
	payload_type: 'Subscription';
	subscription_id: string;
	customer: DodoCustomer;
	product_id: string;
	status: string;
	recurring_pre_tax_amount: number;
	payment_frequency_interval: 'Day' | 'Week' | 'Month' | 'Year';
	created_at: string;
	next_billing_date: string;
	cancelled_at?: string | null;
	currency: string;
	metadata?: Record<string, string>;
}

interface DodoPaymentData {
	payload_type: 'Payment';
	payment_id: string;
	customer: DodoCustomer;
	product_id: string;
	amount: number;
	currency: string;
	status: string;
	created_at: string;
	subscription_id?: string;
	metadata?: Record<string, string>;
}

interface DodoWebhookPayload {
	business_id: string;
	type: string;
	timestamp: string;
	data: DodoSubscriptionData | DodoPaymentData;
}

/**
 * Maps Dodo billing interval to our internal format.
 */
function mapBillingInterval(
	interval: string
): 'monthly' | 'yearly' | 'weekly' | 'daily' {
	switch (interval.toLowerCase()) {
		case 'month':
			return 'monthly';
		case 'year':
			return 'yearly';
		case 'week':
			return 'weekly';
		case 'day':
			return 'daily';
		default:
			return 'monthly';
	}
}

/**
 * Handles subscription activation (new subscription or trial conversion).
 */
async function handleSubscriptionActive(payload: DodoWebhookPayload) {
	const supabase = createServiceRoleClient();
	const data = payload.data as DodoSubscriptionData;

	console.log('Processing subscription.active:', data.subscription_id);

	// Get user_id from metadata (set during checkout)
	const userId = data.metadata?.user_id;

	if (!userId) {
		console.error(
			'No user_id in metadata for subscription:',
			data.subscription_id
		);
		return;
	}

	// Calculate period dates
	const createdAt = new Date(data.created_at);
	const nextBilling = new Date(data.next_billing_date);

	// Upsert subscription record
	const { error } = await supabase.from('user_subscriptions').upsert(
		{
			user_id: userId,
			plan_id: data.metadata?.plan_id || 'pro',
			dodo_subscription_id: data.subscription_id,
			dodo_customer_id: data.customer.customer_id,
			status: 'active',
			current_period_start: createdAt.toISOString(),
			current_period_end: nextBilling.toISOString(),
			cancel_at_period_end: false,
			metadata: {
				dodo_product_id: data.product_id,
				billing_interval: mapBillingInterval(
					data.payment_frequency_interval
				),
				amount: data.recurring_pre_tax_amount,
				currency: data.currency,
			},
			updated_at: new Date().toISOString(),
		},
		{
			onConflict: 'dodo_subscription_id',
		}
	);

	if (error) {
		console.error('Error upserting subscription:', error);
	} else {
		console.log('Subscription activated:', data.subscription_id);
	}
}

/**
 * Handles subscription updates (plan changes, etc.).
 */
async function handleSubscriptionUpdated(payload: DodoWebhookPayload) {
	const supabase = createServiceRoleClient();
	const data = payload.data as DodoSubscriptionData;

	console.log('Processing subscription.updated:', data.subscription_id);

	const nextBilling = new Date(data.next_billing_date);

	const { error } = await supabase
		.from('user_subscriptions')
		.update({
			status: data.status === 'active' ? 'active' : data.status,
			current_period_end: nextBilling.toISOString(),
			cancel_at_period_end: false,
			updated_at: new Date().toISOString(),
		})
		.eq('dodo_subscription_id', data.subscription_id);

	if (error) {
		console.error('Error updating subscription:', error);
	}
}

/**
 * Handles subscription renewal.
 */
async function handleSubscriptionRenewed(payload: DodoWebhookPayload) {
	const supabase = createServiceRoleClient();
	const data = payload.data as DodoSubscriptionData;

	console.log('Processing subscription.renewed:', data.subscription_id);

	const currentPeriodStart = new Date();
	const nextBilling = new Date(data.next_billing_date);

	const { error } = await supabase
		.from('user_subscriptions')
		.update({
			status: 'active',
			current_period_start: currentPeriodStart.toISOString(),
			current_period_end: nextBilling.toISOString(),
			cancel_at_period_end: false,
			updated_at: new Date().toISOString(),
		})
		.eq('dodo_subscription_id', data.subscription_id);

	if (error) {
		console.error('Error updating renewed subscription:', error);
	}
}

/**
 * Handles subscription cancellation.
 */
async function handleSubscriptionCancelled(payload: DodoWebhookPayload) {
	const supabase = createServiceRoleClient();
	const data = payload.data as DodoSubscriptionData;

	console.log('Processing subscription.cancelled:', data.subscription_id);

	const { error } = await supabase
		.from('user_subscriptions')
		.update({
			status: 'canceled',
			canceled_at: data.cancelled_at
				? new Date(data.cancelled_at).toISOString()
				: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		})
		.eq('dodo_subscription_id', data.subscription_id);

	if (error) {
		console.error('Error cancelling subscription:', error);
	}
}

/**
 * Handles subscription expiration (end of canceled subscription period).
 */
async function handleSubscriptionExpired(payload: DodoWebhookPayload) {
	const supabase = createServiceRoleClient();
	const data = payload.data as DodoSubscriptionData;

	console.log('Processing subscription.expired:', data.subscription_id);

	const { error } = await supabase
		.from('user_subscriptions')
		.update({
			status: 'canceled',
			canceled_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		})
		.eq('dodo_subscription_id', data.subscription_id);

	if (error) {
		console.error('Error expiring subscription:', error);
	}
}

/**
 * Handles subscription payment failure.
 */
async function handleSubscriptionFailed(payload: DodoWebhookPayload) {
	const supabase = createServiceRoleClient();
	const data = payload.data as DodoSubscriptionData;

	console.log('Processing subscription.failed:', data.subscription_id);

	const { error } = await supabase
		.from('user_subscriptions')
		.update({
			status: 'past_due',
			updated_at: new Date().toISOString(),
		})
		.eq('dodo_subscription_id', data.subscription_id);

	if (error) {
		console.error('Error updating failed subscription:', error);
	}
}

/**
 * Handles subscription on hold (payment retry in progress).
 */
async function handleSubscriptionOnHold(payload: DodoWebhookPayload) {
	const supabase = createServiceRoleClient();
	const data = payload.data as DodoSubscriptionData;

	console.log('Processing subscription.on_hold:', data.subscription_id);

	const { error } = await supabase
		.from('user_subscriptions')
		.update({
			status: 'past_due',
			updated_at: new Date().toISOString(),
		})
		.eq('dodo_subscription_id', data.subscription_id);

	if (error) {
		console.error('Error updating on-hold subscription:', error);
	}
}

/**
 * Handles successful payment.
 */
async function handlePaymentSucceeded(payload: DodoWebhookPayload) {
	const supabase = createServiceRoleClient();
	const data = payload.data as DodoPaymentData;

	console.log('Processing payment.succeeded:', data.payment_id);

	// Find subscription by customer or subscription_id
	let userSubscription;

	if (data.subscription_id) {
		const { data: sub } = await supabase
			.from('user_subscriptions')
			.select('*')
			.eq('dodo_subscription_id', data.subscription_id)
			.single();
		userSubscription = sub;
	} else {
		const { data: sub } = await supabase
			.from('user_subscriptions')
			.select('*')
			.eq('dodo_customer_id', data.customer.customer_id)
			.order('created_at', { ascending: false })
			.limit(1)
			.single();
		userSubscription = sub;
	}

	if (!userSubscription) {
		console.error('No subscription found for payment:', data.payment_id);
		return;
	}

	// Record payment in history
	const { error } = await supabase.from('payment_history').insert({
		user_id: userSubscription.user_id,
		subscription_id: userSubscription.id,
		dodo_payment_id: data.payment_id,
		amount: data.amount / 100, // Convert from cents
		currency: data.currency.toUpperCase(),
		status: 'succeeded',
		description: `Payment for subscription`,
		metadata: {
			dodo_subscription_id: data.subscription_id,
			dodo_customer_id: data.customer.customer_id,
		},
	});

	if (error) {
		console.error('Error recording payment:', error);
	}
}

/**
 * Handles failed payment.
 */
async function handlePaymentFailed(payload: DodoWebhookPayload) {
	const supabase = createServiceRoleClient();
	const data = payload.data as DodoPaymentData;

	console.log('Processing payment.failed:', data.payment_id);

	// Find subscription
	let userSubscription;

	if (data.subscription_id) {
		const { data: sub } = await supabase
			.from('user_subscriptions')
			.select('*')
			.eq('dodo_subscription_id', data.subscription_id)
			.single();
		userSubscription = sub;
	}

	if (!userSubscription) {
		console.error(
			'No subscription found for failed payment:',
			data.payment_id
		);
		return;
	}

	// Record failed payment
	const { error } = await supabase.from('payment_history').insert({
		user_id: userSubscription.user_id,
		subscription_id: userSubscription.id,
		dodo_payment_id: data.payment_id,
		amount: data.amount / 100,
		currency: data.currency.toUpperCase(),
		status: 'failed',
		description: 'Payment failed',
		metadata: {
			dodo_subscription_id: data.subscription_id,
			failure_reason: data.status,
		},
	});

	if (error) {
		console.error('Error recording failed payment:', error);
	}
}

/**
 * Verifies and unwraps webhook payload using Dodo SDK.
 * Returns the verified payload or null if verification fails.
 */
function verifyAndUnwrapWebhook(
	rawBody: string,
	headers: Record<string, string>
): DodoWebhookPayload | null {
	const webhookKey = process.env.DODO_PAYMENTS_WEBHOOK_KEY;

	if (!webhookKey) {
		console.error('DODO_PAYMENTS_WEBHOOK_KEY is not configured');
		return null;
	}

	try {
		const client = new DodoPayments({
			bearerToken: process.env.DODO_PAYMENTS_API_KEY!,
		});

		// Use the SDK's unwrap method which verifies and parses
		const event = client.webhooks.unwrap(rawBody, { headers, key: webhookKey });
		return event as unknown as DodoWebhookPayload;
	} catch (error) {
		console.error('Webhook signature verification failed:', error);
		return null;
	}
}

/**
 * Dodo Payments webhook handler.
 * Handles signature verification and event routing.
 */
export async function POST(req: NextRequest) {
	try {
		const rawBody = await req.text();

		// Collect all headers as Record<string, string>
		const headers: Record<string, string> = {};
		req.headers.forEach((value, key) => {
			headers[key] = value;
		});

		// Verify and unwrap the webhook payload
		const payload = verifyAndUnwrapWebhook(rawBody, headers);

		if (!payload) {
			return NextResponse.json(
				{ error: 'Invalid signature' },
				{ status: 401 }
			);
		}

		console.log('Received Dodo webhook:', payload.type);

		// Route to appropriate handler
		switch (payload.type) {
			case 'subscription.active':
				await handleSubscriptionActive(payload);
				break;

			case 'subscription.updated':
				await handleSubscriptionUpdated(payload);
				break;

			case 'subscription.renewed':
				await handleSubscriptionRenewed(payload);
				break;

			case 'subscription.cancelled':
				await handleSubscriptionCancelled(payload);
				break;

			case 'subscription.expired':
				await handleSubscriptionExpired(payload);
				break;

			case 'subscription.failed':
				await handleSubscriptionFailed(payload);
				break;

			case 'subscription.on_hold':
				await handleSubscriptionOnHold(payload);
				break;

			case 'payment.succeeded':
				await handlePaymentSucceeded(payload);
				break;

			case 'payment.failed':
				await handlePaymentFailed(payload);
				break;

			default:
				console.log(`Unhandled event type: ${payload.type}`);
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
