# Changelog

All notable changes to this project are documented here.
Format: `[YYYY-MM-DD]` - one entry per day.

---

<!-- Updated: 2026-02-21 - Collaborator mentions, export scale simplification, dependency patch updates -->
## [2026-02-21]

### Refactored
- **editor/codemirror**: Extracted `STATUS_EXCLUDE_PREFIXES` array — status regex now built from the constant instead of a brittle inline lookbehind; update the array when adding new `prefix:value` patterns
- **editor/codemirror**: Merged duplicate `.cm-pattern-alt` and `.cm-pattern-alttext` style blocks into a single combined selector
- **export/ui**: Removed PNG export resolution selector (1x/2x/3x/4x) — export scale is now fixed to 2x

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
- **export/png+pdf**: Export rendering scale is now hardcoded to `2x` for consistent quality across image and PDF flows
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

### Added
- **billing/helpers**: `getSubscriptionBillingPeriod(user, supabase)` returns period dates + adjustment
- **billing/helpers**: `calculateUsageAdjustment(oldLimit, newLimit)` for mid-cycle plan changes
- **billing/webhooks**: Period transition detection clears usage_adjustment on renewal
- **billing/webhooks**: Plan change detection calculates and stores usage adjustment

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

### Added
- **dashboard/create-map-card**: Disabled state with tooltip at map limit
- **quick-input**: Warning banner + disabled create at node limit
- **share-panel**: Disabled room code generation at collaborator limit
- **MVP_ROADMAP.md**: Phase 5 database security plan (PostgreSQL triggers)

### Fixed
- **dashboard/create-map-card**: Card height now matches MindMapCard (h-56)

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
  - Database migration: Replaced dodo_*/stripe_* columns with polar_* columns
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
- **deps**: All 14 @radix-ui/* packages (53 transitive deps total)
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
