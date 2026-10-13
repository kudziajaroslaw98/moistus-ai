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
jest.mock('@/lib/notifications/notification-service', () => ({
	createNotifications: jest.fn(async () => []),
}));

import { createClient, createServiceRoleClient } from '@/helpers/supabase/server';
import { createNotifications } from '@/lib/notifications/notification-service';
import { POST } from './route';

type Op = { table: string; op: string; value?: unknown; filters: Array<[string, unknown]> };

/** Service-role fake: canned reads per table, and every write it receives. */
function service(reads: Record<string, unknown>, role = 'admin') {
	const ops: Op[] = [];
	const from = jest.fn((table: string) => {
		const op: Op = { table, op: 'select', filters: [] };
		const builder: Record<string, unknown> = {
			select: () => builder,
			in: (column: string, value: unknown) => (op.filters.push([column, value]), builder),
			eq: (column: string, value: unknown) => (op.filters.push([column, value]), builder),
			maybeSingle: () =>
				Promise.resolve({
					data: table === 'user_profiles' ? { role } : (reads[`${table}:single`] ?? null),
					error: null,
				}),
			update: (value: unknown) => ((op.op = 'update'), (op.value = value), ops.push(op), builder),
			insert: (value: unknown) => ((op.op = 'insert'), (op.value = value), ops.push(op), Promise.resolve({ error: null })),
			then: (resolve: (value: unknown) => void) => resolve({ data: reads[table] ?? [], error: null }),
		};
		return builder;
	});
	jest.mocked(createServiceRoleClient).mockReturnValue({ from } as never);
	return ops;
}

function signedIn(id = 'reviewer') {
	jest.mocked(createClient).mockResolvedValue({
		auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id, is_anonymous: false } }, error: null }) },
	} as never);
}

const moderate = (body: Record<string, unknown>) =>
	POST(new Request('http://localhost/api/admin/plugins/moderate', { method: 'POST', body: JSON.stringify(body) }));

beforeEach(() => jest.clearAllMocks());

describe('POST /api/admin/plugins/moderate', () => {
	it('is not there for people who aren’t reviewers', async () => {
		signedIn('ana');
		service({}, 'user');
		expect((await moderate({ action: 'dismiss', pluginId: 'dev.ana.kanban', version: null })).status).toBe(404);
	});

	it('turns a library plugin off everywhere, closes its reports and tells each map owner', async () => {
		signedIn();
		const ops = service({
			'plugins:single': { id: 'dev.ana.kanban', name: 'Kanban' },
			map_plugins: [{ map_id: 'm1' }, { map_id: 'm2' }],
			mind_maps: [
				{ id: 'm1', user_id: 'owner-1', title: 'Q4 roadmap' },
				{ id: 'm2', user_id: 'owner-2', title: '' },
			],
			nodes: [{ map_id: 'm1' }, { map_id: 'm1' }, { map_id: 'm1' }, { map_id: 'm2' }],
		});

		const response = await moderate({
			action: 'disable',
			pluginId: 'dev.ana.kanban',
			version: null,
			reason: 'Reported for misleading content',
		});

		expect(response.status).toBe(200);
		expect((await response.json()).data).toEqual({ affectedMaps: 2 });
		expect(ops.find((op) => op.table === 'plugins')).toMatchObject({
			op: 'update',
			value: { disabled_reason: 'Reported for misleading content', disabled_by: 'reviewer' },
		});
		expect(ops.find((op) => op.table === 'plugin_reports')).toMatchObject({
			op: 'update',
			value: { status: 'actioned' },
		});
		expect(createNotifications).toHaveBeenCalledWith([
			expect.objectContaining({
				recipientUserId: 'owner-1',
				mapId: 'm1',
				eventType: 'plugin_disabled',
				title: 'Shiko turned off Kanban on Q4 roadmap',
				body: 'Reported for misleading content. Its 3 nodes show their last saved view. Nothing else on the map changed.',
			}),
			expect.objectContaining({
				recipientUserId: 'owner-2',
				title: 'Shiko turned off Kanban on Untitled map',
				body: 'Reported for misleading content. Its node shows its last saved view. Nothing else on the map changed.',
			}),
		]);
	});

	it('turns off Shiko’s own plugins only as a whole, recording it in a new row', async () => {
		signedIn();
		service({});
		expect(
			(await moderate({ action: 'disable', pluginId: 'shiko.kanban', version: '0.1.0', reason: 'x' })).status
		).toBe(400);

		const ops = service({});
		await moderate({ action: 'disable', pluginId: 'shiko.kanban', version: null, reason: 'Broken' });
		expect(ops.find((op) => op.table === 'plugins')).toMatchObject({
			op: 'insert',
			value: { id: 'shiko.kanban', author_id: null, name: 'Kanban', disabled_reason: 'Broken' },
		});
	});

	it('turns a version back on and dismisses reports', async () => {
		signedIn();
		let ops = service({ 'plugins:single': { id: 'dev.ana.kanban', name: 'Kanban' } });
		await moderate({ action: 'enable', pluginId: 'dev.ana.kanban', version: '0.2.0' });
		expect(ops.find((op) => op.table === 'plugin_versions')).toMatchObject({
			op: 'update',
			value: { disabled_reason: null, disabled_at: null },
			filters: expect.arrayContaining([['version', '0.2.0']]),
		});
		expect(createNotifications).not.toHaveBeenCalled();

		ops = service({ 'plugins:single': { id: 'dev.ana.kanban', name: 'Kanban' } });
		await moderate({ action: 'dismiss', pluginId: 'dev.ana.kanban', version: null });
		expect(ops).toEqual([expect.objectContaining({ table: 'plugin_reports', value: expect.objectContaining({ status: 'dismissed' }) })]);
	});
});
