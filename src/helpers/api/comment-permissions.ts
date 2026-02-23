import type { SupabaseClient } from '@supabase/supabase-js';

export type CommentPermissionResult = {
	allowed: boolean;
	mapExists: boolean;
};

/**
 * Returns whether a user can perform comment writes on a map.
 * Allowed when user is map owner OR has active share_access.can_comment = true.
 */
export async function canUserWriteComments(
	supabase: SupabaseClient,
	mapId: string,
	userId: string
): Promise<CommentPermissionResult> {
	const { data: map, error: mapError } = await supabase
		.from('mind_maps')
		.select('id, user_id')
		.eq('id', mapId)
		.maybeSingle();

	if (mapError) {
		throw mapError;
	}

	if (!map) {
		return {
			allowed: false,
			mapExists: false,
		};
	}

	if (map.user_id === userId) {
		return {
			allowed: true,
			mapExists: true,
		};
	}

	const { data: shareAccess, error: shareError } = await supabase
		.from('share_access')
		.select('can_comment')
		.eq('map_id', mapId)
		.eq('user_id', userId)
		.eq('status', 'active')
		.maybeSingle();

	if (shareError) {
		throw shareError;
	}

	return {
		allowed: Boolean(shareAccess?.can_comment),
		mapExists: true,
	};
}
