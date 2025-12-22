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
	limitType: 'aiSuggestions' | 'mindMaps' | 'nodesPerMap',
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

	// Default to free plan limits
	const freePlanLimits = {
		mindMaps: 3,
		nodesPerMap: 50,
		aiSuggestions: 10,
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
 * For monthly billing, this is the start of the current month.
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
 * For monthly billing, this is the last day of the current month at 23:59:59.
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
 * Gets AI usage count for the current billing period.
 *
 * @param user - The authenticated user
 * @param supabase - Supabase client instance
 * @param feature - Optional feature filter (e.g., 'suggestions')
 * @returns Count of AI usage in current billing period
 */
export async function getAIUsageCount(
	user: User,
	supabase: SupabaseClient,
	feature?: string
): Promise<number> {
	let query = supabase
		.from('ai_usage_log')
		.select('*', { count: 'exact', head: true })
		.eq('user_id', user.id)
		.gte('timestamp', getBillingPeriodStart());

	if (feature) {
		query = query.eq('feature', feature);
	}

	const { count } = await query;
	return count || 0;
}
