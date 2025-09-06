import type { StateCreator } from 'zustand';
import type { AvailableNodeTypes } from '@/types/available-node-types';

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
		console.log('🔵 Zustand setQuickInputValue called:', { value });
		set({ quickInputValue: value });
	},

	setQuickInputNodeType: (nodeType) => {
		console.log('🔵 Zustand setQuickInputNodeType called:', { nodeType });
		set({ quickInputNodeType: nodeType });
	},

	setQuickInputCursorPosition: (position) => {
		set({ quickInputCursorPosition: position });
	},

	resetQuickInput: () => {
		console.log('🔵 Zustand resetQuickInput called');
		set({
			quickInputValue: '',
			quickInputNodeType: null,
			quickInputCursorPosition: 0,
		});
	},

	initializeQuickInput: (value, nodeType) => {
		console.log('🔵 Zustand initializeQuickInput called:', { value, nodeType, valueLength: value?.length });
		set({
			quickInputValue: value,
			quickInputNodeType: nodeType,
			quickInputCursorPosition: value.length,
		});
	},
});