import { respondError, respondSuccess } from '@/helpers/api/responses';
import { createServiceRoleClient } from '@/helpers/supabase/server';
import { withAuthValidation } from '@/helpers/api/with-auth-validation';
import { z } from 'zod';

type AccessStatus = 'owner' | 'shared' | 'no_access' | 'not_found';

interface CheckAccessResponse {
	status: AccessStatus;
	mapExists: boolean;
	mapTitle?: string;
}

/**
 * GET /api/maps/[id]/check-access - Check why user cannot access a map
 *
 * Uses service role to bypass RLS and determine:
 * 1. Does the map exist?
 * 2. Is the user the owner?
 * 3. Does the user have share_access?
 *
 * This is called when the primary map fetch fails to provide
 * better error messaging (access denied vs not found).
 */
export const GET = withAuthValidation<
	Record<string, never>,
	CheckAccessResponse
>(z.object({}), async (req, _validatedBody, _supabase, user) => {
	try {
		// Extract mapId from URL
		const url = new URL(req.url);
		const pathParts = url.pathname.split('/');
		const mapIdIndex = pathParts.findIndex((part) => part === 'maps') + 1;
		const mapId = pathParts[mapIdIndex];

		if (!mapId || mapId === 'check-access') {
			return respondError('Map ID is required', 400, 'Missing map ID');
		}

		// Use service role to bypass RLS and check map existence
		const adminClient = createServiceRoleClient();

		// Check if map exists and get owner info
		const { data: map, error: mapError } = await adminClient
			.from('mind_maps')
			.select('id, user_id, title')
			.eq('id', mapId)
			.maybeSingle();

		if (mapError) {
			console.error('Error checking map existence:', mapError);
			return respondError(
				'Failed to check map access',
				500,
				mapError.message
			);
		}

		// Map doesn't exist
		if (!map) {
			return respondSuccess<CheckAccessResponse>(
				{
					status: 'not_found',
					mapExists: false,
				},
				200,
				'Map not found'
			);
		}

		// User is the owner
		if (map.user_id === user.id) {
			return respondSuccess<CheckAccessResponse>(
				{
					status: 'owner',
					mapExists: true,
					mapTitle: map.title,
				},
				200,
				'User owns this map'
			);
		}

		// Check if user has share_access
		const { data: shareAccess, error: shareError } = await adminClient
			.from('share_access')
			.select('id, role')
			.eq('map_id', mapId)
			.eq('user_id', user.id)
			.maybeSingle();

		if (shareError) {
			console.error('Error checking share access:', shareError);
			// Don't fail - just assume no access
		}

		if (shareAccess) {
			return respondSuccess<CheckAccessResponse>(
				{
					status: 'shared',
					mapExists: true,
					mapTitle: map.title,
				},
				200,
				'User has shared access'
			);
		}

		// Map exists but user has no access
		return respondSuccess<CheckAccessResponse>(
			{
				status: 'no_access',
				mapExists: true,
				mapTitle: map.title,
			},
			200,
			'User does not have access to this map'
		);
	} catch (error) {
		console.error('Error in check-access:', error);
		const message =
			error instanceof Error ? error.message : 'Internal server error';
		return respondError('Failed to check map access', 500, message);
	}
});
