import { expect, Locator, Page } from '@playwright/test';

/**
 * Page Object Model for the Node Editor component.
 *
 * The node editor is a floating modal with a CodeMirror-based input
 * that supports pattern recognition and syntax highlighting.
 */
export class NodeEditorPage {
	readonly page: Page;

	// Main container
	readonly container: Locator;

	// CodeMirror editor elements
	readonly input: Locator;
	readonly editorWrapper: Locator;

	// Action buttons
	readonly createButton: Locator;
	readonly cancelButton: Locator;

	// UI sections
	readonly previewSection: Locator;
	readonly parsingLegend: Locator;
	readonly examplesSection: Locator;

	// Completion dropdown (CodeMirror autocomplete)
	readonly completionDropdown: Locator;

	// Validation
	readonly validationTooltip: Locator;

	constructor(page: Page) {
		this.page = page;

		// Main container
		this.container = page.locator('[data-testid="node-editor"]');

		// CodeMirror editor - the contenteditable area
		this.input = page.locator('.cm-editor .cm-content');
		this.editorWrapper = page.locator('.cm-editor');

		// Action buttons
		this.createButton = page.locator('[data-testid="create-button"]');
		this.cancelButton = page.locator('[data-testid="cancel-button"]');

		// UI sections
		this.previewSection = page.locator('[data-testid="preview-section"]');
		this.parsingLegend = page.locator('[data-testid="parsing-legend"]');
		this.examplesSection = page.locator('[data-testid="examples-section"]');

		// Completion dropdown
		this.completionDropdown = page.locator('.cm-tooltip-autocomplete');

		// Validation tooltip
		this.validationTooltip = page.locator('[data-testid="validation-tooltip"]');
	}

	// ============================================================================
	// LIFECYCLE
	// ============================================================================

	async waitForOpen() {
		await this.container.waitFor({ state: 'visible' });
		// Wait for CodeMirror to initialize
		await this.input.waitFor({ state: 'visible' });
	}

	async waitForClose() {
		await this.container.waitFor({ state: 'hidden' });
	}

	// ============================================================================
	// INPUT ACTIONS
	// ============================================================================

	/**
	 * Type content into the editor.
	 * Uses fill for fast input (replaces existing content).
	 */
	async typeContent(content: string) {
		await this.input.click();
		// Clear existing content first - use Control+a for cross-platform compatibility
		const selectAll = process.platform === 'darwin' ? 'Meta+a' : 'Control+a';
		await this.page.keyboard.press(selectAll);
		await this.page.keyboard.press('Backspace');
		// Type new content
		await this.page.keyboard.type(content, { delay: 20 });
	}

	/**
	 * Type a pattern with delay to trigger completions.
	 * Useful for testing autocomplete behavior.
	 */
	async typePattern(pattern: string) {
		await this.input.click();
		await this.page.keyboard.press('End');
		await this.page.keyboard.type(pattern, { delay: 50 });
	}

	/**
	 * Type a completion trigger and wait for the dropdown.
	 */
	async triggerCompletion(prefix: string) {
		await this.typePattern(prefix);
		await this.completionDropdown.waitFor({ state: 'visible', timeout: 2000 });
	}

	/**
	 * Select a completion item by index (0-based).
	 */
	async selectCompletion(index: number) {
		for (let i = 0; i < index; i++) {
			await this.page.keyboard.press('ArrowDown');
		}
		await this.page.keyboard.press('Enter');
	}

	/**
	 * Clear the editor content.
	 */
	async clear() {
		await this.input.click();
		const selectAll = process.platform === 'darwin' ? 'Meta+a' : 'Control+a';
		await this.page.keyboard.press(selectAll);
		await this.page.keyboard.press('Backspace');
	}

	/**
	 * Get the current text content of the editor.
	 */
	async getContent(): Promise<string> {
		return (await this.input.textContent()) || '';
	}

	// ============================================================================
	// FORM ACTIONS
	// ============================================================================

	/**
	 * Click the create button to create/update the node.
	 */
	async create() {
		await this.createButton.click();
		await this.waitForClose();
	}

	/**
	 * Press Ctrl/Cmd+Enter to create the node via keyboard.
	 */
	async pressCtrlEnter() {
		const isMac = process.platform === 'darwin';
		await this.page.keyboard.press(isMac ? 'Meta+Enter' : 'Control+Enter');
	}

	/**
	 * Close the editor without saving (Escape).
	 */
	async close() {
		await this.page.keyboard.press('Escape');
		await this.waitForClose();
	}

	/**
	 * Toggle the parsing legend with keyboard shortcut.
	 */
	async toggleLegend() {
		const isMac = process.platform === 'darwin';
		await this.page.keyboard.press(isMac ? 'Meta+/' : 'Control+/');
	}

	// ============================================================================
	// PATTERN HIGHLIGHT LOCATORS
	// ============================================================================

	/**
	 * Get a locator for a highlighted tag pattern.
	 * CSS class: cm-pattern-tag
	 */
	getTagHighlight(tagName: string): Locator {
		return this.editorWrapper.locator(
			`.cm-pattern-tag:has-text("#${tagName}")`
		);
	}

	/**
	 * Get a locator for any tag highlight.
	 */
	getAnyTagHighlight(): Locator {
		return this.editorWrapper.locator('.cm-pattern-tag');
	}

	/**
	 * Get a locator for a highlighted assignee pattern.
	 * CSS class: cm-pattern-assignee
	 */
	getAssigneeHighlight(name: string): Locator {
		return this.editorWrapper.locator(
			`.cm-pattern-assignee:has-text("@${name}")`
		);
	}

	/**
	 * Get a locator for any assignee highlight.
	 */
	getAnyAssigneeHighlight(): Locator {
		return this.editorWrapper.locator('.cm-pattern-assignee');
	}

	/**
	 * Get a locator for a highlighted date pattern.
	 * CSS class: cm-pattern-date
	 */
	getDateHighlight(): Locator {
		return this.editorWrapper.locator('.cm-pattern-date');
	}

	/**
	 * Get a locator for a highlighted priority pattern.
	 * CSS classes: cm-pattern-priority-high, cm-pattern-priority-medium, cm-pattern-priority-low
	 */
	getPriorityHighlight(level: 'high' | 'medium' | 'low'): Locator {
		return this.editorWrapper.locator(`.cm-pattern-priority-${level}`);
	}

	/**
	 * Get a locator for a highlighted status pattern.
	 * CSS class: cm-pattern-status
	 */
	getStatusHighlight(): Locator {
		return this.editorWrapper.locator('.cm-pattern-status');
	}

	/**
	 * Get a locator for a highlighted node type command.
	 * CSS class: cm-pattern-nodetype
	 */
	getNodeTypeHighlight(): Locator {
		return this.editorWrapper.locator('.cm-pattern-nodetype');
	}

	/**
	 * Get a locator for a highlighted reference.
	 * CSS class: cm-pattern-reference
	 */
	getReferenceHighlight(): Locator {
		return this.editorWrapper.locator('.cm-pattern-reference');
	}

	/**
	 * Get a locator for a highlighted unchecked checkbox.
	 * CSS class: cm-pattern-checkbox-unchecked
	 */
	getUncheckedCheckboxHighlight(): Locator {
		return this.editorWrapper.locator('.cm-pattern-checkbox-unchecked');
	}

	/**
	 * Get a locator for a highlighted checked checkbox.
	 * CSS class: cm-pattern-checkbox-checked
	 */
	getCheckedCheckboxHighlight(): Locator {
		return this.editorWrapper.locator('.cm-pattern-checkbox-checked');
	}

	/**
	 * Get a locator for a highlighted color pattern.
	 * CSS class: cm-pattern-color-bg (background), cm-pattern-color-value (value)
	 */
	getColorHighlight(): Locator {
		return this.editorWrapper.locator('.cm-pattern-color-bg');
	}

	// ============================================================================
	// ASSERTIONS
	// ============================================================================

	async expectOpen() {
		await expect(this.container).toBeVisible();
	}

	async expectClosed() {
		await expect(this.container).not.toBeVisible();
	}

	async expectPatternHighlighted(
		patternType:
			| 'tag'
			| 'assignee'
			| 'date'
			| 'status'
			| 'nodetype'
			| 'reference'
	) {
		const classMap: Record<string, string> = {
			tag: '.cm-pattern-tag',
			assignee: '.cm-pattern-assignee',
			date: '.cm-pattern-date',
			status: '.cm-pattern-status',
			nodetype: '.cm-pattern-nodetype',
			reference: '.cm-pattern-reference',
		};
		await expect(
			this.editorWrapper.locator(classMap[patternType])
		).toBeVisible();
	}

	async expectCompletionVisible() {
		await expect(this.completionDropdown).toBeVisible();
	}

	async expectCompletionHidden() {
		await expect(this.completionDropdown).not.toBeVisible();
	}

	async expectValidationError() {
		await expect(this.validationTooltip).toBeVisible();
	}

	async expectValidationHidden() {
		await expect(this.validationTooltip).not.toBeVisible();
	}
}
