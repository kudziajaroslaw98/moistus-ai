import { expect, test } from '../../fixtures';
import { ToolbarPage } from '../../pages/toolbar.page';

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

					return (
						toastBottom <= toolbarTop - 8 &&
						toastBox.width <= 288
					);
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

					return (
						toastBottom <= toolbarTop - 8 &&
						toastBox.width <= 288
					);
				},
				{ timeout: 8000 }
			)
			.toBe(true);
	});
});
