import type { StateCreator } from 'zustand';
import type { AvailableNodeTypes } from '@/registry/node-registry';
import type { PluginKindRef } from '@/types/plugins';

export interface QuickInputSlice {
	// Quick Input state
	quickInputValue: string;
	quickInputNodeType: AvailableNodeTypes | null;
	/** Plugin kind when the node type is `extensionNode`. */
	quickInputExtensionKind: PluginKindRef | null;
	quickInputCursorPosition: number;

	// Quick Input actions
	setQuickInputValue: (value: string) => void;
	setQuickInputNodeType: (
		nodeType: AvailableNodeTypes,
		extensionKind?: PluginKindRef | null
	) => void;
	setQuickInputCursorPosition: (position: number) => void;
	resetQuickInput: () => void;
	initializeQuickInput: (
		value: string,
		nodeType: AvailableNodeTypes,
		extensionKind?: PluginKindRef | null
	) => void;
}

export const createQuickInputSlice: StateCreator<QuickInputSlice> = (set) => ({
	// Initial state
	quickInputValue: '',
	quickInputNodeType: null,
	quickInputExtensionKind: null,
	quickInputCursorPosition: 0,

	// Actions
	setQuickInputValue: (value) => {
		set({ quickInputValue: value });
	},

	setQuickInputNodeType: (nodeType, extensionKind = null) => {
		set({
			quickInputNodeType: nodeType,
			quickInputExtensionKind: nodeType === 'extensionNode' ? extensionKind : null,
		});
	},

	setQuickInputCursorPosition: (position) => {
		set({ quickInputCursorPosition: position });
	},

	resetQuickInput: () => {
		set({
			quickInputValue: '',
			quickInputNodeType: null,
			quickInputExtensionKind: null,
			quickInputCursorPosition: 0,
		});
	},

	initializeQuickInput: (value, nodeType, extensionKind = null) => {
		set({
			quickInputValue: value,
			quickInputNodeType: nodeType,
			quickInputExtensionKind: nodeType === 'extensionNode' ? extensionKind : null,
			quickInputCursorPosition: value.length,
		});
	},
});