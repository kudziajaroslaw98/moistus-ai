import { expect, Locator, Page } from '@playwright/test';

/**
 * Page Object Model for the Toolbar component.
 *
 * Handles interactions with:
 * - Cursor mode dropdown (Select, Pan, Connect)
 * - Tool buttons (Add Node, AI Suggestions, Layout, etc.)
 * - Permission-based visibility verification
 */
export class ToolbarPage {
	readonly page: Page;

	// Toolbar container
	readonly toolbar: Locator;

	// Cursor mode dropdown
	readonly cursorModeButton: Locator;
	readonly cursorModeDropdown: Locator;

	// Main toolbar buttons (by title attribute)
	readonly addNodeButton: Locator;
	readonly aiSuggestionsButton: Locator;
	readonly layoutButton: Locator;
	readonly exportButton: Locator;
	readonly presentButton: Locator;
	readonly chatButton: Locator;
	readonly commentsButton: Locator;
	readonly zoomButton: Locator;

	constructor(page: Page) {
		this.page = page;

		// Main toolbar container
		this.toolbar = page.locator('[data-testid="toolbar"]');

		// Cursor mode button (first button in toolbar)
		this.cursorModeButton = this.toolbar.locator('button').first();
		this.cursorModeDropdown = page.locator('[role="menu"]');

		// Toolbar buttons by title
		this.addNodeButton = this.toolbar.locator('button[title="Add Node"]');
		this.aiSuggestionsButton = this.toolbar.locator(
			'button[title="AI Suggestions"]'
		);
		this.layoutButton = this.toolbar.locator('button[title*="Layout"]');
		this.exportButton = this.toolbar.locator('button[title*="Export"]');
		this.presentButton = this.toolbar.locator('button[title="Guided Tour"]');
		this.chatButton = this.toolbar.locator('button[title="AI Chat"]');
		this.commentsButton = this.toolbar.locator('button[title*="Comments"]');
		this.zoomButton = this.toolbar.locator('button[title="Zoom"]');
	}

	// ============================================================================
	// CURSOR MODE INTERACTIONS
	// ============================================================================

	/**
	 * Opens the cursor mode dropdown.
	 */
	async openCursorModeDropdown() {
		await this.cursorModeButton.click();
		await this.cursorModeDropdown.waitFor({ state: 'visible', timeout: 3000 });
	}

	/**
	 * Gets all available cursor mode options.
	 */
	async getCursorModeOptions(): Promise<string[]> {
		await this.openCursorModeDropdown();
		const options = await this.cursorModeDropdown
			.locator('[role="menuitemradio"]')
			.allTextContents();
		await this.page.keyboard.press('Escape');
		return options.map((opt) => opt.trim());
	}

	/**
	 * Selects a specific cursor mode.
	 */
	async selectCursorMode(mode: 'Select' | 'Pan' | 'Connect') {
		await this.openCursorModeDropdown();
		await this.cursorModeDropdown
			.locator(`[role="menuitemradio"]:has-text("${mode}")`)
			.click();
	}

	// ============================================================================
	// BUTTON VISIBILITY ASSERTIONS
	// ============================================================================

	/**
	 * Asserts that a toolbar button with the given title is visible.
	 */
	async expectToolbarButtonVisible(title: string) {
		const button = this.toolbar.locator(`button[title="${title}"]`);
		await expect(button).toBeVisible();
	}

	/**
	 * Asserts that a toolbar button with the given title is NOT visible (hidden).
	 */
	async expectToolbarButtonHidden(title: string) {
		const button = this.toolbar.locator(`button[title="${title}"]`);
		await expect(button).not.toBeVisible();
	}

	/**
	 * Asserts that Add Node button is visible.
	 */
	async expectAddNodeButtonVisible() {
		await expect(this.addNodeButton).toBeVisible();
	}

	/**
	 * Asserts that Add Node button is hidden.
	 */
	async expectAddNodeButtonHidden() {
		await expect(this.addNodeButton).not.toBeVisible();
	}

	/**
	 * Asserts that AI Suggestions button is visible.
	 */
	async expectAiSuggestionsButtonVisible() {
		await expect(this.aiSuggestionsButton).toBeVisible();
	}

	/**
	 * Asserts that AI Suggestions button is hidden.
	 */
	async expectAiSuggestionsButtonHidden() {
		await expect(this.aiSuggestionsButton).not.toBeVisible();
	}

	/**
	 * Asserts that Layout button is visible.
	 */
	async expectLayoutButtonVisible() {
		await expect(this.layoutButton).toBeVisible();
	}

	/**
	 * Asserts that Layout button is hidden.
	 */
	async expectLayoutButtonHidden() {
		await expect(this.layoutButton).not.toBeVisible();
	}

	/**
	 * Asserts that Comments button is visible.
	 */
	async expectCommentsButtonVisible() {
		await expect(this.commentsButton).toBeVisible();
	}

	/**
	 * Asserts that Comments button is hidden.
	 */
	async expectCommentsButtonHidden() {
		await expect(this.commentsButton).not.toBeVisible();
	}

	/**
	 * Asserts that Export button is always visible (available to all roles).
	 */
	async expectExportButtonVisible() {
		await expect(this.exportButton).toBeVisible();
	}

	/**
	 * Asserts that Zoom button is always visible (available to all roles).
	 */
	async expectZoomButtonVisible() {
		await expect(this.zoomButton).toBeVisible();
	}

	/**
	 * Asserts that only Pan mode is available (viewer mode).
	 */
	async expectOnlyPanModeAvailable() {
		const options = await this.getCursorModeOptions();
		expect(options).toHaveLength(1);
		expect(options[0]).toContain('Pan');
	}

	/**
	 * Asserts that all cursor modes are available (editor mode).
	 */
	async expectAllCursorModesAvailable() {
		const options = await this.getCursorModeOptions();
		expect(options.length).toBeGreaterThanOrEqual(3);
		expect(options.some((opt) => opt.includes('Select'))).toBe(true);
		expect(options.some((opt) => opt.includes('Pan'))).toBe(true);
		expect(options.some((opt) => opt.includes('Connect'))).toBe(true);
	}

	// ============================================================================
	// BUTTON CLICKS
	// ============================================================================

	/**
	 * Clicks the Add Node button.
	 */
	async clickAddNode() {
		await this.addNodeButton.click();
	}

	/**
	 * Clicks the AI Chat button.
	 */
	async clickAiChat() {
		await this.chatButton.click();
	}

	/**
	 * Clicks the Comments button.
	 */
	async clickComments() {
		await this.commentsButton.click();
	}

	/**
	 * Clicks the Guided Tour button.
	 */
	async clickGuidedTour() {
		await this.presentButton.click();
	}

	/**
	 * Clicks the Zoom button.
	 */
	async clickZoom() {
		await this.zoomButton.click();
	}
}
