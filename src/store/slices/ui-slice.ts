import type { Command } from '@/components/node-editor/core/commands/command-types';
import { nodeCommands } from '@/components/node-editor/core/commands/node-commands';
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
		edgeEdit: false,
		history: false,
		mergeSuggestions: false,
		aiContent: false,
		generateFromNodesModal: false,
		layoutSelector: false,
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
	},

	// CommandPalette state (inline node type switching)
	commandPalette: {
		isOpen: false,
		position: { x: 0, y: 0 },
		searchQuery: '',
		selectedIndex: 0,
		filteredCommands: [],
		trigger: null,
		anchorPosition: 0,
		activeNodeType: 'defaultNode',
	},

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
		const { lastJoinResult, mindMap, currentUser } = get();
		const isOwner = Boolean(
			mindMap && currentUser && mindMap.user_id === currentUser.id
		);
		const canEdit = isOwner || Boolean(lastJoinResult?.permissions?.can_edit);

		if (!canEdit) {
			console.warn('Cannot open node editor: insufficient permissions');
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
			},
		});
	},
	closeNodeEditor: () => {
		set({
			nodeEditor: {
				...get().nodeEditor,
				isOpen: false,
				existingNodeId: null,
			},
		});
	},

	// CommandPalette actions
	openCommandPalette: (options) => {
		// Filter commands based on trigger type
		const filteredCommands = nodeCommands.filter((command) => {
			if (options.trigger === '/') {
				// For '/' trigger, show all commands
				return true;
			} else if (options.trigger === '$') {
				// For '$' trigger, show only variable/data type commands
				return ['content', 'media'].includes(command.category);
			}

			return true;
		});

		set({
			commandPalette: {
				...get().commandPalette,
				isOpen: true,
				position: options.position,
				trigger: options.trigger,
				anchorPosition: options.anchorPosition,
				activeNodeType: options.activeNodeType || 'defaultNode',
				filteredCommands,
				searchQuery: '',
				selectedIndex: 0,
			},
		});
	},

	closeCommandPalette: () => {
		set({
			commandPalette: {
				...get().commandPalette,
				isOpen: false,
				searchQuery: '',
				selectedIndex: 0,
				filteredCommands: [],
				trigger: null,
				anchorPosition: 0,
			},
		});
	},

	setCommandPaletteSearch: (query) => {
		const { commandPalette } = get();
		const allCommands = nodeCommands.filter((command: Command) => {
			if (commandPalette.trigger === '/') {
				return true;
			} else if (commandPalette.trigger === '$') {
				return ['content', 'media'].includes(command.category);
			}

			return true;
		});

		// Filter commands based on search query
		const filteredCommands =
			query.trim() === ''
				? allCommands
				: allCommands.filter(
						(command: Command) =>
							command.label.toLowerCase().includes(query.toLowerCase()) ||
							command.trigger.toLowerCase().includes(query.toLowerCase()) ||
							command.description.toLowerCase().includes(query.toLowerCase())
					);

		set({
			commandPalette: {
				...commandPalette,
				searchQuery: query,
				filteredCommands,
				selectedIndex: 0, // Reset selection when search changes
			},
		});
	},

	setCommandPaletteSelection: (index) => {
		const { commandPalette } = get();
		const maxIndex = Math.max(0, commandPalette.filteredCommands.length - 1);
		const validIndex = Math.max(0, Math.min(index, maxIndex));

		set({
			commandPalette: {
				...commandPalette,
				selectedIndex: validIndex,
			},
		});
	},

	navigateCommandPalette: (direction) => {
		const { commandPalette } = get();
		const maxIndex = Math.max(0, commandPalette.filteredCommands.length - 1);
		let newIndex = commandPalette.selectedIndex;

		if (direction === 'up') {
			newIndex = newIndex > 0 ? newIndex - 1 : maxIndex;
		} else if (direction === 'down') {
			newIndex = newIndex < maxIndex ? newIndex + 1 : 0;
		}

		set({
			commandPalette: {
				...commandPalette,
				selectedIndex: newIndex,
			},
		});
	},

	executeCommand: (command) => {
		const { commandPalette } = get();

		// This will be used by the CodeMirror extension to handle the command execution
		// The actual node creation/editing will be handled by the calling component
		console.log(
			'Executing command:',
			command,
			'at position:',
			commandPalette.position
		);

		// Close the command palette after execution
		get().closeCommandPalette();
	},
});
