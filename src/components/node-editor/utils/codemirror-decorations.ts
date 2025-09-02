/**
 * CodeMirror decorations for validation errors
 * Creates wavy underlines to visually indicate validation issues directly in the text
 */

import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { StateField, StateEffect } from "@codemirror/state";
import { ValidationError, getValidationResults } from "./validation";

// State effect to update validation decorations
const updateValidationDecorations = StateEffect.define<ValidationError[]>();

// Create CodeMirror decorations from validation errors
export function createValidationDecorations(errors: ValidationError[]): DecorationSet {
	const decorations: Decoration[] = [];
	
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
		
		decorations.push(decoration.range(error.startIndex, error.endIndex));
	}
	
	return Decoration.set(decorations);
}

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

// Debounced validation update function
let validationUpdateTimeout: NodeJS.Timeout | null = null;

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

// Export the extensions to be used in CodeMirror
export const validationDecorations = [
	validationDecorationsField,
	validationPlugin,
	validationDecorationTheme
];

// Helper function to manually trigger validation update
export function triggerValidationUpdate(view: EditorView, text: string) {
	const validationErrors = getValidationResults(text);
	view.dispatch({
		effects: updateValidationDecorations.of(validationErrors)
	});
}