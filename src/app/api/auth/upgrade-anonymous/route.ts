import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withAuthValidation } from '@/helpers/api/with-auth-validation';
import { z } from 'zod';

const UpgradeAnonymousSchema = z.object({
	email: z.string().email('Please provide a valid email address'),
	password: z.string().min(8, 'Password must be at least 8 characters long'),
	display_name: z.string().min(1).max(50).optional(),
});

export const POST = withAuthValidation(
	UpgradeAnonymousSchema,
	async (req, data, supabase, user) => {
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
				return respondError('User is not anonymous', 400);
			}

			// 2. Update auth.users with email and password
			const { error: authError } = await supabase.auth.updateUser({
				email: data.email,
				password: data.password,
			});

			if (authError) {
				console.error('Failed to update auth user:', authError);
				return respondError(
					authError.message || 'Failed to upgrade account',
					400
				);
			}

			// 3. Update user profile using database function
			const { data: upgradeResult, error: upgradeError } = await supabase.rpc(
				'upgrade_anonymous_to_full_user',
				{
					user_id_param: user.id,
					email_param: data.email,
					full_name_param: data.display_name || profile.display_name,
				}
			);

			if (upgradeError) {
				console.error('Failed to upgrade user profile:', upgradeError);
				return respondError('Failed to upgrade user profile', 500);
			}

			// 4. Get updated profile information
			const { data: updatedProfile, error: fetchError } = await supabase
				.from('user_profiles')
				.select(
					'user_id, full_name, display_name, email, is_anonymous, avatar_url'
				)
				.eq('user_id', user.id)
				.single();

			if (fetchError) {
				console.error('Failed to fetch updated profile:', fetchError);
				// Don't fail the upgrade if we can't fetch the updated profile
			}

			// 5. Return success response
			return respondSuccess({
				upgraded: true,
				user_id: user.id,
				email: data.email,
				profile: updatedProfile || {
					user_id: user.id,
					email: data.email,
					full_name: data.display_name || profile.display_name,
					display_name: data.display_name || profile.display_name,
					is_anonymous: false,
				},
				message: 'Account successfully upgraded to full user',
			});
		} catch (error) {
			console.error('Upgrade anonymous user error:', error);
			return respondError(
				'An unexpected error occurred while upgrading your account',
				500
			);
		}
	}
);
