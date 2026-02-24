import { SubscriptionPlan } from '@/store/slices/subscription-slice';
import { SupabaseClient, User } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const SAFE_PAID_COLLABORATOR_CAP = 10;

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
 */
export async function checkUsageLimit(
	user: User,
	supabase: SupabaseClient,
	limitType:
		| 'aiSuggestions'
		| 'mindMaps'
		| 'nodesPerMap'
		| 'collaboratorsPerMap',
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
 */
export function getBillingPeriodStart(): string {
	const now = new Date();
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
	return startOfMonth.toISOString();
}

/**
 * Gets the end date of the current billing period.
 * For free users (no subscription), uses the last day of the current calendar month.
 */
export function getBillingPeriodEnd(): string {
	const now = new Date();
	const endOfMonth = new Date(
		now.getFullYear(),
		now.getMonth() + 1,
		0,
		23,
		59,
		59,
		999
	);
	return endOfMonth.toISOString();
}

/**
 * Subscription billing period info from database.
 */
export interface SubscriptionBillingPeriod {
	periodStart: string;
	periodEnd: string;
}

/**
 * Gets the billing period dates from the user's active subscription.
 * Falls back to calendar month boundaries for free users without a subscription.
 */
export async function getSubscriptionBillingPeriod(
	user: User,
	supabase: SupabaseClient
): Promise<SubscriptionBillingPeriod> {
	const { data: subscription } = await supabase
		.from('user_subscriptions')
		.select('current_period_start, current_period_end')
		.eq('user_id', user.id)
		.in('status', ['active', 'trialing'])
		.order('created_at', { ascending: false })
		.limit(1)
		.single();

	if (subscription?.current_period_start) {
		return {
			periodStart: subscription.current_period_start,
			periodEnd: subscription.current_period_end || getBillingPeriodEnd(),
		};
	}

	return {
		periodStart: getBillingPeriodStart(),
		periodEnd: getBillingPeriodEnd(),
	};
}

/**
 * Tracks AI feature usage by incrementing the atomic counter.
 * No-ops for Pro users (unlimited access).
 */
export async function trackAIUsage(
	user: User,
	supabase: SupabaseClient,
	isPro: boolean
): Promise<void> {
	if (isPro) return;

	const billingPeriod = await getSubscriptionBillingPeriod(user, supabase);
	await supabase.rpc('increment_ai_usage', {
		p_user_id: user.id,
		p_period_start: billingPeriod.periodStart,
	});
}

/**
 * Gets AI usage count for the current billing period via atomic counter.
 */
export async function getAIUsageCount(
	user: User,
	supabase: SupabaseClient
): Promise<number> {
	const billingPeriod = await getSubscriptionBillingPeriod(user, supabase);
	const { data, error } = await supabase.rpc('get_ai_usage', {
		p_user_id: user.id,
		p_period_start: billingPeriod.periodStart,
	});
	if (error) {
		throw new Error(`AI usage counter unavailable: ${error.message}`);
	}

	if (data === null || data === undefined) {
		throw new Error('AI usage counter unavailable: RPC returned null');
	}

	if (typeof data !== 'number' || Number.isNaN(data)) {
		throw new Error('AI usage counter unavailable: RPC returned invalid value');
	}

	return data;
}

/**
 * Checks if a user has AI quota remaining. Unified check for all AI features.
 * Returns access info including whether the user is Pro and remaining quota.
 */
export async function checkAIQuota(
	user: User,
	supabase: SupabaseClient
): Promise<{
	allowed: boolean;
	isPro: boolean;
	remaining: number;
	limit: number;
	error?: Response;
}> {
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

	const isPro = !!subscription && ['pro', 'enterprise'].includes(subscription.plan?.name);
	const limit = subscription?.plan?.limits?.aiSuggestions ?? 0;

	// -1 means unlimited (Pro/Enterprise)
	if (limit === -1) {
		return { allowed: true, isPro, remaining: -1, limit: -1 };
	}

	let currentUsage: number;
	try {
		currentUsage = await getAIUsageCount(user, supabase);
	} catch (error) {
		console.error('[Subscription] AI usage counter unavailable:', error);
		return {
			allowed: false,
			isPro,
			remaining: 0,
			limit,
			error: NextResponse.json(
				{
					error: 'AI usage counter unavailable',
					code: 'USAGE_COUNTER_UNAVAILABLE',
					upgradeUrl: '/dashboard/settings/billing',
				},
				{ status: 503 }
			),
		};
	}

	const allowed = currentUsage < limit;
	const remaining = Math.max(0, limit - currentUsage);

	if (!allowed) {
		return {
			allowed: false,
			isPro,
			remaining: 0,
			limit,
			error: NextResponse.json(
				{
					error: `AI feature limit reached (${limit} per month). Upgrade to Pro for unlimited AI features.`,
					code: 'LIMIT_REACHED',
					currentUsage,
					limit,
					remaining: 0,
					upgradeUrl: '/dashboard/settings/billing',
				},
				{ status: 402 }
			),
		};
	}

	return { allowed, isPro, remaining, limit };
}

/**
 * Gets the count of distinct collaborators for a map across all share tokens.
 */
export async function getMapCollaboratorCount(
	supabase: SupabaseClient,
	mapId: string,
	excludeUserId?: string
): Promise<number> {
	let query = supabase
		.from('share_access')
		.select('user_id', { count: 'exact', head: true })
		.eq('map_id', mapId)
		.eq('status', 'active');

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

	const rawCollaboratorLimit = subscription?.plan?.limits?.collaboratorsPerMap;
	const limit =
		typeof rawCollaboratorLimit === 'number'
			? rawCollaboratorLimit
			: subscription?.plan?.name === 'free'
				? 3
				: subscription
					? SAFE_PAID_COLLABORATOR_CAP
					: 3;

	if (limit === -1) {
		return { allowed: true, limit: -1, remaining: -1, currentCount: 0 };
	}

	const currentCount = await getMapCollaboratorCount(
		supabase,
		mapId,
		mapOwnerId
	);

	const remaining = Math.max(0, limit - currentCount);
	const allowed = currentCount < limit;

	return { allowed, limit, remaining, currentCount };
}
