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
import type { RecipeDefinition } from '@/lib/extensions/recipe-schema';
import { POST as installRecipe } from './[id]/install/route';
import { DELETE as deleteRecipe, PATCH as updateRecipe } from './[id]/route';
import { GET as listRecipes, POST as createRecipe } from './route';
import { GET as getSharedRecipe } from './shared/[id]/route';

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
	return { from, calls };
}

const USER = { id: 'user-1', is_anonymous: false };
const RECIPE_ID = '0d6f2f4e-8c1b-4a51-9d0e-2b7d3c1f5a01';
const definition: RecipeDefinition = {
	title: 'Pre-mortem',
	description: '',
	icon: 'alert',
	scope: 'node',
	instruction: 'List the likely causes of failure.',
	output: { maxItems: 4, nodeTypes: ['defaultNode'], labels: ['risk'] },
};
const row = (overrides: Record<string, unknown> = {}) => ({
	id: RECIPE_ID,
	definition,
	visibility: 'private',
	source_recipe_id: null,
	install_count: 0,
	updated_at: '2026-10-04T12:00:00.000Z',
	...overrides,
});

function sessionClient(responses: Record<string, Result[]> = {}, user: object | null = USER) {
	const client = fakeClient(responses);
	jest.mocked(createClient).mockResolvedValue({
		auth: { getUser: jest.fn().mockResolvedValue({ data: { user }, error: null }) },
		from: client.from,
	} as never);
	return client;
}

function adminClient(responses: Record<string, Result[]> = {}) {
	const client = fakeClient(responses);
	jest.mocked(createServiceRoleClient).mockReturnValue({ from: client.from } as never);
	return client;
}

const jsonRequest = (method: string, body?: unknown) =>
	new Request('http://localhost/api/recipes', {
		method,
		headers: { 'content-type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => jest.clearAllMocks());

describe('GET /api/recipes', () => {
	it("lists the user's valid recipes and drops rows with a broken definition", async () => {
		sessionClient({
			ai_recipes: [{ data: [row(), row({ id: 'bad', definition: { title: '' } })] }],
		});

		const response = await listRecipes(jsonRequest('GET'));
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.data).toEqual([
			expect.objectContaining({ id: RECIPE_ID, definition, visibility: 'private' }),
		]);
	});

	it('returns nothing for guests without querying', async () => {
		const client = sessionClient({}, { id: 'guest', is_anonymous: true });

		const body = await (await listRecipes(jsonRequest('GET'))).json();

		expect(body.data).toEqual([]);
		expect(client.from).not.toHaveBeenCalled();
	});
});

describe('POST /api/recipes', () => {
	it('saves a valid recipe for the current user', async () => {
		const client = sessionClient({ ai_recipes: [{ count: 3 }, { data: row() }] });

		const response = await createRecipe(jsonRequest('POST', { definition }));

		expect(response.status).toBe(201);
		const insert = client.calls[1].ops.find(([op]) => op === 'insert');
		expect(insert?.[1][0]).toEqual({ user_id: 'user-1', definition });
	});

	it('rejects invalid definitions, guests and users at the limit', async () => {
		sessionClient();
		expect(
			(await createRecipe(jsonRequest('POST', { definition: { ...definition, instruction: '' } })))
				.status
		).toBe(400);

		sessionClient({}, { id: 'guest', is_anonymous: true });
		expect((await createRecipe(jsonRequest('POST', { definition }))).status).toBe(403);

		sessionClient({ ai_recipes: [{ count: 50 }] });
		const limited = await createRecipe(jsonRequest('POST', { definition }));
		expect(limited.status).toBe(409);
		expect((await limited.json()).data).toEqual({
			code: 'RECIPE_LIMIT_REACHED',
			limit: 50,
		});
	});
});

describe('PATCH and DELETE /api/recipes/[id]', () => {
	it("updates only the caller's recipe and reports others as missing", async () => {
		const client = sessionClient({
			ai_recipes: [{ data: row({ visibility: 'unlisted' }) }, { data: null }],
		});

		const ok = await updateRecipe(
			jsonRequest('PATCH', { visibility: 'unlisted' }),
			params(RECIPE_ID)
		);
		expect(ok.status).toBe(200);
		expect(client.calls[0].ops).toEqual(
			expect.arrayContaining([
				['update', [{ visibility: 'unlisted' }]],
				['eq', ['id', RECIPE_ID]],
				['eq', ['user_id', 'user-1']],
			])
		);

		const missing = await updateRecipe(
			jsonRequest('PATCH', { visibility: 'private' }),
			params(RECIPE_ID)
		);
		expect(missing.status).toBe(404);
	});

	it('refuses empty updates and bad ids', async () => {
		sessionClient();
		expect((await updateRecipe(jsonRequest('PATCH', {}), params(RECIPE_ID))).status).toBe(400);
		expect(
			(await updateRecipe(jsonRequest('PATCH', { visibility: 'private' }), params('nope')))
				.status
		).toBe(404);
	});

	it('deletes the caller’s recipe', async () => {
		sessionClient({ ai_recipes: [{ data: { id: RECIPE_ID } }, { data: null }] });

		expect((await deleteRecipe(jsonRequest('DELETE'), params(RECIPE_ID))).status).toBe(200);
		expect((await deleteRecipe(jsonRequest('DELETE'), params(RECIPE_ID))).status).toBe(404);
	});
});

describe('GET /api/recipes/shared/[id]', () => {
	it('returns an unlisted recipe with its author name', async () => {
		adminClient({
			ai_recipes: [{ data: { ...row({ visibility: 'unlisted', install_count: 12 }), user_id: 'author-1' } }],
			user_profiles: [{ data: { display_name: 'Big J' } }],
		});

		const body = await (await getSharedRecipe(jsonRequest('GET'), params(RECIPE_ID))).json();

		expect(body.data).toEqual({
			id: RECIPE_ID,
			definition,
			authorName: 'Big J',
			installCount: 12,
		});
	});

	it('hides private recipes', async () => {
		adminClient({ ai_recipes: [{ data: { ...row(), user_id: 'author-1' } }] });

		expect((await getSharedRecipe(jsonRequest('GET'), params(RECIPE_ID))).status).toBe(404);
	});
});

describe('POST /api/recipes/[id]/install', () => {
	const sharedRow = { data: { ...row({ visibility: 'unlisted', install_count: 2 }), user_id: 'author-1' } };

	it('copies the recipe for the caller and counts the add', async () => {
		sessionClient();
		const admin = adminClient({
			ai_recipes: [sharedRow, { data: null }, { count: 0 }, { data: row({ id: 'copy-1', source_recipe_id: RECIPE_ID }) }, { data: null }],
			user_profiles: [{ data: null }],
		});

		const response = await installRecipe(jsonRequest('POST'), params(RECIPE_ID));

		expect(response.status).toBe(201);
		expect((await response.json()).data).toMatchObject({ id: 'copy-1', sourceRecipeId: RECIPE_ID });
		const tableCalls = admin.calls.filter((call) => call.table === 'ai_recipes');
		expect(tableCalls[3].ops).toContainEqual([
			'insert',
			[{ user_id: 'user-1', definition, source_recipe_id: RECIPE_ID }],
		]);
		expect(tableCalls[4].ops).toContainEqual(['update', [{ install_count: 3 }]]);
	});

	it('returns the existing copy instead of adding it twice', async () => {
		sessionClient();
		const admin = adminClient({
			ai_recipes: [sharedRow, { data: row({ id: 'copy-1', source_recipe_id: RECIPE_ID }) }],
			user_profiles: [{ data: null }],
		});

		const response = await installRecipe(jsonRequest('POST'), params(RECIPE_ID));

		expect(response.status).toBe(200);
		expect(admin.calls.some((call) => call.ops.some(([op]) => op === 'insert'))).toBe(false);
	});

	it('rejects guests and missing recipes', async () => {
		sessionClient({}, { id: 'guest', is_anonymous: true });
		expect((await installRecipe(jsonRequest('POST'), params(RECIPE_ID))).status).toBe(403);

		sessionClient();
		adminClient({ ai_recipes: [{ data: null }] });
		expect((await installRecipe(jsonRequest('POST'), params(RECIPE_ID))).status).toBe(404);
	});
});
