/**
 * Code Syntax Theme
 *
 * Shared syntax highlighting theme and utilities for code rendering.
 * Used by both canvas nodes and preview system.
 */

/**
 * Custom dark theme optimized for readability.
 * Uses CSS variables for consistent theming with the rest of the app.
 */
export const codeSyntaxTheme = {
	'pre[class*="language-"]': {
		color: 'var(--color-text-primary)',
		background: 'var(--color-bg-elevated)',
		fontFamily: 'var(--font-geist-mono), monospace',
		fontSize: '13px',
		lineHeight: '1.6',
		letterSpacing: '0.02em',
		padding: '1rem',
	},
	'code[class*="language-"]': {
		color: 'var(--color-text-primary)',
		background: 'none',
	},
	// Syntax colors - desaturated for dark theme
	comment: { color: 'var(--color-text-tertiary)' },
	prolog: { color: 'var(--color-text-tertiary)' },
	doctype: { color: 'var(--color-text-tertiary)' },
	cdata: { color: 'var(--color-text-tertiary)' },

	punctuation: { color: 'var(--color-text-secondary)' },
	property: { color: 'rgba(147, 197, 253, 0.87)' }, // Desaturated blue
	tag: { color: 'rgba(239, 68, 68, 0.87)' }, // Desaturated red
	boolean: { color: 'rgba(251, 191, 36, 0.87)' }, // Desaturated amber
	number: { color: 'rgba(251, 191, 36, 0.87)' },
	constant: { color: 'rgba(251, 191, 36, 0.87)' },
	symbol: { color: 'rgba(251, 191, 36, 0.87)' },
	deleted: { color: 'rgba(239, 68, 68, 0.87)' },

	selector: { color: 'rgba(52, 211, 153, 0.87)' }, // Desaturated emerald
	'attr-name': { color: 'rgba(52, 211, 153, 0.87)' },
	string: { color: 'rgba(52, 211, 153, 0.87)' },
	char: { color: 'rgba(52, 211, 153, 0.87)' },
	builtin: { color: 'rgba(52, 211, 153, 0.87)' },
	inserted: { color: 'rgba(52, 211, 153, 0.87)' },

	operator: { color: 'rgba(167, 139, 250, 0.87)' }, // Desaturated violet
	entity: { color: 'rgba(167, 139, 250, 0.87)' },
	url: { color: 'rgba(167, 139, 250, 0.87)' },
	variable: { color: 'rgba(167, 139, 250, 0.87)' },

	atrule: { color: 'rgba(251, 191, 36, 0.87)' },
	'attr-value': { color: 'rgba(147, 197, 253, 0.87)' },
	function: { color: 'rgba(251, 146, 60, 0.87)' }, // Desaturated orange
	'class-name': { color: 'rgba(251, 146, 60, 0.87)' },

	keyword: { color: 'rgba(167, 139, 250, 0.87)' },
	regex: { color: 'rgba(251, 191, 36, 0.87)' },
	important: { color: 'rgba(239, 68, 68, 0.87)', fontWeight: 'bold' },
	bold: { fontWeight: 'bold' },
	italic: { fontStyle: 'italic' },

	// Line numbers
	'.line-numbers .line-numbers-rows': {
		borderRight: `1px solid var(--color-border-default)`,
	},
	'.line-numbers-rows > span:before': {
		color: 'var(--color-text-tertiary)',
	},
};

/**
 * Language icon mapping.
 * Returns an emoji icon for the given programming language.
 */
export const LANGUAGE_ICONS: Record<string, string> = {
	javascript: '🟨',
	typescript: '🔷',
	python: '🐍',
	java: '☕',
	rust: '🦀',
	go: '🐹',
	cpp: '⚙️',
	csharp: '🎯',
	html: '🌐',
	css: '🎨',
	sql: '💾',
	bash: '🖥️',
	jsx: '⚛️',
	tsx: '⚛️',
};

/**
 * Get language icon for display.
 * Falls back to a generic document icon for unknown languages.
 */
export function getLanguageIcon(language: string): string {
	return LANGUAGE_ICONS[language.toLowerCase()] || '📄';
}
