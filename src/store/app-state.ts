// eslint-disable-file @typescript-eslint/no-unused-vars

import type { Command } from '@/components/node-editor/core/commands/command-types';
import type { RealtimeUserSelection } from '@/hooks/realtime/use-realtime-selection-presence-room';
import { AvailableNodeTypes } from '@/registry/node-registry';
import type { ChatSlice } from '@/store/slices/chat-slice';
import type { CommentsSlice } from '@/store/slices/comments-slice';
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

// Map Access Error Types
export type MapAccessErrorType = 'access_denied' | 'not_found' | 'network_error';

export interface MapAccessError {
	type: MapAccessErrorType;
	isAnonymous: boolean;
}
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
	activeTool: Tool;
	mapAccessError: MapAccessError | null;

	setActiveTool: (tool: Tool) => void;
	setMindMap: (mindMap: MindMapData | null) => void;
	setReactFlowInstance: (reactFlowInstance: ReactFlowInstance | null) => void;
	setMapId: (mapId: string | null) => void;
	setCurrentUser: (currentUser: User | null) => void;
	setState: (state: Partial<AppState>) => void;
	setMapAccessError: (error: MapAccessError | null) => void;
	clearMapAccessError: () => void;

	generateUserProfile: (user: User | null) => UserProfile | null;
	getCurrentUser: () => Promise<User | null>;
	centerOnNode: (nodeId: string) => void;

	fetchMindMapData: (mapId: string) => Promise<void>;

	// Map operations
	updateMindMap: (
		mapId: string,
		updates: Partial<MindMapData>
	) => Promise<void>;
	deleteMindMap: (mapId: string) => Promise<void>;

	// Real-time subscription management
	subscribeToRealtimeUpdates: (mapId: string) => Promise<void>;
	unsubscribeFromRealtimeUpdates: () => Promise<void>;

	// Reset state
	reset: () => void;
}

// Edges Slice
export interface EdgesSlice {
	// Edge state
	edges: AppEdge[];
	systemUpdatedEdges: Map<string, number>;

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

	// System update tracking
	markEdgeAsSystemUpdate: (edgeId: string) => void;
	shouldSkipEdgeSave: (edgeId: string) => boolean;

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

	// History selectors
	canUndo: boolean;
	canRedo: boolean;
	getCurrentHistoryState: () => HistoryState | undefined;
	canRevertChange: (delta?: any) => boolean; // Permission check for collaborative history
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
	systemUpdatedNodes: Map<string, number>;

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
	updateNodeDimensions: (
		nodeId: string,
		width: number,
		height: number,
		imageSize?: { width: number; height: number }
	) => void;
	deleteNodes: (nodesToDelete: AppNode[]) => Promise<void>;
	triggerNodeSave: (nodeId: string) => void;

	// Node hierarchy actions
	getDirectChildrenCount: (nodeId: string) => number;
	getDescendantNodeIds: (nodeId: string) => string[];
	getVisibleNodes: () => AppNode[];
	toggleNodeCollapse: (nodeId: string) => Promise<void>;

	// System update tracking
	markNodeAsSystemUpdate: (nodeId: string) => void;
	shouldSkipNodeSave: (nodeId: string) => boolean;

	// Real-time subscription management
	subscribeToNodes: (mapId: string) => Promise<void>;
	unsubscribeFromNodes: () => Promise<void>;
	_nodesSubscription: RealtimeChannel | null;

	// Resource node metadata fetching
	fetchResourceNodeMetadata: (nodeId: string, url: string) => Promise<void>;
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

// Upgrade State Types
export type UpgradeStep =
	| 'idle'
	| 'choose_method'
	| 'enter_email'
	| 'email_sent'
	| 'verify_otp'
	| 'set_password'
	| 'oauth_pending'
	| 'completed'
	| 'error';

export type OAuthProvider = 'google' | 'github';

export interface UpgradeState {
	upgradeStep: UpgradeStep;
	upgradeEmail: string | null;
	upgradeDisplayName: string | null;
	upgradeError: string | null;
	isUpgrading: boolean;
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

	// Upgrade state (for anonymous -> full user conversion)
	upgradeStep: UpgradeStep;
	upgradeEmail: string | null;
	upgradeDisplayName: string | null;
	upgradeError: string | null;
	isUpgrading: boolean;
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

	// Legacy method - kept for backwards compatibility but deprecated
	/** @deprecated Use initiateEmailUpgrade + verifyUpgradeOtp + completeUpgradeWithPassword instead */
	upgradeAnonymousUser: (
		email: string,
		password: string,
		displayName?: string
	) => Promise<boolean>;

	// New multi-step upgrade methods
	/** Step 1: Initiate email upgrade - sends verification OTP */
	initiateEmailUpgrade: (
		email: string,
		displayName?: string
	) => Promise<boolean>;

	/** Step 2: Verify OTP code sent to email */
	verifyUpgradeOtp: (otp: string) => Promise<boolean>;

	/** Step 3: Set password after email verification */
	completeUpgradeWithPassword: (password: string) => Promise<boolean>;

	/** Alternative: Initiate OAuth upgrade (redirects to provider) */
	initiateOAuthUpgrade: (provider: OAuthProvider) => Promise<void>;

	/** Resend verification OTP */
	resendUpgradeOtp: () => Promise<boolean>;

	/** Reset upgrade state to initial */
	resetUpgradeState: () => void;

	/** Set upgrade step manually (for UI navigation) */
	setUpgradeStep: (step: UpgradeStep) => void;

	ensureAuthenticated: (displayName?: string) => Promise<boolean>;

	refreshTokens: () => Promise<void>;

	refreshRoomCode: (tokenId: string) => Promise<void>;

	revokeRoomCode: (tokenId: string) => Promise<void>;

	deleteShare: (shareId: string) => Promise<void>;

	subscribeToSharingUpdates: (mapId: string) => void;

	unsubscribeFromSharing: () => void;

	clearError: () => void;

	reset: () => void;
}

// UI State
export interface Popovers {
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
	mapSettings: boolean;
	upgradeUser: boolean;
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

// NodeEditor types (simplified)
export interface NodeEditorState {
	isOpen: boolean;
	mode: 'create' | 'edit';
	position: XYPosition;
	screenPosition: XYPosition;
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
	openTypePicker?: boolean;
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
	isCommentMode: boolean;
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
	setCommentMode: (enabled: boolean) => void;

	// UI actions
	toggleFocusMode: () => void;

	openNodeEditor: (options: NodeEditorOptions) => void;
	closeNodeEditor: () => void;

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
		GroupsSlice,
		SharingSlice,
		RealtimeSlice,
		SuggestionsSlice,
		ChatSlice,
		CommentsSlice,
		StreamingToastSlice,
		SubscriptionSlice,
		OnboardingSlice,
		UserProfileSlice,
		QuickInputSlice {}
