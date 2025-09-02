/**
 * CodeMirror Editor Configuration and Setup
 * Provides the main CodeMirror editor configuration with all extensions
 */

import { EditorState, Extension } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { bracketMatching, indentOnInput, syntaxHighlighting } from "@codemirror/language";
// Search functionality removed for now to avoid dependency issues
import { autocompletion, completionKeymap, closeBrackets } from "@codemirror/autocomplete";
import { defaultHighlightStyle } from "@codemirror/language";

// Import our custom extensions
import { validationDecorations, patternDecorations } from './decorations';
import { mindmapLang } from './language';

/**
 * Basic CodeMirror editor configuration
 */
export const basicSetup: Extension = [
	// Core functionality
	history(),
	bracketMatching(),
	closeBrackets(),
	autocompletion(),
	indentOnInput(),
	syntaxHighlighting(defaultHighlightStyle, { fallback: true }),

	// Keymaps
	keymap.of([
		...defaultKeymap,
		...historyKeymap,
		...completionKeymap,
	]),

	// Editor styling
	EditorView.theme({
		'&': {
			fontSize: '14px',
			fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
		},
		'.cm-content': {
			padding: '12px',
			minHeight: '60px',
		},
		'.cm-focused': {
			outline: 'none',
		},
		'.cm-editor': {
			borderRadius: '6px',
			border: '1px solid rgba(255, 255, 255, 0.1)',
			backgroundColor: 'rgba(0, 0, 0, 0.2)',
		},
		'.cm-scroller': {
			fontFamily: 'inherit',
		},
	}, { dark: true }),

	// Line wrapping
	EditorView.lineWrapping,
];

/**
 * Mind map editor configuration with pattern highlighting and validation
 */
export const mindmapEditorSetup: Extension = [
	// Basic setup
	basicSetup,
	
	// Mind map language support
	mindmapLang(),
	
	// Pattern decorations (syntax highlighting)
	patternDecorations,
	
	// Validation decorations (error highlighting)
	validationDecorations,
	
	// Editor configuration
	EditorState.allowMultipleSelections.of(true),
	
	// Custom placeholder text
	EditorView.domEventHandlers({
		focus: (event, view) => {
			const element = event.target as HTMLElement;
			if (element.getAttribute('data-placeholder')) {
				element.removeAttribute('data-placeholder');
			}
		},
		blur: (event, view) => {
			const element = event.target as HTMLElement;
			if (view.state.doc.toString().trim() === '') {
				element.setAttribute('data-placeholder', 'Enter your content...');
			}
		}
	}),
];

/**
 * Create a new CodeMirror editor state with mind map configuration
 */
export function createMindmapEditorState(
	initialContent: string = '',
	extensions: Extension[] = []
): EditorState {
	return EditorState.create({
		doc: initialContent,
		extensions: [
			mindmapEditorSetup,
			extensions
		]
	});
}

/**
 * Create a new CodeMirror editor view with mind map configuration
 */
export function createMindmapEditorView(
	parent: HTMLElement,
	initialContent: string = '',
	extensions: Extension[] = []
): EditorView {
	const state = createMindmapEditorState(initialContent, extensions);
	
	return new EditorView({
		state,
		parent
	});
}

/**
 * Utility to update editor content while preserving cursor position
 */
export function updateEditorContent(
	view: EditorView,
	newContent: string,
	preserveCursor: boolean = true
): void {
	const cursorPos = preserveCursor ? view.state.selection.main.head : 0;
	const maxPos = Math.min(cursorPos, newContent.length);
	
	view.dispatch({
		changes: {
			from: 0,
			to: view.state.doc.length,
			insert: newContent
		},
		selection: preserveCursor ? { anchor: maxPos, head: maxPos } : undefined
	});
}

/**
 * Get the current text content from the editor
 */
export function getEditorContent(view: EditorView): string {
	return view.state.doc.toString();
}

/**
 * Set focus to the editor and optionally set cursor position
 */
export function focusEditor(view: EditorView, position?: number): void {
	view.focus();
	
	if (typeof position === 'number') {
		const maxPos = Math.min(position, view.state.doc.length);
		view.dispatch({
			selection: { anchor: maxPos, head: maxPos }
		});
	}
}

/**
 * Check if the editor has focus
 */
export function isEditorFocused(view: EditorView): boolean {
	return view.hasFocus;
}

/**
 * Get current cursor position in the editor
 */
export function getCursorPosition(view: EditorView): number {
	return view.state.selection.main.head;
}

/**
 * Get current selected text in the editor
 */
export function getSelectedText(view: EditorView): string {
	const selection = view.state.selection.main;
	if (selection.empty) return '';
	
	return view.state.doc.sliceString(selection.from, selection.to);
}

/**
 * Insert text at current cursor position
 */
export function insertText(view: EditorView, text: string): void {
	const selection = view.state.selection.main;
	
	view.dispatch({
		changes: {
			from: selection.from,
			to: selection.to,
			insert: text
		},
		selection: {
			anchor: selection.from + text.length
		}
	});
}

/**
 * Replace all content in the editor
 */
export function replaceAllContent(view: EditorView, newContent: string): void {
	view.dispatch({
		changes: {
			from: 0,
			to: view.state.doc.length,
			insert: newContent
		}
	});
}