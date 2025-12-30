import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withAuthValidation } from '@/helpers/api/with-auth-validation';
import { z } from 'zod';

const RevokeRoomCodeSchema = z.object({
	token_id: z.string().uuid('Invalid token ID format'),
});

export const POST = withAuthValidation(
	RevokeRoomCodeSchema,
	async (req, data, supabase, user) => {
		try {
			// Verify the token exists and belongs to the user
			const { data: existingToken, error: fetchError } = await supabase
				.from('share_tokens')
				.select('*')
				.eq('id', data.token_id)
				.eq('created_by', user.id)
				.eq('is_active', true)
				.single();

			if (fetchError || !existingToken) {
				return respondError(
					'Share token not found or access denied',
					404,
					'Token does not exist or user does not have permission'
				);
			}

			// Deactivate the token (don't delete for audit purposes)
			const { error: updateError } = await supabase
				.from('share_tokens')
				.update({
					is_active: false,
					updated_at: new Date().toISOString(),
				})
				.eq('id', data.token_id);

			if (updateError) {
				console.error('Failed to revoke room code:', updateError);
				return respondError(
					'Failed to revoke room code',
					500,
					updateError.message
				);
			}

			// Deactivate share_access records for this token
			const { error: accessError } = await supabase
				.from('share_access')
				.update({
					status: 'inactive',
					updated_at: new Date().toISOString(),
				})
				.eq('share_token_id', data.token_id);

			if (accessError) {
				console.error('Failed to deactivate share_access records:', accessError);
				// Continue anyway, token is already revoked
			}

			return respondSuccess(
				{ token_id: data.token_id },
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
