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
	// editingNodeId: null, // Removed - replaced by NodeEditor system
	snapLines: [],

	// InlineNodeCreator state
	inlineCreator: {
		isOpen: false,
		position: { x: 0, y: 0 },
		screenPosition: { x: 0, y: 0 },
		mode: 'quick',
		selectedCommand: null,
		filterQuery: '',
		parentNode: null,
		suggestedType: null,
	},

	// NodeEditor state (new universal editor)
	nodeEditor: {
		isOpen: false,
		mode: 'create',
		position: { x: 0, y: 0 },
		screenPosition: { x: 0, y: 0 },
		editorMode: 'quick',
		selectedCommand: null,
		filterQuery: '',
		parentNode: null,
		existingNodeId: null,
		suggestedType: null,
	},

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

	// InlineNodeCreator actions
	openInlineCreator: (options) => {
		set({
			inlineCreator: {
				...get().inlineCreator,
				isOpen: true,
				position: options.position,
				screenPosition: options.screenPosition || options.position,
				parentNode: options.parentNode || null,
				suggestedType: options.suggestedType || null,
				filterQuery: '',
				selectedCommand: null,
			},
		});
	},
	closeInlineCreator: () => {
		set({
			inlineCreator: {
				...get().inlineCreator,
				isOpen: false,
				filterQuery: '',
				selectedCommand: null,
			},
		});
	},
	setInlineCreatorCommand: (command) => {
		set({
			inlineCreator: {
				...get().inlineCreator,
				selectedCommand: command,
			},
		});
	},
	setInlineCreatorMode: (mode) => {
		set({
			inlineCreator: {
				...get().inlineCreator,
				mode,
			},
		});
	},
	setInlineCreatorFilterQuery: (query) => {
		set({
			inlineCreator: {
				...get().inlineCreator,
				filterQuery: query,
			},
		});
	},

	// NodeEditor actions (new universal editor)
	openNodeEditor: (options) => {
		set({
			nodeEditor: {
				...get().nodeEditor,
				isOpen: true,
				mode: options.mode,
				position: options.position,
				screenPosition: options.screenPosition || options.position,
				parentNode: options.parentNode || null,
				existingNodeId: options.existingNodeId || null,
				suggestedType: options.suggestedType || null,
				filterQuery: '',
				selectedCommand: null,
			},
		});
	},
	closeNodeEditor: () => {
		set({
			nodeEditor: {
				...get().nodeEditor,
				isOpen: false,
				filterQuery: '',
				selectedCommand: null,
				existingNodeId: null,
			},
		});
	},
	setNodeEditorCommand: (command) => {
		set({
			nodeEditor: {
				...get().nodeEditor,
				selectedCommand: command,
			},
		});
	},
	setNodeEditorMode: (mode) => {
		set({
			nodeEditor: {
				...get().nodeEditor,
				editorMode: mode,
			},
		});
	},
	setNodeEditorFilterQuery: (query) => {
		set({
			nodeEditor: {
				...get().nodeEditor,
				filterQuery: query,
			},
		});
	},
});
