import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function createClient() {
	const cookieStore = await cookies();

	return createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: {
				getAll() {
					return cookieStore.getAll();
				},
				setAll(cookiesToSet) {
					try {
						cookiesToSet.forEach(({ name, value, options }) =>
							cookieStore.set(name, value, options)
						);
					} catch {}
				},
			},
		}
	);
}

/**
 * Creates a Supabase client with service role key that bypasses RLS.
 * Use ONLY for server-side operations like webhooks where no user context exists.
 * NEVER expose service role client to the frontend!
 */
export function createServiceRoleClient() {
	return createSupabaseClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.SUPABASE_SERVICE_ROLE!,
		{
			auth: {
				autoRefreshToken: false,
				persistSession: false,
			},
		}
	);
}
