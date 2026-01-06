import {
	checkRateLimit,
	getClientIP,
	otpLimiter,
} from '@/helpers/api/rate-limiter';
import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withAuthValidation } from '@/helpers/api/with-auth-validation';
import { PASSWORD_MIN_LENGTH, PASSWORD_REGEX } from '@/lib/validations/auth';
import { z } from 'zod';

const VerifyOtpSchema = z.object({
	email: z.string().email('Please provide a valid email address'),
	otp: z
		.string()
		.min(6, 'OTP must be 6 digits')
		.max(6, 'OTP must be 6 digits')
		.regex(/^\d+$/, 'OTP must contain only numbers'),
	// New flow: password is collected before OTP verification and sent together
	password: z
		.string()
		.min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
		.regex(
			PASSWORD_REGEX,
			'Password must contain at least one uppercase letter, one lowercase letter, and one number'
		)
		.optional(),
	displayName: z.string().min(1).max(50).optional(),
});

/**
 * POST /api/auth/upgrade-anonymous/verify-otp
 *
 * Step 3 (final) of email-based anonymous user upgrade.
 * Verifies the OTP code and optionally sets password to complete upgrade.
 *
 * New flow: email → password → OTP verification (password collected before OTP)
 * When password is provided, this becomes the final step that completes the upgrade.
 */
export const POST = withAuthValidation(
	VerifyOtpSchema,
	async (req, data, supabase, user) => {
		try {
			// 1. Verify user is still anonymous using auth source (not user_profiles table)
			if (!user.is_anonymous) {
				return respondError('User has already been upgraded', 400);
			}

			// 2. Check rate limit before OTP verification
			const rateLimitKey = `${user.id}:${data.email}`;
			const rateLimitFallback = getClientIP(req) || 'unknown';
			const { allowed, resetTime } = checkRateLimit(
				req,
				otpLimiter,
				rateLimitKey || rateLimitFallback
			);

			if (!allowed) {
				const retryAfterSeconds = Math.ceil((resetTime - Date.now()) / 1000);
				return respondError(
					`Too many OTP verification attempts. Please try again in ${retryAfterSeconds} seconds.`,
					429,
					'Rate limit exceeded'
				);
			}

			// 3. Verify the OTP
			// For email change flow, use 'email_change' type
			const { data: verifyData, error: verifyError } =
				await supabase.auth.verifyOtp({
					email: data.email,
					token: data.otp,
					type: 'email_change',
				});

			if (verifyError) {
				console.error('OTP verification failed:', verifyError);

				// Handle specific error cases
				if (
					verifyError.message.includes('expired') ||
					verifyError.message.includes('invalid')
				) {
					return respondError(
						'Invalid or expired verification code. Please request a new one.',
						400,
						'Invalid OTP'
					);
				}

				return respondError(
					verifyError.message || 'Failed to verify code',
					400
				);
			}

			// 4. Get fresh user data after OTP verification
			const {
				data: { user: updatedUser },
				error: userError,
			} = await supabase.auth.getUser();

			if (userError || !updatedUser) {
				console.error('Failed to get user after OTP verification:', userError);
				return respondError('Failed to verify user state', 500);
			}

			// 5. If password provided, set it and complete the upgrade
			if (data.password) {
				// Set the password
				const { error: passwordError } = await supabase.auth.updateUser({
					password: data.password,
				});

				if (passwordError) {
					console.error('Failed to set password:', passwordError);
					return respondError(
						passwordError.message || 'Failed to set password',
						400
					);
				}

				// Get display name (from param or user metadata)
				const displayName =
					data.displayName ||
					updatedUser.user_metadata?.pending_upgrade_display_name;

				// Update user profile using database function
				const { error: upgradeError } = await supabase.rpc(
					'upgrade_anonymous_to_full_user',
					{
						user_id_param: user.id,
						email_param: data.email,
						full_name_param: displayName,
					}
				);

				if (upgradeError) {
					console.error('Failed to upgrade user profile:', upgradeError);
					// Don't fail completely - auth.users is already updated
					console.warn(
						'Profile update failed but auth upgrade succeeded - profile will sync later'
					);
				}

				// Clear pending metadata
				await supabase.auth.updateUser({
					data: {
						pending_upgrade_display_name: null,
					},
				});

				// Get updated profile information
				const { data: updatedProfile, error: fetchError } = await supabase
					.from('user_profiles')
					.select(
						'user_id, full_name, display_name, email, is_anonymous, avatar_url'
					)
					.eq('user_id', user.id)
					.single();

				if (fetchError) {
					console.error('Failed to fetch updated profile:', fetchError);
				}

				// Return complete upgrade success
				return respondSuccess({
					verified: true,
					upgraded: true,
					user_id: user.id,
					email: data.email,
					profile: updatedProfile || {
						user_id: user.id,
						email: data.email,
						full_name: displayName,
						display_name: displayName,
						is_anonymous: false,
					},
					message:
						'Account successfully upgraded! You can now sign in with your email and password.',
				});
			}

			// 6. If no password provided (legacy flow), just verify OTP
			return respondSuccess({
				verified: true,
				upgraded: false,
				user_id: user.id,
				email: data.email,
				profile: {
					user_id: user.id,
					email: data.email,
					full_name: null,
					display_name: null,
					is_anonymous: true, // Still anonymous until password is set
					avatar_url: null,
				},
				message:
					'Email verified successfully! You can now set your password.',
			});
		} catch (error) {
			console.error('Verify OTP error:', error);
			return respondError(
				'An unexpected error occurred during verification',
				500
			);
		}
	}
);
