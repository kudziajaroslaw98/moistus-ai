import {
	checkRateLimit,
	signUpInitiateRateLimiter,
} from '@/helpers/api/rate-limiter';
import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withPublicApiValidation } from '@/helpers/api/with-public-api-validation';
import { signUpInitiateRequestSchema } from '@/lib/validations/auth';

/**
 * POST /api/auth/sign-up/initiate
 *
 * Step 1 of the sign-up flow.
 * Creates a new user account and sends OTP verification email.
 *
 * Flow: User submits email + password + optional display name
 *       → Account created (unverified)
 *       → OTP email sent
 *       → User verifies via /verify-otp endpoint
 */
export const POST = withPublicApiValidation(
	signUpInitiateRequestSchema,
	async (req, data, supabase) => {
		// Rate limit check - prevent abuse of sign-up flow
		const rateLimitResult = checkRateLimit(req, signUpInitiateRateLimiter);
		if (!rateLimitResult.allowed) {
			const retryAfter = Math.ceil(
				(rateLimitResult.resetTime - Date.now()) / 1000
			);
			return respondError(
				`Too many sign-up attempts. Please try again in ${retryAfter} seconds.`,
				429
			);
		}

		try {
			// Create user account with Supabase
			// This will send a verification email with OTP code
			const { data: signUpData, error: signUpError } =
				await supabase.auth.signUp({
					email: data.email,
					password: data.password,
					options: {
						// Store display name in user metadata for later use
						data: data.display_name
							? { pending_display_name: data.display_name }
							: undefined,
						// Email verification is required
						emailRedirectTo: undefined, // We use OTP, not magic links
					},
				});

			if (signUpError) {
				console.error('Sign-up error:', signUpError);

				// Handle specific error cases
				if (
					signUpError.message.includes('already registered') ||
					signUpError.message.includes('already exists')
				) {
					return respondError(
						'An account with this email already exists. Please sign in instead.',
						409,
						'Email already registered'
					);
				}

				if (signUpError.message.includes('password')) {
					return respondError(
						'Password does not meet requirements. Please use at least 8 characters with uppercase, lowercase, and a number.',
						400,
						'Invalid password'
					);
				}

				return respondError(
					signUpError.message || 'Failed to create account',
					400
				);
			}

			// Check if user was created
			if (!signUpData.user) {
				return respondError('Failed to create account. Please try again.', 500);
			}

			// Check if email confirmation is required
			// Supabase returns user with identities empty if email confirmation is pending
			const emailConfirmationRequired =
				signUpData.user.identities?.length === 0 ||
				!signUpData.user.email_confirmed_at;

			if (!emailConfirmationRequired) {
				// Email auto-confirmed (shouldn't happen in production with proper settings)
				return respondSuccess({
					initiated: true,
					email: data.email,
					requiresVerification: false,
					message: 'Account created successfully.',
					next_step: 'complete',
				});
			}

			// Mask email for display (e.g., "u***@example.com")
			const [localPart, domain] = data.email.split('@');
			const maskedEmail = `${localPart.charAt(0)}${'*'.repeat(Math.min(localPart.length - 1, 5))}@${domain}`;

			return respondSuccess({
				initiated: true,
				email: maskedEmail,
				requiresVerification: true,
				message:
					'Verification code sent to your email. Please check your inbox and spam folder.',
				next_step: 'verify-otp',
			});
		} catch (error) {
			console.error('Sign-up initiate error:', error);
			return respondError(
				'An unexpected error occurred during sign-up. Please try again.',
				500
			);
		}
	}
);
