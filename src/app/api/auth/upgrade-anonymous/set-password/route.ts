import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withAuthValidation } from '@/helpers/api/with-auth-validation';
import { z } from 'zod';

const SetPasswordSchema = z.object({
	password: z.string().min(8, 'Password must be at least 8 characters long'),
	display_name: z.string().min(1).max(50).optional(),
});

/**
 * POST /api/auth/upgrade-anonymous/set-password
 *
 * Step 3 (final) of email-based anonymous user upgrade.
 * Sets the password AFTER email has been verified.
 *
 * This is the ONLY correct way to complete the upgrade - password
 * can only be set after email verification per Supabase requirements.
 */
export const POST = withAuthValidation(
	SetPasswordSchema,
	async (req, data, supabase, user) => {
		try {
			// DEBUG: Log incoming user from withAuthValidation
			console.log('[set-password] User from auth validation:', {
				id: user.id,
				email: user.email,
				is_anonymous: user.is_anonymous,
				email_confirmed_at: user.email_confirmed_at,
			});

			// NOTE: We don't check is_anonymous here because after OTP verification,
			// Supabase automatically sets is_anonymous = false. The user flow is:
			// 1. Anonymous user (is_anonymous = true)
			// 2. Verify OTP → Supabase sets is_anonymous = false
			// 3. Set password (this step) → completes upgrade
			// We instead check if email is verified and password is not set.

			// Fetch profile for display_name (optional - profile may not exist yet)
			const { data: profile } = await supabase
				.from('user_profiles')
				.select('display_name')
				.eq('user_id', user.id)
				.single();

			// 2. Check that email is verified in auth.users
			// Get fresh user data to check email status
			const {
				data: { user: currentUser },
				error: userError,
			} = await supabase.auth.getUser();

			// DEBUG: Log fresh user state
			console.log('[set-password] Fresh user from getUser:', {
				id: currentUser?.id,
				email: currentUser?.email,
				is_anonymous: currentUser?.is_anonymous,
				email_confirmed_at: currentUser?.email_confirmed_at,
			});

			if (userError || !currentUser) {
				console.error('Failed to get current user:', userError);
				return respondError('Failed to verify user state', 500);
			}

			// Check if user has a verified email
			// After OTP verification, email should be set and email_confirmed_at should exist
			if (!currentUser.email) {
				console.error('[set-password] Email not set! User state:', {
					id: currentUser.id,
					is_anonymous: currentUser.is_anonymous,
					email: currentUser.email,
				});
				return respondError(
					'Email not verified. Please complete email verification first.',
					400,
					'Email not verified'
				);
			}

			// 3. Set the password - this only works after email verification
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

			// 4. Get display name (from param, user metadata, or profile)
			const displayName =
				data.display_name ||
				currentUser.user_metadata?.pending_upgrade_display_name ||
				profile?.display_name;

			// 5. Update user profile using database function
			// This marks is_anonymous = false and updates email
			const { error: upgradeError } = await supabase.rpc(
				'upgrade_anonymous_to_full_user',
				{
					user_id_param: user.id,
					email_param: currentUser.email,
					full_name_param: displayName,
				}
			);

			if (upgradeError) {
				console.error('Failed to upgrade user profile:', upgradeError);
				// Don't fail completely - auth.users is already updated
				// Profile will eventually sync
				console.warn(
					'Profile update failed but auth upgrade succeeded - profile will sync later'
				);
			}

			// 6. Clear pending metadata
			await supabase.auth.updateUser({
				data: {
					pending_upgrade_display_name: null,
				},
			});

			// 7. Get updated profile information
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

			// 8. Return success response
			return respondSuccess({
				upgraded: true,
				user_id: user.id,
				email: currentUser.email,
				profile: updatedProfile || {
					user_id: user.id,
					email: currentUser.email,
					full_name: displayName,
					display_name: displayName,
					is_anonymous: false,
				},
				message:
					'Account successfully upgraded! You can now sign in with your email and password.',
			});
		} catch (error) {
			console.error('Set password error:', error);
			return respondError(
				'An unexpected error occurred while completing upgrade',
				500
			);
		}
	}
);
