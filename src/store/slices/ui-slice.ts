import { BLOCKED_NODE_TYPES } from '@/constants/blocked-node-types';
import { toast } from 'sonner';
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
		recipes: false,
		plugins: false,
		edgeEdit: false,
		history: false,
		mergeSuggestions: false,
		aiContent: false,
		generateFromNodesModal: false,
		sharePanel: false,
		joinRoom: false,
		permissionManager: false,
		roomCodeDisplay: false,
		guestSignup: false,
		aiChat: false,
		referenceSearch: false,
		mapSettings: false,
		upgradeUser: false,
	},
	edgeInfo: null,
	contextMenuState: {
		x: 0,
		y: 0,
		nodeId: null,
		edgeId: null,
	},
	isFocusMode: false,
	isCommentMode: false,
	isDraggingNodes: false,
	// editingNodeId: null, // Removed - replaced by NodeEditor system
	snapLines: [],

	// NodeEditor state (simplified)
	nodeEditor: {
		isOpen: false,
		mode: 'create',
		position: { x: 0, y: 0 },
		screenPosition: { x: 0, y: 0 },
		parentNode: null,
		existingNodeId: null,
		suggestedType: null,
		extensionKind: null,
		initialValue: null,
		onboardingSource: null,
	},

	canvasSearch: { isOpen: false, query: '', activeIndex: 0 },

	// setters
	setEdgeInfo: (edgeInfo) => {
		set({ edgeInfo });
	},

	setPopoverOpen: (popover) => {
		set({ popoverOpen: { ...get().popoverOpen, ...popover } });
	},
	setIsDraggingNodes: (isDraggingNodes) => {
		set({ isDraggingNodes });
	},
	setCommentMode: (enabled) => set({ isCommentMode: enabled }),
	setContextMenuState: (state) => set({ contextMenuState: state }),

	// actions
	toggleFocusMode: () => {
		set({
			isFocusMode: !get().isFocusMode,
		});
	},
	// NodeEditor actions (simplified)
	openNodeEditor: (options) => {
		// Check permissions before opening node editor
		// Only owners and editors can create/edit nodes
		const { permissions, mindMap, currentUser } = get();
		const isOwner = Boolean(
			mindMap && currentUser && mindMap.user_id === currentUser.id
		);
		const canEdit = isOwner || Boolean(permissions.can_edit);

		if (!canEdit) {
			console.warn('Cannot open node editor: insufficient permissions');
			return;
		}

		if (options.mode === 'edit' && options.existingNodeId) {
			const node = get().nodes.find((n) => n.id === options.existingNodeId);
			if (node && BLOCKED_NODE_TYPES.has(node.data.node_type ?? '')) {
				return;
			}
			// Plugin nodes are edited with their plugin's fields, so it must be running.
			const extension = node?.data.metadata?.extension;
			if (
				node?.data.node_type === 'extensionNode' &&
				(!extension || !get().getActivePluginKind(extension.pluginId, extension.kind))
			) {
				toast.info(
					extension
						? `Turn on the ${extension.kindLabel ?? extension.kind} plugin to edit this node`
						: 'This node can’t be edited'
				);
				return;
			}
		}
		const extensionKind =
			options.suggestedType === 'extensionNode' ? (options.extensionKind ?? null) : null;
		if (options.mode === 'create' && options.suggestedType === 'extensionNode' && !extensionKind) {
			return;
		}

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
				extensionKind,
				initialValue: options.initialValue ?? null,
				onboardingSource: options.onboardingSource ?? null,
			},
		});
	},
	closeNodeEditor: () => {
		set({
			nodeEditor: {
				...get().nodeEditor,
				isOpen: false,
				existingNodeId: null,
				initialValue: null,
				onboardingSource: null,
			},
		});
	},

	// Canvas search actions
	openCanvasSearch: () => {
		set({ canvasSearch: { ...get().canvasSearch, isOpen: true } });
	},
	closeCanvasSearch: () => {
		set({ canvasSearch: { isOpen: false, query: '', activeIndex: 0 } });
	},
	setCanvasSearchQuery: (query) => {
		set({ canvasSearch: { ...get().canvasSearch, query, activeIndex: 0 } });
	},
	setCanvasSearchActiveIndex: (activeIndex) => {
		set({ canvasSearch: { ...get().canvasSearch, activeIndex } });
	},
});
