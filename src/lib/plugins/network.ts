import { PLUGIN_REQUEST_LIMITS } from './limits';

/**
 * Requests a plugin's refresh asks for. The plugin never gets `fetch`: it names URLs with
 * `ctx.request(url)`, and Shiko fetches them here with fixed, locked-down settings, from
 * the browser of the editor who refreshed. Only sites the owner approved (the plugin's
 * `network:<host>` powers) are reachable, and only JSON comes back.
 */

/** What `ctx.request(url)` returns to the plugin on its second pass. */
export type PluginResponse =
	| { status: 'ok'; code: number; json: unknown }
	| { status: 'error'; code: number | null; message: string };

export type PluginUrlCheck =
	{ ok: true; url: URL } | { ok: false; message: string };

/**
 * Whether a plugin may request `raw`: https only, exactly one of the approved hosts, the
 * default port, and no user name or password in the address. `blockedHosts` are never
 * reachable (Shiko itself and its database), even if a manifest names them.
 */
export function checkPluginRequestUrl(
	raw: string,
	allowedHosts: readonly string[],
	blockedHosts: readonly string[] = []
): PluginUrlCheck {
	if (raw.length > PLUGIN_REQUEST_LIMITS.urlLength) {
		return { ok: false, message: 'The address is too long' };
	}
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		return { ok: false, message: 'Not a valid address' };
	}
	if (url.protocol !== 'https:') {
		return { ok: false, message: 'Only https addresses can be requested' };
	}
	if (url.username || url.password) {
		return {
			ok: false,
			message: 'Addresses can’t include a user name or password',
		};
	}
	if (url.port !== '') {
		return { ok: false, message: 'Addresses can’t name a port' };
	}
	const host = url.hostname.toLowerCase();
	if (blockedHosts.includes(host) || !allowedHosts.includes(host)) {
		return { ok: false, message: `This plugin can’t reach ${host}` };
	}
	return { ok: true, url };
}

/** Hosts no plugin may reach from this page: Shiko's own origin and its Supabase project. */
export function blockedPluginHosts(): string[] {
	const hosts: string[] = [];
	if (typeof window !== 'undefined') hosts.push(window.location.hostname);
	try {
		const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
		if (supabase) hosts.push(new URL(supabase).hostname);
	} catch {
		// No usable Supabase URL configured: nothing to add.
	}
	return hosts.map((host) => host.toLowerCase());
}

async function readCapped(
	response: Response,
	maxBytes: number
): Promise<string | null> {
	if (!response.body) {
		const text = await response.text();
		return new Blob([text]).size > maxBytes ? null : text;
	}
	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		size += value.byteLength;
		if (size > maxBytes) {
			await reader.cancel().catch(() => undefined);
			return null;
		}
		chunks.push(value);
	}
	const bytes = new Uint8Array(size);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return new TextDecoder().decode(bytes);
}

export interface FetchPluginJsonOptions {
	allowedHosts: readonly string[];
	blockedHosts?: readonly string[];
	fetchImpl?: typeof fetch;
	timeoutMs?: number;
	maxBytes?: number;
}

/** Fetches one approved URL as JSON. Never throws: failures become `status: 'error'`. */
export async function fetchPluginJson(
	raw: string,
	{
		allowedHosts,
		blockedHosts = blockedPluginHosts(),
		fetchImpl = fetch,
		timeoutMs = PLUGIN_REQUEST_LIMITS.timeoutMs,
		maxBytes = PLUGIN_REQUEST_LIMITS.responseBytes,
	}: FetchPluginJsonOptions
): Promise<PluginResponse> {
	const checked = checkPluginRequestUrl(raw, allowedHosts, blockedHosts);
	if (!checked.ok)
		return { status: 'error', code: null, message: checked.message };

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		// Fixed settings: no cookies or other credentials, no referrer (the map's address),
		// redirects never followed (they could lead somewhere unapproved), no body.
		// 'manual' stops at the redirect like 'error' would, but lets us say what happened.
		const response = await fetchImpl(checked.url.href, {
			method: 'GET',
			credentials: 'omit',
			referrerPolicy: 'no-referrer',
			mode: 'cors',
			redirect: 'manual',
			cache: 'no-store',
			headers: { Accept: 'application/json' },
			signal: controller.signal,
		});
		if (
			response.type === 'opaqueredirect' ||
			(response.status >= 300 && response.status < 400)
		) {
			return {
				status: 'error',
				code: null,
				message: `${checked.url.hostname} sent the request somewhere else, which plugins can’t follow`,
			};
		}
		if (!response.ok) {
			return {
				status: 'error',
				code: response.status,
				message: `${checked.url.hostname} answered ${response.status}`,
			};
		}
		const type = response.headers.get('content-type') ?? '';
		if (!/^application\/(?:[\w.+-]+\+)?json\b/i.test(type)) {
			return {
				status: 'error',
				code: response.status,
				message: `${checked.url.hostname} didn’t send JSON`,
			};
		}
		const text = await readCapped(response, maxBytes);
		if (text === null) {
			return {
				status: 'error',
				code: response.status,
				message: `The answer from ${checked.url.hostname} is larger than ${maxBytes / 1024} KB`,
			};
		}
		try {
			return {
				status: 'ok',
				code: response.status,
				json: JSON.parse(text) as unknown,
			};
		} catch {
			return {
				status: 'error',
				code: response.status,
				message: `${checked.url.hostname} sent invalid JSON`,
			};
		}
	} catch {
		return {
			status: 'error',
			code: null,
			message: controller.signal.aborted
				? `${checked.url.hostname} took too long to answer`
				: `Couldn’t reach ${checked.url.hostname}`,
		};
	} finally {
		clearTimeout(timer);
	}
}
