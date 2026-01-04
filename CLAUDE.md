# CLAUDE.md

## 🚨 CRITICAL PRINCIPLES

- **🔴 UPDATE CLAUDE.md**: Before ending work, ask: "Did I change anything CLAUDE.md describes?" If yes → update it. No exceptions.
- **🔴 NEVER READ .env FILES**: `.env`, `.env.local`, `.env.e2e` are BANNED. No `Read`, `cat`, `grep`, or any tool. These contain secrets.
- **PROACTIVELY use agents and mcp tools**
- **NEVER run `pnpm run dev`** - Use: `pnpm type-check`, `pnpm build`, `pnpm test`
- **Parallel operations**: Batch independent tool calls
- **Clean code**: Remove temporary files after completion
- **Quality**: General-purpose solutions for ALL inputs, not just test cases
- **Iterate**: Reflect on results and adjust approach if needed
- **Questions**: Ask before coding if requirements unclear
- **Frontend**: Give it your all - design principles, micro-interactions, motion animations, delightful UX
- **Auto-document**: Commit major milestones autonomously; keep CLAUDE.md & CHANGELOG.md current

## 🤖 Autonomous Operations

### Auto-Commit Protocol
- **Commit after major milestones**: new features, bug fixes, refactors, significant progress
- **Commit format**: Conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`)
- **Commit message**: Concise "what" + brief "why" when non-obvious
- **Batch related changes**: Don't commit every tiny edit; group logical units
- **Verify before commit**: Run `pnpm type-check` before committing
- **Never commit broken code**: If build fails, fix first

### Self-Maintain CLAUDE.md

**The Rule**: If you modified anything that CLAUDE.md documents, update CLAUDE.md. Period.

CLAUDE.md describes: test counts, page objects, component directories, slices, node types, API routes, fixtures, architectural patterns, technical debt status.

If your work touched ANY of these → update the relevant section.

**How to check**: Before committing, review your changed files. Do any relate to what's documented here? If uncertain, update anyway - it's better to over-document than under-document.

**After updating**: Add `<!-- Updated: YYYY-MM-DD - reason -->`

### Maintain CHANGELOG.md
- **Location**: Project root `CHANGELOG.md`
- **CRITICAL**: Always run `date "+%Y-%m-%d"` to get system date before updating - NEVER guess dates
- **Format** (one entry per day, append to existing day's entry if same day):
  ```
  ## [YYYY-MM-DD]

  ### Category
  - **scope**: Description of change
    - Why: rationale (if non-obvious)
  ```
- **Categories**: Added, Changed, Fixed, Removed, Refactored, Docs
- **Update frequency**: After each commit or logical work unit (append to day's entry)
- **Be concise**: What changed, not implementation details

### Documentation Sync Checklist
**BLOCKING** - Do not end session without completing:
- [ ] CHANGELOG.md reflects all changes made
- [ ] CLAUDE.md is current (re-read sections related to your work)
- [ ] Technical debt list is accurate

Skipping this = incomplete work.

## Commands

```bash
pnpm type-check      # TypeScript validation
pnpm build           # Production build
pnpm test            # Unit tests (Jest + RTL, 149 tests)
pnpm e2e             # E2E tests (Playwright)
pnpm e2e:ui          # E2E with interactive UI
pnpm e2e:headed      # E2E with browser visible
pnpm lint / lint:fix # ESLint
pnpm pretty          # Prettier
```

**Env**: `.env.local` requires `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (see `.env.example`)

## mcp tools

- Always use context7 when I need code generation, setup or configuration steps, or library/API documentation. This means you should automatically use the Context7 MCP tools to resolve library id and get library docs without me having to explicitly ask.

## Architecture
<!-- Updated: 2025-12-22 - Deep audit: fixed version, slice count, AI provider -->

**Stack**: Next.js 16 (App Router) • React 19 • TypeScript • Zustand (21 slices) • React Flow (canvas) • Motion (animations) • Supabase (auth/DB/realtime) • Tailwind CSS • OpenAI GPT

## Animations

For animations, we use the `motion` library from Framer Motion. This library provides a simple and powerful way to create smooth and responsive animations in React applications. We use it to animate the nodes and edges of the mind map, as well as the UI elements such as modals and panels.

Guideline @./animation-guidelines.md

### State Management (21 Slices)
<!-- Updated: 2025-12-22 - Added comments, guided-tour, export slices -->

**Store**: `src/store/mind-map-store.tsx`

**Core Data & Operations (4):**

- `core-slice` - Mind map data, Supabase client, user auth, ReactFlow instance
- `nodes-slice` - Node CRUD, positioning, collapse, group-aware movement
- `edges-slice` - Edge CRUD, parent-child relationships, visibility filtering
- `ui-slice` - Modals, panels, context menu, focus mode, drag state

**Collaboration & Real-time (3):**

- `realtime-slice` - Selected nodes sync across users (minimal, 17 lines)
- `sharing-slice` - Room codes, anonymous auth, share permissions, real-time subscriptions
- `comments-slice` - Comment threads, messages, reactions, @mentions, real-time sync (973 lines)

**AI Features (2):**

- `chat-slice` - AI chat messages, context, preferences, response styles
- `suggestions-slice` - Ghost nodes, AI suggestions, streaming, merge algorithms

**User Experience (6):**

- `clipboard-slice` - Copy/paste, duplicate nodes, edge preservation
- `history-slice` - Undo/redo, state stack, action history with timestamps
- `groups-slice` - Group creation, add/remove nodes, ungroup operations
- `layout-slice` - ELK.js layouts (horizontal, vertical, radial)
- `quick-input-slice` - Quick node creation, cursor position tracking
- `guided-tour-slice` - Prezi-style presentations, auto path building, spotlight states (416 lines)
- `export-slice` - PNG/SVG/PDF export, scale settings, background options (172 lines)

**User & Business (3):**

- `user-profile-slice` - Profile data, preferences (theme, notifications, privacy)
- `subscription-slice` - Stripe subscriptions, plan features, usage limits
- `onboarding-slice` - Onboarding flow, plan selection, progress persistence

**UI State (2):**

- `loading-state-slice` - Centralized loading flags for all operations
- `streaming-toast-slice` - Progress toasts for streaming operations

### Node System
<!-- Updated: 2025-12-22 - Fixed location, count, added commentNode -->

**Node Types** (12 total in `src/registry/node-registry.ts`):

- **Content**: defaultNode (Note), textNode, annotationNode, codeNode, resourceNode
- **Structure**: taskNode, groupNode, referenceNode, commentNode (canvas threads)
- **Media**: imageNode
- **AI**: questionNode, ghostNode (system-only, AI suggestions)

**Registry** (`src/registry/`):

- `node-registry.ts` - Master node type configuration, 40+ utility methods
- `node-factory.ts` - Factory for creating node instances
- `node-validation-schemas.ts` - Zod validation per type
- `type-guards.ts` - Runtime type checking

**Components** (`src/components/nodes/`):

- Each type has dedicated component (e.g., `default-node.tsx`, `task-node.tsx`, `comment-node.tsx`)
- `base-node-wrapper.tsx` - Shared functionality: selection, handles, resizing, toolbar, metadata bar
- `core/` - Types only (registry moved to `src/registry/`)
- `components/` - NodeToolbar, NodeContent, ToolbarControls, comment components
- `content/` - Shared content components (9 total: code, markdown, task, image, annotation, question, text, resource, reference)
- `shared/` - universal-metadata-bar, metadata-badge, node-tags, export-image-placeholder
- `node-additions/` - collapse-button, collapsed-indicator, group-button
- `themes/` - glassmorphism-theme
- `question-node/` - Question node sub-components (binary, multiple-choice)

**Node Editor** (`src/components/node-editor/`):

- Quick input mode, structured input mode, command palette
- Pattern parsing: `#tags`, `@people`, `^dates`, `$commands`
- CodeMirror integration, validation framework, smart completions
- Commands: `$note`, `$task`, `$code`, `$text`, `$image`, `$link`, `$question`, `$annotation`, `$reference`
- groupNode/commentNode/ghostNode created via UI only (no command trigger)

### Canvas & UI
<!-- Updated: 2025-12-22 - Added 14 missing component directories -->

**Canvas**: `src/components/mind-map/react-flow-area.tsx` - React Flow integration, node/edge rendering, interactions, Zustand sync

**Component Directories** (`src/components/` - 24 directories):

- `ai/` - AI stream mediator (headless streaming coordinator)
- `ai-chat/` - Chat panel, input, messages, context selector
- `auth/` - Anonymous user banner, upgrade flow
- `common/` - Shared utility components
- `context-menu/` - Context menu system
- `dashboard/` - Map cards, create dialog, template picker, settings panel
- `edges/` - Custom edge components (floating, waypoint, ghost, suggested)
- `guided-tour/` - Spotlight overlay, tour controls, path builder
- `history/` - History sidebar, diff views, change items
- `icons/` - Icon components
- `mind-map/` - React Flow area, modals wrapper, map settings
- `modals/` - Edge edit, AI prompt, reference search, upgrade, generate-from-nodes
- `node-editor/` - Quick input, enhanced input, completions, previews
- `nodes/` - All 12 node type components
- `onboarding/` - Multi-step onboarding flow (welcome, benefits, pricing, payment)
- `providers/` - Context providers
- `realtime/` - Live cursors, avatar stack, connection status, profile cards
- `settings/` - Node type selector, settings panels
- `sharing/` - Share panel, room codes, join room, permissions
- `subscription/` - Subscription UI components
- `toolbar/` - Main canvas toolbar
- `ui/` - 42 UI primitives (15 Radix-based, 1 Base UI, 26 custom)
- `waitlist/` - Landing page components (hero, form, features)

### API Routes

**Location**: `src/app/api/` (51 routes)

**AI & Content Generation**:

- `ai/suggestions/` - Node suggestions with streaming (GPT)
- `ai/suggest-connections/` - Connection recommendations
- `ai/suggest-merges/` - Merge suggestions
- `ai/chat/` - AI chat with context modes (minimal/summary/full)
- `ai/counterpoints/` - Generate opposing viewpoints
- `generate-answer/`, `process-url/` (root level)

**Comments System**:

- `comments/` - Create/list comments
- `comments/[id]/` - Comment CRUD
- `comments/[id]/messages/` - Thread messages
- `comments/[id]/messages/[messageId]/` - Message CRUD
- `comments/[id]/reactions/` - Emoji reactions

**History/Versioning**:

- `history/[mapId]/list/` - Version list
- `history/[mapId]/snapshot/` - Create snapshot
- `history/[mapId]/revert/` - Restore version
- `history/[mapId]/delta/[id]/` - Delta details
- `history/[mapId]/cleanup/` - Manual cleanup
- `history/storage-usage/` - Storage stats

**Templates**:

- `templates/` - List/create templates
- `templates/[id]/` - Template CRUD

**Core Features**:

- `maps/` - List/create maps (GET, POST, DELETE)
- `maps/[id]/` - Individual map operations (GET, PUT, DELETE)
- `maps/[id]/check-access/` - Permission check
- `nodes/create-reference/`, `nodes/search-across-maps/`, `search-nodes/`

**Collaboration**:

- `share/create-room-code/`, `share/join-room/`, `share/refresh-room-code/`, `share/revoke-room-code/`
- `share/delete-share/[shareId]/`, `share/update-share/[shareId]/`

**User & Auth**:

- `auth/upgrade-anonymous/initiate/`, `auth/upgrade-anonymous/verify-otp/`, `auth/upgrade-anonymous/set-password/`
- `auth/user/`
- `user/profile/`, `user/export/`, `user/[userId]/public-profile/`

**Billing** (expanded):

- `user/billing/portal/` - Stripe portal
- `user/billing/invoice/` - Invoice download
- `user/billing/payment-history/` - Payment records
- `user/billing/usage/` - Usage statistics

**Business**:

- `subscriptions/create/`, `subscriptions/webhook/`
- `subscriptions/[id]/cancel/`, `subscriptions/[id]/reactivate/`
- `waitlist/` (public, rate-limited)

**Background Jobs**:

- `cron/cleanup-history/` - Automated cleanup
- `proxy-image/` - Image proxy service

**API Helpers** (`src/helpers/api/`):

- `with-auth-validation.ts` - Requires auth (anonymous or full user)
- `with-api-validation.ts` - Requires authenticated full user
- `with-public-api-validation.ts` - Public access, no auth
- `with-ai-feature-gate.ts` - AI tier enforcement (Pro vs Free)
- `with-subscription-check.ts` - Usage limits, billing periods
- `rate-limiter.ts` - In-memory rate limiter (single-instance, IP-based)
- `responses.ts` - Standardized response helpers

### Database

**Supabase**: `src/helpers/supabase/client.ts` (browser), `server.ts` (server)

- Real-time collaboration via subscriptions
- Row Level Security (RLS) for multi-tenant access
- Schema managed via Supabase dashboard (no local migrations)
- SQL reference files in `ai-docs/` (not applied migrations)

**Types**: `src/types/` (37 type files) - Strict TypeScript definitions for all data structures

## Best Practices

**Node Development**: Add component to `src/components/nodes/` → Register in `src/registry/node-registry.ts` → Configure in node-editor command system → Add types & error handling → Test edge cases

**State**: Zustand slices for related functionality • Use `useShallow` for selectors • Prefer derived state • Strict TypeScript

**TypeScript**: Strict types in `src/types/` • Interface composition • Export types with implementations • Never `any`, use `unknown` with guards • **React imports**: Use `import type { ComponentType } from 'react'` NOT `import React from 'react'; React.ComponentType`

**Frontend**: Visual hierarchy • Micro-interactions • Responsive • Accessibility (ARIA, keyboard, focus) • Performance (lazy load, optimize bundles) • Error/loading states • Dark mode support

**Animations**: Motion (motion/react) • 60fps smooth • Spring physics • Stagger lists • Exit animations • Reduced motion support

**Styling**: Tailwind + custom variants • Components in `src/components/ui/` • Themes distributed (glassmorphism-theme, metadata-theme) • Radix UI primitives • CSS variables • Focus-visible states

**Testing**: Jest + React Testing Library (unit) • Playwright (E2E) • **149+ unit tests, 44 E2E tests (×3 browsers = 132 total) + 10 skipped placeholders** • Co-located tests (`*.test.tsx` next to components) • Mock Zustand stores in tests • 70% coverage target on critical paths
<!-- Updated: 2025-12-31 - Added 10 skipped placeholder tests for permission gaps (see e2e/E2E_TEST_GAPS.md) -->

```typescript
// Unit testing pattern: Mock stores, test component behavior
// ✅ jest.mock('@/store/mind-map-store', () => ({...}))
// ✅ render(<Component {...props} />) + userEvent interactions
// ✅ Verify callbacks, state changes, DOM output
```

**E2E Testing** (`e2e/`):
- Page Objects (`e2e/pages/` - 8 total):
  - node-editor.page.ts, mind-map.page.ts, toolbar.page.ts
  - context-menu.page.ts, share-panel.page.ts, join-room.page.ts
  - dashboard.page.ts, upgrade-modal.page.ts
- Fixtures (`e2e/fixtures/`):
  - base.fixture.ts - Standard page objects
  - multi-user.fixture.ts - Owner + guest pages for collaboration testing
  - upgrade.fixture.ts - Anonymous user fixture for upgrade flow
- Test suites: node-editor (7), sharing (4), permissions (34 active + 10 skipped), upgrade (34)
- **Test gaps**: See `e2e/E2E_TEST_GAPS.md` for missing comment/AI permission tests
- Screenshot comparison for visual regression
- Local Supabase for database isolation (`pnpm supabase:start`)

```bash
# E2E workflow
pnpm supabase:start        # Start local DB
pnpm e2e                   # Run all E2E tests
pnpm e2e:update-snapshots  # Update screenshot baselines
pnpm supabase:stop         # Stop local DB
```

Test with realistic props/callbacks, user interactions, proper mocks for external deps (stores, hooks, APIs).

**Docs**: Generated docs → `./ai-docs/[feature]/[doc-name].md` • JSDoc for complex functions • ADRs for major changes

## Known Technical Debt

1. ~~Remove deprecated `builderNode` references~~ - **RESOLVED** (0 references found in codebase)
2. Consider reorganizing root-level AI routes under `ai/` directory
3. ~~Write comprehensive test suite~~ - **IN PROGRESS** (149 unit + 47 E2E tests, sharing permissions covered)
4. Create `supabase/migrations/` with proper migration files (currently none exist)
5. Set up `supabase gen types` for automated TypeScript type generation
6. Implement actual conflict resolution for real-time collaboration (currently last-write-wins)
7. ~~Remove unused Gemini dependency~~ - **RESOLVED** (migrated to OpenAI, packages removed)
8. Add `@media (hover: hover)` wrapper for touch device hover states in animations

- sacrifice grammar for the sake of concision
- list any unresolved questions at the end, if any
