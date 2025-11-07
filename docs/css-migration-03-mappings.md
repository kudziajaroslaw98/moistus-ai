# CSS Migration Guide: Token Mappings

**Part 3 of 4** - Complete Migration Mapping Reference

This document provides comprehensive tables mapping old CSS variables and Tailwind classes to their new OKLCH-based equivalents.

**Related Documentation:**
- [Part 1: Summary & Critical Issues](./css-migration-01-summary.md)
- [Part 2: Tailwind Class Updates](./css-migration-02-tailwind-classes.md)
- [Part 4: Implementation Plan](./css-migration-04-implementation.md)

---

## Quick Reference

The new system uses:
- **OKLCH color space** for perceptual uniformity
- **5 color scales** (neutral, primary, success, warning, error)
- **10 steps per scale** (50, 100, 200, 300, 400, 500, 600, 700, 800, 900)
- **4 elevation levels** instead of 25 (base, surface, elevated, overlay)
- **Semantic tokens** for universal application

---

## 1. Text Color Mappings

Complete mapping of text hierarchy tokens.

| Old Token/Class | New Token/Class | OKLCH Value | Notes |
|-----------------|-----------------|-------------|-------|
| `text-text-high` | `text-text-primary` | `oklch(0.985 0 0)` | High contrast primary text |
| `--color-text-high` | `--color-text-primary` | `oklch(0.985 0 0)` | Inline style variant |
| `text-text-medium` | `text-text-secondary` | `oklch(0.745 0 0)` | Secondary/supporting text |
| `--color-text-medium` | `--color-text-secondary` | `oklch(0.745 0 0)` | Inline style variant |
| `text-text-low` | `text-text-tertiary` | `oklch(0.595 0 0)` | Tertiary/subtle text |
| `--color-text-low` | `--color-text-tertiary` | `oklch(0.595 0 0)` | Inline style variant |
| `text-text-disabled` | `text-text-disabled` | `oklch(0.475 0 0)` | Keep as-is ✓ |
| `--color-text-disabled` | `--color-text-disabled` | `oklch(0.475 0 0)` | Keep as-is ✓ |
| `text-node-text-primary` | `text-text-primary` | `oklch(0.985 0 0)` | Node-specific → universal |
| `text-node-text-secondary` | `text-text-secondary` | `oklch(0.745 0 0)` | Node-specific → universal |
| `text-node-text-tertiary` | `text-text-tertiary` | `oklch(0.595 0 0)` | Node-specific → universal |

**Migration Strategy:**
- High → Primary (most common, highest contrast)
- Medium → Secondary (supporting content)
- Low → Tertiary (least emphasis)
- Disabled → Disabled (no change)
- All `node-text-*` variants consolidate to universal `text-*` tokens

---

## 2. Background/Elevation Mappings

The old system had 25 elevation levels (0-24). The new system has 4 semantic levels with subtle blue tinting at higher elevations.

### Core Elevation Mapping

| Old Token/Class | New Token/Class | OKLCH Value | Use Case |
|-----------------|-----------------|-------------|----------|
| `bg-elevation-0` | `bg-bg-base` | `oklch(0.195 0 0)` | App background, lowest layer |
| `--color-elevation-0` | `--color-bg-base` | `oklch(0.195 0 0)` | Inline style variant |
| `bg-elevation-1` | `bg-bg-surface` | `oklch(0.275 0 0)` | Cards, panels, primary content |
| `--color-elevation-1` | `--color-bg-surface` | `oklch(0.275 0 0)` | Inline style variant |
| `bg-elevation-2` | `bg-bg-elevated` | `oklch(0.30 0.01 250)` | Raised surfaces, modals |
| `bg-elevation-3` | `bg-bg-elevated` | `oklch(0.30 0.01 250)` | Mid-range → elevated |
| `bg-elevation-4` | `bg-bg-elevated` | `oklch(0.30 0.01 250)` | Mid-range → elevated |
| `--color-elevation-4` | `--color-bg-elevated` | `oklch(0.30 0.01 250)` | Inline style variant |
| `bg-elevation-8` | `bg-bg-overlay` | `oklch(0.33 0.015 250)` | High elevation → overlay |
| `bg-elevation-12` | `bg-bg-overlay` | `oklch(0.33 0.015 250)` | High elevation → overlay |
| `bg-elevation-16` | `bg-bg-overlay` | `oklch(0.33 0.015 250)` | High elevation → overlay |
| `bg-elevation-24` | `bg-bg-overlay` | `oklch(0.33 0.015 250)` | Popovers, tooltips, dropdowns |
| `--color-elevation-sunken` | `--color-bg-base` | `oklch(0.195 0 0)` | Below base → use base |
| `from-elevation-0` | `from-bg-base` | - | Gradient classes |
| `to-elevation-4` | `to-bg-elevated` | - | Gradient classes |
| `via-elevation-2` | `via-bg-elevated` | - | Gradient classes |

### Elevation Range Mapping Guide

| Old Range | New Token | Reasoning |
|-----------|-----------|-----------|
| 0 | `bg-base` | App background, lowest layer |
| 1 | `bg-surface` | Primary content surfaces |
| 2-8 | `bg-elevated` | Mid-range raised surfaces |
| 9-24 | `bg-overlay` | High layers (modals, popovers) |

### Special Background Tokens

| Old Token/Class | New Token/Class | OKLCH Value | Notes |
|-----------------|-----------------|-------------|-------|
| `bg-app-background` | `bg-bg-base` | `oklch(0.195 0 0)` | App container background |
| `bg-node-background` | `bg-bg-surface` | `oklch(0.275 0 0)` | Node backgrounds |
| `bg-panel-background` | `bg-bg-surface` | `oklch(0.275 0 0)` | Panel backgrounds |
| `bg-modal-background` | `bg-bg-elevated` | `oklch(0.30 0.01 250)` | Modal backgrounds |
| `bg-popover-background` | `bg-bg-overlay` | `oklch(0.33 0.015 250)` | Popover backgrounds |

**Key Difference:** New system uses brightness + subtle blue tint for elevation instead of just brightness. Higher surfaces have more chroma (color intensity).

---

## 3. Border Mappings

| Old Token/Class | New Token/Class | OKLCH Value | Notes |
|-----------------|-----------------|-------------|-------|
| `border-border-default` | `border-border-default` | `oklch(0.375 0 0)` | Keep as-is ✓ |
| `--color-border-default` | `--color-border-default` | `oklch(0.375 0 0)` | Keep as-is ✓ |
| `border-border-hover` | `border-border-strong` | `oklch(0.475 0 0)` | Stronger contrast on hover |
| `--color-border-hover` | `--color-border-strong` | `oklch(0.475 0 0)` | Inline style variant |
| `border-border-subtle` | `border-border-subtle` | `oklch(0.275 0 0)` | Keep as-is ✓ |
| `--color-border-subtle` | `--color-border-subtle` | `oklch(0.275 0 0)` | Keep as-is ✓ |
| `border-node-border` | `border-border-default` | `oklch(0.375 0 0)` | Node-specific → universal |
| `border-node-border-hover` | `border-border-strong` | `oklch(0.475 0 0)` | Node-specific → universal |

**Migration Notes:**
- Most border tokens unchanged
- Only `border-hover` → `border-strong` needs updating
- All `node-border-*` variants consolidate to universal `border-*` tokens

---

## 4. Status Color Mappings

Status indicators for success, warning, and error states.

### Success Colors

| Old Token/Class | New Token/Class | OKLCH Value | Hue | Use Case |
|-----------------|-----------------|-------------|-----|----------|
| `text-status-complete` | `text-success-500` | `oklch(0.60 0.19 145)` | 145° | Success, completed tasks |
| `text-status-success` | `text-success-500` | `oklch(0.60 0.19 145)` | 145° | Success states |
| `bg-status-success` | `bg-success-500` | `oklch(0.60 0.19 145)` | 145° | Success backgrounds |
| `border-status-success` | `border-success-500` | `oklch(0.60 0.19 145)` | 145° | Success borders |
| `text-status-success-muted` | `text-success-300` | `oklch(0.78 0.13 145)` | 145° | Muted success text |
| `bg-status-success/10` | `bg-success-500/10` | - | 10% opacity success bg |

### Error Colors

| Old Token/Class | New Token/Class | OKLCH Value | Hue | Use Case |
|-----------------|-----------------|-------------|-----|----------|
| `text-status-error` | `text-error-500` | `oklch(0.59 0.22 25)` | 25° | Error, destructive actions |
| `bg-status-error` | `bg-error-500` | `oklch(0.59 0.22 25)` | 25° | Error backgrounds |
| `border-status-error` | `border-error-500` | `oklch(0.59 0.22 25)` | 25° | Error borders |
| `text-status-error-muted` | `text-error-300` | `oklch(0.78 0.13 25)` | 25° | Muted error text |
| `bg-status-error/10` | `bg-error-500/10` | - | 10% opacity error bg |

### Warning Colors

| Old Token/Class | New Token/Class | OKLCH Value | Hue | Use Case |
|-----------------|-----------------|-------------|-----|----------|
| `text-status-warning` | `text-warning-500` | `oklch(0.68 0.19 85)` | 85° | Warnings, caution |
| `bg-status-warning` | `bg-warning-500` | `oklch(0.68 0.19 85)` | 85° | Warning backgrounds |
| `border-status-warning` | `border-warning-500` | `oklch(0.68 0.19 85)` | 85° | Warning borders |
| `text-status-warning-muted` | `text-warning-300` | `oklch(0.85 0.13 85)` | 85° | Muted warning text |
| `bg-status-warning/10` | `bg-warning-500/10` | - | 10% opacity warning bg |

### Default/Neutral Status

| Old Token/Class | New Token/Class | OKLCH Value | Notes |
|-----------------|-----------------|-------------|-------|
| `text-status-default` | `text-text-secondary` | `oklch(0.745 0 0)` | Neutral state |
| `bg-status-default` | `bg-neutral-600` | `oklch(0.475 0 0)` | Neutral background |
| `border-status-default` | `border-border-default` | `oklch(0.375 0 0)` | Neutral border |

**Color Scale Options:**
Each status color has a 10-step scale (50-900) for flexibility:
- 300: Muted variant (lower contrast)
- 400: Lighter variant
- 500: Primary status color (recommended)
- 600: Darker variant
- 700: Strong variant (higher contrast)

---

## 5. App/Component Specific Color Mappings

These were component-specific tokens that now use universal semantic tokens.

### Primary Brand Colors

| Old Token/Class | New Token/Class | OKLCH Value | Notes |
|-----------------|-----------------|-------------|-------|
| `bg-app-primary` | `bg-primary-500` | `oklch(0.58 0.20 250)` | Primary action backgrounds |
| `text-app-primary` | `text-primary-500` | `oklch(0.58 0.20 250)` | Primary colored text |
| `border-app-primary` | `border-primary-500` | `oklch(0.58 0.20 250)` | Primary borders |
| `border-app-primary-muted` | `border-primary-300` | `oklch(0.78 0.13 250)` | Subtle primary border |
| `border-app-primary-muted` | `border-primary-500/30` | - | Alternative: 30% opacity |
| `bg-app-primary-muted` | `bg-primary-300` | `oklch(0.78 0.13 250)` | Muted primary background |
| `bg-app-primary-muted` | `bg-primary-500/20` | - | Alternative: 20% opacity |
| `accent-app-primary` | `accent-primary` | - | Form element accent color |

### Interactive States

| Old Token/Class | New Token/Class | OKLCH Value | State |
|-----------------|-----------------|-------------|-------|
| `bg-app-primary` | `bg-interactive-primary` | `oklch(0.58 0.20 250)` | Default |
| `hover:bg-app-primary` | `hover:bg-interactive-primary-hovered` | `oklch(0.68 0.17 250)` | Hover |
| `active:bg-app-primary` | `active:bg-interactive-primary-pressed` | `oklch(0.48 0.20 250)` | Pressed |
| `focus:border-app-primary` | `focus:border-primary-500` | `oklch(0.58 0.20 250)` | Focus border |
| `focus:border-app-primary/60` | `focus:border-primary-500/60` | - | Focus border 60% opacity |

### Focus Ring Tokens

| Old Token/Class | New Token/Class | OKLCH Value | Notes |
|-----------------|-----------------|-------------|-------|
| `focus:ring-app-primary` | `focus:ring-primary-500` | `oklch(0.58 0.20 250)` | Focus ring color |
| `focus:ring-app-primary/20` | `focus:ring-primary-500/20` | - | Focus ring 20% opacity |
| `focus:ring-offset-app-primary-muted` | `focus:ring-offset-neutral-800` | `oklch(0.275 0 0)` | Focus ring offset |
| `focus:ring-offset-elevation-1` | `focus:ring-offset-bg-surface` | `oklch(0.275 0 0)` | Focus ring offset surface |

### Node-Specific Tokens

| Old Token/Class | New Token/Class | OKLCH Value | Notes |
|-----------------|-----------------|-------------|-------|
| `placeholder-node-text-secondary` | `placeholder-text-secondary` | `oklch(0.745 0 0)` | Input placeholder |
| `placeholder-node-text-secondary` | `placeholder-neutral-400` | `oklch(0.745 0 0)` | Alternative mapping |
| `bg-node-background` | `bg-bg-surface` | `oklch(0.275 0 0)` | Node surface |
| `border-node-border` | `border-border-default` | `oklch(0.375 0 0)` | Node borders |
| `text-node-text-primary` | `text-text-primary` | `oklch(0.985 0 0)` | Node primary text |

### Icon Colors

| Old Token/Class | New Token/Class | OKLCH Value | Notes |
|-----------------|-----------------|-------------|-------|
| `text-icon-default` | `text-text-secondary` | `oklch(0.745 0 0)` | Default icon color |
| `text-icon-muted` | `text-text-tertiary` | `oklch(0.595 0 0)` | Muted icon color |
| `text-icon-primary` | `text-primary-500` | `oklch(0.58 0.20 250)` | Primary colored icon |

**Interactive State Variants:**
For interactive elements (buttons, links), prefer semantic interactive tokens:
- Default: `interactive-primary` → `oklch(0.58 0.20 250)`
- Hover: `interactive-primary-hovered` → `oklch(0.68 0.17 250)`
- Pressed: `interactive-primary-pressed` → `oklch(0.48 0.20 250)`

---

## 6. Elevation System: Old vs. New

### Old System (25 Levels)
```
elevation-0  ████████ (darkest - 0.195)
elevation-1  █████████ (0.275)
elevation-2  ██████████ (0.30)
elevation-4  ███████████ (0.35)
elevation-8  █████████████ (0.40)
elevation-12 ███████████████ (0.45)
elevation-16 █████████████████ (0.50)
elevation-24 ████████████████████ (lightest - 0.60)
```

**Problem:**
- Too granular (25 levels)
- Inconsistent visual hierarchy
- Hard to maintain
- Linear lightness progression (not perceptually uniform)
- No semantic meaning

### New System (4 Semantic Levels)
```
bg-base      ████████ (0.195 L, 0 C, 0 H)
bg-surface   █████████ (0.275 L, 0 C, 0 H)
bg-elevated  ██████████ (0.30 L, 0.01 C, 250 H) ← subtle blue tint
bg-overlay   ████████████ (0.33 L, 0.015 C, 250 H) ← stronger blue tint
```

**Benefits:**
- Clear visual hierarchy (4 semantic levels)
- Semantic meaning (base → surface → elevated → overlay)
- Subtle blue tint adds depth at higher elevations
- Perceptually uniform lightness steps
- Easier to maintain and reason about

### Lightness + Chroma Progression

| Level | Lightness | Chroma | Hue | Visual Effect |
|-------|-----------|--------|-----|---------------|
| base | 0.195 | 0 | - | Pure gray, darkest |
| surface | 0.275 | 0 | - | Pure gray, primary content |
| elevated | 0.30 | 0.01 | 250° | Slight blue tint, raised |
| overlay | 0.33 | 0.015 | 250° | Stronger blue tint, highest |

**Key Innovation:** Chroma increases with elevation, creating subtle depth perception through color, not just brightness.

---

## 7. Migration Examples

### Example 1: Card Component

**Before:**
```tsx
<div className="bg-elevation-2 border-border-default text-text-high">
  <h3 className="text-text-high">Card Title</h3>
  <p className="text-text-medium">Secondary text</p>
  <span className="text-text-low">Tertiary text</span>
</div>
```

**After:**
```tsx
<div className="bg-bg-elevated border-border-default text-text-primary">
  <h3 className="text-text-primary">Card Title</h3>
  <p className="text-text-secondary">Secondary text</p>
  <span className="text-text-tertiary">Tertiary text</span>
</div>
```

### Example 2: Button with Interactive States

**Before:**
```tsx
<button className="bg-app-primary hover:bg-app-primary/80 active:bg-app-primary/60 text-text-high border-app-primary">
  Click me
</button>
```

**After:**
```tsx
<button className="bg-interactive-primary hover:bg-interactive-primary-hovered active:bg-interactive-primary-pressed text-text-primary border-primary-500">
  Click me
</button>
```

### Example 3: Status Indicator

**Before:**
```tsx
<div className="flex items-center gap-2">
  <span className="text-status-success">✓ Complete</span>
  <span className="text-status-error">✗ Error</span>
  <span className="text-status-warning">⚠ Warning</span>
</div>
```

**After:**
```tsx
<div className="flex items-center gap-2">
  <span className="text-success-500">✓ Complete</span>
  <span className="text-error-500">✗ Error</span>
  <span className="text-warning-500">⚠ Warning</span>
</div>
```

### Example 4: Modal with Focus Ring

**Before:**
```tsx
<input
  className="bg-elevation-1 border-border-default text-text-high placeholder-node-text-secondary focus:border-app-primary/60 focus:ring-app-primary/20 focus:ring-offset-elevation-1"
  placeholder="Enter text..."
/>
```

**After:**
```tsx
<input
  className="bg-bg-surface border-border-default text-text-primary placeholder-text-secondary focus:border-primary-500/60 focus:ring-primary-500/20 focus:ring-offset-bg-surface"
  placeholder="Enter text..."
/>
```

### Example 5: Gradient Background

**Before:**
```tsx
<div className="bg-gradient-to-br from-elevation-0 via-elevation-2 to-elevation-4">
  Gradient content
</div>
```

**After:**
```tsx
<div className="bg-gradient-to-br from-bg-base via-bg-elevated to-bg-overlay">
  Gradient content
</div>
```

---

## 8. Complete Color Scale Reference

### Neutral (Gray) Scale
Pure gray with 0 chroma for maximum compatibility.

| Step | OKLCH | Hex Approx | Lightness | Use Case |
|------|-------|------------|-----------|----------|
| 50 | `oklch(0.985 0 0)` | `#FBFBFB` | 98.5% | Lightest backgrounds, primary text |
| 100 | `oklch(0.965 0 0)` | `#F5F5F5` | 96.5% | Very light backgrounds |
| 200 | `oklch(0.925 0 0)` | `#EBEBEB` | 92.5% | Subtle backgrounds, disabled states |
| 300 | `oklch(0.865 0 0)` | `#DCDCDC` | 86.5% | Light borders, dividers |
| 400 | `oklch(0.745 0 0)` | `#BEBEBE` | 74.5% | Secondary text, icons |
| 500 | `oklch(0.595 0 0)` | `#989898` | 59.5% | Tertiary text, subtle icons |
| 600 | `oklch(0.475 0 0)` | `#797979` | 47.5% | Disabled text, strong borders |
| 700 | `oklch(0.375 0 0)` | `#5F5F5F` | 37.5% | Default borders, strong text |
| 800 | `oklch(0.275 0 0)` | `#464646` | 27.5% | Surface backgrounds, panels |
| 900 | `oklch(0.195 0 0)` | `#313131` | 19.5% | Base backgrounds, darkest layer |

### Primary (Blue) Scale
Blue at hue 250° with progressive chroma for depth.

| Step | OKLCH | Lightness | Chroma | Use Case |
|------|-------|-----------|--------|----------|
| 50 | `oklch(0.97 0.02 250)` | 97% | 0.02 | Very light blue backgrounds |
| 100 | `oklch(0.93 0.05 250)` | 93% | 0.05 | Light blue backgrounds |
| 200 | `oklch(0.87 0.09 250)` | 87% | 0.09 | Subtle blue accents |
| 300 | `oklch(0.78 0.13 250)` | 78% | 0.13 | Muted primary (low contrast) |
| 400 | `oklch(0.68 0.17 250)` | 68% | 0.17 | Hover states, lighter primary |
| 500 | `oklch(0.58 0.20 250)` | 58% | 0.20 | **Primary brand color** |
| 600 | `oklch(0.48 0.20 250)` | 48% | 0.20 | Active/pressed states |
| 700 | `oklch(0.40 0.18 250)` | 40% | 0.18 | Dark primary emphasis |
| 800 | `oklch(0.33 0.14 250)` | 33% | 0.14 | Very dark primary |
| 900 | `oklch(0.27 0.10 250)` | 27% | 0.10 | Darkest primary |

### Success (Green) Scale
Green at hue 145° for positive states.

| Step | OKLCH | Lightness | Chroma | Use Case |
|------|-------|-----------|--------|----------|
| 50 | `oklch(0.97 0.02 145)` | 97% | 0.02 | Very light green backgrounds |
| 100 | `oklch(0.93 0.05 145)` | 93% | 0.05 | Light green backgrounds |
| 200 | `oklch(0.86 0.10 145)` | 86% | 0.10 | Subtle success accents |
| 300 | `oklch(0.78 0.13 145)` | 78% | 0.13 | Muted success (low contrast) |
| 400 | `oklch(0.69 0.16 145)` | 69% | 0.16 | Lighter success |
| 500 | `oklch(0.60 0.19 145)` | 60% | 0.19 | **Primary success color** |
| 600 | `oklch(0.50 0.19 145)` | 50% | 0.19 | Darker success |
| 700 | `oklch(0.42 0.17 145)` | 42% | 0.17 | Strong success emphasis |
| 800 | `oklch(0.34 0.13 145)` | 34% | 0.13 | Very dark success |
| 900 | `oklch(0.28 0.10 145)` | 28% | 0.10 | Darkest success |

### Warning (Yellow/Orange) Scale
Yellow-orange at hue 85° for caution states.

| Step | OKLCH | Lightness | Chroma | Use Case |
|------|-------|-----------|--------|----------|
| 50 | `oklch(0.98 0.02 85)` | 98% | 0.02 | Very light yellow backgrounds |
| 100 | `oklch(0.95 0.06 85)` | 95% | 0.06 | Light yellow backgrounds |
| 200 | `oklch(0.90 0.11 85)` | 90% | 0.11 | Subtle warning accents |
| 300 | `oklch(0.85 0.13 85)` | 85% | 0.13 | Muted warning (low contrast) |
| 400 | `oklch(0.76 0.17 85)` | 76% | 0.17 | Lighter warning |
| 500 | `oklch(0.68 0.19 85)` | 68% | 0.19 | **Primary warning color** |
| 600 | `oklch(0.58 0.19 85)` | 58% | 0.19 | Darker warning |
| 700 | `oklch(0.49 0.17 85)` | 49% | 0.17 | Strong warning emphasis |
| 800 | `oklch(0.40 0.13 85)` | 40% | 0.13 | Very dark warning |
| 900 | `oklch(0.33 0.10 85)` | 33% | 0.10 | Darkest warning |

### Error (Red) Scale
Red at hue 25° for error/destructive states.

| Step | OKLCH | Lightness | Chroma | Use Case |
|------|-------|-----------|--------|----------|
| 50 | `oklch(0.97 0.02 25)` | 97% | 0.02 | Very light red backgrounds |
| 100 | `oklch(0.93 0.06 25)` | 93% | 0.06 | Light red backgrounds |
| 200 | `oklch(0.87 0.12 25)` | 87% | 0.12 | Subtle error accents |
| 300 | `oklch(0.78 0.13 25)` | 78% | 0.13 | Muted error (low contrast) |
| 400 | `oklch(0.68 0.18 25)` | 68% | 0.18 | Lighter error |
| 500 | `oklch(0.59 0.22 25)` | 59% | 0.22 | **Primary error color** |
| 600 | `oklch(0.49 0.22 25)` | 49% | 0.22 | Darker error |
| 700 | `oklch(0.41 0.20 25)` | 41% | 0.20 | Strong error emphasis |
| 800 | `oklch(0.33 0.15 25)` | 33% | 0.15 | Very dark error |
| 900 | `oklch(0.27 0.12 25)` | 27% | 0.12 | Darkest error |

---

## 9. Special Tokens Reference

### Interactive Tokens

| Token Name | OKLCH Value | Use Case |
|------------|-------------|----------|
| `interactive-primary` | `oklch(0.58 0.20 250)` | Default interactive state |
| `interactive-primary-hovered` | `oklch(0.68 0.17 250)` | Hover state (lighter, less chroma) |
| `interactive-primary-pressed` | `oklch(0.48 0.20 250)` | Active/pressed state (darker) |
| `interactive-secondary` | `oklch(0.745 0 0)` | Secondary action default |
| `interactive-secondary-hovered` | `oklch(0.865 0 0)` | Secondary action hover |

### Semantic Background Tokens

| Token Name | OKLCH Value | Elevation Context |
|------------|-------------|-------------------|
| `bg-base` | `oklch(0.195 0 0)` | App background, lowest layer |
| `bg-surface` | `oklch(0.275 0 0)` | Cards, panels, content |
| `bg-elevated` | `oklch(0.30 0.01 250)` | Modals, raised surfaces |
| `bg-overlay` | `oklch(0.33 0.015 250)` | Popovers, tooltips, dropdowns |

### Semantic Text Tokens

| Token Name | OKLCH Value | Contrast Context |
|------------|-------------|------------------|
| `text-primary` | `oklch(0.985 0 0)` | Highest contrast, primary content |
| `text-secondary` | `oklch(0.745 0 0)` | Medium contrast, supporting text |
| `text-tertiary` | `oklch(0.595 0 0)` | Low contrast, subtle text |
| `text-disabled` | `oklch(0.475 0 0)` | Disabled state text |
| `text-inverse` | `oklch(0.195 0 0)` | Light-on-dark text |

### Semantic Border Tokens

| Token Name | OKLCH Value | Use Case |
|------------|-------------|----------|
| `border-subtle` | `oklch(0.275 0 0)` | Very subtle dividers |
| `border-default` | `oklch(0.375 0 0)` | Default border weight |
| `border-strong` | `oklch(0.475 0 0)` | Emphasized borders, hover states |

---

## 10. CSS Variable Mapping Summary

### Complete Variable Mapping

| Old CSS Variable | New CSS Variable | Type |
|------------------|------------------|------|
| `--color-text-high` | `--color-text-primary` | Text |
| `--color-text-medium` | `--color-text-secondary` | Text |
| `--color-text-low` | `--color-text-tertiary` | Text |
| `--color-text-disabled` | `--color-text-disabled` | Text ✓ |
| `--color-elevation-0` | `--color-bg-base` | Background |
| `--color-elevation-1` | `--color-bg-surface` | Background |
| `--color-elevation-2` | `--color-bg-elevated` | Background |
| `--color-elevation-4` | `--color-bg-elevated` | Background |
| `--color-elevation-8` | `--color-bg-overlay` | Background |
| `--color-elevation-16` | `--color-bg-overlay` | Background |
| `--color-elevation-24` | `--color-bg-overlay` | Background |
| `--color-elevation-sunken` | `--color-bg-base` | Background |
| `--color-border-default` | `--color-border-default` | Border ✓ |
| `--color-border-hover` | `--color-border-strong` | Border |
| `--color-border-subtle` | `--color-border-subtle` | Border ✓ |
| `--color-app-primary` | `--color-primary-500` | Brand |
| `--color-app-primary-muted` | `--color-primary-300` | Brand |
| `--color-status-success` | `--color-success-500` | Status |
| `--color-status-error` | `--color-error-500` | Status |
| `--color-status-warning` | `--color-warning-500` | Status |
| `--color-status-default` | `--color-text-secondary` | Status |
| `--color-node-text-primary` | `--color-text-primary` | Node |
| `--color-node-text-secondary` | `--color-text-secondary` | Node |
| `--color-node-background` | `--color-bg-surface` | Node |
| `--color-node-border` | `--color-border-default` | Node |

**Total Variables:**
- Old system: ~50 variables (with elevation levels)
- New system: ~35 core variables + color scales
- Reduction: More scalable with systematic color scales

---

## 11. Opacity Variants

Many tokens support opacity variants using the `/` syntax.

### Common Opacity Patterns

| Pattern | Example | Use Case |
|---------|---------|----------|
| `/10` | `bg-primary-500/10` | Subtle tinted backgrounds |
| `/20` | `bg-error-500/20` | Alert backgrounds |
| `/30` | `border-primary-500/30` | Subtle colored borders |
| `/40` | `text-primary-500/40` | Dimmed colored text |
| `/50` | `bg-neutral-900/50` | 50% transparent overlays |
| `/60` | `focus:border-primary-500/60` | Focus states |
| `/80` | `hover:bg-primary-500/80` | Hover states |

### Before/After Opacity Examples

**Before:**
```tsx
<div className="bg-app-primary/10 border-app-primary/30">
  <span className="text-app-primary/60">Muted primary text</span>
</div>
```

**After:**
```tsx
<div className="bg-primary-500/10 border-primary-500/30">
  <span className="text-primary-500/60">Muted primary text</span>
</div>
```

---

## 12. Migration Checklist

Use this checklist when migrating components:

### Text Classes
- [ ] Replace `text-text-high` → `text-text-primary`
- [ ] Replace `text-text-medium` → `text-text-secondary`
- [ ] Replace `text-text-low` → `text-text-tertiary`
- [ ] Replace `text-node-text-*` → `text-text-*`
- [ ] Keep `text-text-disabled` as-is

### Background Classes
- [ ] Replace `bg-elevation-0` → `bg-bg-base`
- [ ] Replace `bg-elevation-1` → `bg-bg-surface`
- [ ] Replace `bg-elevation-[2-8]` → `bg-bg-elevated`
- [ ] Replace `bg-elevation-[9-24]` → `bg-bg-overlay`
- [ ] Replace `bg-node-background` → `bg-bg-surface`

### Border Classes
- [ ] Replace `border-border-hover` → `border-border-strong`
- [ ] Replace `border-node-border` → `border-border-default`
- [ ] Keep `border-border-default` as-is
- [ ] Keep `border-border-subtle` as-is

### Brand/Primary Classes
- [ ] Replace `bg-app-primary` → `bg-primary-500` or `bg-interactive-primary`
- [ ] Replace `text-app-primary` → `text-primary-500`
- [ ] Replace `border-app-primary` → `border-primary-500`
- [ ] Replace `*-app-primary-muted` → `*-primary-300` or `*-primary-500/30`

### Status Classes
- [ ] Replace `text-status-success` → `text-success-500`
- [ ] Replace `text-status-error` → `text-error-500`
- [ ] Replace `text-status-warning` → `text-warning-500`
- [ ] Replace `text-status-default` → `text-text-secondary`

### Interactive States
- [ ] Replace hover states with `hover:*-interactive-primary-hovered`
- [ ] Replace active states with `active:*-interactive-primary-pressed`
- [ ] Update focus rings: `focus:ring-primary-500/20`
- [ ] Update focus borders: `focus:border-primary-500/60`

### CSS Variables (in style attributes)
- [ ] Replace `--color-text-*` variables
- [ ] Replace `--color-elevation-*` variables
- [ ] Replace `--color-app-*` variables
- [ ] Replace `--color-node-*` variables

---

## 13. Find & Replace Patterns

Use these regex patterns for automated migration (test thoroughly!):

### Text Classes
```regex
Find: text-text-high\b
Replace: text-text-primary

Find: text-text-medium\b
Replace: text-text-secondary

Find: text-text-low\b
Replace: text-text-tertiary

Find: text-node-text-(primary|secondary|tertiary)
Replace: text-text-$1
```

### Background Classes
```regex
Find: bg-elevation-0\b
Replace: bg-bg-base

Find: bg-elevation-1\b
Replace: bg-bg-surface

Find: bg-elevation-([2-8])\b
Replace: bg-bg-elevated

Find: bg-elevation-(9|1[0-9]|2[0-4])\b
Replace: bg-bg-overlay
```

### Border Classes
```regex
Find: border-border-hover\b
Replace: border-border-strong

Find: border-node-border\b
Replace: border-border-default
```

### App/Brand Classes
```regex
Find: bg-app-primary(?!-)
Replace: bg-primary-500

Find: text-app-primary(?!-)
Replace: text-primary-500

Find: border-app-primary(?!-)
Replace: border-primary-500

Find: (bg|text|border)-app-primary-muted
Replace: $1-primary-300
```

### Status Classes
```regex
Find: text-status-(success|error|warning)
Replace: text-$1-500

Find: bg-status-(success|error|warning)
Replace: bg-$1-500

Find: border-status-(success|error|warning)
Replace: border-$1-500
```

**⚠️ Warning:** Always test regex replacements on a backup branch first!

---

## Navigation

**Complete Guide:**
1. [Summary & Critical Issues](./css-migration-01-summary.md) - Start here
2. [Tailwind Class Updates](./css-migration-02-tailwind-classes.md) - Component patterns
3. **Token Mappings** ← You are here
4. [Implementation Plan](./css-migration-04-implementation.md) - Step-by-step rollout

---

**Last Updated:** 2025-11-07
**Maintained By:** Development Team
**Version:** 1.0.0