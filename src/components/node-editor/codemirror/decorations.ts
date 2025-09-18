/**
 * CodeMirror Decorations - Pattern Highlighting and Validation
 * Combines pattern decorations (syntax highlighting) and validation decorations (error highlighting)
 */

import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { StateField, StateEffect } from "@codemirror/state";
import { ValidationError, getValidationResults } from "../validation";
import { PATTERN_REGISTRY, PatternType } from "../utils";

// ========================================
// PATTERN DECORATIONS (SYNTAX HIGHLIGHTING)
// ========================================

// Pattern detection result
interface PatternMatch {
	type: PatternType;
	start: number;
	end: number;
	text: string;
}

// State effect to update pattern decorations
const updatePatternDecorations = StateEffect.define<PatternMatch[]>();

/**
 * Detect all pattern matches in text with their positions
 */
function detectAllPatterns(text: string): PatternMatch[] {
	const matches: PatternMatch[] = [];
	
	// Iterate through all pattern types
	for (const [type, config] of Object.entries(PATTERN_REGISTRY)) {
		const patternType = type as PatternType;
		const globalRegex = config.decorationRegex;
		
		let match;

		while ((match = globalRegex.exec(text)) !== null) {
			// Calculate the full pattern boundaries
			const start = match.index;
			const matchedText = match[0];
			let end = start + matchedText.length;
			
			// Special handling for different pattern types
			switch (patternType) {
				case 'tag':
					// For tags, include the closing bracket if present
					if (text[end] === ']') {
						end++;
					}

					break;
				case 'color':
					// For colors, extend to include the full value
					const colorMatch = text.substring(start).match(/^color:[#\w-]+/);

					if (colorMatch) {
						end = start + colorMatch[0].length;
					}

					break;
			}
			
			matches.push({
				type: patternType,
				start,
				end,
				text: text.substring(start, end)
			});
		}
	}
	
	// Sort matches by start position and remove overlaps
	matches.sort((a, b) => a.start - b.start);
	
	// Remove overlapping matches (keep the first/longest one)
	const nonOverlapping: PatternMatch[] = [];

	for (const match of matches) {
		const hasOverlap = nonOverlapping.some(existing => 
			match.start < existing.end && match.end > existing.start
		);
		
		if (!hasOverlap) {
			nonOverlapping.push(match);
		}
	}
	
	return nonOverlapping;
}

/**
 * Create CodeMirror decorations from pattern matches
 */
function createPatternDecorations(matches: PatternMatch[]): DecorationSet {
	const decorationRanges = [];
	
	for (const match of matches) {
		// Ensure indices are valid
		if (match.start < 0 || match.end <= match.start) {
			continue;
		}
		
		// Get CSS class based on pattern type
		const className = `cm-pattern-${match.type}`;
		
		const decoration = Decoration.mark({
			class: className,
			attributes: {
				'data-pattern-type': match.type,
				'data-pattern-text': match.text
			}
		});
		
		decorationRanges.push(decoration.range(match.start, match.end));
	}
	
	return Decoration.set(decorationRanges);
}

// ========================================
// VALIDATION DECORATIONS (ERROR HIGHLIGHTING)
// ========================================

// State effect to update validation decorations
const updateValidationDecorations = StateEffect.define<ValidationError[]>();

/**
 * Create CodeMirror decorations from validation errors
 */
function createValidationDecorations(errors: ValidationError[]): DecorationSet {
	const decorationRanges = [];
	
	for (const error of errors) {
		// Ensure indices are valid
		if (error.startIndex < 0 || error.endIndex <= error.startIndex) {
			continue;
		}
		
		// Create decoration based on error type
		let className: string;

		switch (error.type) {
			case 'error':
				className = 'cm-error-decoration';
				break;
			case 'warning':
				className = 'cm-warning-decoration';
				break;
			case 'suggestion':
				className = 'cm-suggestion-decoration';
				break;
			default:
				className = 'cm-error-decoration';
		}
		
		const decoration = Decoration.mark({
			class: className,
			attributes: {
				'data-validation-message': error.message,
				'data-validation-type': error.type,
				...(error.suggestion && { 'data-validation-suggestion': error.suggestion })
			}
		});
		
		decorationRanges.push(decoration.range(error.startIndex, error.endIndex));
	}
	
	return Decoration.set(decorationRanges);
}

// ========================================
// COMBINED STATE MANAGEMENT
// ========================================

// State field to manage pattern decorations
const patternDecorationsField = StateField.define<DecorationSet>({
	create() {
		return Decoration.none;
	},
	update(decorations, tr) {
		// Apply position mapping for document changes
		decorations = decorations.map(tr.changes);
		
		// Update decorations if effect is present
		for (const effect of tr.effects) {
			if (effect.is(updatePatternDecorations)) {
				decorations = createPatternDecorations(effect.value);
			}
		}
		
		return decorations;
	},
	provide: f => EditorView.decorations.from(f)
});

// State field to manage validation decorations
const validationDecorationsField = StateField.define<DecorationSet>({
	create() {
		return Decoration.none;
	},
	update(decorations, tr) {
		// Apply position mapping for document changes
		decorations = decorations.map(tr.changes);
		
		// Update decorations if effect is present
		for (const effect of tr.effects) {
			if (effect.is(updateValidationDecorations)) {
				decorations = createValidationDecorations(effect.value);
			}
		}
		
		return decorations;
	},
	provide: f => EditorView.decorations.from(f)
});

// ========================================
// VIEW PLUGINS FOR REAL-TIME UPDATES
// ========================================

// Debounced update functions
let patternUpdateTimeout: NodeJS.Timeout | null = null;
let validationUpdateTimeout: NodeJS.Timeout | null = null;

// View plugin to handle real-time pattern detection
const patternPlugin = ViewPlugin.fromClass(
	class {
		constructor(private view: EditorView) {
			// Defer initial pattern detection to avoid "update in progress" error
			setTimeout(() => this.updatePatterns(), 0);
		}
		
		update(update: ViewUpdate) {
			// Only update if document content changed
			if (!update.docChanged) return;
			
			// Clear existing timeout
			if (patternUpdateTimeout) {
				clearTimeout(patternUpdateTimeout);
			}
			
			// Debounce pattern updates to prevent performance issues
			patternUpdateTimeout = setTimeout(() => {
				this.updatePatterns();
			}, 100); // 100ms debounce - faster than validation for immediate feedback
		}
		
		private updatePatterns() {
			const text = this.view.state.doc.toString();
			const patterns = detectAllPatterns(text);
			
			// Dispatch pattern decoration update
			this.view.dispatch({
				effects: updatePatternDecorations.of(patterns)
			});
		}
		
		destroy() {
			if (patternUpdateTimeout) {
				clearTimeout(patternUpdateTimeout);
				patternUpdateTimeout = null;
			}
		}
	}
);

// View plugin to handle validation updates
const validationPlugin = ViewPlugin.fromClass(
	class {
		constructor(private view: EditorView) {}
		
		update(update: ViewUpdate) {
			// Only update if document content changed
			if (!update.docChanged) return;
			
			// Clear existing timeout
			if (validationUpdateTimeout) {
				clearTimeout(validationUpdateTimeout);
			}
			
			// Debounce validation updates to prevent performance issues
			validationUpdateTimeout = setTimeout(() => {
				const text = update.view.state.doc.toString();
				const validationErrors = getValidationResults(text);
				
				// Dispatch decoration update
				update.view.dispatch({
					effects: updateValidationDecorations.of(validationErrors)
				});
			}, 300); // 300ms debounce
		}
		
		destroy() {
			if (validationUpdateTimeout) {
				clearTimeout(validationUpdateTimeout);
				validationUpdateTimeout = null;
			}
		}
	}
);

// ========================================
// STYLING THEMES
// ========================================

// Theme for pattern decoration styles - matching preview-renderer colors
export const patternDecorationTheme = EditorView.theme({
	// Date pattern (^today, ^2025-10-15) - Blue theme
	'.cm-pattern-date': {
		backgroundColor: 'rgba(59, 130, 246, 0.1)', // bg-blue-500/10
		color: 'rgb(96, 165, 250)', // text-blue-400
		border: '1px solid rgba(59, 130, 246, 0.2)', // border-blue-500/20
		borderRadius: '4px',
		padding: '1px 3px',
		marginLeft: '1px',
		marginRight: '1px',
	},
	
	// Priority pattern (#high, #medium) - Red theme
	'.cm-pattern-priority': {
		backgroundColor: 'rgba(239, 68, 68, 0.1)', // bg-red-500/10
		color: 'rgb(248, 113, 113)', // text-red-400
		border: '1px solid rgba(239, 68, 68, 0.2)', // border-red-500/20
		borderRadius: '4px',
		padding: '1px 3px',
		marginLeft: '1px',
		marginRight: '1px',
	},
	
	// Color pattern (color:#ff0000) - Purple theme
	'.cm-pattern-color': {
		backgroundColor: 'rgba(168, 85, 247, 0.1)', // bg-purple-500/10
		color: 'rgb(196, 181, 253)', // text-purple-400
		border: '1px solid rgba(168, 85, 247, 0.2)', // border-purple-500/20
		borderRadius: '4px',
		padding: '1px 3px',
		marginLeft: '1px',
		marginRight: '1px',
	},
	
	// Tag pattern ([meeting], [urgent]) - Green theme
	'.cm-pattern-tag': {
		backgroundColor: 'rgba(34, 197, 94, 0.1)', // bg-green-500/10
		color: 'rgb(74, 222, 128)', // text-green-400
		border: '1px solid rgba(34, 197, 94, 0.2)', // border-green-500/20
		borderRadius: '4px',
		padding: '1px 3px',
		marginLeft: '1px',
		marginRight: '1px',
	},
	
	// Assignee pattern (@john, @team) - Orange theme
	'.cm-pattern-assignee': {
		backgroundColor: 'rgba(249, 115, 22, 0.1)', // bg-orange-500/10
		color: 'rgb(251, 146, 60)', // text-orange-400
		border: '1px solid rgba(249, 115, 22, 0.2)', // border-orange-500/20
		borderRadius: '4px',
		padding: '1px 3px',
		marginLeft: '1px',
		marginRight: '1px',
	},
	
	// Font size pattern (sz:16px, sz:1.2rem) - Cyan theme
	'.cm-pattern-fontSize': {
		backgroundColor: 'rgba(6, 182, 212, 0.1)', // bg-cyan-500/10
		color: 'rgb(34, 211, 238)', // text-cyan-400
		border: '1px solid rgba(6, 182, 212, 0.2)', // border-cyan-500/20
		borderRadius: '4px',
		padding: '1px 3px',
		marginLeft: '1px',
		marginRight: '1px',
	},
	
	// Checkbox pattern ([x], []) - Dark gray background theme
	'.cm-pattern-checkbox': {
		backgroundColor: 'rgba(39, 39, 42, 0.5)', // zinc-900/50
		borderRadius: '4px',
		padding: '2px 4px',
		display: 'block',
		margin: '2px 0',
		width: 'calc(100% - 8px)',
		color: 'inherit',
	}
}, { dark: true });

// Theme for validation decoration styles
export const validationDecorationTheme = EditorView.theme({
	'.cm-error-decoration': {
		textDecoration: 'wavy underline red',
		textDecorationThickness: '2px',
		textUnderlineOffset: '2px',
		WebkitTextDecorationLine: 'underline',
		WebkitTextDecorationStyle: 'wavy',
		WebkitTextDecorationColor: '#ef4444'
	},
	'.cm-warning-decoration': {
		textDecoration: 'wavy underline orange',
		textDecorationThickness: '1px', 
		textUnderlineOffset: '2px',
		WebkitTextDecorationLine: 'underline',
		WebkitTextDecorationStyle: 'wavy',
		WebkitTextDecorationColor: '#f97316'
	},
	'.cm-suggestion-decoration': {
		textDecoration: 'wavy underline blue',
		textDecorationThickness: '1px',
		textUnderlineOffset: '2px',
		WebkitTextDecorationLine: 'underline',
		WebkitTextDecorationStyle: 'wavy',
		WebkitTextDecorationColor: '#3b82f6'
	},
	// Fallback for browsers that don't support wavy underlines
	'@supports not (text-decoration-style: wavy)': {
		'.cm-error-decoration': {
			backgroundColor: 'rgba(239, 68, 68, 0.2)',
			borderBottom: '2px solid #ef4444',
			borderRadius: '2px'
		},
		'.cm-warning-decoration': {
			backgroundColor: 'rgba(249, 115, 22, 0.2)',
			borderBottom: '1px solid #f97316',
			borderRadius: '2px'
		},
		'.cm-suggestion-decoration': {
			backgroundColor: 'rgba(59, 130, 246, 0.2)',
			borderBottom: '1px solid #3b82f6',
			borderRadius: '2px'
		}
	}
});

// ========================================
// EXPORTS
// ========================================

// Export the pattern decoration extensions
export const patternDecorations = [
	patternDecorationsField,
	patternPlugin,
	patternDecorationTheme
];

// Export the validation decoration extensions  
export const validationDecorations = [
	validationDecorationsField,
	validationPlugin,
	validationDecorationTheme
];

// Export all decorations as a single extension
export const allDecorations = [
	...patternDecorations,
	...validationDecorations
];

// ========================================
// UTILITY FUNCTIONS
// ========================================

// Helper function to manually trigger pattern update
export function triggerPatternUpdate(view: EditorView) {
	const text = view.state.doc.toString();
	const patterns = detectAllPatterns(text);
	view.dispatch({
		effects: updatePatternDecorations.of(patterns)
	});
}

// Helper function to manually trigger validation update
export function triggerValidationUpdate(view: EditorView, text: string) {
	const validationErrors = getValidationResults(text);
	view.dispatch({
		effects: updateValidationDecorations.of(validationErrors)
	});
}

// Utility function to get all pattern matches for external use
export function getPatternMatches(text: string): PatternMatch[] {
	return detectAllPatterns(text);
}

// Utility function to get validation errors for external use
export function getValidationErrors(text: string): ValidationError[] {
	return getValidationResults(text);
}