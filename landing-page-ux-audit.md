# Landing Page UX Audit - Remaining Recommendations

> Generated: 2026-01-13
> Status: Critical issues fixed, medium/low priority items remain

---

## Completed Fixes

- [x] **Broken CTAs** - All links now work (`/dashboard`, `/auth/sign-up?plan=pro`)
- [x] **CTA text** - "Start Mapping", "Get Started", "Go Pro"
- [x] **Feature screenshots** - Real product images replace placeholders

---

## High Priority

### 1. Mobile Navigation Menu Missing

**Location:** `src/components/landing/landing-nav.tsx:62-74`

**Issue:** Desktop nav links (Features, Pricing, FAQ) hidden on mobile (`hidden sm:flex`) with no hamburger menu alternative.

**Impact:** 62.5% of traffic is mobile - users can't navigate to sections.

**Fix:** Add hamburger menu with slide-out drawer containing:
- Features link
- Pricing link
- FAQ link
- "Start Mapping" CTA

---

### 2. Zero Trust Signals / Social Proof

**Issue:** No testimonials, user count, logos, ratings, or press mentions.

**Impact:** Testimonials on 36% of top pages; social proof boosts conversions 15-30%.

**Fix options:**
- Add 2-3 testimonials with names/photos below features or before pricing
- Add user/waitlist count ("Join 10,000+ users")
- Add "Trusted by teams at..." logo bar
- Add star rating or review badge

**Suggested location:** New section between "How It Works" and "Pricing"

---

### 3. No Product Demo or Video

**Issue:** No interactive demo, video walkthrough, or animated preview.

**Impact:** Interactive content can boost conversions up to 80%.

**Fix options:**
- 30-60s product demo video in hero section
- Animated GIF showing key workflow
- Interactive playground/sandbox
- Loom-style walkthrough embed

---

## Medium Priority

### 4. Problem/Solution Section Too Sparse

**Location:** `src/components/landing/problem-solution.tsx`

**Issue:** Single statement without elaboration or emotional hook.

**Current:** "Mind mapping tools are either too simple or too bloated"

**Fix:** Expand with:
- Specific pain points ("You've tried Miro, but it's overwhelming...")
- Before/after comparison
- Emotional connection ("We built this for ourselves first")

---

### 5. Footer Missing Essential Links

**Location:** `src/components/landing/final-cta.tsx:46-69`

**Missing:**
- Terms of Service
- Privacy Policy
- Contact information
- Social media links (Twitter/X, LinkedIn, GitHub)

**Fix:** Add footer row with legal and social links.

---

### 6. FAQ Has No Contact Option

**Location:** `src/components/landing/faq-section.tsx`

**Issue:** No way to get help if question isn't answered.

**Fix:** Add below FAQ accordion:
```
Still have questions? Email us at support@moistus.ai
```
Or add live chat widget.

---

### 7. Pro Trial Duration Not Specified

**Location:** `src/constants/pricing-tiers.ts`

**Issue:** "Go Pro" doesn't clarify trial length.

**Fix options:**
- Change to "Start 14-day Trial"
- Add small text under button: "14-day free trial, cancel anytime"

---

## Low Priority / Polish

### 8. Hero Glass Panels Empty

**Location:** `src/components/landing/hero-background.tsx`

**Issue:** Decorative panels serve no functional purpose.

**Fix:** Either remove or use for mini-screenshots/icons.

---

### 9. Section Dots Navigation

**Issue:** Right-side dot navigation not intuitive for most users.

**Fix:** Consider removing or making more prominent with labels on hover.

---

### 10. Annual Savings Could Be More Prominent

**Location:** `src/components/landing/pricing-section.tsx`

**Issue:** "Save 17%" is subtle green text.

**Fix:** Add strikethrough on monthly price when yearly selected, or badge.

---

### 11. First Screenshot Has Browser Chrome

**Location:** `public/images/landing/connection-suggestions.png`

**Issue:** Shows macOS browser chrome and dock.

**Fix:** Crop to show just the product UI for cleaner look.

---

## Research Sources

- [2026 Landing Page Statistics - Hostinger](https://www.hostinger.com/tutorials/landing-page-statistics)
- [Landing Page Best Practices 2026 - involve.me](https://www.involve.me/blog/landing-page-best-practices)
- [Landing Page Trends 2026 - involve.me](https://www.involve.me/blog/landing-page-trends)

---

## Key Stats to Remember

| Metric | Value |
|--------|-------|
| Average conversion rate | 6.6% |
| Mobile traffic share | 62.5% |
| Users who only read headline | 80% |
| Abandonment if >3s load | 53% |
| Conversion lift from custom CTAs | 42% |
| Conversion lift from removing nav | 16-28% |
| Top pages with testimonials | 36% |
