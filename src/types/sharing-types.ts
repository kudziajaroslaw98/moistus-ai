// Mind map sharing types for Shiko
// Defines interfaces for sharing mind maps between users with room codes and guest access

// Core sharing types
export type ShareRole = 'owner' | 'editor' | 'commentator' | 'viewer';

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

export interface SharedUser {
	id: string;
	user_id: string;
	name: string | null;
	email: string | null;
	avatar_url: string;
	share: MindMapShare;
	isAnonymous?: boolean;
	profile?: {
		display_name?: string;
		role?: string;
	};
}

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
