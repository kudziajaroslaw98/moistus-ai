/**
 * @jest-environment node
 */
jest.mock('next/server', () => ({
	NextResponse: {
		json: (body: unknown, init?: ResponseInit) => Response.json(body, init),
	},
}));

jest.mock('@/helpers/supabase/server', () => ({ createClient: jest.fn() }));

import { createClient } from '@/helpers/supabase/server';
import { DELETE, PUT } from './route';

type Result = { data?: unknown; error?: unknown };

/** Chainable stand-in for the Supabase query builder; results are queued per table. */
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
const request = (method: string) =>
	new Request('http://localhost/api', { method });
const params = (pluginId: string, id = MAP_ID) => ({
	params: Promise.resolve({ id, pluginId }),
});

beforeEach(() => jest.clearAllMocks());

describe('PUT /api/maps/[id]/plugins/[pluginId]', () => {
	it('turns a catalog plugin on with the catalog version', async () => {
		const client = sessionClient({
			mind_maps: [{ data: { id: MAP_ID } }],
			map_plugins: [{}],
		});

		const response = await PUT(request('PUT'), params('shiko.metric'));

		expect(response.status).toBe(200);
		expect((await response.json()).data).toEqual({
			pluginId: 'shiko.metric',
			version: '0.1.0',
		});
		const upsert = client.calls.find((call) => call.table === 'map_plugins')
			?.ops[0];
		expect(upsert).toEqual([
			'upsert',
			[
				{
					map_id: MAP_ID,
					plugin_id: 'shiko.metric',
					version: '0.1.0',
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
