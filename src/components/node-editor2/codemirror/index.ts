/**
 * CodeMirror configuration and extensions for node editor
 * Simple setup for text editing with basic functionality
 */

import { EditorState, Extension } from '@codemirror/state';
import { EditorView, keymap, placeholder } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { bracketMatching, indentOnInput } from '@codemirror/language';
// Search functionality not needed for basic setup

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