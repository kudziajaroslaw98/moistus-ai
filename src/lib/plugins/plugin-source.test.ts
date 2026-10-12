import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TextEncoder } from 'node:util';
import {
	FIRST_PARTY_PLUGINS,
	setPluginLibrary,
	type PluginCatalogEntry,
} from './catalog';
import { fetchPluginSource } from './plugin-source';

/** A file the app serves from `public/`, or null when there isn't one. */
function publicFile(url: string): string | null {
	try {
		return readFileSync(join(process.cwd(), 'public', url), 'utf8');
	} catch {
		return null;
	}
}

const metric = FIRST_PARTY_PLUGINS.find((entry) => entry.id === 'shiko.metric');
if (!metric) throw new Error('shiko.metric is missing from the catalog');

let served: Record<string, string> = {};
const mockFetch = jest.fn(async (input: string | URL) => {
	const url = new URL(String(input), 'http://localhost').pathname;
	const body =
		served[url] ?? (url.startsWith('/plugins/') ? publicFile(url) : null);
	return body === null
		? { ok: false, status: 404, text: async () => '' }
		: { ok: true, status: 200, text: async () => body };
});

beforeAll(() => {
	Object.defineProperty(globalThis, 'TextEncoder', {
		configurable: true,
		value: TextEncoder,
	});
	// jsdom has no Web Crypto digest; use Node's, the same SHA-256.
	Object.defineProperty(globalThis, 'crypto', {
		configurable: true,
		value: {
			subtle: {
				digest: async (_name: string, data: Uint8Array) =>
					createHash('sha256').update(data).digest().buffer,
			},
		},
	});
});

beforeEach(() => {
	served = {};
	mockFetch.mockClear();
	global.fetch = mockFetch as unknown as typeof fetch;
	setPluginLibrary({ plugins: [], disabled: [] });
});

describe('fetchPluginSource', () => {
	it('reads one of Shiko’s plugins and matches the code to the catalog fingerprint', async () => {
		const version = metric.versions[metric.versions.length - 1];
		const source = await fetchPluginSource('shiko.metric', version.version);

		expect(source.fingerprint).toBe('match');
		expect(source.sha256).toBe(version.sha256);
		expect(source.mainName).toBe('plugin.js');
		expect(source.code).toContain('definePlugin');
		// Indented for reading, whatever the file looked like.
		expect(source.manifestText).toContain('\n  "id": "shiko.metric"');
		expect(source.permissions).toEqual(['node:own']);
		expect(source.icon).toEqual(expect.any(String));
	});

	it('says the code does not match when it differs from the reviewed fingerprint', async () => {
		const version = metric.versions[0];
		served[`/plugins/shiko.metric/${version.version}/plugin.js`] = '// changed';

		const source = await fetchPluginSource('shiko.metric', version.version);
		expect(source.code).toBe('// changed');
		expect(source.fingerprint).toBe('mismatch');
	});

	it('reads a community plugin from the library files and its own main file', async () => {
		const code = 'definePlugin({ kinds: {} });';
		const entry: PluginCatalogEntry = {
			id: 'com.example.reading',
			source: 'community',
			versions: [
				{
					version: '1.0.0',
					sha256: createHash('sha256').update(code).digest('hex'),
					permissions: ['node:own'],
					notes: '',
				},
			],
		};
		setPluginLibrary({ plugins: [entry], disabled: [] });
		const base = '/api/plugins/files/com.example.reading/1.0.0';
		served[`${base}/manifest.json`] = JSON.stringify({
			id: 'com.example.reading',
			main: 'main.js',
			permissions: ['node:own'],
			icon: 'book',
		});
		served[`${base}/main.js`] = code;

		const source = await fetchPluginSource('com.example.reading', '1.0.0');
		expect(source).toMatchObject({
			mainName: 'main.js',
			code,
			icon: 'book',
			fingerprint: 'match',
		});
	});

	it('reports a file that can not be loaded, by name', async () => {
		const version = metric.versions[0].version;
		served[`/plugins/shiko.metric/${version}/plugin.js`] = '';
		mockFetch.mockImplementationOnce(async () => ({
			ok: true,
			status: 200,
			text: async () =>
				JSON.stringify({
					id: 'shiko.metric',
					main: 'gone.js',
					permissions: [],
				}),
		}));

		await expect(fetchPluginSource('shiko.metric', version)).rejects.toThrow(
			/Couldn't load gone\.js \(404\)/
		);
	});

	it('does not claim a match when this browser has no Web Crypto', async () => {
		Object.defineProperty(globalThis, 'crypto', {
			configurable: true,
			value: {},
		});
		const source = await fetchPluginSource(
			'shiko.metric',
			metric.versions[0].version
		);
		expect(source.sha256).toBeNull();
		expect(source.fingerprint).toBe('unavailable');
	});
});
