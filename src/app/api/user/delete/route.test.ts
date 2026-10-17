jest.mock('next/server', () => ({
	NextResponse: {
		json: (body: unknown, init?: ResponseInit) =>
			({
				status: init?.status ?? 200,
				json: async () => body,
			}) as Response,
	},
}));

// The route is wrapped in auth/body validation; hand the handler a fixed user and clients.
const mockContext = {
	user: { id: 'user-1', email: 'ada@example.com', is_anonymous: false },
	userClient: undefined as unknown,
};
jest.mock('@/helpers/api/with-auth-validation', () => ({
	withAuthValidation:
		(
			schema: { parse: (body: unknown) => unknown },
			handler: (...args: unknown[]) => unknown
		) =>
		async (req: { json: () => Promise<unknown> }) =>
			handler(
				req,
				schema.parse(await req.json()),
				mockContext.userClient,
				mockContext.user
			),
}));

const mockOrder: string[] = [];
const mockAdmin = {
	rpc: jest.fn(),
	from: jest.fn(),
	auth: { admin: { deleteUser: jest.fn() } },
};
jest.mock('@/helpers/supabase/server', () => ({
	createServiceRoleClient: () => mockAdmin,
}));

const mockRevoke = jest.fn();
jest.mock('@/lib/polar', () => ({
	createPolarClient: () => ({ subscriptions: { revoke: mockRevoke } }),
}));

const mockSendEmail = jest.fn();
jest.mock('@/lib/email', () => ({
	sendAccountDeletionEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

import { DELETE } from './route';

function userClientWithProSubscription() {
	const single = (data: unknown) => ({
		select: () => ({
			eq: () => ({
				single: async () => ({ data }),
				in: () => ({ single: async () => ({ data }) }),
			}),
		}),
	});

	return {
		from: (table: string) =>
			table === 'user_profiles'
				? single({
						full_name: 'Ada',
						display_name: 'Ada',
						email: 'ada@example.com',
					})
				: single({ polar_subscription_id: 'sub_1', status: 'active' }),
	};
}

function request(body: unknown) {
	return { json: async () => body } as Request;
}

beforeEach(() => {
	jest.clearAllMocks();
	mockOrder.length = 0;
	mockContext.user = {
		id: 'user-1',
		email: 'ada@example.com',
		is_anonymous: false,
	};
	mockContext.userClient = userClientWithProSubscription();

	mockAdmin.rpc.mockImplementation(async (name: string) => {
		mockOrder.push(`rpc:${name}`);
		return { data: {}, error: null };
	});
	mockAdmin.from.mockImplementation((table: string) => ({
		delete: () => ({
			eq: async (column: string) => {
				mockOrder.push(`delete:${table}.${column}`);
				return { error: null };
			},
		}),
		update: () => ({ eq: async () => ({ error: null }) }),
	}));
	mockAdmin.auth.admin.deleteUser.mockImplementation(async () => {
		mockOrder.push('deleteUser');
		return { error: null };
	});
	mockRevoke.mockImplementation(async () => {
		mockOrder.push('polar:revoke');
	});
	mockSendEmail.mockResolvedValue({ success: true });
});

describe('DELETE /api/user/delete', () => {
	it('keeps the person’s contributions to other people’s maps before cancelling or deleting anything', async () => {
		const response = await DELETE(request({ confirmEmail: 'ada@example.com' }));

		expect(response.status).toBe(200);
		expect(mockAdmin.rpc).toHaveBeenCalledWith('reassign_contributions', {
			p_from: 'user-1',
		});
		expect(mockOrder[0]).toBe('rpc:reassign_contributions');
		expect(mockOrder.indexOf('polar:revoke')).toBeGreaterThan(0);
		expect(mockOrder.indexOf('deleteUser')).toBe(mockOrder.length - 1);
		expect(mockSendEmail).toHaveBeenCalledWith('ada@example.com', 'Ada');
	});

	it('stops before cancelling Pro or deleting anything when the contributions cannot be kept', async () => {
		mockAdmin.rpc.mockResolvedValue({
			data: null,
			error: { message: 'boom' },
		});

		const response = await DELETE(request({ confirmEmail: 'ada@example.com' }));

		expect(response.status).toBe(500);
		expect(mockRevoke).not.toHaveBeenCalled();
		expect(mockAdmin.from).not.toHaveBeenCalled();
		expect(mockAdmin.auth.admin.deleteUser).not.toHaveBeenCalled();
		expect(mockSendEmail).not.toHaveBeenCalled();
	});

	it('rejects a confirmation email that is not the account’s', async () => {
		const response = await DELETE(
			request({ confirmEmail: 'someone@else.com' })
		);

		expect(response.status).toBe(400);
		expect(mockAdmin.rpc).not.toHaveBeenCalled();
	});

	it('does not let guests delete through this route', async () => {
		mockContext.user = {
			id: 'guest-1',
			email: 'ada@example.com',
			is_anonymous: true,
		};

		const response = await DELETE(request({ confirmEmail: 'ada@example.com' }));

		expect(response.status).toBe(403);
		expect(mockAdmin.rpc).not.toHaveBeenCalled();
	});
});
