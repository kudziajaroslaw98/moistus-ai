import {
	subscribeToPermissionChannel,
	type PermissionChannelEvent,
} from './permission-channel';

jest.mock('@/helpers/supabase/shared-client', () => ({
	getSharedSupabaseClient: () => ({
		auth: {
			getSession: jest.fn().mockResolvedValue({
				data: { session: { access_token: 'token-123' } },
			}),
		},
	}),
}));

type Listener = (event: any) => void;

class MockWebSocket {
	static CONNECTING = 0;
	static OPEN = 1;
	static CLOSING = 2;
	static CLOSED = 3;
	static instances: MockWebSocket[] = [];

	readonly url: string;
	readyState = MockWebSocket.CONNECTING;
	private listeners = new Map<string, Listener[]>();

	constructor(url: string) {
		this.url = url;
		MockWebSocket.instances.push(this);
	}

	addEventListener(type: string, listener: Listener): void {
		const current = this.listeners.get(type) ?? [];
		current.push(listener);
		this.listeners.set(type, current);
	}

	removeEventListener(type: string, listener: Listener): void {
		const current = this.listeners.get(type) ?? [];
		this.listeners.set(
			type,
			current.filter((entry) => entry !== listener)
		);
	}

	close(code = 1000, reason = ''): void {
		this.readyState = MockWebSocket.CLOSED;
		this.emit('close', { code, reason });
	}

	emitOpen(): void {
		this.readyState = MockWebSocket.OPEN;
		this.emit('open', new Event('open'));
	}

	emitClose(code = 1006, reason = ''): void {
		this.readyState = MockWebSocket.CLOSED;
		this.emit('close', { code, reason });
	}

	emitMessage(payload: unknown): void {
		this.emit('message', {
			data: typeof payload === 'string' ? payload : JSON.stringify(payload),
		});
	}

	private emit(type: string, event: unknown): void {
		const listeners = this.listeners.get(type) ?? [];
		for (const listener of listeners) {
			listener(event);
		}
	}
}

describe('permission-channel reconnect behavior', () => {
	const originalWebSocket = globalThis.WebSocket;

	beforeEach(() => {
		jest.useFakeTimers();
		MockWebSocket.instances = [];
		(globalThis as { WebSocket: typeof WebSocket }).WebSocket =
			MockWebSocket as unknown as typeof WebSocket;
		process.env.NEXT_PUBLIC_PARTYKIT_URL = 'https://partykit.example.com';
		process.env.NEXT_PUBLIC_PARTYKIT_PARTY = 'main';
	});

	afterEach(() => {
		jest.useRealTimers();
		(globalThis as { WebSocket: typeof WebSocket }).WebSocket = originalWebSocket;
	});

	it('reconnects after close and receives snapshot on the new socket', async () => {
		const receivedEvents: PermissionChannelEvent[] = [];
		const onOpen = jest.fn();

		const subscription = await subscribeToPermissionChannel(mapId, {
			onEvent: (event) => receivedEvents.push(event),
			onOpen,
		});

		const firstSocket = MockWebSocket.instances[0];
		expect(firstSocket).toBeDefined();
		firstSocket.emitOpen();

		firstSocket.emitClose(1011, 'server_restart');

		jest.advanceTimersByTime(500);
		await Promise.resolve();
		await Promise.resolve();

		expect(MockWebSocket.instances).toHaveLength(2);
		const secondSocket = MockWebSocket.instances[1];
		secondSocket.emitOpen();
		secondSocket.emitMessage({
			type: 'permissions:snapshot',
			mapId,
			targetUserId,
			role: 'viewer',
			can_view: true,
			can_comment: false,
			can_edit: false,
			updatedAt: '2026-02-23T15:00:00.000Z',
		});

		expect(onOpen).toHaveBeenCalledTimes(2);
		expect(receivedEvents).toHaveLength(1);
		expect(receivedEvents[0]).toMatchObject({
			type: 'permissions:snapshot',
			mapId,
			targetUserId,
			role: 'viewer',
		});

		subscription.disconnect();
	});

	it('does not reconnect after client unsubscribe', async () => {
		const subscription = await subscribeToPermissionChannel(mapId, {
			onEvent: jest.fn(),
		});
		const firstSocket = MockWebSocket.instances[0];
		firstSocket.emitOpen();

		subscription.disconnect();
		jest.advanceTimersByTime(5_000);
		await Promise.resolve();

		expect(MockWebSocket.instances).toHaveLength(1);
	});

	it('does not reconnect after access revoked close', async () => {
		const receivedEvents: PermissionChannelEvent[] = [];
		const subscription = await subscribeToPermissionChannel(mapId, {
			onEvent: (event) => receivedEvents.push(event),
		});
		const firstSocket = MockWebSocket.instances[0];
		firstSocket.emitOpen();

		firstSocket.emitMessage({
			type: 'permissions:revoked',
			mapId,
			targetUserId,
			reason: 'access_revoked',
			revokedAt: '2026-02-23T15:05:00.000Z',
		});
		expect(receivedEvents).toHaveLength(1);
		expect(receivedEvents[0]).toMatchObject({
			type: 'permissions:revoked',
			mapId,
			targetUserId,
			reason: 'access_revoked',
		});

		firstSocket.emitClose(4403, 'access_revoked');
		jest.advanceTimersByTime(10_000);
		await Promise.resolve();
		await Promise.resolve();

		expect(MockWebSocket.instances).toHaveLength(1);
		subscription.disconnect();
	});
});

const mapId = '11111111-2222-3333-4444-555555555555';
const targetUserId = 'aaaaaaaa-1111-4111-8111-111111111111';
