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

function isLoopbackHost(hostOrUrl: string): boolean {
	const hostname = normalizeHostname(hostOrUrl);
	return (
		hostname === 'localhost' ||
		hostname === '127.0.0.1' ||
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
	if (!browserLocation || nodeEnv !== 'development') {
		return false;
	}

	if (!configuredUrl) {
		return true;
	}

	return isLoopbackHost(configuredUrl);
}

export function getBrowserOrigin(
	browserLocation: BrowserLocationLike | null = getBrowserLocation()
): string {
	return browserLocation?.origin ?? '';
}

export function buildCurrentOriginUrl(
	pathname: string,
	browserLocation: BrowserLocationLike | null = getBrowserLocation()
): string {
	const origin = getBrowserOrigin(browserLocation);
	if (!origin) return pathname;
	return new URL(pathname, origin).toString();
}

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

export function getInternalSupabaseUrl({
	internalUrl = process.env.SUPABASE_INTERNAL_URL,
	publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
}: InternalSupabaseUrlOptions = {}): string {
	return trimConfigValue(internalUrl) ?? trimConfigValue(publicUrl) ?? '';
}
