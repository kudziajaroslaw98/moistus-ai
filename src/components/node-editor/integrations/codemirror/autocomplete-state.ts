import {
	completionStatus,
	currentCompletions,
	selectedCompletionIndex,
} from '@codemirror/autocomplete';
import type { EditorState } from '@codemirror/state';
import type { EditorAutocompleteState } from '../../types';

export const EMPTY_EDITOR_AUTOCOMPLETE_STATE: EditorAutocompleteState = {
	status: null,
	options: [],
	selectedIndex: null,
};

export function getEditorAutocompleteState(
	state: EditorState
): EditorAutocompleteState {
	const status = completionStatus(state);

	if (!status) {
		return EMPTY_EDITOR_AUTOCOMPLETE_STATE;
	}

	return {
		status,
		options: currentCompletions(state),
		selectedIndex: selectedCompletionIndex(state),
	};
}

export function areEditorAutocompleteStatesEqual(
	current: EditorAutocompleteState,
	next: EditorAutocompleteState
): boolean {
	if (
		current.status !== next.status ||
		current.selectedIndex !== next.selectedIndex ||
		current.options.length !== next.options.length
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
