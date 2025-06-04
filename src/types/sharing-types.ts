// Mind map sharing types for Moistus AI
// Defines interfaces for sharing mind maps between users

// Core sharing types
export type ShareRole = 'owner' | 'editor' | 'commenter' | 'viewer';

export interface MindMapShare {
  id: string;
  map_id: string;
  user_id: string;
  can_edit: boolean;
  can_comment: boolean;
  can_view: boolean;
  role: ShareRole;
  shared_by?: string;
  shared_at: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SharedUser {
  id: string;
  user_id: string;
  name: string;
  email: string;
  avatar_url?: string;
  share: MindMapShare;
  profile?: {
    display_name?: string;
    role?: string;
  };
}

export interface SharePermissions {
  can_edit: boolean;
  can_comment: boolean;
  can_view: boolean;
  can_share: boolean;
  can_delete: boolean;
  role: ShareRole;
}

// Share invitation types
export interface ShareInvitation {
  id: string;
  map_id: string;
  map_title: string;
  invited_email: string;
  invited_by: string;
  inviter_name: string;
  role: ShareRole;
  permissions: SharePermissions;
  expires_at?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  created_at: string;
  updated_at: string;
}

// Share link types
export type ShareLinkAccess = 'restricted' | 'anyone_with_link' | 'public';

export interface ShareLink {
  id: string;
  map_id: string;
  access_level: ShareLinkAccess;
  role: ShareRole;
  permissions: SharePermissions;
  link_token: string;
  expires_at?: string;
  is_active: boolean;
  usage_count: number;
  max_uses?: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// API request types
export interface CreateShareRequest {
  map_id: string;
  user_email?: string;
  user_id?: string;
  role: ShareRole;
  can_edit?: boolean;
  can_comment?: boolean;
  can_view?: boolean;
  expires_at?: string;
  send_notification?: boolean;
  message?: string;
}

export interface UpdateShareRequest {
  role?: ShareRole;
  can_edit?: boolean;
  can_comment?: boolean;
  can_view?: boolean;
  expires_at?: string;
}

export interface CreateShareLinkRequest {
  map_id: string;
  access_level: ShareLinkAccess;
  role: ShareRole;
  expires_at?: string;
  max_uses?: number;
  require_auth?: boolean;
}

export interface UpdateShareLinkRequest {
  access_level?: ShareLinkAccess;
  role?: ShareRole;
  expires_at?: string;
  max_uses?: number;
  is_active?: boolean;
}

// Bulk operations
export interface BulkShareRequest {
  map_id: string;
  shares: CreateShareRequest[];
  send_notifications?: boolean;
  message?: string;
}

export interface BulkUpdateSharesRequest {
  share_ids: string[];
  updates: UpdateShareRequest;
}

// Share analytics types
export interface ShareAnalytics {
  total_shares: number;
  active_shares: number;
  shares_by_role: Record<ShareRole, number>;
  recent_activity: {
    shares_created: number;
    shares_accepted: number;
    shares_declined: number;
    period: 'day' | 'week' | 'month';
  };
  top_shared_maps: Array<{
    map_id: string;
    map_title: string;
    share_count: number;
    last_shared: string;
  }>;
}

// Component prop types
export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  mapId: string;
  mapTitle: string;
  currentShares?: SharedUser[];
  onShareCreated?: (share: MindMapShare) => void;
  onShareUpdated?: (share: MindMapShare) => void;
  onShareDeleted?: (shareId: string) => void;
}

export interface ShareListProps {
  mapId: string;
  shares: SharedUser[];
  currentUserId: string;
  canManageShares: boolean;
  onUpdateShare: (shareId: string, updates: UpdateShareRequest) => Promise<void>;
  onDeleteShare: (shareId: string) => Promise<void>;
  onResendInvitation?: (shareId: string) => Promise<void>;
}

export interface ShareInviteFormProps {
  mapId: string;
  onInviteUser: (invitation: CreateShareRequest) => Promise<void>;
  isLoading?: boolean;
  suggestions?: Array<{
    email: string;
    name: string;
    avatar_url?: string;
  }>;
}

export interface ShareLinkManagerProps {
  mapId: string;
  shareLinks: ShareLink[];
  onCreateLink: (request: CreateShareLinkRequest) => Promise<void>;
  onUpdateLink: (linkId: string, updates: UpdateShareLinkRequest) => Promise<void>;
  onDeleteLink: (linkId: string) => Promise<void>;
  onCopyLink: (link: ShareLink) => void;
}

// Utility types
export interface ShareValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface ShareConflict {
  type: 'duplicate_user' | 'permission_conflict' | 'expired_invitation';
  user_email?: string;
  existing_role?: ShareRole;
  suggested_action: string;
}

// Hook return types
export interface UseSharingReturn {
  // State
  shares: SharedUser[];
  shareLinks: ShareLink[];
  invitations: ShareInvitation[];
  analytics: ShareAnalytics | null;
  isLoading: boolean;
  error: string | null;
  
  // Share management
  createShare: (request: CreateShareRequest) => Promise<MindMapShare>;
  updateShare: (shareId: string, updates: UpdateShareRequest) => Promise<MindMapShare>;
  deleteShare: (shareId: string) => Promise<void>;
  
  // Bulk operations
  createBulkShares: (request: BulkShareRequest) => Promise<MindMapShare[]>;
  updateBulkShares: (request: BulkUpdateSharesRequest) => Promise<void>;
  
  // Share links
  createShareLink: (request: CreateShareLinkRequest) => Promise<ShareLink>;
  updateShareLink: (linkId: string, updates: UpdateShareLinkRequest) => Promise<ShareLink>;
  deleteShareLink: (linkId: string) => Promise<void>;
  copyShareLink: (link: ShareLink) => Promise<void>;
  
  // Invitations
  sendInvitation: (shareId: string) => Promise<void>;
  resendInvitation: (shareId: string) => Promise<void>;
  acceptInvitation: (invitationId: string) => Promise<void>;
  declineInvitation: (invitationId: string) => Promise<void>;
  
  // Permissions
  getUserPermissions: (mapId: string, userId?: string) => SharePermissions;
  canUserAccess: (mapId: string, userId: string, action: string) => boolean;
  
  // Validation
  validateShare: (request: CreateShareRequest) => ShareValidationResult;
  checkConflicts: (request: CreateShareRequest) => ShareConflict[];
  
  // Analytics
  loadAnalytics: () => Promise<void>;
  refreshShares: () => Promise<void>;
}

export interface UseSharePermissionsReturn {
  permissions: SharePermissions;
  isOwner: boolean;
  canEdit: boolean;
  canComment: boolean;
  canView: boolean;
  canShare: boolean;
  canDelete: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

// Event types for real-time updates
export type SharingEventType =
  | 'share_created'
  | 'share_updated'
  | 'share_deleted'
  | 'invitation_sent'
  | 'invitation_accepted'
  | 'invitation_declined'
  | 'share_link_created'
  | 'share_link_used'
  | 'permission_changed';

export interface SharingEvent {
  type: SharingEventType;
  map_id: string;
  user_id: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

// Error types
export type SharingError = {
  code: 'PERMISSION_DENIED' | 'USER_NOT_FOUND' | 'INVALID_EMAIL' | 'SHARE_LIMIT_EXCEEDED' | 'EXPIRED_INVITATION' | 'UNKNOWN';
  message: string;
  details?: Record<string, unknown>;
};

// Configuration types
export interface SharingConfig {
  maxSharesPerMap: number;
  maxShareLinksPerMap: number;
  defaultRole: ShareRole;
  allowPublicSharing: boolean;
  requireEmailVerification: boolean;
  invitationExpiryDays: number;
  linkExpiryDays: number;
  enableShareAnalytics: boolean;
  allowedDomains?: string[];
  blockedDomains?: string[];
}