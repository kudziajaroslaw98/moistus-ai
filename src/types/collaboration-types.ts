// Core collaboration types for Moistus AI
// Defines interfaces for real-time collaboration features

// User presence and status types
export type PresenceStatus = 'active' | 'idle' | 'away' | 'offline';

export interface UserPresence {
  id: string;
  user_id: string;
  map_id: string;
  status: PresenceStatus;
  cursor_x?: number;
  cursor_y?: number;
  viewport_x?: number;
  viewport_y?: number;
  zoom_level?: number;
  last_activity: string;
  session_id?: string;
  user_color?: string;
  created_at: string;
  updated_at: string;
}

export interface ActiveUser {
  id: string;
  user_id: string;
  name: string;
  email: string;
  avatar_url?: string;
  presence: UserPresence;
  profile?: {
    display_name?: string;
    role?: string;
  };
}

// Cursor tracking types
export interface UserCursor {
  user_id: string;
  user: {
    id: string;
    name: string;
    avatar_url?: string;
    color: string;
  };
  position: {
    x: number;
    y: number;
  };
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  last_update: string;
  is_active: boolean;
  interaction_state?: CursorInteractionState;
}

export type CursorInteractionState = 
  | 'idle'
  | 'hovering'
  | 'selecting'
  | 'dragging'
  | 'editing'
  | 'typing';

// Node selection types
export type SelectionType = 'selected' | 'editing' | 'hovering';

export interface NodeSelection {
  id: string;
  user_id: string;
  map_id: string;
  node_id: string;
  selection_type: SelectionType;
  started_at: string;
  updated_at: string;
  user?: {
    id: string;
    name: string;
    avatar_url?: string;
    color: string;
  };
}

export interface CollaborativeNodeState {
  node_id: string;
  selections: NodeSelection[];
  is_being_edited: boolean;
  edit_user?: ActiveUser;
  edit_queue: string[]; // user_ids waiting to edit
}

// Activity tracking types
export type ActivityActionType =
  | 'create_node'
  | 'update_node' 
  | 'delete_node'
  | 'move_node'
  | 'create_edge'
  | 'update_edge'
  | 'delete_edge'
  | 'create_comment'
  | 'update_comment'
  | 'delete_comment'
  | 'bulk_move'
  | 'bulk_delete'
  | 'bulk_create'
  | 'ai_generate'
  | 'ai_suggest'
  | 'ai_merge'
  | 'map_update'
  | 'map_share'
  | 'map_export';

export type ActivityTargetType = 'node' | 'edge' | 'comment' | 'map' | 'bulk';

export interface ActivityChangeData {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  diff?: Record<string, unknown>;
  affected_items?: string[];
}

export interface ActivityMetadata {
  user_profile: {
    display_name?: string;
    avatar_url?: string;
  };
  timestamp: string;
  session_id: string;
  change_summary: string;
  batch_id?: string;
  ai_context?: {
    prompt?: string;
    model?: string;
    confidence?: number;
  };
  client_info?: {
    user_agent?: string;
    platform?: string;
  };
}

export interface ActivityItem {
  id: string;
  map_id: string;
  user_id: string;
  action_type: ActivityActionType;
  target_type?: ActivityTargetType;
  target_id?: string;
  change_data?: ActivityChangeData;
  metadata?: ActivityMetadata;
  change_summary?: string;
  session_id?: string;
  created_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
}

// Real-time event types
export type CollaborationEventType =
  | 'presence_update'
  | 'cursor_move'
  | 'node_select'
  | 'node_deselect'
  | 'content_change'
  | 'activity_created'
  | 'user_joined'
  | 'user_left'
  | 'editing_started'
  | 'editing_stopped'
  | 'sync_conflict'
  | 'batch_operation';

export interface CollaborationEvent {
  type: CollaborationEventType;
  payload: Record<string, unknown>;
  user_id: string;
  map_id: string;
  timestamp: string;
  session_id?: string;
}

export interface PresenceEvent extends CollaborationEvent {
  type: 'presence_update';
  payload: {
    user: ActiveUser;
    status: PresenceStatus;
    cursor?: { x: number; y: number };
    viewport?: { x: number; y: number; zoom: number };
  };
}

export interface CursorEvent extends CollaborationEvent {
  type: 'cursor_move';
  payload: {
    user_id: string;
    position: { x: number; y: number };
    viewport: { x: number; y: number; zoom: number };
    interaction_state: CursorInteractionState;
  };
}

export interface SelectionEvent extends CollaborationEvent {
  type: 'node_select' | 'node_deselect';
  payload: {
    user_id: string;
    node_id: string;
    selection_type: SelectionType;
    multiple_selection?: boolean;
  };
}

export interface ContentChangeEvent extends CollaborationEvent {
  type: 'content_change';
  payload: {
    target_type: ActivityTargetType;
    target_id: string;
    change_data: ActivityChangeData;
    optimistic_id?: string;
  };
}

// Collaboration session types
export interface CollaborationSession {
  id: string;
  map_id: string;
  started_at: string;
  ended_at?: string;
  participant_count: number;
  total_activities: number;
  session_data?: {
    peak_users?: number;
    duration_minutes?: number;
    most_active_user?: string;
    activity_breakdown?: Record<ActivityActionType, number>;
  };
  created_at: string;
}

// State management types
export interface CollaborationState {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectionError?: string;
  
  // Current session
  currentSession?: CollaborationSession;
  presenceChannel?: unknown;
  
  // Active users and presence
  activeUsers: ActiveUser[];
  activeCollaborationUser?: ActiveUser;
  
  // Cursor tracking
  cursors: UserCursor[];
  showCursors: boolean;
  
  // Node selections
  selections: NodeSelection[];
  nodeStates: Record<string, CollaborativeNodeState>;
  
  // Activity feed
  activities: ActivityItem[];
  activityFilters: ActivityFilters;
  isLoadingActivities: boolean;
  
  // UI state
  showActivityFeed: boolean;
  showPresenceIndicators: boolean;
  conflictModal?: ConflictModalState;
  
  // Performance settings
  cursorUpdateThrottle: number;
  maxActivitiesInMemory: number;
}

export interface ActivityFilters {
  users?: string[];
  actionTypes?: ActivityActionType[];
  targetTypes?: ActivityTargetType[];
  dateRange?: {
    start: string;
    end: string;
  };
  searchQuery?: string;
  showMyChangesOnly?: boolean;
}

export interface ConflictModalState {
  isOpen: boolean;
  conflictType: 'edit_conflict' | 'sync_conflict' | 'version_conflict';
  nodeId?: string;
  conflictingUser?: ActiveUser;
  message: string;
  actions: ConflictAction[];
}

export interface ConflictAction {
  label: string;
  action: () => void;
  variant?: 'primary' | 'secondary' | 'destructive';
}

// API types for collaboration operations
export interface CreatePresenceRequest {
  map_id: string;
  status: PresenceStatus;
  cursor_x?: number;
  cursor_y?: number;
  viewport_x?: number;
  viewport_y?: number;
  zoom_level?: number;
  session_id?: string;
  user_color?: string;
}

export interface UpdatePresenceRequest {
  status?: PresenceStatus;
  cursor_x?: number;
  cursor_y?: number;
  viewport_x?: number;
  viewport_y?: number;
  zoom_level?: number;
  last_activity?: string;
}

export interface CreateActivityRequest {
  map_id: string;
  action_type: ActivityActionType;
  target_type?: ActivityTargetType;
  target_id?: string;
  change_data?: ActivityChangeData;
  metadata?: Partial<ActivityMetadata>;
  change_summary?: string;
  session_id?: string;
}

export interface CreateSelectionRequest {
  map_id: string;
  node_id: string;
  selection_type: SelectionType;
}

// Utility types
export type CollaborationError = {
  code: 'CONNECTION_FAILED' | 'PERMISSION_DENIED' | 'SYNC_CONFLICT' | 'RATE_LIMITED' | 'UNKNOWN';
  message: string;
  details?: Record<string, unknown>;
};

export type CollaborationConfig = {
  maxConcurrentUsers: number;
  cursorUpdateInterval: number;
  presenceUpdateInterval: number;
  activityRetentionDays: number;
  conflictResolutionStrategy: 'first_wins' | 'last_wins' | 'manual';
  enableCursorTracking: boolean;
  enableActivityFeed: boolean;
  enablePresenceIndicators: boolean;
};

// Hook return types
export interface UseCollaborationReturn {
  // State
  state: CollaborationState;
  
  // Connection management
  connect: (mapId: string) => Promise<void>;
  disconnect: () => Promise<void>;
  
  // Presence management
  updatePresence: (updates: Partial<UpdatePresenceRequest>) => Promise<void>;
  
  // Cursor tracking
  updateCursor: (position: { x: number; y: number }, viewport: { x: number; y: number; zoom: number }) => void;
  
  // Node selection
  selectNode: (nodeId: string, selectionType?: SelectionType) => Promise<void>;
  deselectNode: (nodeId: string) => Promise<void>;
  clearSelections: () => Promise<void>;
  
  // Activity tracking
  logActivity: (activity: CreateActivityRequest) => Promise<void>;
  loadActivities: (filters?: ActivityFilters) => Promise<void>;
  
  // Conflict resolution
  resolveConflict: (resolution: 'accept' | 'reject' | 'merge') => Promise<void>;
  
  // Utility functions
  getUserColor: (userId: string) => string;
  isUserActive: (userId: string) => boolean;
  canEditNode: (nodeId: string) => boolean;
}

export interface UsePresenceReturn {
  activeUsers: ActiveUser[];
  currentUser?: ActiveUser;
  updatePresence: (updates: Partial<UpdatePresenceRequest>) => Promise<void>;
  joinMap: (mapId: string) => Promise<void>;
  leaveMap: () => Promise<void>;
}

export interface UseActivityFeedReturn {
  activities: ActivityItem[];
  filters: ActivityFilters;
  isLoading: boolean;
  loadMore: () => Promise<void>;
  setFilters: (filters: Partial<ActivityFilters>) => void;
  searchActivities: (query: string) => Promise<void>;
  getActivitySummary: (timeRange?: { start: string; end: string }) => Promise<Record<string, unknown>>;
}