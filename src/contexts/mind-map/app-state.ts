import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import { AvailableNodeTypes } from '@/types/available-node-types';
import {
	ActiveUser,
	ActivityFilters,
	CollaborationState,
	CollaborativeNodeState,
	CreateActivityRequest,
	CursorInteractionState,
	PresenceStatus,
	SelectionType,
	UpdatePresenceRequest,
} from '@/types/collaboration-types';
import type {
	Comment,
	CommentFilter,
	CommentSort,
	MapComment,
	NodeComment,
	NodeCommentSummary,
} from '@/types/comment-types';
import { ContextMenuState } from '@/types/context-menu-state';
import type { EdgeData } from '@/types/edge-data';
import { HistoryState } from '@/types/history-state';
import type { LayoutDirection } from '@/types/layout-direction';
import type { SpecificLayoutConfig } from '@/types/layout-types';
import { LoadingStates } from '@/types/loading-states';
import type { MindMapData } from '@/types/mind-map-data';
import type { NodeData } from '@/types/node-data';
import {
	ShareToken,
	SharingError,
} from '@/types/sharing-types';
import type { SupabaseClient, User, RealtimeChannel } from '@supabase/supabase-js';
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

// Collaboration Slice
export interface CollaborationSlice extends CollaborationState {
	// Connection management
	connect: (mapId: string) => Promise<void>;
	disconnect: () => Promise<void>;

	// Presence management
	joinMap: (mapId: string) => Promise<void>;
	leaveMap: () => Promise<void>;
	updatePresence: (updates: Partial<UpdatePresenceRequest>) => Promise<void>;
	setUserStatus: (status: PresenceStatus) => Promise<void>;

	// Cursor tracking
	updateCursor: (
		position: { x: number; y: number },
		viewport: { x: number; y: number; zoom: number }
	) => void;
	setCursorInteractionState: (state: CursorInteractionState) => void;
	toggleCursorVisibility: (show: boolean) => void;

	// Node selection management
	selectNode: (nodeId: string, selectionType?: SelectionType) => Promise<void>;
	deselectNode: (nodeId: string) => Promise<void>;
	clearSelections: () => Promise<void>;
	setNodeEditingState: (nodeId: string, isEditing: boolean) => void;
	checkEditPermission: (nodeId: string) => boolean;

	// Activity tracking
	logActivity: (activity: CreateActivityRequest) => Promise<void>;
	loadActivities: (filters?: ActivityFilters) => Promise<void>;
	setActivityFilters: (filters: Partial<ActivityFilters>) => void;
	clearActivityFilters: () => void;

	// UI state management
	toggleActivityFeed: () => void;
	togglePresenceIndicators: () => void;

	// Utility functions
	getUserColor: (userId: string) => string;
	isUserActive: (userId: string) => boolean;
	getNodeCollaborativeState: (nodeId: string) => CollaborativeNodeState;
	getActiveCollaborationUser: () => ActiveUser | undefined;

	// Internal state management
	_addActiveUser: (user: ActiveUser) => void;
	_removeActiveUser: (userId: string) => void;
	_updateActiveUser: (userId: string, updates: Partial<ActiveUser>) => void;
}

// Comments Slice
export interface CommentsSlice {
	// Comments state
	nodeComments: Record<string, NodeComment[]>;
	mapComments: MapComment[];
	commentFilter: CommentFilter;
	commentSort: CommentSort;
	selectedCommentId: string | null;
	commentDrafts: Record<string, string>;
	isCommentsPanelOpen: boolean;
	selectedNodeId: string | null;

	// Enhanced state from hook
	allComments: Comment[];
	commentSummaries: Map<string, NodeCommentSummary>;
	commentsError: string | null;

	// Comments actions
	fetchNodeComments: (nodeId: string) => Promise<void>;
	fetchMapComments: () => Promise<void>;
	fetchCommentsWithFilters: (options?: {
		nodeId?: string;
		mapId?: string;
	}) => Promise<void>;
	addNodeComment: (
		nodeId: string,
		content: string,
		parentId?: string,
		metadata?: { category?: string; priority?: string }
	) => Promise<void>;
	addMapComment: (
		content: string,
		position?: { x: number; y: number },
		parentId?: string
	) => Promise<void>;
	updateComment: (commentId: string, content: string) => Promise<void>;
	deleteComment: (commentId: string) => Promise<void>;
	resolveComment: (commentId: string) => Promise<void>;
	unresolveComment: (commentId: string) => Promise<void>;
	setCommentFilter: (filter: Partial<CommentFilter>) => void;
	setCommentSort: (sort: CommentSort) => void;
	setSelectedComment: (commentId: string | null) => void;
	updateCommentDraft: (targetId: string, content: string) => void;
	clearCommentDraft: (targetId: string) => void;
	setCommentsPanelOpen: (isOpen: boolean) => void;
	setSelectedNodeId: (nodeId: string | null) => void;
	initializeComments: (mapId?: string) => Promise<void>;

	// Enhanced actions from hook
	refreshComments: () => Promise<void>;
	getNodeCommentCount: (nodeId: string) => number;
	getUnresolvedCommentCount: (nodeId: string) => number;
	hasUserComments: (nodeId: string) => boolean;
	setCommentsError: (error: string | null) => void;

	// NEW: Reaction methods
	addCommentReaction: (commentId: string, emoji: string) => Promise<void>;
	removeCommentReaction: (
		commentId: string,
		reactionId: string
	) => Promise<void>;

	// Real-time subscription management
	subscribeToComments: (mapId?: string, nodeId?: string) => void;
	unsubscribeFromComments: () => void;

	// Private subscription reference
	_commentsSubscription: any;
}

// Core Data Slice
export interface CoreDataSlice {
	supabase: SupabaseClient;
	mindMap: MindMapData | null;
	mapId: string | null;
	reactFlowInstance: ReactFlowInstance | null;
	currentUser: User | null;

	setMindMap: (mindMap: MindMapData | null) => void;
	setReactFlowInstance: (reactFlowInstance: ReactFlowInstance | null) => void;
	setMapId: (mapId: string | null) => void;
	setCurrentUser: (currentUser: User | null) => void;

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
	history: ReadonlyArray<HistoryState>;
	historyIndex: number;
	isReverting: boolean;

	// History actions
	addStateToHistory: (
		actionName?: string,
		stateOverride?: { nodes?: AppNode[]; edges?: AppEdge[] }
	) => void;
	handleUndo: () => Promise<void>;
	handleRedo: () => Promise<void>;
	revertToHistoryState: (index: number) => Promise<void>;

	// History selectors
	canUndo: boolean;
	canRedo: boolean;
	getCurrentHistoryState: () => HistoryState | undefined;
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
	// State
	shareTokens: ShareToken[];
	activeToken?: ShareToken;
	isCreatingToken: boolean;
	isJoiningRoom: boolean;
	authUser?: AnonymousUser;
	sharingError?: SharingError;
	lastJoinResult?: JoinRoomResult;
}

// Sharing Slice
export interface SharingSlice extends SharingState {
	// Actions
	createRoomCode: (mapId: string, options?: {
		role?: string;
		maxUsers?: number;
		expiresAt?: string;
	}) => Promise<ShareToken>;
	
	joinRoom: (roomCode: string, displayName?: string) => Promise<JoinRoomResult>;
	
	upgradeAnonymousUser: (email: string, password: string, displayName?: string) => Promise<boolean>;
	
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
	nodeType: boolean;
	nodeEdit: boolean;
	edgeEdit: boolean;
	history: boolean;
	mergeSuggestions: boolean;
	aiContent: boolean;
	generateFromNodesModal: boolean;
	contextMenu: boolean;
	layoutSelector: boolean;
	commentsPanel: boolean;
	nodeComments: boolean;
	sharePanel: boolean;
	joinRoom: boolean;
	permissionManager: boolean;
	roomCodeDisplay: boolean;
	guestSignup: boolean;
}

export interface UIStateSlice {
	// UI state
	popoverOpen: Popovers;
	nodeInfo: Partial<AppNode> | null;
	edgeInfo: Partial<AppEdge> | null;
	contextMenuState: ContextMenuState;
	isFocusMode: boolean;
	isDraggingNodes: boolean;

	// UI setters
	setPopoverOpen: (popover: Partial<Popovers>) => void;
	setNodeInfo: (node: Partial<AppNode> | null) => void;
	setEdgeInfo: (edge: AppEdge | null) => void;
	setContextMenuState: (state: ContextMenuState) => void;
	setIsDraggingNodes: (isDragging: boolean) => void;

	// UI actions
	toggleFocusMode: () => void;
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
		CommentsSlice,
		CollaborationSlice,
		SharingSlice {}
