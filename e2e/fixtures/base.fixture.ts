import { test as base, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { MindMapPage } from '../pages/mind-map.page';
import { NodeEditorPage } from '../pages/node-editor.page';

/**
 * Test data created during global setup.
 */
interface TestData {
	testMapId: string;
	createdAt: string;
}

/**
 * Custom fixture types for E2E tests.
 */
type Fixtures = {
	mindMapPage: MindMapPage;
	nodeEditorPage: NodeEditorPage;
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
 * Extended test with custom fixtures for mind map testing.
 *
 * Usage:
 * ```ts
 * import { test, expect } from '../fixtures/base.fixture';
 *
 * test('my test', async ({ mindMapPage, nodeEditorPage, testMapId }) => {
 *   // Navigate to the test map
 *   await mindMapPage.goto(testMapId);
 *   // Use page objects
 * });
 * ```
 */
export const test = base.extend<Fixtures>({
	// Test map ID from global setup
	testMapId: async ({}, use) => {
		const testData = loadTestData();
		await use(testData.testMapId);
	},

	// Mind map page fixture
	mindMapPage: async ({ page }, use) => {
		const mindMapPage = new MindMapPage(page);
		await use(mindMapPage);
	},

	// Node editor page fixture (can also be accessed via mindMapPage.nodeEditorPage)
	nodeEditorPage: async ({ page }, use) => {
		const nodeEditorPage = new NodeEditorPage(page);
		await use(nodeEditorPage);
	},
});

export { expect };
