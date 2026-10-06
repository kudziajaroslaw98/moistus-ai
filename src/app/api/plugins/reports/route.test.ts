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

import { createClient, createServiceRoleClient } from '@/helpers/supabase/server';
import { POST } from './route';

function setup({ pluginRow = null as unknown, mapVisible = false } = {}) {
	const inserts: unknown[] = [];
	const serviceFrom = jest.fn(() => {
		const builder: Record<string, unknown> = {
			select: () => builder,
			eq: () => builder,
			single: () => Promise.resolve({ data: { id: 'report-1' }, error: null }),
			maybeSingle: () => Promise.resolve({ data: pluginRow, error: null }),
			insert: (value: unknown) => (inserts.push(value), builder),
		};
		return builder;
	});
	jest.mocked(createServiceRoleClient).mockReturnValue({ from: serviceFrom } as never);
	const sessionBuilder: Record<string, unknown> = {
		select: () => sessionBuilder,
		eq: () => sessionBuilder,
		maybeSingle: () => Promise.resolve({ data: mapVisible ? { id: 'map-1' } : null, error: null }),
	};
	jest.mocked(createClient).mockResolvedValue({
		auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'viewer' } }, error: null }) },
		from: () => sessionBuilder,
	} as never);
	return inserts;
}

const MAP = '0a3001a9-8457-4b41-9710-f6167137dfb2';
const report = (body: Record<string, unknown>) =>
	POST(new Request('http://localhost/api/plugins/reports', { method: 'POST', body: JSON.stringify(body) }));

describe('POST /api/plugins/reports', () => {
	it('records a report, with the map only when the reporter can open it', async () => {
		const inserts = setup({ mapVisible: true });
		const response = await report({
			pluginId: 'shiko.kanban',
			version: '0.1.0',
			mapId: MAP,
			reason: 'misleading',
			details: 'A card turned into an ad',
			nodeData: { todo: [{ id: 'a1', text: 'Buy now' }] },
		});
		expect(response.status).toBe(201);
		expect(inserts[0]).toMatchObject({
			plugin_id: 'shiko.kanban',
			version: '0.1.0',
			map_id: 'map-1',
			reporter_id: 'viewer',
			reason: 'misleading',
			node_data: { todo: [{ id: 'a1', text: 'Buy now' }] },
		});

		const hidden = setup({ mapVisible: false });
		await report({ pluginId: 'shiko.kanban', mapId: MAP, reason: 'broken' });
		expect(hidden[0]).toMatchObject({ map_id: null, node_data: null });
	});

	it('refuses plugins that don’t exist and node data over 16 KB', async () => {
		setup({ pluginRow: null });
		expect((await report({ pluginId: 'dev.nobody.thing', reason: 'other' })).status).toBe(404);

		setup({});
		expect(
			(await report({ pluginId: 'shiko.kanban', reason: 'other', nodeData: { big: 'x'.repeat(17000) } })).status
		).toBe(400);
	});
});
