# Moistus AI - MVP Launch Roadmap

> Last updated: 2026-01-11 (Added legal compliance section - EU/US launch blockers)
> Estimated effort: 50-70 hours

## Summary

MVP launch readiness checklist:
1. **Critical fixes:** Profile persistence, upgrade flow, feature limits, undo/redo
2. **🚨 Legal compliance:** Privacy Policy, Terms of Service, Cookie Consent, Account Deletion
3. **GDPR compliance:** Data export (required), privacy settings
4. **Billing:** Resend email notifications for trial/payment events
5. **New features:** Video node (YouTube embeds), AI Chat feature-flagged OFF
6. **Landing page:** Full marketing page with "Try Free" anonymous mode (localStorage)
7. **Polish:** Mobile responsiveness, UX improvements

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

**Modal triggers:**
- [x] Time-based: Show after 30 mins of session time
- [ ] Limit-based: Show when user hits usage limits (maps/nodes/AI) - needs integration point
- [x] Wire `showUpgradePrompt()` in `use-feature-gate.ts` to open modal

**Modal fixes:**
- [x] Fix "Start Free Trial" button → now transitions to embedded payment form
- [x] Embed Stripe Elements (reused PaymentForm from onboarding)

**Other wiring:**
- [x] Settings panel button → open modal (replaced TODO toast)
- [x] Connect modal to existing `/api/subscriptions/create` endpoint

**Decisions:**
- ✅ 30 mins total session time
- ✅ Registered free users only (not anonymous)
- ✅ 24-hour dismissal cooldown
- ✅ Soft limit (dismissable, not blocking)

**Files created:**
- `src/hooks/subscription/use-session-time.ts` (session tracking)
- `src/hooks/subscription/use-upgrade-prompt.ts` (trigger logic)

**Files modified:**
- `src/components/modals/upgrade-modal.tsx` (multi-step with payment)
- `src/components/mind-map/react-flow-area.tsx` (time trigger)
- `src/components/dashboard/settings-panel.tsx` (upgrade button)
- `src/hooks/subscription/use-feature-gate.ts` (showUpgradePrompt + useShallow)
- `src/components/onboarding/steps/payment-step.tsx` (export PaymentForm)

**Status:** ✅ MOSTLY COMPLETE (limit-based trigger needs integration point)

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

## Phase 1.5: Legal Compliance (Launch Blockers)

> 🚨 **Cannot launch without these** - EU (GDPR) and US (CCPA/state laws) requirements

### 1.5.1 Privacy Policy Page
- [ ] Create `/privacy` route with Privacy Policy content
- [ ] Include: data collected, legal basis, third-party sharing, retention, user rights
- [ ] List subprocessors: Supabase (DB/auth), Stripe (payments), OpenAI (AI), Vercel (hosting)
- [ ] Link from footer, sign-up flow, settings

**Files to create:**
- `src/app/(legal)/privacy/page.tsx`

**Effort:** 2-3 hours | **Risk:** Low (content can use template + customize)

---

### 1.5.2 Terms of Service Page
- [ ] Create `/terms` route with Terms of Service content
- [ ] Include: acceptable use, liability limits, subscription terms, termination
- [ ] Link from footer, sign-up flow

**Files to create:**
- `src/app/(legal)/terms/page.tsx`

**Effort:** 2-3 hours | **Risk:** Low

---

### 1.5.3 Cookie Consent Banner
- [ ] Add cookie consent banner component (GDPR requires opt-in)
- [ ] Implement pre-consent blocking (no analytics until consent)
- [ ] Equal prominence for "Accept All" and "Reject All" buttons
- [ ] Granular category toggles (essential, analytics, marketing)
- [ ] Persist consent in localStorage, respect on subsequent visits
- [ ] Consider: Termly, CookieYes, or custom implementation

**Files to create:**
- `src/components/common/cookie-consent-banner.tsx`
- `src/hooks/use-cookie-consent.ts`

**Effort:** 3-4 hours | **Risk:** Medium (EU specific, must block scripts pre-consent)

---

### 1.5.4 Account Deletion Flow (GDPR Art. 17)
- [ ] Add "Delete Account" button in settings panel
- [ ] Confirmation modal with warning about data loss
- [ ] API route to delete: user profile, maps, nodes, edges, comments, subscriptions
- [ ] Cancel active Stripe subscription before deletion
- [ ] Send confirmation email after deletion
- [ ] 30-day grace period option (soft delete) vs immediate (hard delete)

**Files to create:**
- `src/app/api/user/delete/route.ts`
- `src/components/settings/delete-account-modal.tsx`

**Files to modify:**
- `src/components/dashboard/settings-panel.tsx`

**Effort:** 4-5 hours | **Risk:** Medium (must handle Stripe, cascade deletes)

---

### 1.5.5 Subprocessor List (Transparency)
- [ ] Create `/subprocessors` or section in Privacy Policy
- [ ] List all third parties processing user data:
  - Supabase (PostgreSQL, Auth, Realtime) - US
  - Stripe (Payments) - US
  - OpenAI (AI features) - US
  - Vercel (Hosting, Edge) - US
  - Resend (Email) - US (if added)
- [ ] Include: company name, purpose, location, DPA status

**Files to create:**
- `src/app/(legal)/subprocessors/page.tsx` (or add to privacy policy)

**Effort:** 1 hour | **Risk:** Low

---

### 1.5.6 DPA Template (B2B Requirement)
- [ ] Create downloadable DPA document for business customers
- [ ] Include GDPR Article 28 required clauses
- [ ] Add Standard Contractual Clauses (SCCs) for international transfers
- [ ] Host as PDF or dedicated page

**Files to create:**
- `public/legal/dpa.pdf` or `src/app/(legal)/dpa/page.tsx`

**Effort:** 2-3 hours | **Risk:** Low (template-based, legal review recommended)

**Status:** ❌ NOT STARTED

---

### Legal Compliance Summary

| Requirement | EU Law | US Law | Priority |
|-------------|--------|--------|----------|
| Privacy Policy | GDPR Art. 13-14 | CCPA, state laws | 🔴 BLOCKER |
| Terms of Service | Contract law | Contract law | 🔴 BLOCKER |
| Cookie Consent | GDPR/ePrivacy | Varies | 🔴 BLOCKER (EU) |
| Account Deletion | GDPR Art. 17 | CCPA | 🔴 BLOCKER |
| Data Export | GDPR Art. 20 | CCPA | 🔴 BLOCKER (see 2.1) |
| Subprocessor List | GDPR Art. 28 | Best practice | 🟡 HIGH |
| DPA Template | GDPR Art. 28 | B2B contracts | 🟡 HIGH (B2B) |

**Total Legal Effort:** 14-19 hours

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
- [x] Create new landing page structure
- [x] Hero section with "Try Free" CTA
- [x] Problem → Solution section
- [x] Features/Benefits (3 blocks with screenshot placeholders)
- [x] How it works (3 steps)
- [x] Pricing (Free vs Pro comparison with billing toggle)
- [x] FAQ section (5 questions with accordion)
- [x] Final CTA section
- [x] Minimal footer (reused existing)
- [x] Mobile-first responsive design
- [ ] Logo strip / Testimonials (deferred - no assets yet)
- [ ] <3s load time optimization (needs production testing)
- [ ] WCAG 2.1 AA accessibility (basic support done, full audit pending)
- [ ] Replace screenshot placeholders with actual images

**Files created:**
- `src/components/landing/hero-section.tsx`
- `src/components/landing/problem-solution.tsx`
- `src/components/landing/features-section.tsx`
- `src/components/landing/how-it-works.tsx`
- `src/components/landing/pricing-section.tsx`
- `src/components/landing/faq-section.tsx`
- `src/components/landing/final-cta.tsx`
- `src/components/landing/index.ts` (barrel export)
- `src/app/(landing)/page.tsx` (rebuilt)
- `src/constants/pricing-tiers.ts` (updated: Free 0 AI/3 collabs, Pro 100 AI/month)

**Status:** ✅ MOSTLY COMPLETE (screenshots + social proof deferred)

---

### 4.1.1 Collaboration Limits (NEW)
- [ ] Enforce `collaboratorsPerMap` limit in share/join-room API
- [ ] Show limit warning in share panel UI when approaching limit
- [ ] Test with 3 collaborators (Free) vs unlimited (Pro)

**Effort:** 2-3 hours | **Risk:** Low

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
| Cookie consent | GDPR opt-in required; equal Accept/Reject prominence |
| Account deletion | Hard delete with Stripe cancellation |
| Legal pages | `/privacy`, `/terms` routes in `(legal)` group |
| DPA | PDF template for B2B customers |

---

## Recommended Work Order

1. **Quick wins first** (Undo/Redo, AI flag, privacy) - builds momentum ✅ DONE
2. **🚨 Legal compliance** (Privacy Policy, Terms, Cookie Consent, Account Deletion) - **LAUNCH BLOCKER**
3. **Critical fixes** (profile, upgrade, limits) - trust-critical
4. **GDPR** (export, emails) - legal requirement
5. **Landing page + anon mode** - conversion funnel
6. **Video node** - new feature
7. **Polish** - nice-to-haves

---

## Files Quick Reference

**Legal Compliance (NEW):**
- New: `src/app/(legal)/privacy/page.tsx`
- New: `src/app/(legal)/terms/page.tsx`
- New: `src/app/(legal)/subprocessors/page.tsx`
- New: `src/components/common/cookie-consent-banner.tsx`
- New: `src/hooks/use-cookie-consent.ts`
- New: `src/app/api/user/delete/route.ts`
- New: `src/components/settings/delete-account-modal.tsx`
- New: `public/legal/dpa.pdf`

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
