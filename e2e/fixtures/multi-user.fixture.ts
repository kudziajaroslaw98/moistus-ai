import { test as base, expect, BrowserContext, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { MindMapPage } from '../pages/mind-map.page';

/**
 * Test data created during global setup.
 */
interface TestData {
	testMapId: string;
	createdAt: string;
}

/**
 * Multi-user fixture types for sharing E2E tests.
 *
 * Provides separate browser contexts for:
 * - Owner: authenticated user who owns the map and creates share tokens
 * - Guest: fresh anonymous context for join attempts
 */
type MultiUserFixtures = {
	/** Authenticated browser context (map owner) */
	ownerContext: BrowserContext;
	/** Page for the authenticated owner */
	ownerPage: Page;
	/** MindMapPage helper for the owner */
	ownerMindMapPage: MindMapPage;
	/** Fresh browser context for anonymous guest */
	guestContext: BrowserContext;
	/** Page for the guest user */
	guestPage: Page;
	/** Test map ID from global setup */
	testMapId: string;
};

/**
 * Load test data from global setup.
 */
function loadTestData(): TestData {
	const testDataPath = path.join(__dirname, '../.auth/test-data.json');

	if (!fs.existsSync(testDataPath)) {
		throw new Error(
			'Test data not found. Make sure global setup ran successfully.'
		);
	}

	return JSON.parse(fs.readFileSync(testDataPath, 'utf-8'));
}

/**
 * Extended test with multi-user fixtures for sharing tests.
 *
 * Usage:
 * ```ts
 * import { test, expect } from '../fixtures/multi-user.fixture';
 *
 * test('sharing test', async ({ ownerPage, guestPage, testMapId }) => {
 *   // Owner creates room code
 *   await ownerPage.goto(`/mind-map/${testMapId}`);
 *   // ...
 *
 *   // Guest tries to join
 *   await guestPage.goto('/join/ABC-123');
 *   // ...
 * });
 * ```
 */
export const test = base.extend<MultiUserFixtures>({
	// Test map ID from global setup
	testMapId: async ({}, use) => {
		const testData = loadTestData();
		await use(testData.testMapId);
	},

	// Owner uses the pre-authenticated storage state
	ownerContext: async ({ browser }, use) => {
		const authFile = path.join(__dirname, '../.auth/user.json');

		if (!fs.existsSync(authFile)) {
			throw new Error(
				'Auth state not found. Make sure global setup ran successfully.'
			);
		}

		const context = await browser.newContext({
			storageState: authFile,
		});

		await use(context);
		await context.close();
	},

	ownerPage: async ({ ownerContext }, use) => {
		const page = await ownerContext.newPage();
		await use(page);
		await page.close();
	},

	ownerMindMapPage: async ({ ownerPage }, use) => {
		const mindMapPage = new MindMapPage(ownerPage);
		await use(mindMapPage);
	},

	// Guest uses a fresh context with explicitly empty storage state
	// This ensures no auth cookies are inherited from the browser
	guestContext: async ({ browser }, use) => {
		const context = await browser.newContext({
			storageState: { cookies: [], origins: [] },
		});
		await use(context);
		await context.close();
	},

	guestPage: async ({ guestContext }, use) => {
		const page = await guestContext.newPage();
		await use(page);
		await page.close();
	},
});

export { expect };
