import {
	checkRateLimit,
	getClientIP,
	signUpOtpRateLimiter,
} from '@/helpers/api/rate-limiter';
import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withPublicApiValidation } from '@/helpers/api/with-public-api-validation';
import { buildVerifiedUserProfileUpsert } from '@/helpers/identity/verified-user-profile-upsert';
import { signUpVerifyOtpRequestSchema } from '@/lib/validations/auth';

/**
 * POST /api/auth/sign-up/verify-otp
 *
 * Step 2 of the sign-up flow.
 * Verifies the OTP code sent to user's email and activates the account.
 *
 * After successful verification:
 * - Email is confirmed
 * - User session is created
 * - Account is ready to use
 */
export const POST = withPublicApiValidation(
	signUpVerifyOtpRequestSchema,
	async (req, data, supabase) => {
		// Rate limit check using email + IP as identifier
		const clientIP = getClientIP(req) || 'unknown';
		const rateLimitKey = `signup-otp:${data.email}:${clientIP}`;
		const rateLimitResult = checkRateLimit(
			req,
			signUpOtpRateLimiter,
			rateLimitKey
		);

		if (!rateLimitResult.allowed) {
			const retryAfter = Math.ceil(
				(rateLimitResult.resetTime - Date.now()) / 1000
			);
			return respondError(
				`Too many verification attempts. Please try again in ${retryAfter} seconds.`,
				429
			);
		}

		try {
			// Verify the OTP code
			// For sign-up flow, use 'signup' type (or 'email' for some Supabase versions)
			const { data: verifyData, error: verifyError } =
				await supabase.auth.verifyOtp({
					email: data.email,
					token: data.otp,
					type: 'signup',
				});

			if (verifyError) {
				console.error('Sign-up OTP verification failed:', verifyError);

				// Handle specific error cases
				if (
					verifyError.message.includes('expired') ||
					verifyError.message.includes('invalid') ||
					verifyError.message.includes('Token')
				) {
					return respondError(
						'Invalid or expired verification code. Please request a new one.',
						400,
						'Invalid OTP'
					);
				}

				if (verifyError.message.includes('already confirmed')) {
					return respondError(
						'This email has already been verified. Please sign in.',
						400,
						'Already verified'
					);
				}

				return respondError(
					verifyError.message || 'Failed to verify code',
					400
				);
			}

			// Check if we got a session (indicates successful verification)
			if (!verifyData?.session) {
				// Try to get current user anyway
				const { data: userData } = await supabase.auth.getUser();
				if (!userData?.user?.email_confirmed_at) {
					return respondError(
						'Verification incomplete. Please try again or request a new code.',
						400
					);
				}
			}

			// Get user info to create profile
			const user =
				verifyData?.user || (await supabase.auth.getUser()).data.user;

			if (user) {
				// Keep an existing profile as the canonical identity source. A database
				// trigger may already have created it when auth.users was inserted.
				const pendingDisplayName = user.user_metadata?.pending_display_name;
				const { data: existingProfile, error: existingProfileError } =
					await supabase
						.from('user_profiles')
						.select('display_name, full_name')
						.eq('user_id', user.id)
						.maybeSingle();

				if (existingProfileError) {
					console.warn(
						'Failed to load user profile before sign-up verification upsert:',
						existingProfileError
					);
				} else {
					const { profile, options } = buildVerifiedUserProfileUpsert(
						user,
						existingProfile
					);
					const { error: profileError } = await supabase
						.from('user_profiles')
						.upsert(profile, options);

					if (profileError) {
						console.error('Failed to upsert user profile:', profileError);
						// Don't fail the entire flow - profile can be created later.
					} else if (pendingDisplayName) {
						// Clear the pending display name only after it has persisted.
						await supabase.auth.updateUser({
							data: { pending_display_name: null },
						});
					}
				}
			}

			return respondSuccess({
				verified: true,
				email: data.email,
				message: 'Email verified successfully! Your account is now active.',
				next_step: 'complete',
				redirect: '/dashboard',
			});
		} catch (error) {
			console.error('Sign-up verify OTP error:', error);
			return respondError(
				'An unexpected error occurred during verification. Please try again.',
				500
			);
		}
	}
);
