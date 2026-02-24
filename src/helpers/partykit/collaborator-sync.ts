import type { CollaboratorEntry } from '@/lib/realtime/collaborator-events';
import type { ShareRole } from '@/types/sharing-types';
import type { SupabaseClient } from '@supabase/supabase-js';

type CollaboratorRealtimeRow = {
	id: number;
	map_id: string | null;
	user_id: string | null;
	role: string | null;
	can_view: boolean | null;
	can_comment: boolean | null;
	can_edit: boolean | null;
	display_name: string | null;
	full_name: string | null;
	email: string | null;
	avatar_url: string | null;
	is_anonymous: boolean | null;
	created_at: string | null;
	updated_at: string | null;
};

const COLLABORATOR_SELECT_FIELDS =
	'id,map_id,user_id,role,can_view,can_comment,can_edit,display_name,full_name,email,avatar_url,is_anonymous,created_at,updated_at,status';

function normalizeRole(role: string | null | undefined): ShareRole {
	if (
		role === 'owner' ||
		role === 'editor' ||
		role === 'commentator' ||
		role === 'viewer'
	) {
		return role;
	}
	return 'viewer';
}

export function toCollaboratorEntry(
	row: CollaboratorRealtimeRow | null | undefined
): CollaboratorEntry | null {
	if (!row?.map_id || !row?.user_id) {
		return null;
	}

	const createdAt = row.created_at ?? new Date().toISOString();
	const updatedAt = row.updated_at ?? createdAt;

	return {
		shareId: String(row.id),
		mapId: row.map_id,
		userId: row.user_id,
		role: normalizeRole(row.role),
		can_view: Boolean(row.can_view),
		can_comment: Boolean(row.can_comment),
		can_edit: Boolean(row.can_edit),
		display_name: row.display_name,
		full_name: row.full_name,
		email: row.email,
		avatar_url: row.avatar_url,
		is_anonymous: Boolean(row.is_anonymous),
		created_at: createdAt,
		updated_at: updatedAt,
	};
}

export async function fetchCollaboratorEntryByShareId(
	supabase: SupabaseClient,
	shareId: number
): Promise<CollaboratorEntry | null> {
	const { data, error } = await supabase
		.from('share_access_with_profiles')
		.select(COLLABORATOR_SELECT_FIELDS)
		.eq('id', shareId)
		.eq('status', 'active')
		.maybeSingle();

	if (error) {
		throw new Error(error.message);
	}

	return toCollaboratorEntry(data as CollaboratorRealtimeRow | null);
}

export async function fetchCollaboratorEntryByMapAndUser(
	supabase: SupabaseClient,
	mapId: string,
	userId: string
): Promise<CollaboratorEntry | null> {
	const { data, error } = await supabase
		.from('share_access_with_profiles')
		.select(COLLABORATOR_SELECT_FIELDS)
		.eq('map_id', mapId)
		.eq('user_id', userId)
		.eq('status', 'active')
		.order('updated_at', { ascending: false })
		.limit(1)
		.maybeSingle();

	if (error) {
		throw new Error(error.message);
	}

	return toCollaboratorEntry(data as CollaboratorRealtimeRow | null);
}

export function toErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'Unknown error';
}
