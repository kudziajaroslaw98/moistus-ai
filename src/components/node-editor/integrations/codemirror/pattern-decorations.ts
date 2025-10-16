/**
 * Pattern Decorations - Syntax highlighting for patterns
 * Highlights patterns with different colors based on type
 */

import { StateEffect, StateField } from '@codemirror/state';
import {
	Decoration,
	DecorationSet,
	EditorView,
	ViewPlugin,
	ViewUpdate,
} from '@codemirror/view';

/**
 * Pattern types and their visual styles
 */
const PATTERN_STYLES = {
	// Tags: #bug, #feature
	tag: 'cm-pattern-tag',

	// Assignees: @john, @team
	assignee: 'cm-pattern-assignee',

	// Dates: ^today, ^2024-12-25
	date: 'cm-pattern-date',

	// Priority: !, !!, !!!
	priority: 'cm-pattern-priority',
	priorityHigh: 'cm-pattern-priority-high',
	priorityMedium: 'cm-pattern-priority-medium',
	priorityLow: 'cm-pattern-priority-low',

	// Status: :done, :in-progress
	status: 'cm-pattern-status',

	// References: [[node-123]]
	reference: 'cm-pattern-reference',

	// Colors: color:red
	color: 'cm-pattern-color',

	// Node types: $task, $note
	nodeType: 'cm-pattern-nodetype',

	// Commands: /image, /date
	command: 'cm-pattern-command',
};

/**
 * Pattern configuration for detection
 */
interface PatternConfig {
	regex: RegExp;
	className: string | ((match: RegExpMatchArray) => string);
}

/**
 * Pattern configurations matching our new prefix system
 */
const PATTERNS: PatternConfig[] = [
	// Tags: #tag
	{
		regex: /#[a-zA-Z][a-zA-Z0-9_-]*/g,
		className: PATTERN_STYLES.tag,
	},

	// Assignees: @person
	{
		regex: /@[a-zA-Z][a-zA-Z0-9_-]*/g,
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

	// Status: :status
	{
		regex: /:[a-zA-Z][a-zA-Z0-9_-]*/g,
		className: PATTERN_STYLES.status,
	},

	// References: [[reference]]
	{
		regex: /\[\[[^\]]+\]\]/g,
		className: PATTERN_STYLES.reference,
	},

	// Colors: color:value
	{
		regex: /color:[#a-zA-Z0-9()-]+/gi,
		className: PATTERN_STYLES.color,
	},

	// Background color: bg:value
	{
		regex: /bg:[#a-zA-Z0-9()-]+/gi,
		className: PATTERN_STYLES.color,
	},

	// Border color: border:value
	{
		regex: /border:[#a-zA-Z0-9()-]+/gi,
		className: PATTERN_STYLES.color,
	},

	// Font size: size:24px
	{
		regex: /size:\d+(?:\.\d+)?(px|pt|em|rem)\b/gi,
		className: 'cm-pattern-size',
	},

	// Font weight: weight:bold or weight:400
	{
		regex: /weight:(normal|bold|bolder|lighter|\d{3})\b/gi,
		className: 'cm-pattern-weight',
	},

	// Font style: style:italic
	{
		regex: /style:(normal|italic|oblique)\b/gi,
		className: 'cm-pattern-style',
	},

	// Text align: align:center
	{
		regex: /align:(left|center|right)\b/gi,
		className: 'cm-pattern-align',
	},

	// Node types: $type
	{
		regex: /\$[a-zA-Z]+/g,
		className: PATTERN_STYLES.nodeType,
	},

	// Commands: /command
	{
		regex: /\/[a-zA-Z]+/g,
		className: PATTERN_STYLES.command,
	},
];

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
		// Check for updates
		for (const effect of tr.effects) {
			if (effect.is(updateDecorations)) {
				return effect.value;
			}
		}

		// Map decorations through document changes
		return decorations.map(tr.changes);
	},
	provide: (f) => EditorView.decorations.from(f),
});

/**
 * Create pattern decorations from text
 */
function createDecorations(view: EditorView): DecorationSet {
	const decorations: Array<{
		from: number;
		to: number;
		decoration: Decoration;
	}> = [];
	const text = view.state.doc.toString();

	// Process each pattern type
	for (const pattern of PATTERNS) {
		const regex = new RegExp(pattern.regex);
		let match;

		while ((match = regex.exec(text)) !== null) {
			const from = match.index;
			const to = from + match[0].length;

			// Get the appropriate class name
			const className =
				typeof pattern.className === 'function'
					? pattern.className(match)
					: pattern.className;

			// Create decoration
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

/**
 * View plugin for updating decorations
 */
const decorationPlugin = ViewPlugin.fromClass(
	class {
		timeout: NodeJS.Timeout | null = null;

		constructor(view: EditorView) {
			// Schedule initial decoration update after construction
			this.timeout = setTimeout(() => {
				this.updateDecorations(view);
			}, 0);
		}

		update(update: ViewUpdate) {
			if (update.docChanged || update.viewportChanged) {
				// Clear any pending timeout
				if (this.timeout) clearTimeout(this.timeout);
				// Schedule decoration update
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

/**
 * Create the pattern decorations extension
 */
export function createPatternDecorations() {
	return [
		decorationsField,
		decorationPlugin,
		EditorView.baseTheme({
			// Tag styles
			'.cm-pattern-tag': {
				color: '#7c3aed', // purple
				backgroundColor: '#7c3aed15',
				padding: '0 2px',
				borderRadius: '3px',
			},

			// Assignee styles
			'.cm-pattern-assignee': {
				color: '#ea580c', // orange
				backgroundColor: '#ea580c15',
				padding: '0 2px',
				borderRadius: '3px',
			},

			// Date styles
			'.cm-pattern-date': {
				color: '#059669', // green
				backgroundColor: '#05966915',
				padding: '0 2px',
				borderRadius: '3px',
			},

			// Priority styles
			'.cm-pattern-priority-high': {
				color: '#dc2626', // red
				fontWeight: 'bold',
			},
			'.cm-pattern-priority-medium': {
				color: '#f59e0b', // amber
				fontWeight: '600',
			},
			'.cm-pattern-priority-low': {
				color: '#10b981', // emerald
			},

			// Status styles
			'.cm-pattern-status': {
				color: '#3b82f6', // blue
				backgroundColor: '#3b82f615',
				padding: '0 2px',
				borderRadius: '3px',
			},

			// Reference styles
			'.cm-pattern-reference': {
				color: '#8b5cf6', // violet
				textDecoration: 'underline',
				textDecorationStyle: 'dashed',
			},

			// Color styles
			'.cm-pattern-color': {
				color: '#db2777', // pink
				borderBottom: '2px solid currentColor',
			},

			// Font size styles
			'.cm-pattern-size': {
				color: '#06b6d4', // cyan
				backgroundColor: '#06b6d415',
				padding: '0 2px',
				borderRadius: '3px',
			},

			// Font weight styles
			'.cm-pattern-weight': {
				color: '#8b5cf6', // violet
				fontWeight: 'bold',
				backgroundColor: '#8b5cf615',
				padding: '0 2px',
				borderRadius: '3px',
			},

			// Font style styles
			'.cm-pattern-style': {
				color: '#ec4899', // pink
				fontStyle: 'italic',
				backgroundColor: '#ec489915',
				padding: '0 2px',
				borderRadius: '3px',
			},

			// Text align styles
			'.cm-pattern-align': {
				color: '#10b981', // emerald
				backgroundColor: '#10b98115',
				padding: '0 2px',
				borderRadius: '3px',
			},

			// Node type styles
			'.cm-pattern-nodetype': {
				color: '#0ea5e9', // sky blue
				fontWeight: 'bold',
			},

			// Command styles
			'.cm-pattern-command': {
				color: '#14b8a6', // teal
				fontStyle: 'italic',
			},
		}),
	];
}
