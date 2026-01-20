import { createClient, createServiceRoleClient } from '@/helpers/supabase/server';

export type AccessStatus =
	| 'owner'
	| 'shared'
	| 'template'
	| 'no_access'
	| 'not_found'
	| 'no_session';

export interface AccessCheckResult {
	status: AccessStatus;
	userId?: string;
	isAnonymous?: boolean;
	mapTitle?: string;
}

/**
 * Server-side access check for mind map routes.
 * Validates user session and map access before rendering.
 *
 * @param mapId - The mind map ID to check access for
 * @returns Access status and metadata
 */
export async function checkMapAccess(mapId: string): Promise<AccessCheckResult> {
	const supabase = await createClient();
	const {
		data: { user },
		error,
	} = await supabase.auth.getUser();

	if (error || !user) {
		return { status: 'no_session' };
	}

	// Service role bypasses RLS for access checks
	const adminClient = createServiceRoleClient();

	// Check map existence and ownership
	const { data: map, error: mapError } = await adminClient
		.from('mind_maps')
		.select('id, user_id, title, is_template')
		.eq('id', mapId)
		.maybeSingle();

	if (mapError) {
		console.error('[access-check] Error checking map existence:', mapError);
		// Treat DB errors as not found for security (don't leak error details)
		return {
			status: 'not_found',
			userId: user.id,
			isAnonymous: user.is_anonymous ?? false,
		};
	}

	if (!map) {
		return {
			status: 'not_found',
			userId: user.id,
			isAnonymous: user.is_anonymous ?? false,
		};
	}

	// Template check - templates are viewable by any authenticated user
	if (map.is_template) {
		return {
			status: 'template',
			userId: user.id,
			isAnonymous: user.is_anonymous ?? false,
			mapTitle: map.title,
		};
	}

	// Owner check
	if (map.user_id === user.id) {
		return {
			status: 'owner',
			userId: user.id,
			isAnonymous: user.is_anonymous ?? false,
			mapTitle: map.title,
		};
	}

	// Share access check - ONLY active records
	const { data: shareAccess, error: shareError } = await adminClient
		.from('share_access')
		.select('id')
		.eq('map_id', mapId)
		.eq('user_id', user.id)
		.eq('status', 'active')
		.maybeSingle();

	if (shareError) {
		console.error('[access-check] Error checking share access:', shareError);
		// Don't fail - just assume no access
	}

	if (shareAccess) {
		return {
			status: 'shared',
			userId: user.id,
			isAnonymous: user.is_anonymous ?? false,
			mapTitle: map.title,
		};
	}

	return {
		status: 'no_access',
		userId: user.id,
		isAnonymous: user.is_anonymous ?? false,
	};
}
