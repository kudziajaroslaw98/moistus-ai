import { createClient } from '@/helpers/supabase/server';

export type DashboardAuthResult =
	| { authorized: true; userId: string; isAnonymous: false }
	| { authorized: false; reason: 'no_session' | 'anonymous' };

/**
 * Server-side auth check for dashboard pages.
 * Blocks anonymous users and unauthenticated requests.
 *
 * @returns Auth result with user info if authorized
 */
export async function checkDashboardAuth(): Promise<DashboardAuthResult> {
	const supabase = await createClient();
	const {
		data: { user },
		error,
	} = await supabase.auth.getUser();

	if (error || !user) {
		return { authorized: false, reason: 'no_session' };
	}

	if (user.is_anonymous) {
		return { authorized: false, reason: 'anonymous' };
	}

	return {
		authorized: true,
		userId: user.id,
		isAnonymous: false,
	};
}
