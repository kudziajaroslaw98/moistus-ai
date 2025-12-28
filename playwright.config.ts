import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import * as path from 'path';

// Load E2E-specific environment variables
// Priority: .env.e2e.local (local overrides) > .env.e2e (defaults)
dotenv.config({ path: '.env.e2e.local' });
dotenv.config({ path: '.env.e2e' });

const isCI = !!process.env.CI;

export default defineConfig({
	testDir: './e2e/tests',

	// Run tests in parallel within files
	fullyParallel: true,

	// Fail build on CI if test.only is left in code
	forbidOnly: isCI,

	// Retry failed tests
	retries: isCI ? 2 : 0,

	// Force single worker to prevent cross-test race conditions on shared testMapId
	// All sharing/permissions tests share the same database state, so parallel execution
	// causes revokeAllCodes() in one test to delete room codes created by other tests
	workers: 1,

	// Reporter configuration
	reporter: isCI
		? [['github'], ['html', { open: 'never' }]]
		: [['list'], ['html', { open: 'on-failure' }]],

	// Global timeout
	timeout: 30000,

	// Expect timeout for assertions
	expect: {
		timeout: 10000,

		// Screenshot comparison settings
		toHaveScreenshot: {
			maxDiffPixels: 100,
			maxDiffPixelRatio: 0.01,
			animations: 'disabled',
			threshold: 0.2,
		},

		toMatchSnapshot: {
			maxDiffPixels: 50,
		},
	},

	// Global setup - runs once before all tests
	globalSetup: path.join(__dirname, 'e2e/global-setup.ts'),

	// Shared settings for all projects
	use: {
		// Base URL for navigation
		baseURL: 'http://localhost:3000',

		// Collect trace on failure
		trace: 'on-first-retry',

		// Take screenshot on failure
		screenshot: 'only-on-failure',

		// Video recording - keep videos for failed tests
		video: 'retain-on-failure',

		// Viewport
		viewport: { width: 1280, height: 720 },

		// Action timeout
		actionTimeout: 10000,

		// Navigation timeout
		navigationTimeout: 15000,
	},

	// Browser projects
	projects: [
		// Setup project - runs authentication
		{
			name: 'setup',
			testMatch: /global\.setup\.ts/,
		},

		// Chromium - primary browser
		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
				storageState: 'e2e/.auth/user.json',
			},
			dependencies: ['setup'],
		},

		// Firefox - secondary
		{
			name: 'firefox',
			use: {
				...devices['Desktop Firefox'],
				storageState: 'e2e/.auth/user.json',
			},
			dependencies: ['setup'],
		},

		// WebKit - Safari
		{
			name: 'webkit',
			use: {
				...devices['Desktop Safari'],
				storageState: 'e2e/.auth/user.json',
			},
			dependencies: ['setup'],
		},
	],

	// Local dev server
	webServer: {
		command: 'pnpm build && pnpm start',
		url: 'http://localhost:3000',
		reuseExistingServer: !isCI,
		timeout: 120000,
		// Pass E2E env vars to the Next.js server
		env: {
			NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
			NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		},
	},
});
