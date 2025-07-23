// eslint-disable-file @typescript-eslint/no-unused-vars

import type { UserProfile } from '@/helpers/user-profile-helpers';
import type { RealtimeUserSelection } from '@/hooks/realtime/use-realtime-selection-presence-room';
import type { ChatSlice } from '@/store/slices/chat-slice';
import type { OnboardingSlice } from '@/store/slices/onboarding-slice';
import type {
	FieldActivityState,
	FieldActivityUser,
	FormConflict,
	MergeStrategy,
	RealtimeFormFieldState,
	RealtimeFormState,
	UserFieldPresence,
} from '@/store/slices/realtime-slice';
import type { SubscriptionSlice } from '@/store/slices/subscription-slice';
import type { SuggestionsSlice } from '@/store/slices/suggestions-slice';
import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import { AvailableNodeTypes } from '@/types/available-node-types';
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
import { SharedUser, ShareToken, SharingError } from '@/types/sharing-types';
import { SnapLine } from '@/types/snap-line';
import { StreamingToastState, ToastStep } from '@/types/streaming-toast-state';
import { Tool } from '@/types/tool';
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

export interface UIStateSlice {
	// UI state
	popoverOpen: Popovers;
	nodeInfo: Partial<AppNode> | null;
	edgeInfo: Partial<AppEdge> | null;
	contextMenuState: ContextMenuState;
	isFocusMode: boolean;
	isDraggingNodes: boolean;
	editingNodeId: string | null;
	snapLines: SnapLine[];
	inlineCreator: InlineCreatorState;

	// UI setters
	setPopoverOpen: (popover: Partial<Popovers>) => void;
	setNodeInfo: (node: Partial<AppNode> | null) => void;
	setEdgeInfo: (edge: AppEdge | null) => void;
	setContextMenuState: (state: ContextMenuState) => void;
	setIsDraggingNodes: (isDragging: boolean) => void;

	// UI actions
	toggleFocusMode: () => void;

	// InlineNodeCreator actions
	openInlineCreator: (options: InlineCreatorOptions) => void;
	closeInlineCreator: () => void;
	setInlineCreatorCommand: (command: string) => void;
	setInlineCreatorMode: (mode: 'quick' | 'structured') => void;
	setInlineCreatorFilterQuery: (query: string) => void;
}

// Enhanced Form State
export interface EnhancedFormState {
	isConnected: boolean;
	activeUsers: string[];
	conflicts: FormConflict[];
	pendingUpdates: Record<string, any>;
	optimisticUpdates: Record<string, RealtimeFormFieldState>;
}

// Realtime Slice
export interface RealtimeSlice {
	// Realtime state
	realtimeSelectedNodes: RealtimeUserSelection[];
	formState: RealtimeFormState;
	enhancedFormState: EnhancedFormState;

	// Field activity state
	fieldActivities: Record<string, FieldActivityState>;
	userFieldPresences: Record<string, UserFieldPresence>;

	// Basic setters (maintaining compatibility)
	setRealtimeSelectedNodes: (nodes: RealtimeUserSelection[]) => void;
	setFormState: (formState: Record<string, any>) => void;

	// Enhanced form state management
	updateFormField: (fieldName: string, value: any, userId: string) => void;

	// Conflict management
	addFormConflict: (conflict: FormConflict) => void;
	resolveFormConflict: (
		fieldName: string,
		resolution: 'local' | 'remote'
	) => void;
	clearFormConflicts: () => void;

	// Connection and user management
	setFormConnectionStatus: (isConnected: boolean) => void;
	setFormActiveUsers: (users: string[]) => void;

	// Form state merging with conflict detection
	mergeFormState: (
		remoteState: RealtimeFormState,
		strategy?: MergeStrategy
	) => void;

	// Utility methods
	getFormFieldValue: (fieldName: string) => any;
	getFormFieldState: (fieldName: string) => RealtimeFormFieldState | null;
	hasFormConflicts: () => boolean;
	getFormConflicts: () => FormConflict[];
	resetFormState: (userId: string, mapId: string) => void;

	// Field activity tracking methods
	trackFieldActivity: (
		fieldName: string,
		action: 'focus' | 'blur' | 'edit',
		nodeId?: string
	) => void;
	trackRemoteFieldActivity: (
		fieldName: string,
		action: 'focus' | 'blur' | 'edit',
		remoteUserId: string,
		remoteUserProfile: {
			displayName: string;
			avatarUrl: string;
			color: string;
			isAnonymous: boolean;
		},
		nodeId?: string
	) => void;
	getFieldActivity: (fieldName: string) => FieldActivityState | null;
	getActiveUsersForField: (fieldName: string) => FieldActivityUser[];
	clearFieldActivity: () => void;
	updateUserFieldPresence: (presence: Partial<UserFieldPresence>) => void;
	getUserFieldPresence: (userId: string) => UserFieldPresence | null;
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
		CommentsSlice,
		SharingSlice,
		RealtimeSlice,
		SuggestionsSlice,
		ChatSlice,
		StreamingToastSlice,
		SubscriptionSlice,
		OnboardingSlice {}
