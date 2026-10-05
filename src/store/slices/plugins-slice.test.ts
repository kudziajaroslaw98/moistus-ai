import { readFileSync } from 'node:fs';
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
const OWNER = { id: 'owner-1', is_anonymous: false };

function createStore(overrides: Record<string, unknown> = {}) {
	const queryResult = {
		data: [{ plugin_id: 'shiko.metric', version: '0.1.0' }],
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
		'/plugins/shiko.metric/0.1.0/plugin.js': 'definePlugin({ kinds: {} });',
	});
});

describe('plugins slice', () => {
	it('loads the plugins the owner turned on and exposes their kinds', async () => {
		const store = createStore();

		await store.getState().fetchMapPlugins('map-1');
		await waitUntil(settled(store));

		expect(store.getState().mapPlugins).toEqual([
			{ pluginId: 'shiko.metric', version: '0.1.0' },
		]);
		expect(mockHost.load).toHaveBeenCalledWith(
			'shiko.metric',
			'definePlugin({ kinds: {} });'
		);
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
});
