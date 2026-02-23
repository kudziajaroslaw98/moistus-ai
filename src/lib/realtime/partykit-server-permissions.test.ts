import MindMapRealtimeServer from '../../../partykit/server';

const mapId = '11111111-2222-3333-4444-555555555555';
const roomName = `mind-map:${mapId}:permissions`;
const targetUserId = 'aaaaaaaa-1111-4111-8111-111111111111';
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
		private readonly payload: string;

		constructor(body?: unknown, init?: { status?: number }) {
			this.status = init?.status ?? 200;
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

function createServerHarness(options?: {
	customRoomId?: string;
	taggedTarget?: boolean;
	taggedOther?: boolean;
}) {
	const targetConnection = createMockConnection({
		userId: targetUserId,
		mapId,
		channel: 'permissions',
	});
	const otherConnection = createMockConnection({
		userId: otherUserId,
		mapId,
		channel: 'permissions',
	});
	const allConnections = [targetConnection, otherConnection];

	const getConnections = jest.fn((tag?: string) => {
		if (!tag) {
			return allConnections as unknown[];
		}
		if (tag === `user:${targetUserId}`) {
			return (options?.taggedTarget ?? true)
				? ([targetConnection] as unknown[])
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
		id: options?.customRoomId ?? roomName,
		getConnections,
	} as unknown;

	const server = new MindMapRealtimeServer(room as never);

	return {
		server,
		getConnections,
		targetConnection,
		otherConnection,
	};
}

describe('PartyKit permissions admin endpoint', () => {
	beforeAll(() => {
		if (typeof (globalThis as { TextEncoder?: unknown }).TextEncoder === 'undefined') {
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

	it('rejects missing or invalid admin token in onBeforeRequest', async () => {
		const url = `https://example.com/parties/main/${encodeURIComponent(roomName)}/admin/permissions-update`;
		const requestWithoutToken = createMockRequest(url, { method: 'POST' });
		const requestWithWrongToken = createMockRequest(url, {
			method: 'POST',
			headers: {
				Authorization: 'Bearer wrong',
			},
		});

		const lobby = {
			env: {
				PARTYKIT_ADMIN_TOKEN: 'secret-token',
			},
		} as never;

		const withoutToken = await MindMapRealtimeServer.onBeforeRequest(
			requestWithoutToken,
			lobby,
			{} as never
		);
		expect((withoutToken as Response).status).toBe(403);

		const withWrongToken = await MindMapRealtimeServer.onBeforeRequest(
			requestWithWrongToken,
			lobby,
			{} as never
		);
		expect((withWrongToken as Response).status).toBe(403);
	});

	it('rejects malformed permission payloads', async () => {
		const harness = createServerHarness();
		const request = createMockRequest(
			`https://example.com/parties/main/${encodeURIComponent(roomName)}/admin/permissions-update`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: {
					mapId,
					targetUserId,
					role: 'viewer',
					can_view: true,
					can_comment: false,
					can_edit: 'nope',
					updatedAt: '2026-02-23T12:00:00.000Z',
				},
			}
		);

		const response = await harness.server.onRequest(request as never);
		expect(response.status).toBe(400);
	});

	it('sends permission updates only to user:{targetUserId} connections', async () => {
		const harness = createServerHarness();

		const request = createMockRequest(
			`https://example.com/parties/main/${encodeURIComponent(roomName)}/admin/permissions-update`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: {
					mapId,
					targetUserId,
					role: 'commentator',
					can_view: true,
					can_comment: true,
					can_edit: false,
					updatedAt: '2026-02-23T12:10:00.000Z',
				},
			}
		);

		const response = await harness.server.onRequest(request as never);
		expect(response.status).toBe(200);

		expect(harness.getConnections).toHaveBeenCalledWith(`user:${targetUserId}`);
		expect(harness.targetConnection.send).toHaveBeenCalledTimes(1);
		expect(harness.otherConnection.send).not.toHaveBeenCalled();
	});

	it('sends access revoked events only to user:{targetUserId} connections', async () => {
		const harness = createServerHarness();

		const request = createMockRequest(
			`https://example.com/parties/main/${encodeURIComponent(roomName)}/admin/access-revoked`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: {
					mapId,
					targetUserId,
					reason: 'access_revoked',
					revokedAt: '2026-02-23T12:15:00.000Z',
				},
			}
		);

		const response = await harness.server.onRequest(request as never);
		expect(response.status).toBe(200);

		expect(harness.getConnections).toHaveBeenCalledWith(`user:${targetUserId}`);
		expect(harness.targetConnection.send).toHaveBeenCalledTimes(1);
		expect(harness.otherConnection.send).not.toHaveBeenCalled();

		const payload = harness.targetConnection.send.mock.calls[0]?.[0];
		expect(typeof payload).toBe('string');
		expect(JSON.parse(payload)).toMatchObject({
			type: 'permissions:revoked',
			mapId,
			targetUserId,
			reason: 'access_revoked',
		});
	});

	it('rejects malformed access revoked payloads', async () => {
		const harness = createServerHarness();

		const request = createMockRequest(
			`https://example.com/parties/main/${encodeURIComponent(roomName)}/admin/access-revoked`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: {
					mapId,
					targetUserId,
					reason: 'nope',
					revokedAt: '2026-02-23T12:20:00.000Z',
				},
			}
		);

		const response = await harness.server.onRequest(request as never);
		expect(response.status).toBe(400);
	});

	it('accepts encoded room ids for access revoked admin endpoint', async () => {
		const harness = createServerHarness({
			customRoomId: encodeURIComponent(roomName),
		});

		const request = createMockRequest(
			`https://example.com/parties/main/${encodeURIComponent(roomName)}/admin/access-revoked`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: {
					mapId,
					targetUserId,
					reason: 'access_revoked',
					revokedAt: '2026-02-23T12:30:00.000Z',
				},
			}
		);

		const response = await harness.server.onRequest(request as never);
		expect(response.status).toBe(200);
		expect(harness.targetConnection.send).toHaveBeenCalledTimes(1);
	});

	it('falls back to connection.state lookup when revoke tag lookup is empty', async () => {
		const harness = createServerHarness({
			taggedTarget: false,
		});

		const request = createMockRequest(
			`https://example.com/parties/main/${encodeURIComponent(roomName)}/admin/revoke`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: {
					mapId,
					userIds: [targetUserId],
					reason: 'access_revoked',
				},
			}
		);

		const response = await harness.server.onRequest(request as never);
		expect(response.status).toBe(200);
		expect(harness.getConnections).toHaveBeenCalledWith(`user:${targetUserId}`);
		expect(harness.getConnections).toHaveBeenCalledWith();
		expect(harness.targetConnection.close).toHaveBeenCalledWith(
			4403,
			'access_revoked'
		);
		expect(harness.otherConnection.close).not.toHaveBeenCalled();
	});
});
