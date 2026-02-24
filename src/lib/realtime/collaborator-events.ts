import type { ShareRole } from '@/types/sharing-types';

export type CollaboratorEntry = {
	shareId: string;
	mapId: string;
	userId: string;
	role: ShareRole;
	can_view: boolean;
	can_comment: boolean;
	can_edit: boolean;
	display_name: string | null;
	full_name: string | null;
	email: string | null;
	avatar_url: string | null;
	is_anonymous: boolean;
	created_at: string;
	updated_at: string;
};

export type SharingCollaboratorsSnapshotEvent = {
	type: 'sharing:collaborators:snapshot';
	mapId: string;
	occurredAt: string;
	collaborators: CollaboratorEntry[];
};

export type SharingCollaboratorUpsertEvent = {
	type: 'sharing:collaborator:upsert';
	mapId: string;
	occurredAt: string;
	collaborator: CollaboratorEntry;
};

export type SharingCollaboratorRemoveEvent = {
	type: 'sharing:collaborator:remove';
	mapId: string;
	occurredAt: string;
	removedShareIds: string[];
};

export type CollaboratorRealtimeEvent =
	| SharingCollaboratorsSnapshotEvent
	| SharingCollaboratorUpsertEvent
	| SharingCollaboratorRemoveEvent;

export type CollaboratorAdminEventPayload =
	| SharingCollaboratorUpsertEvent
	| SharingCollaboratorRemoveEvent;

function isShareRole(value: unknown): value is ShareRole {
	return (
		value === 'owner' ||
		value === 'editor' ||
		value === 'commentator' ||
		value === 'viewer'
	);
}

function isCollaboratorEntry(value: unknown): value is CollaboratorEntry {
	if (!value || typeof value !== 'object') return false;
	const payload = value as Record<string, unknown>;
	return (
		typeof payload.shareId === 'string' &&
		typeof payload.mapId === 'string' &&
		typeof payload.userId === 'string' &&
		isShareRole(payload.role) &&
		typeof payload.can_view === 'boolean' &&
		typeof payload.can_comment === 'boolean' &&
		typeof payload.can_edit === 'boolean' &&
		(payload.display_name == null || typeof payload.display_name === 'string') &&
		(payload.full_name == null || typeof payload.full_name === 'string') &&
		(payload.email == null || typeof payload.email === 'string') &&
		(payload.avatar_url == null || typeof payload.avatar_url === 'string') &&
		typeof payload.is_anonymous === 'boolean' &&
		typeof payload.created_at === 'string' &&
		typeof payload.updated_at === 'string'
	);
}

export function isCollaboratorRealtimeEvent(
	value: unknown
): value is CollaboratorRealtimeEvent {
	if (!value || typeof value !== 'object') return false;
	const payload = value as Record<string, unknown>;
	if (
		typeof payload.mapId !== 'string' ||
		typeof payload.occurredAt !== 'string'
	) {
		return false;
	}

	if (payload.type === 'sharing:collaborators:snapshot') {
		return (
			Array.isArray(payload.collaborators) &&
			payload.collaborators.every(isCollaboratorEntry)
		);
	}

	if (payload.type === 'sharing:collaborator:upsert') {
		return isCollaboratorEntry(payload.collaborator);
	}

	if (payload.type === 'sharing:collaborator:remove') {
		return (
			Array.isArray(payload.removedShareIds) &&
			payload.removedShareIds.every((id) => typeof id === 'string')
		);
	}

	return false;
}

