/**
 * Pattern Decorations - Syntax highlighting for patterns
 * Highlights patterns with different colors based on type
 *
 * Two-part decoration system:
 * - Background covers entire pattern (prefix + value)
 * - Text color applied only to value part
 */

import { StateEffect, StateField } from '@codemirror/state';
import {
	Decoration,
	DecorationSet,
	EditorView,
	ViewPlugin,
	ViewUpdate,
} from '@codemirror/view';

// ============================================================================
// PATTERN STYLE CONSTANTS
// ============================================================================

/**
 * Pattern types and their visual styles (for single-part patterns)
 */
const PATTERN_STYLES = {
	// Tags: #bug, #feature
	tag: 'cm-pattern-tag',

	// Assignees: @john, @team
	assignee: 'cm-pattern-assignee',

	// Dates: ^today, ^2024-12-25
	date: 'cm-pattern-date',

	// Priority: !, !!, !!!
	priorityHigh: 'cm-pattern-priority-high',
	priorityMedium: 'cm-pattern-priority-medium',
	priorityLow: 'cm-pattern-priority-low',

	// Status: :done, :in-progress
	status: 'cm-pattern-status',

	// References: [[node-123]]
	reference: 'cm-pattern-reference',

	// Node types: $task, $note
	nodeType: 'cm-pattern-nodetype',

	// Commands: /image, /date
	command: 'cm-pattern-command',

	// Checkbox patterns
	checkboxUnchecked: 'cm-pattern-checkbox-unchecked',
	checkboxChecked: 'cm-pattern-checkbox-checked',

	// Alt text in quotes
	altText: 'cm-pattern-alttext',
};

// ============================================================================
// TWO-PART PATTERN CONFIG (prefix:value patterns)
// ============================================================================

/**
 * Two-part pattern: background on full pattern, text color on value only
 */
interface TwoPartPatternConfig {
	regex: RegExp;
	bgClassName: string; // Background for entire pattern
	valueClassName: string | ((match: RegExpMatchArray) => string); // Text color for value only
	prefixLength: number; // Length of prefix (e.g., "color:" = 6)
}

/** Annotation type values that get semantic color coding */
const KNOWN_ANNOTATION_TYPES = ['warning', 'success', 'info', 'error', 'note'];

/**
 * Two-part patterns - these get background on full match, color on value
 */
const TWO_PART_PATTERNS: TwoPartPatternConfig[] = [
	// Color pattern: color:value
	{
		regex: /color:([#a-zA-Z0-9()-]+)/gi,
		bgClassName: 'cm-pattern-color-bg',
		valueClassName: 'cm-pattern-color-value',
		prefixLength: 6,
	},
	// Background color: bg:value
	{
		regex: /bg:([#a-zA-Z0-9()-]+)/gi,
		bgClassName: 'cm-pattern-bg-bg',
		valueClassName: 'cm-pattern-bg-value',
		prefixLength: 3,
	},
	// Border color: border:value
	{
		regex: /border:([#a-zA-Z0-9()-]+)/gi,
		bgClassName: 'cm-pattern-border-bg',
		valueClassName: 'cm-pattern-border-value',
		prefixLength: 7,
	},
	// Font size: size:24px
	{
		regex: /size:(\d+(?:\.\d+)?(?:px|pt|em|rem))\b/gi,
		bgClassName: 'cm-pattern-size-bg',
		valueClassName: 'cm-pattern-size-value',
		prefixLength: 5,
	},
	// Font weight: weight:bold
	{
		regex: /weight:(normal|bold|bolder|lighter|\d{3})\b/gi,
		bgClassName: 'cm-pattern-weight-bg',
		valueClassName: 'cm-pattern-weight-value',
		prefixLength: 7,
	},
	// Font style: style:italic
	{
		regex: /style:(normal|italic|oblique)\b/gi,
		bgClassName: 'cm-pattern-style-bg',
		valueClassName: 'cm-pattern-style-value',
		prefixLength: 6,
	},
	// Text align: align:center
	{
		regex: /align:(left|center|right)\b/gi,
		bgClassName: 'cm-pattern-align-bg',
		valueClassName: 'cm-pattern-align-value',
		prefixLength: 6,
	},
	// URL pattern: url:value
	{
		regex: /url:(\S+)/gi,
		bgClassName: 'cm-pattern-url-bg',
		valueClassName: 'cm-pattern-url-value',
		prefixLength: 4,
	},
	// Language pattern: lang:javascript
	{
		regex: /lang:([a-zA-Z0-9+#-]+)/gi,
		bgClassName: 'cm-pattern-lang-bg',
		valueClassName: 'cm-pattern-lang-value',
		prefixLength: 5,
	},
	// File pattern: file:filename
	{
		regex: /file:(\S+)/gi,
		bgClassName: 'cm-pattern-file-bg',
		valueClassName: 'cm-pattern-file-value',
		prefixLength: 5,
	},
	// Question type: question:binary|multiple
	{
		regex: /question:(binary|multiple)\b/gi,
		bgClassName: 'cm-pattern-question-bg',
		valueClassName: 'cm-pattern-question-value',
		prefixLength: 9,
	},
	// Confidence: confidence:85%
	{
		regex: /confidence:(\d+%?)/gi,
		bgClassName: 'cm-pattern-confidence-bg',
		valueClassName: 'cm-pattern-confidence-value',
		prefixLength: 11,
	},
	// Annotation type: type:value (any identifier; known values get semantic color)
	{
		regex: /type:([a-zA-Z][a-zA-Z0-9_-]*)\b/gi,
		bgClassName: 'cm-pattern-type-bg',
		valueClassName: (match: RegExpMatchArray) => {
			const val = match[1].toLowerCase();
			return KNOWN_ANNOTATION_TYPES.includes(val)
				? `cm-pattern-type-${val}-value`
				: 'cm-pattern-type-default-value';
		},
		prefixLength: 5,
	},
	// Line numbers: lines:on|off — codeNode
	{
		regex: /lines:(on|off)\b/gi,
		bgClassName: 'cm-pattern-lines-bg',
		valueClassName: 'cm-pattern-lines-value',
		prefixLength: 6,
	},
];

// ============================================================================
// SINGLE-PART PATTERN CONFIG
// ============================================================================

/**
 * Prefixes excluded from the status pattern's negative lookbehind.
 * Add new prefix:value patterns here so the status regex stays in sync.
 */
const STATUS_EXCLUDE_PREFIXES = [
	'color', 'bg', 'border', 'size', 'align', 'weight', 'style',
	'title', 'label', 'alt', 'src', 'url', 'lang', 'file',
	'confidence', 'question', 'multiple', 'options', 'type', 'lines',
] as const;

const STATUS_REGEX = new RegExp(
	`(?<!${STATUS_EXCLUDE_PREFIXES.join('|')}):[a-zA-Z][a-zA-Z0-9_-]*`,
	'g'
);

/**
 * Pattern configuration for single-part detection
 */
interface SinglePartPatternConfig {
	regex: RegExp;
	className: string | ((match: RegExpMatchArray) => string);
}

/**
 * Single-part patterns - these get uniform styling
 */
const SINGLE_PART_PATTERNS: SinglePartPatternConfig[] = [
	// Tags: #tag
	{
		regex: /(?<!:)#[a-zA-Z][a-zA-Z0-9_-]*/g,
		className: PATTERN_STYLES.tag,
	},
	// Assignees: @person
	{
		regex: /(?<!:)@[a-zA-Z][a-zA-Z0-9_-]*/g,
		className: PATTERN_STYLES.assignee,
	},
	// Dates: ^date
	{
		regex: /\^[^\s^]+/g,
		className: PATTERN_STYLES.date,
	},
	// Priority: ! marks
	{
		regex: /!{1,3}(?!\w)|!(high|medium|low|critical|urgent|1|2|3)\b/gi,
		className: (match) => {
			const value = match[0];
			if (
				value === '!!!' ||
				match[1] === 'high' ||
				match[1] === 'critical' ||
				match[1] === '1'
			) {
				return PATTERN_STYLES.priorityHigh;
			}
			if (value === '!!' || match[1] === 'medium' || match[1] === '2') {
				return PATTERN_STYLES.priorityMedium;
			}
			return PATTERN_STYLES.priorityLow;
		},
	},
	// Status: :status (negative lookbehind excludes all known prefix:value patterns)
	{
		regex: STATUS_REGEX,
		className: PATTERN_STYLES.status,
	},
	// References: [[reference]]
	{
		regex: /\[\[[^\]]+\]\]/g,
		className: PATTERN_STYLES.reference,
	},
	// Node types: $type
	{
		regex: /\$[a-zA-Z]+/g,
		className: PATTERN_STYLES.nodeType,
	},
	// Commands: /command (only at start of string or after whitespace)
	{
		regex: /(?<=^|\s)\/[a-zA-Z]+/g,
		className: PATTERN_STYLES.command,
	},
	// Checkbox: [ ] or [x] (negative lookahead to avoid [[reference]])
	{
		regex: /\[([ xX]?)\](?!\])/g,
		className: (match) => {
			const content = match[1] || '';
			return content.toLowerCase() === 'x'
				? PATTERN_STYLES.checkboxChecked
				: PATTERN_STYLES.checkboxUnchecked;
		},
	},
	// Title pattern: title:"text"
	{
		regex: /title:"([^"]+)"/gi,
		className: 'cm-pattern-title',
	},
	// Label pattern: label:"text"
	{
		regex: /label:"([^"]+)"/gi,
		className: 'cm-pattern-label',
	},
	// Alt text pattern: alt:"text" — imageNode alt text
	{
		regex: /alt:"([^"]+)"/gi,
		className: 'cm-pattern-alt',
	},
	// Source pattern: src:"text" — imageNode source attribution
	{
		regex: /src:"([^"]+)"/gi,
		className: 'cm-pattern-src',
	},
	// Standalone quoted text (for image captions etc.) — not preceded by known prefixes
	{
		regex: /(?<!title:|label:|alt:|src:)"([^"]+)"/g,
		className: PATTERN_STYLES.altText,
	},
	// Options pattern: options:[a,b,c]
	{
		regex: /options:\[[^\]]*\]/gi,
		className: 'cm-pattern-options',
	},
];

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

/**
 * State effect for updating decorations
 */
const updateDecorations = StateEffect.define<DecorationSet>();

/**
 * State field to store decorations
 */
const decorationsField = StateField.define<DecorationSet>({
	create() {
		return Decoration.none;
	},
	update(decorations, tr) {
		for (const effect of tr.effects) {
			if (effect.is(updateDecorations)) {
				return effect.value;
			}
		}
		return decorations.map(tr.changes);
	},
	provide: (f) => EditorView.decorations.from(f),
});

// ============================================================================
// DECORATION CREATION
// ============================================================================

/**
 * Create pattern decorations from text
 * Handles both two-part and single-part patterns
 */
function createDecorations(view: EditorView): DecorationSet {
	const decorations: Array<{
		from: number;
		to: number;
		decoration: Decoration;
	}> = [];
	const text = view.state.doc.toString();

	// Process two-part patterns (background + value color)
	for (const pattern of TWO_PART_PATTERNS) {
		const regex = new RegExp(pattern.regex);
		let match;

		while ((match = regex.exec(text)) !== null) {
			const from = match.index;
			const to = from + match[0].length;
			const valueFrom = from + pattern.prefixLength;

			// Background decoration for entire pattern
			decorations.push({
				from,
				to,
				decoration: Decoration.mark({ class: pattern.bgClassName }),
			});

			// Value-only text color decoration
			if (valueFrom < to) {
				const valueClassName =
					typeof pattern.valueClassName === 'function'
						? pattern.valueClassName(match)
						: pattern.valueClassName;

				decorations.push({
					from: valueFrom,
					to,
					decoration: Decoration.mark({ class: valueClassName }),
				});
			}
		}
	}

	// Process single-part patterns
	for (const pattern of SINGLE_PART_PATTERNS) {
		const regex = new RegExp(pattern.regex);
		let match;

		while ((match = regex.exec(text)) !== null) {
			const from = match.index;
			const to = from + match[0].length;

			const className =
				typeof pattern.className === 'function'
					? pattern.className(match)
					: pattern.className;

			decorations.push({
				from,
				to,
				decoration: Decoration.mark({ class: className }),
			});
		}
	}

	// Sort by position and create decoration set
	decorations.sort((a, b) => a.from - b.from);
	return Decoration.set(
		decorations.map((d) => d.decoration.range(d.from, d.to))
	);
}

// ============================================================================
// VIEW PLUGIN
// ============================================================================

/**
 * View plugin for updating decorations
 */
const decorationPlugin = ViewPlugin.fromClass(
	class {
		timeout: NodeJS.Timeout | null = null;

		constructor(view: EditorView) {
			this.timeout = setTimeout(() => {
				this.updateDecorations(view);
			}, 0);
		}

		update(update: ViewUpdate) {
			if (update.docChanged || update.viewportChanged) {
				if (this.timeout) clearTimeout(this.timeout);
				this.timeout = setTimeout(() => {
					this.updateDecorations(update.view);
				}, 0);
			}
		}

		updateDecorations(view: EditorView) {
			const decorations = createDecorations(view);
			view.dispatch({
				effects: updateDecorations.of(decorations),
			});
		}

		destroy() {
			if (this.timeout) clearTimeout(this.timeout);
		}
	}
);

// ============================================================================
// THEME STYLES
// ============================================================================

/**
 * Create the pattern decorations extension
 */
export function createPatternDecorations() {
	return [
		decorationsField,
		decorationPlugin,
		EditorView.baseTheme({
			// ================================================================
			// SINGLE-PART PATTERN STYLES
			// ================================================================

			// Tag styles
			'.cm-pattern-tag': {
				color: '#7c3aed',
				backgroundColor: '#7c3aed15',
				padding: '0 2px',
				borderRadius: '3px',
			},

			// Assignee styles
			'.cm-pattern-assignee': {
				color: '#ea580c',
				backgroundColor: '#ea580c15',
				padding: '0 2px',
				borderRadius: '3px',
			},

			// Date styles
			'.cm-pattern-date': {
				color: '#059669',
				backgroundColor: '#05966915',
				padding: '0 2px',
				borderRadius: '3px',
			},

			// Priority styles
			'.cm-pattern-priority-high': {
				color: '#dc2626',
				backgroundColor: '#dc262615',
				fontWeight: 'bold',
				padding: '0 2px',
				borderRadius: '3px',
			},
			'.cm-pattern-priority-medium': {
				color: '#f59e0b',
				backgroundColor: '#f59e0b15',
				fontWeight: '600',
				padding: '0 2px',
				borderRadius: '3px',
			},
			'.cm-pattern-priority-low': {
				color: '#10b981',
				backgroundColor: '#10b98115',
				padding: '0 2px',
				borderRadius: '3px',
			},

			// Status styles
			'.cm-pattern-status': {
				color: '#3b82f6',
				backgroundColor: '#3b82f615',
				padding: '0 2px',
				borderRadius: '3px',
			},

			// Reference styles
			'.cm-pattern-reference': {
				color: '#8b5cf6',
				backgroundColor: '#8b5cf615',
				textDecoration: 'underline',
				textDecorationStyle: 'dashed',
				padding: '0 2px',
				borderRadius: '3px',
			},

			// Node type styles
			'.cm-pattern-nodetype': {
				color: '#0ea5e9',
				backgroundColor: '#0ea5e915',
				fontWeight: 'bold',
				padding: '0 2px',
				borderRadius: '3px',
			},

			// Command styles
			'.cm-pattern-command': {
				color: '#14b8a6',
				backgroundColor: '#14b8a615',
				fontStyle: 'italic',
				padding: '0 2px',
				borderRadius: '3px',
			},

			// Checkbox styles
			'.cm-pattern-checkbox-unchecked': {
				color: '#6b7280',
				backgroundColor: '#6b728015',
				fontFamily: 'monospace',
				padding: '0 2px',
				borderRadius: '3px',
			},
			'.cm-pattern-checkbox-checked': {
				color: '#10b981',
				backgroundColor: '#10b98115',
				fontFamily: 'monospace',
				padding: '0 2px',
				borderRadius: '3px',
			},

			// Title styles
			'.cm-pattern-title': {
				color: '#f59e0b',
				backgroundColor: '#f59e0b15',
				fontStyle: 'italic',
				padding: '0 2px',
				borderRadius: '3px',
			},

			// Label styles
			'.cm-pattern-label': {
				color: '#8b5cf6',
				backgroundColor: '#8b5cf615',
				fontStyle: 'italic',
				padding: '0 2px',
				borderRadius: '3px',
			},

			// Alt text prefix styles: alt:"text" and standalone quoted text share the same look
			'.cm-pattern-alt, .cm-pattern-alttext': {
				color: '#a855f7',
				backgroundColor: '#a855f715',
				fontStyle: 'italic',
				padding: '0 2px',
				borderRadius: '3px',
			},

			// Source prefix styles: src:"text"
			'.cm-pattern-src': {
				color: '#3b82f6',
				backgroundColor: '#3b82f615',
				fontStyle: 'italic',
				padding: '0 2px',
				borderRadius: '3px',
			},

			// Options styles
			'.cm-pattern-options': {
				color: '#8b5cf6',
				backgroundColor: '#8b5cf615',
				padding: '0 2px',
				borderRadius: '3px',
			},

			// ================================================================
			// TWO-PART PATTERN STYLES (background + value)
			// ================================================================

			// Color: color:value
			'.cm-pattern-color-bg': {
				backgroundColor: '#db277715',
				padding: '0 2px',
				borderRadius: '3px',
			},
			'.cm-pattern-color-value': {
				color: '#db2777',
				fontWeight: '500',
			},

			// Background: bg:value
			'.cm-pattern-bg-bg': {
				backgroundColor: '#a855f715',
				padding: '0 2px',
				borderRadius: '3px',
			},
			'.cm-pattern-bg-value': {
				color: '#a855f7',
				fontWeight: '500',
			},

			// Border: border:value
			'.cm-pattern-border-bg': {
				backgroundColor: '#f9731615',
				padding: '0 2px',
				borderRadius: '3px',
			},
			'.cm-pattern-border-value': {
				color: '#f97316',
				fontWeight: '500',
			},

			// Size: size:value
			'.cm-pattern-size-bg': {
				backgroundColor: '#06b6d415',
				padding: '0 2px',
				borderRadius: '3px',
			},
			'.cm-pattern-size-value': {
				color: '#06b6d4',
				fontWeight: '500',
			},

			// Weight: weight:value
			'.cm-pattern-weight-bg': {
				backgroundColor: '#8b5cf615',
				padding: '0 2px',
				borderRadius: '3px',
			},
			'.cm-pattern-weight-value': {
				color: '#8b5cf6',
				fontWeight: 'bold',
			},

			// Style: style:value
			'.cm-pattern-style-bg': {
				backgroundColor: '#ec489915',
				padding: '0 2px',
				borderRadius: '3px',
			},
			'.cm-pattern-style-value': {
				color: '#ec4899',
				fontStyle: 'italic',
			},

			// Align: align:value
			'.cm-pattern-align-bg': {
				backgroundColor: '#10b98115',
				padding: '0 2px',
				borderRadius: '3px',
			},
			'.cm-pattern-align-value': {
				color: '#10b981',
				fontWeight: '500',
			},

			// URL: url:value
			'.cm-pattern-url-bg': {
				backgroundColor: '#3b82f615',
				padding: '0 2px',
				borderRadius: '3px',
			},
			'.cm-pattern-url-value': {
				color: '#3b82f6',
				textDecoration: 'underline',
				textDecorationStyle: 'dotted',
			},

			// Language: lang:value
			'.cm-pattern-lang-bg': {
				backgroundColor: '#10b98115',
				padding: '0 2px',
				borderRadius: '3px',
			},
			'.cm-pattern-lang-value': {
				color: '#10b981',
				fontFamily: 'monospace',
			},

			// File: file:value
			'.cm-pattern-file-bg': {
				backgroundColor: '#06b6d415',
				padding: '0 2px',
				borderRadius: '3px',
			},
			'.cm-pattern-file-value': {
				color: '#06b6d4',
				fontFamily: 'monospace',
			},

			// Question: question:value
			'.cm-pattern-question-bg': {
				backgroundColor: '#f59e0b15',
				padding: '0 2px',
				borderRadius: '3px',
			},
			'.cm-pattern-question-value': {
				color: '#f59e0b',
				fontWeight: '500',
			},

			// Confidence: confidence:value
			'.cm-pattern-confidence-bg': {
				backgroundColor: '#8b5cf615',
				padding: '0 2px',
				borderRadius: '3px',
			},
			'.cm-pattern-confidence-value': {
				color: '#8b5cf6',
				fontWeight: '500',
			},

			// Line numbers: lines:on|off
			'.cm-pattern-lines-bg': {
				backgroundColor: '#06b6d415',
				padding: '0 2px',
				borderRadius: '3px',
			},
			'.cm-pattern-lines-value': {
				color: '#06b6d4',
				fontWeight: '500',
			},

			// Annotation type: type:value (color-coded by type)
			'.cm-pattern-type-bg': {
				backgroundColor: '#64748b15',
				padding: '0 2px',
				borderRadius: '3px',
			},
			'.cm-pattern-type-warning-value': {
				color: '#f59e0b',
				fontWeight: '600',
			},
			'.cm-pattern-type-success-value': {
				color: '#10b981',
				fontWeight: '600',
			},
			'.cm-pattern-type-info-value': {
				color: '#3b82f6',
				fontWeight: '600',
			},
			'.cm-pattern-type-error-value': {
				color: '#ef4444',
				fontWeight: '600',
			},
			'.cm-pattern-type-note-value': {
				color: '#8b5cf6',
				fontWeight: '600',
			},
			'.cm-pattern-type-default-value': {
				color: '#94a3b8',
				fontWeight: '500',
			},
		}),
	];
}
