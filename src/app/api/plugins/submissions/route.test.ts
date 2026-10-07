/**
 * @jest-environment node
 */
jest.mock('next/server', () => ({
	NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) },
}));
jest.mock('@/helpers/supabase/server', () => ({
	createClient: jest.fn(),
	createServiceRoleClient: jest.fn(),
}));

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient, createServiceRoleClient } from '@/helpers/supabase/server';
import { POST } from './route';

const manifest = {
	...JSON.parse(readFileSync(join(process.cwd(), 'public/plugins/shiko.metric/0.2.0/manifest.json'), 'utf8')),
	id: 'dev.ana.metric',
	version: '0.3.0',
};
const code = 'definePlugin({ kinds: { metric: { render: () => ui.text("x") } } });';

/** Service-role fake: `plugins`/`plugin_versions` reads and the writes it receives. */
function library(state: { plugin?: { id: string; author_id: string } | null; versions?: Array<{ version: string; status: string }> }) {
	const writes: Array<{ table: string; op: string; value: unknown }> = [];
	const from = jest.fn((table: string) => {
		const builder: Record<string, unknown> = {
			select: () => builder,
			eq: () => builder,
			in: () => builder,
			maybeSingle: () => Promise.resolve({ data: state.plugin ?? null, error: null }),
			then: (resolve: (value: unknown) => void) =>
				resolve({
					data:
						table === 'plugin_versions'
							? (state.versions ?? [])
							: table === 'user_profiles'
								? [{ user_id: 'ana', display_name: 'Ana K.' }]
								: null,
					error: null,
				}),
			insert: (value: unknown) => {
				writes.push({ table, op: 'insert', value });
				return Promise.resolve({ error: null });
			},
			update: (value: unknown) => {
				writes.push({ table, op: 'update', value });
				return { eq: () => Promise.resolve({ error: null }) };
			},
		};
		return builder;
	});
	jest.mocked(createServiceRoleClient).mockReturnValue({ from } as never);
	return writes;
}

function signedIn(id = 'ana', isAnonymous = false) {
	jest.mocked(createClient).mockResolvedValue({
		auth: {
			getUser: jest.fn().mockResolvedValue({ data: { user: { id, is_anonymous: isAnonymous } }, error: null }),
		},
	} as never);
}

const submit = (body: Record<string, unknown> = {}) =>
	POST(
		new Request('http://localhost/api/plugins/submissions', {
			method: 'POST',
			body: JSON.stringify({ manifest, code, agreed: true, ...body }),
		})
	);
const errorOf = async (response: Response) => (await response.json()).error as string;

beforeEach(() => jest.clearAllMocks());

describe('POST /api/plugins/submissions', () => {
	it('claims a new id and stores the exact code, its fingerprint and the account’s name', async () => {
		signedIn();
		const writes = library({ plugin: null, versions: [] });

		const response = await submit({ submitterNote: 'Try the + button' });

		expect(response.status).toBe(201);
		expect(writes[0]).toMatchObject({
			table: 'plugins',
			op: 'insert',
			value: { id: 'dev.ana.metric', author_id: 'ana', name: 'Metric' },
		});
		expect(writes[1]).toMatchObject({
			table: 'plugin_versions',
			op: 'insert',
			value: {
				plugin_id: 'dev.ana.metric',
				version: '0.3.0',
				status: 'in_review',
				code,
				code_sha256: createHash('sha256').update(code).digest('hex'),
				manifest: expect.objectContaining({ author: 'Ana K.' }),
				submitter_note: 'Try the + button',
				submitted_by: 'ana',
			},
		});
	});

	it('refuses ids that belong to Shiko or to another author', async () => {
		signedIn();
		library({});
		expect((await submit({ manifest: { ...manifest, id: 'shiko.evil' } })).status).toBe(403);

		library({ plugin: { id: 'dev.ana.metric', author_id: 'someone-else' } });
		const response = await submit();
		expect(response.status).toBe(409);
		expect(await errorOf(response)).toContain('belongs to another author');
	});

	it('takes one version in review at a time, each above the last', async () => {
		signedIn();
		library({ plugin: { id: 'dev.ana.metric', author_id: 'ana' }, versions: [{ version: '0.2.0', status: 'in_review' }] });
		expect(await errorOf(await submit())).toBe(
			'0.2.0 is still in review. Wait for Shiko’s answer before sending another version.'
		);

		library({ plugin: { id: 'dev.ana.metric', author_id: 'ana' }, versions: [{ version: '0.3.0', status: 'published' }] });
		expect(await errorOf(await submit({ notes: 'More' }))).toBe('Use a version above 0.3.0 in manifest.json.');
	});

	it('needs release notes for an update', async () => {
		signedIn();
		library({ plugin: { id: 'dev.ana.metric', author_id: 'ana' }, versions: [{ version: '0.2.0', status: 'published' }] });
		expect((await submit()).status).toBe(400);
	});

	it('refuses invalid manifests, guests and missing agreement', async () => {
		signedIn();
		library({});
		expect((await submit({ manifest: { ...manifest, permissions: ['map:read'] } })).status).toBe(400);
		expect((await submit({ agreed: false })).status).toBe(400);

		signedIn('guest', true);
		expect((await submit()).status).toBe(403);
	});
});
