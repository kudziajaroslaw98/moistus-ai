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

import { createClient, createServiceRoleClient } from '@/helpers/supabase/server';
import { GET } from './route';

type Row = Record<string, unknown> | null;

/** Service-role reads: one result per table, by `maybeSingle()`. */
function library(rows: { version: Row; plugin?: Row; role?: string }) {
	const from = jest.fn((table: string) => {
		const result =
			table === 'plugin_versions'
				? rows.version
				: table === 'plugins'
					? (rows.plugin ?? null)
					: { role: rows.role ?? 'user' };
		const builder: Record<string, unknown> = {
			select: () => builder,
			eq: () => builder,
			maybeSingle: () => Promise.resolve({ data: result, error: null }),
		};
		return builder;
	});
	jest.mocked(createServiceRoleClient).mockReturnValue({ from } as never);
}

function signedIn(id: string) {
	jest.mocked(createClient).mockResolvedValue({
		auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id } }, error: null }) },
	} as never);
}

const version = (overrides: Record<string, unknown> = {}) => ({
	status: 'published',
	manifest: { id: 'dev.ana.counter', main: 'plugin.js' },
	code: 'definePlugin({ kinds: {} });',
	submitted_by: 'ana',
	disabled_at: null,
	...overrides,
});
const get = (file: string[]) =>
	GET(new Request('http://localhost/api'), {
		params: Promise.resolve({ pluginId: 'dev.ana.counter', version: '0.1.0', file }),
	});

beforeEach(() => jest.clearAllMocks());

describe('GET /api/plugins/files', () => {
	it('serves a published version’s code as plain text that browsers won’t run', async () => {
		signedIn('someone');
		library({ version: version() });

		const response = await get(['plugin.js']);

		expect(response.status).toBe(200);
		expect(await response.text()).toBe('definePlugin({ kinds: {} });');
		expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8');
		expect(response.headers.get('x-content-type-options')).toBe('nosniff');
		expect(response.headers.get('content-security-policy')).toContain('sandbox');
	});

	it('serves only the manifest and the file it names', async () => {
		signedIn('someone');
		library({ version: version() });
		expect((await get(['manifest.json'])).status).toBe(200);

		library({ version: version() });
		expect((await get(['other.js'])).status).toBe(404);
	});

	it('keeps versions in review to their author and reviewers', async () => {
		signedIn('someone');
		library({ version: version({ status: 'in_review' }) });
		expect((await get(['plugin.js'])).status).toBe(404);

		signedIn('ana');
		library({ version: version({ status: 'in_review' }) });
		expect((await get(['plugin.js'])).status).toBe(200);

		signedIn('reviewer');
		library({ version: version({ status: 'in_review' }), role: 'admin' });
		expect((await get(['plugin.js'])).status).toBe(200);
	});

	it('stops serving a plugin Shiko turned off to everyone else', async () => {
		signedIn('someone');
		library({ version: version(), plugin: { disabled_at: '2026-10-06T00:00:00Z' } });
		expect((await get(['plugin.js'])).status).toBe(404);
	});
});
