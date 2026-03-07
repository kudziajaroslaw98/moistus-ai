import { withAuthValidation } from '@/helpers/api/with-auth-validation';
import { checkMapNodeLimit } from '@/helpers/api/with-subscription-check';
import { respondError, respondSuccess } from '@/helpers/api/responses';
import { createServiceRoleClient } from '@/helpers/supabase/server';
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
		const adminClient = createServiceRoleClient();
		const checkResult = await checkMapNodeLimit(
			supabase,
			mapId,
			user.id,
			adminClient
		);

		if (!checkResult.ok) {
			return respondError(
				checkResult.message,
				checkResult.status,
				checkResult.code
			);
		}

		if (!checkResult.allowed) {
			const { currentCount, limit, remaining, mapOwnerId, upgradeTarget } =
				checkResult;
			const message =
				upgradeTarget === 'owner'
					? `This shared map reached its owner limit (${currentCount}/${limit}). Ask the owner to upgrade or remove nodes.`
					: `Node limit reached (${currentCount}/${limit}). Upgrade to Pro for unlimited nodes.`;

			return respondError(message, 402, 'NODE_LIMIT_REACHED', {
				currentCount,
				limit,
				remaining,
				mapOwnerId,
				upgradeTarget,
			});
		}

		return respondSuccess({
			allowed: true,
			limit: checkResult.limit,
			remaining: checkResult.remaining,
			currentCount: checkResult.currentCount,
			mapOwnerId: checkResult.mapOwnerId,
			upgradeTarget: checkResult.upgradeTarget,
		});
	}
);
