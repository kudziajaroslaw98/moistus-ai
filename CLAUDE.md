# CLAUDE.md

<!-- Updated: 2026-04-21 - Consolidated Updated-marker guidance and refreshed NodeData/edge-routing marker text while preserving recent AI/offline/editor contracts -->

## Engineering Philosophy

You are a senior software engineer in an agentic coding workflow. The human is the architect; you are the hands. Move fast, but never faster than the human can verify.

**Critical behaviors:**

- **Surface assumptions** before implementing anything non-trivial. Format: `ASSUMPTIONS I'M MAKING: 1. ... → Correct me now or I'll proceed.`
- **Stop on confusion** — name the inconsistency, present the tradeoff, wait for resolution. Never silently guess.
- **Push back** on bad ideas — point out the issue, explain the downside, propose alternative. Sycophancy is a failure mode.
- **Enforce simplicity** — if 100 lines suffice, 1000 is a failure. Prefer boring, obvious solutions. Cleverness is expensive.
- **Scope discipline** — touch only what you're asked to touch. No unsolicited cleanup, no removing code you don't understand.
- **Dead code hygiene** — after refactoring, list unreachable code and ask before removing.

**Approach patterns:**

- Reframe imperative instructions as success criteria, then work toward the goal
- Test-first for non-trivial logic: write the test → implement → show both
- Naive-then-optimize for algorithms: correctness first, performance second
- Emit lightweight `PLAN: 1. [step] — [why]` before multi-step work

**Output standards:**

- No bloated abstractions, no premature generalization, no clever tricks without comments
- Be direct, quantify when possible, say when stuck
- After modifications summarize: `CHANGES MADE` / `THINGS I DIDN'T TOUCH` / `POTENTIAL CONCERNS`

**Failure modes to avoid:** wrong assumptions, unmanaged confusion, missing clarifications, hidden inconsistencies, missing tradeoffs, sycophancy, overcomplication, scope creep, orphaned dead code.

## CRITICAL PRINCIPLES

- **UPDATE CLAUDE.md**: Before ending work, ask: "Did I change anything CLAUDE.md describes?" If yes → update it. No exceptions.
- **NEVER READ .env FILES**: `.env`, `.env.local`, `.env.e2e` are BANNED. No `Read`, `cat`, `grep`, or any tool. These contain secrets.
- **NO BARREL FILES**: Never create `index.ts` re-export files. Use direct imports (`@/components/landing/hero-section` not `@/components/landing`). Barrels hurt build perf, break tree-shaking, slow tests.
- **PROACTIVELY use agents and mcp tools**
- **NEVER run `pnpm run dev`** - Use: `pnpm type-check`, `pnpm build`, `pnpm test`
- **Parallel operations**: Batch independent tool calls
- **Clean code**: Remove temporary files after completion
- **Quality**: General-purpose solutions for ALL inputs, not just test cases
- **Iterate**: Reflect on results and adjust approach if needed
- **Questions**: Ask before coding if requirements unclear
- **Frontend**: Give it your all - design principles, micro-interactions, motion animations, delightful UX
- **Auto-document**: Commit major milestones autonomously; keep CLAUDE.md & CHANGELOG.md current

## Autonomous Operations

### Auto-Commit Protocol

- **Commit after major milestones**: new features, bug fixes, refactors, significant progress
- **Commit format**: Conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`)
- **Commit message**: Concise "what" + brief "why" when non-obvious
- **Batch related changes**: Don't commit every tiny edit; group logical units
- **Verify before commit**: Run `pnpm type-check` before committing
- **Never commit broken code**: If build fails, fix first

### Self-Maintain Documentation

**CLAUDE.md** - operational instructions, principles, gotchas, technical debt
**CODEBASE_MAP.md** - architecture reference, module guides, data flows

If your work touched architecture (slices, components, routes, node types) → update `docs/CODEBASE_MAP.md`
If your work touched principles, gotchas, debt → update this file or relevant `.claude/rules/` file

**After updating**: Keep exactly one `<!-- Updated: YYYY-MM-DD - reason -->` marker per logical block, and update that existing marker (date/reason) when the same block changes again.

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
- [ ] CLAUDE.md is current (principles, gotchas, debt)
- [ ] CODEBASE_MAP.md is current if architecture changed
- [ ] Technical debt list is accurate

Skipping this = incomplete work.

## Commands

```bash
pnpm dev:lan         # LAN dev server (0.0.0.0 host binding)
pnpm type-check      # TypeScript validation
pnpm build           # Production build
pnpm test            # Unit tests (Jest + RTL, 149 tests)
pnpm e2e             # E2E tests (Playwright)
pnpm e2e:ui          # E2E with interactive UI
pnpm e2e:headed      # E2E with browser visible
pnpm lint / lint:fix # ESLint
pnpm pretty          # Prettier
```

**Env**: `.env.local` requires `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (see `.env.example`). Optional local-dev LAN helpers: `SUPABASE_INTERNAL_URL`, `NEXT_PUBLIC_SUPABASE_DEV_PORT`, `NEXT_PUBLIC_PARTYKIT_DEV_PORT`.

## mcp tools

- Always use context7 when I need code generation, setup or configuration steps, or library/API documentation. This means you should automatically use the Context7 MCP tools to resolve library id and get library docs without me having to explicitly ask.

## Skills

- **critical** YOU MUST USE SKILLS PROACTIVELY.

## Architecture

**Stack**: Next.js 16 (App Router) • React 19 • TypeScript • Zustand (21 slices) • React Flow (canvas) • Motion (animations) • Supabase (auth/DB/realtime) • Tailwind CSS • OpenAI GPT

**Full Reference**: See [docs/CODEBASE_MAP.md](docs/CODEBASE_MAP.md) for directory structure, slices, node types, API routes, component directories, and data flows.

## Core Gotchas

**NodeData.metadata**: Single unified type (not discriminated union per node type). Enables seamless node type switching without data loss. Do NOT split into per-type unions.

<!-- Updated: 2026-05-12 - Added edge-only connect hierarchy contract and cycle-safe local reflow fallback -->

**Edge routing**: Raw manual waypoint editing is removed. Normal persisted edges use auto-routed `waypointEdge` geometry. Explicit full ELK layout owns ELK label placement metadata (`metadata.elkLabel`) for labeled edges, but the converter snaps ELK's returned label center back onto the routed segment before render so the line passes through the label center. Any orthogonal reroute/edit path that replaces ELK geometry must still clear stale ELK label metadata instead of reusing it. Future manual edge control must be constraint-based (anchor/bias/lane hints), never absolute bend points.

**Connection vs hierarchy contract**: Standard canvas connect (`onConnect` → `addEdge`) is edge-only and must not mutate node hierarchy (`nodes.parent_id` / React Flow `parentId`). Hierarchy assignment remains explicit-only (child-node creation and `setParentConnection`). Deterministic local branch reflow is tree-oriented and must safe-no-op when parent ancestry is cyclic.

**Identity precedence**: Use `user_profiles` as canonical identity source across sharing + realtime UI (`display_name`, `avatar_url`) with fallback order: auth metadata, then deterministic fallback helpers. Keep resolver logic centralized in `src/helpers/identity/resolve-user-identity.ts`.

<!-- Updated: 2026-02-24 - Unified collaborator label/avatar precedence across manage + presence -->

**PartyKit Supabase env precedence**: `SUPABASE_URL` overrides `NEXT_PUBLIC_SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE` overrides `SUPABASE_SERVICE_ROLE_KEY`. Keep only one canonical pair in PartyKit deploy env to avoid stale shadow values. PartyKit now trims and unwraps quoted env values and warns once when both variants are set with different values.

<!-- Updated: 2026-02-24 - Documented PartyKit env shadowing/quoting gotcha for realtime admin failures -->

**PartyKit WS auth fallback**: Realtime connect auth first verifies JWT via JWKS; if that fails, it falls back to Supabase `/auth/v1/user` token validation using service-role credentials. This is a resilience path for issuer/JWKS drift; treat fallback log lines as configuration debt to clean up.

<!-- Updated: 2026-02-24 - Documented realtime JWT fallback behavior and operational meaning -->

**PartyKit dependency hardening**: Keep `pnpm.overrides` pins for `partykit>esbuild` and `undici` in `package.json`, and keep CI security gates (`security-audit.yml`, `dependency-review.yml`) active for dependency file changes. Re-run both production and full `pnpm audit` after PartyKit/miniflare version bumps.

<!-- Updated: 2026-04-09 - Documented PartyKit transitive vulnerability mitigation and dependency security gate contract -->

**Vercel package manager**: Keep repo-level `vercel.json` install/build commands pinned to pnpm (`pnpm install --frozen-lockfile`, `pnpm build`) so Vercel does not default to `npm i` and fail on npm-only peer resolution of the current lint stack.

<!-- Updated: 2026-04-09 - Documented Vercel npm/pnpm install-command mismatch guardrail -->

**GitHub Actions pnpm source-of-truth**: In workflows using `pnpm/action-setup`, do not set a separate `version` input when `package.json#packageManager` already pins pnpm (especially with integrity hash). Use one source to avoid `ERR_PNPM_BAD_PM_VERSION`.

<!-- Updated: 2026-04-09 - Documented CI pnpm version-source conflict guardrail -->

**LAN-safe local dev URLs**: Browser Supabase + PartyKit clients must derive from `window.location.hostname` whenever the configured public URL is loopback-only and the browser host is non-loopback (LAN device access), even if client `NODE_ENV` is unavailable. Keep server-side Supabase traffic on `SUPABASE_INTERNAL_URL` when local services stay on loopback, and do not reintroduce `NEXT_PUBLIC_APP_LOCAL_HREF` for browser fetches.

<!-- Updated: 2026-04-12 - Documented LAN-safe browser-vs-server URL split and NODE_ENV-independent loopback-to-LAN derivation -->

**Next.js 16 LAN dev origins**: Next.js blocks cross-origin requests to dev assets/endpoints by default. Keep `next.config.ts#allowedDevOrigins` aligned with active LAN hosts (for example `192.168.0.239`) when testing from phones/tablets, and prefer `pnpm dev:lan` for explicit LAN host binding. In development on insecure non-loopback HTTP origins, keep service-worker registration disabled to avoid unstable PWA behavior while preserving localhost and production HTTPS behavior.

<!-- Updated: 2026-04-12 - Documented Next.js dev-origin allowlist, insecure LAN SW disable pattern, and dev unregister cleanup expectation -->

**Supabase SSR cookie key**: Browser and server Supabase clients must share the same auth storage/cookie key. Derive that key from the configured Supabase URL, not the runtime LAN host, or successful LAN logins will bounce back to `/auth/sign-in` because the server looks for a different `sb-*` cookie name.

<!-- Updated: 2026-04-01 - Documented Supabase cookie-name mismatch gotcha for LAN logins -->

**Map Settings templates**: `is_template` and `template_category` are system-managed and not user-editable in the Map Settings panel.

<!-- Updated: 2026-02-27 - Removed non-persisting template controls from map settings UI -->

**Node editor parser scope**: Parser syntax no longer supports `bg:`, `border:`, `src:"..."`, `[[...]]`, `confidence:*`, or `$reference` quick-switch in node editor flows. Syntax Help is split into `Universal` (type-filtered) and `Node-specific` sections.
For title metadata use lowercase quoted syntax `title:"..."` (not `Title:`).

<!-- Updated: 2026-04-08 - Consolidated parser-scope updates: deprecated token removals, dual syntax-help model, and canonical lowercase quoted title syntax -->

**Node editor quick-input layout**: Keep quick input as a wide split modal with a matching 50/50 split top bar and bounded body: node type label on the left, Preview/Syntax Help tabs on the right, center separators in both rows, and a full-width footer action bar. Editor and preview panes should fill the bounded body without inset card chrome, but must not use unbounded page-height `h-full` chains or CodeMirror scroll-past-end padding that push the footer/textbox surface out of view. Keep subtle editor line numbers/scrollbar affordance for multi-line input, keep line-number glyphs baseline-aligned while horizontally centered in the gutter, top-align preview content, and style the right-panel controls as a true tab strip (strong hover plus selected underline, not pill buttons) that stretches to full top-bar cell height and aligns from the split divider (left-aligned, no right inset). In panel mode, syntax-help scrolling should be owned by the right pane container rather than nested inner max-height scrollers. `Ctrl+/` selects the Syntax Help tab instead of toggling a separate below-editor help card. Node editor previews should not slide/scale in, and task-node preview should disable task row entry animation while canvas task nodes keep their normal animation.

<!-- Updated: 2026-04-27 - Added left-aligned full-height tab-strip and baseline-centered gutter-number contract -->

**Task node visibility/title contract**: `taskNode` supports `metadata.hideCompletedTasks` (per-node hide/show for completed checklist items) and keeps progress stats based on full `metadata.tasks`, not only visible rows. Task titles are quick-input metadata (`title:"..."`) and must round-trip through node-editor parsing/serialization.

<!-- Updated: 2026-04-08 - Documented task-node hide-completed persistence and title round-trip contract -->

**Node editor autocomplete surfaces**: Keep `createCompletions()` as the single source of autocomplete options. Desktop uses the native CodeMirror tooltip; mobile hides that tooltip and renders a hybrid presenter: a compact full-width strip attached to the open keyboard, or a caret-anchored floating panel when the keyboard is hidden. Any editor/modal outside-press guard must treat both `[data-node-editor-autocomplete-tray="true"]` and body-portaled `.cm-tooltip*` elements as inside-editor interactions so selecting a suggestion does not dismiss the editor.

<!-- Updated: 2026-03-28 - Documented the hybrid mobile autocomplete presenter and shared completion engine -->

**Touch context menu fallback**: Do not rely on native `contextmenu` alone for mobile/iPad. Keep `useTouchContextMenuFallback` wired to the React Flow shell so touch long-press on `.react-flow__node[data-id]`, `.react-flow__edge[data-id]`, or `.react-flow__pane` opens the same context-menu store state path (`openContextMenuAt`) used by desktop right-click handlers. Preserve movement cancellation and trailing click/contextmenu suppression to avoid accidental immediate close/select side-effects after long-press activation.

<!-- Updated: 2026-04-08 - Added iPad/iOS WebKit long-press fallback and post-long-press suppression guardrail -->

**Landing CTA feedback**: Keep landing navigation CTAs (`Start Mapping`, `Get Started`, `Go Pro`) on `StartMappingLink` (`next/link` + `useLinkStatus` + optimistic pending feedback). Keep `src/app/dashboard/loading.tsx` as a dashboard-shell loading fallback (not a blank spinner) while dashboard auth/render work is pending, and keep in-page map-list loading progressive via card skeletons.

<!-- Updated: 2026-04-07 - Added landing CTA pending-feedback and dashboard loading-boundary guardrail -->

**Mind map navigation state**: Keep `MindMapCanvas` gated by the requested route id (`state.mapId === params.id` and `state.mindMap?.id === params.id`) and clear map-scoped runtime store state on map-route unmount via `clearMindMapRuntimeState()`. Bootstrap route map loads from `MindMapCanvas` (`setMapId` + `fetchMindMapData`) so loading begins before `ReactFlowArea` mounts. Make unmount clearing Strict Mode-safe (skip cleanup during immediate effect replay remount). Any async map load path must stale-guard writes when `state.mapId` no longer matches the request id. Keep the real editor shell visible while payload is pending, but pass empty graph data and gate map-dependent controls/actions by `isMapReady` to prevent stale flashes.

<!-- Updated: 2026-04-07 - Added stale-map flash prevention contract, fetch-bootstrap placement, and Strict Mode-safe unmount semantics for map-route transitions -->

**Realtime cleanup idempotency**: Yjs observer cleanup (`unobserve` / awareness `off`) and broadcast unsubscribe wrappers must be safe on repeated invocation. Slice-level unsubscribe flows should null stored handles before awaiting cleanup, and core realtime teardown should coalesce concurrent calls into one in-flight promise.

<!-- Updated: 2026-04-07 - Added repeated-unsubscribe safety contract for Yjs/broadcast/slice/core teardown paths -->

**Rate Limiting**: In-memory only (`src/helpers/api/rate-limiter.ts`), won't scale horizontally without Redis.

**System Updates**: Call `markNodeAsSystemUpdate()` before real-time updates to prevent save loops.

**Export CORS**: External images swapped with placeholders to avoid canvas tainting.

**Ghost Nodes**: System-only (`userCreatable: false`), filtered from exports.

**Whole-map AI suggestions**: Map-scoped `magic-wand` suggestions now send the literal full eligible map context plus a whitelist of all valid anchor node IDs. Repeated clicks still carry per-map recent suggestion history and a rotated lens pair from `localStorage`, and the route still suppresses near-duplicate ideas server-side before streaming. If the full-map prompt exceeds the model request limit, surface that overflow explicitly instead of silently falling back to a summarized strategy. Treat any missing/invalid returned `context.sourceNodeId` as unanchored and place that ghost near the viewport center; never create ghost edges from unknown IDs.

**AI suggestion helper boundaries**: Keep `/api/ai/suggestions` as orchestration only. Suggestion graph modeling belongs in `src/helpers/ai-suggestion-graph.ts`, row serialization in `src/helpers/ai-suggestion-rows.ts`, user-prompt assembly in `src/helpers/ai-suggestion-user-prompt.ts`, system prompt text in `src/helpers/ai-suggestion-prompts.ts`, and streamed normalization/duplicate filtering/error mapping in `src/helpers/ai-suggestion-postprocess.ts`. Do not rebuild graph traversal, prompt text, or duplicate suppression inline in the route.

**Structured AI route boundaries**: Keep `/api/ai/counterpoints`, `/api/ai/suggest-merges`, and `/api/ai/suggest-connections` as orchestration-only routes too. Route-specific request parsing, context shaping, prompt text, alias remapping, and streamed element normalization belong in `src/helpers/ai-counterpoint-*`, `src/helpers/ai-merge-*`, and `src/helpers/ai-connection-*`; the route files should stay limited to auth/quota checks, Supabase reads, `streamObject(...)`, stream-status events, and usage tracking. Do not drift merge duplicate filtering, connection validation, or counterpoint context selection back into the route handlers.

**Collapsed-branch connection suggestion proxying**: `suggestions-slice.addConnectionSuggestion()` may now remap hidden suggestion endpoints to visible collapsed ancestors for rendering and stores the true node IDs in `edge.data.aiData.connectionProxy` (`original*` vs `display*` IDs plus hidden-child labels). Keep dedupe keyed by original IDs, and `acceptConnectionSuggestion()` must create the real edge from original IDs, not display/proxy IDs. Collapse descendant traversal in `nodes-slice.getDescendantNodeIds()` must ignore transient AI suggestion edges so proxy suggestion edges do not hide unrelated visible nodes, and collapsed-ancestor lookup for hidden endpoints should use structural (non-suggested) edges only.

**Suggestion rerun replacement gating**: Connection/merge reruns should clear prior transient AI suggestion edges only when `triggerStream(...)` returns `true`. If stream start is rejected (already streaming/throttled), keep existing suggestion edges/merge state unchanged.

**Row-based AI node-id aliasing**: Every compact row-based AI route (`/api/ai/suggestions`, `/api/ai/chat`, `/api/ai/counterpoints`, `/api/ai/suggest-merges`, `/api/search-nodes`) must alias model-visible node IDs through `src/helpers/ai-id-alias-map.ts` before prompt assembly. The model should see dense numeric node IDs in `NODE` / `REL` / `ANCHOR` / `RECENT` rows and any free-text request metadata that mentions node IDs; server code must resolve those aliases back to UUIDs before anchor validation, duplicate suppression, placement, merge validation, search validation, or client streaming. Do not let UUIDs leak into model-visible rows or numeric aliases leak into app-facing payloads.

**Typed AI ghost approval**: `/api/ai/suggestions` may now stream an optional `nodePayload` alongside `content` for safe typed nodes. The route should only emit safe typed v1 nodes (`defaultNode`, `textNode`, `taskNode`, `questionNode`, `annotationNode`, `codeNode`), must downgrade malformed structured payloads to `defaultNode` before ghost creation, and ghost approval in `suggestions-slice` must build the final node from `nodePayload` instead of trying to infer typed metadata from `suggestedContent`. `taskNode` approval is the critical case: checklist rows live in `metadata.tasks`, so approving a task ghost without payload is a bug.

**Notifications**: `useNotifications` now shares a single cache/socket layer per signed-in user; keep `useSyncExternalStore` snapshots stable and apply `mapId` filtering server-side before `limit` in `/api/notifications`.

**PWA + service worker contract**: Keep Serwist wiring on the Turbopack route-handler path in this repo: `withSerwist(...)` from `@serwist/turbopack` in `next.config.ts`, route handler `src/app/app/[path]/route.ts` with `createSerwistRoute(...)`, and worker source at `src/app/sw.ts`. Root layout must register `SerwistProvider` with `swUrl='/app/sw.js'` and `options={{ scope: '/' }}` so the worker controls the whole app. Keep legacy-worker cleanup in `src/app/serwist.ts` for previously registered `/sw.js` and `/serwist/sw.js`.

<!-- Updated: 2026-04-13 - Documented @serwist/turbopack custom /app/sw.js route contract and root-scope requirement -->

**Offline strict replay contract**: Mutating client paths should flow through `queueMutation(...)` so every operation receives a stable `opId` and can be replayed idempotently through `POST /api/offline/ops/batch`. Background Sync is optional acceleration only; required replay triggers remain online/focus/startup app-level flushes.

<!-- Updated: 2026-04-11 - Documented single offline mutation adapter + idempotent replay requirement -->

**Background sync contract**: Shared replay semantics now live in `src/lib/offline/offline-sync-core.ts` so service-worker and window-triggered flushes stay aligned. One-off sync may replay queued ops headlessly when no clients are open, and periodic background work is intentionally limited to refreshing the global notifications cache key (`notifications:${userId}:__all__`). Do not expand worker refreshes to map/comment caches without adding an explicit target registry first.

<!-- Updated: 2026-04-14 - Documented shared replay core plus notifications-only periodic background refresh scope -->

**Offline reconnect contract**: `flushOfflineQueue` must remain in-memory-guarded only (no persisted lock key), drain queued ops in repeated `<=100` batches per flush until empty, and trigger on `online`, `focus`, `visibilitychange -> visible`, startup, and SW sync messages. Startup must call `resetProcessingOpsToQueued()` before the first flush.

<!-- Updated: 2026-04-11 - Documented reconnect flush behavior and startup processing-op recovery -->

**Offline replay failure policy**: `401/403` replay responses pause ops in `queued` state (no dead-letter). Transient network/`5xx` failures remain queued and retry with short backoff. Dead-lettering is reserved for repeated non-transient per-op failures.

<!-- Updated: 2026-04-11 - Documented auth pause + transient retry + dead-letter boundaries -->

**Offline cache runtime compatibility**: IndexedDB helpers must degrade gracefully when `indexedDB` is unavailable (tests/non-browser contexts) by no-oping writes and returning empty/null reads.

<!-- Updated: 2026-04-11 - Documented IndexedDB unavailability fallback contract -->

**Push preference + subscription contract**: Notification preferences now include `push`, `push_comments`, `push_mentions`, and `push_reactions`; settings must keep these keys during updates. Browser subscribe/unsubscribe flows are owned by `/api/push/public-key` and `/api/push/subscribe`, while server dispatch uses `src/lib/push/web-push.ts`.

<!-- Updated: 2026-04-11 - Documented push preference schema and API ownership -->

**Onboarding Persistence**: Persist onboarding state under a user-scoped storage key (`${ONBOARDING_STORAGE_KEY}:${currentUser.id}`) and wrap storage reads/writes in `try/catch` so blocked storage does not crash the slice. Hydrate that user-scoped state inside onboarding event handlers before branching on skip/complete flags. Track paused controls-tour progress with `onboardingPausedCoachmarkStep` (not checklist-time `onboardingCoachmarkStep`), and prefer that paused marker when resuming `know-controls`; keep checklist transitions free to reset active coachmark step without losing paused resume context. Minimized-pill body resume should expand back to checklist, while `startOnboardingTask('know-controls')` resumes coachmarks at the saved step (clamped to the active viewport sequence). On mobile, manually expanding a minimized checklist pill must keep the checklist surface visible (including `Skip walkthrough`), suppress hint/coachmark overlays until the user explicitly taps a task CTA (`Start`/`Continue`), and avoid running continuous anchor measurement loops while that manual-resume checklist surface is shown. Any checklist/pill CTA bound to paused controls flow should read `Continue` (not `Start`). Completed checklist task actions must render as disabled `Done` buttons and stay non-interactive.

<!-- Updated: 2026-05-12 - Clarified minimized-pill resume wording while preserving onboarding persistence rules -->

> Domain-specific gotchas (onboarding, editor, sharing, realtime, Base UI) live in `.claude/rules/` and load automatically when you touch relevant files.

## Animations

Guideline @./animation-guidelines.md

- Use `motion` library (Framer Motion)
- 60fps smooth • Spring physics • Stagger lists • Exit animations
- Reduced motion support via `prefers-reduced-motion`

## Plan Mode

- Make the plan extremely concise. Sacrifice grammar for the sake of concision.
- At the end of each plan, give me a list of unresolved questions to answer, if any.

## Best Practices

**State**: Zustand slices for related functionality • Use `useShallow` for selectors • Prefer derived state • Strict TypeScript

**TypeScript**: Strict types in `src/types/` • Interface composition • Export types with implementations • Never `any`, use `unknown` with guards • **React imports**: Use `import type { ComponentType } from 'react'` NOT `import React from 'react'; React.ComponentType`

**Styling**: Tailwind + custom variants • Components in `src/components/ui/` • Themes distributed (glassmorphism-theme, metadata-theme) • Base UI headless primitives • CSS variables • Focus-visible states

**Docs**: Generated docs → `./ai-docs/[feature]/[doc-name].md` • JSDoc for complex functions • ADRs for major changes

## Known Technical Debt

1. Consider reorganizing root-level AI routes under `ai/` directory
2. Set up `supabase gen types` for automated TypeScript type generation
3. Implement actual conflict resolution for real-time collaboration (currently last-write-wins)
4. Add `@media (hover: hover)` wrapper for touch device hover states in animations
