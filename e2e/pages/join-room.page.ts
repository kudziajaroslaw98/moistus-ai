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
	 * First dismisses any blocking modals and ensures clean navigation.
	 */
	async gotoDeepLink(token: string) {
		// Dismiss onboarding modal if present on current page
		// This can block navigation if we're on the mind-map page
		await this.dismissOnboardingIfPresent();

		await this.page.goto(`/join/${token}`);
		await this.page.waitForLoadState('networkidle');

		// Verify we landed on the join page
		const currentUrl = this.page.url();
		if (!currentUrl.includes('/join/')) {
			console.log(`Unexpected URL after navigation: ${currentUrl}, forcing reload`);
			await this.page.goto(`/join/${token}`, { waitUntil: 'networkidle' });
		}
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
	 * Also dismisses the onboarding modal if it appears.
	 */
	async waitForSuccess(timeout = 30000) {
		// Wait for URL change to mind-map (most reliable indicator)
		// Increased timeout for slower browsers (webkit/firefox)
		await this.page.waitForURL(/\/mind-map\//, { timeout });

		// Dismiss onboarding modal if it appears
		// The modal shows for new anonymous users and blocks all interactions
		await this.dismissOnboardingIfPresent();
	}

	/**
	 * Dismisses the onboarding modal if present.
	 * The modal has a "Skip for now" button that closes it.
	 */
	async dismissOnboardingIfPresent() {
		try {
			// Check if the onboarding skip button is visible
			const skipButton = this.page.getByRole('button', { name: 'Skip for now' });

			// Wait briefly for the modal to potentially appear
			await skipButton.waitFor({ state: 'visible', timeout: 2000 });

			// Click skip to dismiss
			await skipButton.click();
			console.log('Dismissed onboarding modal');

			// Wait for modal to close
			await this.page.waitForTimeout(500);
		} catch {
			// Modal not present, which is fine
		}
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
