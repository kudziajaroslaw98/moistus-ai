import {
	test as base,
	expect,
	BrowserContext,
	Page,
} from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { MindMapPage } from '../pages/mind-map.page';
import { DashboardPage } from '../pages/dashboard.page';
import { UpgradeModalPage } from '../pages/upgrade-modal.page';
import {
	generateTestEmail,
	clearMailbox,
} from '../utils/inbucket-client';

/**
 * Test data created during global setup.
 */
interface UpgradeTestData {
	testMapId: string;
}

/**
 * Fixtures for anonymous user upgrade E2E tests.
 *
 * Provides:
 * - anonymousContext: Fresh browser context with no auth (anonymous user)
 * - anonymousPage: Page in the anonymous context
 * - dashboardPage: Dashboard page object
 * - upgradeModalPage: Upgrade modal page object
 * - testEmail: Unique email for each test
 */
type WorkerFixtures = {
	/** Anonymous browser context - no stored auth */
	anonymousContext: BrowserContext;
	/** Page for anonymous user */
	anonymousPage: Page;
};

type TestFixtures = {
	/** Dashboard page object */
	dashboardPage: DashboardPage;
	/** Upgrade modal page object */
	upgradeModalPage: UpgradeModalPage;
	/** Mind map page object */
	mindMapPage: MindMapPage;
	/** Unique test email for this test */
	testEmail: string;
	/** Test map ID from global setup */
	testMapId: string;
};

/**
 * Load test data from global setup.
 */
function loadTestData(): UpgradeTestData {
	const testDataPath = path.join(__dirname, '../.auth/test-data.json');

	if (!fs.existsSync(testDataPath)) {
		throw new Error(
			'Test data not found. Make sure global setup ran successfully.'
		);
	}

	return JSON.parse(fs.readFileSync(testDataPath, 'utf-8'));
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
	// ============================================================================
	// WORKER-SCOPED FIXTURES (persist across tests in serial groups)
	// ============================================================================

	// Anonymous context - fresh browser with no auth
	anonymousContext: [
		async ({ browser }, use) => {
			const context = await browser.newContext({
				storageState: { cookies: [], origins: [] },
			});

			await use(context);
			await context.close();
		},
		{ scope: 'worker' },
	],

	anonymousPage: [
		async ({ anonymousContext }, use) => {
			const page = await anonymousContext.newPage();
			await use(page);
			// Don't close - worker cleanup handles it
		},
		{ scope: 'worker' },
	],

	// ============================================================================
	// TEST-SCOPED FIXTURES (created fresh for each test)
	// ============================================================================

	testMapId: async ({}, use) => {
		const testData = loadTestData();
		await use(testData.testMapId);
	},

	dashboardPage: async ({ anonymousPage }, use) => {
		const dashboardPage = new DashboardPage(anonymousPage);
		await use(dashboardPage);
	},

	upgradeModalPage: async ({ anonymousPage }, use) => {
		const upgradeModalPage = new UpgradeModalPage(anonymousPage);
		await use(upgradeModalPage);
	},

	mindMapPage: async ({ anonymousPage }, use) => {
		const mindMapPage = new MindMapPage(anonymousPage);
		await use(mindMapPage);
	},

	testEmail: async ({}, use) => {
		// Generate unique email for each test
		const email = generateTestEmail('upgrade-e2e');
		// Clear any existing messages for this email
		try {
			await clearMailbox(email);
		} catch {
			// Mailbox may not exist yet, that's fine
		}
		await use(email);
	},
});

export { expect };
