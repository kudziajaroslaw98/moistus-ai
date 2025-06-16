// Mind map sharing types for Moistus AI
// Defines interfaces for sharing mind maps between users with room codes and guest access

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

// Room code and token types
export type ShareTokenType = 'room_code' | 'direct_link';

export interface ShareToken {
	id: string;
	map_id: string;
	token: string; // 6-character room code
	token_type: ShareTokenType;
	share_link_hash?: string;
	permissions: {
		role: ShareRole;
		can_edit: boolean;
		can_comment: boolean;
		can_view: boolean;
	};
	max_users: number;
	current_users: number;
	expires_at?: string;
	is_active: boolean;
	created_by: string;
	created_at: string;
	updated_at: string;
}

// Guest user types
export interface GuestUser {
	id: string;
	session_id: string;
	display_name: string;
	email?: string;
	avatar_url?: string;
	fingerprint_hash?: string;
	first_seen: string;
	last_activity: string;
	conversion_date?: string;
	converted_user_id?: string;
	session_data: Record<string, unknown>;
	created_at: string;
	updated_at: string;
}

// Share access logging
export type ShareAccessType = 'join' | 'leave' | 'view' | 'edit' | 'comment';

export interface ShareAccessLog {
	id: string;
	share_token_id: string;
	user_id?: string;
	guest_user_id?: string;
	access_type: ShareAccessType;
	ip_address?: string;
	user_agent?: string;
	referrer?: string;
	session_duration?: number;
	metadata: Record<string, unknown>;
	created_at: string;
}

// Room validation and access
export interface ShareAccessValidation {
	share_token_id: string;
	map_id: string;
	permissions: ShareToken['permissions'];
	is_valid: boolean;
	error_message?: string;
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

// Room code specific requests
export interface CreateRoomCodeRequest {
	map_id: string;
	role: ShareRole;
	can_edit?: boolean;
	can_comment?: boolean;
	can_view?: boolean;
	max_users?: number;
	expires_at?: string;
}

export interface JoinRoomRequest {
	token: string;
	guest_info?: {
		display_name: string;
		email?: string;
		session_id: string;
		fingerprint_hash?: string;
	};
}

export interface CreateGuestUserRequest {
	display_name: string;
	email?: string;
	session_id: string;
	fingerprint_hash?: string;
	session_data?: Record<string, unknown>;
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
	room_code_usage: {
		total_codes: number;
		active_codes: number;
		total_joins: number;
		guest_joins: number;
		conversion_rate: number;
	};
	recent_activity: {
		shares_created: number;
		shares_accepted: number;
		shares_declined: number;
		room_joins: number;
		period: 'day' | 'week' | 'month';
	};
	top_shared_maps: Array<{
		map_id: string;
		map_title: string;
		share_count: number;
		last_shared: string;
	}>;
}

// Real-time collaboration types
export type UserActivity =
	| 'editing'
	| 'commenting'
	| 'viewing'
	| 'moving'
	| 'idle';

export interface CollaborationUser {
	id: string;
	display_name: string;
	email?: string;
	avatar_url?: string;
	role: ShareRole;
	is_guest: boolean;
	current_activity?: UserActivity;
	joined_at: string;
	last_activity: string;
	cursor?: {
		x: number;
		y: number;
		timestamp: number;
	};
	viewport?: {
		x: number;
		y: number;
		zoom: number;
		width: number;
		height: number;
	};
	selected_nodes?: string[];
	color?: string;
	session_id?: string;
	metadata?: Record<string, any>;
}

export interface CollaborationPresence {
	map_id: string;
	users: CollaborationUser[];
	active_count: number;
	guest_count: number;
	last_updated: string;
}

export interface CollaborationActivity {
	id: string;
	map_id: string;
	user_id: string;
	user_name: string;
	user_avatar?: string;
	activity_type:
		| 'join'
		| 'leave'
		| 'edit'
		| 'comment'
		| 'view'
		| 'cursor_move'
		| 'selection';
	node_id?: string;
	node_name?: string;
	details?: {
		comment?: string;
		changes?: string[];
		position?: { x: number; y: number };
		previous_value?: any;
		new_value?: any;
	};
	timestamp: string;
	is_grouped?: boolean;
	group_count?: number;
}

export interface NodeLock {
	node_id: string;
	locked_by: string;
	locked_at: string;
	expires_at: string;
	lock_type: 'edit' | 'comment' | 'view';
}

export interface CollaborationSession {
	id: string;
	map_id: string;
	user_id: string;
	is_guest: boolean;
	started_at: string;
	last_activity: string;
	connection_quality: 'excellent' | 'good' | 'poor' | 'disconnected';
	permissions: SharePermissions;
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

export interface SharePanelProps {
	mapId: string;
	mapTitle: string;
	isOpen: boolean;
	onClose: () => void;
	currentUser: {
		id: string;
		name: string;
		email: string;
	};
	currentShares?: SharedUser[];
	onShareCreated?: (share: MindMapShare) => void;
	onShareUpdated?: (share: MindMapShare) => void;
	onShareDeleted?: (shareId: string) => void;
}

export interface RoomCodeDisplayProps {
	token: ShareToken;
	onRefresh?: (tokenId: string) => Promise<void>;
	onRevoke?: (tokenId: string) => Promise<void>;
	onCopy?: (token: string) => void;
	showQRCode?: boolean;
}

export interface JoinRoomProps {
	onJoinSuccess?: (mapId: string) => void;
	onJoinError?: (error: string) => void;
	initialToken?: string;
}

export interface GuestSignupProps {
	onGuestCreated?: (guest: GuestUser) => void;
	onConversion?: (userId: string) => void;
	suggestedName?: string;
}

export interface ShareListProps {
	mapId: string;
	shares: SharedUser[];
	currentUserId: string;
	canManageShares: boolean;
	onUpdateShare: (
		shareId: string,
		updates: UpdateShareRequest
	) => Promise<void>;
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
	onUpdateLink: (
		linkId: string,
		updates: UpdateShareLinkRequest
	) => Promise<void>;
	onDeleteLink: (linkId: string) => Promise<void>;
	onCopyLink: (link: ShareLink) => void;
}

export interface PermissionManagerProps {
	mapId: string;
	shares: SharedUser[];
	currentUserId: string;
	onUpdatePermissions: (
		shareId: string,
		permissions: Partial<SharePermissions>
	) => Promise<void>;
	onBulkUpdate?: (
		shareIds: string[],
		permissions: Partial<SharePermissions>
	) => Promise<void>;
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
	shareTokens: ShareToken[];
	guestUsers: GuestUser[];
	invitations: ShareInvitation[];
	analytics: ShareAnalytics | null;
	isLoading: boolean;
	error: string | null;

	// Share management
	createShare: (request: CreateShareRequest) => Promise<MindMapShare>;
	updateShare: (
		shareId: string,
		updates: UpdateShareRequest
	) => Promise<MindMapShare>;
	deleteShare: (shareId: string) => Promise<void>;

	// Room code management
	createRoomCode: (request: CreateRoomCodeRequest) => Promise<ShareToken>;
	refreshRoomCode: (tokenId: string) => Promise<ShareToken>;
	revokeRoomCode: (tokenId: string) => Promise<void>;
	updateTokenPermissions: (
		tokenId: string,
		permissions: Partial<ShareToken['permissions']>
	) => Promise<ShareToken>;

	// Room joining
	validateRoomAccess: (token: string) => Promise<ShareAccessValidation>;
	joinRoom: (request: JoinRoomRequest) => Promise<{
		mapId: string;
		permissions: ShareToken['permissions'];
		isGuest: boolean;
	}>;

	// Guest user management
	createGuestUser: (request: CreateGuestUserRequest) => Promise<GuestUser>;
	updateGuestUser: (
		guestId: string,
		updates: Partial<GuestUser>
	) => Promise<GuestUser>;
	convertGuestToUser: (guestId: string, userId: string) => Promise<void>;

	// Bulk operations
	createBulkShares: (request: BulkShareRequest) => Promise<MindMapShare[]>;
	updateBulkShares: (request: BulkUpdateSharesRequest) => Promise<void>;

	// Share links
	createShareLink: (request: CreateShareLinkRequest) => Promise<ShareLink>;
	updateShareLink: (
		linkId: string,
		updates: UpdateShareLinkRequest
	) => Promise<ShareLink>;
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

export interface UseRoomCodesReturn {
	// State
	roomCodes: ShareToken[];
	activeUsers: GuestUser[];
	isLoading: boolean;
	error: string | null;

	// Room code management
	createRoomCode: (request: CreateRoomCodeRequest) => Promise<ShareToken>;
	refreshRoomCode: (tokenId: string) => Promise<ShareToken>;
	revokeRoomCode: (tokenId: string) => Promise<void>;
	copyRoomCode: (token: ShareToken) => Promise<void>;

	// Access management
	validateAccess: (token: string) => Promise<ShareAccessValidation>;
	getCurrentUsers: (tokenId: string) => Promise<number>;

	// Real-time updates
	subscribeToUpdates: (mapId: string) => void;
	unsubscribeFromUpdates: () => void;
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

export interface UseGuestUserReturn {
	// State
	guestUser: GuestUser | null;
	isGuest: boolean;
	canConvert: boolean;
	isLoading: boolean;
	error: string | null;

	// Guest management
	createGuestSession: (request: CreateGuestUserRequest) => Promise<GuestUser>;
	updateGuestInfo: (updates: Partial<GuestUser>) => Promise<GuestUser>;
	convertToRegisteredUser: (userId: string) => Promise<void>;

	// Session management
	refreshSession: () => Promise<void>;
	endSession: () => Promise<void>;
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
	| 'permission_changed'
	| 'room_code_created'
	| 'room_code_used'
	| 'room_code_expired'
	| 'guest_user_joined'
	| 'guest_user_converted'
	| 'user_count_updated';

export interface SharingEvent {
	type: SharingEventType;
	map_id: string;
	user_id?: string;
	guest_user_id?: string;
	timestamp: string;
	payload: Record<string, unknown>;
}

// Error types
export type SharingError = {
	code:
		| 'PERMISSION_DENIED'
		| 'USER_NOT_FOUND'
		| 'INVALID_EMAIL'
		| 'SHARE_LIMIT_EXCEEDED'
		| 'EXPIRED_INVITATION'
		| 'INVALID_ROOM_CODE'
		| 'ROOM_FULL'
		| 'ROOM_EXPIRED'
		| 'GUEST_SESSION_INVALID'
		| 'UNKNOWN';
	message: string;
	details?: Record<string, unknown>;
};

// Configuration types
export interface SharingConfig {
	maxSharesPerMap: number;
	maxShareLinksPerMap: number;
	maxRoomCodesPerMap: number;
	defaultRole: ShareRole;
	allowPublicSharing: boolean;
	allowGuestAccess: boolean;
	requireEmailVerification: boolean;
	invitationExpiryDays: number;
	linkExpiryDays: number;
	roomCodeExpiryHours: number;
	guestSessionExpiryHours: number;
	maxUsersPerRoom: number;
	enableShareAnalytics: boolean;
	enableQRCodes: boolean;
	allowedDomains?: string[];
	blockedDomains?: string[];
	guestConversionIncentives: {
		showAfterMinutes: number;
		maxPrompts: number;
		benefits: string[];
	};
}

// Zod validation schemas (for runtime validation)
export interface SharingValidationSchemas {
	createShareRequest: any; // Will be defined with Zod
	createRoomCodeRequest: any;
	joinRoomRequest: any;
	createGuestUserRequest: any;
	updateShareRequest: any;
	sharePermissions: any;
}
