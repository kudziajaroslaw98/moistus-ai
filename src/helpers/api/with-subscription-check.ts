import { SubscriptionPlan } from '@/store/slices/subscription-slice';
import { SupabaseClient, User } from '@supabase/supabase-js';

/**
 * Metadata structure for tracking AI feature usage in telemetry.
 * Used to log contextual information about AI operations.
 */
export interface AIUsageMetadata {
	/** Map ID where the AI feature was used */
	mapId?: string;
	/** Trigger source for the AI operation (e.g., 'magic-wand', 'context-menu') */
	trigger?: string;
	/** Generic count field for numbered operations */
	count?: number;
	/** Number of suggestions generated */
	suggestionCount?: number;
	/** Number of connections suggested */
	connectionCount?: number;
	/** Number of merges suggested */
	mergeCount?: number;
	/** Allow additional telemetry fields */
	[key: string]: string | number | boolean | undefined;
}

export interface SubscriptionValidation {
	subscription: SubscriptionPlan;
	plan: {
		name: string;
		displayName: string;
		limits: {
			mindMaps: number;
			nodesPerMap: number;
			aiSuggestions: number;
		};
	};
	isTrialing: boolean;
}

export class SubscriptionError extends Error {
	code: string;

	constructor(message: string, code: string) {
		super(message);
		this.code = code;
		this.name = 'SubscriptionError';
	}
}

/**
 * Validates that a user has an active subscription with the required plan level.
 * Throws SubscriptionError if requirements aren't met.
 *
 * @param user - The authenticated user
 * @param supabase - Supabase client instance
 * @param requiredPlan - Minimum plan required ('pro' or 'enterprise')
 * @returns SubscriptionValidation object with subscription details
 * @throws SubscriptionError if user doesn't have required subscription
 */
export async function requireSubscription(
	user: User,
	supabase: SupabaseClient,
	requiredPlan: 'pro' | 'enterprise' = 'pro'
): Promise<SubscriptionValidation> {
	// Fetch active subscription with plan details
	const { data: subscription, error } = await supabase
		.from('user_subscriptions')
		.select(
			`
      *,
      plan:subscription_plans(*)
    `
		)
		.eq('user_id', user.id)
		.in('status', ['active', 'trialing'])
		.order('created_at', { ascending: false })
		.limit(1)
		.single();

	if (error || !subscription) {
		throw new SubscriptionError(
			'Active subscription required. Upgrade to Pro to access this feature.',
			'SUBSCRIPTION_REQUIRED'
		);
	}

	const planName = subscription.plan.name;
	const allowedPlans =
		requiredPlan === 'pro' ? ['pro', 'enterprise'] : ['enterprise'];

	if (!allowedPlans.includes(planName)) {
		throw new SubscriptionError(
			`${requiredPlan.toUpperCase()} plan required for this feature.`,
			'UPGRADE_REQUIRED'
		);
	}

	return {
		subscription,
		plan: subscription.plan,
		isTrialing: subscription.status === 'trialing',
	};
}

/**
 * Checks if a user is within their usage limits for a specific resource.
 * For Pro/Enterprise users with unlimited access, always returns allowed=true.
 *
 * @param user - The authenticated user
 * @param supabase - Supabase client instance
 * @param limitType - Type of limit to check
 * @param currentUsage - Current usage count for the resource
 * @returns Object with allowed status, limit, and remaining quota
 */
export async function checkUsageLimit(
	user: User,
	supabase: SupabaseClient,
	limitType: 'aiSuggestions' | 'mindMaps' | 'nodesPerMap' | 'collaboratorsPerMap',
	currentUsage: number
): Promise<{ allowed: boolean; limit: number; remaining: number }> {
	// Get subscription with plan limits
	const { data: subscription } = await supabase
		.from('user_subscriptions')
		.select(
			`
      *,
      plan:subscription_plans(*)
    `
		)
		.eq('user_id', user.id)
		.in('status', ['active', 'trialing'])
		.single();

	// Default to free plan limits (matches pricing-tiers.ts)
	const freePlanLimits = {
		mindMaps: 3,
		nodesPerMap: 50,
		aiSuggestions: 0,
		collaboratorsPerMap: 3,
	};

	const limit =
		subscription?.plan?.limits?.[limitType] ?? freePlanLimits[limitType];

	// -1 means unlimited (Pro/Enterprise)
	if (limit === -1) {
		return { allowed: true, limit: -1, remaining: -1 };
	}

	const remaining = Math.max(0, limit - currentUsage);
	const allowed = currentUsage < limit;

	return { allowed, limit, remaining };
}

/**
 * Gets the start date of the current billing period for usage tracking.
 * For free users (no subscription), uses the start of the current calendar month.
 *
 * @returns ISO timestamp string for billing period start
 */
export function getBillingPeriodStart(): string {
	const now = new Date();
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
	return startOfMonth.toISOString();
}

/**
 * Gets the end date of the current billing period.
 * For free users (no subscription), uses the last day of the current calendar month.
 *
 * @returns ISO timestamp string for billing period end
 */
export function getBillingPeriodEnd(): string {
	const now = new Date();
	// Get the first day of next month, then subtract 1ms to get end of current month
	const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
	return endOfMonth.toISOString();
}

/**
 * Subscription billing period info from database.
 */
export interface SubscriptionBillingPeriod {
	periodStart: string;
	periodEnd: string;
	usageAdjustment?: number;
}

/**
 * Gets the billing period dates from the user's active subscription.
 * Falls back to calendar month boundaries for free users without a subscription.
 *
 * @param user - The authenticated user
 * @param supabase - Supabase client instance
 * @returns Billing period start and end dates, plus any usage adjustment
 */
export async function getSubscriptionBillingPeriod(
	user: User,
	supabase: SupabaseClient
): Promise<SubscriptionBillingPeriod> {
	// Fetch active subscription's billing period
	const { data: subscription } = await supabase
		.from('user_subscriptions')
		.select('current_period_start, current_period_end, metadata')
		.eq('user_id', user.id)
		.in('status', ['active', 'trialing'])
		.order('created_at', { ascending: false })
		.limit(1)
		.single();

	if (subscription?.current_period_start) {
		// Use subscription's billing period (aligned with payment cycle)
		const metadata = subscription.metadata as Record<string, unknown> | null;
		return {
			periodStart: subscription.current_period_start,
			periodEnd: subscription.current_period_end || getBillingPeriodEnd(),
			usageAdjustment: (metadata?.usage_adjustment as number) || 0,
		};
	}

	// Free user: fall back to calendar month
	return {
		periodStart: getBillingPeriodStart(),
		periodEnd: getBillingPeriodEnd(),
		usageAdjustment: 0,
	};
}

/**
 * Tracks AI feature usage in the database.
 *
 * @param user - The authenticated user
 * @param supabase - Supabase client instance
 * @param feature - Feature name (e.g., 'suggestions', 'content', 'connections')
 * @param metadata - Optional metadata to store with usage log
 */
export async function trackAIUsage(
	user: User,
	supabase: SupabaseClient,
	feature: string,
	metadata: AIUsageMetadata = {}
): Promise<void> {
	await supabase.from('ai_usage_log').insert({
		user_id: user.id,
		feature,
		timestamp: new Date().toISOString(),
		metadata,
	});
}

/**
 * Gets the count of distinct collaborators for a map across all share tokens.
 * This handles the edge case of multiple share tokens per map by counting
 * unique user_ids in share_access, excluding the map owner.
 *
 * NOTE: This assumes (map_id, user_id) pairs are unique in share_access table.
 * For truly distinct counting, a Postgres RPC with COUNT(DISTINCT user_id) would be needed.
 *
 * @param supabase - Supabase client instance
 * @param mapId - The map ID to count collaborators for
 * @param excludeUserId - User ID to exclude from count (typically the map owner)
 * @returns Count of distinct collaborators
 * @throws Error if database query fails
 */
export async function getMapCollaboratorCount(
	supabase: SupabaseClient,
	mapId: string,
	excludeUserId?: string
): Promise<number> {
	// Count distinct users who have access to this map (across all share tokens)
	// We use share_access table which tracks actual users with access
	let query = supabase
		.from('share_access')
		.select('user_id', { count: 'exact', head: true })
		.eq('map_id', mapId)
		.eq('status', 'active');

	// Exclude the map owner from the count
	if (excludeUserId) {
		query = query.neq('user_id', excludeUserId);
	}

	const { count, error } = await query;

	if (error) {
		console.error('[Subscription] Failed to count collaborators:', error);
		throw new Error(`Failed to count collaborators: ${error.message}`);
	}

	return count || 0;
}

/**
 * Checks collaborator limit for a map based on the owner's subscription.
 * Returns whether adding a new collaborator is allowed.
 *
 * @param supabase - Supabase client instance
 * @param mapId - The map ID to check
 * @param mapOwnerId - The user ID of the map owner
 * @returns Object with allowed status, limit, remaining, and current count
 */
export async function checkCollaboratorLimit(
	supabase: SupabaseClient,
	mapId: string,
	mapOwnerId: string
): Promise<{
	allowed: boolean;
	limit: number;
	remaining: number;
	currentCount: number;
}> {
	// Get map owner's subscription
	const { data: subscription } = await supabase
		.from('user_subscriptions')
		.select(
			`
			*,
			plan:subscription_plans(*)
		`
		)
		.eq('user_id', mapOwnerId)
		.in('status', ['active', 'trialing'])
		.single();

	// If field is missing, infer from plan name: free=3, pro/enterprise=unlimited
	// Matches client-side logic in use-feature-gate.ts
	const limit = subscription?.plan?.limits?.collaboratorsPerMap
		?? (subscription?.plan?.name === 'free' ? 3 : subscription ? -1 : 3);

	// -1 means unlimited (Pro/Enterprise)
	if (limit === -1) {
		return { allowed: true, limit: -1, remaining: -1, currentCount: 0 };
	}

	// Count current collaborators (excluding the owner)
	const currentCount = await getMapCollaboratorCount(
		supabase,
		mapId,
		mapOwnerId
	);

	const remaining = Math.max(0, limit - currentCount);
	const allowed = currentCount < limit;

	return { allowed, limit, remaining, currentCount };
}

/**
 * Gets AI usage count for the current billing period.
 * Uses subscription billing period if available, otherwise falls back to calendar month.
 * Also accounts for any usage adjustment from mid-cycle plan changes.
 *
 * @param user - The authenticated user
 * @param supabase - Supabase client instance
 * @param feature - Optional feature filter (e.g., 'suggestions')
 * @param billingPeriod - Optional pre-fetched billing period (avoids duplicate query)
 * @returns Count of AI usage in current billing period (adjusted for plan changes)
 */
export async function getAIUsageCount(
	user: User,
	supabase: SupabaseClient,
	feature?: string,
	billingPeriod?: SubscriptionBillingPeriod
): Promise<number> {
	// Get billing period if not provided
	const period = billingPeriod || await getSubscriptionBillingPeriod(user, supabase);

	let query = supabase
		.from('ai_usage_log')
		.select('*', { count: 'exact', head: true })
		.eq('user_id', user.id)
		.gte('timestamp', period.periodStart);

	if (feature) {
		query = query.eq('feature', feature);
	}

	const { count } = await query;
	const baseCount = count || 0;

	// Apply usage adjustment from mid-cycle upgrades
	// Adjustment is negative when upgrading (giving back unused quota from old plan)
	// Example: user had 2/3 used on free, upgrades to pro (100) = adjustment of -1
	// Effective usage = 2 - 1 = 1 (effectively counting only 1 toward new 100 limit)
	const adjustment = period.usageAdjustment || 0;

	return Math.max(0, baseCount + adjustment);
}

/**
 * Calculates usage adjustment when a user changes plans mid-cycle.
 * Uses the "add difference to remaining" approach:
 * - If user had 2/3 free suggestions used, upgrade to Pro (100)
 * - Old remaining = 3 - 2 = 1
 * - New remaining should be = 100 - (100 - 3) + 1 = 100 - 97 + 1 = 4... wait
 *
 * Actually simpler: new_remaining = new_limit - old_limit + old_remaining
 * old_remaining = old_limit - current_usage
 * new_remaining = new_limit - current_usage (adjusted)
 * adjustment = old_limit - new_limit (negative = gave user more credits)
 *
 * The adjustment is added to usage count, so:
 * - Negative adjustment = reduces effective usage = more remaining
 * - Positive adjustment = increases effective usage = less remaining (downgrade)
 *
 * @param oldLimit - Previous plan's limit for this resource
 * @param newLimit - New plan's limit for this resource
 * @returns Adjustment value to add to usage count
 */
export function calculateUsageAdjustment(oldLimit: number, newLimit: number): number {
	// Handle unlimited plans (-1 means unlimited)
	if (oldLimit === -1 || newLimit === -1) {
		// From unlimited to limited: no adjustment (fresh start)
		// From limited to unlimited: no adjustment (doesn't matter)
		return 0;
	}

	// Adjustment = difference between limits (negative = upgrade, positive = downgrade)
	// This is added to usage, so:
	// - Upgrading (3 → 100): adjustment = 3 - 100 = -97 → usage effectively reduced
	// - Downgrading (100 → 3): adjustment = 100 - 3 = +97 → usage effectively increased
	return oldLimit - newLimit;
}
