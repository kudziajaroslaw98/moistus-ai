import {
	OAuthError,
	OAuthErrorCode,
	type AuthInfo,
	type OAuthTokenVerifier,
} from '@modelcontextprotocol/server';
import type { JWTPayload } from 'jose';
import { getAcceptedTokenIssuers, getSupabaseJwksUrl } from './config';

/** Who is calling: the Shiko user and the OAuth client (AI app) acting for them. */
export interface McpCaller {
	userId: string;
	clientId: string;
}

type JoseModule = typeof import('jose');
type RemoteJwks = ReturnType<JoseModule['createRemoteJWKSet']>;

// jose is ESM-only; load it lazily (same pattern as partykit/auth.ts) so this
// module stays importable from Jest.
let joseModulePromise: Promise<JoseModule> | null = null;
const jwksByUrl = new Map<string, RemoteJwks>();

async function getJose(): Promise<JoseModule> {
	joseModulePromise ??= import('jose');
	return joseModulePromise;
}

async function getJwks(url: string): Promise<RemoteJwks> {
	const existing = jwksByUrl.get(url);
	if (existing) return existing;

	const { createRemoteJWKSet } = await getJose();
	const jwks = createRemoteJWKSet(new URL(url));
	jwksByUrl.set(url, jwks);
	return jwks;
}

const invalidToken = (message: string) =>
	new OAuthError(OAuthErrorCode.InvalidToken, message);

/**
 * A bad token is a 401 (the client re-authenticates); failing to reach the
 * JWKS is our problem, so it must not send every client into a sign-in loop.
 */
export function toVerificationError(error: unknown): OAuthError {
	const code = (error as { code?: unknown } | null)?.code;
	const message = error instanceof Error ? error.message : 'invalid token';
	const isTokenProblem =
		typeof code === 'string' &&
		(code.startsWith('ERR_JWT') ||
			code.startsWith('ERR_JWS') ||
			code === 'ERR_JWKS_NO_MATCHING_KEY' ||
			code === 'ERR_JOSE_ALG_NOT_ALLOWED' ||
			code === 'ERR_JOSE_NOT_SUPPORTED');

	return isTokenProblem
		? invalidToken(`Token rejected: ${message}`)
		: new OAuthError(OAuthErrorCode.ServerError, 'Could not verify the token right now. Try again.');
}

/**
 * Turns verified Supabase JWT claims into MCP auth info. Only OAuth access
 * tokens are accepted: a browser session token has no `client_id`, and
 * anonymous (guest) users can't connect apps.
 */
export function toMcpAuthInfo(token: string, payload: JWTPayload): AuthInfo {
	if (typeof payload.sub !== 'string' || !payload.sub) {
		throw invalidToken('Token has no user.');
	}
	if (typeof payload.client_id !== 'string' || !payload.client_id) {
		throw invalidToken(
			'This is not an OAuth access token. Connect through your AI app so it can sign in with Shiko.'
		);
	}
	if (payload.is_anonymous === true) {
		throw invalidToken('Guest accounts cannot connect AI apps. Create a Shiko account first.');
	}
	if (typeof payload.exp !== 'number') {
		throw invalidToken('Token has no expiry.');
	}

	const scopes =
		typeof payload.scope === 'string' ? payload.scope.split(' ').filter(Boolean) : [];

	return {
		token,
		clientId: payload.client_id,
		scopes,
		expiresAt: payload.exp,
		extra: { userId: payload.sub },
	};
}

export function readMcpCaller(authInfo: AuthInfo | undefined): McpCaller {
	const userId = authInfo?.extra?.userId;
	if (!authInfo || typeof userId !== 'string') {
		throw new Error('MCP request reached a tool without verified auth info');
	}
	return { userId, clientId: authInfo.clientId };
}

/** Verifies Supabase-issued access tokens locally against the project's JWKS. */
export function createSupabaseTokenVerifier(): OAuthTokenVerifier {
	return {
		async verifyAccessToken(token) {
			const { jwtVerify } = await getJose();
			let payload: JWTPayload;
			try {
				({ payload } = await jwtVerify(token, await getJwks(getSupabaseJwksUrl()), {
					issuer: getAcceptedTokenIssuers(),
					audience: 'authenticated',
				}));
			} catch (error) {
				throw toVerificationError(error);
			}
			return toMcpAuthInfo(token, payload);
		},
	};
}
