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
import { GET } from './route';

type Result = { data?: unknown; error?: unknown };

/** Chainable stand-in for the Supabase query builder that records each call. */
function sessionClient(result: Result, user: object = USER) {
	const ops: Array<[string, unknown[]]> = [];
	const builder: Record<string, unknown> = new Proxy(
		{},
		{
			get(_target, prop) {
				if (prop === 'then') {
					return (resolve: (value: Result) => void) => resolve(result);
				}
				return (...args: unknown[]) => {
					ops.push([String(prop), args]);
					return builder;
				};
			},
		}
	);
	const from = jest.fn(() => builder);
	jest.mocked(createClient).mockResolvedValue({
		auth: {
			getUser: jest.fn().mockResolvedValue({ data: { user }, error: null }),
		},
		from,
	} as never);
	return { from, ops };
}

const USER = { id: 'owner-1', is_anonymous: false };
const get = () =>
	GET(new Request('http://localhost/api/plugins/maps'), {
		params: Promise.resolve({}),
	});

beforeEach(() => jest.clearAllMocks());

describe('GET /api/plugins/maps', () => {
	it('lists the user’s own maps with the plugins each has on', async () => {
		const client = sessionClient({
			data: [
				{
					id: 'map-1',
					title: 'Roadmap',
					map_plugins: [{ plugin_id: 'shiko.metric', version: '0.1.0' }],
				},
				{ id: 'map-2', title: 'Notes', map_plugins: [] },
			],
			error: null,
		});

		const response = await get();

		expect(response.status).toBe(200);
		expect((await response.json()).data).toEqual({
			maps: [
				{
					id: 'map-1',
					title: 'Roadmap',
					plugins: [{ pluginId: 'shiko.metric', version: '0.1.0' }],
				},
				{ id: 'map-2', title: 'Notes', plugins: [] },
			],
		});
		expect(client.from).toHaveBeenCalledWith('mind_maps');
		expect(client.ops).toEqual(
			expect.arrayContaining([
				['eq', ['user_id', 'owner-1']],
				['eq', ['is_template', false]],
			])
		);
	});

	it('refuses guest sessions', async () => {
		const client = sessionClient({ data: [] }, { id: 'guest', is_anonymous: true });

		expect((await get()).status).toBe(403);
		expect(client.from).not.toHaveBeenCalled();
	});

	it('reports a failed query', async () => {
		sessionClient({ data: null, error: { message: 'boom' } });

		expect((await get()).status).toBe(500);
	});
});
