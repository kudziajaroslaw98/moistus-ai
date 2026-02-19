/**
 * CodeMirror Unified Setup
 * Single source of truth for editor configuration
 */

import { autocompletion, completionKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { EditorState, Extension } from '@codemirror/state';
import {
	EditorView,
	highlightActiveLine,
	keymap,
	placeholder,
	scrollPastEnd,
} from '@codemirror/view';

// Import our custom extensions
import { commandRegistry } from '../../core/commands/command-registry';
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
		scrollPastEnd(),
		highlightActiveLine(),
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
						// Custom render for color swatches inline
						addToOptions: [
							{
								render: (completion) => {
									// Only render swatches for color completions
									const label = completion.label;
									if (
										label.startsWith('color:') ||
										label.startsWith('bg:') ||
										label.startsWith('border:')
									) {
										const hex = completion.detail as string;
										if (hex && hex.startsWith('#')) {
											const swatch = document.createElement('span');
											swatch.className = 'color-swatch';
											swatch.style.backgroundColor = hex;
											// Add minimal margin to position closer to label
											swatch.style.marginRight = '8px';
											return swatch;
										}
									}
									return null;
								},
								position: 20, // Render before the label
							},
						],
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
						// Check for $nodeType patterns anywhere in text
						const text = tr.newDoc.toString();
						const nodeTypeMatch = text.match(/\$(\w+)(\s|$)/);

						if (nodeTypeMatch) {
							// Validate the trigger is a complete, valid command
							const trigger = `$${nodeTypeMatch[1]}`;
							const command = commandRegistry.getCommandByTrigger(trigger);

							// Only fire type change if it's a valid complete command
							if (command?.nodeType) {
								onNodeTypeChange(nodeTypeMatch[1]);
							}
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
