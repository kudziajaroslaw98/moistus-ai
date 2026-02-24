import type { JWTPayload } from 'jose';

export type PartyAuthEnv = {
	SUPABASE_JWKS_URL?: string;
	SUPABASE_JWT_ISSUER?: string;
	SUPABASE_JWT_AUDIENCE?: string;
	SUPABASE_URL?: string;
	NEXT_PUBLIC_SUPABASE_URL?: string;
	SUPABASE_SERVICE_ROLE?: string;
	SUPABASE_SERVICE_ROLE_KEY?: string;
};

export type SupabaseJwtPayload = JWTPayload & {
	sub: string;
	role?: string;
};

type SupabaseAuthUserResponse = {
	id?: unknown;
	role?: unknown;
	app_metadata?: {
		role?: unknown;
	} | null;
};

export type ParsedMindMapRoom = {
	roomName: string;
	mapId: string;
	channel: string;
};

type JoseModule = typeof import('jose');
const jwksByUrl = new Map<
	string,
	ReturnType<JoseModule['createRemoteJWKSet']>
>();
let joseModulePromise: Promise<JoseModule> | null = null;

async function getJoseModule(): Promise<JoseModule> {
	if (!joseModulePromise) {
		joseModulePromise = import('jose');
	}
	return joseModulePromise;
}

async function getJwks(
	jwksUrl: string
): Promise<ReturnType<JoseModule['createRemoteJWKSet']>> {
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

	try {
		const { jwtVerify } = await getJoseModule();
		const jwks = await getJwks(jwksUrl);
		const { payload } = await jwtVerify(token, jwks, verifyOptions);
		if (!payload.sub || typeof payload.sub !== 'string') {
			throw new Error('Invalid JWT: missing subject');
		}
		return payload as SupabaseJwtPayload;
	} catch (jwtError) {
		const fallbackPayload = await verifySupabaseTokenViaAuthApi(token, env);
		if (fallbackPayload) {
			console.warn(
				'[partykit] JWT verification via JWKS failed; accepted token via Supabase auth API fallback'
			);
			return fallbackPayload;
		}
		throw jwtError;
	}
}

function normalizeEnvString(value: string | undefined): string | undefined {
	if (!value) return undefined;
	const trimmed = value.trim();
	if (!trimmed) return undefined;
	if (
		(trimmed.startsWith('"') && trimmed.endsWith('"')) ||
		(trimmed.startsWith("'") && trimmed.endsWith("'"))
	) {
		const unwrapped = trimmed.slice(1, -1).trim();
		return unwrapped || undefined;
	}
	return trimmed;
}

function readSupabaseBaseUrl(env: PartyAuthEnv): string | null {
	const raw =
		normalizeEnvString(env.SUPABASE_URL) ||
		normalizeEnvString(env.NEXT_PUBLIC_SUPABASE_URL);
	if (!raw) return null;
	return raw.replace(/\/+$/, '');
}

function readSupabaseApiKey(env: PartyAuthEnv): string | null {
	return (
		normalizeEnvString(env.SUPABASE_SERVICE_ROLE) ||
		normalizeEnvString(env.SUPABASE_SERVICE_ROLE_KEY) ||
		null
	);
}

function toSupabaseJwtPayloadFromAuthUser(
	user: SupabaseAuthUserResponse
): SupabaseJwtPayload | null {
	const sub = typeof user.id === 'string' ? user.id : null;
	if (!sub) return null;

	const role =
		typeof user.role === 'string'
			? user.role
			: typeof user.app_metadata?.role === 'string'
				? user.app_metadata.role
				: undefined;

	return {
		sub,
		role,
	};
}

async function verifySupabaseTokenViaAuthApi(
	token: string,
	env: PartyAuthEnv
): Promise<SupabaseJwtPayload | null> {
	const baseUrl = readSupabaseBaseUrl(env);
	const apiKey = readSupabaseApiKey(env);
	if (!baseUrl || !apiKey) {
		return null;
	}

	try {
		const response = await fetch(`${baseUrl}/auth/v1/user`, {
			method: 'GET',
			headers: {
				apikey: apiKey,
				Authorization: `Bearer ${token}`,
			},
		});

		if (!response.ok) {
			return null;
		}

		const parsed = (await response.json()) as SupabaseAuthUserResponse;
		return toSupabaseJwtPayloadFromAuthUser(parsed);
	} catch {
		return null;
	}
}

/** Rejects segments with path traversal, null bytes, or control characters. */
function isSafeRoomSegment(segment: string): boolean {
	if (segment.includes('\0')) return false;
	if (segment.includes('..')) return false;
	for (let i = 0; i < segment.length; i += 1) {
		if (segment.charCodeAt(i) <= 0x1f) return false;
	}
	return true;
}

function safeDecodeURIComponent(value: string): string | null {
	try {
		return decodeURIComponent(value);
	} catch {
		return null;
	}
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
			decoded = safeDecodeURIComponent(segments[2]);
		} else if (segments[1]) {
			decoded = safeDecodeURIComponent(segments[1]);
		}
	} else if (segments[0] === 'parties') {
		if (segments[2]) {
			decoded = safeDecodeURIComponent(segments[2]);
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
