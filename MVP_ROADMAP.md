# Shiko - MVP Launch Roadmap

> Last updated: 2026-01-23 (Added Cookie Notice Banner)
> Estimated effort: 50-70 hours

## Summary

MVP launch readiness checklist:
1. **Critical fixes:** Profile persistence, upgrade flow, feature limits, undo/redo
2. **🚨 Legal compliance:** Privacy Policy, Terms of Service, Cookie Consent, Account Deletion
3. **GDPR compliance:** Data export (required), privacy settings
4. **Billing:** ~~Resend email notifications~~ → Polar.sh handles this ✅
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
- [x] Wire client to `/api/user/billing/usage` for server-authoritative usage data
- [x] Implement `getRemainingLimit()` with actual usage calculation
- [x] Make `showUpgradePrompt()` open the upgrade modal
- [x] Add usage display in AI Chat (AIUsageIndicator component)
- [x] Add server-side node limit check (`/api/nodes/check-limit`)
- [x] Refresh usage on init, window focus, and after operations

**Files modified:**
- `src/store/slices/subscription-slice.ts` (UsageData, fetchUsageData, getRemainingLimit)
- `src/hooks/subscription/use-feature-gate.ts` (real usage data, useUsageRefresh)
- `src/components/providers/client-providers.tsx` (init + focus refetch)
- `src/store/slices/nodes-slice.ts` (server-side limit check)
- `src/store/slices/chat-slice.ts` (post-AI refresh)

**Files created:**
- `src/app/api/nodes/check-limit/route.ts`

**Status:** ✅ COMPLETED

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
- [x] Create `/privacy` route with Privacy Policy content
- [x] Include: data collected, legal basis, third-party sharing, retention, user rights
- [x] List subprocessors: Supabase (DB/auth), Polar (payments), OpenAI (AI), Vercel (hosting)
- [x] Link from footer, sign-up flow, settings

**Files created:**
- `src/app/(legal)/layout.tsx`
- `src/app/(legal)/privacy/page.tsx`
- `src/components/legal/back-to-top-link.tsx`

**Status:** ✅ COMPLETED

---

### 1.5.2 Terms of Service Page
- [x] Create `/terms` route with Terms of Service content
- [x] Include: acceptable use, liability limits, subscription terms, termination
- [x] Link from footer, sign-up flow

**Files created:**
- `src/app/(legal)/terms/page.tsx`

**Status:** ✅ COMPLETED

---

### 1.5.3 Cookie Notice Banner
- [x] Add cookie notice banner component (informational, not consent)
- [x] N/A - No analytics to block (only essential cookies used)
- [x] N/A - No Accept/Reject needed (essential-only doesn't require consent under GDPR Art. 6(1)(b))
- [x] N/A - No category toggles needed (all cookies are essential)
- [x] Persist acknowledgement in localStorage
- [x] Custom implementation following existing anonymous-user-banner pattern

**Decision:** Implemented as **informational notice** (not consent banner) because Shiko uses essential cookies only (Supabase auth, Polar payments, OAuth). GDPR doesn't require opt-in for essential cookies.

**Files created:**
- `src/components/legal/cookie-notice-banner.tsx`

**Files modified:**
- `src/components/providers/client-providers.tsx`

**Status:** ✅ COMPLETED

---

### 1.5.4 Account Deletion Flow (GDPR Art. 17)
- [x] Add "Delete Account" button in settings panel
- [x] Confirmation modal with warning about data loss
- [x] API route to delete: user profile, maps, nodes, edges, comments, subscriptions
- [x] Cancel active Polar subscription before deletion (immediate revoke)
- [x] Send confirmation email after deletion (via Resend)
- [x] Hard delete (immediate) - no grace period for MVP simplicity

**Decision:** Implemented hard delete (immediate) for MVP. Soft delete can be added later if needed.

**Files created:**
- `src/app/api/user/delete/route.ts`
- `src/components/account/delete-account-dialog.tsx`
- `src/lib/email.ts`

**Files modified:**
- `src/components/dashboard/settings-panel.tsx`
- `src/store/slices/user-profile-slice.ts` (sync email to profile)
- `src/types/user-profile-types.ts` (added email field)

**Status:** ✅ COMPLETED

---

### 1.5.5 Subprocessor List (Transparency)
- [x] Create `/subprocessors` dedicated page
- [x] List all third parties processing user data:
  - Supabase (PostgreSQL, Auth, Realtime) - EU
  - Polar.sh (Payments) - US
  - OpenAI (AI features) - US
  - Vercel (Hosting, Edge) - US
  - Resend (Email) - US
  - Google OAuth - US
  - GitHub OAuth - US
- [x] Include: company name, purpose, location, DPA status, privacy policy links

**Files created:**
- `src/app/(legal)/subprocessors/page.tsx`

**Files modified:**
- `src/app/(legal)/layout.tsx` (added footer link)

**Status:** ✅ COMPLETED

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
| Privacy Policy | GDPR Art. 13-14 | CCPA, state laws | ✅ DONE |
| Terms of Service | Contract law | Contract law | ✅ DONE |
| Cookie Notice | GDPR/ePrivacy | Varies | ✅ DONE (essential-only) |
| Account Deletion | GDPR Art. 17 | CCPA | ✅ DONE |
| Data Export | GDPR Art. 20 | CCPA | 🔴 BLOCKER (see 2.1) |
| Subprocessor List | GDPR Art. 28 | Best practice | ✅ DONE |
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

### 2.2 ~~Billing Emails via Resend~~ → Handled by Polar.sh
- [x] Trial ending notifications
- [x] Payment failed notifications
- [x] Subscription canceled notifications
- [x] Welcome email

**Decision:** Polar.sh handles all billing-related email notifications automatically.

**Status:** ✅ COMPLETED (via Polar.sh)

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
- [x] Replace screenshot placeholders with actual images

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

**Status:** ✅ MOSTLY COMPLETE (social proof deferred)

---

### 4.1.1 Collaboration Limits
- [x] Enforce `collaboratorsPerMap` limit in share/join-room API
- [x] Show limit warning in share panel UI when approaching limit
- [x] Test with 3 collaborators (Free) vs unlimited (Pro)

**Status:** ✅ COMPLETED

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

## Phase 5: Database Security (Defense-in-Depth)

> Future implementation - API enforcement is primary, DB triggers are backup protection

### 5.1 PostgreSQL Limit Triggers

**Purpose:** Prevent bypassed API requests from violating limits at DB layer.

**Mind Maps Trigger:**
```sql
CREATE FUNCTION check_mind_map_limit() RETURNS TRIGGER AS $$
DECLARE cnt INT; lim INT;
BEGIN
  SELECT COUNT(*) INTO cnt FROM mind_maps WHERE user_id = NEW.user_id;
  SELECT COALESCE(
    (SELECT (p.limits->>'mindMaps')::int FROM user_subscriptions s
     JOIN subscription_plans p ON s.plan_id = p.id
     WHERE s.user_id = NEW.user_id AND s.status IN ('active','trialing')),
    3 -- free tier default
  ) INTO lim;
  IF lim != -1 AND cnt >= lim THEN
    RAISE EXCEPTION 'Mind map limit reached';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_mind_map_limit BEFORE INSERT ON mind_maps
FOR EACH ROW EXECUTE FUNCTION check_mind_map_limit();
```

**Nodes Trigger:**
```sql
CREATE FUNCTION check_node_limit() RETURNS TRIGGER AS $$
DECLARE cnt INT; lim INT; owner_id UUID;
BEGIN
  SELECT user_id INTO owner_id FROM mind_maps WHERE id = NEW.map_id;
  SELECT COUNT(*) INTO cnt FROM nodes WHERE map_id = NEW.map_id;
  SELECT COALESCE(
    (SELECT (p.limits->>'nodesPerMap')::int FROM user_subscriptions s
     JOIN subscription_plans p ON s.plan_id = p.id
     WHERE s.user_id = owner_id AND s.status IN ('active','trialing')),
    50 -- free tier default
  ) INTO lim;
  IF lim != -1 AND cnt >= lim THEN
    RAISE EXCEPTION 'Node limit reached';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_node_limit BEFORE INSERT ON nodes
FOR EACH ROW EXECUTE FUNCTION check_node_limit();
```

**Files to create:**
- `supabase/migrations/YYYYMMDD_limit_enforcement_triggers.sql`

**Effort:** 2-3 hours | **Risk:** Low (API already enforces, this is backup)

**Status:** 📋 PLANNED (Phase 2 - after MVP launch)

---

## Phase 6: Polish

### 6.1 Mobile Responsiveness
- [ ] Audit hover states on touch devices
- [ ] Add `@media (hover: hover)` wrapper to hover transitions
- [ ] Test canvas interaction on mobile (pinch zoom, pan)
- [ ] Ensure node editing works on mobile keyboards
- [ ] Verify touch targets meet accessibility guidelines (48px min)

**Effort:** 2-4 hours | **Risk:** Low

---

### 6.2 UX Polish (If Time)
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
| Billing emails | Polar.sh (automatic) |
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
2. **Feature limits** (usage tracking, limit enforcement) ✅ DONE
3. **🚨 Legal compliance** (Privacy Policy, Terms, Cookie Consent, Account Deletion) - **LAUNCH BLOCKER**
4. **Critical fixes** (profile ✅, upgrade ✅, remaining limit triggers)
5. **GDPR** (export, emails) - legal requirement
6. **Landing page + anon mode** - conversion funnel
7. **Video node** - new feature
8. **Polish** - nice-to-haves

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

**GDPR:**
- `src/app/api/user/export/route.ts`
- `src/app/api/user/[userId]/public-profile/route.ts`

**New features:**
- New: `src/components/nodes/video-node.tsx`
- New: `src/components/nodes/content/video-content.tsx`
- `src/registry/node-registry.ts`

**Landing & Anonymous:**
- `src/app/(landing)/page.tsx`
- New: `src/components/landing/*.tsx`
- New: `src/store/slices/local-storage-slice.ts`
- New: `src/components/mind-map/anon-save-banner.tsx`
