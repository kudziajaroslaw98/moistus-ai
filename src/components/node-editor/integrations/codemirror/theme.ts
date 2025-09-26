/**
 * CodeMirror Theme for Node Editor
 * Single comprehensive theme for all CodeMirror instances in the app
 */

import { EditorView } from '@codemirror/view';

// ============================================================================
// SINGLE NODE EDITOR THEME
// ============================================================================

/**
 * Comprehensive dark theme for all node editor CodeMirror instances
 * Includes editor styling, autocompletion dropdown, and all completion categories
 */
export const nodeEditorTheme = EditorView.theme(
	{
		// ========================================
		// EDITOR BASE STYLING
		// ========================================
		'&': {
			fontSize: '16px',
			fontFamily: 'inherit',
			color: 'rgb(244 244 245)',
		},
		'.cm-content': {
			minHeight: '60px',
			maxHeight: '216px',
			padding: '12px',
			backgroundColor: 'rgba(24, 24, 27, 0.5)',
			color: 'rgb(212, 212, 216)',
			border: '1px solid rgb(39, 39, 42)',
			borderRadius: '6px',
			outline: 'none',
			wordWrap: 'break-word',
			overflowWrap: 'break-word',
			whiteSpace: 'pre-wrap',
		},
		'.cm-focused .cm-content': {
			outline: 'none',
			borderColor: 'rgb(20, 184, 166)',
			boxShadow: '0 0 0 1px rgb(20, 184, 166)',
		},
		'.cm-editor': {
			borderRadius: '6px',
			backgroundColor: 'transparent',
		},
		'.cm-scroller': {
			fontFamily: 'inherit',
			lineHeight: '1.4',
		},

		// ========================================
		// AUTOCOMPLETION DROPDOWN STYLING
		// ========================================

		// Force z-index on all tooltip containers
		'.cm-tooltip-autocomplete.cm-tooltip': {
			backgroundColor: 'rgba(9, 9, 11, 0.95) !important',
			border: '1px solid rgba(39, 39, 42, 0.8) !important',
			borderRadius: '12px !important',
			color: 'rgb(244, 244, 245) !important',
			fontSize: '14px !important',
			boxShadow:
				'0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2) !important',
			backdropFilter: 'blur(16px) !important',
			maxHeight: '400px !important',
			height: 'auto !important',
			minWidth: '320px !important',
			width: '320px !important',
			padding: '8px !important',
		},
		'.cm-tooltip-autocomplete': {
			// Smooth entry animation
			animation: 'slideDown 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
		},

		// Entry animation keyframes
		'@keyframes slideDown': {
			from: {
				opacity: '0',
				transform: 'translateY(-8px)',
			},
			to: {
				opacity: '1',
				transform: 'translateY(0)',
			},
		},

		// Dropdown list styling
		'.cm-tooltip-autocomplete.cm-tooltip > ul, .cm-tooltip.cm-tooltip-autocomplete > ul':
			{
				maxHeight: '400px !important',
				overflowY: 'auto !important',
				padding: '4px !important',
				margin: '0 !important',
				listStyle: 'none !important',
				backgroundColor: 'transparent !important',
			},
		'.cm-tooltip-autocomplete ul': {
			overflowX: 'hidden',
			height: 'auto',
			scrollBehavior: 'smooth',
			scrollbarWidth: 'thin',
			scrollbarColor: 'rgba(161, 161, 170, 0.3) transparent',
		},
		'.cm-tooltip-autocomplete ul::-webkit-scrollbar': {
			width: '6px',
		},
		'.cm-tooltip-autocomplete ul::-webkit-scrollbar-track': {
			background: 'transparent',
		},
		'.cm-tooltip-autocomplete ul::-webkit-scrollbar-thumb': {
			background: 'rgba(161, 161, 170, 0.3)',
			borderRadius: '3px',
		},
		'.cm-tooltip-autocomplete ul::-webkit-scrollbar-thumb:hover': {
			background: 'rgba(161, 161, 170, 0.5)',
		},

		// List item styling
		'.cm-tooltip-autocomplete.cm-tooltip ul > li, .cm-tooltip.cm-tooltip-autocomplete ul > li':
			{
				padding: '10px 16px !important',
				borderRadius: '8px !important',
				margin: '2px !important',
				transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important',
				fontWeight: '500 !important',
				lineHeight: '1.5 !important',
				backgroundColor: 'transparent !important',
				border: 'none !important',
				color: 'rgb(244, 244, 245) !important',
			},
		'.cm-tooltip-autocomplete ul li': {
			cursor: 'pointer',
			display: 'flex',
			alignItems: 'center',
			gap: '8px',
			position: 'relative',
			minHeight: '34px',
			boxShadow: 'none',
		},

		// Selected/hover states
		'.cm-tooltip-autocomplete.cm-tooltip ul > li[aria-selected="true"], .cm-tooltip.cm-tooltip-autocomplete ul > li[aria-selected="true"]':
			{
				backgroundColor: 'rgba(20, 184, 166, 0.15) !important',
				color: 'rgb(244, 244, 245) !important',
				border: '1px solid rgba(20, 184, 166, 0.3) !important',
				transform: 'translateX(2px) !important',
				boxShadow: '0 4px 6px -1px rgba(20, 184, 166, 0.1) !important',
			},
		'.cm-tooltip-autocomplete ul li[aria-selected]': {
			fontWeight: '500',
		},
		'.cm-tooltip-autocomplete ul li[aria-selected]::before': {
			content: '""',
			position: 'absolute',
			left: '4px',
			top: '50%',
			transform: 'translateY(-50%)',
			width: '2px',
			height: '50%',
			backgroundColor: 'rgb(59, 130, 246)',
			borderRadius: '1px',
		},
		'.cm-tooltip-autocomplete.cm-tooltip ul > li:hover, .cm-tooltip.cm-tooltip-autocomplete ul > li:hover':
			{
				backgroundColor: 'rgba(63, 63, 70, 0.5) !important',
			},
		'.cm-tooltip-autocomplete ul li:hover:not([aria-selected])': {
			backgroundColor: 'rgba(55, 65, 81, 0.4)',
			border: '1px solid rgba(75, 85, 99, 0.6)',
			color: 'rgb(243, 244, 246)',
			transform: 'none',
			boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.08)',
		},
		'.cm-tooltip-autocomplete-disabled': {
			opacity: '0.5',
		},

		// ========================================
		// COMPLETION CONTENT STYLING
		// ========================================

		// Labels and details
		'.cm-completionLabel': {
			color: 'inherit',
			fontWeight: 'inherit',
			display: 'flex',
			alignItems: 'center',
			gap: '8px',
			flex: '1',
			fontSize: '13px',
			fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Fira Code", monospace',
			letterSpacing: '-0.01em',
		},
		'.cm-completionDetail': {
			color: 'rgba(161, 161, 170, 0.8)',
			fontSize: '11px',
			marginLeft: 'auto',
			paddingLeft: '8px',
			lineHeight: '1.4',
			fontWeight: '400',
			opacity: '0.9',
			maxWidth: '200px',
			textOverflow: 'ellipsis',
			overflow: 'hidden',
			whiteSpace: 'nowrap',
		},
		'.cm-completionMatchedText': {
			backgroundColor: 'transparent',
			color: 'rgb(147, 197, 253)',
			fontWeight: '600',
			borderBottom: '1px solid rgba(59, 130, 246, 0.6)',
			position: 'relative',
		},

		// ========================================
		// COMPLETION CATEGORY STYLING
		// ========================================

		// Section styling with accent colors
		'.completion-section-node-types': {
			borderLeft: '3px solid rgb(20 184 166)',
			backgroundColor: 'rgba(20, 184, 166, 0.08)',
		},
		'.completion-section-patterns': {
			borderLeft: '3px solid rgb(99 102 241)',
			backgroundColor: 'rgba(99, 102, 241, 0.08)',
		},
		'.completion-section-formatting': {
			borderLeft: '3px solid rgb(245 158 11)',
			backgroundColor: 'rgba(245, 158, 11, 0.08)',
		},
		'.completion-section-templates': {
			borderLeft: '3px solid rgb(139 92 246)',
			backgroundColor: 'rgba(139, 92, 246, 0.08)',
		},
		'.completion-section-referenced-nodes': {
			borderLeft: '3px solid rgb(236, 72, 153)',
			backgroundColor: 'rgba(236, 72, 153, 0.08)',
		},

		// Pattern-specific completion type icons
		'.completion-type-keyword::before': {
			content: '"📅"',
			marginRight: '4px',
			fontSize: '12px',
		},
		'.completion-type-variable::before': {
			content: '"🔥"',
			marginRight: '4px',
			fontSize: '12px',
		},
		'.completion-type-property::before': {
			content: '"🎨"',
			marginRight: '4px',
			fontSize: '12px',
		},
		'.completion-type-type::before': {
			content: '"🏷️"',
			marginRight: '4px',
			fontSize: '12px',
		},
		'.completion-type-function::before': {
			content: '"👤"',
			marginRight: '4px',
			fontSize: '12px',
		},

		// Remove emoji icons for color completions since they have swatches
		'.completion-category-colors.completion-type-property::before': {
			display: 'none',
		},

		// ========================================
		// REFERENCE COMPLETION SPECIFIC STYLING
		// ========================================

		// Reference completion tooltip
		'.reference-completion-tooltip': {
			borderLeft: '4px solid rgb(236, 72, 153) !important',
			background:
				'linear-gradient(135deg, rgba(236, 72, 153, 0.12) 0%, rgba(9, 9, 11, 0.95) 25%) !important',
		},

		// Reference completion items
		'.reference-completion-item': {
			position: 'relative',
			borderLeft: '2px solid rgba(236, 72, 153, 0.3)',
			paddingLeft: '14px !important',
		},
		'.reference-completion-item::before': {
			content: '"🔗"',
			position: 'absolute',
			left: '6px',
			top: '50%',
			transform: 'translateY(-50%)',
			fontSize: '14px',
			opacity: '0.8',
		},
		'.reference-completion-item:hover::before': {
			opacity: '1',
		},
		'.reference-completion-item[aria-selected="true"]': {
			borderLeft: '3px solid rgb(236, 72, 153) !important',
			backgroundColor: 'rgba(236, 72, 153, 0.15) !important',
		},
		'.reference-completion-item[aria-selected="true"]::before': {
			opacity: '1',
			fontSize: '15px',
		},

		// Reference completion content styling
		'.reference-completion-item .cm-completionLabel': {
			fontWeight: '500',
			color: 'rgb(253, 224, 71)',
		},
		'.reference-completion-item .cm-completionDetail': {
			color: 'rgba(236, 72, 153, 0.9)',
			fontSize: '12px',
			fontWeight: '600',
		},
		'.reference-completion-item[aria-selected="true"] .cm-completionDetail': {
			color: 'rgb(244, 114, 182)',
		},

		// Loading state for reference search
		'.reference-search-loading': {
			opacity: '0.7',
			position: 'relative',
		},
		'.reference-search-loading::after': {
			content: '""',
			position: 'absolute',
			top: '50%',
			right: '12px',
			transform: 'translateY(-50%)',
			width: '12px',
			height: '12px',
			border: '2px solid rgba(236, 72, 153, 0.3)',
			borderTop: '2px solid rgb(236, 72, 153)',
			borderRadius: '50%',
			animation: 'spin 1s linear infinite',
		},

		// Spin animation for loading indicator
		'@keyframes spin': {
			'0%': { transform: 'translateY(-50%) rotate(0deg)' },
			'100%': { transform: 'translateY(-50%) rotate(360deg)' },
		},

		// Category-specific styling
		'.completion-category-quick': {
			borderLeft: '3px solid rgb(34 197 94)',
			backgroundColor: 'rgba(34, 197, 94, 0.05)',
		},
		'.completion-category-priority': {
			borderLeft: '3px solid rgb(239 68 68)',
			backgroundColor: 'rgba(239, 68, 68, 0.05)',
		},
		'.completion-category-basic': {
			borderLeft: '3px solid rgb(59 130 246)',
			backgroundColor: 'rgba(59, 130, 246, 0.05)',
		},
		'.completion-category-status': {
			borderLeft: '3px solid rgb(251 191 36)',
			backgroundColor: 'rgba(251, 191, 36, 0.05)',
		},
		'.completion-category-work': {
			borderLeft: '3px solid rgb(168 85 247)',
			backgroundColor: 'rgba(168, 85, 247, 0.05)',
		},
		'.completion-category-special': {
			borderLeft: '3px solid rgb(14 165 233)',
			backgroundColor: 'rgba(14, 165, 233, 0.05)',
		},

		// Color completion specific styling
		'.completion-item-color': {
			display: 'flex',
			alignItems: 'center',
			gap: '8px',
			width: '100%',
		},
		'.color-swatch': {
			width: '16px',
			height: '16px',
			borderRadius: '3px',
			flexShrink: '0',
			boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
		},

		// ========================================
		// SECTION HEADER STYLING
		// ========================================

		// Target completion-section elements directly with maximum specificity
		'completion-section': {
			display: 'list-item !important',
			padding: '8px 16px 6px 16px !important',
			margin: '4px 0 2px 0 !important',
			fontSize: '11px !important',
			fontWeight: '600 !important',
			textTransform: 'uppercase !important',
			letterSpacing: '0.8px !important',
			color: 'rgba(161, 161, 170, 0.85) !important',
			backgroundColor: 'rgba(24, 24, 27, 0.4) !important',
			borderBottom: 'none !important', // Remove default silver border
			borderRadius: '4px !important',
			position: 'relative !important',
			userSelect: 'none !important',
			cursor: 'default !important',
			listStyleType: 'none !important',
		},

		// Multiple selectors for maximum coverage
		'& completion-section': {
			display: 'list-item !important',
			padding: '8px 16px 6px 16px !important',
			margin: '4px 0 2px 0 !important',
			fontSize: '11px !important',
			fontWeight: '600 !important',
			textTransform: 'uppercase !important',
			letterSpacing: '0.8px !important',
			color: 'rgba(161, 161, 170, 0.85) !important',
			backgroundColor: 'rgba(24, 24, 27, 0.4) !important',
			borderBottom: 'none !important',
			borderRadius: '4px !important',
			position: 'relative !important',
			userSelect: 'none !important',
			cursor: 'default !important',
			listStyleType: 'none !important',
		},

		// Target within tooltip context
		'.cm-tooltip completion-section': {
			display: 'list-item !important',
			padding: '8px 16px 6px 16px !important',
			margin: '4px 0 2px 0 !important',
			fontSize: '11px !important',
			fontWeight: '600 !important',
			textTransform: 'uppercase !important',
			letterSpacing: '0.8px !important',
			color: 'rgba(161, 161, 170, 0.85) !important',
			backgroundColor: 'rgba(24, 24, 27, 0.4) !important',
			borderBottom: 'none !important',
			borderRadius: '4px !important',
			position: 'relative !important',
			userSelect: 'none !important',
			cursor: 'default !important',
			listStyleType: 'none !important',
		},

		// Pseudo-element styling for custom separator
		'completion-section::after': {
			content: '""',
			position: 'absolute',
			bottom: '-1px',
			left: '8px',
			right: '8px',
			height: '1px',
			background:
				'linear-gradient(90deg, transparent 0%, rgba(161, 161, 170, 0.25) 15%, rgba(161, 161, 170, 0.4) 50%, rgba(161, 161, 170, 0.25) 85%, transparent 100%)',
			borderRadius: '0.5px',
		},

		'& completion-section::after': {
			content: '""',
			position: 'absolute',
			bottom: '-1px',
			left: '8px',
			right: '8px',
			height: '1px',
			background:
				'linear-gradient(90deg, transparent 0%, rgba(161, 161, 170, 0.25) 15%, rgba(161, 161, 170, 0.4) 50%, rgba(161, 161, 170, 0.25) 85%, transparent 100%)',
			borderRadius: '0.5px',
		},

		'.cm-tooltip completion-section::after': {
			content: '""',
			position: 'absolute',
			bottom: '-1px',
			left: '8px',
			right: '8px',
			height: '1px',
			background:
				'linear-gradient(90deg, transparent 0%, rgba(161, 161, 170, 0.25) 15%, rgba(161, 161, 170, 0.4) 50%, rgba(161, 161, 170, 0.25) 85%, transparent 100%)',
			borderRadius: '0.5px',
		},

		// Hover effects
		'completion-section:hover': {
			color: 'rgba(161, 161, 170, 1) !important',
			backgroundColor: 'rgba(39, 39, 42, 0.6) !important',
		},

		'& completion-section:hover': {
			color: 'rgba(161, 161, 170, 1) !important',
			backgroundColor: 'rgba(39, 39, 42, 0.6) !important',
		},

		// Remove list markers
		'completion-section::marker': {
			display: 'none !important',
		},

		'& completion-section::marker': {
			display: 'none !important',
		},

		// Add spacing between sections and completion items
		'& .cm-tooltip.cm-tooltip-autocomplete completion-section + li': {
			marginTop: '12px !important',
		},

		// ========================================
		// SYNTAX HIGHLIGHTING STYLES
		// ========================================

		// Mindmap token styles for syntax highlighting
		'.cm-tag': {
			backgroundColor: 'rgb(59 130 246 / 0.2)',
			color: 'rgb(191 219 254)',
			borderRadius: '0.25rem',
			padding: '0.125rem 0.25rem',
			fontWeight: '500',
			lineHeight: '1.7 !important',
			marginTop: '12px !important',
		},

		'.cm-priority': {
			backgroundColor: 'rgb(34 197 94 / 0.2)',
			color: 'rgb(187 247 208)',
			borderRadius: '0.25rem',
			padding: '0.125rem 0.25rem',
			fontWeight: '600',
			lineHeight: '1.7 !important',
			marginTop: '12px !important',
		},

		'.cm-color': {
			backgroundColor: 'rgb(168 85 247 / 0.2)',
			color: 'rgb(221 214 254)',
			borderRadius: '0.25rem',
			padding: '0.125rem 0.25rem',
			fontFamily: 'ui-monospace, SFMono-Regular, monospace',
			fontSize: '0.875rem',
			lineHeight: '1.7 !important',
			marginTop: '12px !important',
		},

		'.cm-date': {
			backgroundColor: 'rgb(16 185 129 / 0.2)',
			color: 'rgb(167 243 208)',
			borderRadius: '0.25rem',
			padding: '0.125rem 0.25rem',
			fontWeight: '500',
			lineHeight: '1.7 !important',
			marginTop: '12px !important',
		},

		'.cm-assignee': {
			backgroundColor: 'rgb(139 92 246 / 0.2)',
			color: 'rgb(196 181 253)',
			borderRadius: '0.25rem',
			padding: '0.125rem 0.25rem',
			fontWeight: '500',
			lineHeight: '1.7 !important',
			marginTop: '12px !important',
		},

		'.cm-text': {
			color: 'rgb(228 228 231)',
			lineHeight: '1.7 !important',
			marginTop: '12px !important',
		},
	},
	{ dark: true }
);

// ============================================================================
// EXPORT THE SINGLE THEME
// ============================================================================

/**
 * The main export - single comprehensive theme for all node editor instances
 */
export default nodeEditorTheme;
