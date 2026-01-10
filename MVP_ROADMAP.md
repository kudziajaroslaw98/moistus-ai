# Moistus AI - MVP Launch Roadmap

> Last updated: 2026-01-09 (4 tasks completed, upgrade flow scope clarified)
> Estimated effort: 45-60 hours

## Summary

MVP launch readiness checklist:
1. **Critical fixes:** Profile persistence, upgrade flow, feature limits, undo/redo
2. **GDPR compliance:** Data export (required), privacy settings
3. **Billing:** Resend email notifications for trial/payment events
4. **New features:** Video node (YouTube embeds), AI Chat feature-flagged OFF
5. **Landing page:** Full marketing page with "Try Free" anonymous mode (localStorage)
6. **Polish:** Mobile responsiveness, UX improvements

**Free tier limits:** 3 maps, 50 nodes/map (tracked in Supabase)

---

## Phase 1: Critical Fixes

> Trust-breaking issues that must be fixed before launch

### 1.1 User Profile Persistence
- [x] GET: Fetch from `user_profiles` table (create if not found)
- [x] PUT: Update `user_profiles` table with provided fields
- [x] Add proper error handling for DB failures
- [x] Follow existing pattern from `user-profile-slice.ts`

**Files modified:**
- `src/app/api/user/profile/route.ts`

**Status:** ✅ COMPLETED

---

### 1.2 Upgrade Flow (Stripe Integration)

**Current state:** `UpgradeModal` exists but is never triggered (dead code). Settings panel shows toast.

**Modal triggers (new):**
- [ ] Time-based: Show after 30 mins of session time
- [ ] Limit-based: Show when user hits usage limits (maps/nodes/AI)
- [ ] Wire `showUpgradePrompt()` in `use-feature-gate.ts` to open modal

**Modal fixes:**
- [ ] Fix "Start Free Trial" button (currently links to non-existent `/dashboard/settings/billing`)
- [ ] Either: redirect to Stripe portal OR create billing page OR embed Stripe Elements

**Other wiring:**
- [ ] Settings panel button → open modal (replace TODO toast)
- [ ] Connect modal to existing `/api/subscriptions/create` endpoint

**Decisions:**
- ✅ 30 mins total session time
- ✅ Registered free users only (not anonymous)
- ✅ 24-hour dismissal cooldown
- ✅ Soft limit (dismissable, not blocking)

**Files:**
- `src/components/modals/upgrade-modal.tsx` (fix link)
- `src/components/mind-map/react-flow-area.tsx` (add triggers)
- `src/components/dashboard/settings-panel.tsx` (line 356)
- `src/hooks/use-feature-gate.ts` (wire showUpgradePrompt)

**Effort:** 3-4 hours | **Risk:** Low (modal exists, just needs wiring)

---

### 1.3 Feature Limit Enforcement
- [ ] Create Supabase table for usage tracking (maps count, nodes count, AI calls)
- [ ] Implement `getRemainingLimit()` with actual DB query
- [ ] Make `showUpgradePrompt()` open the upgrade modal
- [ ] Add usage display in AI Chat before hitting wall

**Files:**
- `src/hooks/use-feature-gate.ts` (lines 60, 94, 99)
- `src/store/slices/subscription-slice.ts` (line 362)

**Effort:** 6-8 hours | **Risk:** Medium

---

### 1.4 ~~Re-enable Undo/Redo~~ → Removed (using History sidebar instead)
- [x] Removed Undo/Redo buttons from desktop top bar
- [x] Removed Undo/Redo buttons from mobile menu
- [x] Kept History sidebar button for full change history access
- [x] Cleaned up unused `canUndo`/`canRedo` props from component tree

**Decision:** Hiding buttons saves UI space; History sidebar provides better context for reverting changes.

**Files modified:**
- `src/components/mind-map/top-bar/top-bar-actions.tsx`
- `src/components/mind-map/top-bar/mobile-menu.tsx`
- `src/components/mind-map/top-bar/index.tsx`
- `src/components/mind-map/react-flow-area.tsx`

**Status:** ✅ COMPLETED

---

## Phase 2: GDPR & Billing

### 2.1 Data Export (GDPR Required)
- [ ] Implement actual data gathering (maps, nodes, edges, comments, profile)
- [ ] Generate JSON or ZIP export
- [ ] Add download UI in settings panel
- [ ] Consider async job for large exports (queue + email when ready)

**Files:** `src/app/api/user/export/route.ts` (line 18)
**Effort:** 4-6 hours | **Risk:** Medium

---

### 2.2 Billing Emails via Resend
- [ ] Set up Resend SDK
- [ ] Create email templates:
  - [ ] Trial ending (3 days before)
  - [ ] Payment failed
  - [ ] Subscription canceled
  - [ ] Welcome email
- [ ] Hook into Stripe webhook events
- [ ] Add env var `RESEND_API_KEY`

**Files:**
- `src/app/api/subscriptions/webhook/route.ts` (lines 327, 328)
- New: `src/lib/email.ts`

**Effort:** 3-4 hours | **Risk:** Low

---

### 2.3 Privacy Settings Enforcement
- [x] Fetch `preferences` field including privacy settings
- [x] Check `profile_visibility` before returning profile data
- [x] Return minimal profile (name only) for 'private' visibility
- [x] Cleaned up debug console.logs
- [ ] Add privacy toggle to settings UI if missing (verify)

**Files modified:**
- `src/app/api/user/[userId]/public-profile/route.ts`

**Status:** ✅ COMPLETED (API enforcement done, UI toggle TBD)

---

## Phase 3: New Features

### 3.1 Video Node Type
- [ ] Create `video-node.tsx` component (follow `resourceNode` pattern)
- [ ] Create `video-content.tsx` shared content component
- [ ] Register in `node-registry.ts`
- [ ] Add `$video` command to node-editor
- [ ] Implement oEmbed metadata fetching (YouTube, Vimeo)
- [ ] Add iframe with sandbox attributes for security
- [ ] Loading state with thumbnail placeholder
- [ ] Test with various video URLs

**Files to create:**
- `src/components/nodes/video-node.tsx`
- `src/components/nodes/content/video-content.tsx`

**Files to modify:**
- `src/registry/node-registry.ts`
- `src/components/node-editor/` (command system)

**Effort:** 4-6 hours | **Risk:** Low

---

### 3.2 AI Chat Feature Flag
- [x] Add `NEXT_PUBLIC_ENABLE_AI_CHAT=false` to env vars
- [x] Filter 'chat' tool from toolbar when flag is off
- [x] Conditionally render `<ChatPanel />` based on flag
- [x] Updated `.env.example` with new feature flag

**Files modified:**
- `src/components/toolbar.tsx`
- `src/components/mind-map/react-flow-area.tsx`
- `.env.example`

**Status:** ✅ COMPLETED

---

## Phase 4: Landing Page & Anonymous Mode

### 4.1 Full Landing Page Rebuild
- [ ] Create new landing page structure
- [ ] Hero section with "Try Free" CTA
- [ ] Logo strip (social proof)
- [ ] Problem → Solution section
- [ ] Features/Benefits (3-4 max with screenshots)
- [ ] Testimonials / Social proof
- [ ] How it works (3 steps)
- [ ] Pricing (Free vs Pro comparison)
- [ ] FAQ section
- [ ] Final CTA section
- [ ] Minimal footer
- [ ] Mobile-first responsive design
- [ ] <3s load time optimization
- [ ] WCAG 2.1 AA accessibility

**Files:**
- `src/app/(landing)/page.tsx` (rebuild)
- New: `src/components/landing/hero-section.tsx`
- New: `src/components/landing/features-section.tsx`
- New: `src/components/landing/pricing-section.tsx`
- New: `src/components/landing/faq-section.tsx`
- New: `src/components/landing/social-proof.tsx`
- New: `src/components/landing/how-it-works.tsx`

**Effort:** 12-16 hours | **Risk:** Medium

---

### 4.2 Anonymous "Try Free" Mode
- [ ] Create localStorage slice for anonymous maps
- [ ] "Try Free" button → anonymous canvas session
- [ ] Persistent "Sign up to save your work" banner
- [ ] No AI features for anonymous users
- [ ] On sign-up: migrate localStorage map to Supabase
- [ ] Handle localStorage cleared gracefully

**User flow:**
1. User clicks "Try Free" on landing
2. Drops into canvas with localStorage map
3. Banner: "Sign up to save permanently"
4. On sign-up: localStorage map → Supabase
5. If tab closes without sign-up: data persists in localStorage

**Files to create:**
- `src/store/slices/local-storage-slice.ts`
- `src/components/mind-map/anon-save-banner.tsx`
- `src/app/(landing)/try/page.tsx` or canvas route with anon mode

**Effort:** 6-8 hours | **Risk:** Medium

---

## Phase 5: Polish

### 5.1 Mobile Responsiveness
- [ ] Audit hover states on touch devices
- [ ] Add `@media (hover: hover)` wrapper to hover transitions
- [ ] Test canvas interaction on mobile (pinch zoom, pan)
- [ ] Ensure node editing works on mobile keyboards
- [ ] Verify touch targets meet accessibility guidelines (48px min)

**Effort:** 2-4 hours | **Risk:** Low

---

### 5.2 UX Polish (If Time)
- [ ] Payment error retry UI
- [ ] Confirm dialog for room code revoke
- [ ] Empty dashboard state (0 maps guidance)
- [ ] Subscription management UI (view/cancel plan)
- [ ] Billing history viewer

---

## Decisions Reference

| Topic | Decision |
|-------|----------|
| Free tier limits | 3 maps, 50 nodes/map |
| Usage tracking | Supabase (server-authoritative) |
| Anonymous mode | LocalStorage only, no AI |
| AI Chat | Feature flag OFF for MVP |
| Video metadata | oEmbed API (free, standard) |
| Billing emails | Resend integration |
| Landing content | Collaborate together during implementation |
| Data export | Required (GDPR) |
| Upgrade modal time trigger | 30 mins total session time |
| Upgrade modal audience | Registered free users only |
| Upgrade modal cooldown | 24 hours |
| Limit enforcement | Soft (dismissable) |

---

## Recommended Work Order

1. **Quick wins first** (Undo/Redo, AI flag, privacy) - builds momentum
2. **Critical fixes** (profile, upgrade, limits) - trust-critical
3. **GDPR** (export, emails) - legal requirement
4. **Landing page + anon mode** - conversion funnel
5. **Video node** - new feature
6. **Polish** - nice-to-haves

---

## Files Quick Reference

**Critical fixes:**
- `src/app/api/user/profile/route.ts`
- `src/components/dashboard/settings-panel.tsx`
- `src/hooks/use-feature-gate.ts`
- `src/store/slices/subscription-slice.ts`
- `src/components/mind-map/top-bar/top-bar-actions.tsx`
- `src/components/mind-map/top-bar/mobile-menu.tsx`

**GDPR & Billing:**
- `src/app/api/user/export/route.ts`
- `src/app/api/subscriptions/webhook/route.ts`
- `src/app/api/user/[userId]/public-profile/route.ts`
- New: `src/lib/email.ts`

**New features:**
- New: `src/components/nodes/video-node.tsx`
- New: `src/components/nodes/content/video-content.tsx`
- `src/registry/node-registry.ts`

**Landing & Anonymous:**
- `src/app/(landing)/page.tsx`
- New: `src/components/landing/*.tsx`
- New: `src/store/slices/local-storage-slice.ts`
- New: `src/components/mind-map/anon-save-banner.tsx`
