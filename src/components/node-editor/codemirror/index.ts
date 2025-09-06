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
import { nodeEditorTheme } from './themes';

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

		// Use node editor theme
		nodeEditorTheme,
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

		// Use node editor theme
		nodeEditorTheme,
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

// Export the new extensions and completion functions
export {
	createCommandCompletions,
	createCommandDecorations
};

// Export completion functions for integration
export { 
	commandCompletions,
	nodeTypeCompletions,
	slashCommandCompletions
} from './command-completions';