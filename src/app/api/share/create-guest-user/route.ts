import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withOptionalAuthValidation } from '@/helpers/api/with-optional-auth-validation';
import crypto from 'crypto';
import { z } from 'zod';

const CreateGuestUserSchema = z.object({
	display_name: z
		.string()
		.min(1)
		.max(50)
		.transform((val) => val.trim()),
	email: z.string().email().optional(),
	session_id: z.string().min(32).max(128),
	fingerprint_hash: z.string().length(64).optional(),
	session_data: z.record(z.unknown()).optional(),
});

export const POST = withOptionalAuthValidation(
	CreateGuestUserSchema,
	async (req, data, supabase, user) => {
		// If user is authenticated, they shouldn't create guest sessions
		if (user) {
			return respondError(
				'Authenticated users cannot create guest sessions',
				400
			);
		}

		// 1. Check for existing session
		const { data: existingGuest } = await supabase
			.from('guest_users')
			.select('id, display_name, avatar_url, email, last_activity')
			.eq('session_id', data.session_id)
			.single();

		if (existingGuest) {
			// Update last activity and return existing guest
			await supabase
				.from('guest_users')
				.update({
					last_activity: new Date().toISOString(),
					display_name: data.display_name, // Allow name updates
					email: data.email || existingGuest.email, // Update email if provided
				})
				.eq('id', existingGuest.id);

			return respondSuccess({
				guest_user_id: existingGuest.id,
				session_token: data.session_id,
				display_name: data.display_name,
				email: data.email || existingGuest.email,
				avatar_url: existingGuest.avatar_url,
				is_existing: true,
			});
		}

		// 2. Generate avatar URL using database function
		const { data: avatarUrl, error: avatarError } = await supabase.rpc(
			'generate_avatar_url',
			{ p_seed: data.session_id }
		);

		if (avatarError) {
			console.error('Failed to generate avatar:', avatarError);
		}

		// 3. Create new guest user
		const { data: guest, error: createError } = await supabase
			.from('guest_users')
			.insert({
				session_id: data.session_id,
				display_name: data.display_name,
				email: data.email,
				avatar_url:
					avatarUrl ||
					`https://api.dicebear.com/7.x/avataaars/svg?seed=${data.session_id}`,
				fingerprint_hash: data.fingerprint_hash,
				session_data: data.session_data || {},
				first_seen: new Date().toISOString(),
				last_activity: new Date().toISOString(),
			})
			.select()
			.single();

		if (createError) {
			console.error('Failed to create guest user:', createError);
			return respondError('Failed to create guest user', 500);
		}

		// 4. Create secure session token
		const sessionToken = crypto
			.createHash('sha256')
			.update(`${guest.id}:${data.session_id}:${Date.now()}`)
			.digest('hex');

		// 5. Set secure session cookie
		const response = respondSuccess({
			guest_user_id: guest.id,
			session_token: data.session_id,
			display_name: guest.display_name,
			email: guest.email,
			avatar_url: guest.avatar_url,
			is_existing: false,
		});

		// Set cookie for session persistence
		response.cookies.set('guest_session', data.session_id, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 60 * 60 * 24 * 7, // 7 days
			path: '/',
		});

		// Also set a non-httpOnly cookie for client-side access
		response.cookies.set('guest_session_id', guest.id, {
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 60 * 60 * 24 * 7, // 7 days
			path: '/',
		});

		return response;
	}
);
