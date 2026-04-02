'use client';

import { resolveBrowserPartyKitWsBaseUrl } from '@/helpers/local-dev-url';
import { getSharedSupabaseClient } from '@/helpers/supabase/shared-client';
import { getUserRealtimeRoomName } from './room-names';

const supabase = getSharedSupabaseClient();

export type NotificationRefreshEvent = {
	type: 'notifications:refresh';
	recipientUserId: string;
	notificationId: string;
	occurredAt: string;
};

export type NotificationChannelCallbacks = {
	onEvent: (event: NotificationRefreshEvent) => void;
	onOpen?: () => void;
	onClose?: (event: CloseEvent) => void;
	onError?: (event: Event) => void;
};

export type NotificationChannelSubscription = {
	readonly socket: WebSocket | null;
	disconnect: () => void;
};

const RECONNECT_BASE_DELAY_MS = 500;
const RECONNECT_MAX_DELAY_MS = 8_000;

function getReconnectDelayMs(attempt: number): number {
	const normalizedAttempt = Math.max(1, attempt);
	const exponential = RECONNECT_BASE_DELAY_MS * 2 ** (normalizedAttempt - 1);
	return Math.min(exponential, RECONNECT_MAX_DELAY_MS);
}

function getPartyKitPartyName(): string {
	const configured = process.env.NEXT_PUBLIC_PARTYKIT_PARTY;
	if (configured && configured.trim().length > 0) {
		return configured.trim();
	}
	return 'main';
}

async function getAuthToken(): Promise<string | null> {
	try {
		const {
			data: { session },
		} = await supabase.auth.getSession();
		return session?.access_token ?? null;
	} catch {
		return null;
	}
}

function isNotificationRefreshEvent(value: unknown): value is NotificationRefreshEvent {
	if (!value || typeof value !== 'object') return false;
	const payload = value as Record<string, unknown>;
	return (
		payload.type === 'notifications:refresh' &&
		typeof payload.recipientUserId === 'string' &&
		typeof payload.notificationId === 'string' &&
		typeof payload.occurredAt === 'string'
	);
}

function buildNotificationChannelUrl(
	userId: string,
	token: string | null
): string {
	const baseUrl = resolveBrowserPartyKitWsBaseUrl();
	const partyName = encodeURIComponent(getPartyKitPartyName());
	const roomName = encodeURIComponent(
		getUserRealtimeRoomName(userId, 'notifications')
	);
	const url = new URL(`${baseUrl}/parties/${partyName}/${roomName}`);
	if (token) {
		url.searchParams.set('token', token);
	}
	return url.toString();
}

/**
 * Subscribes the current user to PartyKit notification refresh events over WebSocket.
 *
 * - Acquires auth via `getAuthToken()` and builds endpoint URL via `buildNotificationChannelUrl()`.
 * - Opens a socket, forwards lifecycle/events to callbacks, and ignores malformed message payloads.
 * - Reconnects with exponential backoff (`getReconnectDelayMs`) using `scheduleReconnect`/`clearReconnectTimer`.
 * - Stops reconnecting once `disconnect()` is called (or `isStopped` is true); disconnect closes with
 *   code `1000` and reason `'client_unsubscribe'`.
 *
 * @param userId Target user id used to derive the notification room name.
 * @param callbacks Channel lifecycle and event handlers.
 * @returns Subscription handle with a live `socket` getter and `disconnect()` method.
 * @throws Error when WebSocket is unavailable or initial connection initialization fails.
 */
export async function subscribeToNotificationChannel(
	userId: string,
	callbacks: NotificationChannelCallbacks
): Promise<NotificationChannelSubscription> {
	if (typeof WebSocket === 'undefined') {
		throw new Error('WebSocket is not available in this environment');
	}

	let socket: WebSocket | null = null;
	let isStopped = false;
	let reconnectAttempt = 0;
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

	const clearReconnectTimer = () => {
		if (reconnectTimer) {
			clearTimeout(reconnectTimer);
			reconnectTimer = null;
		}
	};

	const scheduleReconnect = () => {
		if (isStopped || reconnectTimer) return;
		reconnectAttempt += 1;
		const delayMs = getReconnectDelayMs(reconnectAttempt);
		reconnectTimer = setTimeout(() => {
			reconnectTimer = null;
			void connectSocket().catch(() => {
				if (isStopped) return;
				scheduleReconnect();
			});
		}, delayMs);
	};

	const connectSocket = async (): Promise<void> => {
		if (isStopped) return;
		const token = await getAuthToken();
		const wsUrl = buildNotificationChannelUrl(userId, token);
		const nextSocket = new WebSocket(wsUrl);
		socket = nextSocket;

		nextSocket.addEventListener('open', () => {
			if (socket !== nextSocket || isStopped) return;
			reconnectAttempt = 0;
			callbacks.onOpen?.();
		});

		nextSocket.addEventListener('error', (event) => {
			if (socket !== nextSocket || isStopped) return;
			callbacks.onError?.(event);
		});

		nextSocket.addEventListener('close', (event) => {
			if (socket !== nextSocket) return;
			socket = null;
			callbacks.onClose?.(event);

			if (isStopped) {
				return;
			}

			if (event.code === 4403) {
				scheduleReconnect();
				return;
			}

			scheduleReconnect();
		});

		nextSocket.addEventListener('message', (event) => {
			if (socket !== nextSocket || isStopped) return;
			try {
				const parsed = JSON.parse(event.data as string) as unknown;
				if (!isNotificationRefreshEvent(parsed)) {
					return;
				}
				callbacks.onEvent(parsed);
			} catch {
				// Ignore malformed payloads.
			}
		});
	};

	await connectSocket();
	const initialSocket = socket;
	if (!initialSocket) {
		throw new Error('Failed to initialize notification WebSocket');
	}

	return {
		get socket() {
			return socket;
		},
		disconnect: () => {
			isStopped = true;
			clearReconnectTimer();
			const currentSocket = socket;
			socket = null;
			if (
				currentSocket &&
				(currentSocket.readyState === WebSocket.OPEN ||
					currentSocket.readyState === WebSocket.CONNECTING)
			) {
				currentSocket.close(1000, 'client_unsubscribe');
			}
		},
	};
}
