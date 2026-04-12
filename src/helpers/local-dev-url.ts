export type BrowserLocationLike = Pick<
	Location,
	'host' | 'hostname' | 'origin' | 'protocol'
>;

type BrowserServiceUrlOptions = {
	browserLocation?: BrowserLocationLike | null;
	configuredUrl?: string | null;
	devPort?: string | null;
	nodeEnv?: string | null;
};

type InternalSupabaseUrlOptions = {
	internalUrl?: string | null;
	publicUrl?: string | null;
};

type SupabaseAuthStorageKeyOptions = {
	publicUrl?: string | null;
};

const DEFAULT_SUPABASE_DEV_PORT = '54321';
const DEFAULT_PARTYKIT_DEV_PORT = '1999';

function trimConfigValue(value?: string | null): string | null {
	const trimmed = value?.trim();
	if (!trimmed) return null;
	return trimmed.replace(/^['"]|['"]$/g, '');
}

function getBrowserLocation(): BrowserLocationLike | null {
	if (typeof window === 'undefined') {
		return null;
	}

	return window.location;
}

function normalizeHost(hostOrUrl: string): string {
	const trimmed = trimConfigValue(hostOrUrl);
	if (!trimmed) return '';

	try {
		if (trimmed.includes('://')) {
			return new URL(trimmed).host;
		}

		return new URL(`http://${trimmed}`).host;
	} catch {
		return trimmed
			.replace(/^[a-z]+:\/\//i, '')
			.replace(/\/+$/, '');
	}
}

function normalizeHostname(hostOrUrl: string): string {
	const trimmed = trimConfigValue(hostOrUrl);
	if (!trimmed) return '';

	const normalizedHost = normalizeHost(trimmed).toLowerCase();
	if (!normalizedHost) return '';

	if (normalizedHost.startsWith('[')) {
		const endBracketIndex = normalizedHost.indexOf(']');
		if (endBracketIndex > 0) {
			return normalizedHost.slice(1, endBracketIndex);
		}
	}

	if ((normalizedHost.match(/:/g) ?? []).length > 1) {
		return normalizedHost;
	}

	const [hostname] = normalizedHost.split(':');
	return hostname;
}

function toSupabaseAuthStorageKey(hostOrUrl: string): string {
	// Expected input is usually a standard Supabase host/URL like
	// <project-ref>.supabase.co. We derive the storage key from the first
	// hostname segment and fall back to `sb-local-auth-token` when no hostname
	// can be resolved.
	const hostname = normalizeHostname(hostOrUrl);
	if (!hostname) {
		return 'sb-local-auth-token';
	}

	const projectRef = hostname.split('.')[0];
	return `sb-${projectRef}-auth-token`;
}

function isLoopbackHost(hostOrUrl: string): boolean {
	const hostname = normalizeHostname(hostOrUrl);
	return (
		hostname === 'localhost' ||
		hostname === '127.0.0.1' ||
		hostname === '0.0.0.0' ||
		hostname === '::1' ||
		hostname === '0:0:0:0:0:0:0:1'
	);
}

function formatHostWithPort(hostname: string, port: string): string {
	const normalizedHostname = hostname.replace(/^\[|\]$/g, '');
	if (normalizedHostname.includes(':')) {
		return `[${normalizedHostname}]:${port}`;
	}

	return `${normalizedHostname}:${port}`;
}

function getResolvedDevPort(
	configuredPort: string | null | undefined,
	fallbackPort: string
): string {
	return trimConfigValue(configuredPort) ?? fallbackPort;
}

function shouldDeriveFromBrowserHost(
	configuredUrl: string | null,
	browserLocation: BrowserLocationLike | null,
	nodeEnv: string | null | undefined
): boolean {
	if (!browserLocation) {
		return false;
	}

	const browserHost = browserLocation.hostname;
	if (
		configuredUrl &&
		isLoopbackHost(configuredUrl) &&
		!isLoopbackHost(browserHost)
	) {
		// LAN device access should never stay pinned to localhost/127.0.0.1.
		return true;
	}

	if (nodeEnv !== 'development') {
		return false;
	}

	if (!configuredUrl) {
		return true;
	}

	return isLoopbackHost(configuredUrl);
}

/**
 * Returns the current browser origin when a browser location is available.
 *
 * @param browserLocation - Optional location override. Defaults to `window.location` when running in the browser.
 * @returns The current origin string, or an empty string when no browser location exists.
 * @behavior Uses the provided location first, otherwise falls back to `window.location`; no extra normalization is applied.
 */
export function getBrowserOrigin(
	browserLocation: BrowserLocationLike | null = getBrowserLocation()
): string {
	return browserLocation?.origin ?? '';
}

/**
 * Builds an absolute URL against the current browser origin.
 *
 * @param pathname - Relative or absolute path to resolve.
 * @param browserLocation - Optional location override. Defaults to `window.location` when available.
 * @returns An absolute URL string when an origin is known, otherwise the original pathname.
 * @behavior Uses `getBrowserOrigin`; if no browser origin is available it returns the input unchanged.
 */
export function buildCurrentOriginUrl(
	pathname: string,
	browserLocation: BrowserLocationLike | null = getBrowserLocation()
): string {
	const origin = getBrowserOrigin(browserLocation);
	if (!origin) return pathname;
	return new URL(pathname, origin).toString();
}

/**
 * Resolves the browser-facing Supabase HTTP base URL.
 *
 * @param options.browserLocation - Optional browser location override. Defaults to `window.location`.
 * @param options.configuredUrl - Optional Supabase URL override. Defaults to `process.env.NEXT_PUBLIC_SUPABASE_URL`.
 * @param options.devPort - Optional dev-port override. Defaults to `process.env.NEXT_PUBLIC_SUPABASE_DEV_PORT` or `54321`.
 * @param options.nodeEnv - Optional environment override. Defaults to `process.env.NODE_ENV`.
 * @returns The derived Supabase URL, or an empty string when nothing is configured.
 * @behavior In development, missing or loopback-configured URLs derive host from `browserLocation.hostname` and port from the resolved dev port; otherwise returns the trimmed configured URL.
 */
export function resolveBrowserSupabaseUrl({
	browserLocation = getBrowserLocation(),
	configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
	devPort = process.env.NEXT_PUBLIC_SUPABASE_DEV_PORT,
	nodeEnv = process.env.NODE_ENV,
}: BrowserServiceUrlOptions = {}): string {
	const trimmedConfiguredUrl = trimConfigValue(configuredUrl);

	if (
		shouldDeriveFromBrowserHost(
			trimmedConfiguredUrl,
			browserLocation,
			nodeEnv
		) &&
		browserLocation
	) {
		const resolvedPort = getResolvedDevPort(
			devPort,
			DEFAULT_SUPABASE_DEV_PORT
		);
		return `http://${formatHostWithPort(browserLocation.hostname, resolvedPort)}`;
	}

	return trimmedConfiguredUrl ?? '';
}

/**
 * Resolves the browser-facing PartyKit host.
 *
 * @param options.browserLocation - Optional browser location override. Defaults to `window.location`.
 * @param options.configuredUrl - Optional PartyKit URL/host override. Defaults to `process.env.NEXT_PUBLIC_PARTYKIT_URL`.
 * @param options.devPort - Optional dev-port override. Defaults to `process.env.NEXT_PUBLIC_PARTYKIT_DEV_PORT` or `1999`.
 * @param options.nodeEnv - Optional environment override. Defaults to `process.env.NODE_ENV`.
 * @returns A host string with port, suitable for HTTP or WS URL composition.
 * @behavior In development, missing or loopback-configured values derive host from `browserLocation.hostname`; configured URLs are normalized to host-only form, and final fallback is `127.0.0.1:<port>`.
 */
export function resolveBrowserPartyKitHost({
	browserLocation = getBrowserLocation(),
	configuredUrl = process.env.NEXT_PUBLIC_PARTYKIT_URL,
	devPort = process.env.NEXT_PUBLIC_PARTYKIT_DEV_PORT,
	nodeEnv = process.env.NODE_ENV,
}: BrowserServiceUrlOptions = {}): string {
	const trimmedConfiguredUrl = trimConfigValue(configuredUrl);
	const resolvedPort = getResolvedDevPort(devPort, DEFAULT_PARTYKIT_DEV_PORT);

	if (
		shouldDeriveFromBrowserHost(
			trimmedConfiguredUrl,
			browserLocation,
			nodeEnv
		) &&
		browserLocation
	) {
		return formatHostWithPort(browserLocation.hostname, resolvedPort);
	}

	if (trimmedConfiguredUrl) {
		return normalizeHost(trimmedConfiguredUrl);
	}

	if (browserLocation) {
		return browserLocation.host;
	}

	return formatHostWithPort('127.0.0.1', resolvedPort);
}

/**
 * Resolves the browser-facing PartyKit WebSocket base URL.
 *
 * @param options.browserLocation - Optional browser location override. Defaults to `window.location`.
 * @param options.configuredUrl - Optional PartyKit URL/host override. Defaults to `process.env.NEXT_PUBLIC_PARTYKIT_URL`.
 * @param options.devPort - Optional dev-port override. Defaults to `process.env.NEXT_PUBLIC_PARTYKIT_DEV_PORT` or `1999`.
 * @param options.nodeEnv - Optional environment override. Defaults to `process.env.NODE_ENV`.
 * @returns A normalized `ws://` or `wss://` base URL without trailing slashes.
 * @behavior In development, missing or loopback-configured values derive host from `browserLocation.hostname`; configured HTTP(S) URLs are converted to WS(S), existing WS(S) URLs are trimmed, and the last fallback uses the resolved PartyKit host.
 */
export function resolveBrowserPartyKitWsBaseUrl(
	options: BrowserServiceUrlOptions = {}
): string {
	const {
		browserLocation = getBrowserLocation(),
		configuredUrl = process.env.NEXT_PUBLIC_PARTYKIT_URL,
		devPort = process.env.NEXT_PUBLIC_PARTYKIT_DEV_PORT,
		nodeEnv = process.env.NODE_ENV,
	} = options;
	const trimmedConfiguredUrl = trimConfigValue(configuredUrl);
	const wsProtocol = browserLocation?.protocol === 'https:' ? 'wss:' : 'ws:';

	if (
		shouldDeriveFromBrowserHost(
			trimmedConfiguredUrl,
			browserLocation,
			nodeEnv
		) &&
		browserLocation
	) {
		const resolvedPort = getResolvedDevPort(devPort, DEFAULT_PARTYKIT_DEV_PORT);
		return `${wsProtocol}//${formatHostWithPort(browserLocation.hostname, resolvedPort)}`;
	}

	if (trimmedConfiguredUrl) {
		if (
			trimmedConfiguredUrl.startsWith('ws://') ||
			trimmedConfiguredUrl.startsWith('wss://')
		) {
			return trimmedConfiguredUrl.replace(/\/+$/, '');
		}

		if (trimmedConfiguredUrl.startsWith('http://')) {
			return `ws://${trimmedConfiguredUrl
				.slice('http://'.length)
				.replace(/\/+$/, '')}`;
		}

		if (trimmedConfiguredUrl.startsWith('https://')) {
			return `wss://${trimmedConfiguredUrl
				.slice('https://'.length)
				.replace(/\/+$/, '')}`;
		}

		return `${wsProtocol}//${normalizeHost(trimmedConfiguredUrl)}`;
	}

	if (browserLocation) {
		return `${wsProtocol}//${browserLocation.host}`;
	}

	return `ws://${resolveBrowserPartyKitHost({ devPort })}`;
}

/**
 * Resolves the server-side Supabase base URL.
 *
 * @param options.internalUrl - Optional internal URL override. Defaults to `process.env.SUPABASE_INTERNAL_URL`.
 * @param options.publicUrl - Optional public URL override. Defaults to `process.env.NEXT_PUBLIC_SUPABASE_URL`.
 * @returns The trimmed internal Supabase URL when present, otherwise the trimmed public URL or an empty string.
 * @behavior Prefers internal server-only configuration over public browser configuration and performs quote/whitespace trimming on both.
 */
export function getInternalSupabaseUrl({
	internalUrl = process.env.SUPABASE_INTERNAL_URL,
	publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
}: InternalSupabaseUrlOptions = {}): string {
	return trimConfigValue(internalUrl) ?? trimConfigValue(publicUrl) ?? '';
}

/**
 * Derives the Supabase auth storage key used by browser and SSR clients.
 *
 * @param options.publicUrl - Optional public Supabase URL override. Defaults to `process.env.NEXT_PUBLIC_SUPABASE_URL`.
 * @returns A storage key like `sb-<project-ref>-auth-token`, or `sb-local-auth-token` when no hostname can be derived.
 * @behavior Trims the configured URL, extracts the normalized hostname/project ref, and falls back to the local token key when no usable URL is available.
 */
export function getSupabaseAuthStorageKey({
	publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
}: SupabaseAuthStorageKeyOptions = {}): string {
	return toSupabaseAuthStorageKey(trimConfigValue(publicUrl) ?? '');
}
