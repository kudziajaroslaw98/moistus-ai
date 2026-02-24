import {
	subscribeToCollaboratorChannel,
	type CollaboratorChannelCallbacks,
} from './collaborator-channel';
import type { CollaboratorRealtimeEvent } from './collaborator-events';

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

describe('collaborator-channel reconnect behavior', () => {
	const originalWebSocket = globalThis.WebSocket;
	const mapId = '11111111-2222-3333-4444-555555555555';

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

	function createCallbacks(
		receivedEvents: CollaboratorRealtimeEvent[]
	): CollaboratorChannelCallbacks {
		return {
			onEvent: (event) => receivedEvents.push(event),
		};
	}

	it('reconnects after transient close and receives snapshot', async () => {
		const receivedEvents: CollaboratorRealtimeEvent[] = [];
		const onOpen = jest.fn();

		const subscription = await subscribeToCollaboratorChannel(mapId, {
			...createCallbacks(receivedEvents),
			onOpen,
		});

		const firstSocket = MockWebSocket.instances[0];
		firstSocket.emitOpen();
		firstSocket.emitClose(1011, 'server_restart');

		jest.advanceTimersByTime(500);
		await Promise.resolve();
		await Promise.resolve();

		expect(MockWebSocket.instances).toHaveLength(2);
		const secondSocket = MockWebSocket.instances[1];
		secondSocket.emitOpen();
		secondSocket.emitMessage({
			type: 'sharing:collaborators:snapshot',
			mapId,
			occurredAt: '2026-02-24T09:00:00.000Z',
			collaborators: [],
		});

		expect(onOpen).toHaveBeenCalledTimes(2);
		expect(receivedEvents).toHaveLength(1);
		expect(receivedEvents[0]).toMatchObject({
			type: 'sharing:collaborators:snapshot',
			mapId,
		});

		subscription.disconnect();
	});

	it('does not reconnect after owner_only close', async () => {
		const receivedEvents: CollaboratorRealtimeEvent[] = [];
		const subscription = await subscribeToCollaboratorChannel(
			mapId,
			createCallbacks(receivedEvents)
		);
		const firstSocket = MockWebSocket.instances[0];
		firstSocket.emitOpen();

		firstSocket.emitClose(4403, 'owner_only');
		jest.advanceTimersByTime(10_000);
		await Promise.resolve();
		await Promise.resolve();

		expect(MockWebSocket.instances).toHaveLength(1);
		expect(receivedEvents).toHaveLength(0);
		subscription.disconnect();
	});

	it('parses upsert and remove events', async () => {
		const receivedEvents: CollaboratorRealtimeEvent[] = [];
		const subscription = await subscribeToCollaboratorChannel(
			mapId,
			createCallbacks(receivedEvents)
		);
		const firstSocket = MockWebSocket.instances[0];
		firstSocket.emitOpen();

		firstSocket.emitMessage({
			type: 'sharing:collaborator:upsert',
			mapId,
			occurredAt: '2026-02-24T09:05:00.000Z',
			collaborator: {
				shareId: '123',
				mapId,
				userId: 'aaaaaaaa-1111-4111-8111-111111111111',
				role: 'viewer',
				can_view: true,
				can_comment: false,
				can_edit: false,
				display_name: 'Alice',
				full_name: 'Alice Doe',
				email: 'alice@example.com',
				avatar_url: null,
				is_anonymous: false,
				created_at: '2026-02-24T09:04:00.000Z',
				updated_at: '2026-02-24T09:04:00.000Z',
			},
		});

		firstSocket.emitMessage({
			type: 'sharing:collaborator:remove',
			mapId,
			occurredAt: '2026-02-24T09:06:00.000Z',
			removedShareIds: ['123'],
		});

		expect(receivedEvents).toHaveLength(2);
		expect(receivedEvents[0]).toMatchObject({
			type: 'sharing:collaborator:upsert',
		});
		expect(receivedEvents[1]).toMatchObject({
			type: 'sharing:collaborator:remove',
			removedShareIds: ['123'],
		});

		subscription.disconnect();
	});
});

