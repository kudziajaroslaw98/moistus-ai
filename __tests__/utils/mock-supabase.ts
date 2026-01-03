/**
 * Supabase client mock for testing.
 *
 * This provides a mock implementation of the Supabase client
 * that can be used to test components that depend on Supabase
 * without making actual network requests.
 *
 * Usage:
 *   jest.mock('@/helpers/supabase/client', () => ({
 *     createClient: () => mockSupabaseClient
 *   }))
 */

// Type for chainable query builder - using jest.Mock generics for flexibility
type QueryBuilder = {
	select: jest.Mock
	insert: jest.Mock
	update: jest.Mock
	delete: jest.Mock
	upsert: jest.Mock
	eq: jest.Mock
	neq: jest.Mock
	gt: jest.Mock
	gte: jest.Mock
	lt: jest.Mock
	lte: jest.Mock
	like: jest.Mock
	ilike: jest.Mock
	is: jest.Mock
	in: jest.Mock
	contains: jest.Mock
	containedBy: jest.Mock
	order: jest.Mock
	limit: jest.Mock
	range: jest.Mock
	single: jest.Mock
	maybeSingle: jest.Mock
	then: jest.Mock
}

/**
 * Creates a chainable query builder mock.
 * All methods return `this` for chaining, except terminal methods.
 */
function createQueryBuilder(): QueryBuilder {
	const builder: QueryBuilder = {
		select: jest.fn().mockReturnThis(),
		insert: jest.fn().mockReturnThis(),
		update: jest.fn().mockReturnThis(),
		delete: jest.fn().mockReturnThis(),
		upsert: jest.fn().mockReturnThis(),
		eq: jest.fn().mockReturnThis(),
		neq: jest.fn().mockReturnThis(),
		gt: jest.fn().mockReturnThis(),
		gte: jest.fn().mockReturnThis(),
		lt: jest.fn().mockReturnThis(),
		lte: jest.fn().mockReturnThis(),
		like: jest.fn().mockReturnThis(),
		ilike: jest.fn().mockReturnThis(),
		is: jest.fn().mockReturnThis(),
		in: jest.fn().mockReturnThis(),
		contains: jest.fn().mockReturnThis(),
		containedBy: jest.fn().mockReturnThis(),
		order: jest.fn().mockReturnThis(),
		limit: jest.fn().mockReturnThis(),
		range: jest.fn().mockReturnThis(),
		single: jest.fn().mockResolvedValue({ data: null, error: null }),
		maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
		then: jest.fn().mockResolvedValue({ data: [], error: null }),
	}

	// Make select, insert, update, delete return self for chaining
	builder.select.mockReturnValue(builder)
	builder.insert.mockReturnValue(builder)
	builder.update.mockReturnValue(builder)
	builder.delete.mockReturnValue(builder)
	builder.upsert.mockReturnValue(builder)

	return builder
}

/**
 * Mock Supabase realtime channel.
 */
function createMockChannel() {
	const channel = {
		on: jest.fn().mockReturnThis(),
		subscribe: jest.fn().mockReturnThis(),
		unsubscribe: jest.fn().mockResolvedValue('ok'),
		send: jest.fn().mockResolvedValue('ok'),
		track: jest.fn().mockResolvedValue('ok'),
		untrack: jest.fn().mockResolvedValue('ok'),
	}
	return channel
}

/**
 * Mock Supabase storage bucket.
 */
function createMockStorage() {
	return {
		from: jest.fn().mockReturnValue({
			upload: jest.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
			download: jest.fn().mockResolvedValue({ data: new Blob(), error: null }),
			remove: jest.fn().mockResolvedValue({ data: null, error: null }),
			list: jest.fn().mockResolvedValue({ data: [], error: null }),
			getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/test' } }),
			createSignedUrl: jest.fn().mockResolvedValue({ data: { signedUrl: 'https://example.com/signed' }, error: null }),
		}),
	}
}

/**
 * Main mock Supabase client.
 * Can be customized per-test by modifying return values.
 */
export const mockSupabaseClient = {
	// Auth methods
	auth: {
		getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
		getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
		signInWithPassword: jest.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
		signInWithOAuth: jest.fn().mockResolvedValue({ data: { url: '', provider: '' }, error: null }),
		signUp: jest.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
		signOut: jest.fn().mockResolvedValue({ error: null }),
		onAuthStateChange: jest.fn().mockReturnValue({
			data: { subscription: { unsubscribe: jest.fn() } },
		}),
		updateUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
		resetPasswordForEmail: jest.fn().mockResolvedValue({ data: {}, error: null }),
		verifyOtp: jest.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
	},

	// Database query builder
	from: jest.fn().mockImplementation(() => createQueryBuilder()),

	// Realtime channels
	channel: jest.fn().mockImplementation(() => createMockChannel()),
	removeChannel: jest.fn().mockResolvedValue('ok'),
	removeAllChannels: jest.fn().mockResolvedValue([]),

	// Storage
	storage: createMockStorage(),

	// RPC calls
	rpc: jest.fn().mockResolvedValue({ data: null, error: null }),

	// Functions (Edge Functions)
	functions: {
		invoke: jest.fn().mockResolvedValue({ data: null, error: null }),
	},
}

/**
 * Helper to set up mock query responses.
 *
 * @example
 * mockQueryResponse('nodes', [{ id: '1', content: 'Test' }])
 */
export function mockQueryResponse(table: string, data: unknown[]) {
	const builder = createQueryBuilder()
	builder.then.mockResolvedValue({ data, error: null })
	builder.single.mockResolvedValue({ data: data[0] ?? null, error: null })
	mockSupabaseClient.from.mockImplementation((t: string) =>
		t === table ? builder : createQueryBuilder()
	)
	return builder
}

/**
 * Helper to set up mock authentication state.
 *
 * @example
 * mockAuthenticatedUser({ id: 'user-1', email: 'test@example.com' })
 */
export function mockAuthenticatedUser(user: { id: string; email?: string; [key: string]: unknown }) {
	const { id, email, ...rest } = user
	const mockUser = {
		id,
		email: email ?? 'test@example.com',
		app_metadata: {},
		user_metadata: {},
		aud: 'authenticated',
		created_at: new Date().toISOString(),
		...rest,
	}

	mockSupabaseClient.auth.getUser.mockResolvedValue({
		data: { user: mockUser },
		error: null,
	})

	mockSupabaseClient.auth.getSession.mockResolvedValue({
		data: {
			session: {
				user: mockUser,
				access_token: 'mock-token',
				refresh_token: 'mock-refresh',
				expires_in: 3600,
				token_type: 'bearer',
			},
		},
		error: null,
	})

	return mockUser
}

/**
 * Reset all Supabase mocks to default state.
 * Call this in beforeEach() for test isolation.
 */
export function resetSupabaseMocks() {
	mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
	mockSupabaseClient.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
	mockSupabaseClient.from.mockImplementation(() => createQueryBuilder())
	mockSupabaseClient.channel.mockImplementation(() => createMockChannel())
	mockSupabaseClient.rpc.mockResolvedValue({ data: null, error: null })
}
