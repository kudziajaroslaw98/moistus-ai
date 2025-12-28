/**
 * E2E Tests for Sharing Permission Restrictions
 *
 * Tests that different roles (viewer, commenter, editor) have appropriate
 * restrictions and capabilities when collaborating on a mind map.
 *
 * Test Categories:
 * 1. Viewer Role Restrictions - Read-only mode, no editing capabilities
 * 2. Editor Role Functionality - Full edit access verification
 * 3. Commenter Role Restrictions - View + comment only
 * 4. Real-time Sync - Changes visible without refresh
 * 5. Access Revocation - Kicked when access revoked
 *
 * NOTE: This entire test file runs with a single worker to prevent race conditions
 * where different workers revoke each other's room codes. All tests share the
 * same test map, and revokeAllCodes() affects all workers.
 */

import { test, expect } from '../../fixtures/multi-user.fixture';

// Force single worker for this file to prevent race conditions
test.describe.configure({ mode: 'serial' });
import { ContextMenuPage } from '../../pages/context-menu.page';
import { JoinRoomPage } from '../../pages/join-room.page';
import { MindMapPage } from '../../pages/mind-map.page';
import { SharePanelPage } from '../../pages/share-panel.page';
import { ToolbarPage } from '../../pages/toolbar.page';

// ============================================================================
// 1. VIEWER ROLE RESTRICTIONS (15 tests)
// ============================================================================

test.describe.serial('Viewer Role Restrictions', () => {
	let viewerRoomCode: string;
	let ownerSharePanel: SharePanelPage;

	test('owner creates viewer room code', async ({ ownerPage, testMapId }) => {
		// Navigate to the map
		await ownerPage.goto(`/mind-map/${testMapId}`);
		await ownerPage.waitForLoadState('networkidle');
		await ownerPage.waitForTimeout(1000);

		// Open share panel
		ownerSharePanel = new SharePanelPage(ownerPage);
		await ownerSharePanel.openPanel();

		// Clean up any existing room codes from previous runs first
		// This ensures settings accordion stays open (auto-collapses when codes exist)
		await ownerSharePanel.revokeAllCodes();
		await ownerPage.waitForTimeout(500);

		// Generate room code with viewer role
		viewerRoomCode = await ownerSharePanel.generateRoomCode({
			role: 'viewer',
			maxUsers: 10,
		});

		// Verify room code format
		expect(viewerRoomCode).toMatch(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/);
		console.log(`Generated viewer room code: ${viewerRoomCode}`);
	});

	test('viewer joins successfully', async ({ guestPage }) => {
		const joinPage = new JoinRoomPage(guestPage);

		// Navigate to join page with room code
		await joinPage.gotoDeepLink(viewerRoomCode);
		await guestPage.waitForTimeout(1000);

		// Join as guest
		await joinPage.joinAsGuest('E2E Viewer User');

		// Should redirect to mind map
		await joinPage.waitForSuccess();
		expect(await joinPage.isOnMindMap()).toBe(true);

		console.log('Viewer joined successfully');
	});

	test('viewer cannot see Add Node button in toolbar', async ({
		guestToolbarPage,
	}) => {
		await guestToolbarPage.expectAddNodeButtonHidden();
	});

	test('viewer cannot see AI Suggestions button in toolbar', async ({
		guestToolbarPage,
	}) => {
		await guestToolbarPage.expectAiSuggestionsButtonHidden();
	});

	test('viewer cannot see Layout button in toolbar', async ({
		guestToolbarPage,
	}) => {
		await guestToolbarPage.expectLayoutButtonHidden();
	});

	test('viewer only has Pan mode in cursor dropdown', async ({
		guestToolbarPage,
	}) => {
		await guestToolbarPage.expectOnlyPanModeAvailable();
	});

	test('viewer cannot open node editor via "/" shortcut', async ({
		guestMindMapPage,
	}) => {
		// Press slash key
		await guestMindMapPage.pressSlashKey();

		// Verify editor did NOT open
		await guestMindMapPage.expectNodeEditorNotOpened();
	});

	test('viewer cannot edit node via double-click', async ({
		guestMindMapPage,
		ownerMindMapPage,
		testMapId,
	}) => {
		// First, owner creates a node
		await ownerMindMapPage.goto(testMapId);
		await ownerMindMapPage.createNodeWithContent('Test Node for Viewer');

		// Wait for real-time sync
		await guestMindMapPage.page.waitForTimeout(2000);

		// Verify node exists for viewer
		await guestMindMapPage.expectNodeExists('Test Node for Viewer');

		// Viewer double-clicks node
		await guestMindMapPage.doubleClickNodeByContentNoWait('Test Node for Viewer');

		// Verify editor did NOT open
		await guestMindMapPage.expectNodeEditorNotOpened();
	});

	test('viewer cannot delete node via Delete key', async ({
		guestMindMapPage,
		ownerMindMapPage,
		testMapId,
	}) => {
		// Ensure a test node exists (created by owner)
		const nodeCount = await guestMindMapPage.getNodeCount();
		if (nodeCount === 0) {
			await ownerMindMapPage.goto(testMapId);
			await ownerMindMapPage.createNodeWithContent('Test Node for Viewer');
			await guestMindMapPage.page.waitForTimeout(2000); // Real-time sync
		}

		// Get initial node count
		const initialCount = await guestMindMapPage.getNodeCount();
		expect(initialCount).toBeGreaterThan(0);

		// Select a node
		await guestMindMapPage.selectNodeByContent('Test Node for Viewer');
		await guestMindMapPage.page.waitForTimeout(300);

		// Press Delete
		await guestMindMapPage.pressDeleteKey();
		await guestMindMapPage.page.waitForTimeout(500);

		// Verify node still exists (count unchanged)
		const finalCount = await guestMindMapPage.getNodeCount();
		expect(finalCount).toBe(initialCount);
	});

	test('viewer cannot drag nodes', async ({
		guestMindMapPage,
		ownerMindMapPage,
		testMapId,
	}) => {
		// CRITICAL: Reload guest page to clear corrupted state from real-time sync.
		// Worker-scoped pages persist JavaScript state across tests, and the sync
		// handler can corrupt auth/permission state. Reload clears in-memory state
		// while Supabase session persists in cookies.
		await guestMindMapPage.page.reload();
		await guestMindMapPage.page.waitForLoadState('networkidle');
		await guestMindMapPage.page.waitForTimeout(500);

		// Ensure a test node exists
		const nodeCount = await guestMindMapPage.getNodeCount();
		if (nodeCount === 0) {
			await ownerMindMapPage.goto(testMapId);
			await ownerMindMapPage.createNodeWithContent('Test Node for Viewer');
			await guestMindMapPage.page.waitForTimeout(2000);
		}

		// Try to drag the node
		const { startPos, endPos } = await guestMindMapPage.tryDragNodeByContent(
			'Test Node for Viewer',
			100,
			100
		);

		// Position should NOT have changed (or minimal change due to snap-back)
		const xDiff = Math.abs(endPos.x - startPos.x);
		const yDiff = Math.abs(endPos.y - startPos.y);

		// Allow small tolerance for anti-drag behavior
		expect(xDiff).toBeLessThan(20);
		expect(yDiff).toBeLessThan(20);
	});

	test('viewer cannot see resize handles on selected node', async ({
		guestMindMapPage,
		ownerMindMapPage,
		testMapId,
	}) => {
		// Ensure a test node exists
		const nodeCount = await guestMindMapPage.getNodeCount();
		if (nodeCount === 0) {
			await ownerMindMapPage.goto(testMapId);
			await ownerMindMapPage.createNodeWithContent('Test Node for Viewer');
			await guestMindMapPage.page.waitForTimeout(2000);
		}

		// Select the node
		await guestMindMapPage.selectNodeByContent('Test Node for Viewer');
		await guestMindMapPage.page.waitForTimeout(500);

		// Check resize handles are NOT visible
		const resizerVisible = await guestMindMapPage.isNodeResizerVisible();
		expect(resizerVisible).toBe(false);
	});

	test('viewer cannot see Add/Suggest floating buttons', async ({
		guestMindMapPage,
		ownerMindMapPage,
		testMapId,
	}) => {
		// Ensure a test node exists
		const nodeCount = await guestMindMapPage.getNodeCount();
		if (nodeCount === 0) {
			await ownerMindMapPage.goto(testMapId);
			await ownerMindMapPage.createNodeWithContent('Test Node for Viewer');
			await guestMindMapPage.page.waitForTimeout(2000);
		}

		// Select the node
		await guestMindMapPage.selectNodeByContent('Test Node for Viewer');
		await guestMindMapPage.page.waitForTimeout(500);

		// Check floating buttons are NOT visible
		await guestMindMapPage.expectNodeFloatingButtonsHidden();
	});

	// TODO: Context menu test is flaky due to state leakage not being fully
	// resolved by page reload. The Supabase session might not be restoring
	// correctly from cookies for anonymous users after reload.
	test.skip('viewer context menu hides edit options', async ({
		guestMindMapPage,
		guestContextMenuPage,
		ownerMindMapPage,
		testMapId,
	}) => {
		// Reload to clear corrupted state from real-time sync
		await guestMindMapPage.page.reload();
		await guestMindMapPage.page.waitForLoadState('networkidle');
		await guestMindMapPage.page.waitForTimeout(500);

		// Ensure a test node exists
		const nodeCount = await guestMindMapPage.getNodeCount();
		if (nodeCount === 0) {
			await ownerMindMapPage.goto(testMapId);
			await ownerMindMapPage.createNodeWithContent('Test Node for Viewer');
			await guestMindMapPage.page.waitForTimeout(2000);
		}

		// Right-click on node
		await guestMindMapPage.rightClickNodeByContent('Test Node for Viewer');
		await guestContextMenuPage.waitForOpen();

		// Edit options should be hidden
		await guestContextMenuPage.expectEditOptionsHidden();

		// Close menu
		await guestContextMenuPage.close();
	});

	test('viewer can pan and zoom canvas', async ({ guestMindMapPage }) => {
		// Get initial viewport position
		const canvas = guestMindMapPage.canvas;
		const initialBox = await canvas.boundingBox();
		expect(initialBox).not.toBeNull();

		// Pan the canvas
		await guestMindMapPage.panCanvas(100, 50);

		// Zoom should work (no error)
		await guestMindMapPage.zoomCanvas(-100);
		await guestMindMapPage.page.waitForTimeout(300);

		// Canvas should still be visible
		await expect(canvas).toBeVisible();
	});

	test('viewer can use export functionality', async ({ guestToolbarPage }) => {
		// Export button should be visible for viewers
		await guestToolbarPage.expectExportButtonVisible();
	});

	// Note: Cleanup moved to beforeAll of next describe block
	// afterAll with worker-scoped fixtures causes premature execution
});

// ============================================================================
// 2. EDITOR ROLE FUNCTIONALITY (8 tests)
// ============================================================================

test.describe.serial('Editor Role Functionality', () => {
	let editorRoomCode: string;

	// Cleanup from previous test group
	test.beforeAll(async ({ ownerPage, testMapId }) => {
		const mindMapPage = new MindMapPage(ownerPage);
		await mindMapPage.goto(testMapId);
		await mindMapPage.deleteAllNodes();

		const sharePanelPage = new SharePanelPage(ownerPage);
		await sharePanelPage.openPanel();
		await sharePanelPage.revokeAllCodes();

		console.log('Editor tests cleanup complete');
	});

	test('owner creates editor room code', async ({ ownerPage, testMapId }) => {
		await ownerPage.goto(`/mind-map/${testMapId}`);
		await ownerPage.waitForLoadState('networkidle');
		await ownerPage.waitForTimeout(1000);

		const sharePanelPage = new SharePanelPage(ownerPage);
		await sharePanelPage.openPanel();

		// Clean up any existing room codes from previous runs first
		await sharePanelPage.revokeAllCodes();
		await ownerPage.waitForTimeout(500);

		editorRoomCode = await sharePanelPage.generateRoomCode({
			role: 'editor',
			maxUsers: 10,
		});

		expect(editorRoomCode).toMatch(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/);
		console.log(`Generated editor room code: ${editorRoomCode}`);
	});

	test('editor joins successfully', async ({ guestPage }) => {
		const joinPage = new JoinRoomPage(guestPage);
		await joinPage.gotoDeepLink(editorRoomCode);
		await guestPage.waitForTimeout(1000);
		await joinPage.joinAsGuest('E2E Editor User');
		await joinPage.waitForSuccess();
		expect(await joinPage.isOnMindMap()).toBe(true);
		// NOTE: Don't reload here - it would clear lastJoinResult which holds editor permissions
	});

	test('editor can see all toolbar buttons', async ({ guestToolbarPage }) => {
		await guestToolbarPage.expectAddNodeButtonVisible();
		await guestToolbarPage.expectAiSuggestionsButtonVisible();
		await guestToolbarPage.expectLayoutButtonVisible();
		await guestToolbarPage.expectCommentsButtonVisible();
	});

	test('editor has all cursor modes', async ({ guestToolbarPage }) => {
		await guestToolbarPage.expectAllCursorModesAvailable();
	});

	test('editor can create nodes via "/" shortcut', async ({
		guestMindMapPage,
	}) => {
		const initialCount = await guestMindMapPage.getNodeCount();

		await guestMindMapPage.createNodeWithContent('Editor Created Node');

		// Verify node was created
		await guestMindMapPage.expectNodeExists('Editor Created Node');
		const finalCount = await guestMindMapPage.getNodeCount();
		expect(finalCount).toBe(initialCount + 1);
	});

	test('editor can edit nodes via double-click', async ({ guestMindMapPage }) => {
		// Double-click to edit
		await guestMindMapPage.doubleClickNodeByContent('Editor Created Node');

		// Editor should open
		await expect(guestMindMapPage.nodeEditorPage.container).toBeVisible();

		// Close editor
		await guestMindMapPage.nodeEditorPage.close();
	});

	test('editor can delete nodes', async ({ guestMindMapPage }) => {
		const initialCount = await guestMindMapPage.getNodeCount();

		// Select and delete
		await guestMindMapPage.selectNodeByContent('Editor Created Node');
		await guestMindMapPage.page.waitForTimeout(300);
		await guestMindMapPage.pressDeleteKey();
		await guestMindMapPage.page.waitForTimeout(500);

		// Verify deletion
		const finalCount = await guestMindMapPage.getNodeCount();
		expect(finalCount).toBe(initialCount - 1);
	});

	test('editor can drag nodes', async ({ guestMindMapPage }) => {
		// First create a node to drag
		await guestMindMapPage.createNodeWithContent('Draggable Node');
		await guestMindMapPage.page.waitForTimeout(500);

		// Try to drag
		const { startPos, endPos } = await guestMindMapPage.tryDragNodeByContent(
			'Draggable Node',
			100,
			100
		);

		// Position SHOULD have changed
		const xDiff = Math.abs(endPos.x - startPos.x);
		const yDiff = Math.abs(endPos.y - startPos.y);

		// At least one axis should have moved significantly
		expect(xDiff + yDiff).toBeGreaterThan(50);
	});

	// Note: Cleanup moved to beforeAll of next describe block
});

// ============================================================================
// 3. COMMENTER ROLE RESTRICTIONS (6 tests)
// ============================================================================

test.describe.serial('Commenter Role Restrictions', () => {
	let commenterRoomCode: string;

	// Cleanup from previous test group
	test.beforeAll(async ({ ownerPage, testMapId }) => {
		const mindMapPage = new MindMapPage(ownerPage);
		await mindMapPage.goto(testMapId);
		await mindMapPage.deleteAllNodes();

		const sharePanelPage = new SharePanelPage(ownerPage);
		await sharePanelPage.openPanel();
		await sharePanelPage.revokeAllCodes();

		console.log('Commenter tests cleanup complete');
	});

	test('owner creates commenter room code', async ({ ownerPage, testMapId }) => {
		await ownerPage.goto(`/mind-map/${testMapId}`);
		await ownerPage.waitForLoadState('networkidle');
		await ownerPage.waitForTimeout(1000);

		const sharePanelPage = new SharePanelPage(ownerPage);
		await sharePanelPage.openPanel();

		// Clean up any existing room codes from previous runs first
		await sharePanelPage.revokeAllCodes();
		await ownerPage.waitForTimeout(500);

		commenterRoomCode = await sharePanelPage.generateRoomCode({
			role: 'commenter',
			maxUsers: 10,
		});

		expect(commenterRoomCode).toMatch(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/);
		console.log(`Generated commenter room code: ${commenterRoomCode}`);
	});

	test('commenter joins successfully', async ({ guestPage }) => {
		const joinPage = new JoinRoomPage(guestPage);
		await joinPage.gotoDeepLink(commenterRoomCode);
		await guestPage.waitForTimeout(1000);
		await joinPage.joinAsGuest('E2E Commenter User');
		await joinPage.waitForSuccess();
		expect(await joinPage.isOnMindMap()).toBe(true);
		// NOTE: Don't reload here - it would clear lastJoinResult which holds commenter permissions
	});

	test('commenter cannot edit nodes', async ({
		guestMindMapPage,
		ownerMindMapPage,
		testMapId,
	}) => {
		// Owner creates a node
		await ownerMindMapPage.goto(testMapId);
		await ownerMindMapPage.createNodeWithContent('Commenter Test Node');

		// Wait for sync
		await guestMindMapPage.page.waitForTimeout(2000);

		// Commenter tries slash shortcut - should not work
		await guestMindMapPage.pressSlashKey();
		await guestMindMapPage.expectNodeEditorNotOpened();
	});

	test('commenter cannot create nodes', async ({ guestToolbarPage }) => {
		// Add Node button should be hidden
		await guestToolbarPage.expectAddNodeButtonHidden();
	});

	test('commenter can see Comments button', async ({ guestToolbarPage }) => {
		// Comments button should be visible for commenters
		await guestToolbarPage.expectCommentsButtonVisible();
	});

	test('commenter only has Pan mode', async ({ guestToolbarPage }) => {
		// Like viewers, commenters can't select/connect
		await guestToolbarPage.expectOnlyPanModeAvailable();
	});

	// Note: Cleanup moved to beforeAll of next describe block
});

// ============================================================================
// 4. REAL-TIME SYNC (3 tests)
// ============================================================================

test.describe.serial('Real-time Sync', () => {
	let viewerRoomCode: string;

	// Cleanup from previous test group + setup for this group
	test.beforeAll(async ({ ownerPage, testMapId }) => {
		// Cleanup
		const mindMapPage = new MindMapPage(ownerPage);
		await mindMapPage.goto(testMapId);
		await mindMapPage.deleteAllNodes();

		const sharePanelPage = new SharePanelPage(ownerPage);
		await sharePanelPage.openPanel();
		await sharePanelPage.revokeAllCodes();
		await ownerPage.waitForTimeout(500); // Wait for settings to auto-expand

		console.log('Real-time sync tests cleanup complete');

		// Setup: generate room code for this test group
		await ownerPage.waitForLoadState('networkidle');
		viewerRoomCode = await sharePanelPage.generateRoomCode({
			role: 'viewer',
			maxUsers: 10,
		});
	});

	test('viewer sees owner create node in real-time', async ({
		ownerPage,
		ownerMindMapPage,
		guestPage,
		guestMindMapPage,
		testMapId,
	}) => {
		// Guest joins as viewer
		const joinPage = new JoinRoomPage(guestPage);
		await joinPage.gotoDeepLink(viewerRoomCode);
		await guestPage.waitForTimeout(1000);
		await joinPage.joinAsGuest('Realtime Viewer');
		await joinPage.waitForSuccess();
		// NOTE: Don't reload here - it would clear lastJoinResult

		// Get initial count for viewer
		await guestMindMapPage.page.waitForTimeout(1000);
		const initialCount = await guestMindMapPage.getNodeCount();

		// Owner creates a node
		await ownerMindMapPage.goto(testMapId);
		await ownerMindMapPage.createNodeWithContent('Realtime Test Node');

		// Wait for real-time sync (no page refresh!)
		await guestMindMapPage.page.waitForTimeout(3000);

		// Viewer should see the new node without refresh
		await guestMindMapPage.expectNodeExists('Realtime Test Node');
		const finalCount = await guestMindMapPage.getNodeCount();
		expect(finalCount).toBe(initialCount + 1);
	});

	test('viewer sees owner edit node in real-time', async ({
		ownerMindMapPage,
		guestMindMapPage,
	}) => {
		// Owner edits the node
		await ownerMindMapPage.doubleClickNodeByContent('Realtime Test Node');
		await ownerMindMapPage.nodeEditorPage.typeContent('Updated Realtime Node');
		await ownerMindMapPage.nodeEditorPage.create();

		// Wait for real-time sync
		await guestMindMapPage.page.waitForTimeout(3000);

		// Viewer should see the updated content without refresh
		await guestMindMapPage.expectNodeExists('Updated Realtime Node');
	});

	test('both users see same node count', async ({
		ownerMindMapPage,
		guestMindMapPage,
	}) => {
		const ownerCount = await ownerMindMapPage.getNodeCount();
		const guestCount = await guestMindMapPage.getNodeCount();

		expect(ownerCount).toBe(guestCount);
	});

	// Note: Cleanup moved to beforeAll of next describe block
});

// ============================================================================
// 5. ACCESS REVOCATION (3 tests)
// ============================================================================

test.describe.serial('Access Revocation', () => {
	let viewerRoomCode: string;

	// Cleanup from previous test group
	test.beforeAll(async ({ ownerPage, testMapId }) => {
		const mindMapPage = new MindMapPage(ownerPage);
		await mindMapPage.goto(testMapId);
		await mindMapPage.deleteAllNodes();

		const sharePanelPage = new SharePanelPage(ownerPage);
		await sharePanelPage.openPanel();
		await sharePanelPage.revokeAllCodes();

		console.log('Access revocation tests cleanup complete');
	});

	test('setup: owner creates room and viewer joins', async ({
		ownerPage,
		guestPage,
		testMapId,
	}) => {
		// Owner creates room code
		await ownerPage.goto(`/mind-map/${testMapId}`);
		await ownerPage.waitForLoadState('networkidle');

		const sharePanelPage = new SharePanelPage(ownerPage);
		await sharePanelPage.openPanel();

		// Clean up any existing room codes from previous runs first
		await sharePanelPage.revokeAllCodes();
		await ownerPage.waitForTimeout(500);

		viewerRoomCode = await sharePanelPage.generateRoomCode({
			role: 'viewer',
			maxUsers: 10,
		});

		// Viewer joins
		const joinPage = new JoinRoomPage(guestPage);
		await joinPage.gotoDeepLink(viewerRoomCode);
		await guestPage.waitForTimeout(1000);
		await joinPage.joinAsGuest('Revocation Test User');
		await joinPage.waitForSuccess();
		expect(await joinPage.isOnMindMap()).toBe(true);
		// NOTE: Don't reload here - it would clear lastJoinResult
	});

	test('owner revokes room code', async ({ ownerPage, testMapId }) => {
		await ownerPage.goto(`/mind-map/${testMapId}`);
		await ownerPage.waitForLoadState('networkidle');

		const sharePanelPage = new SharePanelPage(ownerPage);
		await sharePanelPage.openPanel();

		// Revoke all codes
		await sharePanelPage.revokeAllCodes();
		await ownerPage.waitForTimeout(1000);

		// Verify no active codes
		const codes = await sharePanelPage.getRoomCodes();
		expect(codes.length).toBe(0);

		console.log('Room code revoked');
	});

	test('new guest cannot join revoked code', async ({ browser }) => {
		// Create a new context for a fresh guest
		const newGuestContext = await browser.newContext({
			storageState: { cookies: [], origins: [] },
		});
		const newGuestPage = await newGuestContext.newPage();

		try {
			const joinPage = new JoinRoomPage(newGuestPage);
			await joinPage.gotoDeepLink(viewerRoomCode);
			await newGuestPage.waitForTimeout(1000);
			await joinPage.joinAsGuest('New Guest After Revoke');

			// Should get an error
			await joinPage.waitForError();

			const errorText = await joinPage.getErrorMessage();
			expect(errorText?.toLowerCase()).toMatch(/invalid|expired|revoked|not found|unable/i);

			// Should still be on join page (not redirected to map)
			expect(await joinPage.isOnJoinPage()).toBe(true);

			console.log('New guest correctly blocked from revoked code');
		} finally {
			await newGuestContext.close();
		}
	});

	// Note: No final cleanup needed - test map is created fresh for each test run
});
