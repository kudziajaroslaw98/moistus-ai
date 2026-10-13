import { PLUGIN_REQUEST_LIMITS } from './limits';
import type {
	PluginNetworkAnswer,
	PluginNetworkRequest,
	PluginResponse,
} from './network';

/**
 * Runs a refresh's requests in a network worker. The worker's script comes from
 * `/api/plugins/network-worker`, which names the sites it may reach in the script's own
 * Content Security Policy: a reviewed version's sites (Shiko's plugins and published
 * library plugins), or a developer plugin's sites for someone with Developer mode on.
 * The request still goes straight from this browser to the site; the page's own policy
 * never has to list plugin sites.
 */

export type PluginNetworkTarget =
	| { kind: 'reviewed'; pluginId: string; version: string }
	| { kind: 'developer'; hosts: readonly string[] };

export function pluginNetworkWorkerUrl(target: PluginNetworkTarget): string {
	const params =
		target.kind === 'reviewed'
			? new URLSearchParams({
					plugin: target.pluginId,
					version: target.version,
				})
			: new URLSearchParams({ hosts: target.hosts.join(',') });
	return `/api/plugins/network-worker?${params.toString()}`;
}

/** Allows for starting the worker on top of the per-request timeout. */
const WORKER_START_MS = 5_000;

function hostOf(url: string): string {
	try {
		return new URL(url).hostname;
	} catch {
		return 'the site';
	}
}

function isAnswer(value: unknown, count: number): value is PluginNetworkAnswer {
	if (!value || typeof value !== 'object') return false;
	const { id, response } = value as Partial<PluginNetworkAnswer>;
	return (
		typeof id === 'number' &&
		Number.isInteger(id) &&
		id >= 0 &&
		id < count &&
		!!response &&
		(response.status === 'ok' || response.status === 'error')
	);
}

export interface RequestPluginJsonOptions {
	createWorker?: (url: string) => Worker;
	timeoutMs?: number;
}

/**
 * Fetches each URL through the plugin's network worker. Never throws: a worker that can't
 * start (signed out, plugin turned off) or a request that never answers becomes an error.
 */
export function requestPluginJson(
	urls: readonly string[],
	target: PluginNetworkTarget,
	{
		createWorker = (url) => new Worker(url, { name: 'shiko-plugin-network' }),
		timeoutMs = PLUGIN_REQUEST_LIMITS.timeoutMs + WORKER_START_MS,
	}: RequestPluginJsonOptions = {}
): Promise<Record<string, PluginResponse>> {
	const unique = [...new Set(urls)];
	if (unique.length === 0) return Promise.resolve({});
	const notSent = (url: string): PluginResponse => ({
		status: 'error',
		code: null,
		message: `Shiko couldn’t send the request to ${hostOf(url)}`,
	});

	let worker: Worker;
	try {
		worker = createWorker(pluginNetworkWorkerUrl(target));
	} catch {
		return Promise.resolve(
			Object.fromEntries(unique.map((url) => [url, notSent(url)]))
		);
	}

	return new Promise((resolve) => {
		const answers = new Map<string, PluginResponse>();
		let done = false;
		const finish = () => {
			if (done) return;
			done = true;
			clearTimeout(timer);
			worker.terminate();
			resolve(
				Object.fromEntries(
					unique.map((url) => [url, answers.get(url) ?? notSent(url)])
				)
			);
		};
		const timer = setTimeout(finish, timeoutMs);
		worker.onmessage = (event: MessageEvent) => {
			if (!isAnswer(event.data, unique.length)) return;
			answers.set(unique[event.data.id], event.data.response);
			if (answers.size === unique.length) finish();
		};
		// The script didn't load (the route refused it) or the worker crashed.
		worker.onerror = (event) => {
			event.preventDefault?.();
			finish();
		};
		unique.forEach((url, id) => {
			const request: PluginNetworkRequest = { id, url };
			worker.postMessage(request);
		});
	});
}
