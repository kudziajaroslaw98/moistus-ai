jest.mock('next/server', () => ({
	NextResponse: {
		json: (body: unknown, init?: ResponseInit) =>
			({
				status: init?.status ?? 200,
				json: async () => body,
			}) as Response,
	},
}));

import { POST } from './route';

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
});
