import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withAuthValidation } from '@/helpers/api/with-auth-validation';
import { z } from 'zod';

const JoinRoomSchema = z.object({
	token: z
		.string()
		.regex(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/i, 'Invalid room code format'),
	display_name: z.string().min(1).max(50).optional(),
});

export const POST = withAuthValidation(
	JoinRoomSchema,
	async (req, data, supabase, user) => {
		try {
			// 1. Validate room code using database function
			const { data: validationResult, error: validationError } = await supabase.rpc(
				'validate_room_code_for_anonymous',
				{
					token_param: data.token.toUpperCase(),
					user_id_param: user.id
				}
			);

			if (validationError || !validationResult?.valid) {
				return respondError(
					validationResult?.error || 'Invalid room code', 
					validationResult?.error === 'Room is full' ? 403 : 404
				);
			}

			// 2. Get map information
			const { data: mapData, error: mapError } = await supabase
				.from('mind_maps')
				.select('id, title, description, user_id')
				.eq('id', validationResult.map_id)
				.single();

			if (mapError || !mapData) {
				return respondError('Mind map not found', 404);
			}

			// 3. Determine if user is anonymous and handle profile
			const isAnonymous = validationResult.is_anonymous_user || false;
			let userDisplayName = data.display_name;
			let userAvatar = null;

			if (isAnonymous) {
				// Create/update anonymous user profile
				const defaultDisplayName = data.display_name || `User ${user.id.slice(0, 8)}`;
				const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`;
				
				const { error: profileError } = await supabase.rpc(
					'create_anonymous_user_profile',
					{
						user_id_param: user.id,
						display_name_param: defaultDisplayName,
						avatar_url_param: avatarUrl
					}
				);

				if (profileError) {
					console.error('Failed to create anonymous user profile:', profileError);
					return respondError('Failed to create user profile', 500);
				}

				userDisplayName = defaultDisplayName;
				userAvatar = avatarUrl;
			} else {
				// Get existing full user profile
				const { data: profileData } = await supabase
					.from('user_profiles')
					.select('display_name, avatar_url, full_name')
					.eq('user_id', user.id)
					.single();

				userDisplayName = profileData?.display_name || 
					profileData?.full_name ||
					data.display_name || 
					user.email?.split('@')[0] || 
					'User';
				userAvatar = profileData?.avatar_url;
			}

			// 4. Create share permission
			const { error: shareError } = await supabase.rpc(
				'create_share_for_anonymous_user',
				{
					map_id_param: validationResult.map_id,
					user_id_param: user.id,
					permissions_param: validationResult.permissions
				}
			);

			if (shareError) {
				console.error('Failed to create share:', shareError);
				return respondError('Failed to join room', 500);
			}

			// 5. Log access
			const { error: logError } = await supabase.rpc(
				'log_anonymous_share_access',
				{
					share_token_id_param: validationResult.share_token_id,
					user_id_param: user.id,
					access_type_param: 'join',
					ip_address_param: req.headers.get('x-forwarded-for') || 
						req.headers.get('x-real-ip') || null,
					user_agent_param: req.headers.get('user-agent') || null,
					metadata_param: {
						joined_at: new Date().toISOString(),
						is_anonymous: isAnonymous,
						display_name: userDisplayName,
						room_code: data.token.toUpperCase()
					}
				}
			);

			if (logError) {
				console.error('Failed to log access:', logError);
				// Continue - don't fail join if logging fails
			}

			// 6. Return success response
			return respondSuccess({
				map_id: validationResult.map_id,
				map_title: mapData.title,
				map_description: mapData.description,
				permissions: validationResult.permissions,
				user_id: user.id,
				is_anonymous: isAnonymous,
				user_display_name: userDisplayName,
				user_avatar: userAvatar,
				websocket_channel: `presence:map:${validationResult.map_id}`,
				share_token_id: validationResult.share_token_id,
				join_method: 'anonymous_auth',
				joined_at: new Date().toISOString()
			});

		} catch (error) {
			console.error('Join room error:', error);
			return respondError(
				'An unexpected error occurred while joining the room',
				500
			);
		}
	}
);