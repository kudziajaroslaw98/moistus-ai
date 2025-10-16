// eslint-disable-file @typescript-eslint/no-unused-vars

import type { Command } from '@/components/node-editor/core/commands/command-types';
import type { RealtimeUserSelection } from '@/hooks/realtime/use-realtime-selection-presence-room';
import { AvailableNodeTypes } from '@/registry/node-registry';
import type { ChatSlice } from '@/store/slices/chat-slice';
import type { OnboardingSlice } from '@/store/slices/onboarding-slice';
import type { QuickInputSlice } from '@/store/slices/quick-input-slice';
import type { SubscriptionSlice } from '@/store/slices/subscription-slice';
import type { SuggestionsSlice } from '@/store/slices/suggestions-slice';
import type { UserProfileSlice } from '@/store/slices/user-profile-slice';
import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import { ContextMenuState } from '@/types/context-menu-state';
import type { EdgeData } from '@/types/edge-data';
import type { HistoryItem } from '@/types/history-state';
import { HistoryState } from '@/types/history-state';
import type { LayoutDirection } from '@/types/layout-direction';
import type { SpecificLayoutConfig } from '@/types/layout-types';
import { LoadingStates } from '@/types/loading-states';
import type { MindMapData } from '@/types/mind-map-data';
import type { NodeData } from '@/types/node-data';
import { SharedUser, ShareToken, SharingError } from '@/types/sharing-types';
import { SnapLine } from '@/types/snap-line';
import { StreamingToastState, ToastStep } from '@/types/streaming-toast-state';
import { Tool } from '@/types/tool';
import type { UserProfile } from '@/types/user-profile-types';
import type {
	RealtimeChannel,
	SupabaseClient,
	User,
} from '@supabase/supabase-js';
import type {
	OnConnect,
	OnEdgesChange,
	OnNodesChange,
	ReactFlowInstance,
	XYPosition,
} from '@xyflow/react';

// Clipboard Slice
export interface ClipboardSlice {
	// Clipboard state
	copiedNodes: AppNode[];
	copiedEdges: AppEdge[];

	// Clipboard actions
	copySelectedNodes: () => void;
	pasteNodes: (position?: XYPosition) => Promise<void>;
	duplicateNodes: (nodeIds: string[]) => Promise<{
		nodes: AppNode[];
		edges: AppEdge[];
	}>;
}

// Core Data Slice
export interface CoreDataSlice {
	supabase: SupabaseClient;
	mindMap: MindMapData | null;
	mapId: string | null;
	reactFlowInstance: ReactFlowInstance | null;
	currentUser: User | null;
	userProfile: UserProfile | null;
	activeTool: Tool;

	setActiveTool: (tool: Tool) => void;
	setMindMap: (mindMap: MindMapData | null) => void;
	setReactFlowInstance: (reactFlowInstance: ReactFlowInstance | null) => void;
	setMapId: (mapId: string | null) => void;
	setCurrentUser: (currentUser: User | null) => void;
	setUserProfile: (userProfile: UserProfile | null) => void;
	setState: (state: Partial<AppState>) => void;

	generateUserProfile: (user: User | null) => UserProfile | null;
	getCurrentUser: () => Promise<User | null>;
	centerOnNode: (nodeId: string) => void;

	fetchMindMapData: (mapId: string) => Promise<void>;

	// Real-time subscription management
	subscribeToRealtimeUpdates: (mapId: string) => Promise<void>;
	unsubscribeFromRealtimeUpdates: () => Promise<void>;
}

// Edges Slice
export interface EdgesSlice {
	// Edge state
	edges: AppEdge[];
	lastSavedEdgeTimestamps: Record<string, number>;

	// Edge handlers
	onEdgesChange: OnEdgesChange<AppEdge>;
	onConnect: OnConnect;

	// Edge setters
	setEdges: (edges: AppEdge[]) => void;

	// Edge getters
	getEdge: (id: string) => AppEdge | undefined;
	getVisibleEdges: () => AppEdge[];

	// Edge actions
	addEdge: (
		sourceId: string,
		targetId: string,
		data: Partial<EdgeData>,
		toastId?: string
	) => Promise<AppEdge>;
	deleteEdges: (edgesToDelete: AppEdge[]) => Promise<void>;
	updateEdge: (props: {
		edgeId: string;
		data: Partial<EdgeData>;
	}) => Promise<void>;
	triggerEdgeSave: (edgeId: string) => void;
	setParentConnection: (edgeId: string) => void;

	// Real-time subscription management
	subscribeToEdges: (mapId: string) => Promise<void>;
	unsubscribeFromEdges: () => Promise<void>;
	_edgesSubscription: RealtimeChannel | null;
}

// Groups Slice
export interface GroupsSlice {
	// Group actions
	createGroupFromSelected: (label?: string) => Promise<void>;
	addNodesToGroup: (groupId: string, nodeIds: string[]) => Promise<void>;
	removeNodesFromGroup: (nodeIds: string[]) => Promise<void>;
	deleteGroup: (groupId: string, preserveChildren?: boolean) => Promise<void>;
	ungroupNodes: (groupId: string) => Promise<void>;
}

// History Slice
export interface HistorySlice {
	// History state
	history: ReadonlyArray<HistoryState>; // chronological asc (oldest -> newest)
	/** Parallel metadata for history entries loaded from DB (e.g., snapshotId, counts) */
	historyMeta: ReadonlyArray<HistoryItem>; // chronological asc (oldest -> newest)
	historyIndex: number; // index into history/historyMeta
	isReverting: boolean;
	/** When set, history writes are muted until this timestamp (ms since epoch). */
	historyMutedUntil?: number | null;

	// Pagination
	historyPageOffset: number;
	historyPageLimit: number;
	historyHasMore: boolean;

	// History actions
	addStateToHistory: (
		actionName?: string,
		stateOverride?: { nodes?: AppNode[]; edges?: AppEdge[] }
	) => void;
	handleUndo: () => Promise<void>;
	handleRedo: () => Promise<void>;
	revertToHistoryState: (index: number) => Promise<void>;
	loadHistoryFromDB: () => Promise<void>; // New: load recent history metadata from API
	loadMoreHistory: (mapId: string) => Promise<void>; // Pagination: load older history
	createSnapshot: (actionName?: string, isMajor?: boolean) => Promise<void>; // Pro-only manual checkpoint
	persistDeltaEvent: (
		actionName: string,
		prev: { nodes: AppNode[]; edges: AppEdge[] },
		next: { nodes: AppNode[]; edges: AppEdge[] }
	) => Promise<void>;

	// History mute helpers
	muteHistoryFor: (ms: number) => void;
	isHistoryMuted: () => boolean;

	// History selectors
	canUndo: boolean;
	canRedo: boolean;
	getCurrentHistoryState: () => HistoryState | undefined;
	canRevertChange: (delta?: any) => boolean; // Permission check for collaborative history
}

// Layout Slice
export interface LayoutSlice {
	// Layout state
	currentLayoutConfig: SpecificLayoutConfig | null;
	availableLayouts: Array<{
		id: string;
		name: string;
		description: string;
		category: string;
		config: SpecificLayoutConfig;
	}>;

	// Layout actions
	applyLayout: (direction: LayoutDirection) => Promise<void>;
	applyAdvancedLayout: (config: SpecificLayoutConfig) => Promise<void>;
	setLayoutConfig: (config: SpecificLayoutConfig) => void;
	getLayoutPresets: () => Array<{
		id: string;
		name: string;
		description: string;
		category: string;
		config: SpecificLayoutConfig;
		disabled?: boolean;
	}>;
}

export interface LoadingStatesSlice {
	// Loading state
	loadingStates: LoadingStates;

	// Loading setters
	setLoadingStates: (loadingStates: Partial<LoadingStates>) => void;
}

// Nodes Slice
export interface NodesSlice {
	// Node state
	nodes: AppNode[];
	selectedNodes: AppNode[];
	lastSavedNodeTimestamps: Record<string, number>;

	// Node handlers
	onNodesChange: OnNodesChange<AppNode>;

	// Node setters
	setNodes: (nodes: AppNode[]) => void;
	setSelectedNodes: (selectedNodes: AppNode[]) => void;

	// Node getters
	getNode: (id: string) => AppNode | undefined;

	// Node actions
	addNode: ({
		parentNode,
		content,
		nodeType,
		data,
		position,
		toastId,
	}: {
		parentNode: Partial<AppNode> | null;
		content?: string;
		nodeType?: AvailableNodeTypes;
		data?: Partial<NodeData>;
		position?: { x: number; y: number };
		toastId?: string;
	}) => Promise<void>;
	updateNode: (props: {
		nodeId: string;
		data: Partial<NodeData>;
	}) => Promise<void>;
	updateNodeDimensions: (nodeId: string, width: number, height: number) => void;
	deleteNodes: (nodesToDelete: AppNode[]) => Promise<void>;
	triggerNodeSave: (nodeId: string) => void;

	// Node hierarchy actions
	getDirectChildrenCount: (nodeId: string) => number;
	getDescendantNodeIds: (nodeId: string) => string[];
	getVisibleNodes: () => AppNode[];
	toggleNodeCollapse: (nodeId: string) => Promise<void>;

	// Real-time subscription management
	subscribeToNodes: (mapId: string) => Promise<void>;
	unsubscribeFromNodes: () => Promise<void>;
	_nodesSubscription: RealtimeChannel | null;
}

// Anonymous User Interface
interface AnonymousUser {
	user_id: string;
	display_name: string;
	avatar_url?: string;
	is_anonymous: boolean;
	created_at: string;
}

// Join Room Result Interface
interface JoinRoomResult {
	map_id: string;
	map_title: string;
	map_description?: string;
	permissions: any;
	user_id: string;
	is_anonymous: boolean;
	user_display_name: string;
	user_avatar?: string;
	websocket_channel: string;
	share_token_id: string;
	join_method: string;
}

// Sharing State
export interface SharingState {
	shareTokens: ShareToken[];
	activeToken?: ShareToken;
	currentShares?: SharedUser[];
	isCreatingToken: boolean;
	isJoiningRoom: boolean;
	authUser?: AnonymousUser;
	sharingError?: SharingError;
	lastJoinResult?: JoinRoomResult;
	_sharingSubscription?: any;
}

// Sharing Slice
export interface SharingSlice extends SharingState {
	getCurrentShareUsers: () => Promise<void>;

	createRoomCode: (
		mapId: string,
		options?: {
			role?: string;
			maxUsers?: number;
			expiresAt?: string;
		}
	) => Promise<ShareToken>;

	joinRoom: (roomCode: string, displayName?: string) => Promise<JoinRoomResult>;

	upgradeAnonymousUser: (
		email: string,
		password: string,
		displayName?: string
	) => Promise<boolean>;

	ensureAuthenticated: (displayName?: string) => Promise<boolean>;

	refreshTokens: () => Promise<void>;

	refreshRoomCode: (tokenId: string) => Promise<void>;

	revokeRoomCode: (tokenId: string) => Promise<void>;

	subscribeToSharingUpdates: (mapId: string) => void;

	unsubscribeFromSharing: () => void;

	clearError: () => void;

	reset: () => void;
}

// UI State
export interface Popovers {
	commandPalette: boolean;
	edgeEdit: boolean;
	history: boolean;
	mergeSuggestions: boolean;
	aiContent: boolean;
	generateFromNodesModal: boolean;
	contextMenu: boolean;
	layoutSelector: boolean;
	sharePanel: boolean;
	joinRoom: boolean;
	permissionManager: boolean;
	roomCodeDisplay: boolean;
	guestSignup: boolean;
	aiChat: boolean;
	referenceSearch: boolean;
}

// InlineNodeCreator types
export interface InlineCreatorState {
	isOpen: boolean;
	position: XYPosition;
	screenPosition: XYPosition;
	mode: 'quick' | 'structured';
	selectedCommand: string | null;
	filterQuery: string;
	parentNode: AppNode | null;
	suggestedType: AvailableNodeTypes | null;
}

export interface InlineCreatorOptions {
	position: XYPosition;
	screenPosition?: XYPosition;
	parentNode?: AppNode | null;
	suggestedType?: AvailableNodeTypes | null;
}

// NodeEditor types (new universal editor)
export interface NodeEditorState {
	isOpen: boolean;
	mode: 'create' | 'edit';
	position: XYPosition;
	screenPosition: XYPosition;
	editorMode: 'quick' | 'structured';
	selectedCommand: Command | null; // Store full command object from command-registry
	filterQuery: string;
	parentNode: AppNode | null;
	existingNodeId: string | null; // For edit mode
	suggestedType: AvailableNodeTypes | null;
}

export interface NodeEditorOptions {
	mode: 'create' | 'edit';
	position: XYPosition;
	screenPosition?: XYPosition;
	parentNode?: AppNode | null;
	existingNodeId?: string | null;
	suggestedType?: AvailableNodeTypes | null;
}

// CommandPalette types
export interface CommandPaletteState {
	isOpen: boolean;
	position: XYPosition;
	searchQuery: string;
	selectedIndex: number;
	filteredCommands: Command[];
	trigger: '/' | '$' | null;
	anchorPosition: number;
	activeNodeType: string;
}

export interface CommandPaletteOptions {
	position: XYPosition;
	trigger: '/' | '$' | null;
	anchorPosition: number;
	activeNodeType?: string;
}

export interface UIStateSlice {
	// UI state
	popoverOpen: Popovers;
	edgeInfo: Partial<AppEdge> | null;
	contextMenuState: ContextMenuState;
	isFocusMode: boolean;
	isDraggingNodes: boolean;
	// editingNodeId: string | null; // Removed - replaced by NodeEditor system
	snapLines: SnapLine[];
	nodeEditor: NodeEditorState;
	commandPalette: CommandPaletteState;

	// UI setters
	setPopoverOpen: (popover: Partial<Popovers>) => void;
	setEdgeInfo: (edge: AppEdge | null) => void;
	setContextMenuState: (state: ContextMenuState) => void;
	setIsDraggingNodes: (isDragging: boolean) => void;

	// UI actions
	toggleFocusMode: () => void;

	openNodeEditor: (options: NodeEditorOptions) => void;
	closeNodeEditor: () => void;
	setNodeEditorCommand: (command: Command | null) => void; // Full Command object from command-registry
	setNodeEditorMode: (mode: 'quick' | 'structured') => void;
	setNodeEditorFilterQuery: (query: string) => void;

	// CommandPalette actions
	openCommandPalette: (options: CommandPaletteOptions) => void;
	closeCommandPalette: () => void;
	setCommandPaletteSearch: (query: string) => void;
	setCommandPaletteSelection: (index: number) => void;
	navigateCommandPalette: (direction: 'up' | 'down') => void;
	executeCommand: (command: Command) => void;
}

// Realtime Slice
export interface RealtimeSlice {
	// Realtime state
	realtimeSelectedNodes: RealtimeUserSelection[];
	// Basic setters (maintaining compatibility)
	setRealtimeSelectedNodes: (nodes: RealtimeUserSelection[]) => void;
}

export interface StreamingToastSlice {
	streamingToast: StreamingToastState;
	showStreamingToast: (header: string) => void;
	updateStreamingToast: (
		update: Partial<Omit<StreamingToastState, 'isOpen' | 'toastId' | 'steps'>>
	) => void;
	hideStreamingToast: () => void;
	setStreamingToastError: (error: string) => void;
	setStreamSteps: (steps: ToastStep[]) => void;
	clearToast: () => void;
}

// Combined App State
export interface AppState
	extends CoreDataSlice,
		NodesSlice,
		EdgesSlice,
		ClipboardSlice,
		UIStateSlice,
		LoadingStatesSlice,
		HistorySlice,
		LayoutSlice,
		GroupsSlice,
		SharingSlice,
		RealtimeSlice,
		SuggestionsSlice,
		ChatSlice,
		StreamingToastSlice,
		SubscriptionSlice,
		OnboardingSlice,
		UserProfileSlice,
		QuickInputSlice {}
