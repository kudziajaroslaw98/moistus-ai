# Changelog

All notable changes to this project are documented here.
Format: `[YYYY-MM-DD]` - one entry per day.

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
