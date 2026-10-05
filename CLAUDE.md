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
pnpm type-check      # TypeScript validation (TS 7 native tsc)
pnpm build           # Production build
pnpm test            # Unit tests (Jest + RTL, 727 tests)
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

**Stack**: Next.js 16 (App Router) • React 19 • TypeScript • Zustand (24 slices) • React Flow (canvas) • Motion (animations) • Supabase (auth/DB/realtime) • Tailwind CSS • OpenAI GPT

**Full Reference**: See [docs/CODEBASE_MAP.md](docs/CODEBASE_MAP.md) for directory structure, slices, node types, API routes, component directories, and data flows.

## Core Gotchas

**NodeData.metadata**: Single unified type (not discriminated union per node type). Enables seamless node type switching without data loss. Do NOT split into per-type unions.

<!-- Updated: 2026-07-18 - Documented layout commands, cycle-safe local reflow, and edge-only connection hierarchy -->

**Edge routing**: Raw manual waypoint editing is removed. Normal persisted edges use auto-routed `waypointEdge` geometry. Explicit full ELK layout owns ELK label placement metadata (`metadata.elkLabel`) for labeled layered edges, but the converter snaps ELK's returned label center back onto the routed segment before render so the line passes through the label center. Layout presets are transient `LayoutConfig.presetId` commands: clear the ID after success and never show it as an active mode. Directional commands (`roomy-right`, `roomy-down`, `tree-right`, `tree-down`) must set and persist `layoutConfig.direction` for later local reflow, routing, and guided-tour behavior; `radial-tree` intentionally retains the existing direction. `tree-right`, `tree-down`, and `radial-tree` use the shared iterative spanning-forest helper because real maps may include cycles and cross-links; hierarchy placement uses tree edges only while all real edges remain as straight cross-links. Every non-layered preset uses straight `waypointEdge` geometry with `routingStyle: 'custom-layout'`, path-midpoint labels, and cleared `metadata.elkLabel`; local reflow continues to use only the persisted in-memory direction. Any orthogonal reroute/edit path that replaces ELK geometry must still clear stale ELK label metadata instead of reusing it. Future manual edge control must be constraint-based (anchor/bias/lane hints), never absolute bend points.

**Connection vs hierarchy contract**: Standard canvas connect (`onConnect` → `addEdge`) is edge-only and must not mutate node hierarchy (`nodes.parent_id` / `data.parent_id`). Hierarchy assignment remains explicit-only (child-node creation and `setParentConnection`). Deterministic local branch reflow is tree-oriented and must safe-no-op when parent ancestry is cyclic. Never set a top-level React Flow `parentId`/`parentNode` from `parent_id` (map load, history revert via `src/helpers/history/server/revert-state.ts`, `withNodeParent`): it makes the node a sub-flow child, so absolute positions render relative to the parent and the map scatters.

<!-- Updated: 2026-10-04 - Documented that hierarchy lives only in data.parent_id (no React Flow parentId) -->


**Identity precedence**: Use `user_profiles` as canonical identity source across sharing + realtime UI (`display_name`, `avatar_url`) with fallback order: auth metadata, then deterministic fallback helpers. Keep resolver logic centralized in `src/helpers/identity/resolve-user-identity.ts`.

<!-- Updated: 2026-02-24 - Unified collaborator label/avatar precedence across manage + presence -->

**PartyKit Supabase env precedence**: `SUPABASE_URL` overrides `NEXT_PUBLIC_SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE` overrides `SUPABASE_SERVICE_ROLE_KEY`. Keep only one canonical pair in PartyKit deploy env to avoid stale shadow values. PartyKit now trims and unwraps quoted env values and warns once when both variants are set with different values.

<!-- Updated: 2026-02-24 - Documented PartyKit env shadowing/quoting gotcha for realtime admin failures -->

**PartyKit WS auth fallback**: Realtime connect auth first verifies JWT via JWKS; if that fails, it falls back to Supabase `/auth/v1/user` token validation using service-role credentials. This is a resilience path for issuer/JWKS drift; treat fallback log lines as configuration debt to clean up.

<!-- Updated: 2026-02-24 - Documented realtime JWT fallback behavior and operational meaning -->

**Database function grants**: SECURITY DEFINER functions in `public` are service_role-only by default, and default privileges for `postgres` no longer grant EXECUTE to PUBLIC/anon/authenticated. A new RPC must either be called via `createServiceRoleClient()` or explicitly `grant execute ... to authenticated` and verify `auth.uid()` itself (never trust a `p_user_id` parameter). On Supabase, `revoke ... from public` alone is not enough: anon/authenticated hold direct grants, so revoke from `public, anon, authenticated`. AI usage RPCs (`increment_ai_usage`, `get_ai_usage`), `increment_usage_count`, `cleanup_old_history` (including cron) and subscription writes run through the service role. Billing tables (`user_subscriptions`, `user_usage_quotas`) have no user write policies.

<!-- Updated: 2026-10-03 - Documented DB function grant contract after production security audit -->

**DB-enforced guards**: Triggers keep `user_profiles.role` (`guard_user_profile_role`) and `mind_maps.is_template`/`template_category` (`guard_mind_map_template_flags`) system-managed for user sessions, and `enforce_map_node_limit` enforces the owner-scoped per-map node limit. That trigger mirrors `checkMapNodeLimit()` in `with-subscription-check.ts` (owner plan `limits.nodesPerMap`, default 50, `-1` unlimited) and skips upserts of existing nodes, so change both together. `user_profiles` rows are visible only to their owner and to users sharing a map (`private.shares_map_with`).

<!-- Updated: 2026-10-03 - Documented role/template/node-limit triggers and profile visibility scope -->

**Dependency security overrides**: Keep `pnpm.overrides` pins narrow and evidence-based. Current required overrides are `partykit>esbuild` because PartyKit still pins older esbuild, `miniflare>undici` scoped to PartyKit's Miniflare path, and `@serwist/turbopack>browserslist` because Serwist pins an exact vulnerable browserslist. The global `postcss` override was dropped once Next 16.3.8 resolved a patched internal PostCSS; do not re-add it unless `pnpm audit` flags PostCSS again. Prefer direct/transitive package updates over broad overrides, keep CI security gates (`security-audit.yml`, `dependency-review.yml`) active for dependency file changes, and re-run `pnpm audit` plus `pnpm why esbuild undici postcss browserslist` after PartyKit/miniflare/Next/PostCSS/Serwist bumps. Do not silence advisories with `auditConfig.ignoreGhsas`; remove the vulnerable path instead. `braces` (GHSA-vfj7-8cjw-p6xm, no patched release) is eliminated by aliasing `@next/eslint-plugin-next>fast-glob` to `tinyglobby` (the plugin only calls `globSync(pattern, { onlyDirectories: true })` when `settings.next.rootDir` is set) and by not installing the `shadcn` CLI as a devDependency (run `pnpm dlx shadcn@latest add <component>` instead). Before bumping `eslint-config-next`, confirm the plugin still only uses `globSync`, and drop the alias once it stops depending on `fast-glob`.

<!-- Updated: 2026-10-03 - Removed braces via tinyglobby alias + shadcn dlx instead of audit ignore -->

**Vercel package manager**: Keep repo-level `vercel.json` install/build commands pinned to pnpm (`pnpm install --frozen-lockfile`, `pnpm build`) so Vercel does not default to `npm i` and fail on npm-only peer resolution of the current lint stack.

<!-- Updated: 2026-04-09 - Documented Vercel npm/pnpm install-command mismatch guardrail -->

**GitHub Actions pnpm source-of-truth**: In workflows using `pnpm/action-setup`, do not set a separate `version` input when `package.json#packageManager` already pins pnpm (especially with integrity hash). Use one source to avoid `ERR_PNPM_BAD_PM_VERSION`.

<!-- Updated: 2026-04-09 - Documented CI pnpm version-source conflict guardrail -->

**TypeScript 6 + 7 side-by-side**: `typescript` is aliased to `@typescript/typescript6` (TS 6 API for typescript-eslint, `next build` type step, Jest/editor tooling) and `@typescript/native` aliases TS 7, which owns the `tsc` binary (`pnpm type-check` ≈2s vs ≈11s). TS 7 ships no JS API until 7.1 and typescript-eslint supports TS `<6.1`, so do not point `typescript` at TS 7 (ESLint crashes). Use `pnpm exec tsc6 --noEmit` to cross-check TS 6. Revisit when typescript-eslint supports TS 7 (tracking issue typescript-eslint#10940).

<!-- Updated: 2026-10-02 - Adopted official TS 6/7 side-by-side setup -->

**ESLint flat config**: Next.js 16's `eslint-config-next/*` exports flat config arrays. Import those exports directly in `eslint.config.mjs`; do not wrap them in `FlatCompat`, because ESLint 10 legacy config validation can crash on circular plugin objects from `eslint-plugin-react`. Keep `settings.react.version` explicit rather than `detect` while the current React plugin is on the ESLint 9-era context API. Keep `.worktrees/**` in ESLint ignores and `<rootDir>/.worktrees/` in Jest `modulePathIgnorePatterns`; nested worktrees carry their own stale `node_modules`/mocks and crash lint or duplicate Jest mocks.

<!-- Updated: 2026-10-02 - Documented worktree ignores for ESLint/Jest alongside flat-config guidance -->

**LAN-safe local dev URLs**: Browser Supabase + PartyKit clients must derive from `window.location.hostname` whenever the configured public URL is loopback-only and the browser host is non-loopback (LAN device access), even if client `NODE_ENV` is unavailable. Keep server-side Supabase traffic on `SUPABASE_INTERNAL_URL` when local services stay on loopback, and do not reintroduce `NEXT_PUBLIC_APP_LOCAL_HREF` for browser fetches.

<!-- Updated: 2026-04-12 - Documented LAN-safe browser-vs-server URL split and NODE_ENV-independent loopback-to-LAN derivation -->

**Next.js 16 LAN dev origins**: Next.js blocks cross-origin requests to dev assets/endpoints by default. Keep `next.config.ts#allowedDevOrigins` aligned with active LAN hosts (for example `192.168.0.239`) when testing from phones/tablets, and prefer `pnpm dev:lan` for explicit LAN host binding. In development on insecure non-loopback HTTP origins, keep service-worker registration disabled to avoid unstable PWA behavior while preserving localhost and production HTTPS behavior.

<!-- Updated: 2026-04-12 - Documented Next.js dev-origin allowlist, insecure LAN SW disable pattern, and dev unregister cleanup expectation -->

**Supabase SSR cookie key**: Browser and server Supabase clients must share the same auth storage/cookie key. Derive that key from the configured Supabase URL, not the runtime LAN host, or successful LAN logins will bounce back to `/auth/sign-in` because the server looks for a different `sb-*` cookie name.

<!-- Updated: 2026-04-01 - Documented Supabase cookie-name mismatch gotcha for LAN logins -->

**History revert + list scope**: `revertToHistoryState` restores the whole map to that entry, undoing every newer change; it is not a per-change undo. UI copy must say "Restore map to this point" and show the undone count (`countChangesUndoneByRevert`), never "Revert this change". The list API returns only the current checkpoint scope (one snapshot plus its events; older ones are pruned on checkpoint creation), so do not build checkpoint timelines or filters on the loaded list. Row titles, grouping and filters live in `src/components/history/model/history-timeline.ts`. Base UI 1.8 marks selected tabs with `data-active` (not `data-selected`).

**Map Settings templates**: `is_template` and `template_category` are system-managed and not user-editable in the Map Settings panel.

<!-- Updated: 2026-02-27 - Removed non-persisting template controls from map settings UI -->

**Node editor parser scope**: Parser syntax no longer supports `bg:`, `border:`, `src:"..."`, `[[...]]`, `confidence:*`, or `$reference` quick-switch in node editor flows. Syntax Help is split into `Universal` (type-filtered) and `Node-specific` sections.
For title metadata use lowercase quoted syntax `title:"..."` (not `Title:`).

<!-- Updated: 2026-04-08 - Consolidated parser-scope updates: deprecated token removals, dual syntax-help model, and canonical lowercase quoted title syntax -->

**Node editor quick-input layout**: Keep quick input as a wide split modal with a matching 50/50 split top bar and bounded body: node type label on the left, Preview/Syntax Help tabs on the right, center separators in both rows, and a full-width footer action bar. Editor and preview panes should fill the bounded body without inset card chrome, but must not use unbounded page-height `h-full` chains or CodeMirror scroll-past-end padding that push the footer/textbox surface out of view. Keep subtle editor line numbers/scrollbar affordance for multi-line input, keep line-number glyphs baseline-aligned while horizontally centered in the gutter, top-align preview content, and style the right-panel controls as a true tab strip (strong hover plus selected underline, not pill buttons) that stretches to full top-bar cell height and aligns from the split divider (left-aligned, no right inset). In panel mode, syntax-help scrolling should be owned by the right pane container rather than nested inner max-height scrollers. `Ctrl+/` selects the Syntax Help tab instead of toggling a separate below-editor help card. Node editor previews should not slide/scale in, and task-node preview should disable task row entry animation while canvas task nodes keep their normal animation.

<!-- Updated: 2026-04-27 - Added left-aligned full-height tab-strip and baseline-centered gutter-number contract -->

**Task node visibility/title contract**: `taskNode` supports `metadata.hideCompletedTasks` (per-node hide/show for completed checklist items) and keeps progress stats based on full `metadata.tasks`, not only visible rows. Task titles are quick-input metadata (`title:"..."`) and must round-trip through node-editor parsing/serialization.

<!-- Updated: 2026-04-08 - Documented task-node hide-completed persistence and title round-trip contract -->

**Node editor autocomplete surfaces**: Keep `createCompletions()` as the single source of autocomplete options. Desktop pointer/hover contexts use the native CodeMirror tooltip; touch-first mobile/tablet/iPad contexts hide that tooltip and render a hybrid presenter, even when viewport width is desktop-sized: a compact full-width strip attached to the open keyboard, or a caret-anchored floating panel when the keyboard is hidden. Any editor/modal outside-press guard must treat both `[data-node-editor-autocomplete-tray="true"]` and body-portaled `.cm-tooltip*` elements as inside-editor interactions so selecting a suggestion does not dismiss the editor.

<!-- Updated: 2026-05-15 - Documented touch-qualified autocomplete presenter selection for iPad/tablet widths -->

**Device class hooks**: `useIsMobile` (`src/hooks/use-mobile.ts`) means "phone layout": `(max-width: 767px), (pointer: coarse) and (max-height: 500px)`, so landscape phones count as mobile while tablets do not. `useTouchFirst` (`src/hooks/use-touch-first.ts`) means "no keyboard can be assumed" (coarse pointer, no hover, or desktop-class iPad) and gates keyboard-shortcut hints (shortcuts help FAB, node editor `Ctrl+Enter` copy) and touch autocomplete surfaces. Do not gate keyboard hints by viewport width alone. On `useIsMobile`, the node editor renders full screen (`data-layout='fullscreen'`), the quick-input body drops its fixed `sm:` dialog height, and the footer shows a Cancel button (`ActionBar` `onCancel`) because there is no backdrop or Escape key to dismiss it.

<!-- Updated: 2026-10-03 - Landscape phones count as mobile; touch-first keyboard-hint gating -->
**Touch context menu fallback**: Do not rely on native `contextmenu` alone for mobile/iPad. Keep `useTouchContextMenuFallback` wired to the React Flow shell so touch long-press on `.react-flow__node[data-id]`, `.react-flow__edge[data-id]`, or `.react-flow__pane` opens the same context-menu store state path (`openContextMenuAt`) used by desktop right-click handlers. Preserve movement cancellation and trailing click/contextmenu suppression to avoid accidental immediate close/select side-effects after long-press activation.

<!-- Updated: 2026-04-08 - Added iPad/iOS WebKit long-press fallback and post-long-press suppression guardrail -->

**Landing CTA feedback**: Keep landing navigation CTAs (`Start Mapping`, `Get Started`, `Go Pro`) on `StartMappingLink` (`next/link` + `useLinkStatus` + optimistic pending feedback). Keep `src/app/dashboard/loading.tsx` as a dashboard-shell loading fallback (not a blank spinner) while dashboard auth/render work is pending, and keep in-page map-list loading progressive via card skeletons.

<!-- Updated: 2026-04-07 - Added landing CTA pending-feedback and dashboard loading-boundary guardrail -->

**Mind map navigation state**: Keep `MindMapCanvas` gated by the requested route id (`state.mapId === params.id` and `state.mindMap?.id === params.id`) and clear map-scoped runtime store state on map-route unmount via `clearMindMapRuntimeState()`. Bootstrap route map loads from `MindMapCanvas` (`setMapId` + `fetchMindMapData`) so loading begins before `ReactFlowArea` mounts. Make unmount clearing Strict Mode-safe (skip cleanup during immediate effect replay remount). Any async map load path must stale-guard writes when `state.mapId` no longer matches the request id. Keep the real editor shell visible while payload is pending, but pass empty graph data and gate map-dependent controls/actions by `isMapReady` to prevent stale flashes.

<!-- Updated: 2026-04-07 - Added stale-map flash prevention contract, fetch-bootstrap placement, and Strict Mode-safe unmount semantics for map-route transitions -->

**Realtime cleanup idempotency**: Yjs observer cleanup (`unobserve` / awareness `off`) and broadcast unsubscribe wrappers must be safe on repeated invocation. Slice-level unsubscribe flows should null stored handles before awaiting cleanup, and core realtime teardown should coalesce concurrent calls into one in-flight promise.

<!-- Updated: 2026-04-07 - Added repeated-unsubscribe safety contract for Yjs/broadcast/slice/core teardown paths -->

**Anchored annotation contract**: Annotation-to-host linkage is `metadata.anchorNodeId` + `metadata.anchorOffset` only; never use `parent_id`/React Flow `parentId` (hierarchy) or `targetNodeId` (reference nodes). An anchor whose host is missing, is an annotation, or is the node itself is treated as free. Anchored annotations must stay out of every layout pass (`splitAnchoredAnnotations`/`reattachAnchoredAnnotations`), never become AI node rows or targets (fold via `foldAnchoredAnnotation*` before aliasing), cascade-delete with their host inside the same `deleteNodes` call, and render only a derived `annotationTether` edge that is never stored in the edges slice.

**Collapsed-branch contract**: `getBranchIndex` (`src/helpers/collapse/branch-index.ts`) is the single source for collapse roll-ups (hidden count = full subtree excluding anchored annotations, branch tasks, pending statuses, severity, peek outline); do not rebuild subtree walks in components. Collapsing is deliberate and lives only in the node context menu ("Collapse Branch") and `Ctrl/Cmd+-` — do not reintroduce an on-node collapse button next to the add/AI buttons. Expanding stays on canvas via the "N nodes hidden" pill, always centered under the collapsed stack (the add button moves below it). Expand opens one level (deeper nodes keep their flag); Shift+click / `expandBranch(id, { all: true })` clears the subtree in one history step via `setNodesCollapsed`. Adding a child to a collapsed node expands it inside the same optimistic `addNode` update (one history step; the flag is saved only after the insert succeeds or is queued). Cross-links into hidden nodes are derived `collapsedProxy` edges in `getVisibleEdges` — never stored, selectable, or deletable; edge actions (context menu, double-click edit) must skip derived edges via `isDerivedDisplayEdgeId` (`src/helpers/derived-display-edges.ts`), which also covers `annotationTether`; AI suggestion edges are never proxied (they keep `aiData.connectionProxy`). Collapse state is shared (not per user), so search/peek expansion changes collaborators' view too.

<!-- Updated: 2026-10-03 - Derived-edge action guard and single-step add-child expand -->

**Rate Limiting**: In-memory only (`src/helpers/api/rate-limiter.ts`), won't scale horizontally without Redis.

**System Updates**: Call `markNodeAsSystemUpdate()` before real-time updates to prevent save loops.

**Export CORS**: External images swapped with placeholders to avoid canvas tainting.

**Ghost Nodes**: System-only (`userCreatable: false`), filtered from exports.

**Whole-map AI suggestions**: Map-scoped `magic-wand` suggestions now send the literal full eligible map context plus a whitelist of all valid anchor node IDs. Repeated clicks still carry per-map recent suggestion history and a rotated lens pair from `localStorage`, and the route still suppresses near-duplicate ideas server-side before streaming. If the full-map prompt exceeds the model request limit, surface that overflow explicitly instead of silently falling back to a summarized strategy. Treat any missing/invalid returned `context.sourceNodeId` as unanchored and place that ghost near the viewport center; never create ghost edges from unknown IDs.

**AI suggestion helper boundaries**: Keep `/api/ai/suggestions` as orchestration only. Suggestion graph modeling belongs in `src/helpers/ai-suggestion-graph.ts`, row serialization in `src/helpers/ai-suggestion-rows.ts`, user-prompt assembly in `src/helpers/ai-suggestion-user-prompt.ts`, system prompt text in `src/helpers/ai-suggestion-prompts.ts`, and streamed normalization/duplicate filtering/error mapping in `src/helpers/ai-suggestion-postprocess.ts`. Do not rebuild graph traversal, prompt text, or duplicate suppression inline in the route.

**Structured AI route boundaries**: Keep `/api/ai/suggest-merges` and `/api/ai/suggest-connections` as orchestration-only routes too. Route-specific request parsing, context shaping, prompt text, alias remapping, and streamed element normalization belong in `src/helpers/ai-merge-*` and `src/helpers/ai-connection-*`; the route files should stay limited to auth/quota checks, Supabase reads, `streamObject(...)`, stream-status events, and usage tracking. Do not drift merge duplicate filtering or connection validation back into the route handlers.

**Programmatic graph changes**: Plugins, recipes and any future API must change the graph through `applyGraphOps()` (`src/lib/extensions/graph-ops.ts`), never by calling node/edge store actions directly. It enforces edit permission, keeps plugin data inside `metadata.ext[<own plugin id>]` (max 16 KB per node) and wraps the batch in `beginHistoryBatch`/`endHistoryBatch` so it records one history event with `changes.actor`. `persistDeltaEvent` returns early while `historyBatchDepth > 0`, so anything that must record history on its own must not run inside a batch. `addNode`/`addEdge` swallow errors (`withLoadingAndToast`), so `applyGraphOps` assigns new node ids up front and checks each created node/edge is in the store before continuing. Ghost approval (`acceptSuggestion`) uses it with action `addNode` and actor `{ kind: 'recipe', id, label }` or `{ kind: 'user', id }`; the history list exposes recipe/plugin labels as `HistoryItem.actorLabel` (`readHistoryActorLabel`). `metadata.extension` and `metadata.ext` are reserved; they are listed explicitly in `baseMetadataSchema` so validation never strips them.

<!-- Updated: 2026-10-05 - Documented graph-ops entry point, history batching and reserved extension metadata; dropped the retired counterpoints route -->

**Contribution registry**: Menu and command entries live in `extensions-slice` as `Contribution`s (`src/types/extensions.ts`): `scopes` (node/map), `placements` (`aiMenu`, `commandPalette`), `when`/`isBusy`/`run`. Built-in AI actions (`src/lib/extensions/builtin-ai-actions.ts`) and palette commands (`builtin-commands.ts`) are the single definitions; the AI popover and Ctrl/Cmd+K palette (`src/components/mind-map/command-palette.tsx`) render via `selectContributions` / `selectPaletteEntries`. Surfaces must run entries through `useContributions().runContribution` so the AI quota guard applies everywhere. Do not hard-code AI actions in surfaces again, and keep the toolbar curated (plugin commands go to the palette). The right-click menu is editing-only: no AI actions, recipes or plugin entries there (user decision 2026-10-05; there is no `contextMenu` placement). Node-editor `$` triggers for plugin kinds use `commandRegistry.register()`, which refuses existing ids/triggers. Entries with `group: 'recipes'` render after the built-ins under a "Recipes" heading (popover) and a "Recipe ·" prefix (palette).

<!-- Updated: 2026-10-05 - Documented contribution registry, command palette, $ trigger registration and the editing-only right-click menu -->

**AI recipes**: A recipe is a `RecipeDefinition` (`src/lib/extensions/recipe-schema.ts`: instruction, scope `node`/`branch`/`map`, allowed node types from the safe suggestion set, labels, max 6 results). `POST /api/ai/recipes/run` is orchestration only; parsing, context, prompts and postprocessing live in `src/helpers/ai-recipe-{request,context,prompts,postprocess}.ts`. The client sends the full definition (saved, `starter:*` or unsaved draft), so the server must treat it as untrusted: the instruction is wrapped by the fixed `getRecipeSystemPrompt()`, the output schema is built per recipe (`buildRecipeOutputSchema`, strict-mode rules apply), and `processRecipeElement` re-checks types, labels, count and anchors (node scope always attaches to the focus, branch falls back to the focus, map to unanchored) and strips markdown images/link targets/HTML via `sanitizeRecipeText`, because approved nodes render markdown and an image URL would leak map text. Recipes become menu entries through `recipeToContribution` (`src/lib/extensions/recipe-contributions.ts`); results are ordinary ghosts with `context.recipe` for attribution. The built-in "Generate counterpoints" action runs `COUNTERPOINTS_RECIPE` (`starter:counterpoints`, hidden from menus) through the same route; there is no separate counterpoints route any more. Saved recipes live in `ai_recipes`: users read/write only their own rows (RLS), `install_count`/`source_recipe_id` are server-written (service role) and the `guard_ai_recipes` trigger caps users at 50 (`MAX_SAVED_RECIPES`, mirrored in the API). Unlisted recipes are read by link only through the service role (`loadSharedRecipe`), never via an RLS policy, so they can't be enumerated. Installing copies the definition (`source_recipe_id` set); never make copies follow the author's later edits. Stored definitions are re-validated on read (`toSavedRecipe`) because rows can be written through the Data API. The recipes panel (`src/components/recipes/recipes-panel.tsx`, flag `popoverOpen.recipes`, view in `extensions-slice.recipesPanelView` via `openRecipesPanel`) is a non-modal `SidePanel` so Try results and node selection stay on the canvas; editor views carry an `instance` so reopening the editor resets the form, and saving passes the current instance to keep it mounted. Try runs the draft through `useContributions().runContribution(recipeToContribution(draft))` so the quota guard applies; it lives in `RecipeTrySection` and only renders with `showTry` (the in-map panel). The dashboard page `/dashboard/recipes` (`src/app/dashboard/recipes/recipes-content.tsx`) reuses `RecipeList`/`RecipeEditor` without Try, keeps its own list/editor view state and discard guard, and calls `getCurrentUser()` on mount because `useSavedRecipes` only fetches once the store has a signed-in `currentUser` (map pages set it, the dashboard doesn't).

<!-- Updated: 2026-10-05 - Built-in Counterpoints runs the starter recipe; dashboard Recipes page -->

**Plugin runtime**: Plugins are a manifest (`src/lib/plugins/manifest-schema.ts`: reverse-DNS id, node kinds with typed `fields` and a `labelField`, `permissions: ['node:own']` only) plus plain JS that calls `definePlugin({ kinds: { <kind>: { render, summary?, actions? } } })`. Code runs in QuickJS inside a Web Worker (`src/lib/plugins/runtime/`: `sandbox.ts` one runtime per plugin, 16 MB, 50 ms render / 100 ms action deadlines, JSON in/out, no DOM/network/timers; `plugin-worker.ts`; `plugin-host.ts` restarts the worker on timeout). The prelude removes `eval` and every Function constructor (plain, arrow, async, generator), so plugins can't run code built from text; the host still evaluates plugin code through the engine API. Catalog entries list versions (`catalog.ts`: `{ id, versions: [{ version, sha256, permissions, notes }] }`, oldest first) and the loader refuses code whose `sha256` doesn't match (`code-fingerprint.ts`; skipped with a warning only when Web Crypto is missing outside production, e.g. LAN http) and manifests whose version or permissions differ from the entry. Published versions never change: to fix a first-party plugin, add `public/plugins/<id>/<new version>/` and a catalog version with its hash and notes, and keep old folders hosted. `catalog.test.ts` checks every version's hash and runs its examples and buttons in the sandbox, and checks that each version accepts its previous version's examples. Every map is pinned to one version (`map_plugins.version`): PUT pins the latest, `PATCH /api/maps/[id]/plugins/[pluginId] { version }` (owner only) updates or rolls back and stores `previous_version` for "Roll back to <version>"; the loader only ever loads the pinned version and reloads when it changes. The owner sees updates in the panel (`plugin-version-controls.tsx`: notes and power changes from `plugin-update-details.tsx`, nodes that won't fit from `countNodesNotFitting`, Later stored in `shiko_plugin_update_later_v1:<user>:<map>`), as "Update N maps" on the dashboard page, and as an update count in Ctrl/Cmd+K "Plugins" and Map Settings. The host keeps one copy per plugin id, so `plugins-slice` tracks which load sent the current code (`hostClaims`) and a stale load never unloads newer code. Never trust plugin output: views go through `validatePluginTree` (`ui-tree.ts`: strict primitives only, depth 8, 200 nodes, 16 KB; no images, links, markdown or HTML because a URL could carry node data out) and action results through `validatePluginData` (`plugin-fields.ts`). Load the host only via `loadPluginHost()` (lazy, so maps without plugins never fetch QuickJS, and `plugin-host-instance.ts`'s `import.meta.url` stays out of Jest). Plugin nodes are `extensionNode` with `metadata.extension = { pluginId, kind, kindLabel, version, data, snapshot }`; `snapshot` is the last validated view, shown when the plugin is off, missing, loading or failed (`PluginNodeContent`), and `content` holds the plugin's plain-text summary for search/AI/export. Actions save through `applyGraphOps` with actor `{ kind: 'plugin', id, label }`; graph-ops enforces node:own for plugin actors (own extension nodes only, `content` + `metadata.extension`, their `metadata.ext` namespace, no connections, 16 KB caps on data and snapshot). Owners turn first-party plugins on per map (`map_plugins` table, owner-only writes, readable by map viewers; `PUT/DELETE /api/maps/[id]/plugins/[pluginId]` accepts catalog plugins only, `src/lib/plugins/catalog.ts`, files in `public/plugins/<id>/<version>/`) in the Plugins side panel (`plugins-panel.tsx`, `openPluginsPanel()`; read-only for non-owners) or on the dashboard Plugins page (`/dashboard/plugins`, `GET /api/plugins/maps`). Every plugin feature needs a visible way in: the panel opens from Ctrl/Cmd+K "Plugins", the `$` list's "More node types…" row (owner, create mode; `createCompletions(…, { onBrowsePlugins })`, label `$plugins`, so `plugins` is a reserved kind) and Map Settings' "Manage plugins" (which goes through the discard guard). The "Build a plugin" guide (`/dashboard/plugins/build`) shows and downloads `src/lib/plugins/starter-plugin.ts`, which a test runs in the real sandbox; its tables read `limits.ts`, `manifest-schema.ts` and `ui-tree.ts` constants, so change those, not the guide text. Developer plugins load from `http://localhost`/`127.0.0.1` manifests for the owner only and live in localStorage (`shiko_dev_plugins_v1:<user>:<map>`), never the DB. Each successful load gets a new `LoadedPlugin.generation`, part of `pluginRenderKey`, so Reload redraws nodes instead of reusing views cached from the old code. `plugins-slice` loads enabled plugins with the map (stale-guarded by `mapId`, reset in `clearMindMapRuntimeState`); collaborators re-read the list (`refreshMapPluginsSoon`) when they meet a catalog plugin node that isn't on or was saved by a newer version, since toggles and updates aren't broadcast. CSP needs `'wasm-unsafe-eval'` in `script-src`.

**Plugin kinds in the node editor**: Plugin node kinds are created and edited in the node editor, never from the right-click menu. `PluginRegistrar` (mounted in `mind-map-canvas.tsx`) registers each running kind's `$kind` command (`Command.extension = { pluginId, kind }`, listed under "Plugins on this map") and an "Add <kind>" palette entry that opens the editor with `extensionKind`. `processNodeTypeSwitch` matches triggers exactly (`$metric` must not resolve to `$metrics`). For a plugin kind the editor uses typed field syntax (`Weekly active users value:1240 target:2000`, parsed by `parsePluginFieldInput`, serialized by `serializePluginFieldInput` for edit mode): the CodeMirror `pluginFieldsField` (`integrations/codemirror/plugin-fields.ts`) switches highlighting, `createCompletions()` and validation from built-in patterns to the kind's fields; Syntax Help comes from `buildPluginKindPatterns` (`plugin-kind-editor.ts`); the preview is `PluginEditorPreview` (the plugin's live view); Create stays disabled while fields are invalid. Saving runs the plugin's render for the snapshot and summary (`buildPluginNodeSaveData`, `node-creator.ts` `extensionNode` case). Edit mode switches both ways like built-in types (`$metric` on a note, `$note` on a Metric node); `updateNodeDirect` clears `metadata.extension` when a plugin node becomes a built-in type because `updateNode` merges metadata. M1 limits: plugin nodes skip universal metadata (#tag, @, ^, !), and `openNodeEditor` refuses to edit a plugin node whose plugin isn't running.

<!-- Updated: 2026-10-05 - Documented the plugin runtime, plugin versions and plugin kinds in the node editor -->

**AI structured-output schemas**: `@ai-sdk/openai` defaults to OpenAI strict structured outputs, so every Zod schema passed to `streamObject` must list every key as required: use `.nullable()` for unused fields, never `.optional()` or `.partial()`, and avoid string formats such as `.url()`. A violation fails the whole request with `invalid_json_schema`. Lenient handling belongs in the postprocess helpers.

<!-- Updated: 2026-10-03 - Documented OpenAI strict structured-output schema rules -->


**Collapsed-branch connection suggestion proxying**: `suggestions-slice.addConnectionSuggestion()` may now remap hidden suggestion endpoints to visible collapsed ancestors for rendering and stores the true node IDs in `edge.data.aiData.connectionProxy` (`original*` vs `display*` IDs plus hidden-child labels). Keep dedupe keyed by original IDs, and `acceptConnectionSuggestion()` must create the real edge from original IDs, not display/proxy IDs. Collapse descendant traversal in `nodes-slice.getDescendantNodeIds()` must ignore transient AI suggestion edges so proxy suggestion edges do not hide unrelated visible nodes, and collapsed-ancestor lookup for hidden endpoints should use structural (non-suggested) edges only.

**Suggestion rerun replacement gating**: Connection/merge reruns should clear prior transient AI suggestion edges only when `triggerStream(...)` returns `true`. If stream start is rejected (already streaming/throttled), keep existing suggestion edges/merge state unchanged.

**AI SDK 7 instructions contract**: Pass system prompts via the top-level `instructions` option on `streamObject`/`streamText`/`generateText`, never as `{ role: 'system' }` entries in `messages`. AI SDK 7 rejects system messages in `messages` at runtime (no model call, empty element stream, only `onError` fires) while TypeScript and mocked route tests still pass. Do not enable `allowSystemInMessages`; `/api/ai/chat` filters client-sent system messages and owns instructions server-side. When setting OpenAI `reasoningEffort`, also set `reasoningSummary: null` unless summaries are consumed (v7 defaults it to `'detailed'`). Keep `useChat`'s `onFinish` (the v7 `onFinish`→`onEnd` rename applies to core/stream helpers, not `ChatInit`; the `@ai-sdk/codemod v7` mis-renames it and ignores `--dry`).

<!-- Updated: 2026-10-02 - Documented AI SDK 7 instructions contract after v6->v7 migration -->

**Row-based AI node-id aliasing**: Every compact row-based AI route (`/api/ai/suggestions`, `/api/ai/chat`, `/api/ai/recipes/run`, `/api/ai/suggest-merges`, `/api/search-nodes`) must alias model-visible node IDs through `src/helpers/ai-id-alias-map.ts` before prompt assembly. The model should see dense numeric node IDs in `NODE` / `REL` / `ANCHOR` / `RECENT` rows and any free-text request metadata that mentions node IDs; server code must resolve those aliases back to UUIDs before anchor validation, duplicate suppression, placement, merge validation, search validation, or client streaming. Do not let UUIDs leak into model-visible rows or numeric aliases leak into app-facing payloads.

**Typed AI ghost approval**: `/api/ai/suggestions` may now stream an optional `nodePayload` alongside `content` for safe typed nodes. The route should only emit safe typed v1 nodes (`defaultNode`, `textNode`, `taskNode`, `questionNode`, `annotationNode`, `codeNode`), must downgrade malformed structured payloads to `defaultNode` before ghost creation, and ghost approval in `suggestions-slice` must build the final node from `nodePayload` instead of trying to infer typed metadata from `suggestedContent`. `taskNode` approval is the critical case: checklist rows live in `metadata.tasks`, so approving a task ghost without payload is a bug.

**Polar 1.0 billing contract**: Use `createPolarClient()` / `getPolarEnvironment()` from `src/lib/polar.ts` (`@polar-sh/sdk/2026-10`). Polar webhook payloads are snake_case and are NOT schema-validated by `@polar-sh/nextjs` (signature + event type only), so the webhook types `data` as the SDK `models.Subscription` and the Polar webhook endpoint's `api_version` must stay aligned with the SDK version (sandbox/prod endpoints were still `2026-04` on 2026-10-02; `Subscription` is identical between 2026-04 and 2026-10; the version is not changeable via API/MCP). Checkout sends `external_customer_id = user.id`; portal still resolves the stored `polar_customer_id`. `paused` maps to `unpaid` (no Pro access). Webhook regression test signs a real sandbox wire fixture (`src/app/api/webhooks/polar/__fixtures__`). **Stale-event guard**: Polar retries deliveries out of order (observed 15+ min late), so every handler stores the applied version in `user_subscriptions.metadata.polar_modified_at` (`modified_at`, falling back to `created_at` for created/active payloads) and skips strictly older events while still returning 200. Never write a subscription row from a webhook without updating that version.

<!-- Updated: 2026-10-02 - Documented Polar SDK 1.0 webhook/API-version contract and stale-event guard -->

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
5. Reconcile Supabase schema drift: prod migration history stops at 2026-02-12 (`notifications` applied outside history; `offline_op_receipts`, `push_subscriptions`, `create_history_checkpoint_and_prune`, `ai_recipes` (`20261004150818_create_ai_recipes.sql`, local only) and `map_plugins` (`20261005111243_create_map_plugins.sql` plus `20261005211404_map_plugin_versions.sql`, local only) missing in prod), local differs too (extra objects, `supabase_admin`-owned functions), and `supabase/` is gitignored so migrations must be force-added
6. Enforce the Content Security Policy (currently report-only in production; scripts still need `'unsafe-inline'` until nonces are added)
7. `images.remotePatterns` allows any HTTPS host (open `/_next/image` proxy) for link previews; consider unoptimized remote images or a constrained proxy
