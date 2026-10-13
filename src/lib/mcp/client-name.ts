import { createServiceRoleClient } from '@/helpers/supabase/server';

const TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, { name: string; expiresAt: number }>();

/**
 * The connected app's registered name ("Claude Code"), for history entries
 * and the canvas. Read with the service role: only Auth admin can look up
 * OAuth clients. Falls back to a generic label; never fails a write.
 */
export async function getOAuthClientName(clientId: string): Promise<string> {
	const cached = cache.get(clientId);
	if (cached && cached.expiresAt > Date.now()) return cached.name;

	let name = 'AI app';
	try {
		const { data } = await createServiceRoleClient().auth.admin.oauth.getClient(clientId);
		name = data?.client_name?.trim() || name;
	} catch (error) {
		console.warn('[mcp] could not look up OAuth client name', error);
	}
	cache.set(clientId, { name, expiresAt: Date.now() + TTL_MS });
	return name;
}
