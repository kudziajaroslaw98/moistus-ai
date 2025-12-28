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
	 * Open the node editor for creating a new node.
	 * Shortcut is '/' key (forward slash).
	 */
	async openNodeEditor() {
		await this.canvas.click(); // Focus canvas first
		await this.page.keyboard.press('/');
		await this.nodeEditorPage.waitForOpen();
	}

	/**
	 * Create a node with the given content using the node editor.
	 */
	async createNodeWithContent(content: string) {
		await this.openNodeEditor();
		await this.nodeEditorPage.typeContent(content);
		await this.nodeEditorPage.create();
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
