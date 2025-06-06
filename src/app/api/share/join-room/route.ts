import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withOptionalAuthValidation } from '@/helpers/api/with-optional-auth-validation';
import { z } from 'zod';

const JoinRoomSchema = z.object({
	token: z
		.string()
		.regex(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/i, 'Invalid room code format'),
	guest_info: z
		.object({
			display_name: z.string().min(1).max(50),
			email: z.string().email().optional(),
			session_id: z.string().min(32).max(128),
			fingerprint_hash: z.string().length(64).optional(),
		})
		.optional(),
});

export const POST = withOptionalAuthValidation(
	JoinRoomSchema,
	async (req, data, supabase, user) => {
		// 1. Format and validate token
		const formattedToken = data.token.toUpperCase();

		// 2. Get token data with map info
		const { data: tokenData, error: tokenError } = await supabase
			.from('share_tokens')
			.select(
				`
        *,
        mind_maps!inner(id, title, description, user_id)
      `
			)
			.eq('token', formattedToken)
			.eq('is_active', true)
			.single();

		if (tokenError || !tokenData) {
			return respondError('Invalid or expired room code', 404);
		}

		// 3. Check expiration
		if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
			return respondError('Room code has expired', 410);
		}

		// 4. Check user count
		if (tokenData.current_users >= tokenData.max_users) {
			return respondError(
				'Room is full',
				403,
				'The room has reached maximum capacity'
			);
		}

		// 5. Handle user session (authenticated or guest)
		const userId = user?.id;
		let guestId = null;
		let isGuest = false;

		if (!user && data.guest_info) {
			// Create or update guest user
			const avatarUrl = await supabase.rpc('generate_avatar_url', {
				p_seed: data.guest_info.session_id,
			});

			const { data: guest, error: guestError } = await supabase
				.from('guest_users')
				.upsert(
					{
						session_id: data.guest_info.session_id,
						display_name: data.guest_info.display_name,
						email: data.guest_info.email,
						fingerprint_hash: data.guest_info.fingerprint_hash,
						avatar_url: avatarUrl.data,
						last_activity: new Date().toISOString(),
					},
					{
						onConflict: 'session_id',
					}
				)
				.select()
				.single();

			if (guestError) {
				console.error('Failed to create guest session:', guestError);
				return respondError('Failed to create guest session', 500);
			}

			guestId = guest.id;
			isGuest = true;
		} else if (!user) {
			return respondError(
				'Authentication required',
				401,
				'Please sign in or provide guest information'
			);
		}

		// 6. If authenticated user, check for existing share and create if needed
		if (user) {
			// Check if user already has a share
			const { data: existingShare } = await supabase
				.from('mind_map_shares')
				.select('id')
				.eq('map_id', tokenData.map_id)
				.eq('user_id', user.id)
				.single();

			// Create share if it doesn't exist
			if (!existingShare) {
				await supabase.from('mind_map_shares').insert({
					map_id: tokenData.map_id,
					user_id: user.id,
					role: tokenData.permissions.role,
					can_edit: tokenData.permissions.can_edit,
					can_comment: tokenData.permissions.can_comment,
					can_view: tokenData.permissions.can_view,
					shared_by: user.id, // Self-shared via room code
					shared_at: new Date().toISOString(),
				});
			}
		}

		// 7. Log access using the function
		const { data: logResult, error: logError } = await supabase.rpc(
			'log_share_access',
			{
				p_share_token_id: tokenData.id,
				p_user_id: userId,
				p_guest_user_id: guestId,
				p_access_type: 'join',
				p_ip_address:
					req.headers.get('x-forwarded-for') ||
					req.headers.get('x-real-ip') ||
					null,
				p_user_agent: req.headers.get('user-agent') || null,
				p_referrer: req.headers.get('referer') || null,
				p_metadata: {
					joined_at: new Date().toISOString(),
					is_guest: isGuest,
				},
			}
		);

		if (logError) {
			console.error('Failed to log access:', logError);
			// Don't fail the join if logging fails
		}

		// 8. Create presence channel name
		const channelName = `presence:map:${tokenData.map_id}`;

		// 9. Get user display info
		let userDisplayName = 'Anonymous';
		let userAvatar = null;

		if (user) {
			const { data: userData } = await supabase
				.from('auth.users')
				.select('email, raw_user_meta_data')
				.eq('id', user.id)
				.single();

			userDisplayName =
				userData?.raw_user_meta_data?.full_name ||
				userData?.email?.split('@')[0] ||
				'User';
			userAvatar = userData?.raw_user_meta_data?.avatar_url;
		} else if (data.guest_info) {
			userDisplayName = data.guest_info.display_name;
			const { data: guestData } = await supabase
				.from('guest_users')
				.select('avatar_url')
				.eq('id', guestId)
				.single();
			userAvatar = guestData?.avatar_url;
		}

		return respondSuccess({
			map_id: tokenData.map_id,
			map_title: tokenData.mind_maps.title,
			map_description: tokenData.mind_maps.description,
			permissions: tokenData.permissions,
			user_id: userId || guestId,
			is_guest: isGuest,
			user_display_name: userDisplayName,
			user_avatar: userAvatar,
			websocket_channel: channelName,
			current_users: tokenData.current_users + 1,
			max_users: tokenData.max_users,
			share_token_id: tokenData.id,
		});
	}
);
