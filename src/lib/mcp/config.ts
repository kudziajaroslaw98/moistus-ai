import { getInternalSupabaseUrl } from '@/helpers/local-dev-url';

export const MCP_ENDPOINT_PATH = '/api/mcp';

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, '');

function readEnv(value: string | undefined): string | null {
	const trimmed = value?.trim();
	return trimmed ? trimmed : null;
}

/**
 * The public MCP endpoint URL (the OAuth "resource"), derived from the request
 * so local, preview and production deployments each advertise themselves.
 */
export function getMcpResourceUrl(request: Request): URL {
	return new URL(MCP_ENDPOINT_PATH, new URL(request.url).origin);
}

/**
 * Supabase Auth is the OAuth authorization server. Clients discover it from
 * this issuer, so it must be the public URL, not the internal one.
 */
export function getAuthorizationServerIssuer(): string {
	const explicit = readEnv(process.env.SUPABASE_JWT_ISSUER);
	if (explicit) return trimTrailingSlashes(explicit);

	const publicUrl = readEnv(process.env.NEXT_PUBLIC_SUPABASE_URL) ?? '';
	return `${trimTrailingSlashes(publicUrl)}/auth/v1`;
}

function swapLoopbackHost(url: string): string | null {
	if (url.includes('://127.0.0.1')) return url.replace('://127.0.0.1', '://localhost');
	if (url.includes('://localhost')) return url.replace('://localhost', '://127.0.0.1');
	return null;
}

/**
 * Issuers accepted on access tokens. Local stacks may sign with either
 * loopback spelling, and server traffic may use the internal Supabase URL.
 */
export function getAcceptedTokenIssuers(): string[] {
	const issuers = new Set<string>();
	const add = (value: string | null) => {
		if (!value) return;
		issuers.add(value);
		const swapped = swapLoopbackHost(value);
		if (swapped) issuers.add(swapped);
	};

	add(getAuthorizationServerIssuer());
	const internalUrl = trimTrailingSlashes(getInternalSupabaseUrl());
	if (internalUrl) add(`${internalUrl}/auth/v1`);

	return [...issuers];
}

export function getSupabaseJwksUrl(): string {
	const explicit = readEnv(process.env.SUPABASE_JWKS_URL);
	if (explicit) return explicit;

	return `${trimTrailingSlashes(getInternalSupabaseUrl())}/auth/v1/.well-known/jwks.json`;
}
