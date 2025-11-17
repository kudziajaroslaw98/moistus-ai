# CSS Migration Guide: Tailwind Class Updates

**Part 2 of 4** - Tailwind Class References to Removed Variables

This document catalogs all Tailwind CSS classes in the codebase that reference CSS variables removed during the OKLCH color system refactor.

**Related Documentation:**
- [Part 1: Summary & Critical Issues](./css-migration-01-summary.md)
- [Part 3: Migration Mappings](./css-migration-03-mappings.md)
- [Part 4: Implementation Plan](./css-migration-04-implementation.md)

---

## Overview

**Total Files:** 25 files across 3 categories
**Total Occurrences:** ~89 Tailwind class references to removed variables

**Categories:**
- Node Components (13 files)
- UI Components (10 files)
- Context Menu & Other (4 files)

---

## Section 1: Node Components (13 files)

### 1.1 `src/components/nodes/code-node.tsx`

**Occurrences:** 12 classes
**Priority:** HIGH - Syntax highlighting and code blocks are highly visible

| Line | Class | Status | Replacement |
|------|-------|--------|-------------|
| 148 | `bg-elevation-0` | ❌ | `bg-neutral-950` or `bg-zinc-950` |
| 148 | `border-border-default` | ✓ | Keep (exists in new system) |
| 150 | `bg-elevation-1` | ❌ | `bg-neutral-900` or `bg-zinc-900` |
| 150 | `border-b-border-default` | ✓ | Keep (exists in new system) |
| 157 | `text-text-high` | ❌ | `text-neutral-50` or `text-white` |
| 162 | `text-text-disabled` | ❌ | `text-neutral-500` |
| 175 | `border-border-hover` | ❌ | `border-neutral-600` |
| 182 | `text-text-medium` | ❌ | `text-neutral-300` |
| 184 | `text-text-medium` | ❌ | `text-neutral-300` |
| 214 | `text-status-complete` | ❌ | `text-success-500` or `text-green-500` |
| 224 | `text-status-default` | ❌ | `text-neutral-400` |
| 271 | `from-elevation-0` | ❌ | `from-neutral-950` or `from-zinc-950` |

**Notes:**
- Line 148, 150: Code editor background hierarchy
- Line 157, 162: Language name and filename display
- Line 214, 224: Copy button state indicators
- Line 271: Gradient overlay for collapsed code blocks

---

### 1.2 `src/components/nodes/base-node-wrapper.tsx`

**Occurrences:** 1 class
**Priority:** CRITICAL - Affects all node types

| Line | Class | Status | Replacement |
|------|-------|--------|-------------|
| 164 | `bg-elevation-1` | ❌ | `bg-neutral-900` or `bg-zinc-900` |

**Notes:**
- Used in annotation/note theme with groove paper texture
- Critical: Impacts ALL node rendering

---

### 1.3 `src/components/nodes/text-node.tsx`

**Occurrences:** 2 references (1 CSS var, 1 class)
**Priority:** HIGH - Default node type

| Line | Reference | Status | Replacement |
|------|-----------|--------|-------------|
| 32 | `var(--text-text-high)` | ❌ | `var(--neutral-50)` or direct color |
| 106 | `text-text-disabled` | ❌ | `text-neutral-500` |

**Notes:**
- Line 32: CSS variable used in inline style
- Line 106: Placeholder text for empty nodes

---

### 1.4 `src/components/nodes/question-node.tsx`

**Occurrences:** 2 classes
**Priority:** MEDIUM - Question type specific

| Line | Class | Status | Replacement |
|------|-------|--------|-------------|
| 161 | `text-text-high` | ❌ | `text-neutral-50` |
| 165 | `text-text-disabled` | ❌ | `text-neutral-500` |

**Notes:**
- Line 161: Question title text
- Line 165: Placeholder/hint text

---

### 1.5 `src/components/nodes/question-node/multiple-choice-response.tsx`

**Occurrences:** 2 classes
**Priority:** MEDIUM

| Line | Class | Status | Replacement |
|------|-------|--------|-------------|
| 47 | `text-text-disabled` | ❌ | `text-neutral-500` |
| 98 | `text-text-high` | ❌ | `text-neutral-50` |

**Notes:**
- Line 47: Empty state message
- Line 98: Selected option text

---

### 1.6 `src/components/nodes/question-node/binary-response.tsx`

**Occurrences:** 4 classes
**Priority:** MEDIUM

| Line | Class | Status | Replacement |
|------|-------|--------|-------------|
| 36 | `text-text-medium` | ❌ | `text-neutral-300` |
| 44 | `text-text-medium` | ❌ | `text-neutral-300` |
| 67 | `text-text-medium` | ❌ | `text-neutral-300` |
| 75 | `text-text-medium` | ❌ | `text-neutral-300` |

**Notes:**
- Yes/No button states (unselected)
- All instances are fallback text colors

---

### 1.7 `src/components/nodes/comment-node.tsx`

**Occurrences:** 5 classes
**Priority:** HIGH - Comment system visibility

| Line | Class | Status | Replacement |
|------|-------|--------|-------------|
| 183 | `text-text-high` | ❌ | `text-neutral-50` |
| 202 | `text-text-medium` | ❌ | `text-neutral-300` |
| 202 | `text-text-disabled` | ❌ | `text-neutral-500` |
| 209 | `text-text-disabled` | ❌ | `text-neutral-500` |
| 220 | `text-text-medium` | ❌ | `text-neutral-300` |
| 220 | `text-text-disabled` | ❌ | `text-neutral-500` |

**Notes:**
- Line 183: Comment thread title
- Lines 202, 220: Pagination button states (active/disabled)
- Line 209: Thread counter display

---

### 1.8 `src/components/nodes/components/comment-reactions.tsx`

**Occurrences:** 5 classes
**Priority:** MEDIUM

| Line | Class | Status | Replacement |
|------|-------|--------|-------------|
| 120 | `text-text-high` | ❌ | `text-neutral-50` |
| 123 | `bg-elevation-1` | ❌ | `bg-neutral-900` |
| 123 | `border-border-default` | ✓ | Keep |
| 131 | `text-text-medium` | ❌ | `text-neutral-300` |
| 140 | `text-text-disabled` | ❌ | `text-neutral-500` |
| 157 | `bg-elevation-2` | ❌ | `bg-neutral-800` |
| 157 | `border-border-default` | ✓ | Keep |

**Notes:**
- Line 120: Reaction emoji text
- Line 123, 157: Reaction button and picker backgrounds
- Line 131: Reaction count display
- Line 140: Add reaction button (inactive)

---

### 1.9 `src/components/nodes/components/comment-thread-list.tsx`

**Occurrences:** 7 classes
**Priority:** HIGH - Comment thread display

| Line | Class | Status | Replacement |
|------|-------|--------|-------------|
| 108 | `text-text-disabled` | ❌ | `text-neutral-500` |
| 154 | `text-text-high` | ❌ | `text-neutral-50` |
| 169 | `text-text-high` | ❌ | `text-neutral-50` |
| 174 | `text-text-disabled` | ❌ | `text-neutral-500` |
| 180 | `text-text-disabled` | ❌ | `text-neutral-500` |
| 188 | `text-text-medium` | ❌ | `text-neutral-300` |

**Notes:**
- Line 108: Empty state message
- Line 154: Author name in thread header
- Line 169: Comment author name (conditional)
- Line 174: Author badge suffix
- Line 180: Timestamp display
- Line 188: Comment body text

---

### 1.10 `src/components/nodes/components/comment-reply-input.tsx`

**Occurrences:** 5 classes
**Priority:** HIGH - Comment input functionality

| Line | Class | Status | Replacement |
|------|-------|--------|-------------|
| 99 | `border-border-default` | ✓ | Keep |
| 107 | `text-text-high` | ❌ | `text-neutral-50` |
| 107 | `bg-elevation-0` | ❌ | `bg-neutral-950` |
| 107 | `border-border-default` | ✓ | Keep |
| 118 | `bg-elevation-2` | ❌ | `bg-neutral-800` |
| 119 | `text-text-high` | ❌ | `text-neutral-50` |
| 119 | `text-text-disabled` | ❌ | `text-neutral-500` |

**Notes:**
- Line 99: Reply input container border
- Line 107: Textarea styling (text, background, border)
- Lines 118-119: Send button states (active/disabled)

---

### 1.11 `src/components/nodes/annotation-node.tsx`

**Occurrences:** 0 classes
**Priority:** N/A

**Notes:**
- No deprecated classes found (or inherits from base-node-wrapper)

---

### 1.12 `src/components/nodes/task-node.tsx`

**Occurrences:** 0 classes
**Priority:** N/A

**Notes:**
- No deprecated classes found (verification needed)

---

### 1.13 `src/components/nodes/resource-node.tsx`

**Occurrences:** 0 classes
**Priority:** N/A

**Notes:**
- No deprecated classes found (verification needed)

---

## Section 2: UI Components (10 files)

### 2.1 `src/components/ui/card.tsx`

**Occurrences:** 3 classes
**Priority:** HIGH - Used throughout app

| Line | Class | Status | Replacement |
|------|-------|--------|-------------|
| 8 | `bg-elevation-2` | ❌ | `bg-neutral-800` |
| 8 | `border-border-default` | ✓ | Keep |
| 8 | `text-text-high` | ❌ | `text-neutral-50` |

**Notes:**
- Card component used in dashboards, modals, settings
- High visibility across entire app

---

### 2.2 `src/components/ui/popover.tsx`

**Occurrences:** 3 classes
**Priority:** HIGH - Context menus, dropdowns

| Line | Class | Status | Replacement |
|------|-------|--------|-------------|
| 32 | `bg-elevation-24` | ❌ | `bg-neutral-900/95` or `bg-zinc-900/95` |
| 32 | `border-border-default` | ✓ | Keep |
| 32 | `text-text-high` | ❌ | `text-neutral-50` |

**Notes:**
- Elevated surface with backdrop blur
- Used for floating UI elements

---

### 2.3 `src/components/ui/hover-card.tsx`

**Occurrences:** 3 classes
**Priority:** MEDIUM - Tooltips, profile cards

| Line | Class | Status | Replacement |
|------|-------|--------|-------------|
| 35 | `bg-elevation-24` | ❌ | `bg-neutral-900/95` |
| 35 | `text-text-high` | ❌ | `text-neutral-50` |
| 35 | `border-border-default` | ✓ | Keep |

**Notes:**
- Line 35 is very long (multiple animation classes)
- Elevated surface with backdrop blur

---

### 2.4 `src/components/ui/dialog.tsx`

**Occurrences:** 3 classes
**Priority:** HIGH - Modal dialogs

| Line | Class | Status | Replacement |
|------|-------|--------|-------------|
| 68 | `bg-elevation-16` | ❌ | `bg-neutral-800/95` |
| 68 | `border-border-default` | ✓ | Keep |
| 68 | `text-text-high` | ❌ | `text-neutral-50` |

**Notes:**
- Dialog content container
- Elevated surface with backdrop blur

---

### 2.5 `src/components/ui/dropdown-menu.tsx`

**Occurrences:** 6 classes
**Priority:** HIGH - Dropdown menus throughout app

| Line | Class | Status | Replacement |
|------|-------|--------|-------------|
| 45 | `bg-elevation-24` | ❌ | `bg-neutral-900/95` |
| 45 | `border-border-default` | ✓ | Keep |
| 45 | `text-text-high` | ❌ | `text-neutral-50` |
| 234 | `bg-elevation-24` | ❌ | `bg-neutral-900/95` |
| 234 | `border-border-default` | ✓ | Keep |
| 234 | `text-text-high` | ❌ | `text-neutral-50` |

**Notes:**
- Lines 45 & 234: Duplicate styling for menu content and submenu
- Elevated surfaces with backdrop blur

---

### 2.6 `src/components/ui/sheet.tsx`

**Occurrences:** 3 classes
**Priority:** MEDIUM - Side panels

| Line | Class | Status | Replacement |
|------|-------|--------|-------------|
| 64 | `border-border-default` | ✓ | Keep |
| 64 | `bg-elevation-16` | ❌ | `bg-neutral-800/95` |
| 64 | `text-text-high` | ❌ | `text-neutral-50` |

**Notes:**
- Sheet content container (side drawer)
- Elevated surface with backdrop blur

---

### 2.7 `src/components/ui/input.tsx`

**Occurrences:** 8 classes
**Priority:** CRITICAL - Form inputs everywhere

| Line | Class | Status | Replacement |
|------|-------|--------|-------------|
| 14 | `text-text-high` | ❌ | `text-neutral-50` |
| 14 | `accent-app-primary` | ❌ | `accent-cyan-500` |
| 16 | `focus:border-app-primary/60` | ❌ | `focus:border-cyan-500/60` |
| 16 | `focus:ring-app-primary/20` | ❌ | `focus:ring-cyan-500/20` |
| 16 | `focus:ring-offset-app-primary-muted` | ❌ | `focus:ring-offset-cyan-950` |

**Notes:**
- Line 14: Input text color and accent color
- Line 16: Focus ring styling with app-primary variants
- Critical: Affects ALL form inputs

---

### 2.8 `src/components/ui/textarea.tsx`

**Occurrences:** 7 classes
**Priority:** HIGH - Multi-line text inputs

| Line | Class | Status | Replacement |
|------|-------|--------|-------------|
| 15 | `text-text-high` | ❌ | `text-neutral-50` |
| 18 | `focus:border-app-primary/60` | ❌ | `focus:border-cyan-500/60` |
| 18 | `focus:ring-app-primary/20` | ❌ | `focus:ring-cyan-500/20` |
| 18 | `focus:ring-offset-app-primary-muted` | ❌ | `focus:ring-offset-cyan-950` |

**Notes:**
- Line 15: Textarea text color
- Line 18: Focus ring styling (conditional)
- High impact: Comments, descriptions, AI chat

---

### 2.9 `src/components/ui/checkbox.tsx`

**Occurrences:** 5 classes
**Priority:** MEDIUM - Checkboxes in forms

| Line | Class | Status | Replacement |
|------|-------|--------|-------------|
| 50 | `focus:ring-app-primary/20` | ❌ | `focus:ring-cyan-500/20` |
| 50 | `focus:ring-offset-app-primary-muted` | ❌ | `focus:ring-offset-cyan-950` |
| 56 | `border-app-primary/60` | ❌ | `border-cyan-500/60` |
| 56 | `bg-app-primary` | ❌ | `bg-cyan-500` |
| 56 | `accent-app-primary` | ❌ | `accent-cyan-500` |
| 64 | `border-app-primary/60` | ❌ | `border-cyan-500/60` |
| 64 | `bg-app-primary` | ❌ | `bg-cyan-500` |
| 64 | `accent-app-primary` | ❌ | `accent-cyan-500` |

**Notes:**
- Line 50: Focus ring styling
- Lines 56, 64: Checked state styling (duplicate conditions)

---

### 2.10 `src/components/ui/tag-input.tsx`

**Occurrences:** 5 classes
**Priority:** MEDIUM - Tag input fields

| Line | Class | Status | Replacement |
|------|-------|--------|-------------|
| 66 | `focus-within:border-app-primary/60` | ❌ | `focus-within:border-cyan-500/60` |
| 66 | `focus-within:ring-app-primary/20` | ❌ | `focus-within:ring-cyan-500/20` |
| 66 | `focus-within:ring-offset-app-primary-muted` | ❌ | `focus-within:ring-offset-cyan-950` |

**Notes:**
- Line 66: Focus-within ring styling for tag container
- Used in node tags, filters, etc.

---

## Section 3: Context Menu & Other (4 files)

### 3.1 `src/components/context-menu/edge-style-selector.tsx`

**Occurrences:** 4 classes
**Priority:** MEDIUM

| Line | Class | Status | Replacement |
|------|-------|--------|-------------|
| 19 | `text-text-high` | ❌ | `text-neutral-50` |
| 69 | `text-text-medium` | ❌ | `text-neutral-300` |
| 92 | `text-text-medium` | ❌ | `text-neutral-300` |
| 113 | `border-border-default` | ✓ | Keep |

**Notes:**
- Line 19: Edge style icon color
- Lines 69, 92: Section labels
- Line 113: Color picker border

---

### 3.2 `src/components/context-menu/context-menu.tsx`

**Occurrences:** 4 classes
**Priority:** HIGH - Context menu system

| Line | Class | Status | Replacement |
|------|-------|--------|-------------|
| 291 | `border-border-default` | ✓ | Keep |
| 296 | `text-text-medium` | ❌ | `text-neutral-300` |
| 328 | `bg-elevation-24` | ❌ | `bg-neutral-900/95` |
| 328 | `border-border-default` | ✓ | Keep |

**Notes:**
- Line 291: Separator border
- Line 296: Section label text
- Line 328: Context menu container (elevated surface)

---

### 3.3 `src/components/context-menu/context-menu-item.tsx`

**Occurrences:** 4 classes
**Priority:** HIGH - Menu items

| Line | Class | Status | Replacement |
|------|-------|--------|-------------|
| 46 | `text-status-error` | ❌ | `text-error-500` or `text-red-500` |
| 50 | `text-text-high` | ❌ | `text-neutral-50` |
| 66 | `text-text-disabled` | ❌ | `text-neutral-500` |

**Notes:**
- Line 46: Destructive action text (red)
- Line 50: Default menu item text
- Line 66: Keyboard shortcut hint text

---

### 3.4 `src/components/realtime/collaborator-profile-card.tsx`

**Occurrences:** 8 classes
**Priority:** MEDIUM - Collaboration features

| Line | Class | Status | Replacement |
|------|-------|--------|-------------|
| 92 | `text-text-low` | ❌ | `text-neutral-600` |
| 98 | `text-text-high` | ❌ | `text-neutral-50` |
| 118 | `text-text-medium` | ❌ | `text-neutral-300` |
| 204 | `text-text-low` | ❌ | `text-neutral-600` |
| 255 | `text-text-medium` | ❌ | `text-neutral-300` |
| 320 | `text-text-high` | ❌ | `text-neutral-50` |
| 329 | `text-text-medium` | ❌ | `text-neutral-300` |
| 354 | `text-text-low` | ❌ | `text-neutral-600` |

**Notes:**
- Lines 92, 204, 354: Label text (uppercase, small)
- Lines 98, 320: Primary text (names, titles)
- Lines 118, 255, 329: Secondary text (descriptions, email)

---

### 3.5 `src/components/toolbar.tsx`

**Occurrences:** 6 classes
**Priority:** HIGH - Main canvas toolbar

| Line | Class | Status | Replacement |
|------|-------|--------|-------------|
| 145 | `bg-elevation-4` | ❌ | `bg-neutral-850` or `bg-zinc-850` |
| 145 | `border-border-default` | ✓ | Keep |
| 163 | `bg-elevation-1` | ❌ | `bg-neutral-900` |
| 163 | `hover:bg-elevation-2` | ❌ | `hover:bg-neutral-800` |
| 165 | `text-text-high` | ❌ | `text-neutral-50` |
| 166 | `bg-elevation-1` | ❌ | `bg-neutral-900` |
| 166 | `border-border-default` | ✓ | Keep |
| 166 | `text-text-medium` | ❌ | `text-neutral-300` |
| 225 | `text-text-high` | ❌ | `text-neutral-50` |
| 225 | `bg-app-primary` | ❌ | `bg-cyan-500` |
| 225 | `border-app-primary-muted` | ❌ | `border-cyan-900` |

**Notes:**
- Line 145: Toolbar container background
- Lines 163, 166: Button states (default, hover, selected)
- Line 225: Primary action button (AI suggestions, etc.)

---

## Section 4: Summary Statistics

### By Class Type

| Class Pattern | Occurrences | Status |
|---------------|-------------|--------|
| `text-text-high` | ~28 | ❌ → `text-neutral-50` |
| `text-text-medium` | ~18 | ❌ → `text-neutral-300` |
| `text-text-disabled` | ~13 | ❌ → `text-neutral-500` |
| `text-text-low` | ~3 | ❌ → `text-neutral-600` |
| `bg-elevation-0` | ~3 | ❌ → `bg-neutral-950` |
| `bg-elevation-1` | ~6 | ❌ → `bg-neutral-900` |
| `bg-elevation-2` | ~4 | ❌ → `bg-neutral-800` |
| `bg-elevation-4` | ~1 | ❌ → `bg-neutral-850` |
| `bg-elevation-16` | ~2 | ❌ → `bg-neutral-800/95` |
| `bg-elevation-24` | ~6 | ❌ → `bg-neutral-900/95` |
| `border-border-default` | ~21 | ✓ Keep as-is |
| `border-border-hover` | ~2 | ❌ → `border-neutral-600` |
| `text-status-error` | ~1 | ❌ → `text-error-500` |
| `text-status-complete` | ~1 | ❌ → `text-success-500` |
| `text-status-default` | ~1 | ❌ → `text-neutral-400` |
| `bg-app-primary` | ~3 | ❌ → `bg-cyan-500` |
| `border-app-primary/60` | ~3 | ❌ → `border-cyan-500/60` |
| `border-app-primary-muted` | ~1 | ❌ → `border-cyan-900` |
| `accent-app-primary` | ~3 | ❌ → `accent-cyan-500` |
| `focus:ring-app-primary/20` | ~4 | ❌ → `focus:ring-cyan-500/20` |
| `focus:ring-offset-app-primary-muted` | ~4 | ❌ → `focus:ring-offset-cyan-950` |

**Total Deprecated Classes:** ~68 instances
**Total Kept (border-border-default):** ~21 instances

---

### By Priority Level

**CRITICAL (breaks functionality):**
- `src/components/nodes/base-node-wrapper.tsx` - Affects ALL nodes
- `src/components/ui/input.tsx` - Affects ALL form inputs
- Total: 2 files

**HIGH (significant visual issues):**
- `src/components/nodes/code-node.tsx` - Syntax highlighting
- `src/components/nodes/comment-node.tsx` - Comment system
- `src/components/nodes/text-node.tsx` - Default node type
- `src/components/nodes/components/comment-thread-list.tsx` - Thread display
- `src/components/nodes/components/comment-reply-input.tsx` - Reply input
- `src/components/ui/card.tsx` - Used throughout app
- `src/components/ui/popover.tsx` - Floating UI
- `src/components/ui/dialog.tsx` - Modal dialogs
- `src/components/ui/dropdown-menu.tsx` - Dropdown menus
- `src/components/ui/textarea.tsx` - Multi-line inputs
- `src/components/context-menu/context-menu.tsx` - Context menu system
- `src/components/context-menu/context-menu-item.tsx` - Menu items
- `src/components/toolbar.tsx` - Main toolbar
- Total: 13 files

**MEDIUM (cosmetic/minor issues):**
- `src/components/nodes/question-node.tsx`
- `src/components/nodes/question-node/multiple-choice-response.tsx`
- `src/components/nodes/question-node/binary-response.tsx`
- `src/components/nodes/components/comment-reactions.tsx`
- `src/components/ui/hover-card.tsx`
- `src/components/ui/sheet.tsx`
- `src/components/ui/checkbox.tsx`
- `src/components/ui/tag-input.tsx`
- `src/components/context-menu/edge-style-selector.tsx`
- `src/components/realtime/collaborator-profile-card.tsx`
- Total: 10 files

---

### Implementation Order (Recommended)

**Phase 1 - Critical Infrastructure (Day 1):**
1. `src/components/nodes/base-node-wrapper.tsx` - Blocks all node rendering
2. `src/components/ui/input.tsx` - Blocks all form inputs
3. `src/components/ui/textarea.tsx` - Blocks multi-line inputs

**Phase 2 - High-Visibility Components (Day 1-2):**
4. `src/components/nodes/code-node.tsx` - Syntax highlighting
5. `src/components/nodes/text-node.tsx` - Most common node type
6. `src/components/nodes/comment-node.tsx` - Comment system core
7. `src/components/nodes/components/comment-thread-list.tsx`
8. `src/components/nodes/components/comment-reply-input.tsx`
9. `src/components/ui/card.tsx` - Used everywhere
10. `src/components/ui/dialog.tsx` - Modal dialogs
11. `src/components/ui/dropdown-menu.tsx` - Dropdown menus
12. `src/components/ui/popover.tsx` - Floating UI

**Phase 3 - Context Menu & Toolbar (Day 2):**
13. `src/components/context-menu/context-menu.tsx`
14. `src/components/context-menu/context-menu-item.tsx`
15. `src/components/toolbar.tsx`

**Phase 4 - Remaining Components (Day 2-3):**
16. All MEDIUM priority files (10 files)

**Phase 5 - Verification & Testing (Day 3):**
17. Visual regression testing
18. Dark mode verification
19. Accessibility checks

---

## Notes for Implementation

### Common Patterns Observed

**Text Color Hierarchy:**
- `text-text-high` (primary) → `text-neutral-50` or `text-white`
- `text-text-medium` (secondary) → `text-neutral-300`
- `text-text-disabled` (tertiary) → `text-neutral-500`
- `text-text-low` (muted) → `text-neutral-600`

**Background Elevation:**
- `bg-elevation-0` (deepest) → `bg-neutral-950`
- `bg-elevation-1` (base) → `bg-neutral-900`
- `bg-elevation-2` (raised) → `bg-neutral-800`
- `bg-elevation-4` (elevated) → `bg-neutral-850` (custom)
- `bg-elevation-16` (modal) → `bg-neutral-800/95` (with transparency)
- `bg-elevation-24` (popover) → `bg-neutral-900/95` (with transparency)

**Border Semantics:**
- `border-border-default` → Keep as-is (exists in new system)
- `border-border-hover` → `border-neutral-600`

**App Primary (Brand Color):**
- `bg-app-primary` → `bg-cyan-500`
- `border-app-primary/60` → `border-cyan-500/60`
- `border-app-primary-muted` → `border-cyan-900`
- `accent-app-primary` → `accent-cyan-500`
- `focus:ring-app-primary/20` → `focus:ring-cyan-500/20`
- `focus:ring-offset-app-primary-muted` → `focus:ring-offset-cyan-950`

**Status Colors:**
- `text-status-error` → `text-error-500` or `text-red-500`
- `text-status-complete` → `text-success-500` or `text-green-500`
- `text-status-default` → `text-neutral-400`

### Search & Replace Considerations

**Safe to batch replace:**
- `text-text-high` → `text-neutral-50` (28 instances)
- `text-text-medium` → `text-neutral-300` (18 instances)
- `text-text-disabled` → `text-neutral-500` (13 instances)
- `bg-app-primary` → `bg-cyan-500` (3 instances)
- `accent-app-primary` → `accent-cyan-500` (3 instances)

**Requires manual verification:**
- `bg-elevation-*` classes (context-dependent, some need transparency)
- `border-border-*` classes (verify which exist in new system)
- `text-status-*` classes (map to semantic or color tokens)

**CSS Variable References:**
- Line 32 in `text-node.tsx`: `var(--text-text-high)` → Update inline style
- Line 255 in `code-node.tsx`: `var(--color-elevation-0)` → Update inline style
- Line 259 in `code-node.tsx`: `var(--color-text-disabled)` → Update inline style

---

## Related Files (Not in Scope)

The following files likely contain deprecated classes but were not included in this analysis:

- `src/components/dashboard/**/*.tsx` (dashboard components)
- `src/components/sharing/**/*.tsx` (sharing components)
- `src/components/subscription/**/*.tsx` (subscription UI)
- `src/components/onboarding/**/*.tsx` (onboarding flow)
- `src/components/ai-chat/**/*.tsx` (AI chat interface)
- `src/components/auth/**/*.tsx` (authentication UI)
- `src/components/modals/**/*.tsx` (modal components)
- `src/app/**/*.tsx` (page components)

These should be cataloged in a separate pass or included in Part 3 (Migration Mappings).

---

## Next Steps

1. **Review Part 3** - [Migration Mappings](./css-migration-03-mappings.md) for detailed before/after code examples
2. **Execute Phase 1** - Fix CRITICAL files first (base-node-wrapper, input, textarea)
3. **Visual Testing** - Compare before/after screenshots for each component
4. **Type Checking** - Run `pnpm type-check` after each phase
5. **Build Verification** - Run `pnpm build` after each phase

---

**Document Version:** 1.0
**Last Updated:** 2025-11-07
**Status:** Complete - Ready for Part 3 (Migration Mappings)
