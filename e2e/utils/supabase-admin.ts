/**
 * Supabase admin client for E2E test data setup.
 * Uses service role to bypass RLS and manipulate test data directly.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !serviceRoleKey) {
	console.warn(
		'⚠️ Missing Supabase credentials for E2E admin client. Billing tests will be skipped.'
	);
}

/**
 * Admin Supabase client with service role access.
 * Used for test setup/teardown only - bypasses RLS.
 */
export const supabaseAdmin = supabaseUrl && serviceRoleKey
	? createClient(supabaseUrl, serviceRoleKey, {
			auth: { persistSession: false },
		})
	: null;

/**
 * Check if admin client is available for billing tests.
 */
export function isAdminAvailable(): boolean {
	return supabaseAdmin !== null;
}

/**
 * Subscription state for test setup.
 */
export interface TestSubscriptionState {
	planName: 'free' | 'pro';
	status: 'active' | 'trialing' | 'canceled';
	periodStartDaysAgo?: number; // Days ago the period started (default: 0 = today)
	usageAdjustment?: number; // Mid-cycle upgrade adjustment
}

/**
 * Sets up subscription state for a test user.
 * Creates or updates user_subscriptions record.
 */
export async function setupTestSubscription(
	userId: string,
	state: TestSubscriptionState
): Promise<void> {
	if (!supabaseAdmin) {
		throw new Error('Supabase admin client not available');
	}

	// Get the plan ID
	const { data: plan, error: planError } = await supabaseAdmin
		.from('subscription_plans')
		.select('id')
		.eq('name', state.planName)
		.single();

	if (planError || !plan) {
		throw new Error(`Plan not found: ${state.planName}`);
	}

	// Calculate period dates
	const now = new Date();
	const periodStart = new Date(now);
	periodStart.setDate(periodStart.getDate() - (state.periodStartDaysAgo ?? 0));

	const periodEnd = new Date(periodStart);
	periodEnd.setMonth(periodEnd.getMonth() + 1);

	// Build metadata
	const metadata: Record<string, unknown> = {
		test_subscription: true,
		created_for_e2e: new Date().toISOString(),
	};

	if (state.usageAdjustment !== undefined) {
		metadata.usage_adjustment = state.usageAdjustment;
	}

	// Delete existing subscription first, then insert
	await supabaseAdmin.from('user_subscriptions').delete().eq('user_id', userId);

	const { error } = await supabaseAdmin.from('user_subscriptions').insert({
		user_id: userId,
		plan_id: plan.id,
		polar_subscription_id: `test_${userId}_${Date.now()}`,
		polar_customer_id: `test_customer_${userId}`,
		status: state.status,
		current_period_start: periodStart.toISOString(),
		current_period_end: periodEnd.toISOString(),
		cancel_at_period_end: false,
		metadata,
		updated_at: new Date().toISOString(),
	});

	if (error) {
		throw new Error(`Failed to setup subscription: ${error.message}`);
	}
}

/**
 * Removes subscription for a test user (returns to free tier).
 */
export async function removeTestSubscription(userId: string): Promise<void> {
	if (!supabaseAdmin) {
		throw new Error('Supabase admin client not available');
	}

	const { error } = await supabaseAdmin
		.from('user_subscriptions')
		.delete()
		.eq('user_id', userId);

	if (error) {
		throw new Error(`Failed to remove subscription: ${error.message}`);
	}
}

/**
 * Clears AI usage log for a test user.
 */
export async function clearTestAIUsage(userId: string): Promise<void> {
	if (!supabaseAdmin) {
		throw new Error('Supabase admin client not available');
	}

	const { error } = await supabaseAdmin
		.from('ai_usage_log')
		.delete()
		.eq('user_id', userId);

	if (error) {
		throw new Error(`Failed to clear AI usage: ${error.message}`);
	}
}

/**
 * Creates fake AI usage entries for testing limits.
 */
export async function createTestAIUsage(
	userId: string,
	count: number,
	daysAgo: number = 0
): Promise<void> {
	if (!supabaseAdmin) {
		throw new Error('Supabase admin client not available');
	}

	const timestamp = new Date();
	timestamp.setDate(timestamp.getDate() - daysAgo);

	const entries = Array.from({ length: count }, (_, i) => ({
		user_id: userId,
		feature: 'suggestions',
		timestamp: new Date(timestamp.getTime() + i * 1000).toISOString(),
		metadata: { test_entry: true },
	}));

	const { error } = await supabaseAdmin.from('ai_usage_log').insert(entries);

	if (error) {
		throw new Error(`Failed to create AI usage: ${error.message}`);
	}
}

/**
 * Gets the current user ID from a Playwright page by calling the profile API.
 */
export async function getUserIdFromPage(page: import('@playwright/test').Page): Promise<string> {
	// Call profile API to get user ID (session is in cookies, not localStorage)
	const response = await page.request.get('/api/user/profile');

	if (!response.ok()) {
		throw new Error(`Failed to fetch user profile: ${response.status()}`);
	}

	const { data } = await response.json();
	const userId = data?.user_id;

	if (!userId) {
		throw new Error('Could not extract user ID from profile response');
	}

	return userId;
}
