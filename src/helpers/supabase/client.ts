import { createBrowserClient } from '@supabase/ssr';
import { resolveBrowserSupabaseUrl } from '@/helpers/local-dev-url';

export function createClient() {
	return createBrowserClient(
		resolveBrowserSupabaseUrl(),
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
	);
}
