/**
 * @jest-environment node
 */
import {
	checkPluginRequestUrl,
	fetchPluginJson,
	pluginNetworkWorkerSource,
	type PluginNetworkAnswer,
} from './network';

const allowed = ['api.github.com'];

function jsonResponse(body: string, init: ResponseInit = {}) {
	return new Response(body, {
		status: 200,
		headers: { 'content-type': 'application/json; charset=utf-8' },
		...init,
	});
}

describe('checkPluginRequestUrl', () => {
	it('allows https addresses on an approved host', () => {
		const checked = checkPluginRequestUrl(
			'https://api.github.com/repos/shiko/app/issues/482',
			allowed
		);
		expect(checked.ok).toBe(true);
	});

	it.each([
		['http://api.github.com/x', 'Only https addresses can be requested'],
		[
			'https://user:secret@api.github.com/x',
			'Addresses can’t include a user name or password',
		],
		['https://api.github.com:8443/x', 'Addresses can’t name a port'],
		['https://evil.test/?d=secret', 'This plugin can’t reach evil.test'],
		[
			'https://api.github.com.evil.test/x',
			'This plugin can’t reach api.github.com.evil.test',
		],
		['not a url', 'Not a valid address'],
	])('refuses %s', (url, message) => {
		expect(checkPluginRequestUrl(url, allowed)).toEqual({ ok: false, message });
	});

	it('never reaches Shiko or its database, even when a manifest names them', () => {
		expect(
			checkPluginRequestUrl(
				'https://shiko.app/api/maps',
				['shiko.app'],
				['shiko.app']
			)
		).toEqual({ ok: false, message: 'This plugin can’t reach shiko.app' });
	});
});

describe('fetchPluginJson', () => {
	it('fetches without cookies, referrer or redirects, and returns the JSON', async () => {
		const fetchImpl = jest.fn(async () => jsonResponse('{"state":"open"}'));

		const response = await fetchPluginJson(
			'https://api.github.com/repos/a/b/issues/1',
			{
				allowedHosts: allowed,
				blockedHosts: [],
				fetchImpl,
			}
		);

		expect(response).toEqual({
			status: 'ok',
			code: 200,
			json: { state: 'open' },
		});
		expect(fetchImpl).toHaveBeenCalledWith(
			'https://api.github.com/repos/a/b/issues/1',
			expect.objectContaining({
				method: 'GET',
				credentials: 'omit',
				referrerPolicy: 'no-referrer',
				mode: 'cors',
				redirect: 'manual',
			})
		);
		const init = (fetchImpl.mock.calls[0] as unknown[])[1] as RequestInit;
		expect(init.body).toBeUndefined();
	});

	it('does not contact hosts the plugin may not reach', async () => {
		const fetchImpl = jest.fn();
		const response = await fetchPluginJson('https://evil.test/', {
			allowedHosts: allowed,
			blockedHosts: [],
			fetchImpl,
		});
		expect(response.status).toBe('error');
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it('turns failures into errors the plugin can show', async () => {
		const run = (response: Response | Error, maxBytes?: number) =>
			fetchPluginJson('https://api.github.com/x', {
				allowedHosts: allowed,
				blockedHosts: [],
				maxBytes,
				fetchImpl: jest.fn(async () => {
					if (response instanceof Error) throw response;
					return response;
				}),
			});

		await expect(run(jsonResponse('{}', { status: 404 }))).resolves.toEqual({
			status: 'error',
			code: 404,
			message: 'api.github.com answered 404',
		});
		await expect(
			run(new Response('<html>', { headers: { 'content-type': 'text/html' } }))
		).resolves.toMatchObject({ message: 'api.github.com didn’t send JSON' });
		await expect(run(jsonResponse('{"a":'))).resolves.toMatchObject({
			message: 'api.github.com sent invalid JSON',
		});
		await expect(
			run(jsonResponse(JSON.stringify({ text: 'x'.repeat(2000) })), 1024)
		).resolves.toMatchObject({
			message: 'The answer from api.github.com is larger than 1 KB',
		});
		await expect(
			run(new Response(null, { status: 301 }))
		).resolves.toMatchObject({
			message:
				'api.github.com sent the request somewhere else, which plugins can’t follow',
		});
		await expect(run(new TypeError('Failed to fetch'))).resolves.toEqual({
			status: 'error',
			code: null,
			message: 'Couldn’t reach api.github.com',
		});
	});

	it('gives up after the timeout', async () => {
		const response = await fetchPluginJson('https://api.github.com/slow', {
			allowedHosts: allowed,
			blockedHosts: [],
			timeoutMs: 10,
			fetchImpl: (_url, init) =>
				new Promise((_resolve, reject) => {
					init?.signal?.addEventListener('abort', () =>
						reject(new Error('aborted'))
					);
				}),
		});
		expect(response).toEqual({
			status: 'error',
			code: null,
			message: 'api.github.com took too long to answer',
		});
	});
});

describe('pluginNetworkWorkerSource', () => {
	/** Runs the worker's source text in a fake worker scope, as the browser would. */
	function startWorker(
		hosts: string[],
		fetchImpl: jest.Mock,
		blockedHosts: string[] = ['shiko.app']
	) {
		const answers: PluginNetworkAnswer[] = [];
		const scope = {
			onmessage: null as ((event: MessageEvent) => void) | null,
			postMessage: (answer: PluginNetworkAnswer) => answers.push(answer),
		};
		// Runs the worker's source text the way the browser would.
		new Function(
			'self',
			'fetch',
			pluginNetworkWorkerSource({ hosts, blockedHosts })
		)(scope, fetchImpl);
		const ask = async (message: unknown) => {
			scope.onmessage?.({ data: message } as MessageEvent);
			await new Promise((resolve) => setTimeout(resolve, 0));
			await new Promise((resolve) => setTimeout(resolve, 0));
		};
		return { answers, ask };
	}

	it('is self-contained and answers approved requests with locked-down settings', async () => {
		const fetchImpl = jest.fn(async () =>
			jsonResponse('{"title":"Fix login"}')
		);
		const worker = startWorker(['api.github.com'], fetchImpl);

		await worker.ask({
			id: 3,
			url: 'https://api.github.com/repos/a/b/issues/1',
		});

		expect(worker.answers).toEqual([
			{
				id: 3,
				response: { status: 'ok', code: 200, json: { title: 'Fix login' } },
			},
		]);
		expect(fetchImpl).toHaveBeenCalledWith(
			'https://api.github.com/repos/a/b/issues/1',
			expect.objectContaining({
				method: 'GET',
				credentials: 'omit',
				referrerPolicy: 'no-referrer',
				redirect: 'manual',
			})
		);
	});

	it('only reaches the sites baked into it, whatever the page asks for', async () => {
		const fetchImpl = jest.fn();
		const worker = startWorker(['api.github.com'], fetchImpl);

		await worker.ask({ id: 0, url: 'https://evil.example/collect?d=secret' });
		await worker.ask({ id: 1, url: 'https://shiko.app/api/maps' });

		expect(fetchImpl).not.toHaveBeenCalled();
		expect(worker.answers.map((answer) => answer.response)).toEqual([
			{
				status: 'error',
				code: null,
				message: 'This plugin can’t reach evil.example',
			},
			{
				status: 'error',
				code: null,
				message: 'This plugin can’t reach shiko.app',
			},
		]);
	});

	it('ignores messages that aren’t requests', async () => {
		const fetchImpl = jest.fn();
		const worker = startWorker(['api.github.com'], fetchImpl);

		await worker.ask(null);
		await worker.ask({ url: 'https://api.github.com/x' });
		await worker.ask({ id: '1', url: 'https://api.github.com/x' });

		expect(fetchImpl).not.toHaveBeenCalled();
		expect(worker.answers).toEqual([]);
	});
});
