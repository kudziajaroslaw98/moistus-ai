import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Returns true when `user_profiles.role` is `'admin'` for the given user.
 *
 * Pass a service-role client: the role column is guarded by the
 * `guard_user_profile_role` trigger, so it can only be set out-of-band
 * (dashboard SQL), and private profiles are not readable via the user client.
 * Lookup failures are treated as "not admin".
 */
export async function isUserAdmin(
	serviceClient: SupabaseClient,
	userId: string | null | undefined
): Promise<boolean> {
	if (!userId) return false;

	const { data, error } = await serviceClient
		.from('user_profiles')
		.select('role')
		.eq('user_id', userId)
		.maybeSingle();

	if (error) {
		console.error('Failed to resolve admin role:', error);
		return false;
	}

	return data?.role === 'admin';
}
