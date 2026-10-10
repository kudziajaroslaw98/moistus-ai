/**
 * @jest-environment node
 */
jest.mock('next/server', () => ({
	NextResponse: class extends Response {
		static json(body: unknown, init?: ResponseInit) {
			return Response.json(body, init);
		}
	},
}));

jest.mock('@/helpers/supabase/server', () => ({
	createClient: jest.fn(),
	createServiceRoleClient: jest.fn(),
}));

import {
	createClient,
	createServiceRoleClient,
} from '@/helpers/supabase/server';
import {
	MAX_DRAFT_MANIFEST_BYTES,
	MAX_PLUGIN_DRAFTS,
} from '@/lib/plugins/limits';
import {
	STARTER_MANIFEST_JSON,
	STARTER_PLUGIN_JS,
} from '@/lib/plugins/starter-plugin';
import { GET as getFile } from './[id]/files/[...file]/route';
import {
	DELETE as deleteDraft,
	GET as getDraft,
	PATCH as patchDraft,
} from './[id]/route';
import { POST as createDraft, GET as listDrafts } from './route';

type Result = { data?: unknown; error?: unknown; count?: number | null };

/** Chainable stand-in for the Supabase query builder; results are queued per table. */
function fakeClient(responses: Record<string, Result[]> = {}) {
	const calls: Array<{ table: string; ops: Array<[string, unknown[]]> }> = [];
	const from = jest.fn((table: string) => {
		const call = { table, ops: [] as Array<[string, unknown[]]> };
		calls.push(call);
		const next = () => responses[table]?.shift() ?? { data: null, error: null };
		const builder: Record<string, unknown> = new Proxy(
			{},
			{
				get(_target, prop) {
					if (prop === 'then') {
						const result = next();
						return (resolve: (value: Result) => void) => resolve(result);
					}
					if (prop === 'single' || prop === 'maybeSingle') {
						return () => Promise.resolve(next());
					}
					return (...args: unknown[]) => {
						call.ops.push([String(prop), args]);
						return builder;
					};
				},
			}
		);
		return builder;
	});
	return {
		from,
		calls,
		ops: (table: string, op: string) =>
			calls
				.filter((call) => call.table === table)
				.flatMap((call) => call.ops.filter(([name]) => name === op)),
	};
}

let userCounter = 0;
let USER: { id: string; is_anonymous: boolean };
beforeEach(() => {
	userCounter += 1;
	// A fresh id per test: the in-memory rate limiters are keyed by user.
	USER = { id: `user-${userCounter}`, is_anonymous: false };
});

const DEV_ON: Result = { data: { preferences: { developerMode: true } } };
const DEV_OFF: Result = { data: { preferences: { developerMode: false } } };

function sessionClient(
	responses: Record<string, Result[]> = {},
	user: { id: string; is_anonymous: boolean } | null = USER
) {
	const client = fakeClient(responses);
	jest.mocked(createClient).mockResolvedValue({
		auth: {
			getUser: jest.fn().mockResolvedValue({ data: { user }, error: null }),
		},
		from: client.from,
	} as never);
	return client;
}

const DRAFT_ID = '0d6f2f4e-8c1b-4a51-9d0e-2b7d3c1f5a01';
const PLUGIN_ID = 'dev.counter-0d6f2f4e';
const manifestText = JSON.stringify(
	{ ...JSON.parse(STARTER_MANIFEST_JSON), id: PLUGIN_ID },
	null,
	2
);
const row = (overrides: Record<string, unknown> = {}) => ({
	id: DRAFT_ID,
	plugin_id: PLUGIN_ID,
	name: 'Counter',
	icon: 'puzzle',
	description: 'Count anything.',
	check_summary: null,
	base_version: null,
	updated_at: '2026-10-10T12:00:00.000Z',
	manifest_text: manifestText,
	code: STARTER_PLUGIN_JS,
	sample: {},
	revision: 3,
	created_at: '2026-10-10T11:00:00.000Z',
	...overrides,
});

const url = 'http://localhost/api/plugins/drafts';
const request = (method: string, body?: unknown, path = '') =>
	new Request(`${url}${path}`, {
		method,
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
const idParams = { params: Promise.resolve({ id: DRAFT_ID }) };
const fileParams = (file: string[]) => ({
	params: Promise.resolve({ id: DRAFT_ID, file }),
});

describe('GET /api/plugins/drafts', () => {
	it('refuses guests', async () => {
		sessionClient({}, { id: 'guest', is_anonymous: true });
		const res = await listDrafts(request('GET'));
		expect(res.status).toBe(403);
	});

	it('asks for Developer mode with a machine code the page can act on', async () => {
		sessionClient({ user_profiles: [DEV_OFF] });
		const res = await listDrafts(request('GET'));
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.data).toEqual({ code: 'DEVELOPER_MODE_REQUIRED' });
	});

	it('lists summaries without the code or manifest text', async () => {
		sessionClient({
			user_profiles: [DEV_ON],
			plugin_drafts: [{ data: [row()], error: null }],
		});
		const res = await listDrafts(request('GET'));
		expect(res.status).toBe(200);
		const { data } = await res.json();
		expect(data).toHaveLength(1);
		expect(data[0]).toMatchObject({
			id: DRAFT_ID,
			pluginId: PLUGIN_ID,
			name: 'Counter',
		});
		expect(data[0]).not.toHaveProperty('code');
		expect(data[0]).not.toHaveProperty('manifestText');
	});
});

describe('POST /api/plugins/drafts', () => {
	it('creates a draft and gives it an id made by Shiko', async () => {
		const client = sessionClient({
			user_profiles: [DEV_ON],
			plugin_drafts: [
				{ count: 2 },
				{ data: row({ plugin_id: 'dev.counter-aaaaaaaa' }), error: null },
			],
		});
		const res = await createDraft(
			request('POST', {
				manifestText: STARTER_MANIFEST_JSON,
				code: STARTER_PLUGIN_JS,
			})
		);
		expect(res.status).toBe(201);

		const [[, [inserted]]] = client.ops('plugin_drafts', 'insert') as [
			[string, [Record<string, unknown>]],
		];
		expect(inserted.user_id).toBe(USER.id);
		expect(inserted.plugin_id).toMatch(/^dev\.counter-[0-9a-f]{8}$/);
		expect(inserted.id).toEqual(expect.stringMatching(/^[0-9a-f-]{36}$/));
		expect(
			String(inserted.plugin_id).endsWith(String(inserted.id).slice(0, 8))
		).toBe(true);
		// The manifest text carries the same id, first.
		const saved = JSON.parse(inserted.manifest_text as string);
		expect(Object.keys(saved)[0]).toBe('id');
		expect(saved.id).toBe(inserted.plugin_id);
		expect(inserted.name).toBe('Counter');
		expect(inserted.base_version).toBeNull();
	});

	it('refuses manifest text that is not a JSON object', async () => {
		sessionClient({ user_profiles: [DEV_ON] });
		const res = await createDraft(
			request('POST', { manifestText: '{ nope', code: STARTER_PLUGIN_JS })
		);
		expect(res.status).toBe(400);
		expect((await res.json()).error).toMatch(/JSON/);
	});

	it('refuses a manifest above the size limit', async () => {
		sessionClient({ user_profiles: [DEV_ON] });
		const res = await createDraft(
			request('POST', {
				manifestText: ' '.repeat(MAX_DRAFT_MANIFEST_BYTES + 1),
				code: 'x',
			})
		);
		expect(res.status).toBe(400);
	});

	it('stops at the draft limit', async () => {
		const client = sessionClient({
			user_profiles: [DEV_ON],
			plugin_drafts: [{ count: MAX_PLUGIN_DRAFTS }],
		});
		const res = await createDraft(
			request('POST', {
				manifestText: STARTER_MANIFEST_JSON,
				code: STARTER_PLUGIN_JS,
			})
		);
		expect(res.status).toBe(409);
		expect((await res.json()).data).toEqual({
			code: 'DRAFT_LIMIT_REACHED',
			limit: MAX_PLUGIN_DRAFTS,
		});
		expect(client.ops('plugin_drafts', 'insert')).toHaveLength(0);
	});

	describe('from a plugin you published', () => {
		const from = { pluginId: 'dev.reading-list-1a2b3c4d', version: '0.1.0' };

		const serviceClient = (responses: Record<string, Result[]>) => {
			const client = fakeClient(responses);
			jest
				.mocked(createServiceRoleClient)
				.mockReturnValue({ from: client.from } as never);
			return client;
		};

		it('is not available for someone else’s plugin', async () => {
			sessionClient({
				user_profiles: [DEV_ON],
				plugin_drafts: [{ data: null, error: null }],
			});
			serviceClient({
				plugins: [{ data: { author_id: 'someone-else' }, error: null }],
				plugin_versions: [
					{ data: [{ version: '0.1.0' }], error: null },
					{ data: { manifest: {}, code: 'x' }, error: null },
				],
			});
			const res = await createDraft(request('POST', { from }));
			expect(res.status).toBe(404);
		});

		it('opens the draft you already have for it instead of making a second one', async () => {
			const client = sessionClient({
				user_profiles: [DEV_ON],
				plugin_drafts: [
					{ data: row({ plugin_id: from.pluginId }), error: null },
				],
			});
			const res = await createDraft(request('POST', { from }));
			expect(res.status).toBe(200);
			expect((await res.json()).data.pluginId).toBe(from.pluginId);
			expect(client.ops('plugin_drafts', 'insert')).toHaveLength(0);
		});

		it('copies the version, keeps its id and starts the next version number', async () => {
			const publishedManifest = {
				...JSON.parse(STARTER_MANIFEST_JSON),
				id: from.pluginId,
				version: '0.1.0',
			};
			const client = sessionClient({
				user_profiles: [DEV_ON],
				plugin_drafts: [
					{ data: null, error: null },
					{ count: 1 },
					{
						data: row({ plugin_id: from.pluginId, base_version: '0.1.0' }),
						error: null,
					},
				],
			});
			serviceClient({
				plugins: [{ data: { author_id: USER.id }, error: null }],
				plugin_versions: [
					{ data: [{ version: '0.1.0' }, { version: '0.1.4' }], error: null },
					{
						data: { manifest: publishedManifest, code: 'definePlugin({});' },
						error: null,
					},
				],
			});
			const res = await createDraft(request('POST', { from }));
			expect(res.status).toBe(201);

			const [[, [inserted]]] = client.ops('plugin_drafts', 'insert') as [
				[string, [Record<string, unknown>]],
			];
			expect(inserted.plugin_id).toBe(from.pluginId);
			expect(inserted.base_version).toBe('0.1.0');
			expect(inserted.code).toBe('definePlugin({});');
			const saved = JSON.parse(inserted.manifest_text as string);
			expect(saved.id).toBe(from.pluginId);
			// Newest of all its versions is 0.1.4, so the draft starts at 0.1.5.
			expect(saved.version).toBe('0.1.5');
		});
	});
});

describe('GET/PATCH/DELETE /api/plugins/drafts/[id]', () => {
	it('answers 404 for an id that is not a draft id', async () => {
		sessionClient({ user_profiles: [DEV_ON] });
		const res = await getDraft(request('GET'), {
			params: Promise.resolve({ id: 'nope' }),
		});
		expect(res.status).toBe(404);
	});

	it('returns the whole draft to its author', async () => {
		sessionClient({
			user_profiles: [DEV_ON],
			plugin_drafts: [{ data: row(), error: null }],
		});
		const res = await getDraft(request('GET'), idParams);
		expect(res.status).toBe(200);
		const { data } = await res.json();
		expect(data).toMatchObject({
			id: DRAFT_ID,
			revision: 3,
			code: STARTER_PLUGIN_JS,
		});
	});

	it('answers 404 when the draft is not yours (RLS returns no row)', async () => {
		sessionClient({
			user_profiles: [DEV_ON],
			plugin_drafts: [{ data: null, error: null }],
		});
		expect((await getDraft(request('GET'), idParams)).status).toBe(404);
	});

	describe('PATCH', () => {
		it('saves and fills in the card fields from the manifest', async () => {
			const client = sessionClient({
				user_profiles: [DEV_ON],
				plugin_drafts: [
					{ data: { plugin_id: PLUGIN_ID, revision: 3 }, error: null },
					{ data: row({ revision: 4, name: 'Tally' }), error: null },
				],
			});
			const edited = JSON.stringify({
				id: PLUGIN_ID,
				name: 'Tally',
				icon: 'timer',
				description: 'Counts things.',
			});
			const res = await patchDraft(
				request('PATCH', {
					baseRevision: 3,
					manifestText: edited,
					code: 'definePlugin({ kinds: {} });',
					checkSummary: { passed: 4, total: 5 },
				}),
				idParams
			);
			expect(res.status).toBe(200);
			expect((await res.json()).data.revision).toBe(4);

			const [[, [update]]] = client.ops('plugin_drafts', 'update') as [
				[string, [Record<string, unknown>]],
			];
			expect(update).toMatchObject({
				manifest_text: edited,
				code: 'definePlugin({ kinds: {} });',
				name: 'Tally',
				icon: 'timer',
				description: 'Counts things.',
				check_summary: { passed: 4, total: 5 },
			});
			// The save only lands if nobody saved in between.
			expect(client.ops('plugin_drafts', 'eq')).toEqual(
				expect.arrayContaining([['eq', ['revision', 3]]])
			);
		});

		it('keeps the card fields when the JSON is half typed', async () => {
			const client = sessionClient({
				user_profiles: [DEV_ON],
				plugin_drafts: [
					{ data: { plugin_id: PLUGIN_ID, revision: 3 }, error: null },
					{ data: row({ revision: 4 }), error: null },
				],
			});
			const res = await patchDraft(
				request('PATCH', { baseRevision: 3, manifestText: '{ "id": "dev.cou' }),
				idParams
			);
			expect(res.status).toBe(200);
			const [[, [update]]] = client.ops('plugin_drafts', 'update') as [
				[string, [Record<string, unknown>]],
			];
			expect(update).toEqual({ manifest_text: '{ "id": "dev.cou' });
		});

		it('refuses a change to the id Shiko set', async () => {
			const client = sessionClient({
				user_profiles: [DEV_ON],
				plugin_drafts: [
					{ data: { plugin_id: PLUGIN_ID, revision: 3 }, error: null },
				],
			});
			const res = await patchDraft(
				request('PATCH', {
					baseRevision: 3,
					manifestText: JSON.stringify({ id: 'dev.mine-1', name: 'X' }),
				}),
				idParams
			);
			expect(res.status).toBe(400);
			expect((await res.json()).error).toMatch(/Shiko sets the id/);
			expect(client.ops('plugin_drafts', 'update')).toHaveLength(0);
		});

		it('answers 409 with the newer draft when the revision is behind', async () => {
			const client = sessionClient({
				user_profiles: [DEV_ON],
				plugin_drafts: [
					{ data: { plugin_id: PLUGIN_ID, revision: 5 }, error: null },
					{ data: row({ revision: 5 }), error: null },
				],
			});
			const res = await patchDraft(
				request('PATCH', { baseRevision: 3, code: 'x' }),
				idParams
			);
			expect(res.status).toBe(409);
			const body = await res.json();
			expect(body.data).toMatchObject({
				code: 'DRAFT_REVISION_CONFLICT',
				draft: { id: DRAFT_ID, revision: 5 },
			});
			expect(client.ops('plugin_drafts', 'update')).toHaveLength(0);
		});

		it('answers 409 too when someone saved between the check and the update', async () => {
			sessionClient({
				user_profiles: [DEV_ON],
				plugin_drafts: [
					{ data: { plugin_id: PLUGIN_ID, revision: 3 }, error: null },
					{ data: null, error: null }, // the update matched no row
					{ data: row({ revision: 4 }), error: null }, // current draft
				],
			});
			const res = await patchDraft(
				request('PATCH', { baseRevision: 3, code: 'x' }),
				idParams
			);
			expect(res.status).toBe(409);
			expect((await res.json()).data.draft.revision).toBe(4);
		});

		it('answers 404 for a draft that is gone', async () => {
			sessionClient({
				user_profiles: [DEV_ON],
				plugin_drafts: [{ data: null, error: null }],
			});
			const res = await patchDraft(
				request('PATCH', { baseRevision: 1, code: 'x' }),
				idParams
			);
			expect(res.status).toBe(404);
		});

		it('refuses code above 256 KB and a request that changes nothing', async () => {
			sessionClient({ user_profiles: [DEV_ON, DEV_ON] });
			const tooBig = await patchDraft(
				request('PATCH', { baseRevision: 1, code: 'x'.repeat(256 * 1024 + 1) }),
				idParams
			);
			expect(tooBig.status).toBe(400);
			const empty = await patchDraft(
				request('PATCH', { baseRevision: 1 }),
				idParams
			);
			expect(empty.status).toBe(400);
		});
	});

	describe('DELETE', () => {
		it('deletes your draft', async () => {
			sessionClient({
				user_profiles: [DEV_ON],
				plugin_drafts: [{ data: { id: DRAFT_ID }, error: null }],
			});
			const res = await deleteDraft(request('DELETE'), idParams);
			expect(res.status).toBe(200);
			expect((await res.json()).data).toEqual({ id: DRAFT_ID });
		});

		it('answers 404 when there is nothing to delete', async () => {
			sessionClient({
				user_profiles: [DEV_ON],
				plugin_drafts: [{ data: null, error: null }],
			});
			expect((await deleteDraft(request('DELETE'), idParams)).status).toBe(404);
		});
	});
});

describe('GET /api/plugins/drafts/[id]/files/[...file]', () => {
	const fileRequest = (file: string) =>
		request('GET', undefined, `/${DRAFT_ID}/files/${file}`);

	it('serves the manifest with the id Shiko set', async () => {
		sessionClient({
			user_profiles: [DEV_ON],
			plugin_drafts: [
				{
					data: {
						plugin_id: PLUGIN_ID,
						manifest_text: JSON.stringify({
							name: 'Counter',
							main: 'plugin.js',
						}),
						code: 'x',
					},
					error: null,
				},
			],
		});
		const res = await getFile(
			fileRequest('manifest.json'),
			fileParams(['manifest.json'])
		);
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({
			name: 'Counter',
			main: 'plugin.js',
			id: PLUGIN_ID,
		});
		expect(res.headers.get('Content-Type')).toMatch(/application\/json/);
		expect(res.headers.get('Cache-Control')).toBe('no-store');
	});

	it('serves the code as plain text a browser will not run', async () => {
		sessionClient({
			user_profiles: [DEV_ON],
			plugin_drafts: [
				{
					data: {
						plugin_id: PLUGIN_ID,
						manifest_text: JSON.stringify({ main: 'plugin.js' }),
						code: 'definePlugin({});',
					},
					error: null,
				},
			],
		});
		const res = await getFile(
			fileRequest('plugin.js'),
			fileParams(['plugin.js'])
		);
		expect(res.status).toBe(200);
		expect(await res.text()).toBe('definePlugin({});');
		expect(res.headers.get('Content-Type')).toMatch(/text\/plain/);
		expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
		expect(res.headers.get('Content-Security-Policy')).toBe(
			"sandbox; default-src 'none'"
		);
	});

	it('serves the code under the name the manifest gives it', async () => {
		sessionClient({
			user_profiles: [DEV_ON],
			plugin_drafts: [
				{
					data: {
						plugin_id: PLUGIN_ID,
						manifest_text: JSON.stringify({ main: 'src/main.js' }),
						code: 'code',
					},
					error: null,
				},
			],
		});
		const res = await getFile(
			fileRequest('src/main.js'),
			fileParams(['src', 'main.js'])
		);
		expect(await res.text()).toBe('code');
	});

	it('answers 422 while the manifest is not valid JSON', async () => {
		sessionClient({
			user_profiles: [DEV_ON],
			plugin_drafts: [
				{
					data: { plugin_id: PLUGIN_ID, manifest_text: '{ half', code: 'x' },
					error: null,
				},
			],
		});
		const res = await getFile(
			fileRequest('manifest.json'),
			fileParams(['manifest.json'])
		);
		expect(res.status).toBe(422);
	});

	it('answers 404 for any other file', async () => {
		sessionClient({
			user_profiles: [DEV_ON],
			plugin_drafts: [
				{
					data: {
						plugin_id: PLUGIN_ID,
						manifest_text: '{"main":"plugin.js"}',
						code: 'x',
					},
					error: null,
				},
			],
		});
		const res = await getFile(
			fileRequest('secrets.txt'),
			fileParams(['secrets.txt'])
		);
		expect(res.status).toBe(404);
	});

	it('needs Developer mode', async () => {
		sessionClient({ user_profiles: [DEV_OFF] });
		const res = await getFile(
			fileRequest('manifest.json'),
			fileParams(['manifest.json'])
		);
		expect(res.status).toBe(403);
	});
});
