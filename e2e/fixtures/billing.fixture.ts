/**
 * Fixtures for billing and usage limit E2E tests.
 *
 * These tests verify:
 * - Free users hit 402 when AI limit reached
 * - Pro users have unlimited access
 * - Usage counts from subscription period start (not calendar month)
 * - Mid-cycle upgrades adjust remaining usage correctly
 */
import { test as base, expect, Page, APIRequestContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import {
	isAdminAvailable,
	setupTestSubscription,
	removeTestSubscription,
	clearTestAIUsage,
	createTestAIUsage,
	getUserIdFromPage,
	type TestSubscriptionState,
} from '../utils/supabase-admin';

interface TestData {
	testMapId: string;
}

function loadTestData(): TestData {
	const testDataPath = path.join(__dirname, '../.auth/test-data.json');
	if (!fs.existsSync(testDataPath)) {
		throw new Error('Test data not found. Run global setup first.');
	}
	return JSON.parse(fs.readFileSync(testDataPath, 'utf-8'));
}

/**
 * Fixtures for billing tests.
 */
type BillingFixtures = {
	/** Test map ID */
	testMapId: string;
	/** User ID extracted from session */
	userId: string;
	/** Setup subscription state for the test user */
	setupSubscription: (state: TestSubscriptionState) => Promise<void>;
	/** Remove subscription (return to free tier) */
	removeSubscription: () => Promise<void>;
	/** Clear AI usage logs */
	clearAIUsage: () => Promise<void>;
	/** Create fake AI usage entries */
	createAIUsage: (count: number, daysAgo?: number) => Promise<void>;
	/** Make authenticated API request */
	apiRequest: APIRequestContext;
	/** Check if admin client is available */
	adminAvailable: boolean;
};

export const test = base.extend<BillingFixtures>({
	testMapId: async ({}, use) => {
		const testData = loadTestData();
		await use(testData.testMapId);
	},

	adminAvailable: async ({}, use) => {
		await use(isAdminAvailable());
	},

	userId: async ({ page }, use) => {
		// Navigate to dashboard to ensure session is loaded
		await page.goto('/dashboard');
		await page.waitForLoadState('networkidle');

		const userId = await getUserIdFromPage(page);
		await use(userId);
	},

	setupSubscription: async ({ userId }, use) => {
		const setup = async (state: TestSubscriptionState) => {
			await setupTestSubscription(userId, state);
		};
		await use(setup);
	},

	removeSubscription: async ({ userId }, use) => {
		const remove = async () => {
			await removeTestSubscription(userId);
		};
		await use(remove);

		// Cleanup: remove test subscription after test
		try {
			await removeTestSubscription(userId);
		} catch {
			// Ignore cleanup errors
		}
	},

	clearAIUsage: async ({ userId }, use) => {
		const clear = async () => {
			await clearTestAIUsage(userId);
		};
		await use(clear);

		// Cleanup: clear usage after test
		try {
			await clearTestAIUsage(userId);
		} catch {
			// Ignore cleanup errors
		}
	},

	createAIUsage: async ({ userId }, use) => {
		const create = async (count: number, daysAgo?: number) => {
			await createTestAIUsage(userId, count, daysAgo);
		};
		await use(create);
	},

	apiRequest: async ({ page }, use) => {
		await use(page.request);
	},
});

export { expect };
