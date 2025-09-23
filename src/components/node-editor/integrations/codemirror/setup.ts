/**
 * CodeMirror Unified Setup
 * Single source of truth for editor configuration
 */

import { autocompletion, completionKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { EditorState, Extension } from '@codemirror/state';
import { EditorView, keymap, placeholder } from '@codemirror/view';

// Import our custom extensions
import { createCompletions } from './completions';
import { createPatternDecorations } from './pattern-decorations';
import { nodeEditorTheme } from './theme';
import { createValidationDecorations } from './validation-decorations';

/**
 * Configuration options for the node editor
 */
export interface NodeEditorConfig {
	initialContent?: string;
	placeholder?: string;
	enableCompletions?: boolean;
	enablePatternHighlighting?: boolean;
	enableValidation?: boolean;
	onContentChange?: (content: string) => void;
	onNodeTypeChange?: (nodeType: string) => void;
}

/**
 * Create a unified node editor with all features
 * This is the ONLY setup function - no basicSetup, no mindmapSetup
 */
export function createNodeEditor(
	container: HTMLElement,
	config: NodeEditorConfig = {}
): EditorView {
	const {
		initialContent = '',
		placeholder:
			placeholderText = 'Type # for tags, @ for people, ^ for dates, ! for priority...',
		enableCompletions = true,
		enablePatternHighlighting = true,
		enableValidation = true,
		onContentChange,
		onNodeTypeChange,
	} = config;

	// Build extensions array
	const extensions: Extension[] = [
		// Core editing features
		history(),
		bracketMatching(),
		indentOnInput(),
		EditorView.lineWrapping,

		// Placeholder
		placeholder(placeholderText),

		// Keymaps
		keymap.of([
			...defaultKeymap,
			...historyKeymap,
			...(enableCompletions ? completionKeymap : []),
		]),

		// Theme
		nodeEditorTheme,

		// Our custom features
		...(enableCompletions
			? [
					autocompletion({
						override: [createCompletions()],
						activateOnTyping: true,
						defaultKeymap: true,
					}),
				]
			: []),

		...(enablePatternHighlighting ? [createPatternDecorations()] : []),
		...(enableValidation ? [createValidationDecorations()] : []),

		// Change listener
		...(onContentChange
			? [
					EditorView.updateListener.of((update) => {
						if (update.docChanged) {
							onContentChange(update.state.doc.toString());
						}
					}),
				]
			: []),

		// Node type change listener
		...(onNodeTypeChange
			? [
					EditorState.transactionExtender.of((tr) => {
						// Check for $nodeType patterns
						const text = tr.newDoc.toString();
						const nodeTypeMatch = text.match(/^\$(\w+)\s/);
						if (nodeTypeMatch) {
							onNodeTypeChange(nodeTypeMatch[1]);
						}
						return null;
					}),
				]
			: []),
	];

	// Create state
	const state = EditorState.create({
		doc: initialContent,
		extensions,
	});

	// Create and return view
	return new EditorView({
		state,
		parent: container,
	});
}

/**
 * Utility functions for working with the editor
 */

export function getContent(view: EditorView): string {
	return view.state.doc.toString();
}

export function setContent(view: EditorView, content: string): void {
	view.dispatch({
		changes: {
			from: 0,
			to: view.state.doc.length,
			insert: content,
		},
	});
}

export function getCursorPosition(view: EditorView): number {
	return view.state.selection.main.head;
}

export function setCursorPosition(view: EditorView, position: number): void {
	const pos = Math.min(position, view.state.doc.length);
	view.dispatch({
		selection: { anchor: pos, head: pos },
	});
}

export function focus(view: EditorView): void {
	view.focus();
}

export function blur(view: EditorView): void {
	view.contentDOM.blur();
}

export function getSelection(view: EditorView): string {
	const { from, to } = view.state.selection.main;
	return view.state.doc.sliceString(from, to);
}

export function insertAtCursor(view: EditorView, text: string): void {
	const { from, to } = view.state.selection.main;
	view.dispatch({
		changes: { from, to, insert: text },
		selection: { anchor: from + text.length },
	});
}

export function replaceSelection(view: EditorView, text: string): void {
	view.dispatch(view.state.replaceSelection(text));
}

export function undo(view: EditorView): void {
	const undoCmd = defaultKeymap.find((k) => k.key === 'Mod-z');
	if (undoCmd?.run) {
		undoCmd.run(view);
	}
}

export function redo(view: EditorView): void {
	const redoCmd = defaultKeymap.find(
		(k) => k.key === 'Mod-y' || k.key === 'Mod-Shift-z'
	);
	if (redoCmd?.run) {
		redoCmd.run(view);
	}
}
