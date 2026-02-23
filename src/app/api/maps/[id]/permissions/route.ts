import { respondError, respondSuccess } from '@/helpers/api/responses';
import { createServiceRoleClient } from '@/helpers/supabase/server';
import { withAuthValidation } from '@/helpers/api/with-auth-validation';
import { z } from 'zod';

interface PermissionsResponse {
	role: 'owner' | 'editor' | 'commentator' | 'viewer';
	can_view: boolean;
	can_edit: boolean;
	can_comment: boolean;
	updated_at: string;
	isOwner: boolean;
}

/**
 * GET /api/maps/[id]/permissions - Get current user's permissions for a map
 *
 * Returns the user's current permissions from share_access table.
 * Owners always get full permissions.
 */
export const GET = withAuthValidation<
	Record<string, never>,
	PermissionsResponse
>(z.object({}), async (req, _validatedBody, _supabase, user) => {
	try {
		// Extract mapId from URL
		const url = new URL(req.url);
		const pathParts = url.pathname.split('/');
		const mapIdIndex = pathParts.findIndex((part) => part === 'maps') + 1;
		const mapId = pathParts[mapIdIndex];

		if (!mapId || mapId === 'permissions') {
			return respondError('Map ID is required', 400, 'Missing map ID');
		}

		const adminClient = createServiceRoleClient();

		// Check if user is the owner
		const { data: map, error: mapError } = await adminClient
			.from('mind_maps')
			.select('user_id, updated_at')
			.eq('id', mapId)
			.maybeSingle();

		if (mapError) {
			return respondError('Error fetching map', 500, mapError.message);
		}

		if (!map) {
			return respondError('Map not found', 404);
		}

		// Owner always has full permissions
		if (map.user_id === user.id) {
			return respondSuccess<PermissionsResponse>(
				{
					role: 'owner',
					can_view: true,
					can_edit: true,
					can_comment: true,
					updated_at: map.updated_at ?? new Date().toISOString(),
					isOwner: true,
				},
				200,
				'Owner permissions'
			);
		}

		// Get collaborator permissions from share_access
		const { data: shareAccess, error: shareError } = await adminClient
			.from('share_access')
			.select('role, can_view, can_edit, can_comment, updated_at')
			.eq('map_id', mapId)
			.eq('user_id', user.id)
			.eq('status', 'active')
			.maybeSingle();

		if (shareError) {
			console.error('Error fetching share access:', shareError);
			return respondError(
				'Failed to fetch permissions',
				500,
				shareError.message
			);
		}

		if (!shareAccess) {
			// No access record - deny access
			return respondError('Access denied', 403, 'No share access found for this map');
		}

		return respondSuccess<PermissionsResponse>(
			{
				role: (shareAccess.role || 'viewer') as PermissionsResponse['role'],
				can_view: shareAccess.can_view ?? true,
				can_edit: shareAccess.can_edit ?? false,
				can_comment: shareAccess.can_comment ?? false,
				updated_at: shareAccess.updated_at ?? new Date().toISOString(),
				isOwner: false,
			},
			200,
			'Permissions retrieved'
		);
	} catch (error) {
		console.error('Error in GET /api/maps/[id]/permissions:', error);
		const message =
			error instanceof Error ? error.message : 'Internal server error';
		return respondError('Failed to get permissions', 500, message);
	}
});
