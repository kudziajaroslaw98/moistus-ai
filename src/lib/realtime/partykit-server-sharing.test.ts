import MindMapRealtimeServer from '../../../partykit/server';

const mapId = '11111111-2222-3333-4444-555555555555';
const sharingRoomName = `mind-map:${mapId}:sharing`;
const ownerUserId = 'aaaaaaaa-1111-4111-8111-111111111111';
const otherUserId = 'bbbbbbbb-2222-4222-8222-222222222222';

type MockConnection = {
	send: jest.Mock;
	close: jest.Mock;
	state?: Record<string, unknown>;
	setState: jest.Mock;
};

function installResponsePolyfill(): void {
	if (typeof (globalThis as { Response?: unknown }).Response !== 'undefined') {
		return;
	}

	class MockResponse {
		status: number;
		ok: boolean;
		private readonly payload: string;

		constructor(body?: unknown, init?: { status?: number }) {
			this.status = init?.status ?? 200;
			this.ok = this.status >= 200 && this.status < 300;
			if (typeof body === 'string') {
				this.payload = body;
				return;
			}
			this.payload = body == null ? '' : JSON.stringify(body);
		}

		async text(): Promise<string> {
			return this.payload;
		}

		async json(): Promise<unknown> {
			if (!this.payload) return null;
			return JSON.parse(this.payload);
		}

		static json(body: unknown, init?: { status?: number }): MockResponse {
			return new MockResponse(body, { status: init?.status ?? 200 });
		}
	}

	(globalThis as { Response: unknown }).Response = MockResponse;
}

function createMockRequest(
	url: string,
	options?: {
		method?: string;
		headers?: Record<string, string>;
		body?: unknown;
	}
): Request {
	const method = options?.method ?? 'GET';
	const lowerCaseHeaders = new Map(
		Object.entries(options?.headers ?? {}).map(([key, value]) => [
			key.toLowerCase(),
			value,
		])
	);

	return {
		url,
		method,
		headers: {
			get: (name: string) => lowerCaseHeaders.get(name.toLowerCase()) ?? null,
		},
		json: async () => options?.body,
	} as unknown as Request;
}

function createMockConnection(
	initialState: Record<string, unknown>
): MockConnection {
	const connection: MockConnection = {
		send: jest.fn(),
		close: jest.fn(),
		state: initialState,
		setState: jest.fn((nextState: unknown) => {
			connection.state =
				nextState && typeof nextState === 'object'
					? (nextState as Record<string, unknown>)
					: undefined;
		}),
	};

	return connection;
}

function createSharingHarness(options?: {
	customRoomId?: string;
	taggedOwner?: boolean;
	taggedOther?: boolean;
}) {
	const ownerConnection = createMockConnection({
		userId: ownerUserId,
		mapId,
		channel: 'sharing',
	});
	const otherConnection = createMockConnection({
		userId: otherUserId,
		mapId,
		channel: 'sharing',
	});
	const allConnections = [ownerConnection, otherConnection];

	const getConnections = jest.fn((tag?: string) => {
		if (!tag) {
			return allConnections as unknown[];
		}
		if (tag === `user:${ownerUserId}`) {
			return (options?.taggedOwner ?? true)
				? ([ownerConnection] as unknown[])
				: ([] as unknown[]);
		}
		if (tag === `user:${otherUserId}`) {
			return (options?.taggedOther ?? true)
				? ([otherConnection] as unknown[])
				: ([] as unknown[]);
		}
		return [] as unknown[];
	});

	const room = {
		id: options?.customRoomId ?? sharingRoomName,
		getConnections,
		env: {
			SUPABASE_URL: 'https://supabase.example.com',
			SUPABASE_SERVICE_ROLE: 'service-role',
		},
	} as unknown;

	const server = new MindMapRealtimeServer(room as never);
	return {
		server,
		getConnections,
		ownerConnection,
		otherConnection,
	};
}

function mockJsonResponse(body: unknown, status = 200): Response {
	return {
		ok: status >= 200 && status < 300,
		status,
		text: async () => JSON.stringify(body),
		json: async () => body,
	} as Response;
}

describe('PartyKit sharing realtime channel', () => {
	const originalFetch = (globalThis as { fetch?: typeof fetch }).fetch;

	beforeAll(() => {
		if (
			typeof (globalThis as { TextEncoder?: unknown }).TextEncoder ===
			'undefined'
		) {
			Object.defineProperty(globalThis, 'TextEncoder', {
				value: require('util').TextEncoder,
				configurable: true,
				writable: true,
			});
		}
		if (
			typeof (globalThis as { crypto?: { subtle?: unknown } }).crypto ===
				'undefined' ||
			!(globalThis as { crypto?: { subtle?: unknown } }).crypto?.subtle
		) {
			Object.defineProperty(globalThis, 'crypto', {
				value: require('crypto').webcrypto,
				configurable: true,
				writable: true,
			});
		}
		installResponsePolyfill();
	});

	beforeEach(() => {
		jest.resetAllMocks();
	});

	afterEach(() => {
		if (originalFetch) {
			(globalThis as { fetch: typeof fetch }).fetch = originalFetch;
		} else {
			delete (globalThis as { fetch?: typeof fetch }).fetch;
		}
	});

	it('closes non-owner sharing connections with owner_only', async () => {
		const harness = createSharingHarness();

		const request = createMockRequest(
			`https://example.com/parties/main/${encodeURIComponent(sharingRoomName)}`,
			{
				headers: {
					'x-auth-user-id': otherUserId,
					'x-auth-role': 'editor',
				},
			}
		);

		await harness.server.onConnect(
			harness.otherConnection as never,
			{ request } as never
		);

		expect(harness.otherConnection.close).toHaveBeenCalledWith(
			4403,
			'owner_only'
		);
		expect(harness.otherConnection.send).not.toHaveBeenCalled();
	});

	it('sends sharing snapshot to owner on connect', async () => {
		(globalThis as { fetch: typeof fetch }).fetch = jest.fn().mockResolvedValue(
			mockJsonResponse([
				{
					id: 42,
					map_id: mapId,
					user_id: otherUserId,
					role: 'viewer',
					can_view: true,
					can_comment: false,
					can_edit: false,
					display_name: 'Other User',
					full_name: 'Other User',
					email: 'other@example.com',
					avatar_url: null,
					is_anonymous: false,
					created_at: '2026-02-24T00:00:00.000Z',
					updated_at: '2026-02-24T00:00:00.000Z',
					status: 'active',
				},
			])
		) as never;

		const harness = createSharingHarness();
		const request = createMockRequest(
			`https://example.com/parties/main/${encodeURIComponent(sharingRoomName)}`,
			{
				headers: {
					'x-auth-user-id': ownerUserId,
					'x-auth-role': 'owner',
				},
			}
		);

		await harness.server.onConnect(
			harness.ownerConnection as never,
			{ request } as never
		);

		expect(harness.ownerConnection.close).not.toHaveBeenCalled();
		expect(harness.ownerConnection.send).toHaveBeenCalledTimes(1);

		const payload = harness.ownerConnection.send.mock.calls[0]?.[0];
		expect(typeof payload).toBe('string');
		expect(JSON.parse(payload)).toMatchObject({
			type: 'sharing:collaborators:snapshot',
			mapId,
			collaborators: [
				expect.objectContaining({
					shareId: '42',
					userId: otherUserId,
				}),
			],
		});
	});

	it('rejects malformed collaborator admin payloads', async () => {
		const harness = createSharingHarness();

		const request = createMockRequest(
			`https://example.com/parties/main/${encodeURIComponent(sharingRoomName)}/admin/collaborator-event`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: {
					type: 'sharing:collaborator:remove',
					mapId,
					occurredAt: '2026-02-24T10:00:00.000Z',
					removedShareIds: [],
				},
			}
		);

		const response = await harness.server.onRequest(request as never);
		expect(response.status).toBe(400);
	});

	it('unicasts collaborator admin events only to owner connections', async () => {
		(globalThis as { fetch: typeof fetch }).fetch = jest
			.fn()
			.mockResolvedValue(mockJsonResponse([{ user_id: ownerUserId }])) as never;

		const harness = createSharingHarness();
		const request = createMockRequest(
			`https://example.com/parties/main/${encodeURIComponent(sharingRoomName)}/admin/collaborator-event`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: {
					type: 'sharing:collaborator:remove',
					mapId,
					occurredAt: '2026-02-24T10:05:00.000Z',
					removedShareIds: ['42'],
				},
			}
		);

		const response = await harness.server.onRequest(request as never);
		expect(response.status).toBe(200);
		expect(harness.getConnections).toHaveBeenCalledWith(`user:${ownerUserId}`);
		expect(harness.ownerConnection.send).toHaveBeenCalledTimes(1);
		expect(harness.otherConnection.send).not.toHaveBeenCalled();
	});

	it('accepts encoded sharing room ids for collaborator admin endpoint', async () => {
		(globalThis as { fetch: typeof fetch }).fetch = jest
			.fn()
			.mockResolvedValue(mockJsonResponse([{ user_id: ownerUserId }])) as never;

		const harness = createSharingHarness({
			customRoomId: encodeURIComponent(sharingRoomName),
		});
		const request = createMockRequest(
			`https://example.com/parties/main/${encodeURIComponent(sharingRoomName)}/admin/collaborator-event`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: {
					type: 'sharing:collaborator:remove',
					mapId,
					occurredAt: '2026-02-24T10:10:00.000Z',
					removedShareIds: ['42'],
				},
			}
		);

		const response = await harness.server.onRequest(request as never);
		expect(response.status).toBe(200);
		expect(harness.ownerConnection.send).toHaveBeenCalledTimes(1);
	});
});
