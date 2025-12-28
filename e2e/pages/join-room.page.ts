import { expect, Locator, Page } from '@playwright/test';

/**
 * Page Object for the Join Room flow.
 *
 * Handles interactions with:
 * - Manual room code entry (/join)
 * - Deep link join flow (/join/[token])
 * - Display name entry for anonymous users
 * - Success and error states
 */
export class JoinRoomPage {
	readonly page: Page;

	// Manual join form (/join page)
	readonly roomCodeInput: Locator;

	// Common elements (both /join and /join/[token])
	readonly displayNameInput: Locator;
	readonly joinButton: Locator;

	// Error state
	readonly errorState: Locator;
	readonly errorMessage: Locator;

	// Success indicators
	readonly successIndicator: Locator;

	constructor(page: Page) {
		this.page = page;

		// Manual join form input
		this.roomCodeInput = page
			.locator('input#roomCode')
			.or(page.locator('input[placeholder*="ABC-123"]'));

		// Display name input (uses data-testid)
		this.displayNameInput = page.locator('[data-testid="display-name-input"]');

		// Join button (uses data-testid)
		this.joinButton = page.locator('[data-testid="join-room-btn"]');

		// Error state container (uses data-testid)
		this.errorState = page.locator('[data-testid="join-error-state"]');

		// Error message text
		this.errorMessage = page.locator('.text-red-400').or(this.errorState);

		// Success indicators
		this.successIndicator = page
			.locator('text=Welcome')
			.or(page.locator('text=Redirecting'));
	}

	/**
	 * Navigates to the manual join page (/join).
	 */
	async gotoManualJoin() {
		await this.page.goto('/join');
		await this.page.waitForLoadState('networkidle');
	}

	/**
	 * Navigates to the deep link join page (/join/[token]).
	 */
	async gotoDeepLink(token: string) {
		await this.page.goto(`/join/${token}`);
		await this.page.waitForLoadState('networkidle');
	}

	/**
	 * Joins a room using the manual entry form.
	 */
	async joinWithToken(token: string, displayName: string) {
		await this.roomCodeInput.fill(token);
		await this.displayNameInput.fill(displayName);
		await this.joinButton.click();
	}

	/**
	 * Joins as a guest (for deep link flow).
	 * Waits for the display name input to be visible first.
	 */
	async joinAsGuest(displayName: string) {
		// Wait for the form to be ready (validation completes, form shows)
		await this.displayNameInput.waitFor({ state: 'visible', timeout: 10000 });
		await this.displayNameInput.fill(displayName);
		await this.joinButton.click();
	}

	/**
	 * Waits for successful join (redirect to mind map).
	 */
	async waitForSuccess(timeout = 30000) {
		// Wait for URL change to mind-map (most reliable indicator)
		// Increased timeout for slower browsers (webkit/firefox)
		await this.page.waitForURL(/\/mind-map\//, { timeout });
	}

	/**
	 * Waits for error state to appear.
	 */
	async waitForError(timeout = 10000) {
		await this.errorState.waitFor({ state: 'visible', timeout });
	}

	/**
	 * Asserts that a specific error message is displayed.
	 */
	async expectErrorMessage(expectedText: string | RegExp) {
		await this.waitForError();

		// Get the text from the error section
		const errorText = await this.errorState.textContent();

		if (typeof expectedText === 'string') {
			expect(errorText?.toLowerCase()).toContain(expectedText.toLowerCase());
		} else {
			expect(errorText).toMatch(expectedText);
		}
	}

	/**
	 * Gets the current error message text.
	 */
	async getErrorMessage(): Promise<string | null> {
		if (await this.errorState.isVisible()) {
			return await this.errorState.textContent();
		}
		return null;
	}

	/**
	 * Checks if currently on the join page (not redirected).
	 */
	async isOnJoinPage(): Promise<boolean> {
		const url = this.page.url();
		return url.includes('/join');
	}

	/**
	 * Checks if currently on the mind map page (successful join).
	 */
	async isOnMindMap(): Promise<boolean> {
		const url = this.page.url();
		return url.includes('/mind-map/');
	}
}
