/**
 * @jest-environment node
 */
import { createHmac } from 'node:crypto';
import subscriptionUpdatedFixture from './__fixtures__/subscription-updated.json';

jest.mock('@/helpers/supabase/server', () => ({
	createServiceRoleClient: jest.fn(),
}));

import { createServiceRoleClient } from '@/helpers/supabase/server';

// Real sandbox `subscription.updated` wire payload (snake_case, personal data replaced).
// The same signed bytes must produce the same DB writes regardless of SDK version.
type WirePayload = typeof subscriptionUpdatedFixture;

const WEBHOOK_SECRET = 'polar_whs_test_secret';
const SUBSCRIPTION_ID = subscriptionUpdatedFixture.data.id;
const USER_ID = subscriptionUpdatedFixture.data.metadata.user_id;
const CUSTOMER_ID = subscriptionUpdatedFixture.data.customer_id;
const PRODUCT_ID = subscriptionUpdatedFixture.data.product_id;

type Op = {
	table: string;
	action: 'select' | 'update' | 'insert';
	payload?: Record<string, unknown>;
	filters: Array<[string, unknown]>;
};

function createFakeSupabase(resolve: (op: Op) => unknown) {
	const ops: Op[] = [];

	const from = (table: string) => {
		const op: Op = { table, action: 'select', filters: [] };
		const settle = () => {
			ops.push(op);
			return Promise.resolve({ data: resolve(op) ?? null, error: null });
		};
		const builder = {
			select: () => builder,
			update: (payload: Record<string, unknown>) => {
				op.action = 'update';
				op.payload = payload;
				return builder;
			},
			insert: (payload: Record<string, unknown>) => {
				op.action = 'insert';
				op.payload = payload;
				return builder;
			},
			eq: (column: string, value: unknown) => {
				op.filters.push([column, value]);
				return builder;
			},
			single: settle,
			maybeSingle: settle,
			then: (
				onFulfilled: (value: unknown) => unknown,
				onRejected?: (reason: unknown) => unknown
			) => settle().then(onFulfilled, onRejected),
		};
		return builder;
	};

	const client = {
		from,
		rpc: jest.fn().mockResolvedValue({ error: null }),
	};

	return { client, ops };
}

function buildPayload(
	type: string,
	dataOverrides: Partial<Record<keyof WirePayload['data'], unknown>> = {}
): string {
	return JSON.stringify({
		...subscriptionUpdatedFixture,
		type,
		data: { ...subscriptionUpdatedFixture.data, ...dataOverrides },
	});
}

// Polar signs `${id}.${timestamp}.${body}` with HMAC-SHA256 keyed by the secret's UTF-8 bytes.
function signedRequest(body: string, secret = WEBHOOK_SECRET): Request {
	const webhookId = 'msg_test_1';
	const timestamp = Math.floor(Date.now() / 1000).toString();
	const signature = createHmac('sha256', Buffer.from(secret, 'utf8'))
		.update(`${webhookId}.${timestamp}.${body}`)
		.digest('base64');

	return new Request('http://localhost/api/webhooks/polar', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'webhook-id': webhookId,
			'webhook-timestamp': timestamp,
			'webhook-signature': `v1,${signature}`,
		},
		body,
	});
}

const mockedCreateServiceRoleClient = jest.mocked(createServiceRoleClient);
let POST: (request: Request) => Promise<Response>;

beforeAll(async () => {
	// The route reads the secret at module load.
	process.env.POLAR_WEBHOOK_SECRET = WEBHOOK_SECRET;
	({ POST } = (await import('./route')) as unknown as {
		POST: (request: Request) => Promise<Response>;
	});
});

describe('POST /api/webhooks/polar', () => {
	it('persists a new subscription from a subscription.created wire payload', async () => {
		const fake = createFakeSupabase((op) => {
			if (op.table === 'subscription_plans') return { id: 'plan-pro-id' };
			return null; // no existing user_subscriptions row
		});
		mockedCreateServiceRoleClient.mockReturnValue(fake.client as never);

		const response = await POST(
			signedRequest(buildPayload('subscription.created'))
		);

		expect(response.status).toBe(200);
		const insert = fake.ops.find(
			(op) => op.table === 'user_subscriptions' && op.action === 'insert'
		);
		expect(insert?.payload).toMatchObject({
			user_id: USER_ID,
			plan_id: 'plan-pro-id',
			polar_subscription_id: SUBSCRIPTION_ID,
			polar_customer_id: CUSTOMER_ID,
			status: 'active',
			current_period_start: '2026-09-16T11:01:04.893Z',
			current_period_end: '2026-10-16T11:01:04.893Z',
			cancel_at_period_end: false,
			canceled_at: null,
			metadata: {
				polar_product_id: PRODUCT_ID,
				billing_interval: 'monthly',
				amount: 1200,
				currency: 'usd',
				polar_modified_at: subscriptionUpdatedFixture.data.modified_at,
			},
		});
	});

	it('maps a paused subscription.updated to restricted access without warnings', async () => {
		const fake = createFakeSupabase((op) => {
			if (op.table === 'user_subscriptions' && op.action === 'select') {
				return {
					id: 'row-1',
					user_id: USER_ID,
					current_period_start: '2026-09-16T11:01:04.893Z',
					metadata: { polar_product_id: PRODUCT_ID },
					plan: { id: 'plan-pro-id', name: 'pro', limits: {} },
				};
			}
			return null;
		});
		mockedCreateServiceRoleClient.mockReturnValue(fake.client as never);

		const response = await POST(
			signedRequest(
				buildPayload('subscription.updated', {
					status: 'paused',
					paused_at: '2026-09-20T00:00:00Z',
				})
			)
		);

		expect(response.status).toBe(200);
		const update = fake.ops.find(
			(op) => op.table === 'user_subscriptions' && op.action === 'update'
		);
		expect(update?.filters).toEqual([['polar_subscription_id', SUBSCRIPTION_ID]]);
		expect(update?.payload).toMatchObject({
			status: 'unpaid',
			cancel_at_period_end: false,
			current_period_end: '2026-10-16T11:01:04.893Z',
		});
		expect(console.warn).not.toHaveBeenCalledWith(
			expect.stringContaining('Unknown subscription status')
		);
	});

	it('records cancel-at-period-end from a subscription.canceled wire payload', async () => {
		const fake = createFakeSupabase((op) =>
			op.table === 'user_subscriptions' && op.action === 'select'
				? { id: 'row-1', metadata: { polar_product_id: PRODUCT_ID } }
				: null
		);
		mockedCreateServiceRoleClient.mockReturnValue(fake.client as never);

		const response = await POST(
			signedRequest(
				buildPayload('subscription.canceled', {
					cancel_at_period_end: true,
					canceled_at: '2026-09-20T12:00:00Z',
				})
			)
		);

		expect(response.status).toBe(200);
		const update = fake.ops.find(
			(op) => op.table === 'user_subscriptions' && op.action === 'update'
		);
		expect(update?.filters).toEqual([['polar_subscription_id', SUBSCRIPTION_ID]]);
		expect(update?.payload).toMatchObject({
			cancel_at_period_end: true,
			canceled_at: '2026-09-20T12:00:00.000Z',
		});
	});

	describe('stale event protection', () => {
		// Stored version is newer than the fixture's modified_at (2026-09-16T11:01:35Z)
		const NEWER_STORED_VERSION = '2026-09-20T00:00:00.000Z';

		function existingRow(polarModifiedAt: string) {
			return createFakeSupabase((op) => {
				if (op.table === 'subscription_plans') return { id: 'plan-pro-id' };
				if (op.table === 'user_subscriptions' && op.action === 'select') {
					return {
						id: 'row-1',
						user_id: USER_ID,
						status: 'canceled',
						current_period_start: '2026-09-16T11:01:04.893Z',
						metadata: {
							polar_product_id: PRODUCT_ID,
							polar_modified_at: polarModifiedAt,
						},
						plan: { id: 'plan-pro-id', name: 'pro', limits: {} },
					};
				}
				return null;
			});
		}

		function writesTo(fake: ReturnType<typeof createFakeSupabase>) {
			return fake.ops.filter(
				(op) =>
					op.table === 'user_subscriptions' &&
					(op.action === 'update' || op.action === 'insert')
			);
		}

		it('ignores a late subscription.created retry after the subscription was revoked', async () => {
			const fake = existingRow(NEWER_STORED_VERSION);
			mockedCreateServiceRoleClient.mockReturnValue(fake.client as never);

			// created/active payloads carry modified_at: null
			const response = await POST(
				signedRequest(
					buildPayload('subscription.created', { modified_at: null })
				)
			);

			expect(response.status).toBe(200);
			expect(writesTo(fake)).toHaveLength(0);
		});

		it.each(['subscription.updated', 'subscription.canceled', 'subscription.uncanceled', 'subscription.revoked'])(
			'ignores a stale %s',
			async (eventType) => {
				const fake = existingRow(NEWER_STORED_VERSION);
				mockedCreateServiceRoleClient.mockReturnValue(fake.client as never);

				const response = await POST(signedRequest(buildPayload(eventType)));

				expect(response.status).toBe(200);
				expect(writesTo(fake)).toHaveLength(0);
			}
		);

		it('still applies an equal-version redelivery and records the version', async () => {
			const fake = existingRow(subscriptionUpdatedFixture.data.modified_at);
			mockedCreateServiceRoleClient.mockReturnValue(fake.client as never);

			const response = await POST(
				signedRequest(buildPayload('subscription.revoked'))
			);

			expect(response.status).toBe(200);
			const [write] = writesTo(fake);
			expect(write?.payload).toMatchObject({
				status: 'canceled',
				metadata: {
					polar_product_id: PRODUCT_ID,
					polar_modified_at: subscriptionUpdatedFixture.data.modified_at,
				},
			});
		});
	});

	describe('events that arrive before the subscription row exists', () => {
		// In-memory user_subscriptions table, so a sequence of deliveries sees
		// what earlier deliveries wrote.
		function statefulFake() {
			let row: Record<string, unknown> | null = null;
			const fake = createFakeSupabase((op) => {
				if (op.table === 'subscription_plans') return { id: 'plan-pro-id' };
				if (op.table !== 'user_subscriptions') return null;
				if (op.action === 'insert') row = { id: 'row-1', ...op.payload };
				if (op.action === 'update' && row) row = { ...row, ...op.payload };
				return op.action === 'select' ? row : null;
			});
			return { fake, getRow: () => row };
		}

		it.each([
			['subscription.revoked', { status: 'canceled' }, { status: 'canceled' }],
			[
				'subscription.canceled',
				{ cancel_at_period_end: true, canceled_at: '2026-09-20T12:00:00Z' },
				{ status: 'active', cancel_at_period_end: true },
			],
			[
				'subscription.uncanceled',
				{},
				{ status: 'active', cancel_at_period_end: false },
			],
		])(
			'persists %s with its version instead of updating nothing',
			async (eventType, overrides, expected) => {
				const { fake, getRow } = statefulFake();
				mockedCreateServiceRoleClient.mockReturnValue(fake.client as never);

				const response = await POST(
					signedRequest(buildPayload(eventType, overrides))
				);

				expect(response.status).toBe(200);
				expect(getRow()).toMatchObject({
					...expected,
					polar_subscription_id: SUBSCRIPTION_ID,
					metadata: expect.objectContaining({
						polar_modified_at: subscriptionUpdatedFixture.data.modified_at,
					}),
				});
			}
		);

		it('keeps a revoked subscription canceled even if the payload status says active', async () => {
			const { fake, getRow } = statefulFake();
			mockedCreateServiceRoleClient.mockReturnValue(fake.client as never);

			await POST(
				signedRequest(
					buildPayload('subscription.revoked', { status: 'active' })
				)
			);

			expect(getRow()).toMatchObject({ status: 'canceled' });
		});

		it('does not re-grant access when a late subscription.created follows an early revoke', async () => {
			const { fake, getRow } = statefulFake();
			mockedCreateServiceRoleClient.mockReturnValue(fake.client as never);

			await POST(
				signedRequest(
					buildPayload('subscription.revoked', { status: 'canceled' })
				)
			);
			const response = await POST(
				signedRequest(
					buildPayload('subscription.created', { modified_at: null })
				)
			);

			expect(response.status).toBe(200);
			expect(getRow()).toMatchObject({ status: 'canceled' });
		});
	});

	it('keeps plan-change metadata when subscription.active updates an existing row', async () => {
		const fake = createFakeSupabase((op) => {
			if (op.table === 'subscription_plans') return { id: 'plan-pro-id' };
			if (op.table === 'user_subscriptions' && op.action === 'select') {
				return {
					id: 'row-1',
					metadata: {
						polar_product_id: PRODUCT_ID,
						previous_plan: 'starter',
						last_plan_change: '2026-09-10T00:00:00.000Z',
						previous_period_start: '2026-08-16T11:01:04.893Z',
						polar_modified_at: '2026-09-10T00:00:00.000Z',
					},
				};
			}
			return null;
		});
		mockedCreateServiceRoleClient.mockReturnValue(fake.client as never);

		const response = await POST(
			signedRequest(buildPayload('subscription.active'))
		);

		expect(response.status).toBe(200);
		const update = fake.ops.find(
			(op) => op.table === 'user_subscriptions' && op.action === 'update'
		);
		expect(update?.payload?.metadata).toEqual({
			polar_product_id: PRODUCT_ID,
			previous_plan: 'starter',
			last_plan_change: '2026-09-10T00:00:00.000Z',
			previous_period_start: '2026-08-16T11:01:04.893Z',
			billing_interval: 'monthly',
			amount: 1200,
			currency: 'usd',
			polar_modified_at: subscriptionUpdatedFixture.data.modified_at,
		});
	});

	it('rejects an invalid signature without touching the database', async () => {
		const fake = createFakeSupabase(() => null);
		mockedCreateServiceRoleClient.mockReturnValue(fake.client as never);

		const response = await POST(
			signedRequest(buildPayload('subscription.created'), 'wrong_secret')
		);

		expect(response.status).toBe(403);
		expect(fake.ops).toHaveLength(0);
	});
});
