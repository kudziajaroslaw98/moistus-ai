# CSS Variable Mapping: Old → Current

**Part 5 of 4** - Simple Variable Value Reference

Quick lookup table mapping removed CSS variables to their current OKLCH values.

---

## Text Variables

```
--color-text-high          → oklch(0.985 0 0)        [now: --color-text-primary]
--text-text-high           → oklch(0.985 0 0)        [now: --color-text-primary]
--color-text-medium        → oklch(0.745 0 0)        [now: --color-text-secondary]
--color-text-low           → oklch(0.595 0 0)        [now: --color-text-tertiary]
--color-text-disabled      → oklch(0.475 0 0)        [KEPT - still exists]
```

---

## Background/Elevation Variables

```
--color-elevation-sunken   → oklch(0.195 0 0)        [now: --color-bg-base]
--color-elevation-0        → oklch(0.195 0 0)        [now: --color-bg-base]
--color-elevation-1        → oklch(0.275 0 0)        [now: --color-bg-surface]
--color-elevation-2        → oklch(0.30 0.01 250)    [now: --color-bg-elevated]
--color-elevation-3        → oklch(0.30 0.01 250)    [now: --color-bg-elevated]
--color-elevation-4        → oklch(0.30 0.01 250)    [now: --color-bg-elevated]
--color-elevation-5        → oklch(0.30 0.01 250)    [now: --color-bg-elevated]
--color-elevation-6        → oklch(0.30 0.01 250)    [now: --color-bg-elevated]
--color-elevation-7        → oklch(0.30 0.01 250)    [now: --color-bg-elevated]
--color-elevation-8        → oklch(0.30 0.01 250)    [now: --color-bg-elevated]
--color-elevation-9        → oklch(0.33 0.015 250)   [now: --color-bg-overlay]
--color-elevation-10       → oklch(0.33 0.015 250)   [now: --color-bg-overlay]
--color-elevation-11       → oklch(0.33 0.015 250)   [now: --color-bg-overlay]
--color-elevation-12       → oklch(0.33 0.015 250)   [now: --color-bg-overlay]
--color-elevation-13       → oklch(0.33 0.015 250)   [now: --color-bg-overlay]
--color-elevation-14       → oklch(0.33 0.015 250)   [now: --color-bg-overlay]
--color-elevation-15       → oklch(0.33 0.015 250)   [now: --color-bg-overlay]
--color-elevation-16       → oklch(0.33 0.015 250)   [now: --color-bg-overlay]
--color-elevation-17       → oklch(0.33 0.015 250)   [now: --color-bg-overlay]
--color-elevation-18       → oklch(0.33 0.015 250)   [now: --color-bg-overlay]
--color-elevation-19       → oklch(0.33 0.015 250)   [now: --color-bg-overlay]
--color-elevation-20       → oklch(0.33 0.015 250)   [now: --color-bg-overlay]
--color-elevation-21       → oklch(0.33 0.015 250)   [now: --color-bg-overlay]
--color-elevation-22       → oklch(0.33 0.015 250)   [now: --color-bg-overlay]
--color-elevation-23       → oklch(0.33 0.015 250)   [now: --color-bg-overlay]
--color-elevation-24       → oklch(0.33 0.015 250)   [now: --color-bg-overlay]
```

---

## Border Variables

```
--color-border-default     → oklch(0.375 0 0)        [KEPT - still exists]
--color-border-hover       → oklch(0.475 0 0)        [now: --color-border-strong]
--color-border-subtle      → oklch(0.275 0 0)        [KEPT - still exists]
```

---

## Status Variables

```
--color-status-complete    → oklch(0.60 0.19 145)    [now: --color-success-500]
--color-status-success     → oklch(0.60 0.19 145)    [now: --color-success-500]
--color-status-error       → oklch(0.59 0.22 25)     [now: --color-error-500]
--color-status-warning     → oklch(0.68 0.19 85)     [now: --color-warning-500]
--color-status-default     → oklch(0.745 0 0)        [now: --color-text-secondary]
```

---

## App/Component Variables

```
--color-app-primary        → oklch(0.58 0.20 250)    [now: --color-primary-500]
--border-app-primary       → oklch(0.58 0.20 250)    [now: --color-primary-500]
--border-app-primary-muted → oklch(0.78 0.13 250)    [now: --color-primary-300]
--accent-app-primary       → oklch(0.58 0.20 250)    [now: --color-primary-500]
--bg-app-primary           → oklch(0.58 0.20 250)    [now: --color-primary-500]
```

---

## Placeholder Variables

```
--placeholder-node-text-secondary → oklch(0.745 0 0) [now: --color-text-secondary]
```

---

## Typography Variables

```
--font-geist-sans          → var(--font-geist-sans)  [KEPT - still exists]
--font-geist-mono          → var(--font-geist-mono)  [KEPT - still exists]
--font-lora                → var(--font-lora)        [KEPT - still exists]
```

---

## Interactive State Variables (New System)

These didn't exist before - use for hover/active states:

```
--color-interactive-primary-hovered  → oklch(0.68 0.17 250)
--color-interactive-primary-pressed  → oklch(0.48 0.20 250)
--color-interactive-success-hovered  → oklch(0.68 0.17 145)
--color-interactive-success-pressed  → oklch(0.50 0.18 145)
--color-interactive-error-hovered    → oklch(0.69 0.19 25)
--color-interactive-error-pressed    → oklch(0.49 0.21 25)
```

---

## Quick Copy-Paste Replacements

For search & replace in your editor:

### Text Colors
```
var(--color-text-high)     → var(--color-text-primary)
var(--text-text-high)      → var(--color-text-primary)
var(--color-text-medium)   → var(--color-text-secondary)
var(--color-text-low)      → var(--color-text-tertiary)
```

### Elevations (0-1)
```
var(--color-elevation-0)   → var(--color-bg-base)
var(--color-elevation-1)   → var(--color-bg-surface)
```

### Elevations (2-8)
```
var(--color-elevation-2)   → var(--color-bg-elevated)
var(--color-elevation-3)   → var(--color-bg-elevated)
var(--color-elevation-4)   → var(--color-bg-elevated)
var(--color-elevation-5)   → var(--color-bg-elevated)
var(--color-elevation-6)   → var(--color-bg-elevated)
var(--color-elevation-7)   → var(--color-bg-elevated)
var(--color-elevation-8)   → var(--color-bg-elevated)
```

### Elevations (9-24)
```
var(--color-elevation-9)   → var(--color-bg-overlay)
var(--color-elevation-10)  → var(--color-bg-overlay)
var(--color-elevation-11)  → var(--color-bg-overlay)
var(--color-elevation-12)  → var(--color-bg-overlay)
var(--color-elevation-13)  → var(--color-bg-overlay)
var(--color-elevation-14)  → var(--color-bg-overlay)
var(--color-elevation-15)  → var(--color-bg-overlay)
var(--color-elevation-16)  → var(--color-bg-overlay)
var(--color-elevation-17)  → var(--color-bg-overlay)
var(--color-elevation-18)  → var(--color-bg-overlay)
var(--color-elevation-19)  → var(--color-bg-overlay)
var(--color-elevation-20)  → var(--color-bg-overlay)
var(--color-elevation-21)  → var(--color-bg-overlay)
var(--color-elevation-22)  → var(--color-bg-overlay)
var(--color-elevation-23)  → var(--color-bg-overlay)
var(--color-elevation-24)  → var(--color-bg-overlay)
```

### Borders
```
var(--color-border-hover)  → var(--color-border-strong)
```

### Status
```
var(--color-status-complete) → var(--color-success-500)
var(--color-status-error)    → var(--color-error-500)
var(--color-status-warning)  → var(--color-warning-500)
var(--color-status-default)  → var(--color-text-secondary)
```

### App Colors
```
var(--color-app-primary)   → var(--color-primary-500)
var(--border-app-primary)  → var(--color-primary-500)
```

---

## Current System Reference

All current CSS variables defined in `globals.css`:

### Primitive Scales (50 tokens)
```
--color-neutral-50 through --color-neutral-900    (10 steps)
--color-primary-50 through --color-primary-900    (10 steps)
--color-success-50 through --color-success-900    (10 steps)
--color-warning-50 through --color-warning-900    (10 steps)
--color-error-50 through --color-error-900        (10 steps)
```

### Semantic Tokens (15 tokens)
```
--color-bg-base
--color-bg-surface
--color-bg-elevated
--color-bg-overlay
--color-border-subtle
--color-border-default
--color-border-strong
--color-text-primary
--color-text-secondary
--color-text-tertiary
--color-text-disabled
--color-interactive-primary
--color-interactive-success
--color-interactive-warning
--color-interactive-error
```

### Shadcn/UI Compatibility (13 tokens)
```
--color-background
--color-foreground
--color-card
--color-card-foreground
--color-popover
--color-popover-foreground
--color-primary
--color-primary-foreground
--color-secondary
--color-secondary-foreground
--color-muted
--color-muted-foreground
--color-accent
--color-accent-foreground
--color-destructive
--color-destructive-foreground
--color-border
--color-input
--color-ring
```

---

**Total: 78 CSS variables** in the new system (vs ~200+ in the old system)
