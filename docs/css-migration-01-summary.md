# CSS Migration: OKLCH Color System Refactor
## Executive Summary & Critical Issues

---

## Executive Summary

A comprehensive CSS refactor has been completed to consolidate the application's color system from scattered component-specific tokens to a unified OKLCH-based design system defined in `src/app/globals.css`.

### Scope Overview
- **Files Affected:** 23 component files across the codebase
- **Primary Change:** Migration from custom CSS variables (e.g., `--color-text-high`, `--color-elevation-*`) to new semantic tokens (e.g., `--color-text-primary`, `--color-bg-base`)
- **New Color System:** OKLCH color space with 5 semantic scales (Neutral, Primary, Success, Warning, Error) + 15 semantic tokens for dark mode
- **Impact Level:** High - Multiple critical inline style breaks and Tailwind class naming inconsistencies

### Key Statistics
- ❌ **3 Critical Inline Style Breaks** - Direct variable references that will render as empty/undefined
- ⚠️ **20 Files with Tailwind Class Issues** - Incorrect class names that don't map to the new tokens
- ✅ **New Token System** - Fully backward-compatible semantic naming convention
- 📊 **Color Scales:** 5 base scales × 10 stops + 15 semantic tokens = 65 total CSS custom properties

### Migration Type
**Breaking Change** - All component code must be updated to use new token names. Old tokens no longer exist in `globals.css`.

---

## Critical Issues

### Priority 1: Inline Style Breaks (Render-Blocking)

These issues prevent proper rendering due to undefined CSS variables in inline `style` props.

#### 1. code-node.tsx (CRITICAL - 15 Issues)

**File:** `src/components/nodes/code-node.tsx`

**Severity:** Critical - Syntax highlighter and UI controls will fail to render with correct styling

**Issues Identified:**

| Line(s) | Current Variable | Status | Replacement | Component |
|---------|-----------------|--------|-------------|-----------|
| 15-16 | `var(--color-text-high)` | ❌ Broken | `var(--color-text-primary)` | Pre tag color |
| 15-16 | `var(--color-elevation-sunken)` | ❌ Broken | `var(--color-bg-base)` | Pre tag background |
| 21, 69 | `var(--color-border-default)` | ✅ Valid | No change | Border color |
| 26 | `var(--color-text-high)` | ❌ Broken | `var(--color-text-primary)` | Code tag text |
| 30-33 | `var(--color-text-disabled)` | ❌ Broken | `var(--color-text-disabled)` | Comment colors (token exists) |
| 35 | `var(--color-text-medium)` | ❌ Broken | `var(--color-text-secondary)` | Punctuation color |
| 72 | `var(--color-text-disabled)` | ❌ Broken | `var(--color-text-disabled)` | Line numbers (token exists) |
| 117-118 | `var(--color-elevation-4)` | ❌ Broken | `var(--color-bg-elevated)` | Toast success background |
| 127-128 | `var(--color-elevation-4)` | ❌ Broken | `var(--color-bg-elevated)` | Toast error background |
| 201 | `var(--color-border-hover)` | ❌ Broken | `var(--color-border-strong)` | Copy button border |
| 255, 259 | `var(--color-elevation-0)` | ❌ Broken | `var(--color-bg-base)` | Code background + line number color |

**Code Blocks with Issues:**

```typescript
// Line 14-24: Syntax highlighter theme object
const customDarkTheme = {
	'pre[class*="language-"]': {
		color: 'var(--color-text-high)',           // ❌ → var(--color-text-primary)
		background: 'var(--color-elevation-sunken)',// ❌ → var(--color-bg-base)
		fontFamily: 'var(--font-geist-mono), monospace',
		fontSize: '13px',
		lineHeight: '1.6',
		letterSpacing: '0.02em',
		border: `1px solid var(--color-border-default)`, // ✅ OK
		borderRadius: '6px',
		padding: '1rem',
	},
	'code[class*="language-"]': {
		color: 'var(--color-text-high)',     // ❌ → var(--color-text-primary)
		background: 'none',
	},
	comment: { color: 'var(--color-text-disabled)' }, // ✅ OK
	punctuation: { color: 'var(--color-text-medium)' }, // ❌ → var(--color-text-secondary)
	// ... more syntax colors
};
```

```typescript
// Line 115-131: Toast notifications (inline styles)
toast.success('Code copied to clipboard!', {
	style: {
		background: 'var(--color-elevation-4)',    // ❌ → var(--color-bg-elevated)
		color: 'var(--color-text-high)',           // ❌ → var(--color-text-primary)
		border: `1px solid rgba(52, 211, 153, 0.3)`,
	},
});
// ... and similar for toast.error()
```

```typescript
// Line 195-202: Copy button styling
style={{
	backgroundColor: copied ? 'rgba(52, 211, 153, 0.1)' : 'transparent',
	borderColor: copied ? 'rgba(52, 211, 153, 0.3)' : `var(--color-border-hover)`, // ❌
}}
```

```typescript
// Line 252-264: SyntaxHighlighter customStyle & lineNumberStyle
customStyle={{
	margin: 0,
	padding: '1rem',
	background: 'var(--color-elevation-0)',  // ❌ → var(--color-bg-base)
	fontSize: '13px',
}}
lineNumberStyle={{
	color: 'var(--color-text-disabled)',    // ✅ OK (exists in new system)
	fontSize: '11px',
	minWidth: '3em',
	paddingRight: '1em',
	userSelect: 'none',
}}
```

**Replacement Summary:**
```javascript
// Find & Replace Map
--color-text-high → --color-text-primary
--color-text-medium → --color-text-secondary
--color-elevation-sunken → --color-bg-base
--color-elevation-0 → --color-bg-base
--color-elevation-4 → --color-bg-elevated
--color-border-hover → --color-border-strong
```

---

#### 2. text-node.tsx (CRITICAL - Typo)

**File:** `src/components/nodes/text-node.tsx`

**Severity:** Critical - Text color will be undefined, breaking text visibility

**Issue:**

| Line | Current Variable | Status | Problem | Replacement |
|------|-----------------|--------|---------|-------------|
| 32 | `var(--text-text-high)` | ❌ Broken | Double "text" typo | `var(--color-text-primary)` |

**Code Block with Issue:**

```typescript
// Line 27-34: Default text color fallback
const {
	fontSize = '14px',
	fontWeight = 400,
	textAlign = 'center',
	textColor = 'var(--text-text-high)',  // ❌ TYPO: --text-text-high should be --color-text-primary
	fontStyle = 'normal',
} = metadata ?? {};
```

**Root Cause:** Incorrect variable name with redundant "text" prefix. Should use new semantic token naming.

**Fix:**
```typescript
textColor = 'var(--color-text-primary)',
```

**Note:** Fallback color on line 39 (`rgba(255, 255, 255, 0.87)`) is correct but should be updated to use the semantic token for consistency.

---

#### 3. comment-reactions.tsx (CRITICAL)

**File:** `src/components/nodes/components/comment-reactions.tsx`

**Severity:** Critical - Emoji picker background will fail to render with intended color

**Issue:**

| Line | Current Variable | Status | Replacement | Usage |
|------|-----------------|--------|-------------|-------|
| 174 | `var(--color-elevation-1)` | ❌ Broken | `var(--color-bg-surface)` | Emoji picker hover background |

**Code Block with Issue:**

```typescript
// Line 148-182: Quick emoji picker motion container
{showEmojiPicker && (
	<motion.div
		// ... animation props
		className='absolute bottom-full mb-2 left-0 flex gap-1 p-2 rounded-lg shadow-lg z-10 bg-elevation-2 border border-border-default'
	>
		{quickEmojis.map((emoji, index) => (
			<motion.button
				// ... animation props
				whileHover={{
					backgroundColor: 'var(--color-elevation-1)',  // ❌ → var(--color-bg-surface)
				}}
				className='size-8 flex items-center justify-center rounded text-lg'
				onClick={() => handleQuickEmojiClick(emoji)}
			>
				{emoji}
			</motion.button>
		))}
	</motion.div>
)}
```

**Impact:** Emoji buttons will have undefined background color on hover, making them appear without visual feedback.

**Fix:**
```typescript
whileHover={{
	backgroundColor: 'var(--color-bg-surface)',
}}
```

---

## Token Mapping Reference

### New Semantic Tokens Available in `globals.css`

```css
/* Backgrounds - Elevation system */
--color-bg-base        /* Darkest background (neutral-900) */
--color-bg-surface     /* Mid background (neutral-800) */
--color-bg-elevated    /* Lighter background with subtle blue tint */
--color-bg-overlay     /* Overlay background with subtle blue tint */

/* Borders */
--color-border-subtle  /* Subtlest border (neutral-800) */
--color-border-default /* Default border (neutral-700) */
--color-border-strong  /* Strong border (neutral-600) */

/* Text Hierarchy */
--color-text-primary   /* Main text (neutral-50) */
--color-text-secondary /* Secondary text (neutral-400) */
--color-text-tertiary  /* Tertiary text (neutral-500) */
--color-text-disabled  /* Disabled state (neutral-600) */

/* Interactive States */
--color-interactive-primary       /* Blue primary action */
--color-interactive-primary-hovered
--color-interactive-primary-pressed
--color-interactive-success       /* Green success state */
--color-interactive-success-hovered
--color-interactive-success-pressed
--color-interactive-warning       /* Amber warning state */
--color-interactive-warning-hovered
--color-interactive-warning-pressed
--color-interactive-error         /* Red error state */
--color-interactive-error-hovered
--color-interactive-error-pressed
```

### Deprecated Tokens (No Longer Available)

```css
/* DO NOT USE - These tokens have been removed */
--color-text-high              /* Use: --color-text-primary */
--color-text-medium            /* Use: --color-text-secondary */
--color-text-disabled          /* Still exists, but verify usage */
--color-elevation-sunken       /* Use: --color-bg-base */
--color-elevation-0            /* Use: --color-bg-base */
--color-elevation-1            /* Use: --color-bg-surface */
--color-elevation-2            /* Use: --color-bg-surface or --color-bg-elevated */
--color-elevation-4            /* Use: --color-bg-elevated */
--color-border-hover           /* Use: --color-border-strong */
```

---

## Impact Assessment

### Rendering Issues (Immediate)
- Code syntax highlighting will display with incorrect colors
- Text nodes may become invisible or hard to read
- Toast notifications will have broken styling
- Emoji reaction picker will lack hover feedback

### User Experience
- Visual hierarchy will be compromised
- Contrast ratios may not meet WCAG AA standards
- Interactive feedback will be missing or inconsistent
- Code readability in light/dark themes will be affected

### Testing Required
- Browser DevTools inspection of computed styles
- Visual regression testing with screenshots
- Contrast checker validation (WCAG AA minimum)
- Cross-browser testing (Chrome, Firefox, Safari, Edge)

---

## Next Steps

1. **Immediate:** Update all 3 critical inline style issues (code-node.tsx, text-node.tsx, comment-reactions.tsx)
2. **Phase 2:** Review remaining 20 files with Tailwind class naming issues
3. **Phase 3:** Add CSS variable validator to pre-commit hooks to prevent future regressions
4. **Phase 4:** Update component documentation with new token usage guidelines

---

**Document Version:** 1.0
**Last Updated:** 2025-11-07
**Migration Status:** In Progress - Critical issues identified, awaiting fixes
