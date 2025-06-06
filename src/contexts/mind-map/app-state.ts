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
	CreateGuestUserRequest,
	CreateRoomCodeRequest,
	GuestUser,
	JoinRoomRequest,
	ShareAccessLog,
	ShareAccessType,
	ShareAccessValidation,
	ShareToken,
	SharingError,
} from '@/types/sharing-types';
import type { SupabaseClient, User } from '@supabase/supabase-js';
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
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
}

// Sharing State
export interface SharingState {
	// Room codes and tokens
	shareTokens: ShareToken[];
	activeToken?: ShareToken;
	isCreatingToken: boolean;

	// Guest users
	guestUsers: GuestUser[];
	currentGuestUser?: GuestUser;
	isGuestSession: boolean;

	// Access logs and analytics
	accessLogs: ShareAccessLog[];
	currentUsers: number;

	// UI state
	isJoiningRoom: boolean;
	isValidatingAccess: boolean;
	sharingError?: SharingError;

	// Real-time connection
	sharingChannel?: any;
	isConnectedToSharing: boolean;
}

// Sharing Slice
export interface SharingSlice extends SharingState {
	// Room code management
	createRoomCode: (request: CreateRoomCodeRequest) => Promise<ShareToken>;
	refreshRoomCode: (tokenId: string) => Promise<ShareToken>;
	revokeRoomCode: (tokenId: string) => Promise<void>;
	updateTokenPermissions: (
		tokenId: string,
		permissions: Partial<ShareToken['permissions']>
	) => Promise<ShareToken>;

	// Room joining and access
	validateRoomAccess: (token: string) => Promise<ShareAccessValidation>;
	joinRoom: (request: JoinRoomRequest) => Promise<{
		mapId: string;
		permissions: ShareToken['permissions'];
		isGuest: boolean;
	}>;
	leaveRoom: (tokenId: string) => Promise<void>;

	// Guest user management
	createGuestUser: (request: CreateGuestUserRequest) => Promise<GuestUser>;
	updateGuestUser: (
		guestId: string,
		updates: Partial<GuestUser>
	) => Promise<GuestUser>;
	convertGuestToUser: (guestId: string, userId: string) => Promise<void>;
	endGuestSession: () => Promise<void>;

	// Access logging
	logAccess: (
		tokenId: string,
		accessType: ShareAccessType,
		metadata?: Record<string, unknown>
	) => Promise<void>;
	loadAccessLogs: (tokenId: string) => Promise<void>;

	// Real-time sharing
	subscribeToSharingUpdates: (mapId: string) => Promise<void>;
	unsubscribeFromSharing: () => Promise<void>;

	// Utility functions
	generateRoomCode: () => Promise<string>;
	validatePermissions: (token: ShareToken, action: string) => boolean;
	getUserCount: (tokenId: string) => Promise<number>;
	isTokenExpired: (token: ShareToken) => boolean;

	// State management
	setActiveToken: (token: ShareToken | undefined) => void;
	setSharingError: (error: SharingError | undefined) => void;
	clearSharingData: () => void;

	// Internal state management
	_addShareToken: (token: ShareToken) => void;
	_updateShareToken: (tokenId: string, updates: Partial<ShareToken>) => void;
	_removeShareToken: (tokenId: string) => void;
	_addGuestUser: (user: GuestUser) => void;
	_updateGuestUser: (userId: string, updates: Partial<GuestUser>) => void;
	_removeGuestUser: (userId: string) => void;
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
