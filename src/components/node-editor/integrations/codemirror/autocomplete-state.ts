import {
	completionStatus,
	currentCompletions,
	selectedCompletionIndex,
} from '@codemirror/autocomplete';
import type { EditorView } from '@codemirror/view';
import type { EditorAnchorRect, EditorAutocompleteState } from '../../types';

export const EMPTY_EDITOR_AUTOCOMPLETE_STATE: EditorAutocompleteState = {
	status: null,
	options: [],
	selectedIndex: null,
	anchorRect: null,
	editorRect: null,
};

function toEditorAnchorRect(
	rect: Pick<EditorAnchorRect, 'top' | 'right' | 'bottom' | 'left'> &
		Partial<Pick<EditorAnchorRect, 'width' | 'height'>>
): EditorAnchorRect {
	return {
		top: rect.top,
		right: rect.right,
		bottom: rect.bottom,
		left: rect.left,
		width: rect.width ?? Math.max(1, rect.right - rect.left),
		height: rect.height ?? Math.max(1, rect.bottom - rect.top),
	};
}

function getAutocompleteAnchorRect(view: EditorView): EditorAnchorRect | null {
	const head = view.state.selection.main.head;
	const coords = view.coordsAtPos(head) ?? (head > 0 ? view.coordsAtPos(head - 1) : null);

	return coords ? toEditorAnchorRect(coords) : null;
}

function getEditorRect(view: EditorView): EditorAnchorRect | null {
	const rect = view.dom.getBoundingClientRect();

	return rect ? toEditorAnchorRect(rect) : null;
}

export function getEditorAutocompleteState(
	view: EditorView
): EditorAutocompleteState {
	const state = view.state;
	const status = completionStatus(state);

	if (!status) {
		return EMPTY_EDITOR_AUTOCOMPLETE_STATE;
	}

	return {
		status,
		options: currentCompletions(state),
		selectedIndex: selectedCompletionIndex(state),
		anchorRect: getAutocompleteAnchorRect(view),
		editorRect: getEditorRect(view),
	};
}

function areRectsEqual(
	current: EditorAnchorRect | null,
	next: EditorAnchorRect | null
): boolean {
	if (!current || !next) {
		return current === next;
	}

	return (
		current.top === next.top &&
		current.right === next.right &&
		current.bottom === next.bottom &&
		current.left === next.left &&
		current.width === next.width &&
		current.height === next.height
	);
}

export function areEditorAutocompleteStatesEqual(
	current: EditorAutocompleteState,
	next: EditorAutocompleteState
): boolean {
	if (
		current.status !== next.status ||
		current.selectedIndex !== next.selectedIndex ||
		current.options.length !== next.options.length ||
		!areRectsEqual(current.anchorRect, next.anchorRect) ||
		!areRectsEqual(current.editorRect, next.editorRect)
	) {
		return false;
	}

	for (let index = 0; index < current.options.length; index += 1) {
		const currentOption = current.options[index];
		const nextOption = next.options[index];

		if (
			currentOption?.label !== nextOption?.label ||
			currentOption?.detail !== nextOption?.detail ||
			currentOption?.type !== nextOption?.type
		) {
			return false;
		}
	}

	return true;
}
