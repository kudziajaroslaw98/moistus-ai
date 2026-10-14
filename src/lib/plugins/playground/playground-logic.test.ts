/**
 * @jest-environment node
 */
import {
	memoizePromiseFactory,
	newQuickJSWASMModuleFromVariant,
} from 'quickjs-emscripten-core';
import { pluginManifestSchema } from '../manifest-schema';
import { NETWORK_EXAMPLE_MANIFEST } from '../network-example';
import { validatePluginData } from '../plugin-fields';
import { PluginHost, type PluginWorkerLike } from '../runtime/plugin-host';
import { nodeTestVariant } from '../runtime/test-quickjs-variant';
import {
	createPluginWorkerHandler,
	type PluginWorkerRequest,
	type PluginWorkerResponse,
} from '../runtime/worker-protocol';
import { STARTER_MANIFEST_JSON, STARTER_PLUGIN_JS } from '../starter-plugin';
import { loadDraftProgram, parseDraftManifest } from './draft-program';
import { mockFetchAll } from './mock-network';
import {
	defaultMockAnswer,
	fitSample,
	sampleBranch,
	seedSampleData,
} from './sample-data';

const getModule = memoizePromiseFactory(() =>
	newQuickJSWASMModuleFromVariant(nodeTestVariant())
);

function inProcessWorker(): PluginWorkerLike {
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

const withId = (json: string) =>
	JSON.stringify({ ...JSON.parse(json), id: 'dev.counter-9b2c41a7' });

describe('parseDraftManifest', () => {
	it('accepts the starter manifest', () => {
		const result = parseDraftManifest(withId(STARTER_MANIFEST_JSON));
		expect(result.ok).toBe(true);
	});

	it('says when the text is not JSON', () => {
		const result = parseDraftManifest('{ "id": ');
		expect(result).toMatchObject({ ok: false });
		expect(!result.ok && result.message).toMatch(/isn’t valid JSON/);
	});

	it('reports a schema problem in one line', () => {
		const result = parseDraftManifest(
			JSON.stringify({
				...JSON.parse(withId(STARTER_MANIFEST_JSON)),
				version: 'one',
			})
		);
		expect(result.ok).toBe(false);
		expect(!result.ok && result.message).toMatch(/version/i);
	});
});

describe('loadDraftProgram', () => {
	it('loads a plugin whose code defines the manifest kinds', async () => {
		const host = new PluginHost(inProcessWorker);
		const program = await loadDraftProgram(
			host,
			withId(STARTER_MANIFEST_JSON),
			STARTER_PLUGIN_JS
		);
		expect(program.ok).toBe(true);
		host.dispose();
	});

	it('explains code that does not load', async () => {
		const host = new PluginHost(inProcessWorker);
		const program = await loadDraftProgram(
			host,
			withId(STARTER_MANIFEST_JSON),
			'definePlugin({ kinds: {'
		);
		expect(program.ok).toBe(false);
		host.dispose();
	});

	it('names a kind the code leaves out', async () => {
		const host = new PluginHost(inProcessWorker);
		const program = await loadDraftProgram(
			host,
			withId(STARTER_MANIFEST_JSON),
			"definePlugin({ kinds: { other: { render: () => ui.text('x') } } });"
		);
		expect(program).toMatchObject({ ok: false });
		expect(!program.ok && program.message).toMatch(/counter/);
		host.dispose();
	});

	it('does not touch the sandbox when the manifest is invalid', async () => {
		const createWorker = jest.fn(inProcessWorker);
		const host = new PluginHost(createWorker);
		const program = await loadDraftProgram(host, '{ nope', STARTER_PLUGIN_JS);
		expect(program.ok).toBe(false);
		expect(createWorker).not.toHaveBeenCalled();
	});
});

describe('seedSampleData', () => {
	const kind = pluginManifestSchema.parse(
		JSON.parse(withId(STARTER_MANIFEST_JSON))
	).nodeKinds[0];

	it('uses the first example, the way the node editor would', () => {
		expect(seedSampleData(kind)).toMatchObject({
			label: 'Coffees today',
			count: 2,
		});
	});

	it('falls back to defaults when the kind has no example', () => {
		const data = seedSampleData({ ...kind, examples: [] });
		expect(data).toEqual({ count: 0 });
	});

	it('produces data the plugin accepts', () => {
		expect(validatePluginData(kind, seedSampleData(kind)).ok).toBe(true);
	});
});

describe('sampleBranch', () => {
	it('gives nodes in the shape ctx.branch has', () => {
		const branch = sampleBranch('2026-10-10');
		expect(branch.length).toBeGreaterThan(0);
		for (const node of branch) {
			expect(node).toEqual(
				expect.objectContaining({
					id: expect.any(String),
					depth: expect.any(Number),
					type: expect.any(String),
					text: expect.any(String),
					assignees: expect.any(Array),
					tags: expect.any(Array),
				})
			);
		}
	});
});

describe('mockFetchAll', () => {
	const hosts = ['api.github.com'];

	it('answers allowed addresses with the typed JSON', async () => {
		const fetchAll = mockFetchAll('{"title":"Hello"}', hosts);
		const answers = await fetchAll([
			'https://api.github.com/repos/a/b/issues/1',
		]);
		expect(answers['https://api.github.com/repos/a/b/issues/1']).toEqual({
			status: 'ok',
			code: 200,
			json: { title: 'Hello' },
		});
	});

	it('refuses an address outside the plugin’s declared sites, like a real request', async () => {
		const fetchAll = mockFetchAll('{}', hosts);
		const answers = await fetchAll(['https://example.com/x']);
		expect(answers['https://example.com/x']).toMatchObject({ status: 'error' });
	});

	it('answers with an error when the typed JSON is broken', async () => {
		const fetchAll = mockFetchAll('{ nope', hosts);
		const answers = await fetchAll(['https://api.github.com/x']);
		expect(answers['https://api.github.com/x']).toMatchObject({
			status: 'error',
			message: expect.stringMatching(/valid JSON/),
		});
	});

	it('refuses local and numeric addresses', async () => {
		const fetchAll = mockFetchAll('{}', hosts);
		const answers = await fetchAll([
			'http://localhost:3000/x',
			'https://127.0.0.1/x',
		]);
		for (const answer of Object.values(answers)) {
			expect(answer).toMatchObject({ status: 'error' });
		}
	});
});

describe('the network example', () => {
	it('is valid once it has an id (the playground’s GitHub template)', () => {
		expect(
			parseDraftManifest(JSON.stringify(NETWORK_EXAMPLE_MANIFEST)).ok
		).toBe(true);
	});
});

describe('defaultMockAnswer', () => {
	const issue = pluginManifestSchema.parse(NETWORK_EXAMPLE_MANIFEST)
		.nodeKinds[0];

	it('starts the mock answer with the fields refresh fills in', () => {
		const answer = JSON.parse(defaultMockAnswer(issue));
		expect(Object.keys(answer).sort()).toEqual(['state', 'title']);
		expect(typeof answer.title).toBe('string');
		expect(issue.fields.state).toMatchObject({
			options: expect.arrayContaining([answer.state]),
		});
	});

	it('is an empty object for a kind that never refreshes', () => {
		const counter = pluginManifestSchema.parse(
			JSON.parse(withId(STARTER_MANIFEST_JSON))
		).nodeKinds[0];
		expect(JSON.parse(defaultMockAnswer(counter))).toEqual({});
	});
});

describe('fitSample', () => {
	it('keeps a small sample as it is', () => {
		const sample = { kinds: { counter: { count: 1 } }, mock: '{}' };
		expect(fitSample(sample, 'counter', 16 * 1024)).toEqual(sample);
	});

	it('drops other kinds first, then the mock answer, so the save stays under the limit', () => {
		const big = 'x'.repeat(600);
		const sample = {
			kinds: { counter: { label: 'a' }, other: { label: big } },
			mock: big,
		};
		const fitted = fitSample(sample, 'counter', 300);
		expect(fitted).toEqual({ kinds: { counter: { label: 'a' } } });
		expect(JSON.stringify(fitted).length).toBeLessThanOrEqual(300);
	});

	it('falls back to nothing when even the current kind is too big', () => {
		const sample = { kinds: { counter: { label: 'x'.repeat(600) } } };
		expect(fitSample(sample, 'counter', 300)).toEqual({});
	});
});
