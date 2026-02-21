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
import { type CollaboratorMention, createCompletions } from './completions';
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
	collaborators?: CollaboratorMention[];
}

/** Get up to 2 uppercase initials from a display name */
function getInitials(name: string): string {
	return name
		.split(/\s+/)
		.slice(0, 2)
		.map((w) => w[0]?.toUpperCase() ?? '')
		.join('');
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
		collaborators,
	} = config;

	const { source: completionSource, mentionMap } = createCompletions(
		collaborators ?? []
	);

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
						override: [completionSource],
						activateOnTyping: true,
						defaultKeymap: true,
						addToOptions: [
							// Position 19: avatar + role badge for @ mention completions
							{
								position: 19,
								render(completion) {
									const meta = mentionMap.get(completion.label);
									if (!meta) return null;

									const wrapper = document.createElement('span');
									wrapper.style.cssText =
										'display:inline-flex;align-items:center;gap:4px;marginRight:6px';

									// Avatar circle (18×18)
									const avatar = document.createElement('span');
									avatar.style.cssText =
										'display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;font-size:9px;font-weight:600;flex-shrink:0;overflow:hidden;background:rgba(139,92,246,0.2);color:#a78bfa';

									if (meta.avatarUrl) {
										const img = document.createElement('img');
										img.src = meta.avatarUrl;
										img.style.cssText =
											'width:100%;height:100%;object-fit:cover;border-radius:50%';
										img.onerror = () => {
											img.remove();
											avatar.textContent = getInitials(meta.displayName);
										};
										avatar.appendChild(img);
									} else {
										avatar.textContent = getInitials(meta.displayName);
									}

									// Role badge
									const badge = document.createElement('span');
									badge.textContent = `[${meta.role}]`;
									badge.style.cssText =
										'font-size:9px;opacity:0.5;letter-spacing:0.02em';

									wrapper.appendChild(avatar);
									wrapper.appendChild(badge);
									return wrapper;
								},
							},
							// Position 20: color swatch for color: bg: border: completions
							{
								render: (completion) => {
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
											swatch.style.marginRight = '8px';
											return swatch;
										}
									}
									return null;
								},
								position: 20,
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
