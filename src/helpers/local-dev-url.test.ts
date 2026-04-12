import {
	buildCurrentOriginUrl,
	getInternalSupabaseUrl,
	getSupabaseAuthStorageKey,
	resolveBrowserPartyKitWsBaseUrl,
	resolveBrowserSupabaseUrl,
	type BrowserLocationLike,
} from './local-dev-url';

const lanBrowserLocation: BrowserLocationLike = {
	hostname: '192.168.0.239',
	host: '192.168.0.239:3000',
	origin: 'http://192.168.0.239:3000',
	protocol: 'http:',
};

describe('local-dev-url helpers', () => {
	it('derives the browser Supabase URL from the current host when the configured URL is loopback in development', () => {
		expect(
			resolveBrowserSupabaseUrl({
				configuredUrl: 'http://127.0.0.1:54321',
				browserLocation: lanBrowserLocation,
				nodeEnv: 'development',
			})
		).toBe('http://192.168.0.239:54321');
		expect(
			resolveBrowserSupabaseUrl({
				configuredUrl: '"http://127.0.0.1:54321"',
				browserLocation: lanBrowserLocation,
				nodeEnv: 'development',
			})
		).toBe('http://192.168.0.239:54321');
	});

	it('derives the browser Supabase URL from the current non-loopback host when nodeEnv is not available', () => {
		expect(
			resolveBrowserSupabaseUrl({
				configuredUrl: 'http://127.0.0.1:54321',
				browserLocation: lanBrowserLocation,
				nodeEnv: undefined,
			})
		).toBe('http://192.168.0.239:54321');
	});

	it('preserves an explicit non-loopback Supabase URL', () => {
		expect(
			resolveBrowserSupabaseUrl({
				configuredUrl: 'https://project.supabase.co',
				browserLocation: lanBrowserLocation,
				nodeEnv: 'development',
			})
		).toBe('https://project.supabase.co');
	});

	it('derives the PartyKit websocket URL from the current host when the configured URL is loopback in development', () => {
		expect(
			resolveBrowserPartyKitWsBaseUrl({
				configuredUrl: '127.0.0.1:1999',
				browserLocation: lanBrowserLocation,
				nodeEnv: 'development',
			})
		).toBe('ws://192.168.0.239:1999');
		expect(
			resolveBrowserPartyKitWsBaseUrl({
				configuredUrl: '"127.0.0.1:1999"',
				browserLocation: lanBrowserLocation,
				nodeEnv: 'development',
			})
		).toBe('ws://192.168.0.239:1999');
	});

	it('derives the PartyKit websocket URL from the current non-loopback host when nodeEnv is not available', () => {
		expect(
			resolveBrowserPartyKitWsBaseUrl({
				configuredUrl: '127.0.0.1:1999',
				browserLocation: lanBrowserLocation,
				nodeEnv: undefined,
			})
		).toBe('ws://192.168.0.239:1999');
	});

	it('builds auth redirects against the current browser origin', () => {
		expect(
			buildCurrentOriginUrl('/auth/forgot-password', lanBrowserLocation)
		).toBe('http://192.168.0.239:3000/auth/forgot-password');
	});

	it('prefers SUPABASE_INTERNAL_URL for server-side Supabase clients', () => {
		expect(
			getInternalSupabaseUrl({
				internalUrl: 'http://127.0.0.1:54321',
				publicUrl: 'http://192.168.0.239:54321',
			})
		).toBe('http://127.0.0.1:54321');
		expect(
			getInternalSupabaseUrl({
				internalUrl: '"http://127.0.0.1:54321"',
				publicUrl: 'http://192.168.0.239:54321',
			})
		).toBe('http://127.0.0.1:54321');
	});

	it('falls back to the public Supabase URL when no internal override is set', () => {
		expect(
			getInternalSupabaseUrl({
				internalUrl: '',
				publicUrl: 'http://192.168.0.239:54321',
			})
		).toBe('http://192.168.0.239:54321');
	});

	it('keeps a stable Supabase auth storage key based on the configured URL instead of the runtime LAN host', () => {
		expect(
			getSupabaseAuthStorageKey({
				publicUrl: 'http://127.0.0.1:54321',
			})
		).toBe('sb-127-auth-token');
		expect(
			getSupabaseAuthStorageKey({
				publicUrl: '"http://127.0.0.1:54321"',
			})
		).toBe('sb-127-auth-token');
	});

	it('falls back to a local Supabase auth storage key when no URL is configured', () => {
		expect(
			getSupabaseAuthStorageKey({
				publicUrl: '',
			})
		).toBe('sb-local-auth-token');
	});
});
