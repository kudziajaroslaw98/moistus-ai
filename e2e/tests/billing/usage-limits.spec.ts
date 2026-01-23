/**
 * E2E Tests for Usage Limits and Billing Period Enforcement
 *
 * Tests verify:
 * 1. Free users are blocked when AI limit reached (0 per month)
 * 2. Pro users have unlimited AI access
 * 3. Usage counts from subscription.current_period_start (not calendar month)
 * 4. Mid-cycle upgrades adjust remaining usage correctly
 * 5. Usage API returns correct billing period dates
 *
 * Prerequisites:
 * - SUPABASE_SERVICE_ROLE must be set in .env.e2e.local
 * - Test user must exist with valid credentials
 */

import { test, expect } from '../../fixtures/billing.fixture';

test.describe('Usage Limit Enforcement', () => {
	test.beforeEach(async ({ adminAvailable }) => {
		test.skip(!adminAvailable, 'Supabase admin client not available - set SUPABASE_SERVICE_ROLE');
	});

	test('free user without subscription gets 402 on AI request', async ({
		apiRequest,
		removeSubscription,
		clearAIUsage,
		testMapId,
	}) => {
		// Setup: Ensure user has no subscription (free tier)
		await removeSubscription();
		await clearAIUsage();

		// Make AI suggestions request
		const response = await apiRequest.post('/api/ai/suggestions', {
			data: {
				messages: [
					{
						role: 'user',
						content: JSON.stringify({
							trigger: 'magic-wand',
							mapId: testMapId,
							context: { nodes: [], edges: [] },
						}),
					},
				],
			},
		});

		// Should get 402 Payment Required
		expect(response.status()).toBe(402);

		const body = await response.json();
		expect(body.code).toBe('LIMIT_REACHED');
		expect(body.limit).toBe(0); // Free tier has 0 AI suggestions
		expect(body.upgradeUrl).toBeTruthy();
	});

	test('pro user can access AI features without limit', async ({
		apiRequest,
		setupSubscription,
		clearAIUsage,
		testMapId,
	}) => {
		// Setup: Give user Pro subscription
		await setupSubscription({ planName: 'pro', status: 'active' });
		await clearAIUsage();

		// Make AI suggestions request
		const response = await apiRequest.post('/api/ai/suggestions', {
			data: {
				messages: [
					{
						role: 'user',
						content: JSON.stringify({
							trigger: 'magic-wand',
							mapId: testMapId,
							context: { nodes: [], edges: [] },
						}),
					},
				],
			},
		});

		// Should NOT get 402 (may get other errors due to missing context, but not limit error)
		expect(response.status()).not.toBe(402);

		// If we got a body, verify it's not a limit error
		if (response.status() >= 400) {
			const body = await response.json();
			expect(body.code).not.toBe('LIMIT_REACHED');
		}
	});

	test('trialing user has Pro access', async ({
		apiRequest,
		setupSubscription,
		clearAIUsage,
		testMapId,
	}) => {
		// Setup: Give user trialing subscription
		await setupSubscription({ planName: 'pro', status: 'trialing' });
		await clearAIUsage();

		// Make AI suggestions request
		const response = await apiRequest.post('/api/ai/suggestions', {
			data: {
				messages: [
					{
						role: 'user',
						content: JSON.stringify({
							trigger: 'magic-wand',
							mapId: testMapId,
							context: { nodes: [], edges: [] },
						}),
					},
				],
			},
		});

		// Should NOT get 402 limit error
		expect(response.status()).not.toBe(402);
	});
});

test.describe('Billing Period Boundaries', () => {
	test.beforeEach(async ({ adminAvailable }) => {
		test.skip(!adminAvailable, 'Supabase admin client not available - set SUPABASE_SERVICE_ROLE');
	});

	test('usage API returns subscription period dates for pro user', async ({
		apiRequest,
		setupSubscription,
		clearAIUsage,
	}) => {
		// Setup: Pro subscription started 15 days ago
		await setupSubscription({
			planName: 'pro',
			status: 'active',
			periodStartDaysAgo: 15,
		});
		await clearAIUsage();

		// Get usage
		const response = await apiRequest.get('/api/user/billing/usage');
		expect(response.ok()).toBeTruthy();

		const { data } = await response.json();

		// Billing period should be ~15 days ago, not start of calendar month
		const periodStart = new Date(data.billingPeriod.start);
		const now = new Date();
		const daysDiff = Math.floor(
			(now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
		);

		// Should be approximately 15 days ago (allow 1 day tolerance)
		expect(daysDiff).toBeGreaterThanOrEqual(14);
		expect(daysDiff).toBeLessThanOrEqual(16);
	});

	test('usage API returns calendar month for free user', async ({
		apiRequest,
		removeSubscription,
		clearAIUsage,
	}) => {
		// Setup: No subscription
		await removeSubscription();
		await clearAIUsage();

		// Get usage
		const response = await apiRequest.get('/api/user/billing/usage');
		expect(response.ok()).toBeTruthy();

		const { data } = await response.json();

		// Billing period should be start of current month
		const periodStart = new Date(data.billingPeriod.start);
		const now = new Date();

		expect(periodStart.getDate()).toBe(1); // 1st of the month
		expect(periodStart.getMonth()).toBe(now.getMonth());
		expect(periodStart.getFullYear()).toBe(now.getFullYear());
	});

	test('usage from before billing period is not counted', async ({
		apiRequest,
		setupSubscription,
		clearAIUsage,
		createAIUsage,
	}) => {
		// Setup: Pro subscription started 5 days ago
		await setupSubscription({
			planName: 'pro',
			status: 'active',
			periodStartDaysAgo: 5,
		});
		await clearAIUsage();

		// Create usage from 10 days ago (before period) and 2 days ago (within period)
		await createAIUsage(3, 10); // Before period - should NOT count
		await createAIUsage(2, 2); // Within period - should count

		// Get usage
		const response = await apiRequest.get('/api/user/billing/usage');
		expect(response.ok()).toBeTruthy();

		const { data } = await response.json();

		// Should only count the 2 from within the period
		expect(data.aiSuggestionsCount).toBe(2);
	});
});

test.describe('Mid-Cycle Upgrade Adjustment', () => {
	test.beforeEach(async ({ adminAvailable }) => {
		test.skip(!adminAvailable, 'Supabase admin client not available - set SUPABASE_SERVICE_ROLE');
	});

	test('upgrade adjustment reduces effective usage count', async ({
		apiRequest,
		setupSubscription,
		clearAIUsage,
		createAIUsage,
	}) => {
		// Setup: Pro subscription with usage adjustment (simulating upgrade from free)
		// Free limit was 0, Pro limit is 100
		// adjustment = 0 - 100 = -100 (reduces effective usage)
		await setupSubscription({
			planName: 'pro',
			status: 'active',
			periodStartDaysAgo: 5,
			usageAdjustment: -100, // Simulates upgrade from free (0) to pro (100)
		});
		await clearAIUsage();

		// Create 50 usage entries
		await createAIUsage(50, 2);

		// Get usage
		const response = await apiRequest.get('/api/user/billing/usage');
		expect(response.ok()).toBeTruthy();

		const { data } = await response.json();

		// Effective usage = 50 + (-100) = -50, clamped to 0
		// This means user has full 100 remaining after upgrade
		expect(data.aiSuggestionsCount).toBe(0);
	});

	test('downgrade adjustment increases effective usage count', async ({
		apiRequest,
		setupSubscription,
		clearAIUsage,
		createAIUsage,
	}) => {
		// Setup: Free tier with adjustment (simulating downgrade from pro)
		// Pro limit was 100, Free limit is 0
		// adjustment = 100 - 0 = +100 (increases effective usage)
		await setupSubscription({
			planName: 'free',
			status: 'active',
			periodStartDaysAgo: 5,
			usageAdjustment: 100, // Simulates downgrade from pro (100) to free (0)
		});
		await clearAIUsage();

		// Get usage - even with 0 actual usage, adjustment makes it 100
		const response = await apiRequest.get('/api/user/billing/usage');
		expect(response.ok()).toBeTruthy();

		const { data } = await response.json();

		// Effective usage = 0 + 100 = 100
		expect(data.aiSuggestionsCount).toBe(100);
	});
});

test.describe('Usage Count Accuracy', () => {
	test.beforeEach(async ({ adminAvailable }) => {
		test.skip(!adminAvailable, 'Supabase admin client not available - set SUPABASE_SERVICE_ROLE');
	});

	test('usage count matches actual AI usage entries', async ({
		apiRequest,
		setupSubscription,
		clearAIUsage,
		createAIUsage,
	}) => {
		// Setup: Pro subscription
		await setupSubscription({
			planName: 'pro',
			status: 'active',
			periodStartDaysAgo: 0,
		});
		await clearAIUsage();

		// Create exactly 7 usage entries
		await createAIUsage(7, 0);

		// Get usage
		const response = await apiRequest.get('/api/user/billing/usage');
		expect(response.ok()).toBeTruthy();

		const { data } = await response.json();

		expect(data.aiSuggestionsCount).toBe(7);
	});

	test('mind maps count is accurate', async ({
		apiRequest,
		setupSubscription,
		page,
	}) => {
		await setupSubscription({ planName: 'pro', status: 'active' });

		// Get initial count
		const response1 = await apiRequest.get('/api/user/billing/usage');
		const { data: data1 } = await response1.json();
		const initialCount = data1.mindMapsCount;

		// Create a new map
		const createResponse = await apiRequest.post('/api/maps', {
			data: {
				title: `E2E Billing Test Map ${Date.now()}`,
				description: 'Created for billing E2E test',
			},
		});

		expect(createResponse.ok()).toBeTruthy();
		const { data: mapData } = await createResponse.json();
		const newMapId = mapData.map.id;

		// Get updated count
		const response2 = await apiRequest.get('/api/user/billing/usage');
		const { data: data2 } = await response2.json();

		expect(data2.mindMapsCount).toBe(initialCount + 1);

		// Cleanup: delete the test map
		await apiRequest.delete(`/api/maps/${newMapId}`);
	});
});
