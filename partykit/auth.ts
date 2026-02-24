import type { JWTPayload } from 'jose';

export type PartyAuthEnv = {
	SUPABASE_JWKS_URL?: string;
	SUPABASE_JWT_ISSUER?: string;
	SUPABASE_JWT_AUDIENCE?: string;
};

export type SupabaseJwtPayload = JWTPayload & {
	sub: string;
	role?: string;
};

export type ParsedMindMapRoom = {
	roomName: string;
	mapId: string;
	channel: string;
};

type JoseModule = typeof import('jose');
const jwksByUrl = new Map<string, ReturnType<JoseModule['createRemoteJWKSet']>>();
let joseModulePromise: Promise<JoseModule> | null = null;

async function getJoseModule(): Promise<JoseModule> {
	if (!joseModulePromise) {
		joseModulePromise = import('jose');
	}
	return joseModulePromise;
}

async function getJwks(jwksUrl: string): Promise<ReturnType<JoseModule['createRemoteJWKSet']>> {
	let existing = jwksByUrl.get(jwksUrl);
	if (existing) return existing;

	const { createRemoteJWKSet } = await getJoseModule();
	existing = createRemoteJWKSet(new URL(jwksUrl));
	jwksByUrl.set(jwksUrl, existing);
	return existing;
}

function getBearerToken(authHeader: string | null): string | null {
	if (!authHeader) return null;
	if (!authHeader.toLowerCase().startsWith('bearer ')) return null;
	const token = authHeader.slice(7).trim();
	return token.length > 0 ? token : null;
}

export function readAuthToken(request: Request): string | null {
	const fromHeader = getBearerToken(request.headers.get('authorization'));
	if (fromHeader) return fromHeader;

	const url = new URL(request.url);
	const fromQuery = url.searchParams.get('token');
	if (fromQuery && fromQuery.trim().length > 0) {
		return fromQuery.trim();
	}

	return null;
}

export async function verifySupabaseJwt(
	token: string,
	env: PartyAuthEnv
): Promise<SupabaseJwtPayload> {
	const jwksUrl = env.SUPABASE_JWKS_URL?.trim();
	if (!jwksUrl) {
		throw new Error('SUPABASE_JWKS_URL is required for PartyKit auth');
	}

	const verifyOptions: {
		issuer?: string;
		audience?: string;
	} = {};

	if (env.SUPABASE_JWT_ISSUER?.trim()) {
		verifyOptions.issuer = env.SUPABASE_JWT_ISSUER.trim();
	}

	const audience = env.SUPABASE_JWT_AUDIENCE?.trim();
	verifyOptions.audience = audience || 'authenticated';

	const { jwtVerify } = await getJoseModule();
	const jwks = await getJwks(jwksUrl);
	const { payload } = await jwtVerify(token, jwks, verifyOptions);
	if (!payload.sub || typeof payload.sub !== 'string') {
		throw new Error('Invalid JWT: missing subject');
	}

	return payload as SupabaseJwtPayload;
}

/** Rejects segments with path traversal, null bytes, or control characters. */
function isSafeRoomSegment(segment: string): boolean {
	if (segment.includes('\0')) return false;
	if (segment.includes('..')) return false;
	// eslint-disable-next-line no-control-regex
	if (/[\x00-\x1f]/.test(segment)) return false;
	return true;
}

export function parseRoomNameFromRequest(
	urlOrRequest: string | Request
): string | null {
	const url = new URL(
		typeof urlOrRequest === 'string' ? urlOrRequest : urlOrRequest.url
	);
	const segments = url.pathname.split('/').filter(Boolean);

	if (segments.length === 0) return null;

	let decoded: string | null = null;

	if (segments[0] === 'party') {
		if (segments[2] && segments[2] !== 'admin') {
			decoded = decodeURIComponent(segments[2]);
		} else if (segments[1]) {
			decoded = decodeURIComponent(segments[1]);
		}
	} else if (segments[0] === 'parties') {
		if (segments[2]) {
			decoded = decodeURIComponent(segments[2]);
		}
	}

	if (decoded && !isSafeRoomSegment(decoded)) return null;
	return decoded;
}

export function parseMindMapRoom(roomName: string): ParsedMindMapRoom | null {
	const rawRoomName = roomName.split('/').filter(Boolean).pop() ?? roomName;
	const candidates: string[] = [rawRoomName];

	try {
		const decodedOnce = decodeURIComponent(rawRoomName);
		if (decodedOnce !== rawRoomName) {
			candidates.push(decodedOnce);
		}
	} catch {
		// Ignore invalid encoding and fall back to raw room name.
	}

	const roomPattern =
		/^mind-map:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?::([a-z0-9-]+))?$/i;

	for (const candidate of candidates) {
		const match = roomPattern.exec(candidate);
		if (!match) continue;

		return {
			roomName: candidate,
			mapId: match[1],
			channel: match[2] ?? 'sync',
		};
	}

	return null;
}

export function isAdminRevokePath(pathname: string): boolean {
	return pathname.endsWith('/admin/revoke');
}

export function isAdminPermissionsUpdatePath(pathname: string): boolean {
	return pathname.endsWith('/admin/permissions-update');
}

export function isAdminAccessRevokedPath(pathname: string): boolean {
	return pathname.endsWith('/admin/access-revoked');
}

export function isAdminCollaboratorEventPath(pathname: string): boolean {
	return pathname.endsWith('/admin/collaborator-event');
}

export function isAdminPath(pathname: string): boolean {
	return (
		isAdminRevokePath(pathname) ||
		isAdminPermissionsUpdatePath(pathname) ||
		isAdminAccessRevokedPath(pathname) ||
		isAdminCollaboratorEventPath(pathname)
	);
}

export function readAdminToken(request: Request): string | null {
	return (
		getBearerToken(request.headers.get('authorization')) ??
		request.headers.get('x-partykit-admin-token')
	);
}
