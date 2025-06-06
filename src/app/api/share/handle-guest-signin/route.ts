import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import { z } from 'zod';

const HandleGuestSigninSchema = z.object({
	guest_session_id: z.string().min(32).max(128),
	share_token: z
		.string()
		.regex(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/i, 'Invalid room code format'),
	map_id: z.string().uuid(),
});

export const POST = withApiValidation(
	HandleGuestSigninSchema,
	async (req, data, supabase, user) => {
		// 1. Get guest user data
		const { data: guestUser, error: guestError } = await supabase
			.from('guest_users')
			.select('*')
			.eq('session_id', data.guest_session_id)
			.single();

		if (guestError || !guestUser) {
			return respondError('Guest session not found', 404);
		}

		// 2. Get share token data
		const { data: tokenData, error: tokenError } = await supabase
			.from('share_tokens')
			.select('permissions')
			.eq('token', data.share_token.toUpperCase())
			.eq('map_id', data.map_id)
			.single();

		if (tokenError || !tokenData) {
			return respondError('Invalid share token', 404);
		}

		// 3. Create direct share for the user
		const { error: shareError } = await supabase
			.from('mind_map_shares')
			.insert({
				map_id: data.map_id,
				user_id: user.id,
				role: tokenData.permissions.role,
				can_edit: tokenData.permissions.can_edit,
				can_comment: tokenData.permissions.can_comment,
				can_view: tokenData.permissions.can_view,
				shared_by: user.id, // Self-shared via room code
				shared_at: new Date().toISOString(),
			});

		if (shareError && shareError.code !== '23505') {
			// Ignore duplicate key error
			console.error('Failed to create share:', shareError);
			return respondError('Failed to create share', 500);
		}

		// 4. Convert guest user record
		const { error: conversionError } = await supabase
			.from('guest_users')
			.update({
				conversion_date: new Date().toISOString(),
				converted_user_id: user.id,
			})
			.eq('id', guestUser.id);

		if (conversionError) {
			console.error('Failed to convert guest user:', conversionError);
			// Don't fail the operation if this fails
		}

		// 5. Transfer access logs from guest to user
		const { error: logTransferError } = await supabase
			.from('share_access_logs')
			.update({
				user_id: user.id,
				guest_user_id: null,
			})
			.eq('guest_user_id', guestUser.id);

		if (logTransferError) {
			console.error('Failed to transfer access logs:', logTransferError);
			// Don't fail the operation if this fails
		}

		// 6. Delete any guest presence records
		const { error: presenceError } = await supabase
			.from('collaboration_presence')
			.delete()
			.eq('user_id', guestUser.id);

		if (presenceError) {
			console.error('Failed to clean up guest presence:', presenceError);
			// Don't fail the operation if this fails
		}

		// 7. Log the conversion activity
		await supabase.rpc('log_activity', {
			p_map_id: data.map_id,
			p_user_id: user.id,
			p_action_type: 'guest_converted',
			p_metadata: {
				guest_session_id: data.guest_session_id,
				guest_display_name: guestUser.display_name,
				conversion_time: new Date().toISOString(),
			},
			p_change_summary: `Guest "${guestUser.display_name}" converted to registered user`,
		});

		return respondSuccess({
			success: true,
			share_created: true,
			permissions: tokenData.permissions,
			guest_data_transferred: true,
			user_id: user.id,
			previous_guest_id: guestUser.id,
		});
	}
);
