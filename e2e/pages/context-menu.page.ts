import { expect, Locator, Page } from '@playwright/test';

/**
 * Page Object Model for the Context Menu.
 *
 * Handles interactions with:
 * - Node context menu options (Edit, Add Child, Delete, etc.)
 * - Edge context menu options (Delete Edge, Toggle Animation)
 * - Pane context menu options (Add Node Here, AI features)
 * - Permission-based visibility verification
 */
export class ContextMenuPage {
	readonly page: Page;

	// Context menu container
	readonly contextMenu: Locator;

	// Node menu items
	readonly editNodeOption: Locator;
	readonly addChildOption: Locator;
	readonly deleteNodeOption: Locator;
	readonly collapseOption: Locator;
	readonly expandOption: Locator;
	readonly removeFromGroupOption: Locator;
	readonly generateCounterpointsOption: Locator;

	// Edge menu items
	readonly deleteEdgeOption: Locator;
	readonly toggleAnimationOption: Locator;
	readonly edgeStyleSection: Locator;

	// Pane menu items
	readonly addNodeHereOption: Locator;
	readonly addReferenceOption: Locator;
	readonly suggestConnectionsOption: Locator;
	readonly suggestMergesOption: Locator;

	// Group menu items
	readonly groupSelectedOption: Locator;
	readonly ungroupOption: Locator;

	constructor(page: Page) {
		this.page = page;

		// Main context menu container
		this.contextMenu = page.locator('[data-testid="context-menu"]');

		// Node menu items
		this.editNodeOption = page.locator('[data-testid="context-menu-edit-node"]');
		this.addChildOption = page.locator('[data-testid="context-menu-add-child"]');
		this.deleteNodeOption = page.locator(
			'[data-testid="context-menu-delete-node"]'
		);
		this.collapseOption = page.locator(
			'[data-testid="context-menu-toggle-collapse"]:has-text("Collapse")'
		);
		this.expandOption = page.locator(
			'[data-testid="context-menu-toggle-collapse"]:has-text("Expand")'
		);
		this.removeFromGroupOption = page.locator(
			'[data-testid="context-menu-remove-from-group"]'
		);
		this.generateCounterpointsOption = page.locator(
			'[data-testid="context-menu-generate-counterpoints"]'
		);

		// Edge menu items
		this.deleteEdgeOption = page.locator(
			'[data-testid="context-menu-delete-edge"]'
		);
		this.toggleAnimationOption = page.locator(
			'[data-testid="context-menu-toggle-animation"]'
		);
		this.edgeStyleSection = page.locator(
			'[data-testid="context-menu-edge-style-options"]'
		);

		// Pane menu items
		this.addNodeHereOption = page.locator(
			'[data-testid="context-menu-add-node"]'
		);
		this.addReferenceOption = page.locator(
			'[data-testid="context-menu-add-reference"]'
		);
		this.suggestConnectionsOption = page.locator(
			'[data-testid="context-menu-suggest-connections"]'
		);
		this.suggestMergesOption = page.locator(
			'[data-testid="context-menu-suggest-merges"]'
		);

		// Group menu items
		this.groupSelectedOption = page.locator(
			'[data-testid="context-menu-group-selected"]'
		);
		this.ungroupOption = page.locator('[data-testid="context-menu-ungroup"]');
	}

	// ============================================================================
	// MENU STATE
	// ============================================================================

	/**
	 * Waits for the context menu to become visible.
	 */
	async waitForOpen(timeout = 5000) {
		await this.contextMenu.waitFor({ state: 'visible', timeout });
	}

	/**
	 * Waits for the context menu to become hidden.
	 */
	async waitForClosed(timeout = 5000) {
		await this.contextMenu.waitFor({ state: 'hidden', timeout });
	}

	/**
	 * Closes the context menu by pressing Escape.
	 */
	async close() {
		await this.page.keyboard.press('Escape');
		await this.waitForClosed();
	}

	/**
	 * Checks if the context menu is currently visible.
	 */
	async isOpen(): Promise<boolean> {
		return await this.contextMenu.isVisible();
	}

	// ============================================================================
	// NODE MENU ASSERTIONS (for permission testing)
	// ============================================================================

	/**
	 * Asserts that edit options are visible (editor mode).
	 */
	async expectEditOptionsVisible() {
		await expect(this.editNodeOption).toBeVisible();
		await expect(this.addChildOption).toBeVisible();
		await expect(this.deleteNodeOption).toBeVisible();
	}

	/**
	 * Asserts that edit options are hidden (viewer mode).
	 */
	async expectEditOptionsHidden() {
		await expect(this.editNodeOption).not.toBeVisible();
		await expect(this.addChildOption).not.toBeVisible();
		await expect(this.deleteNodeOption).not.toBeVisible();
	}

	/**
	 * Asserts that collapse/expand option is visible (available to all roles).
	 */
	async expectCollapseExpandVisible() {
		// Either collapse or expand should be visible based on node state
		const collapseVisible = await this.collapseOption.isVisible();
		const expandVisible = await this.expandOption.isVisible();
		expect(collapseVisible || expandVisible).toBe(true);
	}

	/**
	 * Asserts that AI options are visible (editor mode).
	 */
	async expectAiOptionsVisible() {
		await expect(this.generateCounterpointsOption).toBeVisible();
	}

	/**
	 * Asserts that AI options are hidden (viewer mode).
	 */
	async expectAiOptionsHidden() {
		await expect(this.generateCounterpointsOption).not.toBeVisible();
	}

	// ============================================================================
	// EDGE MENU ASSERTIONS
	// ============================================================================

	/**
	 * Asserts that edge edit options are visible (editor mode).
	 */
	async expectEdgeEditOptionsVisible() {
		await expect(this.deleteEdgeOption).toBeVisible();
	}

	/**
	 * Asserts that edge edit options are hidden (viewer mode).
	 */
	async expectEdgeEditOptionsHidden() {
		await expect(this.deleteEdgeOption).not.toBeVisible();
	}

	// ============================================================================
	// PANE MENU ASSERTIONS
	// ============================================================================

	/**
	 * Asserts that pane add options are visible (editor mode).
	 */
	async expectPaneAddOptionsVisible() {
		await expect(this.addNodeHereOption).toBeVisible();
		await expect(this.addReferenceOption).toBeVisible();
	}

	/**
	 * Asserts that pane add options are hidden (viewer mode).
	 */
	async expectPaneAddOptionsHidden() {
		await expect(this.addNodeHereOption).not.toBeVisible();
		await expect(this.addReferenceOption).not.toBeVisible();
	}

	// ============================================================================
	// MENU ITEM CLICKS
	// ============================================================================

	/**
	 * Clicks the Edit Node option.
	 */
	async clickEditNode() {
		await this.editNodeOption.click();
	}

	/**
	 * Clicks the Add Child option.
	 */
	async clickAddChild() {
		await this.addChildOption.click();
	}

	/**
	 * Clicks the Delete Node option.
	 */
	async clickDeleteNode() {
		await this.deleteNodeOption.click();
	}

	/**
	 * Clicks the Collapse/Expand option.
	 */
	async clickToggleCollapse() {
		const collapseVisible = await this.collapseOption.isVisible();
		if (collapseVisible) {
			await this.collapseOption.click();
		} else {
			await this.expandOption.click();
		}
	}

	/**
	 * Clicks the Delete Edge option.
	 */
	async clickDeleteEdge() {
		await this.deleteEdgeOption.click();
	}

	/**
	 * Clicks the Add Node Here option.
	 */
	async clickAddNodeHere() {
		await this.addNodeHereOption.click();
	}

	/**
	 * Clicks the Generate Counterpoints option.
	 */
	async clickGenerateCounterpoints() {
		await this.generateCounterpointsOption.click();
	}

	/**
	 * Gets all visible menu item labels.
	 */
	async getVisibleMenuItems(): Promise<string[]> {
		const items = this.contextMenu.locator('button[role="menuitem"]');
		return await items.allTextContents();
	}

	/**
	 * Gets the count of visible menu items.
	 */
	async getVisibleMenuItemCount(): Promise<number> {
		const items = this.contextMenu.locator('button[role="menuitem"]');
		return await items.count();
	}
}
