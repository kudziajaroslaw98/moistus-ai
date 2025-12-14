import {
	checkRateLimit,
	upgradeInitiateRateLimiter,
} from '@/helpers/api/rate-limiter';
import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withAuthValidation } from '@/helpers/api/with-auth-validation';
import { z } from 'zod';

const InitiateUpgradeSchema = z.object({
	email: z.string().email('Please provide a valid email address'),
	display_name: z.string().min(1).max(50).optional(),
});

/**
 * POST /api/auth/upgrade-anonymous/initiate
 *
 * Step 1 of email-based anonymous user upgrade.
 * Sends verification email to the provided address.
 *
 * IMPORTANT: This only sends the email. Password cannot be set until
 * the email is verified via /verify-otp endpoint.
 */
export const POST = withAuthValidation(
	InitiateUpgradeSchema,
	async (req, data, supabase, user) => {
		// Rate limit check - prevent abuse of verification email flow
		const rateLimitResult = checkRateLimit(req, upgradeInitiateRateLimiter);
		if (!rateLimitResult.allowed) {
			return respondError('Too many requests. Please try again later.', 429);
		}

		try {
			// 1. Verify user is anonymous
			const { data: profile, error: profileError } = await supabase
				.from('user_profiles')
				.select('is_anonymous, display_name')
				.eq('user_id', user.id)
				.single();

			if (profileError) {
				console.error('Failed to fetch user profile:', profileError);
				return respondError('User profile not found', 404);
			}

			if (!profile?.is_anonymous) {
				return respondError(
					'User is not anonymous. Already has a full account.',
					400
				);
			}

			// 2. Check if email is already in use by another user
			// We do this by attempting to check auth.users, but since we can't
			// query auth.users directly from client, we rely on Supabase's
			// updateUser to return an error if email is taken

			// 3. Send verification email by updating user's email
			// This triggers Supabase to send a verification/OTP email
			const { error: updateError } = await supabase.auth.updateUser({
				email: data.email,
			});

			if (updateError) {
				console.error('Failed to initiate email verification:', updateError);

				// Handle specific error cases
				if (updateError.message.includes('already registered')) {
					return respondError(
						'This email is already registered. Please sign in with your existing account.',
						409,
						'Email already in use'
					);
				}

				return respondError(
					updateError.message || 'Failed to send verification email',
					400
				);
			}

			// 4. Store the pending display name in user metadata for later use
			if (data.display_name) {
				await supabase.auth.updateUser({
					data: {
						pending_upgrade_display_name: data.display_name,
					},
				});
			}

			// 5. Return success - user needs to check email for OTP
			return respondSuccess({
				initiated: true,
				email: data.email,
				message:
					'Verification code sent to your email. Please check your inbox.',
				next_step: 'verify-otp',
			});
		} catch (error) {
			console.error('Initiate upgrade error:', error);
			return respondError(
				'An unexpected error occurred while initiating upgrade',
				500
			);
		}
	}
);
