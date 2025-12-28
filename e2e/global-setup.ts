import { chromium, FullConfig } from '@playwright/test';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load E2E environment variables
dotenv.config({ path: '.env.e2e.local' });
dotenv.config({ path: '.env.e2e' });

const authFile = path.join(__dirname, '.auth/user.json');
const testDataFile = path.join(__dirname, '.auth/test-data.json');

async function globalSetup(config: FullConfig) {
	// Ensure .auth directory exists
	const authDir = path.dirname(authFile);
	if (!fs.existsSync(authDir)) {
		fs.mkdirSync(authDir, { recursive: true });
	}

	const { baseURL } = config.projects[0].use;

	// Get test credentials from environment
	const testEmail = process.env.TEST_USER_EMAIL;
	const testPassword = process.env.TEST_USER_PASSWORD;

	if (!testEmail || !testPassword) {
		console.error(
			'❌ Missing TEST_USER_EMAIL or TEST_USER_PASSWORD in .env.e2e.local'
		);
		console.error('Please add test credentials to .env.e2e.local:');
		console.error('  TEST_USER_EMAIL=your-test-user@example.com');
		console.error('  TEST_USER_PASSWORD=your-test-password');
		throw new Error('Missing test credentials');
	}

	const browser = await chromium.launch();
	const context = await browser.newContext();
	const page = await context.newPage();

	try {
		console.log('🔐 Authenticating test user...');

		// Navigate to sign-in page
		await page.goto(`${baseURL}/auth/sign-in`);
		await page.waitForLoadState('networkidle');

		// Wait for the form to be ready (not in loading state)
		await page.waitForSelector('input[type="email"]', { timeout: 10000 });

		// Fill in credentials
		await page.fill('input[type="email"]', testEmail);
		await page.fill('input[type="password"]', testPassword);

		// Submit the form
		await page.click('button[type="submit"]');

		// Wait for navigation to dashboard (successful login)
		await page.waitForURL('**/dashboard**', { timeout: 15000 });

		console.log('✅ Login successful');

		// Wait a moment for Supabase session to fully initialize
		await page.waitForTimeout(1000);

		// Save the storage state (includes cookies and localStorage with Supabase session)
		await context.storageState({ path: authFile });
		console.log('✅ Authentication state saved to', authFile);

		// Get test map ID - use existing or create new
		let testMapId = process.env.TEST_MAP_ID;

		if (testMapId) {
			console.log('📝 Using existing test map:', testMapId);
		} else {
			// Create a test map for E2E tests
			console.log('📝 Creating test map for E2E tests...');

			const response = await page.request.post(`${baseURL}/api/maps`, {
				data: {
					title: `E2E Test Map - ${new Date().toISOString()}`,
					description: 'Automated test map for E2E testing',
				},
			});

			if (!response.ok()) {
				console.error('❌ Failed to create test map:', await response.text());
				throw new Error('Failed to create test map');
			}

			const { data } = await response.json();
			testMapId = data.map?.id;

			if (!testMapId) {
				throw new Error('Test map created but no ID returned');
			}

			console.log('✅ Test map created:', testMapId);
		}

		// Save test data for use in tests
		const testData = {
			testMapId,
			createdAt: new Date().toISOString(),
		};
		fs.writeFileSync(testDataFile, JSON.stringify(testData, null, 2));
		console.log('✅ Test data saved to', testDataFile);
	} catch (error) {
		console.error('❌ Global setup failed:', error);

		// Take a screenshot for debugging
		await page.screenshot({ path: 'e2e/auth-failure.png' });
		console.error('📸 Screenshot saved to e2e/auth-failure.png');

		throw error;
	} finally {
		await browser.close();
	}
}

export default globalSetup;
