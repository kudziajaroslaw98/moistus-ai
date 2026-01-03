import { expect, Locator, Page } from '@playwright/test';

/**
 * Page Object for the Dashboard page.
 *
 * Handles:
 * - Navigation
 * - Map creation (triggers upgrade for anonymous)
 * - Settings panel access
 * - User menu interactions
 * - Anonymous user banner
 */
export class DashboardPage {
	readonly page: Page;

	// Navigation
	readonly dashboardUrl = '/dashboard';

	// Anonymous user banner
	readonly anonymousBanner: Locator;
	readonly createAccountButton: Locator;
	readonly dismissBannerButton: Locator;
	readonly guestModeText: Locator;

	// User menu (top right)
	readonly userMenuButton: Locator;
	readonly userMenuDropdown: Locator;
	readonly upgradeAccountMenuItem: Locator;
	readonly upgradeToProMenuItem: Locator;
	readonly settingsMenuItem: Locator;
	readonly signOutMenuItem: Locator;

	// Create map
	readonly newMindMapButton: Locator;
	readonly createMapDialog: Locator;

	// Settings panel
	readonly settingsPanel: Locator;
	readonly billingTab: Locator;
	readonly upgradeButton: Locator;

	// Map list
	readonly mapCards: Locator;
	readonly emptyStateMessage: Locator;

	constructor(page: Page) {
		this.page = page;

		// Anonymous banner - amber/yellow colored banner at top
		this.anonymousBanner = page.locator('.text-amber-100:has-text("Guest Mode")');
		this.createAccountButton = page.getByRole('button', {
			name: /create account/i,
		});
		this.dismissBannerButton = page.locator(
			'button[aria-label="Dismiss banner"]'
		);
		this.guestModeText = page.locator('text=Guest Mode');

		// User menu - look for the avatar/user button area
		this.userMenuButton = page.locator(
			'button:has(img[alt*="avatar"]), button:has(svg.lucide-user)'
		);
		this.userMenuDropdown = page.getByRole('menu');
		this.upgradeAccountMenuItem = page.getByRole('menuitem', {
			name: /upgrade account/i,
		});
		this.upgradeToProMenuItem = page.getByRole('menuitem', {
			name: /upgrade to pro/i,
		});
		this.settingsMenuItem = page.getByRole('menuitem', {
			name: /settings/i,
		});
		this.signOutMenuItem = page.getByRole('menuitem', {
			name: /sign out/i,
		});

		// Create map
		this.newMindMapButton = page.getByRole('button', {
			name: /new mind map/i,
		});
		this.createMapDialog = page.locator('[role="dialog"]');

		// Settings panel
		this.settingsPanel = page.locator('[data-testid="settings-panel"]');
		this.billingTab = page.getByRole('tab', { name: /billing/i });
		this.upgradeButton = page.getByRole('button', { name: /upgrade/i });

		// Map list
		this.mapCards = page.locator('[data-testid="map-card"]');
		this.emptyStateMessage = page.locator('text=No mind maps yet');
	}

	// ============================================================================
	// NAVIGATION
	// ============================================================================

	async goto() {
		await this.page.goto(this.dashboardUrl);
		await this.page.waitForLoadState('domcontentloaded');
	}

	async waitForLoad() {
		await this.page.waitForLoadState('networkidle');
	}

	async reload() {
		await this.page.reload();
		await this.page.waitForLoadState('domcontentloaded');
	}

	// ============================================================================
	// ANONYMOUS BANNER
	// ============================================================================

	async isAnonymousBannerVisible(): Promise<boolean> {
		try {
			// Wait a short time for banner animation
			await this.page.waitForTimeout(500);
			return await this.guestModeText.isVisible();
		} catch {
			return false;
		}
	}

	async waitForAnonymousBanner(timeout = 10000) {
		await this.guestModeText.waitFor({ state: 'visible', timeout });
	}

	async clickCreateAccountFromBanner() {
		await this.createAccountButton.click();
	}

	async dismissAnonymousBanner() {
		await this.dismissBannerButton.click();
		// Wait for banner animation to complete
		await this.page.waitForTimeout(500);
	}

	async expectAnonymousBannerVisible() {
		await expect(this.guestModeText).toBeVisible();
	}

	async expectAnonymousBannerHidden() {
		await expect(this.guestModeText).not.toBeVisible();
	}

	// ============================================================================
	// USER MENU
	// ============================================================================

	async openUserMenu() {
		// Click on user avatar/menu button
		await this.userMenuButton.click();
		await this.userMenuDropdown.waitFor({ state: 'visible', timeout: 3000 });
	}

	async closeUserMenu() {
		// Press Escape to close menu
		await this.page.keyboard.press('Escape');
		await this.userMenuDropdown.waitFor({ state: 'hidden', timeout: 3000 });
	}

	async clickUpgradeAccountFromMenu() {
		await this.openUserMenu();
		await this.upgradeAccountMenuItem.click();
	}

	async clickUpgradeToPro() {
		await this.openUserMenu();
		await this.upgradeToProMenuItem.click();
	}

	async clickSettings() {
		await this.openUserMenu();
		await this.settingsMenuItem.click();
	}

	async clickSignOut() {
		await this.openUserMenu();
		await this.signOutMenuItem.click();
	}

	async isUpgradeAccountMenuItemVisible(): Promise<boolean> {
		await this.openUserMenu();
		const visible = await this.upgradeAccountMenuItem.isVisible();
		await this.closeUserMenu();
		return visible;
	}

	// ============================================================================
	// MAP CREATION
	// ============================================================================

	async clickNewMindMap() {
		await this.newMindMapButton.click();
	}

	async waitForCreateMapDialog(timeout = 5000) {
		await this.createMapDialog.waitFor({ state: 'visible', timeout });
	}

	async getMapCount(): Promise<number> {
		return await this.mapCards.count();
	}

	// ============================================================================
	// SETTINGS PANEL
	// ============================================================================

	async openSettings() {
		await this.clickSettings();
		await this.settingsPanel.waitFor({ state: 'visible', timeout: 5000 });
	}

	async clickBillingTab() {
		await this.billingTab.click();
	}

	async clickUpgradeInBilling() {
		await this.upgradeButton.click();
	}

	// ============================================================================
	// ONBOARDING MODAL
	// ============================================================================

	/**
	 * Dismisses the onboarding modal if it's present.
	 * The onboarding modal appears for new users on first visit.
	 */
	async dismissOnboardingIfPresent() {
		const skipButton = this.page.locator('button:has-text("Skip for now")');
		const getStartedButton = this.page.locator('button:has-text("Get Started")');

		try {
			// Wait a short time for modal to appear
			await this.page.waitForTimeout(500);

			if (await skipButton.isVisible()) {
				await skipButton.click();
				await this.page.waitForTimeout(500);
			} else if (await getStartedButton.isVisible()) {
				// Alternative: click through onboarding
				await getStartedButton.click();
				await this.page.waitForTimeout(500);
			}
		} catch {
			// Modal not present, continue
		}
	}

	// ============================================================================
	// ANONYMOUS SESSION HELPERS
	// ============================================================================

	/**
	 * Creates an anonymous session by visiting the dashboard.
	 * Anonymous users are created when they access the app without auth.
	 */
	async createAnonymousSession() {
		await this.goto();
		// Wait for the app to initialize
		await this.page.waitForLoadState('networkidle');
		// Give time for auth state to settle
		await this.page.waitForTimeout(1000);
		// Dismiss onboarding if present
		await this.dismissOnboardingIfPresent();
	}

	/**
	 * Creates an anonymous session by joining a shared map.
	 * This is more reliable for creating anonymous users.
	 */
	async createAnonymousSessionViaJoin(mapId: string) {
		// Navigate to join page for a map
		await this.page.goto(`/join`);
		await this.page.waitForLoadState('networkidle');
	}

	// ============================================================================
	// ASSERTIONS
	// ============================================================================

	async expectOnDashboard() {
		await expect(this.page).toHaveURL(/\/dashboard/);
	}

	async expectNotOnDashboard() {
		await expect(this.page).not.toHaveURL(/\/dashboard/);
	}
}
