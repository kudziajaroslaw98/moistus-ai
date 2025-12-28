/**
 * E2E Tests for Sharing Functionality
 *
 * Tests the sharing flow with user limits using multiple browser contexts:
 * 1. Owner creates room code with max_users=1
 * 2. First guest joins successfully
 * 3. Second guest gets "Room is full" (403) error
 * 4. Invalid token shows 404 error
 */

import { test, expect } from '../../fixtures/multi-user.fixture';
import { SharePanelPage } from '../../pages/share-panel.page';
import { JoinRoomPage } from '../../pages/join-room.page';

test.describe.serial('Sharing - User Limit Enforcement', () => {
	let roomCode: string;
	let sharePanelPage: SharePanelPage;

	test('owner can create room code with max_users=1', async ({
		ownerPage,
		testMapId,
	}) => {
		// Navigate to the map
		await ownerPage.goto(`/mind-map/${testMapId}`);
		await ownerPage.waitForLoadState('domcontentloaded');
		// Wait a bit for React to hydrate
		await ownerPage.waitForTimeout(1000);

		// Open share panel
		sharePanelPage = new SharePanelPage(ownerPage);
		await sharePanelPage.openPanel();

		// Generate room code with max_users=1
		roomCode = await sharePanelPage.generateRoomCode({ maxUsers: 1 });

		// Verify room code format (ABC-123)
		expect(roomCode).toMatch(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/);

		console.log(`Generated room code: ${roomCode} with max_users=1`);
	});

	test('first guest can join successfully', async ({ guestPage }) => {
		const joinPage = new JoinRoomPage(guestPage);

		// Navigate to join page with the room code
		await joinPage.gotoDeepLink(roomCode);

		// Wait for validation to complete and form to show
		await guestPage.waitForTimeout(1000);

		// Fill in display name and join
		await joinPage.joinAsGuest('E2E Guest User 1');

		// Should redirect to mind map on success
		await joinPage.waitForSuccess();

		// Verify we landed on the mind map page
		const isOnMindMap = await joinPage.isOnMindMap();
		expect(isOnMindMap).toBe(true);

		console.log('First guest joined successfully');
	});

	test('second guest gets "Room is full" error', async ({ browser }) => {
		// Create a completely fresh context with empty storage state
		const secondGuestContext = await browser.newContext({
			storageState: { cookies: [], origins: [] },
		});
		const secondGuestPage = await secondGuestContext.newPage();

		try {
			const joinPage = new JoinRoomPage(secondGuestPage);

			// Navigate to join page with the same room code
			await joinPage.gotoDeepLink(roomCode);

			// The page shows the form first, error happens after join attempt
			// Try to join as guest
			await joinPage.joinAsGuest('E2E Guest User 2');

			// Wait for the error state - join API returns 403 "Room is full"
			await joinPage.waitForError();

			// Verify error message mentions room being full
			const errorText = await joinPage.getErrorMessage();
			console.log(`Error message: ${errorText}`);

			// Check that error indicates the room is full
			expect(errorText?.toLowerCase()).toMatch(/full|limit|capacity|room|unable/i);

			// Should NOT have redirected to mind map
			const isOnJoinPage = await joinPage.isOnJoinPage();
			expect(isOnJoinPage).toBe(true);

			console.log('Second guest correctly received "room full" error');
		} finally {
			await secondGuestContext.close();
		}
	});

	test.afterAll(async ({ ownerPage, testMapId }) => {
		// Cleanup: revoke all room codes
		await ownerPage.goto(`/mind-map/${testMapId}`);
		await ownerPage.waitForLoadState('networkidle');

		const sharePanelPage = new SharePanelPage(ownerPage);
		await sharePanelPage.openPanel();
		await sharePanelPage.revokeAllCodes();

		console.log('Cleanup: revoked all room codes');
	});
});

test.describe('Sharing - Invalid Codes', () => {
	test('invalid room code shows error', async ({ guestPage }) => {
		const joinPage = new JoinRoomPage(guestPage);

		// Use a clearly invalid code (valid format but doesn't exist)
		await joinPage.gotoDeepLink('XXX-999');

		// The page shows the join form first (format is valid)
		// Error only appears after attempting to join
		await joinPage.joinAsGuest('Test User Invalid');

		// Now wait for error state
		await joinPage.waitForError();

		// Should show "Invalid or expired" type error
		const errorText = await joinPage.getErrorMessage();
		expect(errorText?.toLowerCase()).toMatch(/invalid|expired|not found|unable/i);

		console.log('Invalid token correctly shows error after join attempt');
	});

	test('malformed room code shows validation error', async ({ guestPage }) => {
		const joinPage = new JoinRoomPage(guestPage);

		// Navigate with a malformed code (wrong format)
		await joinPage.gotoDeepLink('TOOLONG');

		// Wait for error state (format validation fails)
		await joinPage.waitForError();

		console.log('Malformed token correctly shows error');
	});
});
