/**
 * CodeMirror Unified Setup
 * Single source of truth for editor configuration
 */

import {
	autocompletion,
	completionKeymap,
	startCompletion,
} from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { Compartment, EditorState, Extension } from '@codemirror/state';
import {
	EditorView,
	highlightActiveLine,
	type KeyBinding,
	keymap,
	placeholder,
	scrollPastEnd,
	tooltips,
} from '@codemirror/view';
import { getInitials } from '@/utils/collaborator-utils';

// Import our custom extensions
import { commandRegistry } from '../../core/commands/command-registry';
import type { EditorAutocompleteState } from '../../types';
import {
	areEditorAutocompleteStatesEqual,
	getEditorAutocompleteState,
} from './autocomplete-state';
import { type CollaboratorMention, createCompletions } from './completions';
import { createPatternDecorations } from './pattern-decorations';
import { nodeEditorTheme } from './theme';
import { getTooltipSpace } from './tooltip-viewport';
import { createValidationDecorations } from './validation-decorations';

export const DEFAULT_NODE_EDITOR_PLACEHOLDER =
	'Type # for tags, @ for people, ^ for dates, ! for priority...';

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
	onAutocompleteChange?: (state: EditorAutocompleteState) => void;
	showNativeAutocompleteTooltip?: boolean;
	collaborators?: CollaboratorMention[];
}

export interface NodeEditorRuntimeConfig {
	placeholder?: string;
	showNativeAutocompleteTooltip?: boolean;
}

export type NodeEditorView = EditorView & {
	updateRuntimeConfig: (config: NodeEditorRuntimeConfig) => void;
};

export function getNodeEditorKeybindings(
	enableCompletions: boolean
): KeyBinding[] {
	return [
		...(enableCompletions
			? [
					{
						mac: 'Mod-.',
						run: startCompletion,
					},
				]
			: []),
		...defaultKeymap,
		...historyKeymap,
		...(enableCompletions ? completionKeymap : []),
	];
}

function resolvePlaceholderText(placeholderText?: string) {
	return placeholderText || DEFAULT_NODE_EDITOR_PLACEHOLDER;
}

function createAutocompleteExtension(
	enableCompletions: boolean,
	completionSource: ReturnType<typeof createCompletions>['source'],
	mentionMap: ReturnType<typeof createCompletions>['mentionMap'],
	showNativeAutocompleteTooltip: boolean
): Extension {
	if (!enableCompletions) {
		return [];
	}

	return autocompletion({
		override: [completionSource],
		activateOnTyping: true,
		defaultKeymap: true,
		tooltipClass: () =>
			showNativeAutocompleteTooltip ? '' : 'cm-tooltip-autocomplete-hidden',
		addToOptions: [
			// Position 19: avatar + role badge for @ mention completions
			{
				position: 19,
				render(completion) {
					const meta = mentionMap.get(completion.label);
					if (!meta) return null;

					const wrapper = document.createElement('span');
					wrapper.style.cssText =
						'display:inline-flex;align-items:center;gap:4px;margin-right:6px;';

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
			// Position 20: color swatch for color: completions
			{
				render: (completion) => {
					const label = completion.label;
					if (label.startsWith('color:')) {
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
	});
}

/**
 * Create a unified node editor with all features
 * This is the ONLY setup function - no basicSetup, no mindmapSetup
 */
export function createNodeEditor(
	container: HTMLElement,
	config: NodeEditorConfig = {}
): NodeEditorView {
	let lastEmittedNodeType: string | null = null;
	let lastAutocompleteState: EditorAutocompleteState | null = null;
	const placeholderCompartment = new Compartment();
	const autocompleteCompartment = new Compartment();

	const {
		initialContent = '',
		placeholder: placeholderText,
		enableCompletions = true,
		enablePatternHighlighting = true,
		enableValidation = true,
		onContentChange,
		onNodeTypeChange,
		onAutocompleteChange,
		showNativeAutocompleteTooltip = true,
		collaborators,
	} = config;

	const { source: completionSource, mentionMap } = createCompletions(
		collaborators ?? []
	);
	const runtimeConfig = {
		placeholder: resolvePlaceholderText(placeholderText),
		showNativeAutocompleteTooltip,
	};

	const emitAutocompleteChange = (view: EditorView) => {
		if (!onAutocompleteChange) {
			return;
		}

		const nextAutocompleteState = getEditorAutocompleteState(view);

		if (
			lastAutocompleteState &&
			areEditorAutocompleteStatesEqual(
				lastAutocompleteState,
				nextAutocompleteState
			)
		) {
			return;
		}

		lastAutocompleteState = nextAutocompleteState;
		onAutocompleteChange(nextAutocompleteState);
	};

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
		placeholderCompartment.of(placeholder(runtimeConfig.placeholder)),

		// Keymaps
		keymap.of(getNodeEditorKeybindings(enableCompletions)),

		// Theme
		nodeEditorTheme,

		// Render tooltips at document level so autocomplete isn't clipped by modal bounds.
		tooltips({
			parent: container.ownerDocument.body,
			position: 'fixed',
			tooltipSpace: (view) => getTooltipSpace(view),
		}),

		// Our custom features
		autocompleteCompartment.of(
			createAutocompleteExtension(
				enableCompletions,
				completionSource,
				mentionMap,
				runtimeConfig.showNativeAutocompleteTooltip
			)
		),

		...(enablePatternHighlighting ? [createPatternDecorations()] : []),
		...(enableValidation ? [createValidationDecorations()] : []),

		// Change listeners
		...(onContentChange || onNodeTypeChange
			? [
						EditorView.updateListener.of((update) => {
							if (!update.docChanged) return;
							const text = update.state.doc.toString();
							onContentChange?.(text);

							if (!onNodeTypeChange) return;

							// Check for $nodeType patterns anywhere in text
							const nodeTypeMatch = text.match(/\$(\w+)(\s|$)/);
							if (!nodeTypeMatch) {
								lastEmittedNodeType = null;
								return;
							}

							// Validate the trigger is a complete, valid command
							const extractedNodeType = nodeTypeMatch[1];
							const trigger = `$${extractedNodeType}`;
							const command = commandRegistry.getCommandByTrigger(trigger);

							// Only fire type change if it's a valid complete command
							// and changed since last emission to avoid duplicate calls.
							if (!command?.nodeType) {
								lastEmittedNodeType = null;
								return;
							}

							if (lastEmittedNodeType === extractedNodeType) return;
							lastEmittedNodeType = extractedNodeType;
							onNodeTypeChange(extractedNodeType);
						}),
					]
				: []),
		...(onAutocompleteChange
			? [
					EditorView.updateListener.of((update) => {
						emitAutocompleteChange(update.view);
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
	const view = new EditorView({
		state,
		parent: container,
	});
	const nodeEditorView = Object.assign(view, {
		updateRuntimeConfig(nextConfig: NodeEditorRuntimeConfig) {
			const effects = [];
			const nextPlaceholder = resolvePlaceholderText(
				nextConfig.placeholder ?? runtimeConfig.placeholder
			);
			const nextShowNativeAutocompleteTooltip =
				nextConfig.showNativeAutocompleteTooltip ??
				runtimeConfig.showNativeAutocompleteTooltip;

			if (nextPlaceholder !== runtimeConfig.placeholder) {
				runtimeConfig.placeholder = nextPlaceholder;
				effects.push(
					placeholderCompartment.reconfigure(placeholder(nextPlaceholder))
				);
			}

			if (
				enableCompletions &&
				nextShowNativeAutocompleteTooltip !==
					runtimeConfig.showNativeAutocompleteTooltip
			) {
				runtimeConfig.showNativeAutocompleteTooltip =
					nextShowNativeAutocompleteTooltip;
				effects.push(
					autocompleteCompartment.reconfigure(
						createAutocompleteExtension(
							enableCompletions,
							completionSource,
							mentionMap,
							nextShowNativeAutocompleteTooltip
						)
					)
				);
			}

			if (effects.length > 0) {
				nodeEditorView.dispatch({ effects });
				emitAutocompleteChange(nodeEditorView);
			}
		},
	});

	emitAutocompleteChange(nodeEditorView);

	return nodeEditorView;
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
