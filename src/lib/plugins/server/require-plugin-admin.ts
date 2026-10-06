import { respondError } from '@/helpers/api/responses';
import { createServiceRoleClient } from '@/helpers/supabase/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { NextResponse } from 'next/server';
import { isPluginAdmin } from './plugin-library';

/**
 * The service-role client for Shiko's plugin reviewers, or a 404 for everyone else (the
 * admin routes don't admit they exist). The role is checked on the server every time.
 */
export async function requirePluginAdmin(
	user: User
): Promise<{ admin: SupabaseClient } | { response: NextResponse }> {
	const admin = createServiceRoleClient();
	if (user.is_anonymous || !(await isPluginAdmin(admin, user.id))) {
		return { response: respondError('Not found.', 404) };
	}
	return { admin };
}
