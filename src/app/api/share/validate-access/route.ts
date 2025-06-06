import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withOptionalAuthValidation } from '@/helpers/api/with-optional-auth-validation';
import { NextRequest } from 'next/server';
import { z } from 'zod';

type ShareTokenWithMap = {
	id: string;
	map_id: string;
	token: string;
	permissions: {
		role: string;
		can_edit: boolean;
		can_comment: boolean;
		can_view: boolean;
	};
	max_users: number;
	current_users: number;
	expires_at: string | null;
	is_active: boolean;
	mind_map: {
		id: string;
		title: string;
		description: string;
		user_id: string;
	};
};

const ValidateAccessSchema = z.object({
	token: z.string().min(1).max(10),
});

export const POST = withOptionalAuthValidation(
	ValidateAccessSchema,
	async (req, data, supabase, user) => {
		// 1. Validate and format the token
		const { data: formattedToken, error: formatError } = await supabase.rpc(
			'validate_room_code',
			{ p_code: data.token }
		);

		if (formatError || !formattedToken) {
			return respondError('Invalid room code format', 400);
		}

		// 2. Look up the token with map information
		const { data: tokenData, error: tokenError } = await supabase
			.from('share_tokens')
			.select(
				`
        id,
        map_id,
        token,
        permissions,
        max_users,
        current_users,
        expires_at,
        is_active,
        mind_map:mind_maps!inner (
          id,
          title,
          description,
          user_id
        )
      `
			)
			.eq('token', formattedToken)
			.eq('token_type', 'room_code')
			.single<ShareTokenWithMap>();

		if (tokenError || !tokenData) {
			return respondError('Room code not found', 404);
		}

		// 3. Check if token is active
		if (!tokenData.is_active) {
			return respondError('Room code has been deactivated', 410);
		}

		// 4. Check expiration
		if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
			return respondError('Room code has expired', 410);
		}

		// 5. Check if room is full
		const isFull = tokenData.current_users >= tokenData.max_users;

		// 6. Get map owner info
		let ownerName = 'Unknown';
		let hasExistingAccess = false;

		if (user) {
			const { data: ownerData } = await supabase
				.from('auth.users')
				.select('email, raw_user_meta_data')
				.eq('id', tokenData.mind_map.user_id)
				.single();

			ownerName =
				ownerData?.raw_user_meta_data?.full_name ||
				ownerData?.email?.split('@')[0] ||
				'Unknown';

			// 7. Check if user already has access (if authenticated)
			const { data: existingShare } = await supabase
				.from('mind_map_shares')
				.select('id')
				.eq('map_id', tokenData.map_id)
				.eq('user_id', user.id)
				.single();

			hasExistingAccess = !!existingShare;
		}

		return respondSuccess({
			is_valid: true,
			share_token_id: tokenData.id,
			map_id: tokenData.map_id,
			map_title: tokenData.mind_map.title,
			map_description: tokenData.mind_map.description,
			map_owner: {
				id: tokenData.mind_map.user_id,
				name: ownerName,
			},
			permissions: tokenData.permissions,
			is_full: isFull,
			current_users: tokenData.current_users,
			max_users: tokenData.max_users,
			expires_at: tokenData.expires_at,
			has_existing_access: hasExistingAccess,
			requires_auth: false, // Room codes don't require auth
		});
	}
);

// GET endpoint for simple validation
export const GET = async (request: NextRequest) => {
	const searchParams = request.nextUrl.searchParams;
	const token = searchParams.get('token');

	if (!token) {
		return respondError('Token parameter is required', 400);
	}

	// Reuse the POST logic
	return POST(request);
};
