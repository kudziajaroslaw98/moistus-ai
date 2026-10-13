import type { SupabaseClient } from '@supabase/supabase-js';
import { McpToolError } from '../errors';
import type { McpMapInfo, McpMapRole } from './types';

export interface McpMapAccess {
	role: McpMapRole;
	canEdit: boolean;
}

const SHARE_ROLES = new Set<McpMapRole>(['editor', 'commentator', 'viewer']);

/**
 * The caller's role on a map, mirroring the app: the owner and editors can
 * edit; commentators and viewers read; templates are read-only for everyone.
 */
export async function getMapAccess(
	supabase: SupabaseClient,
	map: Pick<McpMapInfo, 'id' | 'ownerId' | 'isTemplate'>,
	userId: string
): Promise<McpMapAccess> {
	if (map.ownerId === userId) return { role: 'owner', canEdit: true };

	const { data, error } = await supabase
		.from('share_access')
		.select('role, can_edit')
		.eq('map_id', map.id)
		.eq('user_id', userId)
		.eq('status', 'active')
		.maybeSingle<{ role: string | null; can_edit: boolean | null }>();

	if (error) throw new McpToolError(`Could not check your access: ${error.message}`);

	if (data) {
		const role = SHARE_ROLES.has(data.role as McpMapRole)
			? (data.role as McpMapRole)
			: 'viewer';
		return { role, canEdit: data.can_edit === true };
	}

	if (map.isTemplate) return { role: 'viewer', canEdit: false };

	throw new McpToolError('Map not found, or you no longer have access to it.');
}
