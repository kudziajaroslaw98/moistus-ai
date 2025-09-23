/**
 * Node Editor Theme - Consistent styling for CodeMirror
 * Provides unified visual design across all editor features
 */

import { EditorView } from '@codemirror/view';

/**
 * Color palette for the node editor
 */
const colors = {
	// Base colors
	background: '#ffffff',
	foreground: '#1f2937',
	selection: '#dbeafe',
	cursor: '#3b82f6',

	// Pattern colors (matching our new prefix system)
	tag: '#7c3aed', // Purple for #tags
	assignee: '#ea580c', // Orange for @people
	date: '#059669', // Green for ^dates
	priority: {
		high: '#dc2626', // Red for !!!
		medium: '#f59e0b', // Amber for !!
		low: '#10b981', // Emerald for !
	},
	status: '#3b82f6', // Blue for :status
	reference: '#8b5cf6', // Violet for [[references]]
	color: '#db2777', // Pink for color:value
	nodeType: '#0ea5e9', // Sky blue for $nodeType
	command: '#14b8a6', // Teal for /commands

	// Validation colors
	error: '#dc2626',
	warning: '#f59e0b',
	info: '#3b82f6',
	success: '#10b981',

	// UI colors
	border: '#e5e7eb',
	hover: '#f3f4f6',
	focus: '#60a5fa',
	disabled: '#9ca3af',

	// Dark mode colors (for future use)
	dark: {
		background: '#1f2937',
		foreground: '#f3f4f6',
		selection: '#374151',
		border: '#374151',
		hover: '#4b5563',
	},
};

/**
 * Font configuration
 */
const fonts = {
	mono: 'ui-monospace, "SF Mono", "Monaco", "Inconsolata", "Fira Code", monospace',
	sans: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
	size: {
		base: '14px',
		small: '12px',
		large: '16px',
	},
	lineHeight: {
		base: '1.6',
		compact: '1.4',
		relaxed: '1.8',
	},
};

/**
 * Spacing configuration
 */
const spacing = {
	xs: '2px',
	sm: '4px',
	md: '8px',
	lg: '12px',
	xl: '16px',
	xxl: '24px',
};

/**
 * Border radius configuration
 */
const radius = {
	sm: '3px',
	md: '6px',
	lg: '8px',
	full: '9999px',
};

/**
 * Shadow configuration
 */
const shadows = {
	sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
	md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
	lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
	focus: `0 0 0 3px ${colors.focus}33`,
};

/**
 * Main theme extension for CodeMirror
 */
export const nodeEditorTheme = EditorView.theme({
	// Editor container
	'&': {
		fontSize: fonts.size.base,
		fontFamily: fonts.sans,
		color: colors.foreground,
		backgroundColor: colors.background,
	},

	// Content area
	'.cm-content': {
		padding: spacing.lg,
		lineHeight: fonts.lineHeight.base,
		fontFamily: fonts.sans,
		caretColor: colors.cursor,
	},

	// Scroller
	'.cm-scroller': {
		fontFamily: 'inherit',
	},

	// Focus state
	'&.cm-editor.cm-focused': {
		outline: 'none',
	},

	'&.cm-focused .cm-content': {
		outline: 'none',
	},

	// Cursor
	'.cm-cursor, .cm-dropCursor': {
		borderLeftColor: colors.cursor,
		borderLeftWidth: '2px',
	},

	// Selection
	'&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
		{
			backgroundColor: colors.selection,
		},

	// Line highlight
	'.cm-activeLine': {
		backgroundColor: `${colors.hover}66`,
	},

	'.cm-activeLineGutter': {
		backgroundColor: colors.hover,
	},

	// Gutters
	'.cm-gutters': {
		backgroundColor: colors.background,
		borderRight: `1px solid ${colors.border}`,
		color: colors.disabled,
	},

	'.cm-gutter': {
		minWidth: '40px',
	},

	'.cm-lineNumbers .cm-gutterElement': {
		padding: `0 ${spacing.sm}`,
		minWidth: '30px',
	},

	// Fold markers
	'.cm-foldGutter .cm-gutterElement': {
		cursor: 'pointer',
		padding: `0 ${spacing.xs}`,
	},

	'.cm-foldPlaceholder': {
		backgroundColor: colors.hover,
		border: `1px solid ${colors.border}`,
		borderRadius: radius.sm,
		padding: `0 ${spacing.sm}`,
		margin: `0 ${spacing.xs}`,
	},

	// Panels
	'.cm-panels': {
		backgroundColor: colors.background,
		borderTop: `1px solid ${colors.border}`,
	},

	'.cm-panels.cm-panels-top': {
		borderBottom: `1px solid ${colors.border}`,
		borderTop: 'none',
	},

	'.cm-panel': {
		padding: spacing.md,
	},

	// Search
	'.cm-searchMatch': {
		backgroundColor: '#fef3c7',
		outline: '1px solid #fbbf24',
	},

	'.cm-searchMatch-selected': {
		backgroundColor: '#fde047',
	},

	// Tooltips
	'.cm-tooltip': {
		backgroundColor: colors.background,
		border: `1px solid ${colors.border}`,
		borderRadius: radius.md,
		boxShadow: shadows.lg,
		padding: spacing.sm,
	},

	'.cm-tooltip-autocomplete': {
		'& > ul': {
			fontFamily: fonts.sans,
			maxHeight: '200px',
			overflowY: 'auto',
			listStyle: 'none',
			margin: 0,
			padding: 0,
		},
		'& > ul > li': {
			padding: `${spacing.xs} ${spacing.sm}`,
			cursor: 'pointer',
			borderRadius: radius.sm,
		},
		'& > ul > li[aria-selected]': {
			backgroundColor: colors.selection,
			color: colors.foreground,
		},
	},

	// Completion icons
	'.cm-completionIcon': {
		fontSize: '90%',
		width: '16px',
		display: 'inline-block',
		textAlign: 'center',
		marginRight: spacing.xs,
		verticalAlign: 'middle',
	},

	'.cm-completionIcon-keyword': {
		color: colors.tag,
	},

	'.cm-completionIcon-variable': {
		color: colors.assignee,
	},

	'.cm-completionIcon-constant': {
		color: colors.date,
	},

	'.cm-completionIcon-property': {
		color: colors.status,
	},

	'.cm-completionIcon-class': {
		color: colors.nodeType,
	},

	'.cm-completionIcon-function': {
		color: colors.command,
	},

	// Completion details
	'.cm-completionInfo': {
		padding: spacing.md,
		backgroundColor: colors.background,
		borderLeft: `3px solid ${colors.focus}`,
		fontSize: fonts.size.small,
		maxWidth: '300px',
	},

	// Diagnostic decorations
	'.cm-diagnostic': {
		padding: `${spacing.xs} ${spacing.md}`,
		marginLeft: spacing.sm,
		fontSize: fonts.size.small,
	},

	'.cm-diagnostic-error': {
		borderLeft: `3px solid ${colors.error}`,
	},

	'.cm-diagnostic-warning': {
		borderLeft: `3px solid ${colors.warning}`,
	},

	'.cm-diagnostic-info': {
		borderLeft: `3px solid ${colors.info}`,
	},

	// Brackets
	'.cm-matchingBracket': {
		backgroundColor: `${colors.success}30`,
		outline: `1px solid ${colors.success}`,
	},

	'.cm-nonmatchingBracket': {
		backgroundColor: `${colors.error}30`,
		outline: `1px solid ${colors.error}`,
	},

	// Special characters
	'.cm-specialChar': {
		color: colors.error,
	},

	'.cm-tab': {
		display: 'inline-block',
		overflow: 'hidden',
		verticalAlign: 'bottom',
		position: 'relative',
		'&:before': {
			content: '"→"',
			position: 'absolute',
			opacity: 0.3,
		},
	},

	'.cm-trailingSpace': {
		backgroundColor: `${colors.error}20`,
	},

	// Placeholder
	'.cm-placeholder': {
		color: colors.disabled,
		fontStyle: 'italic',
	},

	// Button styles (for widgets)
	'.cm-button': {
		backgroundColor: colors.background,
		backgroundImage: 'none',
		border: `1px solid ${colors.border}`,
		borderRadius: radius.sm,
		padding: `${spacing.xs} ${spacing.md}`,
		color: colors.foreground,
		cursor: 'pointer',
		fontSize: fonts.size.small,
		'&:hover': {
			backgroundColor: colors.hover,
		},
		'&:focus': {
			outline: 'none',
			boxShadow: shadows.focus,
		},
	},

	// Text input (for widgets)
	'.cm-textfield': {
		backgroundColor: colors.background,
		backgroundImage: 'none',
		border: `1px solid ${colors.border}`,
		borderRadius: radius.sm,
		padding: `${spacing.xs} ${spacing.sm}`,
		color: colors.foreground,
		fontSize: fonts.size.base,
		'&:focus': {
			outline: 'none',
			borderColor: colors.focus,
			boxShadow: shadows.focus,
		},
	},

	// Panel buttons
	'.cm-panel button': {
		fontSize: fonts.size.small,
	},

	'.cm-panel input[type=checkbox]': {
		marginRight: spacing.xs,
	},
});

/**
 * Export commonly used style values for consistency
 */
export const themeConfig = {
	colors,
	fonts,
	spacing,
	radius,
	shadows,
};

/**
 * Helper function to create a custom theme variant
 */
export function createThemeVariant(
	overrides: Partial<typeof colors>
): typeof nodeEditorTheme {
	const mergedColors = { ...colors, ...overrides };

	// Return a new theme with overridden colors
	return EditorView.theme({
		// ... same structure as above but with mergedColors
		// This is a template for future custom themes
	});
}

/**
 * Dark theme variant (for future use)
 */
export const darkNodeEditorTheme = EditorView.theme({
	'&': {
		backgroundColor: colors.dark.background,
		color: colors.dark.foreground,
	},
	'.cm-content': {
		backgroundColor: colors.dark.background,
		color: colors.dark.foreground,
	},
	'.cm-gutters': {
		backgroundColor: colors.dark.background,
		borderRightColor: colors.dark.border,
	},
	// ... additional dark theme overrides
});
