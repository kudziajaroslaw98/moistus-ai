import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Whether this person switched on Developer mode (`user_profiles.preferences.developerMode`).
 * It's the server-side gate for everything that runs or stores plugins still being written:
 * the developer network worker and the playground drafts.
 */
export async function isDeveloperModeOn(
	supabase: SupabaseClient,
	userId: string
): Promise<boolean> {
	const { data: profile } = await supabase
		.from('user_profiles')
		.select('preferences')
		.eq('user_id', userId)
		.maybeSingle();
	const preferences = profile?.preferences as
		{ developerMode?: unknown } | null | undefined;
	return preferences?.developerMode === true;
}
