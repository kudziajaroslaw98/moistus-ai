import { createBrowserClient } from '@supabase/ssr';
import {
	getSupabaseAuthStorageKey,
	resolveBrowserSupabaseUrl,
} from '@/helpers/local-dev-url';

export function createClient() {
	return createBrowserClient(
		resolveBrowserSupabaseUrl(),
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookieOptions: {
				name: getSupabaseAuthStorageKey(),
			},
		}
	);
}
