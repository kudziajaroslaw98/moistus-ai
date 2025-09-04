/**
 * CodeMirror configuration and extensions for node editor
 * Enhanced with command completions and decorations
 */

import { EditorState, Extension } from '@codemirror/state';
import { EditorView, keymap, placeholder } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { createCommandCompletions } from './command-completions';
import { createCommandDecorations } from './command-decorations';

/**
 * Create a basic CodeMirror editor configuration
 */
export const createBasicEditor = (
	container: HTMLElement, 
	initialContent: string = '', 
	placeholderText: string = 'Type here...'
) => {
	const extensions: Extension[] = [
		// Basic editing features
		history(),
		bracketMatching(),
		indentOnInput(),
		
		// Placeholder text
		placeholder(placeholderText),
		
		// Key bindings
		keymap.of([
			...defaultKeymap,
			...historyKeymap,
		]),

		// Basic theme
		EditorView.theme({
			'&': {
				fontSize: '14px',
				fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
			},
			'.cm-content': {
				padding: '8px',
				minHeight: '60px',
			},
			'.cm-editor': {
				borderRadius: '6px',
				border: '1px solid #e5e5e5',
			},
			'.cm-focused': {
				outline: 'none',
				borderColor: '#3b82f6',
			},
		}),
	];

	const state = EditorState.create({
		doc: initialContent,
		extensions,
	});

	return new EditorView({
		state,
		parent: container,
	});
};

/**
 * Simple pattern highlighting for common patterns
 */
export const createPatternDecorations = () => {
	// This is a placeholder for pattern highlighting
	// In a full implementation, this would create decorations for @date, #priority, etc.
	return EditorView.theme({
		'.pattern-date': { color: '#059669' },
		'.pattern-priority': { color: '#dc2626' },
		'.pattern-tag': { color: '#7c3aed' },
		'.pattern-assignee': { color: '#ea580c' },
		'.pattern-color': { color: '#db2777' },
	});
};

/**
 * Get the current content from an editor
 */
export const getEditorContent = (view: EditorView): string => {
	return view.state.doc.toString();
};

/**
 * Set content in an editor
 */
export const setEditorContent = (view: EditorView, content: string): void => {
	view.dispatch({
		changes: {
			from: 0,
			to: view.state.doc.length,
			insert: content,
		},
	});
};

/**
 * Focus the editor
 */
export const focusEditor = (view: EditorView): void => {
	view.focus();
};

/**
 * Create an enhanced CodeMirror editor with command completions and decorations
 */
export const createEnhancedEditor = (
	container: HTMLElement,
	initialContent: string = '',
	placeholderText: string = 'Type here...',
	options: {
		enableCommandCompletions?: boolean;
		enableCommandDecorations?: boolean;
	} = {}
) => {
	const {
		enableCommandCompletions = true,
		enableCommandDecorations = true
	} = options;

	const extensions: Extension[] = [
		// Basic editing features
		history(),
		bracketMatching(),
		indentOnInput(),
		
		// Placeholder text
		placeholder(placeholderText),
		
		// Key bindings
		keymap.of([
			...defaultKeymap,
			...historyKeymap,
		]),

		// Enhanced command features
		...(enableCommandCompletions ? [createCommandCompletions()] : []),
		...(enableCommandDecorations ? [createCommandDecorations()] : []),

		// Enhanced theme with command styling
		EditorView.theme({
			'&': {
				fontSize: '14px',
				fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
			},
			'.cm-content': {
				padding: '8px',
				minHeight: '60px',
			},
			'.cm-editor': {
				borderRadius: '6px',
				border: '1px solid #e5e5e5',
			},
			'.cm-focused': {
				outline: 'none',
				borderColor: '#3b82f6',
			},
			// Command completion styling
			'.cm-tooltip-autocomplete': {
				backgroundColor: 'rgb(39 39 42)',
				border: '1px solid rgb(63 63 70)',
				borderRadius: '8px',
				color: 'rgb(244 244 245)',
				fontSize: '14px',
				boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
			},
			'.command-completion-item': {
				padding: '6px 12px',
				borderRadius: '4px',
				margin: '2px',
			},
			'.completion-section-node-types': {
				borderLeft: '3px solid rgb(34 197 94)',
				backgroundColor: 'rgba(34, 197, 94, 0.05)',
			},
			'.completion-section-patterns': {
				borderLeft: '3px solid rgb(59 130 246)',
				backgroundColor: 'rgba(59, 130, 246, 0.05)',
			},
			'.completion-section-formatting': {
				borderLeft: '3px solid rgb(251 191 36)',
				backgroundColor: 'rgba(251, 191, 36, 0.05)',
			},
			'.completion-section-templates': {
				borderLeft: '3px solid rgb(168 85 247)',
				backgroundColor: 'rgba(168, 85, 247, 0.05)',
			}
		}),
	];

	const state = EditorState.create({
		doc: initialContent,
		extensions,
	});

	return new EditorView({
		state,
		parent: container,
	});
};

// Export the new extensions
export {
	createCommandCompletions,
	createCommandDecorations
};