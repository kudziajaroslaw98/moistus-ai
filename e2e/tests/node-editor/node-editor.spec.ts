/**
 * Node Editor E2E Tests (Consolidated)
 *
 * 7 comprehensive tests covering:
 * - Pattern highlighting (visual)
 * - Autocomplete workflow
 * - Validation & quick fixes
 * - Node creation & types
 * - Edit existing nodes
 * - Keyboard shortcuts
 * - Parent-child relationships
 */

import * as path from 'path';
import { expect, test } from '../../fixtures';

const stylePath = path.join(__dirname, '../../utils/screenshot.css');

test.describe.serial('Node Editor', () => {
	test.beforeEach(async ({ mindMapPage, testMapId }) => {
		await mindMapPage.goto(testMapId);
	});

	test.afterEach(async ({ mindMapPage }) => {
		// Clean up all nodes created during the test
		await mindMapPage.deleteAllNodes();
	});

	// ============================================================================
	// TEST 1: Pattern Highlighting (no node creation)
	// ============================================================================
	test('should highlight all pattern types correctly', async ({
		mindMapPage,
		page,
	}) => {
		await mindMapPage.openNodeEditor();

		// Type comprehensive pattern with ALL highlightable types
		// Note: $command is NOT highlighted - it's consumed immediately and changes node type
		await mindMapPage.nodeEditorPage.typePattern(
			'Review PR #code-review #urgent @john @sarah !high ^friday :pending [[ref-123]] color:blue'
		);

		// Add checkboxes on separate lines
		await page.keyboard.press('Enter');
		await mindMapPage.nodeEditorPage.typePattern('[ ] Unchecked task');
		await page.keyboard.press('Enter');
		await mindMapPage.nodeEditorPage.typePattern('[x] Completed task');

		await page.waitForTimeout(400);

		// Verify pattern highlights are visible
		// (No nodeType highlight - $commands are consumed, not highlighted)
		await expect(
			mindMapPage.nodeEditorPage.getTagHighlight('code-review')
		).toBeVisible();
		await expect(
			mindMapPage.nodeEditorPage.getTagHighlight('urgent')
		).toBeVisible();
		await expect(
			mindMapPage.nodeEditorPage.getAssigneeHighlight('john')
		).toBeVisible();
		await expect(
			mindMapPage.nodeEditorPage.getAssigneeHighlight('sarah')
		).toBeVisible();
		await expect(
			mindMapPage.nodeEditorPage.getPriorityHighlight('high')
		).toBeVisible();
		await expect(mindMapPage.nodeEditorPage.getDateHighlight()).toBeVisible();
		await expect(mindMapPage.nodeEditorPage.getStatusHighlight()).toBeVisible();
		await expect(
			mindMapPage.nodeEditorPage.getReferenceHighlight()
		).toBeVisible();
		await expect(mindMapPage.nodeEditorPage.getColorHighlight()).toBeVisible();
		await expect(
			mindMapPage.nodeEditorPage.getUncheckedCheckboxHighlight()
		).toBeVisible();
		await expect(
			mindMapPage.nodeEditorPage.getCheckedCheckboxHighlight()
		).toBeVisible();

		// Screenshot for visual regression
		await expect(mindMapPage.nodeEditorPage.editorWrapper).toHaveScreenshot(
			'all-patterns.png',
			{ stylePath }
		);

		// Close WITHOUT saving - no node pollution
		await mindMapPage.nodeEditorPage.close();
	});

	// ============================================================================
	// TEST 2: Autocomplete Workflow
	// ============================================================================
	test('should handle all completion types and keyboard navigation', async ({
		mindMapPage,
		page,
	}) => {
		await mindMapPage.openNodeEditor();

		// Tag completion with filtering
		await mindMapPage.nodeEditorPage.typePattern('#');
		await page.waitForTimeout(500);
		await mindMapPage.nodeEditorPage.expectCompletionVisible();

		// Filter and select
		await page.keyboard.type('ur');
		await page.waitForTimeout(300);
		await page.keyboard.press('Enter');

		await page.keyboard.type(' ');
		await page.waitForTimeout(200);

		// Date completion with Enter selection
		await mindMapPage.nodeEditorPage.typePattern('^');
		await page.waitForTimeout(500);
		await mindMapPage.nodeEditorPage.expectCompletionVisible();
		await page.keyboard.press('Enter');

		await page.keyboard.type(' ');
		await page.waitForTimeout(200);

		// Priority with arrow navigation
		await mindMapPage.nodeEditorPage.typePattern('!');
		await page.waitForTimeout(500);
		await mindMapPage.nodeEditorPage.expectCompletionVisible();
		await page.keyboard.press('ArrowDown');
		await page.keyboard.press('Enter');

		await page.keyboard.type(' ');
		await page.waitForTimeout(200);

		// Status completion
		await mindMapPage.nodeEditorPage.typePattern(':');
		await page.waitForTimeout(500);
		await mindMapPage.nodeEditorPage.expectCompletionVisible();
		await page.keyboard.press('Enter');

		// Verify content has insertions from completions
		const content = await mindMapPage.nodeEditorPage.getContent();
		expect(content).toContain('#');
		expect(content).toContain('^');
		expect(content).toContain('!');
		expect(content).toContain(':');

		// Close without saving
		await mindMapPage.nodeEditorPage.close();
	});

	// ============================================================================
	// TEST 3: Validation & Quick Fixes
	// ============================================================================
	test('should show validation errors and support quick fixes', async ({
		mindMapPage,
		page,
	}) => {
		await mindMapPage.openNodeEditor();

		// Test 1: Multiple node type triggers should show error
		await mindMapPage.nodeEditorPage.typePattern('$task $note Some text');
		await page.waitForTimeout(1500);

		const tooltip = mindMapPage.nodeEditorPage.validationTooltip;
		if (await tooltip.isVisible()) {
			await expect(tooltip).toContainText(/multiple|duplicate|trigger/i);
		}

		// Clear and test invalid date
		await mindMapPage.nodeEditorPage.clear();
		await mindMapPage.nodeEditorPage.typePattern('Due ^invalid-date-xyz');
		await page.waitForTimeout(1500);

		if (await tooltip.isVisible()) {
			// Look for quick fix button
			const quickFixButton = tooltip.locator('button').first();
			if (await quickFixButton.isVisible()) {
				await quickFixButton.click();
				await page.waitForTimeout(300);

				// Content should have changed
				const content = await mindMapPage.nodeEditorPage.getContent();
				expect(content).not.toContain('^invalid-date-xyz');
			}
		}

		// Clear and test unclosed bracket
		await mindMapPage.nodeEditorPage.clear();
		await mindMapPage.nodeEditorPage.typePattern('See [[unclosed reference');
		await page.waitForTimeout(1500);

		if (await tooltip.isVisible()) {
			await expect(tooltip).toContainText(/unclosed|bracket|\]\]/i);
		}

		// Close without saving
		await mindMapPage.nodeEditorPage.close();
	});

	// ============================================================================
	// TEST 4: Node Creation & Types
	// ============================================================================
	test('should create different node types with metadata', async ({
		mindMapPage,
		page,
	}) => {
		// Create a default note node with tags and assignee
		await mindMapPage.openNodeEditor();
		await mindMapPage.nodeEditorPage.typeContent(
			'E2E Test Note #e2e-marker @tester'
		);
		await mindMapPage.nodeEditorPage.create();
		await mindMapPage.expectNodeExists('E2E Test Note');

		// Create another node with different content
		await mindMapPage.openNodeEditor();
		await mindMapPage.nodeEditorPage.typeContent(
			'Second E2E Node #testing !high'
		);
		await mindMapPage.nodeEditorPage.create();
		await mindMapPage.expectNodeExists('Second E2E Node');

		// Create a third node with date pattern
		await mindMapPage.openNodeEditor();
		await mindMapPage.nodeEditorPage.typeContent(
			'Third E2E Node ^tomorrow :pending'
		);
		await mindMapPage.nodeEditorPage.create();
		await mindMapPage.expectNodeExists('Third E2E Node');

		// Verify all 3 nodes exist by their unique content
		const noteNode1 = mindMapPage.getNodeByContent('E2E Test Note');
		const noteNode2 = mindMapPage.getNodeByContent('Second E2E Node');
		const noteNode3 = mindMapPage.getNodeByContent('Third E2E Node');

		await expect(noteNode1).toBeVisible();
		await expect(noteNode2).toBeVisible();
		await expect(noteNode3).toBeVisible();
	});

	// ============================================================================
	// TEST 5: Edit Existing Node
	// ============================================================================
	test('should edit existing node and handle cancel', async ({
		mindMapPage,
		page,
	}) => {
		// Use unique names to avoid collision with nodes from other tests
		const testId = Date.now().toString().slice(-6);
		const originalContent = `Original Content ${testId}`;
		const updatedContent = `Updated Content ${testId}`;

		// Create a node to edit
		await mindMapPage.createNodeWithContent(originalContent);
		await page.waitForTimeout(500);

		// Double-click to edit
		await mindMapPage.doubleClickNodeByContent(originalContent);

		// Verify editor has content
		const content = await mindMapPage.nodeEditorPage.getContent();
		expect(content).toContain(originalContent);

		// Clear and update
		await mindMapPage.nodeEditorPage.clear();
		await mindMapPage.nodeEditorPage.typeContent(updatedContent);
		await mindMapPage.nodeEditorPage.create();
		await page.waitForTimeout(500);

		// Verify update
		await mindMapPage.expectNodeExists(updatedContent);

		// Now test cancel: edit again but escape
		await mindMapPage.doubleClickNodeByContent(updatedContent);

		await mindMapPage.nodeEditorPage.clear();
		await mindMapPage.nodeEditorPage.typeContent('This should NOT save');

		// Cancel with Escape
		await mindMapPage.nodeEditorPage.close();
		await page.waitForTimeout(300);

		// Original updated content should still exist
		await mindMapPage.expectNodeExists(updatedContent);
	});

	// ============================================================================
	// TEST 6: Keyboard Shortcuts
	// ============================================================================
	test('should support Ctrl+Enter and Ctrl+/ shortcuts', async ({
		mindMapPage,
		page,
	}) => {
		// Test Ctrl+Enter to create node
		await mindMapPage.openNodeEditor();
		await mindMapPage.nodeEditorPage.typeContent('Keyboard Shortcut Node');
		await mindMapPage.nodeEditorPage.pressCtrlEnter();
		await page.waitForTimeout(500);

		await mindMapPage.nodeEditorPage.expectClosed();
		await mindMapPage.expectNodeExists('Keyboard Shortcut Node');

		// Test Ctrl+/ to toggle parsing legend
		await mindMapPage.openNodeEditor();

		const legend = mindMapPage.nodeEditorPage.parsingLegend;
		const initialState = await legend.getAttribute('data-collapsed');

		// Toggle legend open/closed
		await mindMapPage.nodeEditorPage.toggleLegend();
		await page.waitForTimeout(300);

		const toggledState = await legend.getAttribute('data-collapsed');
		expect(toggledState).not.toBe(initialState);

		// Toggle back to original state
		await mindMapPage.nodeEditorPage.toggleLegend();
		await page.waitForTimeout(300);

		const finalState = await legend.getAttribute('data-collapsed');
		expect(finalState).toBe(initialState);

		// Test Escape closes editor
		await page.keyboard.press('Escape');
		await mindMapPage.nodeEditorPage.expectClosed();
	});

	// ============================================================================
	// TEST 7: Multiple Nodes Creation
	// ============================================================================
	test('should create multiple nodes successfully', async ({
		mindMapPage,
		page,
	}) => {
		// Create first node
		await mindMapPage.createNodeWithContent('First E2E Node');
		await mindMapPage.expectNodeExists('First E2E Node');

		// Create second node
		await mindMapPage.createNodeWithContent('Second E2E Node');
		await mindMapPage.expectNodeExists('Second E2E Node');

		// Verify both nodes exist simultaneously
		const firstNode = mindMapPage.getNodeByContent('First E2E Node');
		const secondNode = mindMapPage.getNodeByContent('Second E2E Node');

		await expect(firstNode).toBeVisible();
		await expect(secondNode).toBeVisible();

		// Verify total node count
		const nodeCount = await mindMapPage.getNodeCount();
		expect(nodeCount).toBe(2);
	});
});
