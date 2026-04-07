import { expect, test } from '@playwright/test';

test.describe('Landing navigation feedback', () => {
	test('shows immediate Start Mapping feedback while dashboard navigation is pending', async ({
		page,
	}) => {
		await page.goto('/');

		const dashboardRoutePattern = '**/dashboard**';
		await page.route(dashboardRoutePattern, async (route) => {
			await page.waitForTimeout(900);
			await route.continue();
		});

		try {
			const primaryCta = page.locator('.landing-hero-primary-cta').first();
			await expect(primaryCta).toBeVisible();

			const navigationPromise = page.waitForURL(/\/dashboard|\/auth\/sign-in/, {
				timeout: 20000,
			});
			await primaryCta.click();

			await expect(primaryCta).toContainText('Opening...');
			await expect(page.locator('[data-testid="start-mapping-progress"]')).toBeVisible();

			await navigationPromise;
		} finally {
			await page.unroute(dashboardRoutePattern);
		}
	});
});
