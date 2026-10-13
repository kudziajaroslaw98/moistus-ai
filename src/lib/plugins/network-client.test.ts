import type { PluginNetworkRequest, PluginResponse } from './network';
import {
	pluginNetworkWorkerUrl,
	requestPluginJson,
	type PluginNetworkTarget,
} from './network-client';

/** A worker that answers each request with `answer(url)`, or never when it returns null. */
class FakeWorker {
	static last: FakeWorker | null = null;

	onmessage: ((event: MessageEvent) => void) | null = null;

	onerror: ((event: { preventDefault?: () => void }) => void) | null = null;

	terminated = false;

	received: PluginNetworkRequest[] = [];

	constructor(
		readonly url: string,
		private readonly answer: (url: string) => PluginResponse | null
	) {
		FakeWorker.last = this;
	}

	postMessage(request: PluginNetworkRequest) {
		this.received.push(request);
		const response = this.answer(request.url);
		if (response) {
			queueMicrotask(() =>
				this.onmessage?.({ data: { id: request.id, response } } as MessageEvent)
			);
		}
	}

	terminate() {
		this.terminated = true;
	}
}

const github: PluginNetworkTarget = {
	kind: 'reviewed',
	pluginId: 'shiko.github-issue',
	version: '0.1.0',
};
const ok = (title: string): PluginResponse => ({
	status: 'ok',
	code: 200,
	json: { title },
});

describe('pluginNetworkWorkerUrl', () => {
	it('names a reviewed version, or a developer plugin’s sites', () => {
		expect(pluginNetworkWorkerUrl(github)).toBe(
			'/api/plugins/network-worker?plugin=shiko.github-issue&version=0.1.0'
		);
		expect(
			pluginNetworkWorkerUrl({
				kind: 'developer',
				hosts: ['api.example.dev', 'data.example.org'],
			})
		).toBe(
			'/api/plugins/network-worker?hosts=api.example.dev%2Cdata.example.org'
		);
	});
});

describe('requestPluginJson', () => {
	it('sends each address once to the plugin’s worker and closes it after', async () => {
		const answers = await requestPluginJson(
			[
				'https://api.github.com/a',
				'https://api.github.com/b',
				'https://api.github.com/a',
			],
			github,
			{
				createWorker: (url) =>
					new FakeWorker(url, (requested) => ok(requested.slice(-1))) as never,
			}
		);

		expect(answers).toEqual({
			'https://api.github.com/a': ok('a'),
			'https://api.github.com/b': ok('b'),
		});
		expect(FakeWorker.last?.url).toBe(pluginNetworkWorkerUrl(github));
		expect(FakeWorker.last?.received).toHaveLength(2);
		expect(FakeWorker.last?.terminated).toBe(true);
	});

	it('reports every request as not sent when the worker can’t start', async () => {
		let worker: FakeWorker | null = null;
		const pending = requestPluginJson(['https://api.github.com/a'], github, {
			createWorker: (url) => {
				worker = new FakeWorker(url, () => null);
				return worker as never;
			},
		});
		// The route refused the script (signed out, plugin turned off).
		(worker as FakeWorker | null)?.onerror?.({});

		await expect(pending).resolves.toEqual({
			'https://api.github.com/a': {
				status: 'error',
				code: null,
				message: 'Shiko couldn’t send the request to api.github.com',
			},
		});
		expect((worker as FakeWorker | null)?.terminated).toBe(true);
	});

	it('gives up on answers that never come', async () => {
		const answers = await requestPluginJson(
			['https://api.github.com/a', 'https://api.github.com/slow'],
			github,
			{
				timeoutMs: 20,
				createWorker: (url) =>
					new FakeWorker(url, (requested) =>
						requested.endsWith('slow') ? null : ok('a')
					) as never,
			}
		);

		expect(answers['https://api.github.com/a']).toEqual(ok('a'));
		expect(answers['https://api.github.com/slow']).toMatchObject({
			status: 'error',
		});
	});

	it('ignores answers that don’t match a request', async () => {
		const answers = await requestPluginJson(
			['https://api.github.com/a'],
			github,
			{
				timeoutMs: 20,
				createWorker: (url) => {
					const worker = new FakeWorker(url, () => null);
					queueMicrotask(() => {
						worker.onmessage?.({
							data: { id: 7, response: ok('x') },
						} as MessageEvent);
						worker.onmessage?.({ data: 'hello' } as MessageEvent);
					});
					return worker as never;
				},
			}
		);

		expect(answers['https://api.github.com/a']).toMatchObject({
			status: 'error',
		});
	});

	it('needs no worker when there is nothing to fetch', async () => {
		const createWorker = jest.fn();
		await expect(
			requestPluginJson([], github, { createWorker })
		).resolves.toEqual({});
		expect(createWorker).not.toHaveBeenCalled();
	});
});
