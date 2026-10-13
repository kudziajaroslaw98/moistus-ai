/**
 * @jest-environment node
 */
jest.mock('next/server', () => {
	class FakeNextResponse extends Response {
		static json(body: unknown, init?: ResponseInit) {
			return Response.json(body, init);
		}
	}
	return { NextResponse: FakeNextResponse };
});
jest.mock('@/helpers/supabase/server', () => ({
	createClient: jest.fn(),
	createServiceRoleClient: jest.fn(),
}));

import {
	createClient,
	createServiceRoleClient,
} from '@/helpers/supabase/server';
import { GET } from './route';

interface Library {
	/** Published `plugin_versions` rows for community plugins. */
	versions?: Array<Record<string, unknown>>;
	/** The `plugins` row (turned off when `disabled_at` is set). */
	plugin?: Record<string, unknown> | null;
}

/** A query builder: chainable, `maybeSingle()` for one row, awaitable for a list. */
function builder(single: unknown, list: unknown[] = []) {
	const chain: Record<string, unknown> = {
		select: () => chain,
		eq: () => chain,
		maybeSingle: () => Promise.resolve({ data: single, error: null }),
		then: (resolve: (value: unknown) => unknown) =>
			Promise.resolve({ data: list, error: null }).then(resolve),
	};
	return chain;
}

function library({ versions = [], plugin = null }: Library = {}) {
	const from = jest.fn((table: string) =>
		table === 'plugins' ? builder(plugin) : builder(null, versions)
	);
	jest.mocked(createServiceRoleClient).mockReturnValue({ from } as never);
}

function signedIn(preferences: Record<string, unknown> = {}) {
	jest.mocked(createClient).mockResolvedValue({
		auth: {
			getUser: jest
				.fn()
				.mockResolvedValue({ data: { user: { id: 'ana' } }, error: null }),
		},
		from: () => builder({ preferences }),
	} as never);
}

const get = (query: string) =>
	GET(new Request(`https://shiko.app/api/plugins/network-worker?${query}`));

beforeEach(() => jest.clearAllMocks());

describe('GET /api/plugins/network-worker', () => {
	it('serves a reviewed version’s worker with a policy naming only its sites', async () => {
		signedIn();
		library();

		const response = await get('plugin=shiko.github-issue&version=0.1.0');

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toBe(
			'text/javascript; charset=utf-8'
		);
		expect(response.headers.get('x-content-type-options')).toBe('nosniff');
		expect(response.headers.get('cache-control')).toBe('no-store');
		expect(response.headers.get('content-security-policy')).toBe(
			"default-src 'none'; connect-src https://api.github.com"
		);
		const source = await response.text();
		expect(source).toContain('"hosts":["api.github.com"]');
		expect(source).toContain('"shiko.app"');
	});

	it('takes a library plugin’s sites from its published version', async () => {
		signedIn();
		library({
			versions: [
				{
					version: '0.2.0',
					code_sha256: 'x',
					permissions: ['node:own', 'network:api.weather.example'],
					author_hosts: [],
					notes: '',
				},
			],
		});

		const response = await get('plugin=dev.ana.weather&version=0.2.0');

		expect(response.status).toBe(200);
		expect(response.headers.get('content-security-policy')).toBe(
			"default-src 'none'; connect-src https://api.weather.example"
		);
	});

	it('refuses versions that don’t exist, reach no sites or are turned off', async () => {
		signedIn();
		library();
		expect((await get('plugin=shiko.github-issue&version=9.9.9')).status).toBe(
			404
		);
		expect((await get('plugin=shiko.metric&version=0.1.0')).status).toBe(404);
		expect((await get('plugin=dev.nobody.thing&version=0.1.0')).status).toBe(
			404
		);

		library({
			plugin: { disabled_at: '2026-10-06', disabled_reason: 'Broken' },
		});
		expect((await get('plugin=shiko.github-issue&version=0.1.0')).status).toBe(
			404
		);
	});

	it('runs developer plugins’ sites only with Developer mode on', async () => {
		library();
		signedIn({ developerMode: false });
		expect((await get('hosts=api.example.dev')).status).toBe(403);

		signedIn({ developerMode: true });
		const response = await get('hosts=api.example.dev,data.example.org');
		expect(response.status).toBe(200);
		expect(response.headers.get('content-security-policy')).toBe(
			"default-src 'none'; connect-src https://api.example.dev https://data.example.org"
		);
	});

	it('refuses developer sites that aren’t public names, or too many', async () => {
		library();
		signedIn({ developerMode: true });
		expect((await get('hosts=192.168.0.1')).status).toBe(400);
		expect((await get('hosts=printer.local')).status).toBe(400);
		expect(
			(await get('hosts=a.example,b.example,c.example,d.example')).status
		).toBe(400);
		// Shiko itself is never reachable, so nothing is left to serve.
		expect((await get('hosts=shiko.app')).status).toBe(404);
	});

	it('needs a signed-in person', async () => {
		jest.mocked(createClient).mockResolvedValue({
			auth: {
				getUser: jest
					.fn()
					.mockResolvedValue({ data: { user: null }, error: null }),
			},
		} as never);
		expect((await get('plugin=shiko.github-issue&version=0.1.0')).status).toBe(
			401
		);
	});
});
