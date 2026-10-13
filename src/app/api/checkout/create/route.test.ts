jest.mock('next/server', () => ({
	NextResponse: {
		json: (body: unknown, init?: ResponseInit) =>
			({
				status: init?.status ?? 200,
				json: async () => body,
			}) as Response,
	},
}));

const mockCheckoutsCreate = jest.fn();

jest.mock('@/lib/polar', () => ({
	createPolarClient: () => ({ checkouts: { create: mockCheckoutsCreate } }),
	getProductId: (interval: string) => `product-${interval}`,
	getAppUrl: () => 'https://app.test',
}));

jest.mock('@/helpers/supabase/server', () => ({
	createClient: jest.fn(),
}));

import { createClient } from '@/helpers/supabase/server';
import { POST } from './route';

const mockedCreateClient = jest.mocked(createClient);

function mockSupabaseUser(user: Record<string, unknown>) {
	const query = {
		select: () => query,
		eq: () => query,
		in: () => query,
		single: async () => ({ data: null, error: null }),
	};
	mockedCreateClient.mockResolvedValue({
		auth: { getUser: async () => ({ data: { user } }) },
		from: () => query,
	} as never);
}

describe('POST /api/checkout/create', () => {
	it('rejects checkout requests for plans other than Pro', async () => {
		const request = {
			json: async () => ({
				planId: 'free',
				billingInterval: 'monthly',
			}),
		};

		const response = await POST(request as never);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			error: 'Only the Pro plan can be purchased through checkout',
		});
	});

	it('creates a Polar checkout linked to the app user as external customer', async () => {
		mockSupabaseUser({
			id: 'user-1',
			email: 'person@example.com',
			user_metadata: { full_name: 'Test Person' },
		});
		mockCheckoutsCreate.mockResolvedValue({
			id: 'checkout-1',
			url: 'https://polar.test/checkout-1',
		});

		const response = await POST({
			json: async () => ({ planId: 'pro', billingInterval: 'yearly' }),
		} as never);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			checkoutUrl: 'https://polar.test/checkout-1',
			sessionId: 'checkout-1',
		});
		expect(mockCheckoutsCreate).toHaveBeenCalledWith({
			products: ['product-yearly'],
			success_url: 'https://app.test/dashboard?checkout=success',
			external_customer_id: 'user-1',
			customer_email: 'person@example.com',
			customer_name: 'Test Person',
			metadata: {
				user_id: 'user-1',
				plan_id: 'pro',
				billing_interval: 'yearly',
			},
		});
	});
});
