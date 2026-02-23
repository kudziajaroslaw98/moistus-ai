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
	readonly roleSelector: Locator;
	readonly roleSelectorTrigger: Locator;

	// Room code display
	readonly roomCodeValues: Locator;
	readonly copyButton: Locator;
	readonly revokeButton: Locator; // Now uses data-testid

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
		this.roleSelector = this.panel.locator('[data-testid="role-selector"]');
		this.roleSelectorTrigger = this.panel.locator(
			'[data-testid="role-selector-trigger"]'
		);

		// Room code display elements
		this.roomCodeValues = this.panel.locator('[data-testid="room-code-value"]');
		this.copyButton = this.panel.locator('button[title="Copy room code"]');
		this.revokeButton = this.panel.locator(
			'[data-testid="revoke-room-code-btn"]'
		);
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
	 * The "Generate Code" button is inside this collapsible section.
	 * Settings are expanded by default, so this just ensures they're open.
	 */
	async openSettings() {
		// First make sure we're on the Room Code tab
		const isRoomCodeTabSelected =
			await this.roomCodeTab.getAttribute('data-state');
		if (isRoomCodeTabSelected !== 'active') {
			await this.roomCodeTab.click();
			await this.page.waitForTimeout(200);
		}

		// Wait for settings toggle to be visible
		await this.settingsToggle.waitFor({ state: 'visible', timeout: 5000 });

		// Check if settings are already expanded
		const isExpanded =
			(await this.settingsToggle.getAttribute('aria-expanded')) === 'true';

		if (!isExpanded) {
			await this.settingsToggle.click();
			// Wait for animation
			await this.page.waitForTimeout(300);
		}

		// Verify generate button is visible
		await this.generateButton.waitFor({ state: 'visible', timeout: 5000 });
	}

	/**
	 * Sets the max users limit for the room code.
	 */
	async setMaxUsers(maxUsers: number) {
		await this.openSettings();
		await this.maxUsersInput.fill(String(maxUsers));
	}

	/**
	 * Sets the default permission role for the room code.
	 */
	async setRole(role: 'viewer' | 'commentator' | 'editor') {
		await this.openSettings();

		// Give animation time to complete
		await this.page.waitForTimeout(300);

		// Scroll trigger into view and click
		await this.roleSelectorTrigger.scrollIntoViewIfNeeded();
		await this.roleSelectorTrigger.click({ force: true });

		// Wait for the dropdown to appear (Radix Select uses data-slot and role="listbox")
		// The dropdown is rendered in a portal, so we need to search globally
		const roleContent = this.page.locator('[data-slot="select-content"]');
		await roleContent.waitFor({ state: 'visible', timeout: 5000 });

		// Wait for animation to stabilize
		await this.page.waitForTimeout(200);

		// Map role to the start of the option text
		const roleTextMap: Record<string, string> = {
			viewer: 'Viewer',
			commentator: 'Commentator',
			editor: 'Editor',
		};

		// Click the option using role="option" and text matching
		const option = roleContent.locator(`[role="option"]`).filter({
			hasText: roleTextMap[role],
		});
		await option.scrollIntoViewIfNeeded();
		await option.click({ force: true });

		// Wait for dropdown to close
		await roleContent.waitFor({ state: 'hidden', timeout: 3000 });
	}

	/**
	 * Generates a room code with the specified settings.
	 * Returns the generated room code string.
	 */
	async generateRoomCode(options?: {
		role?: 'viewer' | 'commentator' | 'editor';
		maxUsers?: number;
	}): Promise<string> {
		// Wait for panel to load existing codes from API
		await this.page.waitForLoadState('networkidle');

		// Ensure settings section is expanded (button is inside it)
		await this.openSettings();

		// Wait for generate button to be visible (it's inside the collapsible settings)
		await this.generateButton.waitFor({ state: 'visible', timeout: 5000 });

		if (options?.role !== undefined) {
			await this.setRole(options.role);
		}

		if (options?.maxUsers !== undefined) {
			await this.setMaxUsers(options.maxUsers);
		}

		// Wait for any previous generation to complete
		await expect(this.generateButton).toBeEnabled();

		await this.generateButton.click();

		// Wait for the new code to appear
		await this.page.waitForTimeout(500);

		// Wait for at least one code to be visible
		await this.roomCodeValues
			.first()
			.waitFor({ state: 'visible', timeout: 10000 });

		// Get the first code (newest codes appear first in the list)
		const code = await this.roomCodeValues.first().textContent();

		if (!code) throw new Error('Failed to get room code');

		return code;
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
	 * Waits for codes to load from API before attempting to revoke.
	 */
	async revokeAllCodes() {
		// Wait a moment for the panel to load room codes from API
		await this.page.waitForTimeout(500);

		// Keep revoking until no more codes exist
		let attempts = 0;
		const maxAttempts = 20;

		while (attempts < maxAttempts) {
			// Check if there are any codes left
			const initialCount = await this.roomCodeValues.count();
			if (initialCount === 0) {
				break; // No more codes to revoke
			}

			console.log(
				`revokeAllCodes: ${initialCount} codes remaining, attempt ${attempts + 1}`
			);

			// Use data-testid selector (most reliable)
			const revokeButtons = this.panel.locator(
				'[data-testid="revoke-room-code-btn"]'
			);
			const buttonCount = await revokeButtons.count();

			console.log(`revokeAllCodes: Found ${buttonCount} revoke buttons`);

			if (buttonCount > 0) {
				// Click the first revoke button
				const firstButton = revokeButtons.first();
				await firstButton.scrollIntoViewIfNeeded();
				await this.page.waitForTimeout(100); // Brief pause for scroll

				// Click WITHOUT force to ensure React event handler is triggered
				await firstButton.click();

				// Wait for the code to be removed from the list
				try {
					await expect(this.roomCodeValues).toHaveCount(initialCount - 1, {
						timeout: 5000,
					});
					console.log(
						`revokeAllCodes: Successfully revoked, now ${initialCount - 1} codes`
					);
				} catch {
					// If count didn't decrease, log and retry
					const newCount = await this.roomCodeValues.count();
					console.log(
						`revokeAllCodes: Count didn't decrease as expected. Expected ${initialCount - 1}, got ${newCount}`
					);
					await this.page.waitForTimeout(1000);
				}
			} else {
				// No revoke buttons found, break to avoid infinite loop
				console.log(
					`Warning: ${initialCount} codes remain but no revoke buttons found`
				);
				break;
			}

			attempts++;
		}

		// Verify all codes are gone
		const remainingCodes = await this.roomCodeValues.count();
		if (remainingCodes > 0) {
			console.log(
				`Warning: revokeAllCodes finished but ${remainingCodes} codes remain after ${attempts} attempts`
			);
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
