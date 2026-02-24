import type { ShareRole } from '@/types/sharing-types';

export interface PermissionSnapshotOrUpdateEvent {
	type: 'permissions:snapshot' | 'permissions:update';
	mapId: string;
	targetUserId: string;
	role: ShareRole;
	can_view: boolean;
	can_comment: boolean;
	can_edit: boolean;
	updatedAt: string;
}

export interface PermissionRevokedEvent {
	type: 'permissions:revoked';
	mapId: string;
	targetUserId: string;
	reason: 'access_revoked';
	revokedAt: string;
}

export type PermissionEvent =
	| PermissionSnapshotOrUpdateEvent
	| PermissionRevokedEvent;
