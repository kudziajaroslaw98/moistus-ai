import type { Page } from '@playwright/test';
import { expect, test } from '../../fixtures';
import type { MindMapPage } from '../../pages/mind-map.page';
import { ToolbarPage } from '../../pages/toolbar.page';

async function ensureMinimumNodes(mindMapPage: MindMapPage, minCount: number) {
	let nodeCount = await mindMapPage.getNodeCount();

	while (nodeCount < minCount) {
		await mindMapPage.createNodeWithContent(
			`Mobile tap multi-select node ${Date.now()}-${nodeCount}`
		);
		nodeCount = await mindMapPage.getNodeCount();
	}
}

async function tapEmptyPane(page: Page) {
	await page.locator('.react-flow__pane').click({
		force: true,
		position: { x: 12, y: 12 },
	});
}

test.describe('Mobile Toolbar', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test.beforeEach(async ({ mindMapPage, testMapId }) => {
		await mindMapPage.goto(testMapId);
	});

	test('shows core actions and keeps overflow actions out of main row', async ({
		page,
	}) => {
		const toolbarPage = new ToolbarPage(page);

		await toolbarPage.expectAddNodeButtonVisible();
		await toolbarPage.expectAiSuggestionsButtonVisible();
		await toolbarPage.expectCommentsButtonVisible();
		await toolbarPage.expectMoreButtonVisible();

		await toolbarPage.expectLayoutButtonHidden();
		await toolbarPage.expectExportButtonHidden();
		await toolbarPage.expectGuidedTourButtonHidden();
		await toolbarPage.expectZoomButtonHidden();
		await toolbarPage.expectAiChatButtonHidden();
	});

	test('shows secondary actions in More menu', async ({ page }) => {
		const toolbarPage = new ToolbarPage(page);

		await toolbarPage.openMoreMenu();
		await toolbarPage.expectMoreSubmenuVisible('Auto Layout');
		await toolbarPage.expectMoreSubmenuVisible('Export');
		await toolbarPage.expectMoreSubmenuVisible('Guided Tour');
		await toolbarPage.expectMoreMenuItemVisible('Reset Zoom');

		await toolbarPage.openMoreSubmenu('Auto Layout');
		await expect(
			page.locator('[role="menuitemradio"]:has-text("Left to Right")').first()
		).toBeVisible();

		await toolbarPage.openMoreSubmenu('Export');
		await expect(
			page.locator('[role="menuitemradio"]:has-text("PNG Image")').first()
		).toBeVisible();

		const optionalChatItem = toolbarPage.moreMenu
			.locator('[role="menuitem"]:has-text("AI Chat")')
			.first();
		if ((await optionalChatItem.count()) > 0) {
			await expect(optionalChatItem).toBeVisible();
		}
	});

	test('hides keyboard shortcuts FAB on mobile', async ({ page }) => {
		const toolbarPage = new ToolbarPage(page);
		await toolbarPage.expectShortcutsHelpFabHidden();
	});

	test('supports additive tap multi-select on mobile', async ({
		page,
		mindMapPage,
	}) => {
		const toolbarPage = new ToolbarPage(page);
		await ensureMinimumNodes(mindMapPage, 2);
		await toolbarPage.selectCursorMode('Select');
		await toolbarPage.setTapMultiSelectMode(true);

		await mindMapPage.getAllNodes().nth(0).click({ force: true });
		await mindMapPage.getAllNodes().nth(1).click({ force: true });

		await expect.poll(() => mindMapPage.getSelectedNodeCount()).toBe(2);
	});

	test('clears selection on pane tap without exiting tap multi-select mode', async ({
		page,
		mindMapPage,
	}) => {
		const toolbarPage = new ToolbarPage(page);
		await ensureMinimumNodes(mindMapPage, 2);
		await toolbarPage.selectCursorMode('Select');
		await toolbarPage.setTapMultiSelectMode(true);

		await mindMapPage.getAllNodes().nth(0).click({ force: true });
		await mindMapPage.getAllNodes().nth(1).click({ force: true });
		await expect.poll(() => mindMapPage.getSelectedNodeCount()).toBe(2);

		await tapEmptyPane(page);
		await expect.poll(() => mindMapPage.getSelectedNodeCount()).toBe(0);

		// If mode remains enabled, two taps should again produce two selected nodes.
		await toolbarPage.setTapMultiSelectMode(true);
		await mindMapPage.getAllNodes().nth(0).click({ force: true });
		await mindMapPage.getAllNodes().nth(1).click({ force: true });
		await expect.poll(() => mindMapPage.getSelectedNodeCount()).toBe(2);
	});

	test('disables node dragging while tap multi-select mode is enabled', async ({
		page,
		mindMapPage,
	}) => {
		const toolbarPage = new ToolbarPage(page);
		await ensureMinimumNodes(mindMapPage, 1);
		await toolbarPage.selectCursorMode('Select');
		await toolbarPage.setTapMultiSelectMode(true);

		const node = mindMapPage.getAllNodes().first();
		const beforeTransform = await node.evaluate(
			(el) => (el as HTMLElement).style.transform
		);
		const box = await node.boundingBox();
		if (!box) throw new Error('Node not visible for drag test');

		const centerX = box.x + box.width / 2;
		const centerY = box.y + box.height / 2;
		await page.mouse.move(centerX, centerY);
		await page.mouse.down();
		await page.mouse.move(centerX + 120, centerY + 60, { steps: 10 });
		await page.mouse.up();

		await expect
			.poll(() => node.evaluate((el) => (el as HTMLElement).style.transform), {
				timeout: 3000,
			})
			.toBe(beforeTransform);
	});

	test('restores single-select behavior after tap multi-select is turned off', async ({
		page,
		mindMapPage,
	}) => {
		const toolbarPage = new ToolbarPage(page);
		await ensureMinimumNodes(mindMapPage, 2);
		await toolbarPage.selectCursorMode('Select');
		await toolbarPage.setTapMultiSelectMode(true);

		await mindMapPage.getAllNodes().nth(0).click({ force: true });
		await mindMapPage.getAllNodes().nth(1).click({ force: true });
		await expect.poll(() => mindMapPage.getSelectedNodeCount()).toBe(2);

		await toolbarPage.setTapMultiSelectMode(false);
		await tapEmptyPane(page);
		await expect.poll(() => mindMapPage.getSelectedNodeCount()).toBe(0);

		await mindMapPage.getAllNodes().nth(0).click({ force: true });
		await expect.poll(() => mindMapPage.getSelectedNodeCount()).toBe(1);
		await mindMapPage.getAllNodes().nth(1).click({ force: true });
		await expect.poll(() => mindMapPage.getSelectedNodeCount()).toBe(1);
	});

	test('keeps the load toast above toolbar and compact', async ({ page }) => {
		const toolbarPage = new ToolbarPage(page);
		await expect(toolbarPage.toolbar).toBeVisible();

		const loadToast = page
			.locator('[data-sonner-toast]:has-text("Mind map loaded")')
			.first();
		await expect(loadToast).toBeVisible({ timeout: 15000 });

		await expect
			.poll(
				async () => {
					const toastBox = await loadToast.boundingBox();
					const toolbarBox = await toolbarPage.toolbar.boundingBox();
					if (!toastBox || !toolbarBox) return false;

					const toastBottom = toastBox.y + toastBox.height;
					const toolbarTop = toolbarBox.y;

					return toastBottom <= toolbarTop - 8 && toastBox.width <= 288;
				},
				{ timeout: 8000 }
			)
			.toBe(true);
	});

	test('keeps Guided Tour disabled when map has zero nodes', async ({
		page,
	}) => {
		let mapId: string | null = null;

		try {
			const createMapResponse = await page.request.post('/api/maps', {
				data: {
					title: `E2E Mobile Zero Nodes ${Date.now()}`,
					template_id: '__e2e-non-existent-template__',
				},
			});

			expect(createMapResponse.ok()).toBe(true);
			const createMapBody = await createMapResponse.json();
			mapId = createMapBody?.data?.map?.id ?? null;
			expect(mapId).toBeTruthy();

			await page.goto(`/mind-map/${mapId}`);
			await page.waitForLoadState('networkidle');

			const toolbarPage = new ToolbarPage(page);
			await toolbarPage.openMoreMenu();

			const guidedTourSubmenu = toolbarPage.moreMenu
				.locator(
					'[data-slot="dropdown-menu-sub-trigger"]:has-text("Guided Tour")'
				)
				.first();

			await expect(guidedTourSubmenu).toBeVisible();

			const isDisabled = await guidedTourSubmenu.evaluate((el) => {
				const ariaDisabled = el.getAttribute('aria-disabled');
				return ariaDisabled === 'true' || el.hasAttribute('data-disabled');
			});

			expect(isDisabled).toBe(true);
		} finally {
			if (mapId) {
				await page.request.delete('/api/maps', {
					data: {
						mapIds: [mapId],
					},
				});
			}
		}
	});
});

test.describe('Tablet-Narrow Toast Layout', () => {
	test.use({ viewport: { width: 560, height: 780 } });

	test.beforeEach(async ({ mindMapPage, testMapId }) => {
		await mindMapPage.goto(testMapId);
	});

	test('keeps the load toast above toolbar and compact', async ({ page }) => {
		const toolbarPage = new ToolbarPage(page);
		await expect(toolbarPage.toolbar).toBeVisible();

		const loadToast = page
			.locator('[data-sonner-toast]:has-text("Mind map loaded")')
			.first();
		await expect(loadToast).toBeVisible({ timeout: 15000 });

		await expect
			.poll(
				async () => {
					const toastBox = await loadToast.boundingBox();
					const toolbarBox = await toolbarPage.toolbar.boundingBox();
					if (!toastBox || !toolbarBox) return false;

					const toastBottom = toastBox.y + toastBox.height;
					const toolbarTop = toolbarBox.y;

					return toastBottom <= toolbarTop - 8 && toastBox.width <= 288;
				},
				{ timeout: 8000 }
			)
			.toBe(true);
	});
});
