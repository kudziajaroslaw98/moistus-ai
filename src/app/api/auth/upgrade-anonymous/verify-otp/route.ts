import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withAuthValidation } from '@/helpers/api/with-auth-validation';
import { z } from 'zod';

const VerifyOtpSchema = z.object({
	email: z.string().email('Please provide a valid email address'),
	otp: z
		.string()
		.min(6, 'OTP must be 6 digits')
		.max(6, 'OTP must be 6 digits')
		.regex(/^\d+$/, 'OTP must contain only numbers'),
});

/**
 * POST /api/auth/upgrade-anonymous/verify-otp
 *
 * Step 2 of email-based anonymous user upgrade.
 * Verifies the OTP code sent to user's email.
 *
 * After successful verification, the user can proceed to set their password.
 */
export const POST = withAuthValidation(
	VerifyOtpSchema,
	async (req, data, supabase, user) => {
		try {
			// 1. Verify user is still in anonymous state (profile-wise)
			const { data: profile, error: profileError } = await supabase
				.from('user_profiles')
				.select('is_anonymous')
				.eq('user_id', user.id)
				.single();

			if (profileError) {
				console.error('Failed to fetch user profile:', profileError);
				return respondError('User profile not found', 404);
			}

			if (!profile?.is_anonymous) {
				return respondError('User has already been upgraded', 400);
			}

			// 2. Verify the OTP
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

			// 3. Check if verification was successful
			// After successful OTP verification, auth.users.email should be set
			const {
				data: { user: updatedUser },
			} = await supabase.auth.getUser();

			if (!updatedUser?.email) {
				// Email might not be set yet in some cases, but verification succeeded
				console.warn('Email not immediately reflected after OTP verification');
			}

			// 4. Return success - user can now set password
			return respondSuccess({
				verified: true,
				email: data.email,
				can_set_password: true,
				message:
					'Email verified successfully! You can now set your password.',
				next_step: 'set-password',
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
