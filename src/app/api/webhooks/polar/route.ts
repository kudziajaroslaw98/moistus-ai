import { createServiceRoleClient } from '@/helpers/supabase/server';
import { mapBillingInterval, mapPolarStatus } from '@/lib/polar';
import { Webhooks } from '@polar-sh/nextjs';

/**
 * Polar webhook handler using @polar-sh/nextjs adapter.
 * Automatically handles signature verification and response.
 * @see https://polar.sh/docs/integrate/sdk/adapters/nextjs
 */
export const POST = Webhooks({
	webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,

	onSubscriptionCreated: async (payload) => {
		await handleSubscriptionActive(payload.data);
	},

	onSubscriptionActive: async (payload) => {
		await handleSubscriptionActive(payload.data);
	},

	onSubscriptionUpdated: async (payload) => {
		await handleSubscriptionUpdated(payload.data);
	},

	onSubscriptionCanceled: async (payload) => {
		await handleSubscriptionCanceled(payload.data);
	},

	onSubscriptionUncanceled: async (payload) => {
		await handleSubscriptionUncanceled(payload.data);
	},

	onSubscriptionRevoked: async (payload) => {
		await handleSubscriptionRevoked(payload.data);
	},

	// Note: order.paid and order.refunded events are intentionally not handled
	// Billing history is delegated to Polar's customer portal
});

// ============================================================================
// Event Handlers
// ============================================================================

type SubscriptionData = {
	id: string;
	customerId?: string;
	customer?: { id: string; email: string; name?: string };
	metadata?: Record<string, unknown>;
	status?: string;
	amount?: number;
	currency?: string;
	recurringInterval?: string;
	currentPeriodStart?: string;
	currentPeriodEnd?: string;
	cancelAtPeriodEnd?: boolean;
	canceledAt?: string | null;
	productId?: string;
};

/**
 * Handles subscription creation/activation.
 */
async function handleSubscriptionActive(data: SubscriptionData) {
	const supabase = createServiceRoleClient();

	console.log('[Polar] Processing subscription.active:', data.id);

	// Get user_id from metadata (set during checkout)
	const userId = data.metadata?.user_id as string | undefined;

	if (!userId) {
		// Throw to signal failure - checkout should always include user_id in metadata
		throw new Error(
			`[Polar] No user_id in metadata for subscription: ${data.id}`
		);
	}

	const customerId = data.customerId || data.customer?.id;

	if (!customerId) {
		// Throw to signal failure - Polar webhooks should always include customer ID
		throw new Error(`[Polar] No customer ID for subscription: ${data.id}`);
	}

	// Calculate period dates with proper fallback
	const currentPeriodStart = data.currentPeriodStart
		? new Date(data.currentPeriodStart)
		: new Date();

	// If no end date provided, calculate based on billing interval (default monthly)
	let currentPeriodEnd: Date;
	if (data.currentPeriodEnd) {
		currentPeriodEnd = new Date(data.currentPeriodEnd);
	} else {
		currentPeriodEnd = new Date(currentPeriodStart);
		const interval = data.recurringInterval?.toLowerCase() || 'month';
		if (interval === 'year') {
			currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
		} else {
			currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
		}
	}

	// Get plan_id from metadata or default to 'pro'
	const planName = (data.metadata?.plan_id as string) || 'pro';

	// Look up the plan UUID from subscription_plans
	const { data: plan } = await supabase
		.from('subscription_plans')
		.select('id')
		.eq('name', planName)
		.single();

	if (!plan) {
		// Throw to signal failure - plan should exist in database
		throw new Error(`[Polar] Plan not found in database: ${planName}`);
	}

	// Upsert subscription record
	const { error } = await supabase.from('user_subscriptions').upsert(
		{
			user_id: userId,
			plan_id: plan.id,
			polar_subscription_id: data.id,
			polar_customer_id: customerId,
			status: 'active',
			current_period_start: currentPeriodStart.toISOString(),
			current_period_end: currentPeriodEnd.toISOString(),
			cancel_at_period_end: false,
			metadata: {
				polar_product_id: data.productId,
				billing_interval: mapBillingInterval(data.recurringInterval || 'month'),
				amount: data.amount,
				currency: data.currency,
			},
			updated_at: new Date().toISOString(),
		},
		{
			onConflict: 'polar_subscription_id',
		}
	);

	if (error) {
		// Throw to signal failure - Polar will retry the webhook
		throw new Error(`[Polar] Failed to upsert subscription: ${error.message}`);
	}

	console.log('[Polar] Subscription activated:', data.id);
}

/**
 * Handles subscription updates.
 */
async function handleSubscriptionUpdated(data: SubscriptionData) {
	const supabase = createServiceRoleClient();

	console.log('[Polar] Processing subscription.updated:', data.id);

	const currentPeriodEnd = data.currentPeriodEnd
		? new Date(data.currentPeriodEnd)
		: undefined;

	const updateData: Record<string, unknown> = {
		status: mapPolarStatus(data.status || 'active'),
		cancel_at_period_end: data.cancelAtPeriodEnd || false,
		updated_at: new Date().toISOString(),
	};

	if (currentPeriodEnd) {
		updateData.current_period_end = currentPeriodEnd.toISOString();
	}

	const { error } = await supabase
		.from('user_subscriptions')
		.update(updateData)
		.eq('polar_subscription_id', data.id);

	if (error) {
		throw new Error(`[Polar] Failed to update subscription: ${error.message}`);
	}
}

/**
 * Handles subscription cancellation.
 */
async function handleSubscriptionCanceled(data: SubscriptionData) {
	const supabase = createServiceRoleClient();

	console.log('[Polar] Processing subscription.canceled:', data.id);

	const { error } = await supabase
		.from('user_subscriptions')
		.update({
			status: 'canceled',
			cancel_at_period_end: true,
			canceled_at: data.canceledAt
				? new Date(data.canceledAt).toISOString()
				: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		})
		.eq('polar_subscription_id', data.id);

	if (error) {
		throw new Error(`[Polar] Failed to cancel subscription: ${error.message}`);
	}
}

/**
 * Handles subscription uncancellation (reactivation before period end).
 */
async function handleSubscriptionUncanceled(data: SubscriptionData) {
	const supabase = createServiceRoleClient();

	console.log('[Polar] Processing subscription.uncanceled:', data.id);

	const { error } = await supabase
		.from('user_subscriptions')
		.update({
			status: 'active',
			cancel_at_period_end: false,
			canceled_at: null,
			updated_at: new Date().toISOString(),
		})
		.eq('polar_subscription_id', data.id);

	if (error) {
		throw new Error(
			`[Polar] Failed to uncancel subscription: ${error.message}`
		);
	}
}

/**
 * Handles subscription revocation (immediate termination).
 */
async function handleSubscriptionRevoked(data: SubscriptionData) {
	const supabase = createServiceRoleClient();

	console.log('[Polar] Processing subscription.revoked:', data.id);

	const { error } = await supabase
		.from('user_subscriptions')
		.update({
			status: 'canceled',
			canceled_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		})
		.eq('polar_subscription_id', data.id);

	if (error) {
		throw new Error(`[Polar] Failed to revoke subscription: ${error.message}`);
	}
}
