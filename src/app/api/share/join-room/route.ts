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
			console.log(data, user.id);

			// 1. Validate room code using database function
			const { data: validationResult, error: validationError } =
				await supabase.rpc('validate_room_code', {
					room_code: data.token.toUpperCase(),
				});

			console.log('Validation result:', validationResult);
			console.log('User:', user.id);

			// Extract first result from array since function returns TABLE
			const validation = validationResult?.[0];

			if (validationError || !validation?.is_valid) {
				return respondError(
					validation?.message || 'Invalid room code',
					validation?.message === 'Room is full' ? 403 : 404
				);
			}

			// get share_access or add if not available
			const { data: shareAccess, error: shareAccessError } = await supabase.rpc(
				'get_or_create_share_access_record',
				{
					p_map_id: validation.map_id,
					p_token_id: validation.token_id,
					p_user_id: user.id,
					p_max_sessions: 3,
					p_status: 'active',
				}
			);

			console.dir(shareAccess, { depth: 0 });
			console.dir(shareAccessError, { depth: 0 });

			console.log('Validation result:', validation);

			// 2. Get map information
			const { data: mapData, error: mapError } = await supabase
				.from('mind_maps')
				.select('id, title, description, user_id')
				.eq('id', validation.map_id)
				.single();

			console.dir(mapData, { depth: 0 });
			console.dir(mapError, { depth: 0 });

			if (mapError || !mapData || mapData === null) {
				return respondError('Mind map not found', 404);
			}

			// 6. Return success response
			return respondSuccess({
				map_id: validation.map_id,
				map_title: mapData.title,
				map_description: mapData.description,
				permissions: validation.permissions,
				user_id: user.id,
				is_anonymous: user.is_anonymous,
				user_display_name: user.user_metadata.display_name,
				user_avatar: user.user_metadata.avatar_url,
				websocket_channel: `presence:map:${validation.map_id}`,
				share_token_id: validation.token_id,
				join_method: 'anonymous_auth',
				joined_at: new Date().toISOString(),
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
