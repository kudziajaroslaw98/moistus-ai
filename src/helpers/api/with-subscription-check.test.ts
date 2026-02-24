/** @jest-environment jsdom */

jest.mock('next/server', () => ({
	NextResponse: {
		json: (body: unknown, init?: ResponseInit) =>
			({
				status: init?.status ?? 200,
				json: async () => body,
			}) as Response,
	},
}));

import type { SupabaseClient, User } from '@supabase/supabase-js';
import {
	checkAIQuota,
	checkCollaboratorLimit,
	getAIUsageCount,
} from './with-subscription-check';

type RpcResponse = {
	data: unknown;
	error: { message: string } | null;
};

type SupabaseMockOptions = {
	userSubscriptionResult?: {
		data: Record<string, unknown> | null;
		error: { message: string } | null;
	};
	shareAccessResult?: {
		count: number | null;
		error: { message: string } | null;
	};
	rpcResponses?: Record<string, RpcResponse>;
};

function createSupabaseMock(options: SupabaseMockOptions = {}): SupabaseClient {
	const userSubscriptionResult = options.userSubscriptionResult ?? {
		data: null,
		error: null,
	};
	const shareAccessResult = options.shareAccessResult ?? {
		count: 0,
		error: null,
	};
	const rpcResponses = options.rpcResponses ?? {};

	const userSubscriptionBuilder: Record<string, unknown> = {};
	userSubscriptionBuilder.select = jest.fn(() => userSubscriptionBuilder);
	userSubscriptionBuilder.eq = jest.fn(() => userSubscriptionBuilder);
	userSubscriptionBuilder.in = jest.fn(() => userSubscriptionBuilder);
	userSubscriptionBuilder.order = jest.fn(() => userSubscriptionBuilder);
	userSubscriptionBuilder.limit = jest.fn(() => userSubscriptionBuilder);
	userSubscriptionBuilder.single = jest
		.fn()
		.mockResolvedValue(userSubscriptionResult);

	const shareAccessBuilder = Promise.resolve(shareAccessResult) as Promise<
		typeof shareAccessResult
	> & {
		select: jest.Mock;
		eq: jest.Mock;
		neq: jest.Mock;
	};
	shareAccessBuilder.select = jest.fn(() => shareAccessBuilder);
	shareAccessBuilder.eq = jest.fn(() => shareAccessBuilder);
	shareAccessBuilder.neq = jest.fn(() => shareAccessBuilder);

	const from = jest.fn((table: string) => {
		if (table === 'user_subscriptions') {
			return userSubscriptionBuilder;
		}
		if (table === 'share_access') {
			return shareAccessBuilder;
		}
		throw new Error(`Unexpected table in mock: ${table}`);
	});

	const rpc = jest.fn(async (fn: string) => {
		const response = rpcResponses[fn];
		if (response) {
			return response;
		}
		return { data: 0, error: null };
	});

	return {
		from,
		rpc,
	} as unknown as SupabaseClient;
}

function createUser(userId = '11111111-1111-4111-8111-111111111111'): User {
	return { id: userId } as User;
}

describe('with-subscription-check', () => {
	it('throws when get_ai_usage RPC returns error', async () => {
		const supabase = createSupabaseMock({
			rpcResponses: {
				get_ai_usage: {
					data: null,
					error: { message: 'rpc failed' },
				},
			},
		});

		await expect(getAIUsageCount(createUser(), supabase)).rejects.toThrow(
			'AI usage counter unavailable: rpc failed'
		);
	});

	it('throws when get_ai_usage RPC returns null data', async () => {
		const supabase = createSupabaseMock({
			rpcResponses: {
				get_ai_usage: {
					data: null,
					error: null,
				},
			},
		});

		await expect(getAIUsageCount(createUser(), supabase)).rejects.toThrow(
			'AI usage counter unavailable: RPC returned null'
		);
	});

	it('fails closed with 503 when usage counter is unavailable in checkAIQuota', async () => {
		const supabase = createSupabaseMock({
			userSubscriptionResult: {
				data: {
					plan: {
						name: 'free',
						limits: { aiSuggestions: 3 },
					},
				},
				error: null,
			},
			rpcResponses: {
				get_ai_usage: {
					data: null,
					error: { message: 'counter offline' },
				},
			},
		});

		const result = await checkAIQuota(createUser(), supabase);

		expect(result.allowed).toBe(false);
		expect(result.isPro).toBe(false);
		expect(result.limit).toBe(3);
		expect(result.remaining).toBe(0);
		expect(result.error).toBeDefined();
		expect(result.error?.status).toBe(503);

		const payload = await (result.error as Response).json();
		expect(payload).toMatchObject({
			error: 'AI usage counter unavailable',
			code: 'USAGE_COUNTER_UNAVAILABLE',
		});
	});

	it('uses explicit safe cap for paid plans missing collaboratorsPerMap', async () => {
		const supabase = createSupabaseMock({
			userSubscriptionResult: {
				data: {
					plan: {
						name: 'pro',
						limits: {},
					},
				},
				error: null,
			},
			shareAccessResult: {
				count: 4,
				error: null,
			},
		});

		const result = await checkCollaboratorLimit(
			supabase,
			'map-1',
			'22222222-2222-4222-8222-222222222222'
		);

		expect(result.limit).toBe(10);
		expect(result.currentCount).toBe(4);
		expect(result.remaining).toBe(6);
		expect(result.allowed).toBe(true);
	});

	it('keeps explicit -1 collaboratorsPerMap as unlimited', async () => {
		const supabase = createSupabaseMock({
			userSubscriptionResult: {
				data: {
					plan: {
						name: 'pro',
						limits: { collaboratorsPerMap: -1 },
					},
				},
				error: null,
			},
		});

		const result = await checkCollaboratorLimit(
			supabase,
			'map-1',
			'22222222-2222-4222-8222-222222222222'
		);

		expect(result).toEqual({
			allowed: true,
			limit: -1,
			remaining: -1,
			currentCount: 0,
		});
	});
});
