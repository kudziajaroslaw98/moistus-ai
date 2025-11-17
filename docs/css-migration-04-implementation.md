# CSS Migration: Phased Implementation Plan & Unresolved Questions

**Document:** CSS Migration Phase 4
**Purpose:** Define step-by-step implementation strategy and surface blockers
**Status:** Ready for execution
**Estimated Duration:** 5–9 hours total migration time

---

## Table of Contents

1. [Phased Implementation Plan](#phased-implementation-plan)
2. [Unresolved Questions](#unresolved-questions)
3. [Success Criteria](#success-criteria)

---

## Phased Implementation Plan

### Phase 1: Critical Fixes (Breaks Functionality) ⚠️

**Priority:** IMMEDIATE
**Rationale:** These break rendering/functionality and must be resolved first

#### Task 1.1: Fix code-node.tsx (15 instances)

**File:** `src/components/nodes/code-node.tsx`

**Issue:** Inline `var(--color-*)` references that don't exist in new semantic token system

**Changes Required:**
- Replace `var(--color-text-high)` → `var(--color-text-primary)`
- Replace `var(--color-text-medium)` → `var(--color-text-secondary)`
- Replace `var(--color-bg-raised)` → `var(--color-bg-elevated)`
- Replace `var(--color-border-default)` → `var(--color-border-default)` (verify exists)
- Replace `var(--color-status-complete)` → Use appropriate token mapping (see Question 3)
- Replace `var(--color-status-default)` → `var(--color-text-secondary)`
- Replace `var(--color-status-error)` → Determine proper error token mapping

**Testing Checklist:**
- [ ] Code blocks render without console errors
- [ ] Syntax highlighting colors are visible
- [ ] Line numbers display correctly
- [ ] Copy button is accessible
- [ ] Dark/light mode switching works

**Effort:** 20-30 minutes
**Risk Level:** HIGH (console errors, visual breaks)

---

#### Task 1.2: Fix text-node.tsx (1 typo)

**File:** `src/components/nodes/text-node.tsx`

**Issue:** Typo in CSS variable reference

**Changes Required:**
- Replace `--text-text-high` → `--color-text-primary` (typo: missing "color-" prefix)

**Testing Checklist:**
- [ ] Text nodes display with correct primary text color
- [ ] No console CSS errors
- [ ] Text is readable in both light and dark modes

**Effort:** 5 minutes
**Risk Level:** HIGH (text may not display correctly)

---

#### Task 1.3: Fix comment-reactions.tsx

**File:** `src/components/nodes/components/comment-reactions.tsx`

**Issue:** Inline style uses deprecated elevation token

**Changes Required:**
- Replace inline `style={{ background: "var(--color-elevation-1)" }}`
- Map to: `var(--color-bg-surface)` (or use Tailwind class instead)

**Testing Checklist:**
- [ ] Reaction bubbles have correct background
- [ ] Hover states work
- [ ] Emoji render clearly against background

**Effort:** 5 minutes
**Risk Level:** HIGH (visual breaks)

---

**Phase 1 Summary:**
- **Total Effort:** 30–60 minutes
- **Files Changed:** 3
- **Risk Assessment:** HIGH - these are blocking issues

---

### Phase 2: Tailwind Class Updates (Visual Issues) 🎨

**Priority:** HIGH
**Rationale:** Causes visual inconsistencies, incorrect hierarchy

#### Task 2.1: Update Text Color Classes (~50 occurrences across 15 files)

**Changes Required:**

| Old Class | New Class | Context |
|-----------|-----------|---------|
| `text-text-high` | `text-text-primary` | Primary/main text |
| `text-text-medium` | `text-text-secondary` | Secondary/subtext |
| `text-text-low` | `text-text-tertiary` | Tertiary/disabled-looking text |
| `text-text-disabled` | `text-text-disabled` | Verify exists in new system |

**Affected Files:** All node components, UI components, context menu, dashboard, sharing, onboarding

**Search Pattern:** `text-text-` in entire codebase

**Testing Checklist:**
- [ ] All text hierarchy levels are visually distinct
- [ ] Disabled text is clearly different from tertiary
- [ ] Contrast ratios meet WCAG AA (4.5:1 for small text)
- [ ] Text is readable in both light/dark modes

**Effort:** 1–2 hours
**Risk Level:** MEDIUM (visual inconsistencies)

---

#### Task 2.2: Update Elevation/Background Classes (~35 occurrences across 12 files)

**Changes Required:**

| Old Class | New Class | Purpose |
|-----------|-----------|---------|
| `bg-elevation-0` | `bg-bg-base` | Base background (default) |
| `bg-elevation-1` | `bg-bg-surface` | Raised surface (cards, inputs) |
| `bg-elevation-2` / `bg-elevation-4` | `bg-bg-elevated` | Elevated content (popovers, tooltips) |
| `bg-elevation-16` / `bg-elevation-24` | `bg-bg-overlay` | Modal overlays, dialogs |

**Affected Files:**
- `src/components/ui/` (card, popover, dialog, dropdown, sheet, etc.)
- `src/components/nodes/` (all node types)
- `src/components/realtime/` (avatar stack, connection status)
- `src/components/context-menu/`

**Search Pattern:** `bg-elevation-` in entire codebase

**Testing Checklist:**
- [ ] Base backgrounds appear on main canvas
- [ ] Surface elements (cards) have visible elevation
- [ ] Overlays (modals) appear above all content
- [ ] Nested elevation hierarchy works (surface > base, overlay > surface)
- [ ] Shadows/blur effects look appropriate

**Effort:** 1.5–2 hours
**Risk Level:** MEDIUM (visual hierarchy breaks)

---

#### Task 2.3: Update Border Classes (~8 occurrences)

**Changes Required:**

| Old Class | New Class | Purpose |
|-----------|-----------|---------|
| `border-border-hover` | `border-border-strong` | Strong/visible borders |
| `border-border-default` | `border-border-default` | Verify this exists |

**Affected Files:**
- `src/components/nodes/code-node.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/textarea.tsx`
- Various other UI components

**Search Pattern:** `border-border-` in entire codebase

**Testing Checklist:**
- [ ] Borders are visible with proper weight
- [ ] Focus states show clear border highlight
- [ ] Hover states show subtle border change
- [ ] Contrast ratios meet WCAG AA

**Effort:** 30–45 minutes
**Risk Level:** MEDIUM (subtle but noticeable)

---

#### Task 2.4: Update Status Color Classes (~5 occurrences)

**Changes Required:**

| Old Class | New Class | Purpose |
|-----------|-----------|---------|
| `text-status-complete` | `text-success-500` | Task completion, success state |
| `text-status-default` | `text-text-secondary` | Default/inactive status |
| `text-status-error` | `text-error-500` | Error state |

**Affected Files:**
- `src/components/nodes/code-node.tsx`
- `src/components/context-menu/context-menu-item.tsx`

**Testing Checklist:**
- [ ] Success states appear in green
- [ ] Error states appear in red
- [ ] Default states match secondary text color
- [ ] Color blind users can distinguish via icons/text

**Effort:** 30 minutes
**Risk Level:** LOW (cosmetic, but meaningful)

---

**Phase 2 Summary:**
- **Total Effort:** 2–4 hours
- **Files Changed:** ~20–25
- **Risk Assessment:** MEDIUM - visual consistency issues

---

### Phase 3: Component-Specific Colors 🔧

**Priority:** MEDIUM
**Rationale:** Affects interactive element branding and theming

#### Task 3.1: Replace app-primary References (~15 occurrences across 5 files)

**Changes Required:**

| Old Class/Var | New Class/Var | Purpose |
|---------------|---------------|---------|
| `bg-app-primary` | `bg-primary-500` or `bg-interactive-primary` | Primary action backgrounds |
| `border-app-primary` | `border-primary-500` | Primary borders |
| `border-app-primary-muted` | `border-primary-300` or `border-primary-500/30` | Muted primary borders |
| `accent-app-primary` | `accent-primary-500` | Accent color for native inputs |
| `focus:border-app-primary/60` | `focus:border-primary-500/60` | Focus state with opacity |

**Affected Files:**
- `src/components/ui/input.tsx` (focus, border)
- `src/components/ui/textarea.tsx` (focus, border)
- `src/components/ui/checkbox.tsx` (accent)
- `src/components/ui/tag-input.tsx` (border, focus)
- `src/components/nodes/components/toolbar.tsx` (button backgrounds)

**Search Pattern:** `app-primary` in entire codebase

**Approach:**
1. Check if `primary-500` token exists in new globals.css
2. If not, create semantic token: `--color-interactive-primary: var(--color-primary-500)`
3. Update all references
4. Test focus/hover states

**Testing Checklist:**
- [ ] Primary buttons have correct brand color
- [ ] Focus rings are visible and branded
- [ ] Hover states provide feedback
- [ ] Active/pressed states are distinct
- [ ] Disabled state is visually grayed
- [ ] Native input accents match brand color

**Effort:** 1–1.5 hours
**Risk Level:** LOW (cosmetic, but important for branding)

---

#### Task 3.2: Replace Placeholder Color References (~2 occurrences)

**Changes Required:**

| Old Class | New Class | Purpose |
|-----------|-----------|---------|
| `placeholder-node-text-secondary` | `placeholder-text-secondary` or `placeholder-neutral-400` | Input placeholder text |

**Affected Files:**
- `src/components/ui/input.tsx`
- `src/components/ui/textarea.tsx`

**Testing Checklist:**
- [ ] Placeholder text is visible but subtle
- [ ] Contrast is readable
- [ ] Disappears when user types

**Effort:** 15 minutes
**Risk Level:** LOW (cosmetic)

---

**Phase 3 Summary:**
- **Total Effort:** 1–2 hours
- **Files Changed:** 5–7
- **Risk Assessment:** LOW - mostly cosmetic

---

### Phase 4: Testing & Validation ✅

**Priority:** REQUIRED before deployment
**Rationale:** Prevent regressions and ensure accessibility

#### Task 4.1: Visual Regression Testing

**Render All Node Types:**
- [ ] defaultNode (Note) - text color, background, border
- [ ] taskNode - checkbox color, text hierarchy, border
- [ ] codeNode - syntax highlighting, line numbers, copy button
- [ ] questionNode - icon color, text, background
- [ ] textNode - text color, background
- [ ] annotationNode - border, highlight color
- [ ] resourceNode - icon, text, link color
- [ ] imageNode - border, caption text
- [ ] commentNode - bubble background, reaction colors
- [ ] groupNode - header color, member list text

**Test Scenarios:**
- [ ] Default state
- [ ] Hovered state
- [ ] Selected state
- [ ] Focused state (keyboard)
- [ ] Disabled state (if applicable)

**Tools:** Visual inspection in browser (light/dark modes)

**Effort:** 45 minutes
**Risk Level:** N/A (verification only)

---

#### Task 4.2: UI Component Testing

**Test All Elevation Levels:**
- [ ] Card component (bg-surface) - check shadow, border
- [ ] Popover (bg-elevated) - check layering, shadow
- [ ] Dialog/Modal (bg-overlay) - check positioning, backdrop
- [ ] Dropdown (bg-elevated) - check positioning, items

**Test All Interactive States:**
- [ ] Hover: color change, opacity shift, cursor feedback
- [ ] Focus: ring visible, color distinct, keyboard accessible
- [ ] Active/Pressed: visual feedback provided
- [ ] Disabled: visually grayed, cursor not-allowed

**Test Text Hierarchy:**
- [ ] Primary text: strong, readable
- [ ] Secondary text: subtle but readable
- [ ] Tertiary text: least prominent
- [ ] Disabled text: clearly disabled

**Test Status Colors:**
- [ ] Success (green): checkmarks, completed tasks
- [ ] Error (red): validation errors, failed states
- [ ] Warning (amber): warnings, cautions
- [ ] Info (blue): informational messages

**Tools:** Manual testing in Chrome/Firefox, both light/dark modes

**Effort:** 45 minutes
**Risk Level:** N/A (verification only)

---

#### Task 4.3: Accessibility Testing

**WCAG AA Compliance Checklist:**
- [ ] **Contrast Ratios** (4.5:1 for small text, 3:1 for large)
  - Check: primary vs background
  - Check: secondary vs background
  - Check: tertiary vs background (may need adjustment)
  - Check: success/error vs background

- [ ] **Focus Indicators**
  - [ ] Visible on all interactive elements
  - [ ] Has sufficient contrast against background
  - [ ] 3px minimum width/thickness
  - [ ] Clear outline shape

- [ ] **Color Not Only Indicator**
  - [ ] Disabled state uses pattern/opacity, not just color
  - [ ] Status indicated via icon + color
  - [ ] Links have underline or other visual distinction

- [ ] **Motion**
  - [ ] Respects `prefers-reduced-motion`
  - [ ] Animations < 3 seconds
  - [ ] No flashing (< 3 per second)

**Tools:**
- Chrome DevTools (Lighthouse accessibility)
- WebAIM Contrast Checker
- NVDA screen reader (Windows)
- Keyboard navigation testing (Tab, Shift+Tab, Enter, Space, Arrow keys)

**Effort:** 45 minutes
**Risk Level:** N/A (verification only)

---

#### Task 4.4: Build Verification

**TypeScript Check:**
```bash
pnpm type-check
```
- [ ] No type errors
- [ ] All CSS variable types match

**Production Build:**
```bash
pnpm build
```
- [ ] Build succeeds without errors
- [ ] No warnings about missing CSS variables
- [ ] Output size is reasonable

**Console Check:**
- [ ] No CSS variable resolution errors
- [ ] No console errors/warnings
- [ ] Network tab shows all resources loaded

**Local Testing:**
```bash
# Start local dev (for verification only)
pnpm dev
```
- [ ] Navigate to several maps
- [ ] Create/edit nodes in different types
- [ ] Test collaborative features
- [ ] Test in both light/dark modes
- [ ] Test on mobile viewport (responsive)

**Effort:** 30 minutes
**Risk Level:** N/A (verification only)

---

**Phase 4 Summary:**
- **Total Effort:** 2–3 hours
- **Execution Type:** Verification (no code changes)
- **Blockers:** None (all previous phases complete)

---

## Total Migration Timeline

| Phase | Description | Duration | Risk | Status |
|-------|-------------|----------|------|--------|
| **1** | Critical fixes (3 files) | 0.5–1 hour | HIGH | Blocking |
| **2** | Tailwind updates (20+ files) | 2–4 hours | MEDIUM | Blocking |
| **3** | Component-specific colors (5+ files) | 1–2 hours | LOW | Blocking |
| **4** | Testing & validation | 2–3 hours | N/A | Required |
| **TOTAL** | **Complete migration** | **5–9 hours** | **MEDIUM** | **Ready** |

---

## Execution Checklist

### Pre-Migration
- [ ] Backup current branch or create new branch: `css-migration-implementation`
- [ ] Review all "Unresolved Questions" before starting Phase 1
- [ ] Prepare browser with DevTools open (Lighthouse, Performance, Network tabs)
- [ ] Have color contrast checker tool available

### During Migration
- [ ] Work through phases in order (1 → 2 → 3)
- [ ] Test after each task, not just at the end
- [ ] Document any unexpected issues/colors
- [ ] Take screenshots before/after for visual regression comparison

### Post-Migration
- [ ] Complete Phase 4 testing thoroughly
- [ ] Run full test suite (if available): `pnpm test`
- [ ] Merge to main branch after approval
- [ ] Monitor for color-related bugs in production

---

## Unresolved Questions

### 1. Tailwind Configuration Auto-Registration

**Question:** Do the new semantic tokens need to be explicitly added to `tailwind.config.ts`, or does Tailwind v4 auto-register CSS variables?

**Context:**
The new semantic token system defines CSS variables like `--color-text-primary`, `--color-bg-surface`, etc. in `globals.css`. For Tailwind classes like `text-text-primary` and `bg-bg-surface` to work, these tokens need to be available to Tailwind's JIT compiler.

**Options:**

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| **A (Recommended)** | Rely on Tailwind v4's `@theme` directive auto-registration | Cleaner config, CSS variables handled automatically | Requires Tailwind v4+, may have edge cases |
| **B** | Manually add to `tailwind.config.ts` via `extend.colors` | Explicit, works with older Tailwind versions | More maintenance, duplication with globals.css |
| **C** | Use arbitrary values: `text-[var(--color-text-primary)]` | Works everywhere, no config needed | Verbose, loses IDE autocomplete |

**Verification Steps:**
1. After Phase 2 updates, check if Tailwind classes are recognized (IDE autocomplete)
2. Run `pnpm build` and check for warnings
3. In browser DevTools, verify computed styles use CSS variables
4. If fails: implement Option B (manual config)

**Action Needed:** Document findings in PR comments

---

### 2. Elevation Granularity: Is 4 Levels Enough?

**Question:** The new system defines 4 elevation levels (base, surface, elevated, overlay). Is this sufficient, or should we create intermediate tokens?

**Context:**
- **Old System:** 25 levels (0–24) with fine-grained control
- **New System:** 4 semantic levels
  - `--color-bg-base`: Main canvas background
  - `--color-bg-surface`: Cards, inputs, raised content
  - `--color-bg-elevated`: Popovers, tooltips, small overlays
  - `--color-bg-overlay`: Modals, large dialogs, backdrops

Some components used mid-range elevations (4, 8, 12) that don't map cleanly.

**Options:**

| Option | Levels | Pros | Cons | Recommended? |
|--------|--------|------|------|--------------|
| **A (Semantic)** | 4 base levels | Simple, follows Radix/Vercel patterns, easier to maintain | May lack nuance for complex hierarchies | ✅ Yes |
| **B (Intermediate)** | 4 + intermediate: `elevated-high`, `overlay-subtle` | More control without explosion | Extra tokens to maintain | If Phase 4 testing shows gaps |
| **C (Numeric)** | 5–8 scale: `elevation-1` through `elevation-8` | Familiar pattern, plenty of room | Similar to old system, defeats semantic purpose | No |

**Design System Precedent:**
- Radix UI uses 3–4 levels
- Material Design v3 uses semantic (raised, dragged, focused, pressed)
- Vercel's design system uses 4 levels

**Recommendation:** Start with **Option A (4 semantic levels)**. Monitor Phase 4 testing for visual hierarchy issues. If components look flat or overlapping, implement **Option B** (intermediate tokens) by creating:
- `--color-bg-surface-high` (between surface and elevated)
- `--color-bg-elevated-low` (between base and elevated)

**Testing Criteria:**
During Phase 4.1 (Visual Regression), check:
- [ ] Visual hierarchy is clear (base → surface → elevated → overlay)
- [ ] No overlapping Z-index issues
- [ ] Nested components have distinct layers
- [ ] Shadows/blur enhance elevation perception

---

### 3. Status Color Strategy: Direct Scale vs Semantic Layer

**Question:** Should status colors (success, error, warning) use direct scale tokens or have semantic wrappers?

**Context:**

**Current Mapping (Direct Scale):**
```
--color-status-complete → --color-success-500 (direct reference)
--color-status-error → --color-error-500 (direct reference)
```

**Alternative (Semantic Layer):**
```
--color-status-success → --color-success-500 (one level of indirection)
--color-status-error → --color-error-500 (one level of indirection)
```

**Trade-offs:**

| Approach | Flexibility | Maintainability | Theming | Recommendation |
|----------|-------------|-----------------|---------|-----------------|
| **Direct Scale** | Lower (colors hardcoded to scale) | Simpler (fewer tokens) | Harder (change 50 places) | ✅ For now |
| **Semantic Layer** | Higher (wrapper can change) | Moderate (extra tokens) | Easier (change 1 place) | If brand colors evolve |

**Questions to Answer:**
1. Is brand status color palette likely to change? → If yes, use semantic layer
2. Do we need different status colors for light/dark modes? → If yes, use semantic layer
3. Are status colors used in multiple contexts (text, bg, border)? → If yes, use semantic layer

**Current Usage:**
- Status colors mostly for **text** (checkmarks, state labels)
- Rare use in **backgrounds** (success toast, error alert)
- Minimal use in **borders**

**Recommendation:** Use **Direct Scale** approach (`text-success-500`) for now. If branding requirements expand or mode-specific colors needed, create semantic layer later.

---

### 4. text-text-low Token Missing

**Question:** New system has no `--color-text-low` token. Should we map to tertiary or create a new level?

**Context:**
Found usage in `src/components/realtime/collaborator-profile-card.tsx` (8 occurrences):
```tsx
<div className="text-text-low">
  Viewing node 42
</div>
```

**Old Token:** `--color-text-low` was lowest contrast text (almost invisible)
**New System:** Only has primary → secondary → tertiary (+ disabled)

**Options:**

| Option | Token | Contrast | Use Case | Trade-off |
|--------|-------|----------|----------|-----------|
| **A (Tertiary)** | `--color-text-tertiary` | Medium-low | Subtle but readable | May be more visible than old "low" |
| **B (Quaternary)** | `--color-text-quaternary` (new) | Between tertiary & disabled | Fine-grained control | Extra token maintenance |
| **C (Disabled)** | `--color-text-disabled` | Lowest | Intentionally disabled-looking | May look broken/inaccessible |
| **D (Neutral)** | `--color-neutral-500` | Medium | Direct scale, no semantic | Bypasses semantic system |

**Contrast Requirements (WCAG AA):**
- Readable body text: 4.5:1 ratio
- "Low contrast" decorative text: 3:1 ratio
- Disabled/placeholder: No minimum (not informational)

**Usage Pattern:** Collaborator profile "Viewing node 42" is:
- Decorative (not critical information)
- Needs to be subtle (not distract from content)
- Should be readable but not prominent

**Recommendation:** Use **Option A (map to tertiary)**. Reasoning:
1. New system emphasizes 3-level hierarchy (primary, secondary, tertiary)
2. "Viewing" indicator is secondary UI, deserves tertiary prominence
3. Meets WCAG AA contrast (3:1) for non-critical text
4. Consistent with modern design system practices

**Validation:** During Phase 4.3 (accessibility testing), verify collaborator cards are readable but not distracting.

---

### 5. Sidebar Variables Not in New globals.css

**Question:** Are sidebar-specific CSS variables (`--sidebar-*`) defined in the new `globals.css`?

**Context:**
`src/components/ui/sidebar.tsx` uses:
```css
--sidebar-width: 16rem;
--sidebar-width-icon: 3rem;
--sidebar-border: var(--color-border-default);
--sidebar-accent: var(--color-app-primary);
```

These are **layout variables**, not color tokens. They're separate from the semantic color migration but may need updates.

**Status:** ⏭️ **DEFERRED** (per user preference, but flagged for future)

**Action Needed (Post-Migration):**
1. Check if `--sidebar-*` variables exist in new `globals.css`
2. If `--sidebar-accent` still references `--color-app-primary`, update to new primary token
3. If missing width variables, add them (or assume hardcoded in component)

**Effort:** 15 minutes (low priority)

**Files to Check:**
- `globals.css` (new)
- `src/components/ui/sidebar.tsx`
- Any CSS imports in sidebar component

---

### 6. OKLCH Color Space Performance Impact

**Question:** Will the new OKLCH color space affect animation performance?

**Context:**
OKLCH is a perceptually uniform color space that requires browser color space conversion. CSS variables using OKLCH may have runtime conversion cost that impacts:
- **Hover transitions** (200ms, frequent)
- **Spring animations** (motion library, variable duration)
- **Glassmorphism effects** (backdrop-blur + color)

**Potential Issues:**
- Increased paint time during animations
- Higher CPU usage on lower-end devices
- Frame rate drops on mobile

**Verification Approach:**

| Method | Tool | Success Criteria | Effort |
|--------|------|-----------------|--------|
| **FPS Monitoring** | Chrome DevTools → Performance | 60 FPS sustained on hover/animations | 15 min |
| **Paint Profiling** | DevTools → Paint timing | < 5ms paint time | 10 min |
| **Memory Check** | DevTools → Memory | No memory leaks during theme switch | 10 min |
| **Mobile Testing** | iPhone/Android device | Smooth interactions on budget devices | 15 min |

**Test Scenarios:**
1. Hover over 100 nodes quickly
2. Trigger spring animation on dropdown (motion library)
3. Toggle dark mode (triggers color recalculation)
4. Test on Pixel 4a or similar mid-range device

**Fallback Options (if issues found):**
- Use `transition: none` for very frequent hover states
- Cache color values in CSS custom properties
- Reduce animation duration for budget devices
- Switch specific colors back to sRGB if OKLCH shows issues

**Recommendation:** Include performance check in **Phase 4** testing. If FPS drops below 50, investigate further.

**Action Needed:**
1. Document baseline performance before migration
2. Re-run performance tests after Phase 2 completion
3. Flag if FPS degrades > 10% from baseline
4. Propose optimization strategy if needed

---

### 7. CSS Variable Fallback Strategy

**Question:** Should we provide fallback colors for CSS variables, or fail openly?

**Context:**
Some instances use syntax like:
```css
color: var(--color-text-primary, #000);
```

The fallback helps if a variable isn't defined, but masks problems.

**Current Practice:**
- Some components use fallbacks
- Others don't (rely on build errors)

**Options:**

| Approach | Pro | Con |
|----------|-----|-----|
| **Strict (no fallback)** | Surfaces issues immediately | Breaks rendering if var missing |
| **Defensive (with fallback)** | Graceful degradation | Hides bugs, harder to debug |
| **Hybrid** | Fallback for shipped code, strict for dev | Best of both | More complex |

**Recommendation:** Use **Strict (no fallback)** approach. Reasoning:
1. Phase 1 will surface all variable issues
2. Build/type-check will catch missing variables
3. Makes bugs obvious rather than hidden
4. Easier to maintain

**If we ship and find missing variables:**
Then add fallbacks in hotfix (but this shouldn't happen if Phase 1 is thorough)

---

## Decision Framework

When executing this plan and encountering unresolved questions:

### Priority Decision Tree

```
Is it breaking functionality?
├─ YES → Fix immediately (Phase 1 precedence)
└─ NO → Is it causing visual inconsistency?
    ├─ YES → Fix in Phase 2
    └─ NO → Is it affecting branding/theme?
        ├─ YES → Fix in Phase 3
        └─ NO → Defer to post-migration review
```

### When Blocked

1. **Review Unresolved Questions** (Section 2)
2. **Choose recommendation** from options table
3. **Document reasoning** in PR comments
4. **Tag review** with question number (e.g., "Q2: Elevation Levels")
5. **Continue with next task** (don't halt pipeline)

### Post-Migration Review

Tasks to revisit after Phase 4 passes:
- [ ] Question 2: Verify 4 elevation levels sufficient (check visual regression)
- [ ] Question 6: Verify OKLCH performance (check DevTools metrics)
- [ ] Question 5: Check sidebar variables (verify if needed)
- [ ] Question 1: Document Tailwind configuration approach

---

## Success Criteria

### Code Quality
- [ ] No TypeScript errors: `pnpm type-check` passes
- [ ] No linting issues: `pnpm lint` passes
- [ ] Build succeeds: `pnpm build` completes without warnings
- [ ] No hardcoded color values in new code (use CSS variables)

### Visual Quality
- [ ] All 11 node types render correctly in light/dark modes
- [ ] Text hierarchy is clear (4 levels: primary, secondary, tertiary, disabled)
- [ ] Elevation hierarchy is clear (base → surface → elevated → overlay)
- [ ] Status colors are distinct (success green, error red, warning amber)
- [ ] Focus/hover states provide feedback
- [ ] No visual regression from old design

### Accessibility
- [ ] WCAG AA contrast ratios met (4.5:1 for body, 3:1 for UI)
- [ ] Focus indicators visible on all interactive elements
- [ ] Color not sole indicator of state (icon + color, pattern + color)
- [ ] Keyboard navigation works fully
- [ ] Screen reader announcements accurate

### Performance
- [ ] Animations maintain 60 FPS
- [ ] Paint time < 5ms for hover states
- [ ] No performance regression from OKLCH color space
- [ ] Mobile devices (Pixel 4a equivalent) responsive and smooth

### Documentation
- [ ] All CSS variable mappings documented in PR
- [ ] Breaking changes (if any) noted in changelog
- [ ] Questions resolved with decision rationale documented
- [ ] Migration plan followed (no out-of-order changes)

---

## Files Changed Summary

### Phase 1 (Critical): 3 files
- `src/components/nodes/code-node.tsx` (15 inline variable fixes)
- `src/components/nodes/text-node.tsx` (1 typo fix)
- `src/components/nodes/components/comment-reactions.tsx` (1 variable fix)

### Phase 2 (Tailwind): ~20–25 files
- All node component files (text colors)
- All UI component files (elevation + borders)
- Dashboard, sharing, onboarding, context-menu components

### Phase 3 (Component): ~5–7 files
- `src/components/ui/input.tsx`
- `src/components/ui/textarea.tsx`
- `src/components/ui/checkbox.tsx`
- `src/components/ui/tag-input.tsx`
- `src/components/nodes/components/toolbar.tsx`
- Additional UI components with primary-color references

### Phase 4 (Testing): 0 files
- Verification only, no code changes

---

## Notes for Execution

1. **Work methodically through phases** in order. Don't skip ahead.
2. **Test after each task** to catch issues early, not at the end.
3. **Use search/replace carefully.** Verify each match before replacing.
4. **Document any surprises.** If a color doesn't exist or looks wrong, note it.
5. **Take screenshots** before/after for visual regression comparison.
6. **If blocked:** Reference Unresolved Questions, choose recommendation, document, continue.

---

**Document Version:** 1.0
**Last Updated:** 2025-11-07
**Status:** Ready for Phase 1 Execution
