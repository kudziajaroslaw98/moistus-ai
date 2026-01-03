import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withAuthValidation } from '@/helpers/api/with-auth-validation';
import { z } from 'zod';

const RevokeRoomCodeSchema = z.object({
	token_id: z.string().uuid('Invalid token ID format'),
});

/**
 * Revokes a room code and kicks all users who joined via that code.
 *
 * Uses the `revoke_room_code_and_broadcast` RPC function which:
 * 1. Deactivates the token (prevents new joins)
 * 2. Broadcasts access_revoked to each affected user via realtime.send()
 * 3. Deletes all share_access records for that token
 *
 * This is atomic and efficient - single database round-trip.
 */
export const POST = withAuthValidation(
	RevokeRoomCodeSchema,
	async (req, data, supabase, user) => {
		try {
			const { data: result, error } = await supabase.rpc(
				'revoke_room_code_and_broadcast',
				{
					p_token_id: data.token_id,
					p_user_id: user.id,
				}
			);

			if (error) {
				console.error('Failed to revoke room code:', error);
				return respondError(
					'Failed to revoke room code',
					500,
					error.message
				);
			}

			if (!result?.success) {
				return respondError(
					result?.error || 'Share token not found or access denied',
					404,
					'Token does not exist or user does not have permission'
				);
			}

			return respondSuccess(
				{
					token_id: data.token_id,
					users_kicked: result.users_kicked,
				},
				200,
				'Room code revoked successfully'
			);
		} catch (error) {
			console.error('Revoke room code error:', error);
			const message =
				error instanceof Error ? error.message : 'Unknown error occurred';
			return respondError('Failed to revoke room code', 500, message);
		}
	}
);
