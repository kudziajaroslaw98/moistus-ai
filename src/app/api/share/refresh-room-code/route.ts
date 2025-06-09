import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withAuthValidation } from '@/helpers/api/with-auth-validation';
import { z } from 'zod';

const RefreshRoomCodeSchema = z.object({
	token_id: z.string().uuid('Invalid token ID format'),
});

export const POST = withAuthValidation(
	RefreshRoomCodeSchema,
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

			// Generate new random token
			const newToken = Math.random().toString(36).substring(2, 8).toUpperCase();
			const formattedToken = `${newToken.slice(0, 3)}-${newToken.slice(3)}`;

			// Update the token in database
			const { data: updatedToken, error: updateError } = await supabase
				.from('share_tokens')
				.update({
					token: formattedToken,
					updated_at: new Date().toISOString(),
				})
				.eq('id', data.token_id)
				.select('*')
				.single();

			if (updateError) {
				console.error('Failed to refresh room code:', updateError);
				return respondError(
					'Failed to refresh room code',
					500,
					updateError.message
				);
			}

			return respondSuccess(
				updatedToken,
				200,
				'Room code refreshed successfully'
			);

		} catch (error) {
			console.error('Refresh room code error:', error);
			const message = error instanceof Error ? error.message : 'Unknown error occurred';
			return respondError(
				'Failed to refresh room code',
				500,
				message
			);
		}
	}
);