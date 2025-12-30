import { expect, Locator, Page } from '@playwright/test';
import { NodeEditorPage } from './node-editor.page';

/**
 * Page Object Model for the Mind Map canvas.
 *
 * The mind map uses React Flow for the canvas and node rendering.
 */
export class MindMapPage {
	readonly page: Page;
	readonly nodeEditorPage: NodeEditorPage;

	// Canvas elements
	readonly canvas: Locator;
	readonly viewport: Locator;

	// Toolbar
	readonly toolbar: Locator;

	constructor(page: Page) {
		this.page = page;
		this.nodeEditorPage = new NodeEditorPage(page);

		// React Flow canvas
		this.canvas = page.locator('.react-flow');
		this.viewport = page.locator('.react-flow__viewport');

		// Main toolbar
		this.toolbar = page.locator('[data-testid="toolbar"]');
	}

	// ============================================================================
	// NAVIGATION
	// ============================================================================

	/**
	 * Navigate to a specific mind map by ID.
	 */
	async goto(mapId: string) {
		await this.page.goto(`/mind-map/${mapId}`);
		await this.waitForCanvasLoaded();
	}

	/**
	 * Navigate to the dashboard.
	 */
	async gotoDashboard() {
		await this.page.goto('/dashboard');
		await this.page.waitForLoadState('networkidle');
	}

	/**
	 * Wait for the canvas and initial nodes to load.
	 */
	async waitForCanvasLoaded() {
		await this.canvas.waitFor({ state: 'visible' });
		await this.page.waitForLoadState('networkidle');
	}

	/**
	 * Wait for nodes to be rendered on the canvas.
	 */
	async waitForNodesLoaded() {
		await this.page.waitForSelector('.react-flow__node', { timeout: 10000 });
	}

	// ============================================================================
	// NODE LOCATORS
	// ============================================================================

	/**
	 * Get a node by its React Flow data-id.
	 */
	getNode(nodeId: string): Locator {
		return this.page.locator(`[data-id="${nodeId}"]`);
	}

	/**
	 * Get a node by its text content.
	 */
	getNodeByContent(content: string): Locator {
		return this.page.locator(`.react-flow__node:has-text("${content}")`);
	}

	/**
	 * Get a node by its type.
	 */
	getNodeByType(nodeType: string): Locator {
		return this.page.locator(`.react-flow__node[data-type="${nodeType}"]`);
	}

	/**
	 * Get all nodes on the canvas.
	 */
	getAllNodes(): Locator {
		return this.page.locator('.react-flow__node');
	}

	/**
	 * Get all edges on the canvas.
	 */
	getAllEdges(): Locator {
		return this.page.locator('.react-flow__edge');
	}

	// ============================================================================
	// NODE INTERACTIONS
	// ============================================================================

	/**
	 * Click on a node to select it.
	 */
	async selectNode(nodeId: string) {
		await this.getNode(nodeId).click();
	}

	/**
	 * Click on a node by its content to select it.
	 */
	async selectNodeByContent(content: string) {
		await this.getNodeByContent(content).click({ force: true });
	}

	/**
	 * Double-click a node to open the editor.
	 */
	async doubleClickNode(nodeId: string) {
		await this.getNode(nodeId).dblclick();
		await this.nodeEditorPage.waitForOpen();
	}

	/**
	 * Double-click a node by its content.
	 * Uses force: true to bypass overlapping elements.
	 */
	async doubleClickNodeByContent(content: string) {
		await this.getNodeByContent(content).dblclick({ force: true });
		await this.nodeEditorPage.waitForOpen();
	}

	/**
	 * Double-click a node by content WITHOUT waiting for editor.
	 * Useful for testing that editor doesn't open for viewers.
	 */
	async doubleClickNodeByContentNoWait(content: string) {
		await this.getNodeByContent(content).dblclick({ force: true });
	}

	/**
	 * Right-click a node to open context menu.
	 */
	async rightClickNode(nodeId: string) {
		await this.getNode(nodeId).click({ button: 'right' });
	}

	/**
	 * Right-click a node by its content to open context menu.
	 * Uses .first() to handle potential duplicate nodes from previous test runs.
	 */
	async rightClickNodeByContent(content: string) {
		await this.getNodeByContent(content).first().click({ button: 'right', force: true });
	}

	/**
	 * Right-click an edge to open context menu.
	 */
	async rightClickEdge(edgeIndex: number = 0) {
		const edge = this.getAllEdges().nth(edgeIndex);
		await edge.click({ button: 'right' });
	}

	/**
	 * Right-click on the canvas pane (not on a node).
	 */
	async rightClickCanvas(x?: number, y?: number) {
		const box = await this.canvas.boundingBox();
		if (!box) throw new Error('Canvas not visible');
		const clickX = x ?? box.x + box.width / 2;
		const clickY = y ?? box.y + box.height / 2;
		await this.page.mouse.click(clickX, clickY, { button: 'right' });
	}

	/**
	 * Open the node editor for creating a new node.
	 * Shortcut is '/' key (forward slash).
	 */
	async openNodeEditor() {
		await this.canvas.click(); // Focus canvas first
		await this.page.keyboard.press('/');
		await this.nodeEditorPage.waitForOpen();
	}

	/**
	 * Press the slash key without waiting for editor.
	 * Useful for testing that editor doesn't open for viewers.
	 */
	async pressSlashKey() {
		await this.canvas.click(); // Focus canvas first
		await this.page.keyboard.press('/');
	}

	/**
	 * Verify that the node editor did NOT open.
	 * Waits briefly then checks visibility.
	 */
	async expectNodeEditorNotOpened(timeout: number = 1000) {
		await this.page.waitForTimeout(timeout);
		await expect(this.nodeEditorPage.container).not.toBeVisible();
	}

	/**
	 * Create a node with the given content using the node editor.
	 */
	async createNodeWithContent(content: string) {
		await this.openNodeEditor();
		await this.nodeEditorPage.typeContent(content);
		await this.nodeEditorPage.create();
	}

	/**
	 * Attempt to drag a node and return whether position changed.
	 */
	async tryDragNode(
		nodeId: string,
		deltaX: number,
		deltaY: number
	): Promise<{ startPos: { x: number; y: number }; endPos: { x: number; y: number } }> {
		const node = this.getNode(nodeId);
		const box = await node.boundingBox();
		if (!box) throw new Error('Node not visible');

		const startPos = { x: box.x, y: box.y };

		const startX = box.x + box.width / 2;
		const startY = box.y + box.height / 2;

		// Click to select the node first (required for React Flow dragging)
		await node.click({ force: true });
		await this.page.waitForTimeout(300);

		// Re-get bounding box after selection (position may have changed)
		const selectedBox = await node.boundingBox();
		const dragStartX = selectedBox ? selectedBox.x + selectedBox.width / 2 : startX;
		const dragStartY = selectedBox ? selectedBox.y + selectedBox.height / 2 : startY;

		await this.page.mouse.move(dragStartX, dragStartY);
		await this.page.mouse.down();
		await this.page.mouse.move(dragStartX + deltaX, dragStartY + deltaY, { steps: 10 });
		await this.page.mouse.up();

		// Wait for React Flow to update DOM positions
		await this.page.waitForTimeout(500);

		// Get new position
		const newBox = await node.boundingBox();
		const endPos = newBox ? { x: newBox.x, y: newBox.y } : startPos;

		return { startPos, endPos };
	}

	/**
	 * Attempt to drag a node by content.
	 */
	async tryDragNodeByContent(
		content: string,
		deltaX: number,
		deltaY: number
	): Promise<{ startPos: { x: number; y: number }; endPos: { x: number; y: number } }> {
		// Find the React Flow node wrapper (has the draggable class)
		const nodeWrapper = this.page.locator(
			`.react-flow__node:has-text("${content}")`
		);
		const box = await nodeWrapper.boundingBox();
		if (!box) throw new Error('Node not visible');

		const startPos = { x: box.x, y: box.y };
		const centerX = box.x + box.width / 2;
		const centerY = box.y + box.height / 2;

		// Perform drag with mouse events on the React Flow node wrapper
		await this.page.mouse.move(centerX, centerY);
		await this.page.waitForTimeout(100);
		await this.page.mouse.down();
		await this.page.waitForTimeout(100);

		// Move in small steps to trigger React Flow's drag detection
		const steps = 20;
		for (let i = 1; i <= steps; i++) {
			await this.page.mouse.move(
				centerX + (deltaX * i) / steps,
				centerY + (deltaY * i) / steps
			);
			await this.page.waitForTimeout(10);
		}

		await this.page.mouse.up();

		// Wait for React Flow to update DOM positions
		await this.page.waitForTimeout(500);

		// Get new position
		const newBox = await nodeWrapper.boundingBox();
		const endPos = newBox ? { x: newBox.x, y: newBox.y } : startPos;

		return { startPos, endPos };
	}

	/**
	 * Press Delete key to delete selected nodes.
	 */
	async pressDeleteKey() {
		await this.page.keyboard.press('Delete');
	}

	/**
	 * Check if add button is visible on a selected node.
	 */
	async isNodeAddButtonVisible(): Promise<boolean> {
		const addButton = this.page.locator('[data-testid="node-add-button"]');
		return await addButton.isVisible();
	}

	/**
	 * Check if suggest button is visible on a selected node.
	 */
	async isNodeSuggestButtonVisible(): Promise<boolean> {
		const suggestButton = this.page.locator('[data-testid="node-suggest-button"]');
		return await suggestButton.isVisible();
	}

	/**
	 * Check if node resize handles are visible.
	 */
	async isNodeResizerVisible(): Promise<boolean> {
		const resizer = this.page.locator('.react-flow__resize-control');
		return await resizer.isVisible();
	}

	/**
	 * Assert that node floating buttons are NOT visible (for viewers).
	 */
	async expectNodeFloatingButtonsHidden() {
		await expect(
			this.page.locator('[data-testid="node-add-button"]')
		).not.toBeVisible();
		await expect(
			this.page.locator('[data-testid="node-suggest-button"]')
		).not.toBeVisible();
	}

	/**
	 * Assert that node floating buttons ARE visible (for editors).
	 */
	async expectNodeFloatingButtonsVisible() {
		await expect(
			this.page.locator('[data-testid="node-add-button"]')
		).toBeVisible();
		await expect(
			this.page.locator('[data-testid="node-suggest-button"]')
		).toBeVisible();
	}

	// ============================================================================
	// CANVAS INTERACTIONS
	// ============================================================================

	/**
	 * Click on the canvas at a specific position.
	 */
	async clickCanvas(x: number, y: number) {
		await this.canvas.click({ position: { x, y } });
	}

	/**
	 * Pan the canvas by dragging.
	 */
	async panCanvas(deltaX: number, deltaY: number) {
		const box = await this.canvas.boundingBox();
		if (!box) throw new Error('Canvas not visible');

		const startX = box.x + box.width / 2;
		const startY = box.y + box.height / 2;

		await this.page.mouse.move(startX, startY);
		await this.page.mouse.down();
		await this.page.mouse.move(startX + deltaX, startY + deltaY);
		await this.page.mouse.up();
	}

	/**
	 * Zoom the canvas using the scroll wheel.
	 */
	async zoomCanvas(deltaY: number) {
		const box = await this.canvas.boundingBox();
		if (!box) throw new Error('Canvas not visible');

		await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
		await this.page.mouse.wheel(0, deltaY);
	}

	// ============================================================================
	// ASSERTIONS
	// ============================================================================

	/**
	 * Assert that a node with the given content exists on the canvas.
	 * Waits up to 5 seconds for the node to appear.
	 */
	async expectNodeExists(content: string) {
		const node = this.getNodeByContent(content);
		await node.waitFor({ state: 'visible', timeout: 5000 });
		await expect(node).toBeVisible();
	}

	/**
	 * Assert the total number of nodes on the canvas.
	 */
	async expectNodeCount(count: number) {
		await expect(this.getAllNodes()).toHaveCount(count);
	}

	/**
	 * Assert that a node has a specific type.
	 */
	async expectNodeType(content: string, nodeType: string) {
		const node = this.getNodeByContent(content);
		await expect(node).toHaveAttribute('data-type', nodeType);
	}

	/**
	 * Get the current node count.
	 */
	async getNodeCount(): Promise<number> {
		return await this.getAllNodes().count();
	}

	/**
	 * Get the current edge count.
	 */
	async getEdgeCount(): Promise<number> {
		return await this.getAllEdges().count();
	}

	// ============================================================================
	// CLEANUP
	// ============================================================================

	/**
	 * Select all nodes on the canvas using Ctrl+A.
	 */
	async selectAllNodes() {
		await this.canvas.click();
		await this.page.keyboard.press('Control+a');
		await this.page.waitForTimeout(100);
	}

	/**
	 * Delete all currently selected nodes.
	 */
	async deleteSelectedNodes() {
		await this.page.keyboard.press('Delete');
		await this.page.waitForTimeout(300);
	}

	/**
	 * Delete all nodes from the canvas.
	 * Used for test cleanup to ensure each test starts fresh.
	 * Deletes nodes one by one via right-click context menu.
	 */
	async deleteAllNodes() {
		// Ensure node editor is closed first
		try {
			await this.nodeEditorPage.close();
		} catch {
			// Editor may not be open, that's fine
		}

		// Delete nodes one by one
		let nodeCount = await this.getNodeCount();
		while (nodeCount > 0) {
			const firstNode = this.getAllNodes().first();

			// Right-click to open context menu
			await firstNode.click({ button: 'right', force: true });
			await this.page.waitForTimeout(200);

			// Click delete option in context menu
			const deleteOption = this.page.locator(
				'[data-testid="context-menu-delete"], [role="menuitem"]:has-text("Delete")'
			);
			if (await deleteOption.isVisible()) {
				await deleteOption.click();
				await this.page.waitForTimeout(300);
			} else {
				// Fallback: select node and press Delete
				await firstNode.click({ force: true });
				await this.page.waitForTimeout(100);
				await this.page.keyboard.press('Delete');
				await this.page.waitForTimeout(300);
			}

			nodeCount = await this.getNodeCount();
		}
	}
}
