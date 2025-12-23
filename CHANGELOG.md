# Changelog

All notable changes to this project are documented here.
Format: `[YYYY-MM-DD]` - one entry per day.

---

## [2025-12-23]

### Added
- **test infrastructure**: Unit testing setup with Jest + React Testing Library
  - Install @testing-library/react, @testing-library/user-event
  - Create `__tests__/utils/` with render-with-providers, store-test-utils, mock-supabase
  - Update jest.setup.js with ResizeObserver, motion/react, next/navigation mocks
  - Add jest-dom types to tsconfig.json

- **component tests**: 56 tests for 3 Tier 1 components
  - `default-node.test.tsx` - 7 tests (rendering, placeholder, props)
  - `task-node.test.tsx` - 15 tests (rendering, toggling, store integration)
  - `chat-input.test.tsx` - 34 tests (input, quick prompts, disabled states)

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

---

## [2025-12-22]

### Docs
- **CLAUDE.md**: Added autonomous operations section
  - Auto-commit protocol: conventional commits after major milestones
  - Self-maintenance rules: triggers for when to update architecture docs
  - Changelog maintenance: timestamped entries with categories
  - Documentation sync checklist: ensure nothing falls through cracks
  - Why: Enable AI to maintain project documentation autonomously without user prompting
