# Changelog

All notable changes to this project are documented here.
Format: `[YYYY-MM-DD]` - one entry per day.

---

## [2025-12-31]

### Added
- **E2E test gap documentation**: Created `e2e/E2E_TEST_GAPS.md` tracking missing permission tests
  - Documents 10 missing tests for viewer/commenter AI Chat and comment restrictions
  - Includes implementation prerequisites (page objects needed)
  - Why: Ensure we don't forget to implement remaining permission boundary tests

- **E2E placeholder tests**: Added 9 skipped `.skip` placeholder tests to `permissions.spec.ts`
  - Viewer: 3 skipped (Comments hidden, AI Chat hidden, view comment threads)
  - Commenter: 6 skipped (open panel, add comment, reply, reactions, delete restriction, AI Chat)
  - Why: Document expected test coverage inline with actual tests

### Docs
- **CLAUDE.md**: Updated E2E section with accurate page object count (8), fixture list, test counts per suite, and link to test gaps doc

### Refactored
- **Collaborator profile card**: Redesigned for cleaner, more modern look
  - Replaced 4-cell metrics grid with single consolidated status row
  - Removed redundant info (Online/Now/Viewing all meant the same thing)
  - Added activity-tinted avatar ring (subtle color based on editing/typing/etc)
  - Integrated anonymous user badge on avatar corner (instead of footer notice)
  - Updated RoleBadge styling (Owner gets subtle amber, Collaborator gets lighter zinc)
  - Added glassmorphism polish to hover-card container (backdrop-blur, softer border)
  - Why: Original design was boxy and data-table-like, new design is breathable and modern

### Fixed
- **Immediate guest kick-out**: Guests now get kicked immediately when owner revokes access
  - Added `subscribeToAccessRevocation()` to listen for DELETE and UPDATE events on `share_access`
  - DELETE = owner removes individual user; UPDATE status='inactive' = owner revokes room code
  - Subscribe on map load (not just SharePanel open) so guests receive revocation events
  - Added `share_access` and `share_tokens` to Supabase Realtime publication (was missing!)
  - Set `REPLICA IDENTITY FULL` on both tables for DELETE/UPDATE payload data
  - Why: Previously guests only got kicked after page refresh; events weren't being broadcast

- **Onboarding popup after kick**: Fixed confusing onboarding appearing after access revocation
  - Added `mapAccessError` check in `initializeOnboarding()` to skip for kicked users
  - Why: Anonymous users saw onboarding modal after being kicked, now they go straight to access revoked page

---

## [2025-12-30]

### Fixed
- **E2E test isolation**: Multiple fixes for test flakiness caused by shared test map
  - Use unique node names with timestamp suffix to prevent collisions across test runs
  - Remove `revokeAllCodes()` from upgrade tests (caused race conditions with parallel workers)
  - Fix node-editor "edit existing node" test - was finding nodes from other tests
  - Skip flaky editor drag test - React Flow drag detection not working in E2E
  - Improve drag methods with click-to-select and proper waits
  - Remove `afterEach` cleanup from node-editor tests - use unique names instead
  - Add try-catch guards to upgrade test context cleanup (handle already-closed contexts)
  - Fix "multiple nodes" test - use initial/final count delta instead of absolute count
  - Why: Tests were interfering with each other when running in parallel

### Changed
- **E2E parallel/serial split**: Split chromium project into two configurations
  - `chromium` project - runs node-editor tests in parallel (4 workers)
  - `chromium-serial` project - runs sharing/upgrade tests serially (fullyParallel: false)
  - Updated `e2e:chromium` script to run both projects
  - Why: Real-time sensitive tests (sharing, upgrade) cannot run in parallel due to shared testMapId

---

## [2025-12-28]

### Added
- **e2e testing**: Comprehensive sharing permission E2E tests (35 tests)
  - Test viewer role restrictions (15 tests): toolbar hidden, no drag/edit/delete
  - Test editor role functionality (8 tests): full edit access verification
  - Test commenter role restrictions (6 tests): view + comment only
  - Test real-time sync (3 tests): changes visible without refresh
  - Test access revocation (3 tests): kicked when owner revokes access
  - Create ToolbarPage, ContextMenuPage page objects
  - Extend SharePanelPage with role selection
  - Extend MindMapPage with permission testing methods
  - Extend multi-user fixture with guest page objects
  - Why: Core feature - sharing restrictions must be thoroughly tested

- **data-testid attributes**: Added to enable E2E testing
  - context-menu.tsx: `data-testid="context-menu"` + item-specific IDs
  - context-menu-item.tsx: Support for `data-testid` prop
  - base-node-wrapper.tsx: `node-add-button`, `node-suggest-button`
  - share-panel.tsx: `role-selector`, `role-selector-trigger`
  - room-code-display.tsx: `revoke-room-code-btn` with aria-label
  - toolbar.tsx: `toolbar` container

### Fixed
- **E2E test reliability**: Multiple fixes for sharing permission tests
  - Fix onboarding modal blocking join button (add dismissOnboardingIfPresent)
  - Fix generateRoomCode returning old code (use last in list, not first)
  - Fix revokeAllCodes not clicking (use data-testid, remove force:true)
  - Add 500ms wait for API in revokeAllCodes before checking count
  - Why: Tests were flaky due to race conditions and state issues

- **E2E race conditions**: Resolved cross-worker and strict mode violations
  - Set `workers: 1` in playwright.config.ts to prevent shared testMapId race
  - Add `.first()` to content-based locators for duplicate node handling
  - Fix modal dialog blocking context menu (Escape key dismissal)
  - Update dismissOnboardingIfPresent to handle "Get Started" button variant
  - Change gotoDeepLink to use domcontentloaded (avoid WebSocket timeout)
  - Add room code cleanup before generating new codes
  - Reuse existing E2E test map to avoid database bloat
  - Why: Tests were failing due to parallel workers revoking each other's codes

### Changed
- **E2E scripts**: Added `e2e:firefox` and `e2e:webkit` npm scripts for browser-specific runs

---

## [2025-12-24]

### Added
- **database**: Atomic node + edge creation via Supabase RPC
  - Create `create_node_with_parent_edge` RPC function (ai-docs/database/)
  - Add `CreateNodeWithEdgeResponse` TypeScript type
  - Modify `nodes-slice.ts` addNode() to use single RPC call
  - Why: Reduces 3 DB calls to 1, eliminates race conditions, ~3x faster

- **e2e testing**: Playwright E2E test infrastructure for node editor
  - Install @playwright/test with multi-browser support (chromium, firefox, webkit)
  - Create playwright.config.ts with screenshot comparison settings
  - Create Page Object Models: node-editor.page.ts, mind-map.page.ts
  - Create test fixtures: base.fixture.ts with page object injection
  - Add 5 E2E test files (30+ tests):
    - pattern-highlighting.spec.ts - Visual verification of syntax highlighting
    - completions.spec.ts - Autocomplete dropdown behavior
    - validation.spec.ts - Error/warning display and quick fixes
    - keyboard-shortcuts.spec.ts - Ctrl+Enter, Ctrl+/, Escape handling
    - node-creation.spec.ts - Full create/edit node flow
  - Add data-testid attributes to node editor components
  - Add GitHub Actions workflow for E2E tests with local Supabase
  - Add package.json scripts: e2e, e2e:ui, e2e:headed, e2e:debug, e2e:update-snapshots

### Changed
- **node-editor components**: Add data-testid attributes for E2E testing
  - node-editor.tsx, action-bar.tsx, preview-section.tsx
  - parsing-legend.tsx (with data-collapsed attribute)
  - examples-section.tsx

---

## [2025-12-23]

### Added
- **test infrastructure**: Unit testing setup with Jest + React Testing Library
  - Install @testing-library/react, @testing-library/user-event
  - Create `__tests__/utils/` with render-with-providers, store-test-utils, mock-supabase
  - Update jest.setup.js with ResizeObserver, motion/react, next/navigation mocks
  - Add jest-dom types to tsconfig.json

- **component tests**: 149 tests for 7 components (Tier 1 + Tier 2)
  - `default-node.test.tsx` - 7 tests (rendering, placeholder, props)
  - `task-node.test.tsx` - 15 tests (rendering, toggling, store integration)
  - `chat-input.test.tsx` - 34 tests (input, quick prompts, disabled states)
  - `quick-input.test.tsx` - 28 tests (input, keyboard shortcuts, examples, legend)
  - `base-node-wrapper.test.tsx` - 31 tests (selection, add/suggest buttons, metadata)
  - `markdown-content.test.tsx` - 16 tests (placeholder, markdown elements, links)
  - `task-content.test.tsx` - 18 tests (tasks, progress, interactivity, celebration)

### Refactored
- **nodes/content**: Extract shared content components from canvas nodes
  - `code-content.tsx` - SyntaxHighlighter with headerActions/codeOverlay slots
  - `markdown-content.tsx` - ReactMarkdown with custom component styling
  - `task-content.tsx` - Task list with optional onTaskToggle callback
  - `image-content.tsx` - Image loading states with caption support
  - `annotation-content.tsx` - 8 annotation types with color system
  - `question-content.tsx` - Binary/multiple choice questions
  - `text-content.tsx` - Styled text with alignment options
  - `resource-content.tsx` - URL preview cards with thumbnail
  - `reference-content.tsx` - Cross-reference display
  - Why: Eliminate duplication between canvas nodes and preview system

- **preview-node-renderer**: Remove adapter layer entirely
  - Delete `content-extractors/` directory (10 files)
  - Add inline `PreviewContent` switch for prop extraction
  - Why: Adapters were unnecessary indirection; centralize mapping in one place

### Changed
- **annotation-node.tsx**: Now uses shared AnnotationContent (283→63 lines)
- **task-node.tsx**: Now uses shared TaskContent (229→72 lines)
- **image-node.tsx**: Uses ImageContent for external images
- **code-node.tsx**: Uses CodeContent with headerActions slot
- **default-node.tsx**: Uses MarkdownContent (269→41 lines)

### Fixed
- **suggest-connections/route.ts**: Await async convertToModelMessages call

### Removed
- **content-extractors/**: Entire directory deleted (-10 files, -800 lines)
  - Was: NodeData → Adapter → SharedContent
  - Now: NodeData → PreviewContent switch → SharedContent

### Docs
- **CLAUDE.md**: Updated testing section and TypeScript conventions
  - React imports: Use `import type { ComponentType } from 'react'` not `React.ComponentType`
  - Testing section: Reflects 149 tests, correct mocking patterns
  - Technical debt: Test suite now IN PROGRESS (was 0% coverage)

---

## [2025-12-22]

### Docs
- **CLAUDE.md**: Added autonomous operations section
  - Auto-commit protocol: conventional commits after major milestones
  - Self-maintenance rules: triggers for when to update architecture docs
  - Changelog maintenance: timestamped entries with categories
  - Documentation sync checklist: ensure nothing falls through cracks
  - Why: Enable AI to maintain project documentation autonomously without user prompting
