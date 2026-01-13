import { withAuthValidation } from '@/helpers/api/with-auth-validation';
import { checkUsageLimit } from '@/helpers/api/with-subscription-check';
import { respondError, respondSuccess } from '@/helpers/api/responses';
import { z } from 'zod';

// UUID v4 regex pattern for validation
const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const requestSchema = z.object({
	mapId: z.string().regex(UUID_REGEX, 'Invalid mapId format'),
});

/**
 * POST /api/nodes/check-limit
 *
 * Validates if a user can create a new node in a specific map.
 * Returns 200 if allowed, 402 if limit reached.
 *
 * Body: { mapId: string }
 */
export const POST = withAuthValidation(
	requestSchema,
	async (_req, { mapId }, supabase, user) => {
		// Verify user has access to this map (RLS handles ownership, but we also check explicitly)
		const { data: map, error: mapError } = await supabase
			.from('mind_maps')
			.select('id, owner_id')
			.eq('id', mapId)
			.single();

		if (mapError || !map) {
			return respondError('Map not found', 404, 'Map does not exist');
		}

		// Check if user owns the map or has shared access
		// RLS policies should handle this, but explicit check for clarity
		if (map.owner_id !== user.id) {
			// Check if user has shared access
			const { data: share } = await supabase
				.from('map_shares')
				.select('id')
				.eq('map_id', mapId)
				.eq('shared_with', user.id)
				.single();

			if (!share) {
				return respondError(
					'Access denied',
					403,
					'You do not have access to this map'
				);
			}
		}

		// Count current nodes in this map
		const { count: currentNodesCount, error: countError } = await supabase
			.from('nodes')
			.select('*', { count: 'exact', head: true })
			.eq('map_id', mapId);

		if (countError) {
			console.error('Error counting nodes:', countError);
			return respondError(
				'Failed to check node count',
				500,
				countError.message
			);
		}

		// Check against user's plan limits
		const { allowed, limit, remaining } = await checkUsageLimit(
			user,
			supabase,
			'nodesPerMap',
			currentNodesCount || 0
		);

		if (!allowed) {
			return respondError(
				'Node limit reached',
				402,
				`Limit: ${limit}, Current: ${currentNodesCount}`
			);
		}

		return respondSuccess({
			allowed: true,
			limit,
			remaining,
			currentCount: currentNodesCount,
		});
	}
);
