/**
 * CodeMirror pattern decorations for real-time syntax highlighting
 * Provides colored backgrounds for mindmap patterns (@date, #priority, etc.)
 */

import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { StateField, StateEffect } from "@codemirror/state";
import { PATTERN_REGISTRY, PatternType } from "./completion-types";

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
	const decorations: Decoration[] = [];
	
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
		
		decorations.push(decoration.range(match.start, match.end));
	}
	
	return Decoration.set(decorations);
}

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

// Debounced pattern update function
let patternUpdateTimeout: NodeJS.Timeout | null = null;

// View plugin to handle real-time pattern detection
const patternPlugin = ViewPlugin.fromClass(
	class {
		constructor(private view: EditorView) {
			// Defer initial pattern detection to avoid "update in progress" error
			// This prevents conflicts with CodeMirror's initialization cycle
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

// Theme for pattern decoration styles - matching preview-renderer colors
export const patternDecorationTheme = EditorView.theme({
	// Date pattern (@today, @2025-10-15) - Blue theme
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
	
	// Assignee pattern (+john, +team) - Orange theme
	'.cm-pattern-assignee': {
		backgroundColor: 'rgba(249, 115, 22, 0.1)', // bg-orange-500/10
		color: 'rgb(251, 146, 60)', // text-orange-400
		border: '1px solid rgba(249, 115, 22, 0.2)', // border-orange-500/20
		borderRadius: '4px',
		padding: '1px 3px',
		marginLeft: '1px',
		marginRight: '1px',
	}
}, { dark: true });

// Export the pattern decoration extensions
export const patternDecorations = [
	patternDecorationsField,
	patternPlugin,
	patternDecorationTheme
];

// Helper function to manually trigger pattern update
export function triggerPatternUpdate(view: EditorView) {
	const text = view.state.doc.toString();
	const patterns = detectAllPatterns(text);
	view.dispatch({
		effects: updatePatternDecorations.of(patterns)
	});
}

// Utility function to get all pattern matches for external use
export function getPatternMatches(text: string): PatternMatch[] {
	return detectAllPatterns(text);
}