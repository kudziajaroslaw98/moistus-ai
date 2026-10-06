/**
 * @jest-environment node
 */
jest.mock('next/server', () => ({
	NextResponse: {
		json: (body: unknown, init?: ResponseInit) => Response.json(body, init),
	},
}));

jest.mock('@/helpers/supabase/server', () => ({
	createClient: jest.fn(),
	createServiceRoleClient: jest.fn(),
}));

import { createClient, createServiceRoleClient } from '@/helpers/supabase/server';
import { DELETE, PATCH, PUT } from './route';

type Result = { data?: unknown; error?: unknown };

/** Chainable stand-in for the Supabase query builder; results are queued per table. */
function fakeClient(responses: Record<string, Result[]>) {
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
					if (prop === 'maybeSingle') return () => Promise.resolve(next());
					return (...args: unknown[]) => {
						call.ops.push([String(prop), args]);
						return builder;
					};
				},
			}
		);
		return builder;
	});
	return { from, calls };
}

/** The library tables, read with the service role (nothing is turned off by default). */
function libraryClient(responses: Record<string, Result[]> = {}) {
	const client = fakeClient(responses);
	jest.mocked(createServiceRoleClient).mockReturnValue({ from: client.from } as never);
	return client;
}

function sessionClient(
	responses: Record<string, Result[]>,
	user: object = USER
) {
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
					if (prop === 'maybeSingle') return () => Promise.resolve(next());
					return (...args: unknown[]) => {
						call.ops.push([String(prop), args]);
						return builder;
					};
				},
			}
		);
		return builder;
	});
	jest.mocked(createClient).mockResolvedValue({
		auth: {
			getUser: jest.fn().mockResolvedValue({ data: { user }, error: null }),
		},
		from,
	} as never);
	return { from, calls };
}

const USER = { id: 'owner-1', is_anonymous: false };
const MAP_ID = '0a3001a9-8457-4b41-9710-f6167137dfb2';
const request = (method: string, body?: unknown) =>
	new Request('http://localhost/api', {
		method,
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
const params = (pluginId: string, id = MAP_ID) => ({
	params: Promise.resolve({ id, pluginId }),
});

beforeEach(() => {
	jest.clearAllMocks();
	libraryClient();
});

describe('PUT /api/maps/[id]/plugins/[pluginId]', () => {
	it('turns a catalog plugin on, pinned to its latest version', async () => {
		const client = sessionClient({
			mind_maps: [{ data: { id: MAP_ID } }],
			map_plugins: [{}],
		});

		const response = await PUT(request('PUT'), params('shiko.metric'));

		expect(response.status).toBe(200);
		expect((await response.json()).data).toEqual({
			pluginId: 'shiko.metric',
			version: '0.2.0',
			previousVersion: null,
			updatedAt: expect.any(String),
		});
		const upsert = client.calls.find((call) => call.table === 'map_plugins')
			?.ops[0];
		expect(upsert).toEqual([
			'upsert',
			[
				{
					map_id: MAP_ID,
					plugin_id: 'shiko.metric',
					version: '0.2.0',
					previous_version: null,
					updated_at: expect.any(String),
					enabled_by: 'owner-1',
				},
				{ onConflict: 'map_id,plugin_id' },
			],
		]);
	});

	it('refuses plugins that are not in the catalog', async () => {
		const client = sessionClient({});

		const response = await PUT(request('PUT'), params('dev.evil'));

		expect(response.status).toBe(404);
		expect(client.from).not.toHaveBeenCalled();
	});

	it('refuses a plugin Shiko turned off everywhere', async () => {
		sessionClient({ mind_maps: [{ data: { id: MAP_ID } }] });
		libraryClient({
			plugins: [{ data: { disabled_at: '2026-10-06T00:00:00Z', disabled_reason: 'Reported for ads' } }],
		});

		const response = await PUT(request('PUT'), params('shiko.metric'));

		expect(response.status).toBe(409);
		expect((await response.json()).error).toBe('Shiko turned this plugin off: Reported for ads');
	});

	it('turns on a published library plugin at its latest version', async () => {
		const client = sessionClient({ mind_maps: [{ data: { id: MAP_ID } }], map_plugins: [{}] });
		const version = (v: string) => ({
			plugin_id: 'dev.ana.counter',
			version: v,
			status: 'published',
			code_sha256: 'a'.repeat(64),
			permissions: ['node:own'],
			author_hosts: [],
			notes: 'Counts',
		});
		libraryClient({ plugin_versions: [{ data: [version('0.2.0'), version('0.1.0')] }] });

		const response = await PUT(request('PUT', {}), params('dev.ana.counter'));

		expect(response.status).toBe(200);
		expect((await response.json()).data).toMatchObject({ pluginId: 'dev.ana.counter', version: '0.2.0' });
		expect(client.calls.some((call) => call.table === 'map_plugins')).toBe(true);
	});

	it('only lets the owner change plugins', async () => {
		sessionClient({ mind_maps: [{ data: null }] });

		expect((await PUT(request('PUT'), params('shiko.metric'))).status).toBe(
			403
		);
	});

	it('refuses guest sessions', async () => {
		sessionClient({}, { id: 'guest', is_anonymous: true });

		expect((await PUT(request('PUT'), params('shiko.metric'))).status).toBe(
			403
		);
	});
});

describe('PATCH /api/maps/[id]/plugins/[pluginId]', () => {
	const updateOf = (client: ReturnType<typeof sessionClient>) =>
		client.calls
			.filter((call) => call.table === 'map_plugins')
			.flatMap((call) => call.ops)
			.find(([op]) => op === 'update')?.[1][0];

	it('updates to a newer version and remembers the old one for roll back', async () => {
		const client = sessionClient({
			mind_maps: [{ data: { id: MAP_ID } }],
			map_plugins: [
				{ data: { version: '0.1.0', previous_version: null, updated_at: null } },
				{},
			],
		});

		const response = await PATCH(
			request('PATCH', { version: '0.2.0' }),
			params('shiko.metric')
		);

		expect(response.status).toBe(200);
		expect((await response.json()).data).toMatchObject({
			version: '0.2.0',
			previousVersion: '0.1.0',
		});
		expect(updateOf(client)).toMatchObject({
			version: '0.2.0',
			previous_version: '0.1.0',
			enabled_by: 'owner-1',
		});
	});

	it('rolls back to an older version and clears the roll back target', async () => {
		const client = sessionClient({
			mind_maps: [{ data: { id: MAP_ID } }],
			map_plugins: [
				{ data: { version: '0.2.0', previous_version: '0.1.0', updated_at: null } },
				{},
			],
		});

		const response = await PATCH(
			request('PATCH', { version: '0.1.0' }),
			params('shiko.metric')
		);

		expect(response.status).toBe(200);
		expect(updateOf(client)).toMatchObject({
			version: '0.1.0',
			previous_version: null,
		});
	});

	it('refuses versions that are not in the catalog', async () => {
		const client = sessionClient({});

		const response = await PATCH(
			request('PATCH', { version: '9.9.9' }),
			params('shiko.metric')
		);

		expect(response.status).toBe(404);
		expect(client.from).not.toHaveBeenCalled();
	});

	it('needs the plugin to be on first', async () => {
		sessionClient({
			mind_maps: [{ data: { id: MAP_ID } }],
			map_plugins: [{ data: null }],
		});

		const response = await PATCH(
			request('PATCH', { version: '0.2.0' }),
			params('shiko.metric')
		);

		expect(response.status).toBe(404);
	});

	it('only lets the owner change versions', async () => {
		sessionClient({ mind_maps: [{ data: null }] });

		const response = await PATCH(
			request('PATCH', { version: '0.2.0' }),
			params('shiko.metric')
		);

		expect(response.status).toBe(403);
	});

	it('rejects a body without a version', async () => {
		sessionClient({});

		expect(
			(await PATCH(request('PATCH', {}), params('shiko.metric'))).status
		).toBe(400);
	});
});

describe('DELETE /api/maps/[id]/plugins/[pluginId]', () => {
	it('turns a plugin off for the owner', async () => {
		const client = sessionClient({
			mind_maps: [{ data: { id: MAP_ID } }],
			map_plugins: [{}],
		});

		const response = await DELETE(request('DELETE'), params('shiko.metric'));

		expect(response.status).toBe(200);
		expect(
			client.calls.find((call) => call.table === 'map_plugins')?.ops
		).toEqual([
			['delete', []],
			['eq', ['map_id', MAP_ID]],
			['eq', ['plugin_id', 'shiko.metric']],
		]);
	});

	it('rejects ids that are not maps', async () => {
		sessionClient({});

		expect(
			(await DELETE(request('DELETE'), params('shiko.metric', 'nope'))).status
		).toBe(404);
	});
});
