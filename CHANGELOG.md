# Changelog

All notable changes to this project are documented here.
Format: `[YYYY-MM-DD]` - one entry per day.

---

<!-- Updated: 2026-02-24 - Permissions/quota hardening, realtime cursor safety, typing/accessibility fixes, and dependency vulnerability remediation -->
<!-- Updated: 2026-02-26 - Restored template graph visibility for authenticated viewers and aligned template permissions API -->
<!-- Updated: 2026-02-27 - Added account/billing settings safety flows and aligned map-settings color tokens -->
<!-- Updated: 2026-02-28 - Cleaned deprecated node-editor parser tokens, split syntax help into universal/node-specific sections, and added parser/completion regression tests -->
<!-- Updated: 2026-03-04 - Added notifications system (in-app inbox + Resend email + mention/reply/reaction/access events) -->
<!-- Updated: 2026-03-05 - Fixed notification side-effect timing so email dispatch is no longer deferred by client focus/activity -->
<!-- Updated: 2026-03-06 - Fixed shared-map node entitlement flow for collaborators by using owner subscription lookup in server API checks -->
<!-- Updated: 2026-03-07 - Tightened template preflight failure handling and create/edit node-limit UX gating -->
<!-- Updated: 2026-03-11 - Replaced broken local ELK edits with deterministic branch reflow and persisted per-map layout direction -->
<!-- Updated: 2026-03-11 - Switched normal edges to auto-routed waypoint geometry and removed raw manual waypoint editing -->
<!-- Updated: 2026-03-17 - Replaced pricing-first onboarding with an editor-first walkthrough and split upgrade prompts back to the dedicated modal -->
<!-- Updated: 2026-03-17 - Refined onboarding v2 with split intro, canvas/add substeps, toolbar-state fix, and Pro upsell guard -->
<!-- Updated: 2026-03-18 - Added mobile onboarding shell, viewport-aware controls tour, and touch edit affordance -->
<!-- Updated: 2026-03-20 - Morphed the minimized walkthrough into the checklist surface and repositioned the walkthrough anchors for cleaner motion -->
<!-- Updated: 2026-03-25 - Replaced minimized walkthrough resume copy with the next actionable task -->
<!-- Updated: 2026-03-25 - Patched GitHub Dependabot vulnerabilities with targeted dependency upgrades -->
<!-- Updated: 2026-03-28 - Resolved PR #46 merge conflicts and preserved local layout plus onboarding/access behavior -->
<!-- Updated: 2026-03-28 - Hardened layout animation/reflow cleanup, legacy layout normalization, and waypoint-edge rendering after CodeRabbit review -->
<!-- Updated: 2026-03-28 - Handled quick-input local layout rejections after create mode node insertion -->
<!-- Updated: 2026-03-29 - Refined mobile autocomplete tray portal targeting, dismiss handling, and scroll containment -->
<!-- Updated: 2026-03-29 - Addressed follow-up autocomplete review comments around runtime config updates, hover guards, and docs -->

## [2026-03-29]

### Fixed

- **node-editor/mobile-autocomplete-scroll-containment**: Moved the mobile autocomplete tray portal into the node-editor overlay, kept the floating panel below the typed text, and contained overscroll for both the tray and the native CodeMirror autocomplete popover so dragging past the end of the suggestions list no longer scrolls the page behind it
  - Why: The body portal was interacting poorly with modal outside-click handling, and both autocomplete surfaces needed to behave like isolated input layers instead of leaking scroll gestures to the editor/page
- **node-editor/mobile-autocomplete-strip-chrome**: Removed the top corner radius from the keyboard-open tray mode so the strip reads as a cleaner continuation of the mobile viewport instead of a floating card
  - Why: Rounded top corners looked visually wrong once the tray was made flush to the keyboard/open viewport edge
- **node-editor/autocomplete-runtime-config**: Stopped rebuilding the CodeMirror view when the enhanced input placeholder or native autocomplete visibility toggles change, and reconfigured those settings in place instead
  - Why: Recreating the editor for presentation-only prop changes was unnecessary churn and could interrupt active autocomplete state
- **node-editor/mobile-autocomplete-hover-guards**: Moved tray hover treatments behind `(hover: hover)` media queries and documented the overlay dismissal contract plus viewport/autocomplete bridge heuristics
  - Why: Touch devices should not keep sticky hover styling, and the portal/dismiss/runtime-visibility rules need to stay explicit for future editor changes

<!-- Updated: 2026-03-29 - Tightened node-editor autocomplete regression coverage -->
<!-- Updated: 2026-04-01 - Fixed LAN local-dev URL/auth behavior, tightened node-editor dismissal docs/tests, and consolidated the landing redesign plus responsive hero polish -->
<!-- Updated: 2026-04-02 - Simplified landing copy below the hero and synced the hero promise to the approved momentum-to-clarity language -->
<!-- Updated: 2026-04-07 - Added immediate landing CTA navigation feedback with route-level dashboard loading boundary -->
<!-- Updated: 2026-04-07 - Moved walkthrough checklist/pill to the left and lowered walkthrough/tour overlays below side panels -->
<!-- Updated: 2026-04-07 - Added map-route loading skeletons plus map-scoped runtime store reset to prevent stale map flashes -->
<!-- Updated: 2026-04-07 - Fixed map-route skeleton deadlock by bootstrapping fetch before canvas readiness gate -->
<!-- Updated: 2026-04-07 - Made map-route unmount clear Strict-Mode-safe to avoid aborting in-flight initial loads -->
<!-- Updated: 2026-04-07 - Aligned mind-map loading skeleton chrome with real map top bar/canvas/bottom dock layout -->
<!-- Updated: 2026-04-07 - Shipped progressive map-shell streaming and hardened Yjs cleanup idempotency against repeated unsubscribe paths -->
<!-- Updated: 2026-04-07 - Replaced dashboard spinner fallback with shell-parity loading and in-page progressive map-card skeleton streaming -->
<!-- Updated: 2026-04-08 - Fixed onboarding skip-state refresh regression and preserved controls-tour paused-step resume across refresh -->
<!-- Updated: 2026-04-08 - Added touch long-press context menu fallback for iPad/iOS WebKit and regression tests -->
<!-- Updated: 2026-04-08 - Added task-node hide-done filtering, title round-trip parsing, and regression coverage -->
<!-- Updated: 2026-04-08 - Aligned task title syntax help with parser and hardened status regex prefix exclusions -->
<!-- Updated: 2026-04-09 - Hardened PartyKit dependency security path and added CI audit/dependency review workflows -->
<!-- Updated: 2026-04-09 - Replaced removed Lucide GitHub icon import with local SVG component -->

## [2026-04-09]

### Changed

- **deps/runtime-cleanup**: Removed unused runtime dependencies `@lezer/highlight`, `@lezer/lr`, and `web-vitals`; moved `@types/react-syntax-highlighter` to `devDependencies`
  - Why: Reduce production dependency surface while keeping type-only packages in development scope
- **deps/partykit-hardening**: Added `pnpm.overrides` pins for `partykit>esbuild` (`0.25.0`) and `undici` (`6.24.0`) to remediate PartyKit transitive audit findings
  - Why: `pnpm audit` reported vulnerabilities on `partykit>esbuild` and `partykit>miniflare>undici`

### Added

- **ci/security-audit-workflow**: Added `.github/workflows/security-audit.yml` to run `pnpm audit --prod --audit-level=high` and full `pnpm audit --audit-level=high` on dependency file changes
  - Why: Enforce repeatable vulnerability gates in CI
- **ci/dependency-review-workflow**: Added `.github/workflows/dependency-review.yml` to run dependency review on PRs touching `package.json` or `pnpm-lock.yaml`
  - Why: Surface risky dependency deltas during code review

### Fixed

- **auth/github-icon-compatibility**: Replaced `lucide-react` `Github` imports with a local `GithubIcon` SVG component used by sign-in and anonymous-upgrade flows
  - Why: `lucide-react@1.7.0` no longer exports `Github`, which broke `next build`
- **ci/vercel-package-manager-mismatch**: Added `vercel.json` with explicit `installCommand` (`pnpm install --frozen-lockfile`) and `buildCommand` (`pnpm build`)
  - Why: Vercel was executing `npm i`, which failed peer-resolution against the current ESLint dependency graph

## [2026-04-08]

### Fixed

- **onboarding/walkthrough-skip-refresh-race**: Hydrated onboarding state at node-create event boundaries and ignored create events while onboarding is fully hidden, so skipped walkthrough state no longer reopens after refresh + node creation
  - Why: On refresh, create events could run before onboarding state hydration and incorrectly re-activate checklist flow despite persisted skip state
- **onboarding/controls-tour-pause-resume**: Preserved coachmark step/anchor context when pausing, expanded pill-body resume back to the checklist card, kept controls-tour continuation bound to the `Know the controls` action with viewport-clamped step restore (including after reload), and preserved paused progress when minimizing from checklist back to pill
  - Why: Pausing the controls tour either jumped directly back into coachmarks from the pill body or reset continuation paths to step 0 after refresh/re-minimize
- **onboarding/mobile-controls-tour-start-resume**: Reused paused-coachmark resume logic for `startOnboardingTask('know-controls')`, so tapping `Start` from the minimized pill on mobile resumes the paused step instead of restarting from the first control
  - Why: Mobile users continuing the controls tour from the pill action were still routed through a fresh step-0 start path
- **onboarding/minimized-pill-paused-copy**: Updated paused-controls-tour minimized pill CTA text from `Start` to `Continue` while keeping normal task-start pills on `Start`
  - Why: Paused flows should communicate continuation semantics, not a fresh start
- **onboarding/checklist-paused-controls-copy**: Updated the checklist `Know the controls` task button to show `Continue` when controls-tour progress exists
  - Why: After expanding from a paused pill, the checklist still showed `Start`, which implied a reset instead of continuation
- **onboarding/checklist-completed-task-cta-disabled**: Disabled checklist task action buttons once their state is `Done` so completed tasks cannot be restarted from the checklist surface
  - Why: Completed task CTAs remained clickable and could incorrectly relaunch already finished onboarding steps
- **onboarding/mobile-pill-manual-expand-checklist**: Kept the checklist surface visible when manually expanding a minimized mobile first-task pill and suppressed hint/coachmark overlays on that manual expand, so users can access walkthrough controls like `Skip walkthrough` and only start task guidance from explicit `Start`/`Continue` taps
  - Why: Expanding the minimized first-task pill hid checklist controls and also felt like the task auto-restarted by immediately returning to hint UI
- **onboarding/paused-coachmark-marker**: Added explicit paused-controls-tour state (`onboardingPausedCoachmarkStep`) and updated resume/minimize/start logic to prefer that marker over checklist-time `onboardingCoachmarkStep` resets
  - Why: Checklist transitions (create-node/pattern updates) intentionally reset active coachmark step and were still able to erase paused controls-tour resume context without a dedicated paused marker
- **onboarding/manual-resume-anchor-measure-loop**: Disabled target-rect requestAnimationFrame measuring while the manual-resume checklist is intentionally shown on mobile
  - Why: Manual pill expand should be a stable checklist surface for skip/selection actions and does not need continuous anchor measurement until an explicit task CTA restarts guided overlays
- **mind-map/mobile-context-menu-long-press-fallback**: Added touch long-press detection for `.react-flow__node`, `.react-flow__edge`, and `.react-flow__pane` targets, opening the existing context menu store state at press coordinates and keeping desktop/native `contextmenu` handling unchanged
  - Why: iPad/iOS WebKit does not reliably emit `contextmenu` for press-and-hold, so mobile users could not access context-menu-only actions
- **mind-map/mobile-context-menu-trailing-click-guard**: Suppressed the immediate synthetic click/contextmenu events after long-press activation to avoid accidental selection/close side-effects right after opening the menu
  - Why: Long-press interactions can emit trailing click-like events that would immediately interfere with the newly opened custom menu
- **mind-map/mobile-context-menu-native-race-guard**: Hardened long-press timeout handling against native-contextmenu races by skipping deferred open when the context menu is already open and clearing pending press state when trailing native contextmenu suppression runs
  - Why: A pointerdown followed by native contextmenu could otherwise allow the long-press timeout to fire later and attempt a duplicate open
- **mind-map/mobile-context-menu-container-scope**: Scoped touch fallback listeners to the immediate React Flow canvas wrapper instead of the broader ReactFlowArea shell
  - Why: Gesture suppression should align with the actual flow surface and not capture unrelated modal/shell interactions
- **node-editor/status-prefix-lookbehind-case**: Made status-regex prefix exclusions case-insensitive in parser and CodeMirror decorations so prefixes like `Title:`/`title:` are consistently excluded from status matching
  - Why: Prefix exclusion only handled lowercase variants, causing inconsistent parse/highlight behavior for mixed-case input

### Added

- **tests/onboarding-resume-regressions**: Added onboarding slice coverage for skip-state hydration races, paused coachmark resume step restore, refresh rehydrate+clamp behavior, mobile `Start`-path resume behavior, checklist minimize/resume regression, and paused controls-step preservation across checklist task updates
  - Why: These state transitions are timing-sensitive and require explicit regression guards
- **tests/mobile-context-menu-touch-fallback**: Added hook-level long-press regression tests for node/edge/pane targeting, quick-tap and movement cancellation, and trailing-click suppression plus `useContextMenu` coverage for direct `openContextMenuAt` state wiring
  - Why: Touch fallback behavior is timing-sensitive and must remain stable across future React Flow/mobile interaction changes
- **tests/mobile-context-menu-native-contextmenu-sequence**: Added regression coverage for pointerdown -> native contextmenu -> timeout ordering plus ReactFlowArea hook-wiring assertions for open/closed context-menu state propagation
  - Why: Prevents regressions in the specific iPad/WebKit race and keeps fallback integration wiring observable in tests
- **tests/task-node-visibility-title-regressions**: Added focused coverage for task-node hide/show completed persistence, filtered rendering behavior, task title rendering, stats-source overrides, and task title quick-input round-trip serialization
  - Why: The new task-node visibility/title behavior spans render, metadata persistence, and quick-input parsing paths that are easy to regress without targeted tests

### Changed

- **nodes/task-node-hide-done-toggle**: Added a per-node toolbar toggle to hide/show completed checklist rows via persisted `metadata.hideCompletedTasks`, while keeping progress/celebration derived from the full task set
  - Why: Users need cleaner task views without deleting completed items or losing completion context
- **nodes/task-node-title-rendering**: Added task-node title display above task progress/list and wired quick-input `title:"..."` parsing + serialization to persist and round-trip task titles
  - Why: Task nodes needed first-class naming support that survives edit cycles
- **node-editor/task-title-syntax-help**: Updated task syntax-help patterns/examples from `Title:` to lowercase quoted `title:"text"` to match actual parser behavior
  - Why: The previous help suggested an invalid pattern that could be interpreted as status-like `:token` metadata in edge cases

## [2026-04-07]

### Added

- **landing/start-mapping-link-feedback**: Added a shared `StartMappingLink` component that uses `next/link` + `useLinkStatus` with instant optimistic click feedback, inline spinner/label swap, and a subtle fixed top progress hint during pending navigation
  - Why: Landing-to-dashboard clicks could feel unresponsive during auth/data latency and gave no immediate reassurance that the click registered
- **dashboard/route-loading-boundary**: Added `src/app/dashboard/loading.tsx` so App Router can render a segment loading fallback while dashboard auth/render work is in flight
  - Why: Dynamic dashboard navigation needs an explicit route loading boundary for reliable pre-navigation and in-flight visual feedback
- **tests/landing-navigation-feedback**: Added Jest coverage for immediate click feedback, `useLinkStatus` pending reflection, keyboard activation feedback, optimistic pending reset behavior, plus a Playwright regression test that delays dashboard navigation and asserts feedback appears first
  - Why: This interaction is easy to regress at both component and browser levels and now has focused guardrails
- **tests/walkthrough-layering-contract**: Added focused onboarding, guided-tour, and side-panel Jest coverage to lock z-index contracts (`onboarding/tour < side-panel`) plus desktop left-anchored checklist/pill behavior
  - Why: These are easy visual regressions that can silently return during UI polish without explicit contract tests

### Changed

- **landing/cta-navigation-wiring**: Replaced raw landing `Start Mapping` anchors in hero/nav/final CTA with the shared feedback-aware link component
  - Why: Raw anchors bypassed App Router link pending hooks and left click state opaque during slower transitions
- **landing/pricing-cta-navigation-feedback**: Wired pricing card `Get Started` and `Go Pro` buttons to the same shared pending-feedback link flow
  - Why: Pricing CTAs had the same no-feedback gap and needed immediate click reassurance consistent with the rest of the landing page
- **onboarding/walkthrough-layering-and-placement**: Lowered onboarding + guided-tour overlays beneath the `SidePanel` boundary and moved walkthrough checklist/pill anchoring from desktop right to left while keeping the mobile wide surface pattern
  - Why: Walkthrough UI is part of the app canvas layer, while settings/share/history side panels must remain above it as modal surfaces
- **mind-map/progressive-shell-streaming**: Kept the real map shell mounted during in-page loading, forced pre-ready graph props to `[]`, and streamed account chrome immediately while gating map-dependent actions behind `isMapReady`
  - Why: Preserves visual continuity and avoids stale map flashes without blocking top-level editor chrome while payload fetches
- **dashboard/progressive-shell-streaming**: Replaced the route-level full-screen spinner with a dashboard shell skeleton and switched in-page map loading from blocking text to progressive card skeleton streaming while preserving real header/toolbar shell
  - Why: Dashboard navigation now behaves consistently with map loading by showing stable chrome immediately and streaming content placeholders without hard screen swaps

### Fixed

- **mind-map/navigation-loading-gating**: Added a dedicated mind-map route loading boundary and in-canvas readiness gating so the editor renders a full skeleton until the requested `mapId` and `mindMap.id` are aligned
  - Why: Navigating from dashboard to a different map could briefly paint stale canvas state from the previous map before the new payload landed
- **mind-map/runtime-store-cleanup**: Added a map-scoped `clearMindMapRuntimeState()` action and call it on mind-map unmount, plus stale-request guards in `fetchMindMapData` to ignore late responses after route exit/switch
  - Why: Back-navigation and rapid map switches left old map data in shared client state long enough to flash incorrect content
- **mind-map/skeleton-fetch-bootstrap**: Moved route map bootstrap (`setMapId` + `fetchMindMapData`) to `MindMapCanvas` so loading can start while the skeleton gate is active
  - Why: Kicking off fetch inside `ReactFlowArea` created a deadlock once `ReactFlowArea` was intentionally hidden until requested-map readiness
- **mind-map/strict-mode-unmount-clear**: Deferred `clearMindMapRuntimeState()` cleanup to a microtask and skipped it if the canvas immediately remounts in Strict Mode effect replay
  - Why: Dev Strict Mode cleanup replay could clear `mapId` during first load and cause stale-guarded fetches to be dropped before readiness
- **mind-map/skeleton-chrome-parity**: Replaced the generic center-card loading skeleton with a map-view chrome skeleton (top bar placeholders, dotted canvas backdrop, and bottom dock/tool placeholders)
  - Why: The previous skeleton layout did not match the real editor structure and made route loading feel visually inconsistent
- **mind-map/skeleton-shell-parity-v2**: Tightened route fallback chrome spacing and visual rhythm to better match the live top bar/canvas/dock footprint, and removed non-existent center placeholders
  - Why: The first skeleton pass still looked materially different from the actual editor shell and caused perceptual mismatch during navigation
- **realtime/yjs-idempotent-unsubscribe**: Hardened Yjs observer cleanup paths and awareness teardown with repeated-unsubscribe safety, plus kept cleanup registry/slice/core guards aligned to single-run teardown semantics
  - Why: Back navigation and overlapping unmount cleanup calls could trigger duplicate unobserve/off attempts and surface `[yjs] Tried to remove event handler that doesn't exist`
- **tests/dashboard-loading-skeleton-regression**: Added focused tests for route-level dashboard shell loading and view-mode card skeleton counts, plus reran dashboard settings coverage
  - Why: Locks the new progressive dashboard loading behavior and prevents regressions back to blocking spinner-only fallbacks

## [2026-04-02]

### Changed

- **landing/copy-simplification-pass**: Synced the hero to the approved momentum-to-clarity copy and rewrote the support, features, pricing, FAQ intro, and final CTA copy into more direct product language
  - Why: The lower landing sections were still carrying too much atmospheric copy and were no longer matching the sharper, cleaner hero direction
- **landing/pricing-and-proof-polish**: Fixed feature proof image sizing/transform composition, moved hero CTA hover effects behind hover-capable media queries, and made pricing savings/CTAs derive from source tier data with accessible billing toggles
  - Why: The current landing still had a few implementation details that could cause incorrect transforms, oversized image requests, touch-device hover states, and duplicated pricing logic
- **landing/hero-multi-type-demo**: Replaced the task-only hero preview loop with a user-interview setup-friction story that evolves from text to note to question to task using real Shiko commands and preview rendering
  - Why: The hero proof now feels like a believable working moment instead of a generic demo, while keeping the same shell, sizing, and CTA composition

### Fixed

- **review/node-editor-and-history-follow-ups**: Enabled true mobile/touch emulation in the node-editor E2E suite, wired CodeMirror tooltip clamping into the live editor setup, passed the configured history page limit on the initial history fetch, and hardened node-editor/local-dev regression coverage around pointer dismissal and quoted local URL inputs
  - Why: These review findings were still leaving mobile/touch behavior, tooltip viewport bounds, initial history pagination, and helper normalization only partially enforced by the code and tests

## [2026-04-01]

### Fixed

- **local-dev/lan-safe-browser-service-urls**: Browser Supabase clients, PartyKit sockets, forgot-password recovery redirects, and dashboard/history fetches now follow the current browser hostname in development instead of sticking to `localhost` or `127.0.0.1`
  - Why: Opening the app as `http://<lan-ip>:3000` previously broke browser-visible local services by sending them back to loopback-only hosts
- **auth/lan-login-cookie-key**: Supabase SSR browser and server clients now share a stable auth cookie/storage key derived from the configured Supabase URL, so successful LAN password logins no longer bounce back to sign-in
  - Why: The browser LAN host changed the default `sb-*` cookie name, which made the server-side dashboard auth check miss an otherwise valid session
- **node-editor/portaled-autocomplete-dismissal**: On the merged main node-editor baseline, the editor sheet now uses Floating UI’s floating props and treats body-portaled `.cm-tooltip*` presses as inside-editor interactions, so selecting a native autocomplete suggestion no longer closes the editor
  - Why: CodeMirror renders its desktop/native autocomplete tooltip outside the editor DOM tree, which made suggestion taps look like backdrop presses

### Changed

- **local-dev/server-vs-browser-supabase-urls**: Server-side Supabase helpers now prefer `SUPABASE_INTERNAL_URL` while browser clients keep deriving their public host from the active LAN/local origin
  - Why: LAN sessions need a public browser URL while server-side local services can still stay on loopback
- **landing/product-story-redesign**: Rebuilt the landing into a tighter product story with calmer chrome, screenshot-led proof, a simplified pricing/FAQ close, and lower-friction section copy throughout
  - Why: The earlier page front-loaded most of its personality into the hero and then fell back to a more generic, over-explained SaaS rhythm
- **landing/hero-editor-and-responsive-polish**: Replaced the illustrative hero with a parser-driven editor demo, fixed hero routing/spacing fidelity, restored desktop proof scale, and simplified mobile-only chrome, highlight stacks, and title measures
  - Why: Follow-up iterations exposed disconnected hero geometry, undersized desktop proof, and noisy or over-tight mobile layouts that made the product feel less trustworthy
- **landing/features-pricing-faq-cleanup**: Removed misleading proof labels, aligned pricing CTA rhythm, added breathing room above pricing actions, and collapsed the FAQ into a single calmer shell
  - Why: These sections still had redundant chrome, uneven card rhythm, and labels that distracted from the actual product proof

### Docs

- **docs/local-dev-lan-guidance**: Updated `.env.example`, `README.md`, `CLAUDE.md`, and `docs/CODEBASE_MAP.md` with the LAN-safe runtime URL behavior and optional local-dev override vars
  - Why: The repo docs previously suggested loopback-only browser URLs and did not explain the public-vs-internal split
- **docs/local-dev-auth-cookie-key**: Documented the Supabase SSR cookie-name constraint for LAN logins
  - Why: Runtime LAN host derivation is safe only if browser and server still agree on the same auth storage key
- **docs/landing-and-node-editor-sync**: Updated `docs/CODEBASE_MAP.md` for the tighter landing flow, parser-driven hero proof, calmer landing polish, and merged node-editor outside-press dismissal contract
  - Why: The docs needed to reflect both the evolved landing architecture and the current autocomplete-dismissal behavior after merging `main`


### Added

- **tests/node-editor-dismissal-guard**: Added regression coverage for the merged node-editor shell so portaled autocomplete taps stay inside the editor while backdrop presses still dismiss it
  - Why: This bug sits at the modal/autocomplete boundary and is easy to reintroduce during future editor shell changes
- **tests/local-dev-url-derivation**: Added pure helper tests for LAN hostname derivation, current-origin auth redirects, and internal-vs-public Supabase URL resolution
  - Why: Keeps the local-dev network contract stable without depending on full browser integration tests

## [2026-03-29]

### Fixed

- **node-editor/autocomplete-regression-tests**: Added the exact single-space passive-input case and asserted single restart counts for chained manual trigger completion tests
  - Why: Locks the original Space regression to the literal one-space path and prevents duplicate follow-up completion restarts from slipping through

## [2026-03-28]

### Changed

- **pr-46/conflict-resolution**: Merged the local incremental layout branch into the current editor/onboarding baseline while preserving animated layout transitions, local branch reflow hooks, node-limit gating, mobile notifications wiring, and waypoint-edge edit behavior
  - Why: Resolves PR `#46` against `main` without regressing shipped onboarding/access behavior or dropping the new local layout work

### Fixed

<!-- Updated: 2026-03-29 - Documented node-editor autocomplete fixes -->

- **node-editor/quiet-autocomplete-on-space**: Stopped passive empty-token trigger suggestions from reopening on `Space`, kept explicit trigger-character and partial-prefix completions, and documented manual `Ctrl+Space` discovery in the action bar
  - Why: Prevents distracting autocomplete popups during normal typing without removing on-demand syntax help
- **node-editor/manual-trigger-chaining**: Manual `Ctrl+Space` trigger picks now immediately reopen autocomplete for the selected syntax family, so base triggers like `#` and `$` flow straight into their follow-up suggestions
  - Why: The explicit trigger menu should feel like the first step of autocomplete, not a dead-end insertion
- **editor-canvas/merge-regression-recovery**: Preserved waypoint-edge double-click bend insertion and kept the layout trigger on the current Base UI/onboarding-compatible implementation during the merge
  - Why: Git's automatic merge accepted those files but silently dropped editor behavior, while the current runtime already normalizes layout directions to the shipped two-option model
- **layout/review-hardening**: Deferred layout-animation completion until tweens settle, resolved superseded animation promises, preserved ELK-routed waypoints during edge edits, and kept queued local resize reflows from lingering or dropping too early
  - Why: The CodeRabbit review surfaced real race conditions between animated display state, local edit reflow queueing, and edge rerouting
- **layout/legacy-normalization**: Accepted legacy layout-direction values at the API boundary, normalized legacy edge path metadata on load, and guarded load-time normalization writes with snapshot freshness checks
  - Why: Older persisted data should still render correctly without allowing background normalization to overwrite newer server state
- **quick-input/local-layout-error-handling**: Handled the post-create `applyLayoutAroundNode(...)` promise explicitly instead of dropping rejections
  - Why: The create flow keeps local layout application non-blocking, but promise failures should still be surfaced instead of becoming unhandled rejections
- **node-editor/mobile-autocomplete-tray**: Reworked mobile autocomplete into a hybrid presenter that portals out of the transformed quick-input shell, sticks as a compact full-width strip above the open keyboard, stays below the typed text when floating, ignores modal outside-click dismissal while the tray is tapped/scrolled, and mirrors desktop `@mention` rows with avatars and role badges
  - Why: The body-level fixed CodeMirror tooltip could render beneath the mobile keyboard, and the first tray pass was still constrained by the animated editor container and could close the modal when tapped

### Refactored

- **layout/module-boundaries**: Removed the `src/helpers/layout` barrel, tightened guided-tour layout-direction typing, and cleaned the node-creator / quick-input test harness typing
  - Why: Keeps the layout helpers aligned with the repo's no-barrel rule and lets TypeScript enforce the current API contracts more directly

### Docs

- **layout/docs**: Added local branch reflow invariant docs in `ai-docs/local-branch-reflow/local-branch-reflow.md` and expanded JSDoc for the local reflow and auto-routing helpers
  - Why: The review called out hidden assumptions around create/edit guarantees, affected-id semantics, and routing selection rules
- **editor/docs-sync**: Updated `CLAUDE.md` and `docs/CODEBASE_MAP.md` for the shared CodeMirror completion bridge, the portaled mobile tray surface, and the node-editor dismiss guard
  - Why: Node-editor architecture and gotchas changed again once the mobile presenter started escaping the transformed quick-input shell and coordinating with modal outside-click handling

## [2026-03-25]

### Changed

- **onboarding/minimized-task-copy**: The minimized walkthrough surface now shows the next incomplete task label, and its `Start` CTA launches that task directly instead of reopening the checklist first
  - Why: Keeps the compact state pointed at the actual next action and removes the extra step between the pill and the active walkthrough task
- **onboarding/history-coachmark**: The desktop `Know the controls` tour now includes the history control with dedicated copy about browsing saved map states
  - Why: The history button was visible in the editor, but onboarding never taught what lived behind it
- **onboarding/history-order**: Moved the desktop history coachmark to sit directly before share instead of in the middle of the toolbar-only steps
  - Why: Keeps the control tour order aligned with the broader desktop layout instead of interrupting the toolbar cluster
- **onboarding/minimized-pill-expand**: Restored a dedicated expand action on the minimized walkthrough pill so tapping the pill body reopens the checklist while `Start` still launches the current task
  - Why: The previous wiring accidentally removed the ability to expand the collapsed walkthrough on both mobile and desktop
- **onboarding/reopened-controls-exit**: Finishing a reopened `Know the controls` tour now closes the coachmark curtain and returns to the checklist with that task still marked done
  - Why: Replaying an already-completed controls tour previously no-op’d on the last step and left the coachmarks stuck on screen
- **onboarding/desktop-tail-order**: Reordered the desktop controls-tour tail so it now flows from toolbar controls into shortcuts, breadcrumb, history, and then share
  - Why: Keeps the guided sequence aligned with the intended information hierarchy instead of jumping to history/share too early
- **onboarding/skip-scope**: Full skip now lives only on the intro and expanded checklist, and the intro secondary CTA now dismisses onboarding entirely with `Skip walkthrough`
  - Why: The partial skip controls added to hints and coachmarks broke those layouts; skip is now available only where it is intentional and legible
- **onboarding/anchor-safe-refresh**: Refreshed anchored onboarding steps now fall back to the checklist until their target mounts, and resolved hint/coachmark surfaces replace the checklist again on both desktop and mobile
  - Why: Refreshing during toolbar or controls-tour steps was rendering detached full-width hints when anchor targets had not mounted yet
- **onboarding/desktop-checklist-companion**: Desktop checklist tasks now keep the checklist visible after their anchored hint resolves, while the standalone controls tour still returns to its coachmark surface
  - Why: Hiding the checklist on desktop checklist tasks removed the ability to switch tasks or minimize from the expanded onboarding surface
- **onboarding/live-anchor-refit**: Active anchored onboarding steps now keep remeasuring their target while they are open, so coachmarks refit after late toolbar/layout motion instead of staying pinned to stale coordinates
  - Why: The controls tour could resolve before the toolbar finished settling, which left the coachmark pushed to the wrong edge of the screen
- **onboarding/checklist-header-control-sizing**: The expanded checklist `Skip walkthrough` control now uses the same padded header chrome rhythm as the collapse button
  - Why: The previous text-only skip button looked undersized and visually inconsistent beside the collapse control
- **onboarding/checklist-header-control-spacing**: Added more horizontal breathing room between the expanded checklist `Skip walkthrough` and collapse controls
  - Why: The previous spacing made it too easy to hit the wrong control in the checklist header
- **onboarding/mobile-coachmark-toolbar-clearance**: Fixed the shared mobile onboarding bottom offset to use the real toolbar-clearance CSS variable, so mobile coachmarks clear the bottom toolbar instead of overlapping it
  - Why: The controls tour sheet was reading the wrong CSS custom property and could cover the toolbar button it was supposed to explain
- **notifications/shared-scope-cleanup**: Shared notifications now delete idle per-filter scopes on unsubscribe, refetch cleanly on remount, and tear down the realtime channel when the last listener goes away
  - Why: The previous unsubscribe path kept stale scope state around and could leave an idle notifications channel open with no active listeners
- **notifications/fetch-finally-guard**: The notifications fetch `finally` block now guards its cleanup statements instead of returning early
  - Why: Returning from `finally` is brittle and can mask completion behavior; the cleanup now stays explicit without changing the request-state contract
- **ui-slice/blocked-node-types**: The blocked edit-node list now lives in one shared constant consumed by both the UI slice and `BaseNodeWrapper`
  - Why: Removes duplicated literals so mobile edit affordances and node-editor gating cannot drift apart
- **tests/ui-slice-harness-typing**: Replaced the `ui-slice` test harness `as never` path with a narrow typed slice harness, and added `useNotifications` hook coverage for scope cleanup + last-listener channel teardown
  - Why: Keeps the slice test honest about the API shape and locks the notifications cleanup fix into the suite
- **onboarding/dialog-and-motion-a11y**: The intro overlay now behaves like an accessible dialog, the canvas hint and walkthrough surface respect reduced-motion preferences, and the mobile walkthrough target sizing/layout no longer forces overflow on narrow viewports
  - Why: The onboarding surfaces needed tighter keyboard, screen reader, and motion behavior without changing the existing walkthrough flow

### Fixed

- **deps/dependabot-remediation**: Bumped `next` to `16.1.7`, `jspdf` to `4.2.1`, and pinned the alerted transitive packages in `pnpm.overrides` to their patched versions before regenerating the lockfile
  - Why: Clears the current GitHub vulnerability set with the smallest dependency surface change instead of doing a broader package refresh
- **editor-chrome/accessibility-polish**: Added the mobile menu unread count to assistive tech, restored the edit-chip exit animation, and labeled the icon-only export/layout toolbar triggers
  - Why: Improves screen-reader clarity and preserves the intended Motion exit behavior on the editor chrome surfaces
- **notifications/shared-cache-and-map-filtering**: `useNotifications` now shares one cache/socket per user session and the notifications API applies `map_id` filtering before the server-side limit
  - Why: Prevents duplicate realtime subscriptions and ensures map-scoped inbox views receive the newest matching notifications instead of filtering a globally-limited result on the client
- **onboarding/state-persistence-guards**: Namespaced onboarding persistence by user, hardened storage access, preserved empty node-editor initial values, and completed the create-node task when a pattern creates a real node
  - Why: Prevents cross-account onboarding leakage, avoids storage crashes, and keeps the onboarding/editor state machine aligned with the actual user actions

## [2026-03-23]

### Refactored

- **docs/CLAUDE.md**: Compressed from 399 → 159 lines (60% reduction). System prompt XML collapsed to bullet-point philosophy. Domain-specific gotchas moved to path-scoped `.claude/rules/`
  - Why: 2x over the recommended 200-line limit hurt instruction adherence and wasted context tokens

### Added

- **docs/.claude/rules/**: 7 path-scoped rule files with enhanced best practices (from codebase patterns + web research):
  - `nextjs-patterns.md` — App Router, SEO, API routes, security, Core Web Vitals
  - `supabase-patterns.md` — client tiers, RLS, auth, query patterns, subscription limits
  - `partykit-realtime.md` — YJS doc structure, channels, awareness, admin ops, env config
  - `base-ui-patterns.md` — Base UI API, React 19 patterns, component architecture
  - `onboarding-gotchas.md` — v2 placement, task flow, control anchors, mobile mode
  - `editor-chrome-gotchas.md` — mobile header, toolbar state, parser scope, map settings
  - `testing-practices.md` — test stack, conventions, E2E workflow, Zustand patterns
  - Why: Rules lazy-load only when touching relevant files, saving ~40-50% context tokens in most sessions

## [2026-03-20]

### Changed

- **onboarding/walkthrough-morph**: The minimized walkthrough pill and expanded checklist now animate as one shared surface, with the shell expanding/collapsing in place while the inner content crossfades
  - Why: Makes the walkthrough feel like one evolving object instead of separate overlays fading in and out
- **onboarding/walkthrough-anchors**: Moved the desktop pill to the checklist corner and moved the mobile checklist under the top bar so both viewports have believable local expand/collapse motion
  - Why: Shared-layout animation reads better when the compact and expanded states originate from the same screen region
- **onboarding/component-split**: Broke the onboarding UI helpers out of `onboarding-modal.tsx` into focused component files for intro, hints, coachmarks, upsell, layout constants, and the walkthrough surface
  - Why: Keeps the modal responsible for state orchestration instead of packing the entire walkthrough UI into one file
- **onboarding/motion-geometry**: The morphing walkthrough surface now drives width, border radius, and padding through Motion state instead of swapping Tailwind geometry classes between pill and checklist states
  - Why: Produces cleaner morphing behavior and keeps the animated shape under Motion’s control

### Fixed

- **tests/onboarding-walkthrough-surface**: Added modal coverage for the new desktop minimized-pill placement, the mobile under-top-bar checklist placement, and the resume/minimize actions
  - Why: Locks the new morphing walkthrough presentation before future onboarding tweaks drift the positions or controls
- **top-bar/mobile-editor-drawer-layering**: Raised the mobile sheet overlay/content above onboarding surfaces so the open hamburger drawer no longer sits under the walkthrough
  - Why: An active menu should always own the top interaction layer on mobile
- **top-bar/mobile-editor-drawer-trigger-chrome**: Switched the mobile hamburger trigger and drawer close control from elevated rounded buttons to ghost-style chrome
  - Why: Keeps the mobile header controls visually consistent with the lighter editorial drawer treatment

## [2026-03-18]

### Added

- **tests/mobile-onboarding**: Added slice coverage for the mobile controls-tour sequence, node-wrapper coverage for the mobile `Edit` action, and onboarding modal coverage for the bottom-sheet intro/hint behavior
  - Why: Locks the new mobile walkthrough path before the desktop-first implementation drifts back in
- **tests/mobile-header-drawer**: Added RTL coverage for the hamburger-only mobile top bar, the editorial mobile drawer permission gating, and notification-preview interactions
  - Why: Protects the new mobile header/menu contract and keeps the drawer from regressing back into a generic utility panel

### Changed

- **onboarding/mobile-shell**: Mobile walkthrough now uses bottom-sheet intro, checklist, hints, coachmarks, and upsell surfaces instead of reusing the desktop right-rail layout
  - Why: Keeps the canvas visible and removes stacked desktop cards from small screens
- **onboarding/mobile-controls-tour**: Controls tour now uses a mobile-specific target set (`cursor`, `add`, `AI`, `comments`, `More Tools`, `mobile menu`, `breadcrumb`) and explains hidden toolbar actions through `More Tools` copy without auto-opening overflow menus
  - Why: Matches the real mobile toolbar instead of teaching controls that are hidden or absent on touch devices
- **top-bar/mobile-editor-drawer**: Mobile editor chrome now collapses to breadcrumb/title plus one hamburger trigger, and the hamburger opens a full-height editorial drawer for share, recent activity, collaborators, workspace actions, and account/billing flows
  - Why: Clears visual noise from the mobile header and gives those actions a calmer, more premium home
- **top-bar/mobile-editor-drawer-density**: Tightened the mobile editorial drawer into a quieter tool surface with a minimal title bar, smaller section headings, a merged collaboration section, shorter helper copy, and cardless collaborator presentation
  - Why: Removes bulky copy and uneven spacing so the drawer feels more elegant and easier to scan on phones
- **top-bar/mobile-editor-drawer-alignment**: Shifted the compact drawer sections back to the same outer padding as the profile block instead of the profile text column
  - Why: Keeps the cleaner alignment while avoiding the over-indented look on mobile
- **top-bar/mobile-editor-drawer-title-scale**: Reduced the mobile drawer map title size by one step
  - Why: Keeps the title from overpowering the tighter, denser sheet layout
- **top-bar/mobile-editor-drawer-close+truncate**: Added an explicit header close button to the mobile drawer and capped the drawer title at 24 characters with ellipsis
  - Why: Makes the sheet dismiss action obvious and prevents long map titles from crowding the header
- **top-bar/mobile-editor-drawer-header-chrome**: Matched the mobile drawer header height and close-button placement to the canvas top bar rhythm
  - Why: Makes the drawer feel like an extension of the editor chrome instead of a separate header system
- **notifications/shared-hook**: Notification fetch/subscription/mark-read logic now lives in a shared `useNotifications()` hook used by the desktop bell and the mobile editorial drawer
  - Why: Keeps inbox behavior aligned across surfaces without duplicating realtime or mutation logic

### Fixed

- **nodes/mobile-edit-path**: Selected editable nodes now expose a visible mobile `Edit` action on the node chrome
  - Why: Gives mobile onboarding a real touch-first edit path instead of relying on desktop-only Enter/double-click gestures
- **onboarding/mobile-step-stacking**: Mobile checklist now yields to active step hints/coachmarks, and the minimized walkthrough chip sits below the top bar instead of near the bottom dock
  - Why: Prevents onboarding surfaces from fighting for the same screen space on phones
- **onboarding/mobile-menu-anchor**: Mobile controls tour now targets the hamburger menu instead of the removed mobile share button
  - Why: Keeps the walkthrough aligned with the new mobile header layout

## [2026-03-17]

### Added

- **tests/onboarding-v2**: Added onboarding slice coverage for eligibility, resume/skip flow, real editor task completion, controls-tour completion, and state restore, plus quick-input coverage for onboarding parser prefills
  - Why: Locks the new task-based walkthrough contract before the editor wiring starts drifting
- **tests/onboarding-refinements**: Added regression coverage for add-mode substeps, parser lesson syntax-help guidance, Pro-user walkthrough completion, and the cursor trigger active-state helper
  - Why: Protects the refined walkthrough UX and the toolbar state fix from slipping back

### Changed

- **onboarding/editor-walkthrough**: Replaced the old welcome/benefits/pricing modal with an editor-owned flow that uses an intro overlay, resumable checklist, anchored control hints, and a final optional Pro card
  - Why: Teaches users how to use the product before asking them to upgrade
- **onboarding/walkthrough-polish**: Reworked the intro into a split hero with calmer product-teaching copy, moved add-node guidance into a canvas step, added a syntax-help nudge for the parser lesson, and expanded the controls tour to cover cursor, layout, export, tour, zoom, comments, share, shortcuts, and breadcrumb/home
  - Why: Reduces intimidation on first open and makes each walkthrough step point to the next concrete action
- **node-editor/onboarding-prefill**: Extended node-editor open state with onboarding preset/source support so the walkthrough can launch a deterministic parser lesson in the real editor
  - Why: Keeps the parser lesson inside the production creation flow instead of duplicating tutorial-only UI
- **mind-map/onboarding-placement**: Moved onboarding startup out of client providers and into the mind-map experience, where eligibility can be checked against the loaded map + current user
  - Why: Prevents global app boot from forcing onboarding outside the actual workspace

### Fixed

- **upgrade-flow-separation**: User-menu upgrade CTA and limit warnings now open the dedicated upgrade modal directly instead of reopening onboarding at a pricing step
  - Why: Keeps monetization prompts separate from product teaching and removes the old pricing-first coupling
- **toolbar/cursor-active-state**: Selecting `Add Node` now visually deactivates the cursor trigger instead of leaving Select highlighted alongside it
  - Why: Makes the active canvas mode unambiguous during onboarding and normal editing
- **onboarding/canvas-safe-positioning**: The minimized walkthrough pill now lives in the lower-left canvas safe area above runtime toolbar clearance, and toolbar coachmarks now prefer rendering above bottom-dock controls
  - Why: Prevents walkthrough UI from colliding with the toolbar on smaller windows
- **onboarding/canvas-hint-layout**: The desktop “Now click empty canvas” hint now reserves the checklist lane instead of centering across it
  - Why: Prevents the step-one canvas hint from overlapping the checklist card
- **onboarding/pro-upsell-guard**: Manual walkthroughs for active/trialing Pro users now complete without showing the final Pro upsell card
  - Why: Removes a redundant monetization surface for users who already have the plan

### Removed

- **onboarding/v1-steps**: Deleted the legacy welcome, benefits, and pricing onboarding step components and the numeric step state that powered them
  - Why: Backward compatibility was intentionally out of scope for the redesign

## [2026-03-11]

### Changed

- **layout/local-branch-reflow**: Replaced create/edit local ELK solves with deterministic parent-centric subtree reflow and deferred edit pushes until committed node dimension changes
  - Why: Keeps full ELK layout intact while preventing automatic local edits from moving ancestors or unrelated branches
- **layout/transition-animation**: React Flow now renders layout-triggered node and routed-edge transitions through a client-only animated display graph
  - Why: Prevents full/local layout operations from visually snapping while still persisting only the final geometry
- **layout/transition-timing**: Increased the shared layout transition duration from `300ms` to `550ms`
  - Why: Gives large layout moves enough time to read without making repeated local reflows feel sluggish
- **layout/local-corridor-expansion**: Local branch reflow now opens sibling-layer corridor space by pushing overlapping cousin subtrees outward on the sibling axis
  - Why: Prevents growing middle branches from colliding with taller neighboring cousin branches without falling back to full layout
- **maps/layout-direction**: Added persisted per-map `layout_direction` handling through map load/update paths
  - Why: Prevents refreshes from resetting collaborative maps back to the default left-to-right orientation
- **layout/supported-modes**: Reduced supported layout directions to `LEFT_RIGHT` and `TOP_BOTTOM`, and normalized legacy saved directions into those survivors
  - Why: Removes low-value broken modes and keeps both global and local layout behavior within the two shapes users actually rely on

### Added

- **db/mind-maps-layout-direction**: Added an ignored local Supabase migration for the nullable `mind_maps.layout_direction` column and constraint
  - Why: Stores shared canvas orientation in the database without changing git state for ignored Supabase artifacts

### Fixed

- **edges/auto-routing**: Standardized normal persisted edges on auto-routed `waypointEdge` geometry for local reflows, node moves/resizes, new connections, and legacy load normalization
  - Why: Prevents stale bend points after node movement and keeps local routing deterministic without re-running ELK

### Removed

- **edges/manual-waypoints**: Removed raw waypoint add/delete/drag interactions and manual path-style switching from edge edit surfaces
  - Why: Absolute bend points became stale as soon as nodes moved, which made the feature actively frustrating

## [2026-03-07]

### Added

- **tests/ai-actions-popover**: Added RTL tests for map-scope action click/close behavior and streaming-disabled button state
  - Why: Locks the restored toolbar AI interaction flow and guards against regressions where actions fail to execute or close

### Fixed

- **toolbar/ai-popover-interactions**: Replaced the custom toolbar AI backdrop/absolute menu path with the shared `Popover` (`PopoverTrigger` + `PopoverContent`) flow
  - Why: Removes the interaction-blocking backdrop layering path so toolbar AI menu items receive normal hover/click events while preserving outside-click close behavior
- **ai-actions-popover/hover-label-color**: Replaced hard-coded `group-hover:text-white` with semantic `group-hover:text-primary-400` on action labels
  - Why: Prevents low-contrast hover text on overlay surfaces and keeps colors tied to app tokens

- **maps/template-preflight-fail-closed**: Template-based map creation now returns explicit errors when `template_id` lookup fails or resolves no row during preflight (`templateQuery.single()`), instead of continuing and creating an empty map shell.
  - Why: Prevents consuming map slots when template selection is invalid or temporarily unavailable.
- **node-editor/action-bar-mobile-copy**: ActionBar now hides shortcut hint while `isCheckingLimit` is true.
  - Why: Prevents "Checking map limit..." text from visually concatenating with shortcut copy on small screens.
- **node-editor/edit-mode-limit-gating**: QuickInput create/disable/warning checks now gate by node-limit state only in `mode === 'create'`.
  - Why: Keeps edit flows independent from create-mode `useMapNodeLimit` state and avoids stale/neutral hook state affecting updates.
- **top-bar/mobile-collaborators**: Mobile hamburger collaborators section now falls back to shared collaborator roster avatars (`currentShares`) when realtime presence avatars are temporarily empty, and refreshes share users when the menu opens.
  - Why: Prevents collaborator list from appearing empty in the mobile menu despite active/shared collaborators.

## [2026-03-05]

### Added

- **tests/notification-service**: Added `notification-service` unit tests covering side-effect completion timing, PartyKit fail-soft behavior, email failure status marking, and no-created short-circuit behavior
  - Why: Locks the bug fix and prevents regressions in notification delivery ordering guarantees

### Changed

- **subscription/node-limit-policy**: Node creation entitlement for shared maps now resolves against the map owner plan (not collaborator plan) via shared `checkMapNodeLimit` enforcement used by `/api/nodes/check-limit`
  - Why: Allows editors to continue adding nodes in paid shared maps while preserving owner-scoped subscription boundaries
- **node-editor/quick-input-limit-gate**: Quick Input now uses map-aware node limit checks (`useMapNodeLimit`) instead of actor-plan `useSubscriptionLimits` for create-mode blocking/warnings
  - Why: Prevents false “upgrade yourself” lockouts for guests editing paid-owner maps
- **ui/popover-surfaces**: Normalized popover-family surface styling to a single semantic contract (`bg-overlay` + semantic border/text + consistent shadow/blur) across popover, dropdown menu, hover card, AI actions popover, user menu, dashboard map-card menus, auth password requirements popover, and sidebar dropdown wrapper
  - Why: Fixes visual inconsistency where some popovers looked like side panels/dialogs and aligns all audited floating surfaces with the cursor/layout/export baseline
- **realtime/profile-card**: Replaced hardcoded zinc foreground/background accents in collaborator profile card skeleton and metadata regions with semantic tokens
  - Why: Keeps realtime profile hover cards visually aligned with the normalized popover surface system

### Fixed

- **notifications/dispatch-lifecycle**: `createNotifications` now awaits PartyKit fanout and email processing (in parallel via `Promise.allSettled`) before request completion
  - Why: Prevents mention/access/reply/reaction emails from being deferred until a later runtime wake-up (for example, user focus-triggered activity)
- **nodes/check-limit-route**: Replaced legacy `owner_id`/`map_shares` checks with canonical `mind_maps.user_id` + `share_access` (`status=active`, `can_edit=true`) and structured limit metadata (`upgradeTarget`, `mapOwnerId`)
  - Why: Removes stale schema assumptions and enforces editor-only create access correctly
- **nodes/add-node-preflight**: Removed actor-plan client fallback; `addNode` now relies on server verdicts (`402/403`) and owner-targeted messaging
  - Why: Closes collaborator bypass/false-block edge cases caused by local per-user fallback logic
- **nodes/create-reference**: Added the same map-owner node-limit check before reference-node insertion
  - Why: Closes alternate node-creation path bypass that could otherwise ignore shared map node limits
- **maps/template-seeding-limit**: Template-based map creation now blocks templates whose node payload exceeds requester nodes-per-map cap
  - Why: Prevents free-tier users from exceeding node caps via template seed size

### Docs

- **claude+codebase-map**: Documented owner-scoped node-limit enforcement behavior and updated architecture notes metadata comments
  - Why: Keeps operational gotchas and architecture references in sync with entitlement enforcement changes

## [2026-03-06]

### Changed

- **subscription/node-limit-flow**: `checkMapNodeLimit` now accepts optional `ownerSubscriptionClient` and shared-map node checks in `/api/nodes/check-limit` and `/api/nodes/create-reference` use a service-role lookup for map-owner entitlement rows.
  - Why: Prevents premium-owned shared maps from incorrectly reporting owner-limit rejections to collaborative editors under current RLS visibility.

### Fixed

- **subscription/node-limit-gating-tests**: Added helper-level coverage for privileged owner subscription lookup and explicit DB-error handling (`OWNER_SUBSCRIPTION_CHECK_FAILED`).
  - Why: Locks regression prevention for collaborator node-add behavior and avoids silently granting quota on entitlement-read failures.

## [2026-03-04]

### Added

- **notifications/db**: Added `public.notifications` table with RLS, unread/read tracking, dedupe key support, and email delivery status fields
  - Why: Provides a persistent in-app inbox source of truth with delivery diagnostics
- **api/notifications**: Added notification APIs (`GET /api/notifications`, `PATCH /api/notifications/[id]/read`, `POST /api/notifications/mark-all-read`, `POST /api/notifications/emit`)
  - Why: Enables client inbox reads/updates and controlled event emission for mentions/replies/reactions
- **api/maps/mentionable-users**: Added `GET /api/maps/[id]/mentionable-users`
  - Why: Resolves `@slug` mentions to user IDs consistently for node/comment notification targeting
- **ui/notifications**: Added reusable notification bell + inbox popover in dashboard and mind-map top bar
  - Why: Surfaces unread notifications and quick read/open-map actions in primary navigation areas

### Changed

- **sharing/access-events**: Share update/delete/revoke routes now create access-changed/access-revoked notifications
  - Why: Users are explicitly informed when map permissions are changed or removed
- **node-editor/mentions**: Quick input now resolves assignee `@mentions` to user IDs (`metadata.assigneeUserIds`) and emits `node_mention` notifications
  - Why: Connects node mentions to real recipients instead of unresolved slugs
- **comments/mentions-replies-reactions**: Comment reply input resolves mention slugs to UUIDs; comments slice emits `comment_mention`, `comment_reply`, and `comment_reaction` notifications
  - Why: Delivers thread activity notifications for direct mentions, new replies, and emoji reactions
- **dashboard/settings**: Added Account Settings toggle for email notifications (`preferences.notifications.email`)
  - Why: Gives users explicit control over whether notification events send emails
- **notifications/preferences-source**: Email delivery preference now checks profile preferences first (`preferences.notifications.email`) and falls back to legacy `user_preferences.email_notifications`
  - Why: Keeps behavior backward compatible while enabling UI-driven preference control
- **dashboard/settings-types**: `updateNestedFormData` now uses keyed `preferences` typing instead of `string`/`unknown`
  - Why: Prevents invalid preference keys/values from compiling and keeps preference writes type-safe
- **notifications/partykit-dispatch**: `createNotifications` no longer awaits PartyKit event fan-out before returning
  - Why: Prevents notification creation latency from being blocked by downstream realtime push timing
- **dashboard/settings-preferences**: Profile visibility/theme/reduced-motion preference controls are now disabled while profile save/load is in flight
  - Why: Prevents in-flight preference edits from mutating staged form data during save/load transitions
- **api/templates/[id]**: Template reads now use authenticated-viewer semantics without redundant share-access lookups, and node/edge queries now enumerate explicit selected columns
  - Why: Removes dead authorization branches for templates and avoids schema-coupled overfetching from `select('*')`
- **notifications/comments-events**: Comments slice now uses shared `NotificationEmitEvent` typing for notification payloads
  - Why: Keeps emit payload contracts aligned with centralized notification event types
- **node-editor/reduced-motion**: Quick input syntax legend/hint animations now respect reduced-motion preferences
  - Why: Avoids height/Y transform animation when reduced motion is enabled

### Fixed

- **mention-identity**: Eliminated slug/UUID mismatch in comment mention writes for users resolved from map collaborators
  - Why: Prevents invalid `mentioned_users` payloads and ensures notification recipients are valid users
- **notifications/inbox-refresh**: Notification bell now auto-refreshes via PartyKit notification channel events (no interval polling)
  - Why: Delivers true realtime inbox updates without manual refreshes or fake polling loops
- **dashboard/settings-accessibility**: Reduced motion + email notification toggles now expose explicit toggle state (`aria-pressed`) and purpose labels
  - Why: Gives assistive tech stable control names and state announcements instead of generic `On/Off` text only
- **store/user-profile-notification-preferences**: `getNotificationPreferences` now derives email flags from persisted `preferences.notifications.email`
  - Why: Aligns computed notification settings with stored account preference instead of hardcoded `false`
- **api/templates/[id]**: Added explicit template authorization checks before service-role node/edge reads and filtered template edges to only valid non-ghost node endpoints
  - Why: Prevents unauthorized service-role reads and removes dangling edges that referenced filtered-out ghost nodes
- **mind-map/map-settings**: Unsaved-close flow now computes change state synchronously in `requestClose`; title/description validation messages are now programmatically associated with their fields
  - Why: Avoids stale discard-dialog decisions and improves screen reader error announcement fidelity
- **notifications/email-preferences**: Email preference lookup now fails closed on DB errors (`false`) and logs full error details
  - Why: Prevents sending emails when preference verification fails
- **notifications/ui + comments**: Mark-all-read refresh now runs only after successful POST; comment-reaction emit now logs non-2xx HTTP responses
  - Why: Aligns client behavior with success semantics and surfaces backend failures that were previously silent
- **node-editor/mentionable-users**: Quick input now validates/sanitizes mentionable user payloads before using `slug`/`userId`
  - Why: Prevents malformed API rows from causing runtime crashes during mention normalization
- **node-editor/emit-error-surface**: Quick input now logs non-2xx `/api/notifications/emit` responses with status + response body details
  - Why: Makes validation/auth emit failures visible instead of silently ignored
- **node-editor/legend-storage**: Quick input legend collapse state now initializes client-side and persists through toggle handlers
  - Why: Prevents SSR crashes from render-time `localStorage` access and avoids overwriting saved collapse state on mount
- **notifications/filter-scope**: Notification bell unread badge/counts and “Mark all” action now scope to visible (map-filtered) notifications
  - Why: Ensures filtered inbox views only display and mutate read state for visible notifications
- **comments/recipient-batching**: Comment mention/reply notification recipients now emit in chunks of 50 per API call
  - Why: Prevents oversized recipient arrays from being rejected by the emit API limit
- **comments/reaction-error-guard**: Reaction-notification emit catch now uses `unknown` + runtime error normalization
  - Why: Keeps error logging type-safe and consistent across emit failure paths
- **mind-map/map-settings-a11y**: Thumbnail validation message is now programmatically associated with the thumbnail input
  - Why: Allows screen readers to announce thumbnail URL validation errors correctly

### Docs

- **codebase-map/notifications**: Expanded notification internals with architecture, module mapping, and trigger->persist->deliver->refresh data flow diagrams
  - Why: Makes notification service/channel/schema/mention-resolution behavior operationally traceable
- **notifications/jsdoc**: Added maintainers' JSDoc for `processNotificationEmails` and `subscribeToNotificationChannel`
  - Why: Documents async delivery lifecycle, side effects, reconnect semantics, and failure handling for incident triage
- **codebase-map/route-counts**: Updated stale API route counts to 61 and labeled the root directory tree fence as `text`
  - Why: Keeps architecture docs accurate and resolves markdown fenced-code lint warnings
- **mind-map/map-settings**: Added `computeHasChanges` JSDoc describing normalization and tag diffing behavior
  - Why: Documents save/discard gating logic to reduce regression risk
- **node-editor/quick-input**: Added `handleCreate` JSDoc covering inputs, side effects, guards, and concurrency implications
  - Why: Clarifies create/update + notification emit behavior for maintainers

## [2026-02-28]

### Changed

- **node-editor/syntax-help**: Split syntax help into `Universal` and `Node-specific` collapsible sections, with universal patterns filtered by node type
  - Why: Makes supported parser syntax immediately visible while avoiding unsupported/system node hints
- **node-editor/syntax-help**: Added a compact node-type switch discovery hint (`$...`) in Node-specific help that shows a few other valid `$` commands (excluding `$reference`)
  - Why: Helps users recognize the `$` node-type switching pattern without suggesting disabled reference parsing
- **node-editor/syntax-help**: Added a fixed max height with vertical overflow for syntax help content
  - Why: Prevents long parser lists from extending past the visible node editor area and getting cut off
- **node-editor/quick-switch**: Excluded `referenceNode` from generated node-type quick-switch commands and trigger map
  - Why: Stops `$reference` suggestions from appearing in parser-driven node editor flows
- **node-editor/parsers**: Removed parser behavior/suggestions/highlighting/help config for deprecated tokens (`bg:`, `border:`, `src:"..."`, `[[...]]`, `confidence:*`)
  - Why: Aligns parser surface with currently supported syntax and prevents misleading suggestions

### Fixed

- **node-editor/legacy-metadata**: Next edit save now clears legacy `backgroundColor`, `borderColor`, and `source` metadata fields for text/image nodes and no longer re-serializes removed tokens into quick input strings
  - Why: Prevents deprecated parser tokens from being reintroduced during edit/save cycles

### Added

- **tests/node-editor**: Added focused regression tests for parser cleanup, completion cleanup, dual syntax help wiring, reference quick-switch exclusion, and legacy metadata clearing
  - Why: Locks behavior and guards against accidental reintroduction of removed parser tokens/features

## [2026-02-27]

### Added

- **mind-map/map-settings**: Added unsaved-changes discard confirmation dialog for Map Settings panel close actions
  - Why: Prevents accidental data loss when users close the panel with pending edits
- **tests/map-settings-panel**: Added focused Jest coverage for section rendering, validation gating, save payload shaping, and discard-close flow
  - Why: Locks in the new panel behavior and prevents regressions
- **dashboard/account-settings**: Added discard-confirm dialog and cancel-subscription confirm dialog for Account/Billing settings flow
  - Why: Adds parity safety for unsaved-close and destructive billing actions
- **tests/dashboard-settings-panel**: Added focused Jest coverage for account/billing rendering, validation gating, changed-only save payloads, discard-close flow, and billing cancellation confirmation
  - Why: Prevents regressions in the new account settings UX logic

### Changed

- **mind-map/map-settings**: Removed template editing controls from Map Settings (`is_template`, `template_category`) because map update API is system-managed for these fields
  - Why: Avoids exposing controls that cannot persist through the current backend contract
- **mind-map/map-settings**: Refined panel section shells and helper copy for stronger visual hierarchy while preserving existing section order
  - Why: Improves scanability and usability without expanding scope
- **dashboard/settings-panel**: Refactored account save model to changed-only payloads with deterministic validation (`full_name` required <=255, `display_name` <=100, `bio` <=500), sanitized outbound values, and unsaved-close guard behavior
  - Why: Aligns account panel safety and clarity with explicit-save UX used in map settings
- **mind-map/map-settings**: Harmonized section and dialog color tokens (borders/background/text) to match Account/Billing panel styling
  - Why: Keeps settings surfaces visually consistent across the product

### Fixed

- **mind-map/map-settings**: Added deterministic client validation for title/description/thumbnail URL, disabled save on invalid state, and sanitized outbound values (trim + null empty optional fields)
  - Why: Ensures payload correctness and clearer user feedback before save attempts
- **dashboard/billing-cancel**: Subscription cancellation now requires explicit confirmation before `cancelSubscription` executes
  - Why: Prevents accidental one-click subscription cancellations

## [2026-02-26]

### Fixed

- **store/core-slice**: Added template graph hydration fallback for non-owner template viewers when direct graph query returns empty nodes/edges
  - Why: Template canvases could render blank for authenticated non-owners due upstream policy drift on graph row visibility
- **api/templates/[id]**: Template detail route now returns authenticated, service-role-backed `mindMapData` payload for reliable graph hydration
  - Why: Ensures template graph data can be fetched server-side for authorized viewers even when client-side graph reads are filtered
- **api/maps/permissions**: Template non-owners now receive explicit read-only viewer permissions instead of `403`
  - Why: Aligns permissions endpoint behavior with template access checks and prevents inconsistent template viewer handling

### Changed

- **gitignore/partykit**: Added `/partykit/.env` to ignored files
  - Why: Keeps local PartyKit environment secrets out of source control

## [2026-02-24]

### Fixed

- **store/permissions-slice**: Guarded async permission fetch writes against stale `mapId` responses
  - Why: Prevents fast map switching from overwriting active-map permissions with late responses
- **helpers/partykit/admin**: Continued endpoint fallback after thrown fetch errors
  - Why: A transient failure on one endpoint variant should not block other working admin routes
- **join-flow/display-name**: Existing anonymous collaborators now see their persisted name prefilled on all join entry points (`/join/[token]`, `/join`, embedded join component)
  - Why: Prevents revoked/rejoining users from being incorrectly treated as first-time guests with random names
- **api/share/join-room**: `display_name` from join requests now persists to `user_profiles` and auth metadata (best effort, non-blocking)
  - Why: Ensures name edits made during join are reflected in DB/auth instead of being session-only
- **sharing/manage-tab**: Collaborator labels now resolve as `display_name` first (then full name/email fallback) instead of preferring `full_name`
  - Why: Manage UI should show the collaborator-chosen display label consistently
- **realtime/identity**: Presence/selection/cursor identity now resolves from `user_profiles` first, then auth metadata, then deterministic fallback
  - Why: Prevents mismatched names/avatars between user menu and realtime presence surfaces
- **realtime/presence-room**: Presence tracking now pushes an immediate `track()` update on identity/activity changes (in addition to heartbeat)
  - Why: Avoids stale collaborator name/avatar states lingering for up to the heartbeat interval
- **api/maps/permissions**: Normalized permission role mapping now whitelists contract roles and falls back unknown/legacy DB values to `viewer`
  - Why: Prevents runtime contract drift from force-cast role values
- **api/webhooks/polar**: Billing-period usage reset now validates update success (error + rows updated) and throws enriched DB errors
  - Why: Prevents silent webhook success when `user_usage_quotas` updates fail
- **api/webhooks/polar**: `adjust_ai_usage` RPC now has explicit error handling/logging and throws on failures
  - Why: Keeps webhook retries consistent on DB failures and surfaces final applied adjustment value
- **subscription/ai-quota**: `getAIUsageCount` now throws on RPC error/null/invalid data and `checkAIQuota` fails closed with HTTP 503
  - Why: Prevents quota bypass when AI usage counter is unavailable
- **subscription/collaborators**: Missing paid-plan `collaboratorsPerMap` no longer implies unlimited access; now uses explicit safe fallback cap (`10`)
  - Why: Avoids accidental unlimited collaborator access from partial plan data
- **join/forms**: Removed unsafe `as any` resolver casts by using typed `useForm<input, context, output>` generics for `JoinRoomSchema`
  - Why: Enforces resolver output typing without runtime-unsafe casts
- **layout/toasts**: Restored visible `focus-visible` rings for toast action/cancel/close controls
  - Why: Improves keyboard accessibility regression in global toaster styles
- **realtime/collaborator-channel**: Subscription `socket` now exposes a live getter (`WebSocket | null`) instead of a stale initial snapshot
  - Why: Prevents callers from reading closed socket references after reconnect
- **realtime/yjs-provider**: Sync-event pruning now tracks per-subscriber cursors and only prunes events all subscribers consumed
  - Why: Prevents slow subscribers from missing events due to shared-array index shifts
- **toasts/mobile-width**: Added fallback for mobile right offset (`--mobile-offset-right` -> `--toast-offset-inline`) in Sonner right-positioned toaster rule
  - Why: Prevents unresolved CSS vars from collapsing right positioning to `auto` on small screens
- **context-menu/groups**: Group detection now reuses canonical `isGroupNode` plus legacy heuristics; duplicate Ungroup menu entries are suppressed when selected-node menu already exposes Ungroup
  - Why: Keeps group detection centralized and avoids duplicate actions on right-clicked selected group nodes
- **mind-map/mobile-selection**: Mobile tap multi-select node click now stops event propagation/default handling before local selection updates
  - Why: Prevents React Flow internal click selection from racing store-driven selection state
- **api/ai-streams**: `trackAIUsage` calls in suggest-connections/suggestions streams now run fire-and-forget with error swallowing; `search-nodes` tracking failures no longer fail successful responses
  - Why: Usage telemetry failures should not break streamed or successful AI outputs
- **api/comments**: Comment lookup errors in update/delete flows now return 500 with DB error details; only missing rows return 404
  - Why: Distinguishes backend/data failures from true not-found cases
- **api/share/join-room**: `user_profiles` display-name persistence now uses `upsert(..., { onConflict: 'user_id' })`
  - Why: Ensures first-time profiles are created instead of silently no-op updates
- **api/share/join-room**: `display_name` upsert now always resolves and includes `full_name` (existing profile -> auth metadata -> display name fallback)
  - Why: Prevents `user_profiles.full_name NOT NULL` insert failures that could silently drop join-time display-name edits
- **api/share/join-room**: `user_profiles` upsert now omits `full_name` when existing-profile prefetch returns an error
  - Why: Avoids overwriting a real `full_name` during transient profile read failures while still persisting `display_name`
- **api/webhooks/polar**: `subscription.updated` subscription prefetch now uses `.maybeSingle()` with explicit fetch/missing-row errors
  - Why: Prevents silent no-op updates when `user_subscriptions` is missing and preserves webhook retry visibility for real failures
- **context-menu/group-detection**: Replaced `TypedNode<any>` group-node cast with canonical node-type guards via `isAvailableNodeType`
  - Why: Removes unsafe `any` usage while keeping legacy group detection fallbacks intact
- **subscription/ai-quota**: `checkAIQuota` now short-circuits hard `limit === 0` before calling `getAIUsageCount`
  - Why: Ensures hard free-tier limits cannot be masked by usage-counter outages and avoids unnecessary RPC calls
- **ui/toggle-group**: Toggle group value/defaultValue adapters now stay typed as `readonly string[]` end-to-end
  - Why: Prevents Vercel build-time type mismatch when Base UI expects string array values instead of unknown arrays
- **partykit/auth**: Replaced control-character regex with char-code scan and wrapped request-path URI decoding in safe decode helper
  - Why: Removes lint suppression and prevents malformed percent-encoding from throwing request-time exceptions
- **realtime/graph-sync**: Edge serialization now skips and logs edges missing `source`/`target`; callers filter/guard null payloads before Yjs broadcasts/upserts
  - Why: Prevents invalid edge payloads from being emitted with empty endpoints
- **realtime/permission-channel**: Subscription now exposes live `socket` getter and disconnect closes the current socket reference
  - Why: Keeps caller-visible socket aligned with reconnect lifecycle
- **realtime/yjs-presence**: Presence map conversion now accumulates multiple presences per user key instead of overwriting with the last client
  - Why: Preserves multi-client presence for same logical user id
- **tests/realtime-fetch-mocks**: PartyKit sharing/admin tests now restore `globalThis.fetch` after suites/tests
  - Why: Prevents fetch mock leakage into unrelated test files
- **history/revert typing**: Replaced `normalizedData as any` with `normalizedData as EdgeData` in edge canonicalization
  - Why: Removes unsafe `any` cast in revert payload construction
- **api/history/revert**: Revert-by-event now validates the event belongs to the target snapshot; DB diff mapping now uses typed row guards; empty edge upserts are skipped after filtering
  - Why: Prevents silent snapshot fallback on mismatched event IDs, removes unsafe `any` diff plumbing, and avoids no-op edge upsert round-trips
- **api/webhooks/polar**: Billing reset treats zero updated quota rows as non-fatal no-op logs, and plan-change adjustments now clamp usage via app-side target usage calculations
  - Why: Avoids infinite webhook retries for missing quota rows while keeping usage counters bounded for upgrades/downgrades
- **context-menu/toolbar**: Context-menu group heuristics now require non-empty `groupChildren` and memoize menu config; toolbar triggers now use Base UI render-prop pattern without `asChild`
  - Why: Prevents false-positive group detection, reduces unnecessary menu recomputation, and aligns trigger behavior with current Base UI guidance
- **api/ai/chat + subscription tracking**: Chat usage tracking is now fire-and-forget, and `trackAIUsage()` now throws on `increment_ai_usage` RPC errors
  - Why: Reduces chat stream startup latency while surfacing usage-counter write failures to callers
- **typing/tests/realtime**: Sharing unsubscribe field is now strict nullable, permissions details are exported as a named interface, collaborator-channel test listeners use `unknown`, and Yjs sync subscriptions process events immediately after observer registration
  - Why: Tightens state contracts, removes `any` in tests, and closes a setup race where sync events could be missed
- **deps/security**: Resolved all `pnpm audit` findings by updating vulnerable direct dependencies and pinning patched transitive versions via `pnpm.overrides` (including `jspdf`, `@eslint/eslintrc`, `ajv`, and `minimatch`)
  - Why: Eliminates known high/moderate dependency vulnerabilities while keeping the existing app/runtime surface unchanged
- **partykit/env-hardening**: PartyKit now trims/unquotes env values and emits one-time warnings when `SUPABASE_URL` vs `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_SERVICE_ROLE` vs `SUPABASE_SERVICE_ROLE_KEY` conflict
  - Why: Prevents hard-to-diagnose 401 "Invalid API key" failures caused by quoted secrets or stale shadowed env vars in deployment
- **partykit/ws-auth**: Realtime websocket auth now falls back to Supabase `/auth/v1/user` validation when JWKS-based JWT verification fails; connect denials now log explicit rejection/access-denied context
  - Why: Recovers from issuer/JWKS configuration drift in production and makes websocket handshake failures diagnosable from PartyKit tail logs

### Changed

- **terminology/roles**: Renamed remaining `commenter` references to `commentator` in E2E tests, page objects, and docs
  - Why: Keep role naming consistent across API, UI, tests, and documentation
- **types/error-contracts**: Moved shared Supabase error shape to `src/types/supabase-like-error.ts` and imported it in Polar webhook handling
  - Why: Keeps strict shared error contracts in `src/types` instead of local aliases
- **e2e/sharing-permissions**: Expanded Access Revocation coverage with display-name persistence assertions (revisit prefill, rename persistence, prefill after revoke)
  - Why: Locks in the regression fix path that previously surfaced stale/random join name behavior
- **identity/tests**: Added focused unit tests for identity resolver, sharing-slice identity mapping, and current-user name/image hooks
  - Why: Locks in precedence and fallback behavior for collaborator naming/avatar consistency
- **types/permissions**: Moved permission channel event interfaces from app-state to `src/types/permission-events.ts` and consumed shared types in realtime/store modules
  - Why: Centralizes permission event contracts for reuse and consistent typing
- **docs/readme**: Updated collaboration feature text to reflect shipped PartyKit/Yjs sharing and presence support
  - Why: Removes stale “coming soon” wording for implemented realtime collaboration
- **top-bar/mobile-menu**: Restored action-oriented settings CTA label (`Open Settings`)
  - Why: Clarifies that the button opens settings instead of duplicating the section heading

## [2026-02-23]

### Added

- **realtime/partykit**: PartyKit server with JWT authentication, Yjs CRDT document management, and database projection
- **realtime/yjs-provider**: Client-side Yjs provider with ref-counted room contexts, awareness support, and PartyKit WebSocket transport
- **realtime/graph-sync**: Serialization utilities for nodes/edges between React Flow, Yjs, and database representations
- **realtime/room-names**: Room naming convention supporting four channels per mind map (graph, comments, selected-nodes, presence)
- **realtime/util**: Shared `asNonEmptyString()` and `stableStringify()` helpers extracted from duplicated implementations
- **helpers/partykit/admin**: Server-side admin helper for forcibly disconnecting users from realtime rooms on access revocation
- **utils/debounce-per-key**: Per-key debounce utility for batching node/edge save operations
- **store/ui-slice**: Block node editor from opening on comment, group, and ghost node types
- **tests**: Unit tests for broadcast-channel, graph-sync, partykit-auth, room-names, debounce-per-key, system-update-one-shot

### Changed

- **realtime/broadcast-channel**: Rewritten as Yjs adapter maintaining Supabase RealtimeChannel API compatibility
- **store/nodes-slice**: Integrated Yjs graph sync — optimistic updates, broadcasts, and debounced DB saves flow through Yjs provider
- **store/edges-slice**: Integrated Yjs graph sync with coordinated edge + parent node updates
- **store/history-slice**: Database-backed undo/redo with Yjs state replacement via `replaceGraphState`
- **store/comments-slice**: Yjs-aware comment sync with system update tracking
- **store/sharing-slice**: Yjs lifecycle management on share state changes
- **store/layout-slice**: Batch layout updates propagated through Yjs in single transaction
- **api/history/revert**: Added Zod schema validation for body parameters with UUID format enforcement
- **api/share routes**: Integrated PartyKit admin disconnect on access revocation (delete-share, update-share, revoke-room-code)
- **components/mind-map-canvas**: Yjs lifecycle hooks for room setup/teardown
- **components/react-flow-area**: Yjs-aware drag end and node change handlers
- **components/top-bar**: Yjs connection status indicator

### Fixed

- **security/partykit**: Timing-safe admin token comparison via HMAC (Web Crypto pattern for CF Workers)
- **security/room-names**: Tightened UUID regex validation, added `isSafeRoomSegment()` rejecting null bytes and path traversal
- **security/error-responses**: Sanitized error responses across share routes — internal error messages no longer leak to clients
- **realtime/broadcast-send**: Fixed race condition where `send()` could execute before channel setup completed
- **realtime/yjs-provider**: Fixed mutation-during-iteration bug in `cleanupAllYjsRooms`
- **realtime/yjs-provider**: Added sync_events pruning (max 200 entries) preventing unbounded Y.Array growth
- **realtime/comparison**: Replaced `JSON.stringify` with key-order-stable `stableStringify` for deterministic object comparison
- **store/edges-slice**: Fixed typo `"Cannot save dge"` → `"Cannot save edge"`
- **store/edges-slice**: Replaced unsafe `JSON.parse(dbEdge.animated)` with `safeParseBooleanish()` helper

### Refactored

- **realtime/graph-sync**: Exported `toPgReal`, removed local copies from nodes-slice and layout-slice
- **realtime/dead-code**: Removed always-true `isYjsGraphSyncEnabled()` function and all conditional branches across 5 files
- **realtime/broadcast-channel**: Replaced 90-line `toBroadcastEnvelopeFromGraphMutation` with lookup map (~20 lines)
- **store/history-slice**: Extracted `syncRevertedState()` helper deduplicating snapshot and event revert paths
- **store/slices**: Renamed `toComparableRecord` → `toComparableNodeRecord`/`toComparableEdgeRecord` for clarity

---

<!-- Updated: 2026-02-22 - Mobile toolbar + tap multi-select + grouping context menu fixes -->

## [2026-02-22]

### Added

- **e2e/mobile-toolbar**: Added Playwright coverage for mobile toolbar overflow behavior (`e2e/tests/mind-map/toolbar-mobile.spec.ts`)
  - Verifies core-tool visibility, `More` overflow items, keyboard-help FAB hidden on mobile, and Guided Tour disabled state on zero-node maps
- **e2e/mobile-toast**: Added viewport geometry assertions for toast placement and width in `e2e/tests/mind-map/toolbar-mobile.spec.ts`
  - Verifies `Mind map loaded` toast stays above toolbar (`390x844`, `560x780`) and remains compact (`<=18rem`)
- **toolbar/mobile-selection**: Added `Tap Multi-select` toggle to the cursor dropdown for mobile editors (`<768px`) with Zustand-backed state
- **e2e/mobile-selection**: Added mobile Playwright coverage for tap multi-select flows in `e2e/tests/mind-map/toolbar-mobile.spec.ts`
  - Verifies multi-tap additive selection, pane-tap clear while mode stays enabled, dragging disabled in mode, and single-select behavior restored after toggle off

### Changed

- **ux/navigation**: Renamed user "Settings" to "Account" throughout — user menu item, panel title, and tab label now read "Account" to distinguish from "Map Settings"
  - Why: "Settings" was ambiguous — used for both account preferences and per-map configuration
- **ux/navigation**: Mobile map menu button label updated from "Open Settings" to "Map Settings" for consistency
- **toolbar/mobile**: Bottom toolbar now uses a compact mobile layout (`<768px`) with core actions visible (`Cursor`, `Add`, `AI`, `Comments`) and secondary actions moved under a `More` dropdown
- **toolbar/mobile**: `More` overflow submenu triggers (`Auto Layout`, `Export`, `Guided Tour`) now use click-toggle behavior (`openOnHover={false}`) for reliable touch interaction
- **selection/reactflow**: React Flow internal `multiSelectionActive` now follows mobile tap mode (`isMobile && canEdit && activeTool === 'default' && mobileTapMultiSelectEnabled`) and is reset to `false` on cleanup
- **selection/mobile-drag**: Node dragging is disabled while tap multi-select mode is active to prevent accidental repositioning during multi-select tap workflows
- **toasts/layout**: Global app toaster now uses `.app-toaster` class targeting and compact baseline width (`min(18rem, calc(100vw - 1.5rem))`) for consistent tablet/mobile sizing
- **docs/readme**: Added an E2E testing section with Playwright browser setup and `.next/lock` troubleshooting guidance; removed the detailed local webServer behavior subsection for brevity

### Fixed

- **node-editor/mobile**: CodeMirror autocomplete dropdown no longer gets clipped by node editor modal bounds on mobile
  - Render tooltips to `document.body` via CodeMirror `tooltips({ parent, position: 'fixed' })` so suggestions escape scroll/overflow containers
  - Updated autocomplete width constraints (`minWidth: 240px`, viewport-capped width/maxWidth) and elevated z-index to keep the menu visible on small screens
- **shortcuts-help/mobile**: Keyboard shortcuts FAB is now hidden on mobile to prevent overlap with the bottom toolbar
- **toasts/mobile-tablet**: Mind-map toasts now use runtime bottom-dock measurement (`ResizeObserver` + resize/orientation listeners) to set `--mind-map-toolbar-clearance`, preventing overlap with the bottom toolbar on small/tablet windows
- **toasts/mobile-width**: Overrode Sonner `<=600px` full-width behavior for app toasts; toasts stay right-aligned and compact (~`18rem`) instead of stretching edge-to-edge
- **e2e/webserver**: Playwright `webServer` now starts Next.js with explicit loopback binding (`--hostname 127.0.0.1 --port 3000`) and increased startup timeout (`300000ms`) to avoid local startup timeouts during `pnpm build && pnpm start`
- **selection/mobile-runtime**: Fixed `ReferenceError: Cannot access 'isMobileTapMultiSelectActive' before initialization` in `react-flow-area.tsx` by ordering derived-mode declarations before dependent callbacks
- **context-menu/group**: `Ungroup` now appears for group nodes via robust group detection (`type`, `data.node_type`, `data.nodeType`, `metadata.isGroup`, `metadata.groupChildren`) and is available directly in node context menus
- **context-menu/selection-bounds**: Right-click on the React Flow multi-selection rectangle now opens app context menu (wired `onSelectionContextMenu`) instead of browser native menu
- **context-menu/layout**: Removed empty top-section spacing when grouping actions are hidden by rendering only non-empty menu sections

---

<!-- Updated: 2026-02-21 - Collaborator mentions, export scale simplification, dependency patch updates -->

## [2026-02-21]

### Refactored

- **editor/codemirror**: Extracted `STATUS_EXCLUDE_PREFIXES` array — status regex now built from the constant instead of a brittle inline lookbehind; update the array when adding new `prefix:value` patterns
- **editor/codemirror**: Merged duplicate `.cm-pattern-alt` and `.cm-pattern-alttext` style blocks into a single combined selector
- **export/png**: Removed PNG export resolution selector (1x/2x/3x/4x) — PNG export scale is now fixed to 2x

### Added

- **editor/mentions**: `@` autocomplete in node editor now shows real collaborators — loaded eagerly on map open (no longer requires opening the share panel first)
- **editor/mentions**: Real collaborators ranked above built-in team roles in `@` dropdown (boost:1 vs boost:0)
- **editor/mentions**: Assignee metadata badges now show collaborator avatar with initials fallback instead of generic user icon
- **editor/mentions**: Added `CollaboratorMention` type and built-in preset mentions (`@dev`, `@design`, `@pm`, etc.)

### Fixed

- **editor/imageNode**: `alt:` and `src:` patterns now parsed by PATTERN_CONFIGS — `altText` and `source` round-trip correctly through edit/save cycles (previously treated as plain text)
- **editor/imageNode**: `alt:"text"` syntax help entry now has `insertText` — clicking it inserts the prefix instead of nothing
- **editor/codeNode**: `showLineNumbers` in node-creator no longer re-enables line numbers when metadata holds boolean `false` (preserves default-on behavior)
- **editor/codemirror**: `hasEmbeddedPatterns` resets `lastIndex` on global regexes before each `.test()` call — eliminates false negatives on repeated calls
- **editor/codemirror**: `alt:` and `src:` tokens now highlighted in quick-input editor and excluded from status pattern matching
- **export/pdf**: Author name now uses profile `display_name` → `full_name` → email fallback instead of always using email

### Changed

- **editor/codemirror**: `KNOWN_ANNOTATION_TYPES` extracted to module-level constant (was re-allocated per match in `valueClassName`)
- **export/pdf**: PDF export now uses the same fixed `2x` image capture pipeline as PNG
- **export/png**: PNG export rendering scale remains hardcoded to `2x` for consistent output quality
- **deps**: Applied patch-version dependency updates (runtime + dev tooling) and refreshed lockfile

---

<!-- Updated: 2026-02-20 - Parser/serializer consistency fixes -->

## [2026-02-20]

### Fixed

- **editor/codeNode**: Quick-input serialization no longer wraps content in triple-backtick fences — raw content is output directly so re-editing round-trips correctly
- **editor/resourceNode**: Quick-input serialization no longer emits `restype:` (no corresponding parser existed)
- **editor/imageNode**: Quick-input serialization no longer emits `cap:` (no corresponding parser existed)
- **editor/codeNode**: `lines:on|off` pattern now parsed correctly — `showLineNumbers` round-trips through edit/save cycle
- **editor/imageNode**: Syntax help now shows correct `alt:"text"` format instead of outdated `"alt text"` format
- **editor/codeNode**: `lines:on|off` now highlighted in quick-input editor (cyan); no longer misidentified as a status token
- **editor/annotationNode**: `type:value` now highlighted for any identifier (known values get semantic colors; unknown values get gray); parser also updated to accept any identifier
- **editor/annotationNode**: Removed emoji shortcut entries from syntax help (no insertText — not useful to click); fixed `$annotation` examples to use generic text

---

<!-- Updated: 2026-02-19 - Pan mode edge fix, CodeMirror UX -->

## [2026-02-19]

### Fixed

- **nodes/handle**: Edge creation via bottom handle now disabled in pan mode — `isConnectable` gated on `activeTool`

### Added

- **editor/codemirror**: Added `scrollPastEnd` and `highlightActiveLine` extensions for better editing UX

---

<!-- Updated: 2026-02-18 - Content-aware export bounds -->

## [2026-02-18]

### Fixed

- **export/bounds**: Export now captures content-aware bounds using `getNodesBounds` + `getViewportForBounds` instead of browser viewport dimensions — tall/wide mind maps no longer get cut off or shrunk with whitespace

### Removed

- **export/fitView**: Removed "Fit all nodes in view" toggle (no longer needed — export always captures all content)
- **export/deadcode**: Removed `calculateNodesBoundingBox` (unused), `exportFitView` state/setter, zoom compensation logic

---

<!-- Updated: 2026-02-13 - JSON export, PDF/JSON paywall, mobile node editor, server-side export, node permission fix -->

## [2026-02-13]

### Added

- **export/json**: JSON map export — nodes & edges with internal fields stripped (DB IDs, AI state, React Flow internals)
- **export/paywall**: PDF and JSON export gated behind Pro subscription (UI badge + client-side guard in `startExport`)
- **export/validate**: Server-side subscription validation endpoint (`/api/export/validate`) with telemetry logging for unauthorized attempts
- **export/json-server**: Server-side JSON export generation (`/api/export/json`) — fetches from DB, validates subscription + map ownership, strips internal fields server-side

### Fixed

- **nodes/permissions**: Viewers can no longer interact with node toolbar edit buttons or task checkboxes — all 8 node types with `SharedNodeToolbar` now enforce `canEdit` permission, with lock icon indicator for read-only users
- **auth/guest-banner**: Guest signup banner now uses `guestSignup` popover state instead of `upgradeUser`
- **tests/base-node-wrapper**: Fix `AIActionsPopover` test crash by mocking component to avoid deep store dependency chain
- **export/json**: Exclude orphaned edges referencing filtered ghost nodes from JSON export
- **node-editor/mobile**: Responsive layout — container fits mobile viewport, input stacks vertically, preview hidden on mobile, action bar text shortened to prevent truncation
- **export/dropdown**: Locked format radio items no longer fully disabled — clicks now trigger upgrade prompt instead of being silently blocked

### Refactored

- **code-node/copy**: Replace spring animation on copy button with smooth ease-out rotate + blur + opacity CSS transition; reduced-motion covered by global `prefers-reduced-motion` rule

### Changed

- **export/dropdown**: Hide export settings submenu when JSON format is selected
- **export/dropdown**: Increase dropdown max-height for additional format option
- **export/slice**: Pro export check moved from client-side plan name comparison to server-side API validation with 403 handling
- **landing/faq**: Update export FAQ to accurately reflect free (PNG/SVG) vs Pro (PDF/JSON) tiers

---

<!-- Updated: 2026-02-12 - Remove node resize, export fixes, a11y -->

## [2026-02-12]

### Fixed

- **gdpr/export**: Batch `.in()` queries into chunks of 50 IDs to avoid URL length limits on large accounts
- **gdpr/export**: Filter out system-only ghost nodes from data export
- **gdpr/export**: Always fetch user's comment messages/reactions regardless of comment thread ownership
- **a11y/404**: Add `focus-visible` ring to back-to-home link for keyboard users
- **settings**: Fix Delete Account block indentation in settings panel

### Refactored

- **nodes/resize**: Removed entire node dimension management layer (~1000 lines deleted)
  - Deleted `use-node-dimensions` hook (372L), `node-dimension-utils` (287L), `use-measure` hook (36L)
  - Removed `NodeResizer` from base-node-wrapper and group-node
  - Removed `updateNodeDimensions` store action
  - Why: Fixed 320px width + CSS auto-height replaces manual dimension tracking
- **nodes/width**: Standardized all node width fallbacks to 320px (was 200px), prioritized `node.measured` over static fields
- **nodes/factory**: Removed width/height from node creation pipeline and broadcast sync

### Removed

- **nodes/resize**: `NodeResizer` UI component instances (2 removed)
- **nodes/dead-code**: `NodeFactory.getDefaults()` method, `NodeRegistry.getDimensions()` method
- **nodes/registry**: Removed `dimensions` config and `resizable` flag from all 13 node type entries

---

<!-- Updated: 2026-02-10 - SEO infrastructure + GDPR data export -->

## [2026-02-10]

### Added

- **seo/og-image**: Dynamic OG image generation via `opengraph-image.tsx` (1200x630, Shiko brand)
- **seo/sitemap**: Dynamic sitemap at `/sitemap.xml` with all public routes
- **seo/robots**: Robots.txt at `/robots.txt` blocking private routes (dashboard, mind-map, api, etc.)
- **seo/json-ld**: WebSite + Organization structured data in root layout
- **seo/json-ld**: FAQPage structured data in FAQ section for rich snippets
- **seo/manifest**: Web app manifest at `/manifest.webmanifest` with dark theme
- **seo/404**: Custom not-found page with Shiko branding and home link
- **seo/metadata**: Added `metadataBase` to root layout (fixes social image build warnings)
- **gdpr/export**: Full data export API (`GET /api/user/export`) — profile, maps, nodes, edges, comments, subscriptions, activity
  - Why: GDPR Art. 20 compliance (data portability), was previously stubbed
- **gdpr/export**: Export button in settings panel with download-as-JSON flow
- **rate-limiter**: Data export rate limiter (1 request per hour per user)

### Fixed

- **export-dropdown**: Wrapped `DropdownMenuLabel` instances in `DropdownMenuGroup` (required by Base UI)

### Removed

- **seo**: Deleted `public/og-image-placeholder.svg` (replaced by dynamic generation)
- **seo**: Removed hardcoded `/og-image.png` references from landing page metadata

---

<!-- Updated: 2026-02-09 - Fix templates bypassing mind map limit -->

## [2026-02-09]

### Fixed

- **templates/limit**: Templates page now enforces mind map limit — "Use" button disabled at limit with upgrade toast
  - Why: Free users could bypass the 3-map limit by creating maps from templates
- **api/maps**: Server-side map count query now excludes `is_template` rows for accurate limit enforcement
- **sharing/collaborators**: Trial Pro users incorrectly hit free-tier 3-collaborator limit
  - Why: DB `subscription_plans.limits` was missing `collaboratorsPerMap` field; all fallbacks defaulted to 3
  - Fix: Added field to DB, hardened fallbacks in server (`with-subscription-check.ts`), client (`use-feature-gate.ts`), and `join_room` RPC to be plan-aware
- **sharing/collaborators**: Server-side `checkCollaboratorLimit` fallback now uses `plan.name` instead of subscription existence
  - Why: Aligns with client-side `use-feature-gate.ts` logic for consistent plan-aware limit resolution

---

<!-- Updated: 2026-02-07 - Logout toast spam fix v2 -->

## [2026-02-07]

### Fixed

- **node-editor**: Fix cursor positioning when clicking on scrolled content in CodeMirror editor
  - Why: Scroll container was on `.cm-content` instead of `.cm-scroller`, causing `posAtCoords()` to ignore scroll offset
- **auth**: Fix toast spam "Profile Error: User not authenticated" on logout (v2)
  - Why: `resetStore()` wiped `isLoggingOut` flag before async navigation completed; re-assert flag after reset and clear on next login

---

<!-- Updated: 2026-02-06 - Landing page redesign -->

## [2026-02-06]

### Changed

- **landing/hero**: Replace badge + glass panels with GrainGradient shader background, simplified single-color headline
- **landing/hero**: Nav and hero CTA buttons now white bg with dark text; "See How It Works" is plain text
- **landing/problem-solution**: Rewrite with Lora serif headline and two-column before/after grid (coral/blue dots)
- **landing/how-it-works**: Card-based layout with typographic step numbers (01/02/03) replacing horizontal 3-column cards
- **landing/features**: Wider container (max-w-7xl), blue glow on images, negative margin overlap for visual tension
- **landing/decorations**: Warm-to-cool color journey (coral problem → mixed features → blue how-it-works)
- **landing/faq**: Wider container (max-w-3xl)
- **landing/pricing+cta**: Subtle blue radial gradient undertones
- **landing/pricing**: White CTA button and RECOMMENDED badge (matching page-wide white style)
- **landing/final-cta**: White CTA button with arrow icon, footer border separator
- **landing/problem-solution**: Added card containers around before/after columns

### Removed

- **landing/trust-strip**: Removed (too generic/template-like)

### Added

- **landing/typography**: Lora serif on all section headlines
- **landing/css**: Hero shimmer animation keyframes, node-float/node-pulse keyframes

## [2026-01-30]

### Added

- **shortcuts-help**: Keyboard Shortcuts Help FAB (`src/components/shortcuts-help/shortcuts-help-fab.tsx`)
  - Floating action button (bottom-right) that expands into help card
  - Glass effect styling with backdrop blur
  - Spring animation morph from FAB position (respects prefers-reduced-motion)
  - Platform detection: ⌘ on Mac, Ctrl on Windows
  - Content stagger animation for categories
  - Close via: FAB toggle, Escape key, click outside
- **constants**: Keyboard shortcuts config (`src/constants/keyboard-shortcuts.ts`)
  - Centralized shortcut definitions with categories
  - Single source of truth for navigation, general, nodes, view shortcuts

### Changed

- **shortcuts**: Document ⌘+Arrow node creation shortcuts
  - Added ⌘→/←/↓/↑ to shortcuts help (already functional in `use-keyboard-navigation.ts`)

### Fixed

- **auth**: Sign-up magic link now routes correctly to dashboard
  - Created `/auth/verify` page that handles magic link auth types (signup, recovery, email_change)
  - Proxy routes `/?code=xxx` to verify page (OAuth goes directly to `/auth/callback`)
- **auth**: Eliminate perceived double redirect in magic link flow
  - Removed `history.replaceState` URL cleanup that caused visible URL flicker
  - Reduced redirect delay from 1500ms to 100ms
  - Verify page reads URL hash client-side, routes: PASSWORD_RECOVERY → forgot-password, SIGNED_IN → dashboard
- **shortcuts**: Removed non-working shortcuts from config
  - Removed undo/redo (⌘Z/⌘⇧Z) - only showed toast, not actual undo
  - Removed toggle comments (C) - no handler existed
  - Combined collapse/expand into single "Toggle collapse" (⌘-) - browser captures ⌘+ for zoom
  - Removed toast handlers from `use-keyboard-shortcuts.ts`
- **navigation**: Arrow key navigation now selects center-most node when none selected
  - Previously silently failed with no node selected
  - Now finds node closest to viewport center
- **shortcuts**: Removed redundant Tab shortcut
  - Tab "Add child node" was duplicate of ⌘+→
  - Removed from config and handler
- **a11y**: FAB respects `prefers-reduced-motion` for hover/tap transforms
  - `whileHover`/`whileTap` scale animations now disabled when reduced motion enabled
- **auth**: Use URLSearchParams for robust URL hash parsing in verify page
  - Replaced fragile regex with proper URLSearchParams parsing

### Removed

- **auth**: Removed `initialCheckDone` ref from forgot-password page
  - Was only needed for React Strict Mode (dev-only) running effects twice
  - Caused bug: refs persist across Next.js client-side navigation, breaking sign-in → forgot-password flow
  - The `mounted` flag already handles cleanup sufficiently

---

<!-- Updated: 2026-01-26 - AI popover click-outside fix -->

## [2026-01-26]

### Added

- **ai**: `AIActionsPopover` component for contextual AI actions (`src/components/ai/ai-actions-popover.tsx`)
  - Shared between node button and toolbar
  - Three actions: Expand ideas (node-only), Find connections, Find similar
  - Scope-aware: shows different options for node vs map context

### Changed

- **nodes**: AI sparkle button now opens popover instead of direct action
  - Smaller button footprint (icon only, no text)
  - Position moved closer to node (-right-[60px] from -right-[200px])
  - Shows spinner during streaming
- **toolbar**: AI dropdown replaced with popover
  - "Suggest Nodes" option removed from toolbar (only available on nodes)
  - Direct action selection without mode switching
- **suggestions-slice**: `generateConnectionSuggestions` and `generateMergeSuggestions` now accept optional `sourceNodeId`
  - When provided, filters results to suggestions involving that node
  - Client-side post-filtering preserves full AI map analysis

### Fixed

- **tests**: Updated base-node-wrapper tests for new popover behavior
- **realtime**: Guard against concurrent subscription attempts causing infinite loop on map load
  - Applied to `subscribeToNodes`, `subscribeToEdges`, and `subscribeToHistoryCurrent`
  - Cleanup existing subscription before creating new one to prevent duplicate handlers
- **toolbar**: AI actions popover click-outside not closing
  - Portaled backdrop to `document.body` to escape toolbar's transform containing block

---

## [2026-01-25]

### Added

- **realtime**: Secure broadcast channel system (`src/lib/realtime/broadcast-channel.ts`)
  - Private channels with RLS authorization via `realtime.messages` policies
  - Singleton channel manager with reference counting for shared subscriptions
  - Event types: node:create/update/delete, edge:create/update/delete, history:revert
- **supabase**: RLS migration for broadcast authorization (`20260125131822_realtime_broadcast_authorization.sql`)
  - `map_users_can_receive_broadcasts` policy (owner, public, share_access)
  - `editors_can_send_broadcasts` policy (owner, share_access with can_edit)
- **api**: `GET /api/maps/[id]/permissions` - fetch current user's permissions from share_access
- **sharing-slice**: `updateShareRole()` with optimistic updates, `fetchCurrentPermissions()` for returning collaborators
- **history-slice**: `revertingIndex` state to show spinner on specific item being reverted
- **auth**: `change-password-modal.tsx` and `password-reset-modal.tsx` components
- **validations**: Password validation schema in `src/lib/validations/auth.ts`

### Changed

- **realtime/cursor**: Migrated from public to private channel with `setAuth()`
- **realtime/presence**: Migrated both presence-room and selection-presence-room to private channels
- **nodes-slice**: Migrated from postgres_changes to secure broadcast
  - Broadcasts node create/update/delete after DB operations
- **edges-slice**: Migrated from postgres_changes to secure broadcast
  - Broadcasts edge create/update/delete after DB operations
- **history-slice**: Migrated from postgres_changes to secure broadcast
  - Broadcasts history:revert event after successful revert

### Removed

- **history**: In-memory history system (history[], canUndo, canRedo, handleUndo, handleRedo)
  - Why: Dual-system (in-memory + DB) caused real-time sync bugs during revert
  - Ctrl+Z/Ctrl+Shift+Z now show toast directing users to History panel
  - History panel still works via DB-only backend

### Refactored

- **slices**: Removed all `addStateToHistory()` calls from nodes-slice, edges-slice, layout-slice, suggestions-slice
  - `persistDeltaEvent()` remains as the sole history persistence mechanism
- **history-slice**: Simplified to DB-only approach, removed in-memory caching after revert
- **use-keyboard-shortcuts**: Removed onUndo/onRedo props, shows toast instead
- **history components**: Fetch delta on-demand instead of from in-memory cache
- **broadcast cleanup**: Removed redundant `unsubscribeFromSyncChannel()` calls in nodes-slice, edges-slice, history-slice
  - Cleanup function from `subscribeToSyncEvents` already handles this via ref counting
- **Base UI migration**: Converted `asChild` to `render` prop in password-strength, sign-in, forgot-password, user-menu, share-panel, mobile-menu, top-bar

### Security

- **realtime**: All broadcast channels now use `config: { private: true }` with RLS policies
  - Random users guessing map IDs cannot subscribe to broadcasts
  - Unauthenticated users cannot join any map channels

### Fixed

- **permissions**: Collaborator editor toolbar now appears immediately on page refresh
  - Why: Subscriptions (10s timeout) were blocking `isStateLoading`, delaying permission resolution
  - Fix: Fire subscriptions in background, only await comments + permissions fetch

---

## [2026-01-24]

### Fixed

- **auth**: Password reset PKCE flow - normalized origin to `localhost` for localStorage consistency
  - `127.0.0.1` and `localhost` are different origins, causing code verifier mismatch
- **ui/select**: Dropdown positioning - added `z-[100]`, `alignItemWithTrigger={false}`, `side="bottom"`
  - Was appearing above trigger or not visible in modals/sidepanels
- **ui/popover**: Z-index and side positioning for modals/sidepanels
  - Password requirements tooltip now appears correctly above the card
- **user-menu**: Nested button hydration error - switched from `asChild` to `render` prop
- **subscription-slice**: Silent failure for `fetchUsageData` on logout (non-critical data)

### Docs

- **CLAUDE.md**: Added Base UI Gotchas section (render prop, alignItemWithTrigger, portal z-index)

---

## [2026-01-23]

### Added

- **legal**: Privacy Policy page at `/privacy`
  - GDPR & CCPA compliant with 12 sections
  - Data collection disclosure, legal basis, subprocessor list
  - User rights (access, rectification, erasure, portability)
  - Contact information and complaint procedures
- **legal**: Terms of Service page at `/terms`
  - 16 comprehensive sections covering acceptable use, billing, AI features
  - Subscription plans and cancellation terms
  - Limitation of liability and dispute resolution (Poland jurisdiction)
- **legal**: Shared layout for legal pages with consistent header/footer
- **landing**: Added Privacy and Terms links to footer
- **legal**: Cookie notice banner (GDPR-compliant)
  - Simple informational notice (essential cookies only, no consent needed)
  - localStorage persistence after acknowledgement
  - Hidden on `/privacy` and `/terms` pages
  - Reduced motion support, responsive design
- **account**: GDPR Art. 17 compliant account deletion flow
  - DELETE `/api/user/delete` endpoint with FK-safe cascade deletion
  - Immediate Polar subscription revocation before data deletion
  - Confirmation email via Resend after successful deletion
  - DeleteAccountDialog component with email confirmation input
  - Deletes 20 tables of user data in FK-safe order
  - Best-effort deletion with logging for manual cleanup

**Files created:**

- `src/app/(legal)/layout.tsx`
- `src/app/(legal)/privacy/page.tsx`
- `src/app/(legal)/terms/page.tsx`
- `src/components/legal/back-to-top-link.tsx`
- `src/components/legal/cookie-notice-banner.tsx`
- `src/app/api/user/delete/route.ts`
- `src/components/account/delete-account-dialog.tsx`
- `src/lib/email.ts`

**Files modified:**

- `src/components/providers/client-providers.tsx` (added CookieNoticeBanner)
- `src/components/dashboard/settings-panel.tsx` (wired delete account button)
- `src/store/slices/user-profile-slice.ts` (sync email from auth to profile)
- `src/types/user-profile-types.ts` (added email field to UserProfile)

### Removed

- **landing**: Skip-to-content button (was appearing on back navigation)

---

## [2026-01-20]

### Security

- **mind-map/[id]**: Add server-side access validation before page renders
  - Why: Previously access was only checked client-side after fetch failed (DDoS vector)
  - Server component now validates session + ownership/share_access before any JS loads
- **mind-map/[id]**: Add rate limiting (60 req/min per IP) to prevent abuse
- **api/check-access**: Fix missing `status='active'` filter on share_access queries
  - Why: Revoked access records could incorrectly show as "shared"

### Fixed

- **access-check**: Template mind maps now accessible to authenticated users
  - Why: Access check only verified owner/share_access, missing `is_template` check

### Added

- **access-denied**: New `/access-denied` page with room code entry support
  - Handles: `no_access`, `not_found`, `rate_limited` reasons
  - Animated illustrations matching existing error page patterns
- **dashboard**: Server-side auth validation for `/dashboard` and `/dashboard/templates`
  - Why: Previously auth was only checked client-side (similar DDoS vector)
  - Blocks anonymous users before any client JS loads

## [2026-01-18]

### Fixed

- **api/join-room**: Guest users can now join rooms (was returning "Mind map not found")
  - Why: RLS blocked anonymous users from reading mind_maps before share_access was created
  - Consolidated 6 DB round trips into single atomic `join_room` RPC (SECURITY DEFINER)

### Refactored

- **database**: Consolidate join room logic into single `join_room` RPC
  - Absorbs: `validate_room_code`, `get_or_create_share_access_record`, `increment_share_token_users`
  - Keeps: `decrement_share_token_users` (still used by delete-share)
  - Benefits: 1 round trip vs 6+, atomic transaction, simpler route code

### Security

- **api/maps**: Add missing user_id filter to ownedMaps query (critical fix)
- **api/checkout**: Remove PII (email) from server logs, replaced with user.id
- **api/checkout**: Add Zod validation to prevent invalid billing intervals
- **api/billing/invoice**: Add auth check for consistency with other billing routes
- **api/billing/portal**: Surface specific errors from auth and subscription queries
- **api/webhooks/polar**: Validate POLAR_WEBHOOK_SECRET at module load
- **api/webhooks/polar**: Fix subscription.canceled to keep status 'active' until period end
- **api/join-room**: Handle PGRST116 (no rows) vs actual DB errors for existing access check
- **api/join-room**: Add documentation about race condition in collaborator limit check
- **api/create-room-code**: Fix step comment numbering (3,3,4,6,6 → 1-7)
- **subscription-check**: Add error handling and throw on DB failure in getMapCollaboratorCount
- **use-feature-gate**: Fix collaboratorsPerMap to 0 (requires server query)
- **subscription-slice**: Fix usageMap collaboratorsPerMap to 0 (enforced server-side)
- **polar.ts**: Add console.warn for unknown billing intervals

### Changed

- **components**: Update stale "Dodo" comments to "Polar" in upgrade-modal and pricing-step

### Added

- **migration**: Add unique partial index on user_subscriptions.polar_subscription_id
  - Required for upsert with onConflict in webhook handler
- **share-panel**: Free tier Max Users capped to 3 with orange upgrade indicator
  - Why: Users couldn't see their limit until hitting it; now proactive visibility

## [2026-01-17]

### Fixed

- **dashboard/mind-map-card**: Title text now visible on card gradient backgrounds
  - Why: Missing `text-white` class caused title to inherit unclear default color
- **billing/usage-period**: Usage limits now aligned with subscription billing cycle instead of calendar month
  - Why: Users subscribing mid-month had incorrect usage counts (calendar month ≠ billing period)
  - `getAIUsageCount()` now uses `subscription.current_period_start` from Polar webhooks
  - Free users still fall back to calendar month boundaries
- **billing/mid-cycle-upgrade**: Plan changes now preserve proportional remaining usage
  - Why: Upgrading from free (0 AI) to pro (100 AI) should give ~100 remaining, not 0
  - Calculates adjustment: `old_limit - new_limit` stored in `metadata.usage_adjustment`
  - Adjustment applied when counting usage; resets on new billing period
- **dashboard/create-map-card**: Card height now matches MindMapCard (h-56)

### Added

- **billing/helpers**: `getSubscriptionBillingPeriod(user, supabase)` returns period dates + adjustment
- **billing/helpers**: `calculateUsageAdjustment(oldLimit, newLimit)` for mid-cycle plan changes
- **billing/webhooks**: Period transition detection clears usage_adjustment on renewal
- **billing/webhooks**: Plan change detection calculates and stores usage adjustment
- **dashboard/create-map-card**: Disabled state with tooltip at map limit
- **quick-input**: Warning banner + disabled create at node limit
- **share-panel**: Disabled room code generation at collaborator limit
- **MVP_ROADMAP.md**: Phase 5 database security plan (PostgreSQL triggers)

### Changed

- **billing/usage-api**: `/api/user/billing/usage` now returns subscription-aligned billing period
- **billing/webhooks**: `handleSubscriptionUpdated()` tracks both period changes and plan changes

### Tests

- **e2e/billing**: Added comprehensive usage limit E2E tests (10 tests)
  - Free user 402 enforcement, Pro/trialing access
  - Billing period boundary verification
  - Mid-cycle upgrade/downgrade adjustment
  - Usage count accuracy
  - Requires: `SUPABASE_SERVICE_ROLE_KEY` in `.env.e2e.local`

### Security

- **api/search-nodes**: Add AI limit check + usage tracking (was unprotected)

---

## [2026-01-16]

### Fixed

- **billing/webhooks**: Webhook handlers now throw on DB errors (enables Polar retry)
  - Why: Silent failures caused data loss when DB writes failed but Polar saw 200 OK
- **billing/status-mapping**: Unknown Polar statuses now map to `'unpaid'` instead of `'active'`
  - Why: Security - undocumented statuses should not grant paid access
- **billing/period-dates**: Calculate billing period end from interval when not provided
  - Why: Prevented period_start === period_end breaking billing cycle logic
- **subscription/feature-gate**: Deny access during subscription loading (was optimistic)
  - Why: Free users briefly got Pro features during page load (~500ms-2s window)

### Removed

- **billing/payment_history**: Dropped `payment_history` table and related code
  - Why: Billing history now delegated to Polar customer portal (simplifies codebase)
  - Removed: `/api/user/billing/payment-history` endpoint
  - Removed: `order.paid` and `order.refunded` webhook handlers
  - Simplified: `/api/user/billing/invoice` now redirects to portal
  - Removed: Billing History section from Settings panel (~120 lines)
- **teams**: Removed all team infrastructure (tables, columns, RLS policies, API logic)
  - Why: Half-implemented feature not needed for MVP; was security risk (no RLS)
  - Dropped: `teams`, `team_members` tables
  - Dropped: `team_id` columns from `mind_maps`, `map_folders`
  - Simplified: API routes now user_id-only auth (no team membership checks)
  - Updated: RLS policies on `map_folders` to user-only
  - Recreated: `map_graph_aggregated_view` without team_id

### Changed

- **dashboard/shared-filter**: Repurposed "Shared" filter to show maps accessed via share codes
  - Why: Removed team-based sharing, keep share-code-based access visible
  - Now queries `share_access` table for maps user can access but doesn't own
- **components**: Updated marketing text to remove "team" references
  - upgrade-modal: "Work together with your team" → "Work together in real-time"
  - pricing-step: "teams" → "collaborators"

---

## [2026-01-14]

### Added

- **subscription/usage-data**: Server-authoritative usage tracking via `/api/user/billing/usage`
  - Why: Free tier limits (3 maps, 50 nodes/map) require real usage data, not hardcoded stubs
  - UsageData interface + fetchUsageData action in subscription-slice
- **nodes/check-limit**: New `/api/nodes/check-limit` route for server-side node limit enforcement
  - Why: Prevents client-side bypass of node limits
- **hooks/use-usage-refresh**: Window focus refetch for real-time usage accuracy
  - Why: Usage updates when user returns to tab after creating maps elsewhere

### Fixed

- **subscription/getRemainingLimit**: Now returns `limit - usage` instead of just `limit`
  - Why: Was returning limit itself, not remaining quota
- **hooks/useSubscriptionLimits**: Wired to real usageData from store
  - Why: Was hardcoded to `mindMaps: 1`, `aiSuggestions: 0`

### Changed

- **nodes-slice/addNode**: Added dual enforcement (client-side fast + server-side authoritative)
  - Why: Client check is fast, server check prevents tampering
  - Triggers upgrade modal on 402 limit errors
- **chat-slice/sendChatMessage**: Refreshes usage data after successful AI response
- **dashboard**: Refreshes usage data after map creation and duplication

### Docs

- **MVP_ROADMAP.md**: Updated Phase 1.3 Feature Limit Enforcement to COMPLETED

### Refactored

- **billing**: Migrated from Dodo Payments to Polar.sh (Merchant of Record)
  - Why: Polar has fully isolated sandbox environment for testing (sandbox.polar.sh)
  - New routes: `/api/webhooks/polar` (replaced `/api/webhooks/dodo`)
  - New helper: `/src/lib/polar.ts` (replaced `/src/helpers/dodo/client.ts`)
  - Updated: checkout, cancel, reactivate, portal, invoice routes
  - Database migration: Replaced dodo*\*/stripe*\_ columns with polar\_\_ columns
  - Added packages: `@polar-sh/sdk`, `standardwebhooks`
  - Removed packages: `dodopayments`, `@dodopayments/nextjs`
  - Cleans up Stripe columns (technical debt item resolved)

---

## [2026-01-13]

### Added

- **landing/mobile-nav**: Responsive hamburger menu using Sheet component
  - Why: Landing page was desktop-only, now works on mobile
- **landing/images**: Real feature screenshots replacing placeholders
  - connection-suggestions.png, realtime.png, node-editor.png

### Fixed

- **landing/pricing**: Equal card heights via `h-full` on flex container
  - Why: Free card was shorter than Pro due to fewer features
- **landing/focus-states**: Added focus-visible rings for keyboard navigation
  - Why: Accessibility compliance for keyboard users

### Changed

- **landing/ctas**: "Try Free" → "Start Mapping", links to /dashboard
- **landing/icons**: Added aria-hidden to decorative icons
- **landing/animations**: Updated easing to use ease-in-out-cubic per guidelines
- **pricing-tiers**: Updated CTA text ("Get Started", "Go Pro")

### Docs

- **CLAUDE.md**: Added skills section + plan mode documentation

---

## [2026-01-10]

### Refactored

- **ui/components**: Complete migration from Radix UI to Base UI 1.0.0 stable
  - Why: Unified headless library with smaller bundle, consistent API patterns
  - Migrated 16 components: Tooltip, Separator, Progress, Avatar, Popover, Toggle, HoverCard→PreviewCard, ScrollArea, Tabs, ToggleGroup, Dialog, Sheet, Breadcrumb, Select, DropdownMenu→Menu, Badge
  - Custom Slot implementations replace @radix-ui/react-slot
  - Backwards-compatible: asChild→render prop, data-[state=*]→data-[*]

### Removed

- **deps**: All 14 @radix-ui/\* packages (53 transitive deps total)
  - Why: Replaced by @base-ui/react single package
- **ui/radio-group**: Deleted unused component (0 consuming files)
  - Why: No usages found in codebase

### Added

- **subscription/upgrade-modal**: Multi-step upgrade modal with embedded Stripe payment
  - Why: Users can now upgrade to Pro directly from modal without navigation
  - Transitions from pitch → payment step with AnimatePresence animations
- **hooks/use-session-time**: Session time tracking via localStorage
  - Why: Track total session duration for time-based upgrade prompts
- **hooks/use-upgrade-prompt**: Centralized upgrade trigger logic
  - Why: Consolidates time/limit checks, cooldown, user eligibility in one hook
- **subscription/triggers**: Time-based upgrade modal trigger (30 min threshold)
  - Why: Prompt free users to upgrade after meaningful usage
  - 24-hour cooldown after dismissal, registered users only

### Changed

- **payment-step**: Export PaymentForm, stripePromise for reuse in upgrade modal
- **settings-panel**: Upgrade button now opens modal (was TODO toast)
- **use-feature-gate**: showUpgradePrompt() now triggers modal via store
- **zustand selectors**: Added useShallow to subscription hooks for performance
- **pricing-tiers**: Updated Free tier (0 AI suggestions, 3 collaborators/map) and Pro tier (100 AI/month)
- **landing/page**: Rebuilt from waitlist capture to full marketing page with 7 sections

### Added (Landing Page Rebuild)

- **landing/hero-section**: Full-viewport hero with CTAs and scroll indicator
- **landing/problem-solution**: Two-column problem/solution contrast section
- **landing/features-section**: 3 feature blocks with alternating text/image layout
- **landing/how-it-works**: 3-step process with connecting line and staggered animations
- **landing/pricing-section**: Free/Pro comparison cards with billing toggle
- **landing/faq-section**: 5-question accordion with expand/collapse animations
- **landing/final-cta**: Gradient background CTA with hover effects
- All sections use scroll-triggered animations with ease-out-quart easing

---

## [2026-01-06]

### Fixed

- **deps/security**: Upgraded jspdf 3.0.4 → 4.0.0 (CVE-2025-68428)
  - Why: Critical path traversal vulnerability in Node.js build
  - No breaking changes - data URL usage unaffected
- **security/xss**: Sanitize HTML in chat-message.tsx using sanitize-html
  - Why: Prevent XSS via AI-generated content rendered as HTML
- **security/xss**: Replace innerHTML with regex in edge-edit-modal.tsx
  - Why: Prevent XSS when extracting text from node content
- **security/xss**: Add URL validation to markdown-content.tsx links
  - Why: Block javascript: URLs in markdown anchor hrefs
- **security/pii**: Remove debug logs exposing user PII in set-password route
  - Why: Production logs should not contain user IDs, emails, auth states
- **errors**: Add error logging to empty catch blocks in room-code-display.tsx
  - Why: Silent failures with no logs make debugging impossible
- **auth/verify-otp**: Use shared PASSWORD_MIN_LENGTH + PASSWORD_REGEX from auth validations
  - Why: DRY - password rules were hardcoded in verify-otp route
- **subscriptions/cancel**: Refactor to use withAuthValidation + respondSuccess/respondError helpers
  - Why: Consistency with other API routes, standardized auth/response handling
- **subscriptions/create**: Validate TRIAL_DURATION_MS after parsing
  - Why: parseInt can return NaN or negative values from malformed env vars
- **auth/oauth-buttons**: Design tokens, hover media query, aria-labels, loading state, type dedup
  - Why: Accessibility, touch device support, shared OAuthProvider type from store
- **auth/sign-up-wizard**: Check result.status === 'success' instead of result.success
  - Why: API returns {status: 'success', data: ...} not {success: true}
- **auth/success-step**: Use ref for onComplete callback in auto-redirect timer
  - Why: Prevent timer reset when parent passes non-memoized callback
- **waitlist/css-tokens**: Replace invalid surface-primary/border-secondary with correct tokens
  - Why: Classes didn't map to existing CSS variables (surface, border-subtle)
- **waitlist-hero**: Replace text-error-300 with text-brand-coral
  - Why: Error semantic misused for branding; added --color-brand-coral token
- **auth/validations**: Add email/displayName normalization transforms to schemas
  - Why: Client-side values should match server-side expectations (lowercase, trimmed)
- **auth/profile-fallbacks**: Add avatar_url + created_at to profile fallback objects
  - Why: Response shape must match DB query columns; prevents type mismatches in consumers

### Docs

- **CLAUDE.md**: Add NodeData.metadata design rationale
  - Why: Document intentional unified type for node type switching

---

## [2026-01-05]

### Added

- **auth/sign-up**: New email-verified sign-up flow with 2-step wizard
  - Step 1: Collect email, password, optional display name
  - Step 2: OTP verification before account creation
  - API routes: `sign-up/initiate/` (send OTP), `sign-up/verify-otp/` (create account)
  - Rate limiters: 3 initiate attempts/min, 5 OTP attempts/min
  - Why: Prevent spam accounts via email verification

- **auth/shared**: Reusable auth UI components
  - AuthCard, AuthLayout, OAuthButtons, PasswordRequirementsInfo
  - Consistent styling across sign-in, sign-up, upgrade flows

- **lib/validations/auth.ts**: Zod schemas for auth forms
  - signInSchema, signUpFormSchema, otpSchema
  - Password strength checker with requirement list

### Changed

- **sign-in page**: Refactored to use shared components, added OAuth buttons, improved animations
- **upgrade-anonymous**: Uses shared PasswordRequirementsInfo component
- **join pages**: Minor styling updates for consistency

---

## [2026-01-04]

### Changed

- **deps**: Updated Stripe from 19.3.1 to 20.1.0
  - Updated API version: `2025-10-29.clover` → `2025-12-15.clover` in 6 billing routes

### Docs

- **CLAUDE.md**: Added critical security rule banning .env file reads
  - Why: Prevent accidental exposure of secrets in AI outputs

---

## [2026-01-01]

### Fixed

- **Room code revocation instant kick**: Users now get kicked immediately when owner revokes room code
  - Created `revoke_room_code_and_broadcast` RPC function using `realtime.send()` for in-database broadcast
  - RPC atomically: deactivates token → broadcasts to each user → DELETEs share_access records
  - Changed from UPDATE status='inactive' to DELETE records (simpler binary state: access exists or doesn't)
  - Eliminates multiple HTTP requests from API layer - single database round-trip
  - Why: Previous implementation relied on unreliable `postgres_changes` UPDATE events

---

## [2025-12-31]

### Added

- **E2E test gap documentation**: Created `e2e/E2E_TEST_GAPS.md` tracking missing permission tests
  - Documents 10 missing tests for viewer/commentator AI Chat and comment restrictions
  - Includes implementation prerequisites (page objects needed)
  - Why: Ensure we don't forget to implement remaining permission boundary tests

- **E2E placeholder tests**: Added 9 skipped `.skip` placeholder tests to `permissions.spec.ts`
  - Viewer: 3 skipped (Comments hidden, AI Chat hidden, view comment threads)
  - Commentator: 6 skipped (open panel, add comment, reply, reactions, delete restriction, AI Chat)
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
  - Test commentator role restrictions (6 tests): view + comment only
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
