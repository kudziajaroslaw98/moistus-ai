import { createServiceRoleClient } from '@/helpers/supabase/server';
import { mapBillingInterval, mapPolarStatus } from '@/lib/polar';
import type { SupabaseLikeError } from '@/types/supabase-like-error';
import { Webhooks } from '@polar-sh/nextjs';

// Validate webhook secret at module load time
const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;
if (!webhookSecret) {
	console.error(
		'[Polar] POLAR_WEBHOOK_SECRET is not configured - webhook verification will fail'
	);
}

/**
 * Polar webhook handler using @polar-sh/nextjs adapter.
 * Automatically handles signature verification and response.
 * @see https://polar.sh/docs/integrate/sdk/adapters/nextjs
 */
export const POST = Webhooks({
	webhookSecret: webhookSecret ?? '',

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

function formatSupabaseError(error: SupabaseLikeError): string {
	const metadata = [error.details, error.hint, error.code]
		.filter((value): value is string => Boolean(value))
		.join(' | ');

	if (!metadata) {
		return error.message;
	}

	return `${error.message} (${metadata})`;
}

function toFiniteNonNegativeNumber(value: unknown): number {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return Math.max(0, value);
	}

	if (typeof value === 'string' && value.trim().length > 0) {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) {
			return Math.max(0, parsed);
		}
	}

	return 0;
}

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
 * Detects plan changes and calculates usage adjustment for mid-cycle upgrades/downgrades.
 */
async function handleSubscriptionUpdated(data: SubscriptionData) {
	const supabase = createServiceRoleClient();

	console.log('[Polar] Processing subscription.updated:', data.id);

	// Fetch current subscription with plan details
	const { data: existingSubscription, error: subscriptionError } =
		await supabase
			.from('user_subscriptions')
			.select(
				`
			*,
			plan:subscription_plans(id, name, limits)
		`
			)
			.eq('polar_subscription_id', data.id)
			.maybeSingle();

	if (subscriptionError) {
		throw new Error(
			`[Polar] Failed to fetch current subscription before update: ${formatSupabaseError(subscriptionError)}`
		);
	}

	if (!existingSubscription) {
		throw new Error(`[Polar] Subscription not found for update: ${data.id}`);
	}

	const currentPeriodStart = data.currentPeriodStart
		? new Date(data.currentPeriodStart)
		: undefined;
	const currentPeriodEnd = data.currentPeriodEnd
		? new Date(data.currentPeriodEnd)
		: undefined;

	const updateData: Record<string, unknown> = {
		status: mapPolarStatus(data.status || 'active'),
		cancel_at_period_end: data.cancelAtPeriodEnd || false,
		updated_at: new Date().toISOString(),
	};

	if (currentPeriodStart) {
		updateData.current_period_start = currentPeriodStart.toISOString();
	}

	if (currentPeriodEnd) {
		updateData.current_period_end = currentPeriodEnd.toISOString();
	}

	// Track metadata updates (will be applied at end)
	let metadataUpdates: Record<string, unknown> = {
		...(existingSubscription.metadata as Record<string, unknown> | null),
	};

	// Check if this is a new billing period (period start changed) - reset counter
	const oldPeriodStart = existingSubscription.current_period_start;
	const userId = existingSubscription.user_id;
	if (currentPeriodStart && oldPeriodStart && userId) {
		const oldStart = new Date(oldPeriodStart).getTime();
		const newStart = currentPeriodStart.getTime();
		if (newStart > oldStart) {
			console.log(
				'[Polar] New billing period detected, resetting AI usage counter'
			);
			const { data: resetRows, error: resetError } = await supabase
				.from('user_usage_quotas')
				.update({
					ai_suggestions_count: 0,
					billing_period_start: currentPeriodStart.toISOString(),
				})
				.eq('user_id', userId)
				.select('user_id');
			if (resetError) {
				throw new Error(
					`[Polar] Failed to reset AI usage counter: ${formatSupabaseError(resetError)}`
				);
			}
			if (!resetRows || resetRows.length === 0) {
				console.warn(
					'[Polar] AI usage reset no-op: no user_usage_quotas row to update',
					{
						userId,
						subscriptionId: data.id,
						currentPeriodStart: currentPeriodStart.toISOString(),
					}
				);
			}
			metadataUpdates = {
				...metadataUpdates,
				previous_period_start: oldPeriodStart,
			};
		}
	}

	// Check if this is a plan change (productId changed)
	const newProductId = data.productId;
	const oldProductId = metadataUpdates?.polar_product_id;

	if (newProductId && oldProductId && newProductId !== oldProductId) {
		console.log(
			'[Polar] Plan change detected:',
			oldProductId,
			'->',
			newProductId
		);

		// Look up the new plan by product ID
		const { data: newPlan } = await supabase
			.from('subscription_plans')
			.select('id, name, limits')
			.eq('polar_product_id', newProductId)
			.single();

		if (newPlan && existingSubscription.plan && userId) {
			// Adjust AI usage counter directly for mid-cycle plan changes
			type PlanLimits = { aiSuggestions?: number };
			const oldLimit =
				(existingSubscription.plan.limits as PlanLimits)?.aiSuggestions ?? 0;
			const newLimit = (newPlan.limits as PlanLimits)?.aiSuggestions ?? 0;

			// Only adjust if both limits are finite
			if (oldLimit !== -1 && newLimit !== -1) {
				const { data: usageQuotaRow, error: usageQuotaError } = await supabase
					.from('user_usage_quotas')
					.select('ai_suggestions_count')
					.eq('user_id', userId)
					.maybeSingle();
				if (usageQuotaError) {
					throw new Error(
						`[Polar] Failed to load AI usage counter before adjustment: ${formatSupabaseError(usageQuotaError)}`
					);
				}

				const currentUsage = toFiniteNonNegativeNumber(
					usageQuotaRow?.ai_suggestions_count
				);
				// Upgrades grant fresh quota; downgrades clamp used count to the new limit.
				const targetUsage =
					newLimit > oldLimit ? 0 : Math.min(newLimit, currentUsage);
				const adjustment = targetUsage - currentUsage;

				console.log('[Polar] Adjusting AI usage counter:', {
					oldLimit,
					newLimit,
					currentUsage,
					targetUsage,
					adjustment,
				});

				if (adjustment !== 0) {
					const { error: adjustError } = await supabase.rpc('adjust_ai_usage', {
						p_user_id: userId,
						p_adjustment: adjustment,
					});
					if (adjustError) {
						console.error('[Polar] Failed to adjust AI usage counter:', {
							oldLimit,
							newLimit,
							currentUsage,
							targetUsage,
							adjustment,
							error: adjustError,
						});
						throw new Error(
							`[Polar] Failed to adjust AI usage counter: ${formatSupabaseError(adjustError)}`
						);
					}
				}

				console.log('[Polar] AI usage counter adjusted successfully:', {
					oldLimit,
					newLimit,
					currentUsage,
					targetUsage,
					adjustmentApplied: adjustment,
				});
			}

			// Update plan_id and metadata
			updateData.plan_id = newPlan.id;
			metadataUpdates = {
				...metadataUpdates,
				polar_product_id: newProductId,
				last_plan_change: new Date().toISOString(),
				previous_plan: existingSubscription.plan.name,
			};
		}
	} else if (existingSubscription.plan && !userId) {
		console.warn(
			'[Polar] Skipping AI usage adjustment because user_id is missing on subscription',
			{
				subscriptionId: data.id,
				newProductId,
				oldProductId,
			}
		);
	}

	// Apply metadata updates if any changes were made
	if (Object.keys(metadataUpdates).length > 0) {
		updateData.metadata = metadataUpdates;
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
 * User initiated cancellation - subscription remains active until period end.
 * Sets cancel_at_period_end: true but keeps status as 'active'.
 */
async function handleSubscriptionCanceled(data: SubscriptionData) {
	const supabase = createServiceRoleClient();

	console.log('[Polar] Processing subscription.canceled:', data.id);

	// Keep status as 'active' - user still has access until period ends
	// Only set cancel_at_period_end: true to indicate upcoming cancellation
	const { error } = await supabase
		.from('user_subscriptions')
		.update({
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
