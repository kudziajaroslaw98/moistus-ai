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

function service(state: { role?: string; row?: Record<string, unknown> | null }) {
	const updates: unknown[] = [];
	const from = jest.fn((table: string) => {
		const builder: Record<string, unknown> = {
			select: () => builder,
			eq: () => builder,
			maybeSingle: () =>
				Promise.resolve({
					data: table === 'user_profiles' ? { role: state.role ?? 'user' } : (state.row ?? null),
					error: null,
				}),
			update: (value: unknown) => {
				updates.push(value);
				const chain: Record<string, unknown> = { eq: () => chain, then: (resolve: (v: unknown) => void) => resolve({ error: null }) };
				return chain;
			},
		};
		return builder;
	});
	jest.mocked(createServiceRoleClient).mockReturnValue({ from } as never);
	return updates;
}

function signedIn(id = 'reviewer') {
	jest.mocked(createClient).mockResolvedValue({
		auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id, is_anonymous: false } }, error: null }) },
	} as never);
}

const inReview = {
	status: 'in_review',
	manifest: { name: 'Issue' },
	permissions: ['node:own', 'network:api.example.org'],
	submitted_by: 'ana',
};
const review = (body: Record<string, unknown>) =>
	POST(
		new Request('http://localhost/api/admin/plugins/review', {
			method: 'POST',
			body: JSON.stringify({ pluginId: 'dev.ana.issue', version: '0.1.0', ...body }),
		})
	);

beforeEach(() => jest.clearAllMocks());

describe('POST /api/admin/plugins/review', () => {
	it('is not there for people who aren’t reviewers', async () => {
		signedIn('ana');
		service({ role: 'user', row: inReview });
		expect((await review({ decision: 'approve' })).status).toBe(404);
	});

	it('publishes the version, keeps only real hosts as the author’s, and tells the author', async () => {
		signedIn();
		const updates = service({ role: 'admin', row: inReview });

		const response = await review({
			decision: 'approve',
			authorHosts: ['api.example.org', 'evil.test'],
		});

		expect(response.status).toBe(200);
		expect(updates[0]).toMatchObject({
			status: 'published',
			reviewed_by: 'reviewer',
			author_hosts: ['api.example.org'],
			published_at: expect.any(String),
		});
		expect(createNotifications).toHaveBeenCalledWith([
			expect.objectContaining({
				recipientUserId: 'ana',
				eventType: 'plugin_review',
				title: 'Issue 0.1.0 is published',
			}),
		]);
	});

	it('needs a message to ask for changes, and sends it to the author', async () => {
		signedIn();
		service({ role: 'admin', row: inReview });
		expect((await review({ decision: 'changes' })).status).toBe(400);

		const updates = service({ role: 'admin', row: inReview });
		await review({ decision: 'changes', message: 'Step can be 0.' });
		expect(updates[0]).toMatchObject({ status: 'changes_requested', review_message: 'Step can be 0.' });
		expect(createNotifications).toHaveBeenCalledWith([
			expect.objectContaining({ title: 'Shiko asked for changes to Issue 0.1.0', body: 'Step can be 0.' }),
		]);
	});

	it('won’t review a version twice', async () => {
		signedIn();
		service({ role: 'admin', row: { ...inReview, status: 'published' } });
		expect((await review({ decision: 'approve' })).status).toBe(409);
	});
});
