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
		// Single RPC call handles: validation, limit check, access creation
		const { data: result, error: rpcError } = await supabase.rpc('join_room', {
			p_room_code: data.token.toUpperCase(),
			p_user_id: user.id,
		});

		if (rpcError) {
			console.error('Join room RPC error:', rpcError);
			return respondError('Failed to join room', 500);
		}

		// Extract first result (RPC returns TABLE)
		const joinResult = result?.[0];

		if (!joinResult?.success) {
			// Map error codes to HTTP status codes
			const statusMap: Record<string, number> = {
				INVALID_CODE: 404,
				EXPIRED: 410,
				ROOM_FULL: 403,
				LIMIT_REACHED: 402,
				MAP_NOT_FOUND: 404,
				INVALID_USER: 401,
				INTERNAL_ERROR: 500,
			};

			const status = statusMap[joinResult?.error_code] || 500;

			return respondError(
				joinResult?.error_message || 'Failed to join room',
				status,
				joinResult?.error_code,
				joinResult?.error_code === 'LIMIT_REACHED'
					? {
							currentCount: joinResult.collaborator_count,
							limit: joinResult.collaborator_limit,
							upgradeUrl: '/dashboard/settings/billing',
						}
					: undefined
			);
		}

		// Return success response
		return respondSuccess({
			map_id: joinResult.map_id,
			map_title: joinResult.map_title,
			map_description: joinResult.map_description,
			permissions: joinResult.permissions,
			user_id: user.id,
			is_anonymous: user.is_anonymous,
			user_display_name: user.user_metadata?.display_name,
			user_avatar: user.user_metadata?.avatar_url,
			websocket_channel: `presence:map:${joinResult.map_id}`,
			share_token_id: joinResult.token_id,
			join_method: 'anonymous_auth',
			joined_at: new Date().toISOString(),
		});
	}
);
