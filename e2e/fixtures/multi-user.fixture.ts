import { test as base, expect, BrowserContext, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { ContextMenuPage } from '../pages/context-menu.page';
import { MindMapPage } from '../pages/mind-map.page';
import { ToolbarPage } from '../pages/toolbar.page';

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
 *
 * Worker-scoped fixtures persist across all tests in a serial group.
 * Test-scoped fixtures are created fresh for each test.
 */
type WorkerFixtures = {
	/** Authenticated browser context (map owner) - persists across tests */
	ownerContext: BrowserContext;
	/** Page for the authenticated owner - persists across tests */
	ownerPage: Page;
	/** Fresh browser context for anonymous guest - persists across tests */
	guestContext: BrowserContext;
	/** Page for the guest user - persists across tests */
	guestPage: Page;
};

type TestFixtures = {
	/** MindMapPage helper for the owner */
	ownerMindMapPage: MindMapPage;
	/** ToolbarPage helper for the owner */
	ownerToolbarPage: ToolbarPage;
	/** ContextMenuPage helper for the owner */
	ownerContextMenuPage: ContextMenuPage;
	/** MindMapPage helper for the guest */
	guestMindMapPage: MindMapPage;
	/** ToolbarPage helper for the guest */
	guestToolbarPage: ToolbarPage;
	/** ContextMenuPage helper for the guest */
	guestContextMenuPage: ContextMenuPage;
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
export const test = base.extend<TestFixtures, WorkerFixtures>({
	// ============================================================================
	// WORKER-SCOPED FIXTURES (persist across all tests in serial groups)
	// ============================================================================

	// Owner uses the pre-authenticated storage state
	ownerContext: [
		async ({ browser }, use) => {
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
		{ scope: 'worker' },
	],

	ownerPage: [
		async ({ ownerContext }, use) => {
			const page = await ownerContext.newPage();
			await use(page);
			// Don't close - worker cleanup handles it
		},
		{ scope: 'worker' },
	],

	// Guest uses a fresh context with explicitly empty storage state
	// This ensures no auth cookies are inherited from the browser
	guestContext: [
		async ({ browser }, use) => {
			const context = await browser.newContext({
				storageState: { cookies: [], origins: [] },
			});
			await use(context);
			await context.close();
		},
		{ scope: 'worker' },
	],

	guestPage: [
		async ({ guestContext }, use) => {
			const page = await guestContext.newPage();
			await use(page);
			// Don't close - worker cleanup handles it
		},
		{ scope: 'worker' },
	],

	// ============================================================================
	// TEST-SCOPED FIXTURES (created fresh for each test)
	// ============================================================================

	// Test map ID from global setup
	testMapId: async ({}, use) => {
		const testData = loadTestData();
		await use(testData.testMapId);
	},

	ownerMindMapPage: async ({ ownerPage }, use) => {
		const mindMapPage = new MindMapPage(ownerPage);
		await use(mindMapPage);
	},

	ownerToolbarPage: async ({ ownerPage }, use) => {
		const toolbarPage = new ToolbarPage(ownerPage);
		await use(toolbarPage);
	},

	ownerContextMenuPage: async ({ ownerPage }, use) => {
		const contextMenuPage = new ContextMenuPage(ownerPage);
		await use(contextMenuPage);
	},

	guestMindMapPage: async ({ guestPage }, use) => {
		const mindMapPage = new MindMapPage(guestPage);
		await use(mindMapPage);
	},

	guestToolbarPage: async ({ guestPage }, use) => {
		const toolbarPage = new ToolbarPage(guestPage);
		await use(toolbarPage);
	},

	guestContextMenuPage: async ({ guestPage }, use) => {
		const contextMenuPage = new ContextMenuPage(guestPage);
		await use(contextMenuPage);
	},
});

export { expect };
