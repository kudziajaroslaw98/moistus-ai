// Presence-specific types for real-time user presence tracking
// Focused on cursor positions, user status, and presence management

export type PresenceStatus = 'active' | 'idle' | 'away' | 'offline';

export interface CursorPosition {
  x: number;
  y: number;
  timestamp: number;
}

export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
  width: number;
  height: number;
}

export interface UserPresenceData {
  user_id: string;
  map_id: string;
  status: PresenceStatus;
  cursor: CursorPosition;
  viewport: ViewportState;
  last_activity: number;
  session_id: string;
  user_color: string;
  interaction_state: CursorInteractionState;
}

export type CursorInteractionState = 
  | 'idle'
  | 'moving'
  | 'hovering_node'
  | 'selecting_node'
  | 'dragging_node'
  | 'editing_node'
  | 'typing'
  | 'drawing_edge'
  | 'panning'
  | 'zooming';

export interface CursorStyle {
  color: string;
  size: number;
  opacity: number;
  show_label: boolean;
  animation_duration: number;
}

export interface PresenceIndicator {
  user_id: string;
  display_name: string;
  avatar_url?: string;
  color: string;
  status: PresenceStatus;
  last_seen: number;
  is_current_user: boolean;
}

export interface PresenceUpdate {
  type: 'cursor' | 'status' | 'viewport' | 'interaction';
  user_id: string;
  data: Partial<UserPresenceData>;
  timestamp: number;
}

export interface PresenceChannelConfig {
  map_id: string;
  user_id: string;
  throttle_ms: number;
  heartbeat_interval: number;
  offline_timeout: number;
  cleanup_interval: number;
}

export interface PresenceChannelState {
  connected_users: Map<string, UserPresenceData>;
  local_user: UserPresenceData;
  is_connected: boolean;
  last_heartbeat: number;
  connection_quality: 'excellent' | 'good' | 'poor' | 'disconnected';
}

// Events for presence system
export interface PresenceJoinEvent {
  type: 'join';
  user: UserPresenceData;
  timestamp: number;
}

export interface PresenceLeaveEvent {
  type: 'leave';
  user_id: string;
  timestamp: number;
}

export interface PresenceUpdateEvent {
  type: 'update';
  user_id: string;
  changes: Partial<UserPresenceData>;
  timestamp: number;
}

export interface PresenceSyncEvent {
  type: 'sync';
  users: UserPresenceData[];
  timestamp: number;
}

export type PresenceEvent = 
  | PresenceJoinEvent 
  | PresenceLeaveEvent 
  | PresenceUpdateEvent 
  | PresenceSyncEvent;

// Cursor tracking specific types
export interface CursorTrackingConfig {
  enabled: boolean;
  throttle_ms: number;
  show_inactive_cursors: boolean;
  inactive_timeout: number;
  smooth_animation: boolean;
  show_cursor_trails: boolean;
  max_trail_length: number;
}

export interface CursorTrail {
  positions: CursorPosition[];
  max_length: number;
  fade_duration: number;
}

export interface RenderedCursor {
  user_id: string;
  position: CursorPosition;
  style: CursorStyle;
  trail?: CursorTrail;
  label: string;
  is_visible: boolean;
  last_update: number;
}

// Presence analytics types
export interface PresenceMetrics {
  total_users: number;
  active_users: number;
  idle_users: number;
  average_session_duration: number;
  peak_concurrent_users: number;
  cursor_update_frequency: number;
  connection_stability: number;
}

export interface PresenceHeatmap {
  map_id: string;
  time_range: {
    start: number;
    end: number;
  };
  heat_points: Array<{
    x: number;
    y: number;
    intensity: number;
    user_count: number;
  }>;
  resolution: number;
}

// Status transition types
export interface StatusTransition {
  from: PresenceStatus;
  to: PresenceStatus;
  timestamp: number;
  trigger: 'user_action' | 'timeout' | 'system' | 'manual';
}

export interface StatusHistory {
  user_id: string;
  transitions: StatusTransition[];
  current_status: PresenceStatus;
  total_active_time: number;
  last_activity: number;
}

// Presence management API types
export interface CreatePresenceRequest {
  map_id: string;
  initial_cursor?: CursorPosition;
  initial_viewport?: ViewportState;
  session_metadata?: Record<string, unknown>;
}

export interface UpdatePresenceRequest {
  cursor?: CursorPosition;
  viewport?: ViewportState;
  status?: PresenceStatus;
  interaction_state?: CursorInteractionState;
}

export interface PresenceHeartbeat {
  user_id: string;
  timestamp: number;
  status: PresenceStatus;
  quick_cursor?: CursorPosition;
}

// Utility types for presence management
export type PresenceEventHandler = (event: PresenceEvent) => void;
export type CursorUpdateHandler = (cursor: RenderedCursor) => void;
export type StatusChangeHandler = (user_id: string, status: PresenceStatus) => void;

export interface PresenceCallbacks {
  onUserJoin?: PresenceEventHandler;
  onUserLeave?: PresenceEventHandler;
  onPresenceUpdate?: PresenceEventHandler;
  onCursorUpdate?: CursorUpdateHandler;
  onStatusChange?: StatusChangeHandler;
  onConnectionChange?: (connected: boolean) => void;
}

// Color generation and management
export interface UserColorPalette {
  primary: string;
  secondary: string;
  cursor: string;
  selection: string;
  text: string;
}

export interface ColorAssignment {
  user_id: string;
  colors: UserColorPalette;
  assigned_at: number;
  is_custom: boolean;
}

export type ColorGenerationStrategy = 'hash' | 'sequential' | 'random' | 'custom';

export interface ColorManager {
  strategy: ColorGenerationStrategy;
  available_colors: string[];
  assigned_colors: Map<string, ColorAssignment>;
  getColorForUser: (user_id: string, display_name?: string) => UserColorPalette;
  releaseColor: (user_id: string) => void;
  setCustomColor: (user_id: string, colors: UserColorPalette) => void;
}