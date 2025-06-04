// Activity tracking types for collaboration features
// Handles change logging, activity feeds, and user action tracking

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
  | 'map_export'
  | 'group_create'
  | 'group_update'
  | 'group_delete'
  | 'layout_apply'
  | 'import_data'
  | 'restore_version';

export type ActivityTargetType = 'node' | 'edge' | 'comment' | 'map' | 'group' | 'bulk';

export type ChangeType = 'create' | 'update' | 'delete' | 'move' | 'merge' | 'split';

export interface ChangeData {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  diff?: ChangeDiff;
  affected_items?: string[];
  change_type: ChangeType;
  field_changes?: FieldChange[];
}

export interface ChangeDiff {
  added?: Record<string, unknown>;
  removed?: Record<string, unknown>;
  modified?: Record<string, unknown>;
  moved?: Array<{
    id: string;
    from: Record<string, unknown>;
    to: Record<string, unknown>;
  }>;
}

export interface FieldChange {
  field: string;
  old_value?: unknown;
  new_value?: unknown;
  change_type: 'added' | 'removed' | 'modified';
}

export interface ActivityMetadata {
  user_profile: {
    display_name?: string;
    avatar_url?: string;
    role?: string;
  };
  timestamp: string;
  session_id: string;
  change_summary: string;
  batch_id?: string;
  ai_context?: {
    prompt?: string;
    model?: string;
    confidence?: number;
    tokens_used?: number;
    processing_time?: number;
  };
  client_info?: {
    user_agent?: string;
    platform?: string;
    version?: string;
  };
  performance_metrics?: {
    operation_duration: number;
    elements_affected: number;
    complexity_score: number;
  };
}

export interface ActivityItem {
  id: string;
  map_id: string;
  user_id: string;
  action_type: ActivityActionType;
  target_type?: ActivityTargetType;
  target_id?: string;
  change_data?: ChangeData;
  metadata?: ActivityMetadata;
  change_summary?: string;
  session_id?: string;
  created_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
    display_name?: string;
  };
  related_activities?: string[]; // IDs of related activities in a batch
  is_batch_root?: boolean;
  batch_size?: number;
}

export interface BatchedActivity {
  batch_id: string;
  root_activity: ActivityItem;
  related_activities: ActivityItem[];
  total_count: number;
  action_summary: string;
  time_range: {
    start: string;
    end: string;
  };
}

export interface ActivityFilters {
  users?: string[];
  action_types?: ActivityActionType[];
  target_types?: ActivityTargetType[];
  change_types?: ChangeType[];
  date_range?: {
    start: string;
    end: string;
  };
  search_query?: string;
  show_my_changes_only?: boolean;
  include_ai_activities?: boolean;
  include_bulk_operations?: boolean;
  min_complexity?: number;
  session_id?: string;
}

export interface ActivitySearchOptions {
  query: string;
  fields: ('content' | 'summary' | 'user' | 'metadata')[];
  fuzzy_search: boolean;
  case_sensitive: boolean;
  include_related: boolean;
}

export interface ActivitySummary {
  time_period: {
    start: string;
    end: string;
  };
  total_activities: number;
  unique_users: number;
  action_breakdown: Record<ActivityActionType, number>;
  target_breakdown: Record<ActivityTargetType, number>;
  most_active_user: {
    user_id: string;
    activity_count: number;
  };
  peak_activity_hour: {
    hour: string;
    activity_count: number;
  };
  collaboration_intensity: number; // 0-1 score
  ai_usage_stats: {
    ai_activities: number;
    total_tokens: number;
    most_used_feature: string;
  };
}

export interface ActivityFeedState {
  activities: ActivityItem[];
  batched_activities: BatchedActivity[];
  is_loading: boolean;
  is_loading_more: boolean;
  has_more: boolean;
  error?: string;
  filters: ActivityFilters;
  search_options: ActivitySearchOptions;
  view_mode: 'chronological' | 'grouped' | 'threaded';
  auto_refresh: boolean;
  last_updated: string;
}

export interface ActivityStreamConfig {
  max_items_in_memory: number;
  auto_cleanup_after_hours: number;
  batch_similar_activities: boolean;
  real_time_updates: boolean;
  update_throttle_ms: number;
  prefetch_count: number;
}

export interface ActivityNotification {
  id: string;
  activity_id: string;
  user_id: string;
  type: 'mention' | 'reply' | 'edit_conflict' | 'important_change';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  action_url?: string;
}

export interface ChangeVisualization {
  target_id: string;
  change_type: ChangeType;
  visual_indicator: {
    color: string;
    icon: string;
    animation: 'pulse' | 'fade' | 'highlight' | 'glow';
    duration: number;
  };
  fade_out_after: number;
  show_until: string;
}

export interface ActivityTimeline {
  activities: ActivityItem[];
  time_buckets: Array<{
    timestamp: string;
    activities: ActivityItem[];
    summary: string;
  }>;
  current_position: number;
  can_navigate: boolean;
}

export interface UndoableActivity {
  activity: ActivityItem;
  can_undo: boolean;
  undo_deadline?: string;
  undo_action: () => Promise<void>;
  dependencies: string[]; // activity IDs that depend on this one
}

export interface ActivityExport {
  format: 'json' | 'csv' | 'pdf' | 'markdown';
  filters: ActivityFilters;
  include_metadata: boolean;
  include_diffs: boolean;
  time_range: {
    start: string;
    end: string;
  };
}

export interface ActivityImport {
  source: 'json' | 'csv' | 'external_api';
  data: Record<string, unknown>;
  mapping: Record<string, string>;
  validation_results: {
    valid_count: number;
    invalid_count: number;
    errors: string[];
  };
}

// API request/response types
export interface CreateActivityRequest {
  map_id: string;
  action_type: ActivityActionType;
  target_type?: ActivityTargetType;
  target_id?: string;
  change_data?: ChangeData;
  metadata?: Partial<ActivityMetadata>;
  change_summary?: string;
  session_id?: string;
  batch_id?: string;
}

export interface GetActivitiesRequest {
  map_id: string;
  filters?: Partial<ActivityFilters>;
  pagination?: {
    offset: number;
    limit: number;
  };
  include_batched?: boolean;
}

export interface GetActivitiesResponse {
  activities: ActivityItem[];
  total_count: number;
  has_more: boolean;
  summary?: ActivitySummary;
}

export interface SearchActivitiesRequest {
  map_id: string;
  search_options: ActivitySearchOptions;
  filters?: Partial<ActivityFilters>;
  pagination?: {
    offset: number;
    limit: number;
  };
}

// Hook return types
export interface UseActivityTrackingReturn {
  logActivity: (request: CreateActivityRequest) => Promise<void>;
  batchActivities: (activities: CreateActivityRequest[]) => Promise<void>;
  getChangeData: (before: Record<string, unknown>, after: Record<string, unknown>) => ChangeData;
  createChangeSummary: (changeData: ChangeData, actionType: ActivityActionType) => string;
  canUndo: (activityId: string) => boolean;
  undoActivity: (activityId: string) => Promise<void>;
}

export interface UseActivityFeedReturn {
  state: ActivityFeedState;
  loadActivities: (filters?: Partial<ActivityFilters>) => Promise<void>;
  loadMore: () => Promise<void>;
  searchActivities: (query: string) => Promise<void>;
  setFilters: (filters: Partial<ActivityFilters>) => void;
  clearFilters: () => void;
  exportActivities: (options: ActivityExport) => Promise<void>;
  getSummary: (timeRange?: { start: string; end: string }) => Promise<ActivitySummary>;
  subscribeToUpdates: () => void;
  unsubscribeFromUpdates: () => void;
}

export interface UseChangeVisualizationReturn {
  visualizations: ChangeVisualization[];
  addVisualization: (targetId: string, changeType: ChangeType) => void;
  removeVisualization: (targetId: string) => void;
  clearExpiredVisualizations: () => void;
  getVisualizationForTarget: (targetId: string) => ChangeVisualization | undefined;
}

// Event types for activity system
export interface ActivityCreatedEvent {
  type: 'activity_created';
  activity: ActivityItem;
  is_batch: boolean;
  batch_id?: string;
}

export interface ActivityBatchCompleteEvent {
  type: 'activity_batch_complete';
  batch: BatchedActivity;
}

export interface ActivityUndoneEvent {
  type: 'activity_undone';
  original_activity: ActivityItem;
  undo_activity: ActivityItem;
}

export type ActivityEvent = 
  | ActivityCreatedEvent 
  | ActivityBatchCompleteEvent 
  | ActivityUndoneEvent;