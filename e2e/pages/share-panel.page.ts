import { expect, Locator, Page } from '@playwright/test';

/**
 * Page Object for the Share Panel component.
 *
 * Handles interactions with:
 * - Opening/closing the share panel
 * - Configuring room code settings (max users, role, expiration)
 * - Generating room codes
 * - Managing existing room codes (copy, revoke, refresh)
 */
export class SharePanelPage {
	readonly page: Page;

	// Trigger button (in top bar)
	readonly shareButton: Locator;

	// Panel container
	readonly panel: Locator;

	// Tabs
	readonly roomCodeTab: Locator;
	readonly manageTab: Locator;

	// Settings section
	readonly settingsToggle: Locator;
	readonly maxUsersInput: Locator;
	readonly generateButton: Locator;

	// Room code display
	readonly roomCodeValues: Locator;
	readonly copyButton: Locator;
	readonly revokeButton: Locator;

	constructor(page: Page) {
		this.page = page;

		// Share button in top bar
		this.shareButton = page.locator('[data-testid="share-button"]');

		// Panel container
		this.panel = page.locator('[data-testid="share-panel"]');

		// Tabs
		this.roomCodeTab = this.panel.locator('[role="tab"]:has-text("Room Code")');
		this.manageTab = this.panel.locator('[role="tab"]:has-text("Manage")');

		// Settings
		this.settingsToggle = this.panel.locator(
			'button:has-text("Room Code Settings")'
		);
		this.maxUsersInput = this.panel.locator('[data-testid="max-users-input"]');
		this.generateButton = this.panel.locator(
			'[data-testid="generate-room-code-btn"]'
		);

		// Room code display elements
		this.roomCodeValues = this.panel.locator('[data-testid="room-code-value"]');
		this.copyButton = this.panel.locator('button[title="Copy room code"]');
		this.revokeButton = this.panel.locator('button[title="Revoke room code"]');
	}

	/**
	 * Opens the share panel by clicking the share button in the top bar.
	 */
	async openPanel() {
		await this.shareButton.click();
		await this.panel.waitFor({ state: 'visible', timeout: 5000 });
	}

	/**
	 * Waits for the share panel to be visible.
	 */
	async waitForOpen() {
		await this.panel.waitFor({ state: 'visible', timeout: 5000 });
	}

	/**
	 * Waits for the share panel to be hidden.
	 */
	async waitForClosed() {
		await this.panel.waitFor({ state: 'hidden', timeout: 5000 });
	}

	/**
	 * Opens the settings collapsible section if it's closed.
	 */
	async openSettings() {
		// Check if settings are already expanded by looking for the input
		const isVisible = await this.maxUsersInput.isVisible();
		if (!isVisible) {
			await this.settingsToggle.click();
			await this.maxUsersInput.waitFor({ state: 'visible' });
		}
	}

	/**
	 * Sets the max users limit for the room code.
	 */
	async setMaxUsers(maxUsers: number) {
		await this.openSettings();
		await this.maxUsersInput.fill(String(maxUsers));
	}

	/**
	 * Generates a room code with the specified settings.
	 * Returns the generated room code string.
	 */
	async generateRoomCode(options?: { maxUsers?: number }): Promise<string> {
		await this.openSettings();

		if (options?.maxUsers !== undefined) {
			await this.setMaxUsers(options.maxUsers);
		}

		// Wait for any previous generation to complete
		await expect(this.generateButton).toBeEnabled();

		await this.generateButton.click();

		// Wait for the room code to appear
		// The first new room code will be visible
		await this.page.waitForTimeout(500); // Allow animation to start
		await this.roomCodeValues.first().waitFor({ state: 'visible', timeout: 10000 });

		const roomCode = await this.roomCodeValues.first().textContent();
		if (!roomCode) throw new Error('Failed to get room code');

		return roomCode;
	}

	/**
	 * Gets all visible room codes.
	 */
	async getRoomCodes(): Promise<string[]> {
		const codes = await this.roomCodeValues.allTextContents();
		return codes;
	}

	/**
	 * Revokes all active room codes.
	 */
	async revokeAllCodes() {
		const count = await this.revokeButton.count();

		// Revoke from last to first to avoid index issues
		for (let i = count - 1; i >= 0; i--) {
			await this.revokeButton.nth(i).click();
			await this.page.waitForTimeout(500); // Wait for animation and API call
		}
	}

	/**
	 * Revokes a specific room code by its displayed value.
	 */
	async revokeCode(roomCode: string) {
		// Find the room code display container and click its revoke button
		const container = this.panel.locator(
			`[data-testid="room-code-value"]:has-text("${roomCode}")`
		);
		await container
			.locator('..')
			.locator('..')
			.locator('button[title="Revoke room code"]')
			.click();
		await this.page.waitForTimeout(500);
	}

	/**
	 * Copies the first room code to clipboard.
	 */
	async copyFirstCode() {
		await this.copyButton.first().click();
	}
}
