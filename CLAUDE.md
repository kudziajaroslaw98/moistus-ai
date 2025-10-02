# CLAUDE.md

## 🚨 CRITICAL PRINCIPLES

- **PROACTIVELY use agents and tools**
- **NEVER run `pnpm run dev`** - Use: `pnpm type-check`, `pnpm build`, `pnpm test`
- **Parallel operations**: Batch independent tool calls
- **Clean code**: Remove temporary files after completion
- **Quality**: General-purpose solutions for ALL inputs, not just test cases
- **Iterate**: Reflect on results and adjust approach if needed
- **Questions**: Ask before coding if requirements unclear
- **Frontend**: Give it your all - design principles, micro-interactions, motion animations, delightful UX

## Commands

```bash
pnpm type-check      # TypeScript validation
pnpm build           # Production build
pnpm test            # Unit tests (infrastructure ready, no tests written)
pnpm lint / lint:fix # ESLint
pnpm pretty          # Prettier
```

**Env**: `.env.local` requires `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (see `.env.example`)

## Architecture

**Stack**: Next.js 15 (App Router) • React 19 • TypeScript • Zustand (19 slices) • React Flow (canvas) • Motion (animations) • Supabase (auth/DB/realtime) • Tailwind CSS • Gemini AI

### State Management (19 Slices)

**Store**: `src/store/mind-map-store.tsx`

**Core Data & Operations:**
- `core-slice` - Mind map data, Supabase client, user auth, ReactFlow instance
- `nodes-slice` - Node CRUD, positioning, collapse, group-aware movement
- `edges-slice` - Edge CRUD, parent-child relationships, visibility filtering
- `ui-slice` - Modals, panels, context menu, focus mode, drag state

**Collaboration & Real-time:**
- `realtime-slice` - Form field sync, conflict detection/resolution, active users
- `sharing-slice` - Room codes, anonymous auth, share permissions
- `comments-slice` - Node/map comments, threading, reactions, real-time sync

**AI Features:**
- `chat-slice` - AI chat messages, context, preferences, response styles
- `suggestions-slice` - Ghost nodes, AI suggestions, streaming, merge algorithms

**User Experience:**
- `clipboard-slice` - Copy/paste, duplicate nodes, edge preservation
- `history-slice` - Undo/redo, state stack, action history with timestamps
- `groups-slice` - Group creation, add/remove nodes, ungroup operations
- `layout-slice` - ELK.js layouts (horizontal, vertical, radial)
- `quick-input-slice` - Quick node creation, cursor position tracking

**User & Business:**
- `user-profile-slice` - Profile data, preferences (theme, notifications, privacy)
- `subscription-slice` - Stripe subscriptions, plan features, usage limits
- `onboarding-slice` - Onboarding flow, plan selection, progress persistence

**UI State:**
- `loading-state-slice` - Centralized loading flags for all operations
- `streaming-toast-slice` - Progress toasts for streaming operations

### Node System

**Node Types** (11 total in `src/constants/node-types.ts`):
- **Content**: defaultNode (Note), textNode, annotationNode, codeNode, resourceNode
- **Structure**: taskNode, groupNode, referenceNode
- **Media**: imageNode
- **AI**: questionNode, ghostNode (system-only, AI suggestions)

**Components** (`src/components/nodes/`):
- Each type has dedicated component (e.g., `default-node.tsx`, `task-node.tsx`)
- `base-node-wrapper.tsx` - Shared functionality: selection, handles, resizing, toolbar, metadata bar, collaboration
- `core/` - NodeRegistry, NodeFactory, types, type guards
- `components/` - NodeToolbar, NodeContent, ToolbarControls
- `shared/` - universal-metadata-bar, metadata-badge, node-tags
- `node-additions/` - collapse-button, comment-button, group-button
- `themes/` - glassmorphism-theme

**Node Editor** (`src/components/node-editor/`):
- Replaces legacy "inline-node-creator" (60% code reduction refactor)
- Quick input mode, structured input mode, command palette
- Pattern parsing: `#tags`, `@people`, `^dates`, `/commands`
- CodeMirror integration, validation framework, smart completions
- Command system: `/task`, `/code`, `/question`, etc.

### Canvas & UI

**Canvas**: `src/components/mind-map/react-flow-area.tsx` - React Flow integration, node/edge rendering, interactions, Zustand sync

**Major Component Directories**:
- `realtime/` - Live cursors, avatar stack, active users, conflict resolution, connection status
- `ui/` - 42 Radix UI-based components (button, input, dialog, dropdown, etc.)
- `modals/` - Edge edit, AI content prompt, node type selector, reference search
- `context-menu/` - Context menu system
- `dashboard/` - Dashboard components
- `comment/` - Comment system UI
- `sharing/` - Sharing components
- `subscription/` - Subscription UI
- `onboarding/` - Onboarding flow
- `ai-chat/` - AI chat interface
- `auth/` - Authentication UI

### API Routes

**Location**: `src/app/api/` (30+ routes)

**AI & Content Generation**:
- `ai/suggestions/` - Node suggestions with streaming (GPT)
- `ai/suggest-connections/` - Connection recommendations
- `ai/suggest-merges/` - Merge suggestions
- ⚠️ `ai/chat/` - **DISABLED** (implementation commented out)
- `extract-concepts/`, `generate-answer/`, `generate-content/`, `generate-from-selected-nodes/`, `process-url/`, `summarize-branch/` (root level)

**Core Features**:
- `maps/` - List/create maps (GET, POST, DELETE)
- `maps/[id]/` - Individual map operations (GET, PUT, DELETE)
- `nodes/create-reference/`, `nodes/search-across-maps/`, `search-nodes/`

**Collaboration**:
- `share/create-room-code/`, `share/join-room/`, `share/refresh-room-code/`, `share/revoke-room-code/`

**User & Auth**:
- `auth/upgrade-anonymous/`, `auth/user/`
- `user/profile/`, `user/profile/avatar/`, `user/appearance/`, `user/notifications/`, `user/privacy/`, `user/export/`

**Business**:
- `subscriptions/create/`, `subscriptions/webhook/` (Stripe integration)
- `waitlist/` (public, rate-limited)

**API Helpers** (`src/helpers/api/`):
- `with-auth-validation.ts` - Requires auth (anonymous or full user)
- `with-api-validation.ts` - Requires authenticated full user
- `with-public-api-validation.ts` - Public access, no auth
- `rate-limiter.ts` - In-memory rate limiter (single-instance, IP-based)
- `responses.ts` - Standardized response helpers

### Database

**Supabase**: `src/helpers/supabase/client.ts` (browser), `server.ts` (server)
- Real-time collaboration via subscriptions
- Row Level Security (RLS) for multi-tenant access
- Migrations in `supabase/migrations/`

**Types**: `src/types/` (38 type files) - Strict TypeScript definitions for all data structures

## Best Practices

**Node Development**: Add component to `src/components/nodes/` → Register in `node-types.ts` → Add to NodeRegistry → Configure in node-editor command system → Add types & error handling → Test edge cases

**State**: Zustand slices for related functionality • Use `useShallow` for selectors • Prefer derived state • Strict TypeScript

**TypeScript**: Strict types in `src/types/` • Branded types for IDs • Interface composition • Export types with implementations • Never `any`, use `unknown` with guards

**Frontend**: Visual hierarchy • Micro-interactions • Responsive • Accessibility (ARIA, keyboard, focus) • Performance (lazy load, optimize bundles) • Error/loading states • Dark mode support

**Animations**: Motion (motion/react) • 60fps smooth • Spring physics • Stagger lists • Exit animations • Reduced motion support

**Styling**: Tailwind + custom variants • Components in `src/components/ui/` • Themes distributed (glassmorphism-theme, metadata-theme) • Radix UI primitives • CSS variables • Focus-visible states

**Testing**: 🚨 Infrastructure ready (Jest + React Testing Library) but **no tests written** (0% coverage)
```typescript
// When writing tests: NEVER mock stores/APIs - test REAL components
// ❌ FORBIDDEN: jest.mock('@/store/mind-map-store')
// ✅ REQUIRED: render(<NodeComponent id="real-id" />)
//              const { result } = renderHook(() => useMindMapStore())
```
Test real components with actual props/callbacks, real Zustand state, user interactions, realistic data, accessibility, and performance.

**Docs**: Generated docs → `./ai-docs/[feature]/[doc-name].md` • JSDoc for complex functions • ADRs for major changes

## Known Technical Debt

1. Remove deprecated `builderNode` references from:
   - `src/hooks/use-node-suggestion.ts` (validation schema)
   - `src/components/nodes/ghost-node.tsx` (icon mapping)
2. Consider reorganizing root-level AI routes under `ai/` directory
3. Write comprehensive test suite (infrastructure ready, 0% coverage currently)
4. Restore or remove `ai/chat/route.ts` (currently all code commented out)
