import type { AuthInfo } from '@modelcontextprotocol/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getInternalSupabaseUrl } from '@/helpers/local-dev-url';
import { readMcpCaller, type McpCaller } from './auth';

export interface McpToolContext extends McpCaller {
	/** Acts as the user through their OAuth access token, so RLS applies. */
	supabase: SupabaseClient;
	/** Shiko origin for links back into the app, e.g. https://shiko.app */
	appOrigin: string;
}

export function createMcpToolContext(
	authInfo: AuthInfo | undefined,
	appOrigin: string
): McpToolContext {
	const caller = readMcpCaller(authInfo);
	const supabase = createClient(
		getInternalSupabaseUrl(),
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			global: { headers: { Authorization: `Bearer ${authInfo!.token}` } },
			auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
		}
	);

	return { ...caller, supabase, appOrigin };
}
