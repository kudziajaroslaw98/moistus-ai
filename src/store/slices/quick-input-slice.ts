import type { StateCreator } from 'zustand';
import type { AvailableNodeTypes } from '@/registry/node-registry';

export interface QuickInputSlice {
	// Quick Input state
	quickInputValue: string;
	quickInputNodeType: AvailableNodeTypes | null;
	quickInputCursorPosition: number;

	// Quick Input actions
	setQuickInputValue: (value: string) => void;
	setQuickInputNodeType: (nodeType: AvailableNodeTypes) => void;
	setQuickInputCursorPosition: (position: number) => void;
	resetQuickInput: () => void;
	initializeQuickInput: (value: string, nodeType: AvailableNodeTypes) => void;
}

export const createQuickInputSlice: StateCreator<QuickInputSlice> = (set) => ({
	// Initial state
	quickInputValue: '',
	quickInputNodeType: null,
	quickInputCursorPosition: 0,

	// Actions
	setQuickInputValue: (value) => {
		set({ quickInputValue: value });
	},

	setQuickInputNodeType: (nodeType) => {
		set({ quickInputNodeType: nodeType });
	},

	setQuickInputCursorPosition: (position) => {
		set({ quickInputCursorPosition: position });
	},

	resetQuickInput: () => {
		set({
			quickInputValue: '',
			quickInputNodeType: null,
			quickInputCursorPosition: 0,
		});
	},

	initializeQuickInput: (value, nodeType) => {
		set({
			quickInputValue: value,
			quickInputNodeType: nodeType,
			quickInputCursorPosition: value.length,
		});
	},
});