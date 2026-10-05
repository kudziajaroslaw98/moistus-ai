import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { TextEncoder as NodeTextEncoder } from 'node:util';
import { join } from 'node:path';
import { create } from 'zustand';
import type { AppState } from '../app-state';
import { createPluginsSlice } from './plugins-slice';

const mockHost = { load: jest.fn(), unload: jest.fn() };
jest.mock('@/lib/plugins/runtime/load-plugin-host', () => ({
	loadPluginHost: async () => mockHost,
}));
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));

const manifestJson = readFileSync(
	join(process.cwd(), 'public/plugins/shiko.metric/0.1.0/manifest.json'),
	'utf8'
);
const metricCode = readFileSync(
	join(process.cwd(), 'public/plugins/shiko.metric/0.1.0/plugin.js'),
	'utf8'
);
const manifestJson020 = readFileSync(
	join(process.cwd(), 'public/plugins/shiko.metric/0.2.0/manifest.json'),
	'utf8'
);
const metricCode020 = readFileSync(
	join(process.cwd(), 'public/plugins/shiko.metric/0.2.0/plugin.js'),
	'utf8'
);
const BOTH_VERSIONS = {
	'/plugins/shiko.metric/0.1.0/manifest.json': manifestJson,
	'/plugins/shiko.metric/0.1.0/plugin.js': metricCode,
	'/plugins/shiko.metric/0.2.0/manifest.json': manifestJson020,
	'/plugins/shiko.metric/0.2.0/plugin.js': metricCode020,
};

// jsdom has no Web Crypto digest or TextEncoder; the loader checks catalog code
// fingerprints with them.
Object.defineProperty(globalThis.crypto, 'subtle', {
	value: webcrypto.subtle,
	configurable: true,
});
Object.assign(globalThis, { TextEncoder: NodeTextEncoder });
const OWNER = { id: 'owner-1', is_anonymous: false };

function createStore(
	overrides: Record<string, unknown> = {},
	pinnedVersion = '0.1.0'
) {
	const queryResult = {
		data: [{ plugin_id: 'shiko.metric', version: pinnedVersion }],
		error: null,
	};
	const supabase = {
		from: jest.fn(() => ({
			select: () => ({ eq: () => Promise.resolve(queryResult) }),
		})),
	};
	return create<AppState>()(
		(...args) =>
			({
				mapId: 'map-1',
				mindMap: { id: 'map-1', user_id: OWNER.id },
				currentUser: OWNER,
				userProfile: { preferences: { developerMode: true } },
				supabase,
				...overrides,
				...createPluginsSlice(...args),
			}) as unknown as AppState
	);
}

/** jsdom has no Response, so the fake returns just what the slice reads. */
function mockFetch(files: Record<string, string>) {
	global.fetch = jest.fn(async (input: RequestInfo | URL) => {
		const url = String(input);
		const match = Object.keys(files).find((key) => url.endsWith(key));
		const body = match ? files[match] : 'not found';
		return {
			ok: Boolean(match),
			status: match ? 200 : 404,
			json: async () => JSON.parse(body),
			text: async () => body,
		};
	}) as unknown as typeof fetch;
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/** Waits (a few event-loop turns at most) until a condition holds. */
async function waitUntil(check: () => boolean) {
	for (let turn = 0; turn < 50 && !check(); turn += 1) await flush();
}

const settled = (store: ReturnType<typeof createStore>) => () =>
	Object.values(store.getState().loadedPlugins).every(
		(plugin) => plugin.status !== 'loading'
	);

beforeEach(() => {
	jest.clearAllMocks();
	mockHost.load.mockResolvedValue(['metric']);
	window.localStorage.clear();
	mockFetch({
		'/plugins/shiko.metric/0.1.0/manifest.json': manifestJson,
		'/plugins/shiko.metric/0.1.0/plugin.js': metricCode,
	});
});

describe('plugins slice', () => {
	it('loads the plugins the owner turned on and exposes their kinds', async () => {
		const store = createStore();

		await store.getState().fetchMapPlugins('map-1');
		await waitUntil(settled(store));

		expect(store.getState().mapPlugins).toEqual([
			{
				pluginId: 'shiko.metric',
				version: '0.1.0',
				previousVersion: null,
				updatedAt: null,
			},
		]);
		expect(mockHost.load).toHaveBeenCalledWith('shiko.metric', metricCode);
		expect(store.getState().loadedPlugins['shiko.metric']).toMatchObject({
			status: 'ready',
		});
		expect(
			store.getState().getActivePluginKind('shiko.metric', 'metric')?.kind.label
		).toBe('Metric');
	});

	it('drops a load that finishes after the map changed', async () => {
		const store = createStore();
		let finishLoad: (kinds: string[]) => void = () => undefined;
		mockHost.load.mockReturnValue(
			new Promise((resolve) => (finishLoad = resolve))
		);

		await store.getState().fetchMapPlugins('map-1');
		await waitUntil(() => mockHost.load.mock.calls.length > 0);
		store.setState({ mapId: 'map-2' } as Partial<AppState>);
		finishLoad(['metric']);
		await waitUntil(() => mockHost.unload.mock.calls.length > 0);

		expect(
			store.getState().getActivePluginKind('shiko.metric', 'metric')
		).toBeNull();
		expect(mockHost.unload).toHaveBeenCalledWith('shiko.metric');
	});

	it('reports plugin code that does not define the manifest’s kinds', async () => {
		const store = createStore();
		mockHost.load.mockResolvedValue([]);

		await store.getState().fetchMapPlugins('map-1');
		await waitUntil(settled(store));

		expect(store.getState().loadedPlugins['shiko.metric']).toMatchObject({
			status: 'error',
			error: expect.stringContaining('define "metric"'),
		});
	});

	it('only loads developer plugins for the owner, from localhost', async () => {
		window.localStorage.setItem(
			'shiko_dev_plugins_v1:owner-1:map-1',
			JSON.stringify([
				'http://localhost:5173/manifest.json',
				'https://evil.test/manifest.json',
			])
		);
		const owner = createStore();
		await owner.getState().fetchMapPlugins('map-1');
		expect(owner.getState().devPluginUrls).toEqual([
			'http://localhost:5173/manifest.json',
		]);

		const editor = createStore({
			currentUser: { id: 'editor-1', is_anonymous: false },
		});
		await editor.getState().fetchMapPlugins('map-1');
		expect(editor.getState().devPluginUrls).toEqual([]);
		await expect(
			editor.getState().addDevPlugin('http://localhost:5173/manifest.json')
		).resolves.toMatchObject({ ok: false });
	});

	it('keeps developer plugins off until the owner turns on Developer mode', async () => {
		const url = 'http://localhost:5173/manifest.json';
		window.localStorage.setItem(
			'shiko_dev_plugins_v1:owner-1:map-1',
			JSON.stringify([url])
		);
		mockFetch({
			'/plugins/shiko.metric/0.1.0/manifest.json': manifestJson,
			'/plugins/shiko.metric/0.1.0/plugin.js': metricCode,
			'localhost:5173/manifest.json': JSON.stringify({
				...JSON.parse(manifestJson),
				id: 'dev.test.metric',
			}),
			'localhost:5173/plugin.js': 'definePlugin({ kinds: {} });',
		});
		const store = createStore({ userProfile: { preferences: {} } });

		await store.getState().fetchMapPlugins('map-1');
		expect(store.getState().devPluginUrls).toEqual([]);
		await expect(store.getState().addDevPlugin(url)).resolves.toEqual({
			ok: false,
			error: 'Turn on Developer mode to load plugins from localhost.',
		});

		store.setState({
			userProfile: { preferences: { developerMode: true } },
		} as Partial<AppState>);
		store.getState().syncDeveloperPlugins();
		await waitUntil(settled(store));
		expect(store.getState().devPluginUrls).toEqual([url]);
		expect(store.getState().loadedPlugins[url]?.status).toBe('ready');

		store.setState({
			userProfile: { preferences: { developerMode: false } },
		} as Partial<AppState>);
		store.getState().syncDeveloperPlugins();
		expect(store.getState().devPluginUrls).toEqual([]);
		expect(store.getState().loadedPlugins[url]).toBeUndefined();
		// The list stays in this browser for when Developer mode is back on.
		expect(window.localStorage.getItem('shiko_dev_plugins_v1:owner-1:map-1')).toBe(
			JSON.stringify([url])
		);
	});

	it('refuses developer plugin URLs that are not on this machine', async () => {
		const store = createStore();

		await expect(
			store.getState().addDevPlugin('https://plugins.example.com/manifest.json')
		).resolves.toEqual({
			ok: false,
			error: 'Use a manifest.json URL on http://localhost or 127.0.0.1.',
		});
	});

	it('turns a plugin off through the API and unloads it', async () => {
		const store = createStore();
		await store.getState().fetchMapPlugins('map-1');
		await waitUntil(settled(store));
		mockFetch({ '/api/maps/map-1/plugins/shiko.metric': '{"data":{}}' });

		await expect(
			store.getState().setMapPluginEnabled('shiko.metric', false)
		).resolves.toBe(true);
		await waitUntil(() => mockHost.unload.mock.calls.length > 0);

		expect(global.fetch).toHaveBeenCalledWith(
			'/api/maps/map-1/plugins/shiko.metric',
			{
				method: 'DELETE',
			}
		);
		expect(store.getState().mapPlugins).toEqual([]);
		expect(store.getState().loadedPlugins['shiko.metric']).toBeUndefined();
	});

	it('gives a reloaded developer plugin a new generation, so its nodes redraw', async () => {
		const url = 'http://localhost:5173/manifest.json';
		mockFetch({
			'/plugins/shiko.metric/0.1.0/manifest.json': manifestJson,
			'/plugins/shiko.metric/0.1.0/plugin.js': metricCode,
			'localhost:5173/manifest.json': JSON.stringify({
				...JSON.parse(manifestJson),
				id: 'dev.test.metric',
			}),
			'localhost:5173/plugin.js': 'definePlugin({ kinds: {} });',
		});
		const store = createStore();
		await store.getState().fetchMapPlugins('map-1');
		await store.getState().addDevPlugin(url);
		await waitUntil(settled(store));
		const first = store.getState().loadedPlugins[url];
		expect(first.status).toBe('ready');

		await store.getState().reloadDevPlugin(url);
		await waitUntil(settled(store));

		expect(store.getState().loadedPlugins[url].status).toBe('ready');
		expect(store.getState().loadedPlugins[url].generation).toBeGreaterThan(
			first.generation
		);
	});

	it('refuses catalog code that does not match the reviewed fingerprint', async () => {
		mockFetch({
			'/plugins/shiko.metric/0.1.0/manifest.json': manifestJson,
			'/plugins/shiko.metric/0.1.0/plugin.js': `${metricCode}\n// tampered`,
		});
		const store = createStore();

		await store.getState().fetchMapPlugins('map-1');
		await waitUntil(settled(store));

		expect(store.getState().loadedPlugins['shiko.metric']).toMatchObject({
			status: 'error',
			error: 'The plugin code doesn’t match the reviewed version',
		});
		expect(mockHost.load).not.toHaveBeenCalled();
	});

	it('updates a map to another version and runs that version’s code', async () => {
		mockFetch(BOTH_VERSIONS);
		const store = createStore();
		await store.getState().fetchMapPlugins('map-1');
		await waitUntil(settled(store));
		const saved = {
			pluginId: 'shiko.metric',
			version: '0.2.0',
			previousVersion: '0.1.0',
			updatedAt: '2026-10-05T12:00:00.000Z',
		};
		mockFetch({
			...BOTH_VERSIONS,
			'/api/maps/map-1/plugins/shiko.metric': JSON.stringify({ data: saved }),
		});

		await expect(
			store.getState().setMapPluginVersion('shiko.metric', '0.2.0')
		).resolves.toBe(true);
		await waitUntil(settled(store));

		expect(global.fetch).toHaveBeenCalledWith(
			'/api/maps/map-1/plugins/shiko.metric',
			expect.objectContaining({ method: 'PATCH', body: '{"version":"0.2.0"}' })
		);
		expect(store.getState().mapPlugins).toEqual([saved]);
		expect(mockHost.load).toHaveBeenLastCalledWith('shiko.metric', metricCode020);
		expect(store.getState().loadedPlugins['shiko.metric']).toMatchObject({
			status: 'ready',
			manifest: expect.objectContaining({ version: '0.2.0' }),
		});
	});

	it('never lets a slow load of the old version unload the new one', async () => {
		let finishOld: (kinds: string[]) => void = () => undefined;
		mockHost.load.mockImplementation((_id: string, code: string) =>
			code === metricCode
				? new Promise((resolve) => (finishOld = resolve))
				: Promise.resolve(['metric'])
		);
		mockFetch({
			...BOTH_VERSIONS,
			'/api/maps/map-1/plugins/shiko.metric': JSON.stringify({
				data: {
					pluginId: 'shiko.metric',
					version: '0.2.0',
					previousVersion: '0.1.0',
					updatedAt: null,
				},
			}),
		});
		const store = createStore();
		await store.getState().fetchMapPlugins('map-1');
		await waitUntil(() => mockHost.load.mock.calls.length > 0);

		await store.getState().setMapPluginVersion('shiko.metric', '0.2.0');
		await waitUntil(() => mockHost.load.mock.calls.length > 1);
		finishOld(['metric']);
		await waitUntil(settled(store));
		await flush();

		// 0.2.0's code replaced 0.1.0's in the host; the stale load must not remove it.
		expect(mockHost.load).toHaveBeenLastCalledWith('shiko.metric', metricCode020);
		expect(mockHost.unload).not.toHaveBeenCalled();
		expect(store.getState().loadedPlugins['shiko.metric']).toMatchObject({
			status: 'ready',
			manifest: expect.objectContaining({ version: '0.2.0' }),
		});
	});

	it('says so when the map is pinned to a version this app doesn’t have', async () => {
		const store = createStore({}, '9.9.9');

		await store.getState().fetchMapPlugins('map-1');

		expect(store.getState().loadedPlugins['shiko.metric']).toMatchObject({
			status: 'error',
			error: 'This map uses a version of the plugin this app doesn’t have',
		});
		expect(global.fetch).not.toHaveBeenCalled();
	});

	it('opens the Plugins panel and closes the other right-hand panels', () => {
		const setPopoverOpen = jest.fn();
		const store = createStore({ setPopoverOpen });

		store.getState().openPluginsPanel();

		expect(setPopoverOpen).toHaveBeenCalledWith({
			plugins: true,
			recipes: false,
			mapSettings: false,
		});
	});
});
