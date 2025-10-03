import { SupabaseClient, User } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import {
	requireSubscription,
	checkUsageLimit,
	getAIUsageCount,
	trackAIUsage,
	SubscriptionError,
} from './with-subscription-check';

/**
 * Checks if user has access to AI features and returns access info.
 * For use in API routes with withApiValidation that already have user/supabase.
 *
 * @param user - Authenticated user from withApiValidation
 * @param supabase - Supabase client from withApiValidation
 * @param featureName - Name of AI feature for tracking (e.g., 'content', 'connections')
 * @returns Object with hasAccess boolean and error Response if access denied
 */
export async function checkAIFeatureAccess(
	user: User,
	supabase: SupabaseClient,
	featureName: string
): Promise<{ hasAccess: boolean; isPro: boolean; error?: Response }> {
	try {
		// Try to validate Pro subscription
		await requireSubscription(user, supabase, 'pro');
		return { hasAccess: true, isPro: true };
	} catch (error) {
		if (error instanceof SubscriptionError) {
			// User doesn't have Pro - check if they're within free tier limits
			const currentUsage = await getAIUsageCount(user, supabase, featureName);
			const { allowed, limit, remaining } = await checkUsageLimit(
				user,
				supabase,
				'aiSuggestions',
				currentUsage
			);

			if (!allowed) {
				return {
					hasAccess: false,
					isPro: false,
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

			// Within free tier limits
			return { hasAccess: true, isPro: false };
		}

		// Other error - rethrow
		throw error;
	}
}

/**
 * Tracks AI feature usage after successful completion.
 * Only tracks for free tier users (Pro users have unlimited).
 *
 * @param user - Authenticated user
 * @param supabase - Supabase client
 * @param featureName - Name of AI feature (e.g., 'content', 'connections')
 * @param isPro - Whether user has Pro access
 * @param metadata - Optional metadata to store
 */
export async function trackAIFeatureUsage(
	user: User,
	supabase: SupabaseClient,
	featureName: string,
	isPro: boolean,
	metadata: Record<string, any> = {}
): Promise<void> {
	// Only track usage for free tier users
	if (!isPro) {
		await trackAIUsage(user, supabase, featureName, metadata);
	}
}
