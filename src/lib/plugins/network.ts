import { PLUGIN_REQUEST_LIMITS } from './limits';

/**
 * Requests a plugin's refresh asks for. The plugin never gets `fetch`: it names URLs with
 * `ctx.request(url)`, and Shiko fetches them with fixed, locked-down settings, from the
 * browser of the editor who refreshed. Only sites the owner approved (the plugin's
 * `network:<host>` powers) are reachable, and only JSON comes back.
 *
 * The fetching runs in a network worker (`network-client.ts`), not the page: the worker's
 * script comes from `/api/plugins/network-worker` with its own Content Security Policy
 * naming only that plugin's reviewed sites, so the page's policy never lists plugin sites.
 */

/** What `ctx.request(url)` returns to the plugin on its second pass. */
export type PluginResponse =
	| { status: 'ok'; code: number; json: unknown }
	| { status: 'error'; code: number | null; message: string };

export type PluginUrlCheck =
	{ ok: true; url: URL } | { ok: false; message: string };

export interface FetchPluginJsonOptions {
	allowedHosts: readonly string[];
	blockedHosts?: readonly string[];
	fetchImpl?: typeof fetch;
	timeoutMs?: number;
	maxBytes?: number;
}

type RequestLimits = Pick<
	typeof PLUGIN_REQUEST_LIMITS,
	'timeoutMs' | 'responseBytes' | 'urlLength'
>;

/**
 * Everything that checks and makes plugin requests. The network worker runs this exact
 * function: its route sends `String(pluginNetworkRuntime)` as the worker's code. So it must
 * stay self-contained: no imports, module variables or other functions from outside its
 * body, only built-ins that workers have (`fetch`, `URL`, `TextDecoder`, timers).
 * (`istanbul ignore`: coverage counters would be outside references too.)
 */
/* istanbul ignore next */
function pluginNetworkRuntime(limits: RequestLimits) {
	/**
	 * Whether a plugin may request `raw`: https only, exactly one of the approved hosts, the
	 * default port, and no user name or password in the address. `blockedHosts` are never
	 * reachable (Shiko itself and its database), even if a manifest names them.
	 */
	function checkPluginRequestUrl(
		raw: string,
		allowedHosts: readonly string[],
		blockedHosts: readonly string[] = []
	): PluginUrlCheck {
		if (raw.length > limits.urlLength) {
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

	/** Fetches one approved URL as JSON. Never throws: failures become `status: 'error'`. */
	async function fetchPluginJson(
		raw: string,
		{
			allowedHosts,
			blockedHosts = [],
			fetchImpl = fetch,
			timeoutMs = limits.timeoutMs,
			maxBytes = limits.responseBytes,
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

	return { checkPluginRequestUrl, fetchPluginJson };
}

const runtime = pluginNetworkRuntime(PLUGIN_REQUEST_LIMITS);

export const checkPluginRequestUrl = runtime.checkPluginRequestUrl;

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

/** Fetches one approved URL as JSON. Never throws: failures become `status: 'error'`. */
export function fetchPluginJson(
	raw: string,
	{ blockedHosts = blockedPluginHosts(), ...options }: FetchPluginJsonOptions
): Promise<PluginResponse> {
	return runtime.fetchPluginJson(raw, { ...options, blockedHosts });
}

/** Message the page sends the network worker: fetch `url`, answer with the same `id`. */
export interface PluginNetworkRequest {
	id: number;
	url: string;
}

/** The network worker's answer to one `PluginNetworkRequest`. */
export interface PluginNetworkAnswer {
	id: number;
	response: PluginResponse;
}

/**
 * Answers `PluginNetworkRequest`s inside the network worker. Sent as source text like
 * `pluginNetworkRuntime`, so it must stay self-contained too.
 */
/* istanbul ignore next */
function networkWorkerMain(
	scope: {
		onmessage: ((event: MessageEvent) => void) | null;
		postMessage: (message: PluginNetworkAnswer) => void;
	},
	run: ReturnType<typeof pluginNetworkRuntime>,
	config: { hosts: string[]; blockedHosts: string[] }
) {
	scope.onmessage = (event: MessageEvent) => {
		const request = event.data as Partial<PluginNetworkRequest> | null;
		if (
			!request ||
			typeof request.id !== 'number' ||
			typeof request.url !== 'string'
		) {
			return;
		}
		const id = request.id;
		void run
			.fetchPluginJson(request.url, {
				allowedHosts: config.hosts,
				blockedHosts: config.blockedHosts,
			})
			.then((response) => scope.postMessage({ id, response }));
	};
}

/**
 * The network worker's code for one plugin: the request runtime above with `hosts` (the
 * plugin's approved sites) baked in. The route serves it with a CSP whose `connect-src`
 * lists the same hosts, so the browser enforces them as well.
 */
export function pluginNetworkWorkerSource(config: {
	hosts: readonly string[];
	blockedHosts: readonly string[];
}): string {
	const limits: RequestLimits = {
		timeoutMs: PLUGIN_REQUEST_LIMITS.timeoutMs,
		responseBytes: PLUGIN_REQUEST_LIMITS.responseBytes,
		urlLength: PLUGIN_REQUEST_LIMITS.urlLength,
	};
	return [
		"'use strict';",
		`(${String(networkWorkerMain)})(self, (${String(pluginNetworkRuntime)})(${JSON.stringify(limits)}), ${JSON.stringify(
			{ hosts: [...config.hosts], blockedHosts: [...config.blockedHosts] }
		)});`,
	].join('\n');
}
