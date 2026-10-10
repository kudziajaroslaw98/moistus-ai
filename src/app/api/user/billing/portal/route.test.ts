jest.mock('next/server', () => ({
	NextResponse: {
		json: (body: unknown, init?: ResponseInit) =>
			({
				status: init?.status ?? 200,
				json: async () => body,
			}) as Response,
		redirect: (url: string) => ({ status: 307, location: url }) as never,
	},
}));

const mockSessionsCreate = jest.fn();

jest.mock('@/lib/polar', () => ({
	createPolarClient: () => ({
		customerSessions: { create: mockSessionsCreate },
	}),
	getAppUrl: () => 'https://app.test',
	getPolarEnvironment: () => 'sandbox',
}));

jest.mock('@/helpers/supabase/server', () => ({
	createClient: jest.fn(),
}));

import { createClient } from '@/helpers/supabase/server';
import { GET, POST } from './route';

const mockedCreateClient = jest.mocked(createClient);

function mockSupabase(
	user: { id: string } | null,
	polarCustomerId: string | null
) {
	const query = {
		select: () => query,
		eq: () => query,
		not: () => query,
		order: () => query,
		limit: () => query,
		maybeSingle: async () => ({
			data: polarCustomerId ? { polar_customer_id: polarCustomerId } : null,
			error: null,
		}),
	};
	mockedCreateClient.mockResolvedValue({
		auth: { getUser: async () => ({ data: { user }, error: null }) },
		from: () => query,
	} as never);
}

describe('/api/user/billing/portal', () => {
	beforeEach(() => {
		mockSessionsCreate.mockReset();
	});

	it('rejects signed-out requests', async () => {
		mockSupabase(null, null);

		const response = await POST();

		expect(response.status).toBe(401);
		expect(mockSessionsCreate).not.toHaveBeenCalled();
	});

	it('explains when there is no billing account yet', async () => {
		mockSupabase({ id: 'user-1' }, null);

		const response = await POST();

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({
			error: 'No billing account found. Subscribe to a plan first.',
		});
	});

	it('answers with the Polar portal link and returns to the billing settings', async () => {
		mockSupabase({ id: 'user-1' }, 'cus_1');
		mockSessionsCreate.mockResolvedValue({
			customer_portal_url: 'https://polar.sh/shiko/portal?token=abc',
		});

		const response = await POST();

		expect(mockSessionsCreate).toHaveBeenCalledWith({
			customer_id: 'cus_1',
			return_url: 'https://app.test/dashboard?settings=billing',
		});
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			url: 'https://polar.sh/shiko/portal?token=abc',
		});
	});

	it('falls back to the app user as external customer when the stored id fails', async () => {
		mockSupabase({ id: 'user-1' }, 'cus_stale');
		mockSessionsCreate
			.mockRejectedValueOnce(new Error('customer not found'))
			.mockResolvedValueOnce({
				customer_portal_url: 'https://polar.sh/shiko/portal?token=xyz',
			});
		jest.spyOn(console, 'error').mockImplementation(() => undefined);

		const response = await POST();

		expect(mockSessionsCreate).toHaveBeenLastCalledWith({
			external_customer_id: 'user-1',
			return_url: 'https://app.test/dashboard?settings=billing',
		});
		expect(await response.json()).toEqual({
			url: 'https://polar.sh/shiko/portal?token=xyz',
		});
	});

	it('reports a Polar failure instead of redirecting nowhere', async () => {
		mockSupabase({ id: 'user-1' }, 'cus_1');
		mockSessionsCreate.mockRejectedValue(new Error('Polar is down'));
		jest.spyOn(console, 'error').mockImplementation(() => undefined);

		const response = await POST();

		expect(response.status).toBe(502);
		expect(mockSessionsCreate).toHaveBeenCalledTimes(2);
	});

	it('keeps redirecting for old links', async () => {
		mockSupabase({ id: 'user-1' }, 'cus_1');
		mockSessionsCreate.mockResolvedValue({
			customer_portal_url: 'https://polar.sh/shiko/portal?token=abc',
		});

		const response = await GET();

		expect(response).toEqual({
			status: 307,
			location: 'https://polar.sh/shiko/portal?token=abc',
		});
	});
});
