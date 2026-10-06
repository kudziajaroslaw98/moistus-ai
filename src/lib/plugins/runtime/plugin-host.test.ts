/**
 * @jest-environment node
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	memoizePromiseFactory,
	newQuickJSWASMModuleFromVariant,
} from 'quickjs-emscripten-core';
import metricManifest from '../../../../public/plugins/shiko.metric/0.1.0/manifest.json';
import { pluginManifestSchema } from '../manifest-schema';
import {
	PluginHost,
	PluginHostError,
	type PluginWorkerLike,
} from './plugin-host';
import { nodeTestVariant } from './test-quickjs-variant';
import {
	createPluginWorkerHandler,
	type PluginWorkerRequest,
	type PluginWorkerResponse,
} from './worker-protocol';

const metricCode = readFileSync(
	join(process.cwd(), 'public/plugins/shiko.metric/0.1.0/plugin.js'),
	'utf8'
);
const metric = pluginManifestSchema.parse(metricManifest).nodeKinds[0];
const getModule = memoizePromiseFactory(() =>
	newQuickJSWASMModuleFromVariant(nodeTestVariant())
);

/** Runs the real worker handler in-process, standing in for a Web Worker. */
function inProcessWorker(): PluginWorkerLike & { terminate: jest.Mock } {
	const handle = createPluginWorkerHandler(getModule);
	const worker = {
		onmessage: null as PluginWorkerLike['onmessage'],
		onerror: null as PluginWorkerLike['onerror'],
		terminate: jest.fn(),
		postMessage(message: PluginWorkerRequest) {
			void handle(message).then((response) =>
				worker.onmessage?.({
					data: response,
				} as MessageEvent<PluginWorkerResponse>)
			);
		},
	};
	return worker;
}

const data = {
	label: 'Weekly active users',
	value: 1240,
	target: 2000,
	unit: 'users',
	step: 100,
};

describe('PluginHost', () => {
	it('loads a plugin, returns a validated view and summary, and runs actions', async () => {
		const host = new PluginHost(inProcessWorker);

		await expect(host.load('shiko.metric', metricCode)).resolves.toEqual([
			'metric',
		]);
		const rendered = await host.render('shiko.metric', metric, data, {
			canEdit: true,
			today: '2026-10-06',
		});
		expect(rendered.summary).toBe('Weekly active users: 1,240 / 2,000 users');
		expect(rendered.tree.type).toBe('stack');
		await expect(
			host.action('shiko.metric', metric, 'decrement', data, undefined, {
				canEdit: true,
				today: '2026-10-06',
			})
		).resolves.toEqual({ ...data, value: 1140 });
	});

	it('rejects views with unknown primitives and data outside the kind’s fields', async () => {
		const host = new PluginHost(inProcessWorker);
		await host.load(
			'dev.bad',
			`definePlugin({ kinds: { metric: {
				render: () => ({ type: 'image', src: 'https://evil.test/' }),
				actions: { grab: (data) => Object.assign({}, data, { stolen: 'x' }) },
			} } });`
		);

		await expect(
			host.render('dev.bad', metric, data, { canEdit: true, today: '2026-10-06' })
		).rejects.toMatchObject({
			code: 'invalid-output',
		});
		await expect(
			host.action('dev.bad', metric, 'grab', data, undefined, { canEdit: true, today: '2026-10-06' })
		).rejects.toMatchObject({ code: 'invalid-output' });
	});

	it('falls back to the label when the plugin gives no summary', async () => {
		const host = new PluginHost(inProcessWorker);
		await host.load(
			'dev.plain',
			`definePlugin({ kinds: { metric: { render: () => ui.text('hi') } } });`
		);

		const rendered = await host.render('dev.plain', metric, data, {
			canEdit: false,
			today: '2026-10-06',
		});
		expect(rendered.summary).toBe('Weekly active users');
	});

	it('restarts a worker that stops answering and reloads plugins on the next call', async () => {
		const silent: PluginWorkerLike & { terminate: jest.Mock } = {
			onmessage: null,
			onerror: null,
			terminate: jest.fn(),
			postMessage: () => undefined,
		};
		const workers = [silent, inProcessWorker()];
		const createWorker = jest.fn(() => workers.shift()!);
		const host = new PluginHost(createWorker, 50);

		await expect(host.load('shiko.metric', metricCode)).rejects.toBeInstanceOf(
			PluginHostError
		);
		expect(silent.terminate).toHaveBeenCalled();

		const rendered = await host.render('shiko.metric', metric, data, {
			canEdit: true,
			today: '2026-10-06',
		});
		expect(rendered.summary).toContain('1,240');
		expect(createWorker).toHaveBeenCalledTimes(2);
	}, 10_000);

	it('says when a plugin was never loaded', async () => {
		const host = new PluginHost(inProcessWorker);

		await expect(
			host.render('shiko.metric', metric, data, { canEdit: true, today: '2026-10-06' })
		).rejects.toMatchObject({ code: 'not-loaded' });
	});
});
