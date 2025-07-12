import { StateCreator } from 'zustand';
import { AppState, UIStateSlice } from '../app-state';

export const createUiStateSlice: StateCreator<
	AppState,
	[],
	[],
	UIStateSlice
> = (set, get) => ({
	// state
	popoverOpen: {
		contextMenu: false,
		commandPalette: false,
		nodeType: false,
		nodeEdit: false,
		edgeEdit: false,
		history: false,
		mergeSuggestions: false,
		aiContent: false,
		generateFromNodesModal: false,
		layoutSelector: false,
		commentsPanel: false,
		nodeComments: false,
		sharePanel: false,
		joinRoom: false,
		permissionManager: false,
		roomCodeDisplay: false,
		guestSignup: false,
		aiChat: false,
		referenceSearch: false,
	},
	nodeInfo: null,
	edgeInfo: null,
	contextMenuState: {
		x: 0,
		y: 0,
		nodeId: null,
		edgeId: null,
	},
	isFocusMode: false,
	isDraggingNodes: false,
	editingNodeId: null,
	snapLines: [],

	// setters
	setEdgeInfo: (edgeInfo) => {
		set({ edgeInfo });
	},
	setNodeInfo: (nodeInfo) => {
		set({ nodeInfo });
	},
	setPopoverOpen: (popover) => {
		set({ popoverOpen: { ...get().popoverOpen, ...popover } });
	},
	setIsDraggingNodes: (isDraggingNodes) => {
		set({ isDraggingNodes });
	},
	setContextMenuState: (state) => set({ contextMenuState: state }),

	// actions
	toggleFocusMode: () => {
		set({
			isFocusMode: !get().isFocusMode,
		});
	},
});
