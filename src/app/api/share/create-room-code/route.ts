import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import { z } from 'zod';

const CreateRoomCodeSchema = z.object({
	map_id: z.string().uuid(),
	role: z.enum(['editor', 'commenter', 'viewer']).default('viewer'),
	can_edit: z.boolean().optional(),
	can_comment: z.boolean().optional(),
	can_view: z.boolean().optional(),
	max_users: z.number().min(1).max(100).default(50),
	expires_in_hours: z.number().min(1).max(168).optional(), // Max 1 week
});

export const POST = withApiValidation(
	CreateRoomCodeSchema,
	async (req, data, supabase, user) => {
		// 1. Verify user owns the map
		const { data: map, error: mapError } = await supabase
			.from('mind_maps')
			.select('id, title')
			.eq('id', data.map_id)
			.eq('user_id', user.id)
			.single();

		if (mapError || !map) {
			return respondError('Map not found or unauthorized', 403);
		}

		// 2. Generate unique room code using database function
		const { data: tokenData, error: tokenError } = await supabase.rpc(
			'generate_unique_room_code'
		);

		if (tokenError || !tokenData) {
			console.error('Failed to generate room code:', tokenError);
			return respondError('Failed to generate room code', 500);
		}

		// 3. Calculate expiration
		const expires_at = data.expires_in_hours
			? new Date(
					Date.now() + data.expires_in_hours * 60 * 60 * 1000
				).toISOString()
			: null;

		// 4. Create permissions object
		const permissions = {
			role: data.role,
			can_edit: data.can_edit ?? data.role === 'editor',
			can_comment: data.can_comment ?? data.role !== 'viewer',
			can_view: data.can_view ?? true,
		};

		// 5. Create share token
		const { data: token, error: createError } = await supabase
			.from('share_tokens')
			.insert({
				map_id: data.map_id,
				token: tokenData,
				token_type: 'room_code',
				permissions,
				max_users: data.max_users,
				expires_at,
				created_by: user.id,
			})
			.select()
			.single();

		if (createError) {
			console.error('Failed to create share token:', createError);
			return respondError('Failed to create room code', 500);
		}

		// 6. Generate share link and QR code data
		const shareLink = `${process.env.NEXT_PUBLIC_APP_URL}/join?code=${token.token}`;
		const qrCodeData = {
			value: shareLink,
			size: 256,
			level: 'M' as const,
		};

		return respondSuccess({
			token: token.token,
			share_link: shareLink,
			qr_code_data: qrCodeData,
			expires_at: token.expires_at,
			permissions: token.permissions,
			max_users: token.max_users,
			current_users: token.current_users || 0,
			map_title: map.title,
		});
	}
);
