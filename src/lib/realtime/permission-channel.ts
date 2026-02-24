'use client';

import { getSharedSupabaseClient } from '@/helpers/supabase/shared-client';
import type {
	PermissionRevokedEvent,
	PermissionSnapshotOrUpdateEvent,
	PermissionEvent as SharedPermissionEvent,
} from '@/types/permission-events';
import type { ShareRole } from '@/types/sharing-types';
import { getMindMapRoomName } from './room-names';

const supabase = getSharedSupabaseClient();

export type PermissionEventType = SharedPermissionEvent['type'];
export type PermissionSnapshotEvent = PermissionSnapshotOrUpdateEvent;
export type { PermissionRevokedEvent };
export type PermissionChannelEvent = SharedPermissionEvent;

export type PermissionChannelCallbacks = {
	onEvent: (event: PermissionChannelEvent) => void;
	onOpen?: () => void;
	onClose?: (event: CloseEvent) => void;
	onError?: (event: Event) => void;
};

export type PermissionChannelSubscription = {
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

function normalizeHost(hostOrUrl: string): string {
	try {
		return new URL(hostOrUrl).host;
	} catch {
		return hostOrUrl
			.replace(/^wss?:\/\//, '')
			.replace(/^https?:\/\//, '')
			.replace(/\/+$/, '');
	}
}

function toPartyKitWsBaseUrl(configured?: string): string {
	const trimmed = configured?.trim();
	if (trimmed && trimmed.length > 0) {
		if (trimmed.startsWith('ws://') || trimmed.startsWith('wss://')) {
			return trimmed.replace(/\/+$/, '');
		}
		if (trimmed.startsWith('http://')) {
			return `ws://${trimmed.slice('http://'.length).replace(/\/+$/, '')}`;
		}
		if (trimmed.startsWith('https://')) {
			return `wss://${trimmed.slice('https://'.length).replace(/\/+$/, '')}`;
		}
		const host = normalizeHost(trimmed);
		if (typeof window !== 'undefined') {
			const protocol = window.location.protocol === 'http:' ? 'ws:' : 'wss:';
			return `${protocol}//${host}`;
		}
		return `ws://${host}`;
	}

	if (typeof window !== 'undefined') {
		const protocol = window.location.protocol === 'http:' ? 'ws:' : 'wss:';
		return `${protocol}//${window.location.host}`;
	}

	return 'ws://127.0.0.1:1999';
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

function isPermissionRole(value: unknown): value is ShareRole {
	return (
		value === 'owner' ||
		value === 'editor' ||
		value === 'commentator' ||
		value === 'viewer'
	);
}

function isPermissionEvent(value: unknown): value is PermissionChannelEvent {
	if (!value || typeof value !== 'object') return false;
	const payload = value as Record<string, unknown>;

	if (payload.type === 'permissions:revoked') {
		return (
			typeof payload.mapId === 'string' &&
			typeof payload.targetUserId === 'string' &&
			payload.reason === 'access_revoked' &&
			typeof payload.revokedAt === 'string'
		);
	}

	if (
		payload.type !== 'permissions:snapshot' &&
		payload.type !== 'permissions:update'
	) {
		return false;
	}

	return (
		typeof payload.mapId === 'string' &&
		typeof payload.targetUserId === 'string' &&
		isPermissionRole(payload.role) &&
		typeof payload.can_view === 'boolean' &&
		typeof payload.can_comment === 'boolean' &&
		typeof payload.can_edit === 'boolean' &&
		typeof payload.updatedAt === 'string'
	);
}

function buildPermissionChannelUrl(
	mapId: string,
	token: string | null
): string {
	const baseUrl = toPartyKitWsBaseUrl(process.env.NEXT_PUBLIC_PARTYKIT_URL);
	const partyName = encodeURIComponent(getPartyKitPartyName());
	const roomName = encodeURIComponent(getMindMapRoomName(mapId, 'permissions'));
	const url = new URL(`${baseUrl}/parties/${partyName}/${roomName}`);
	if (token) {
		url.searchParams.set('token', token);
	}
	return url.toString();
}

export async function subscribeToPermissionChannel(
	mapId: string,
	callbacks: PermissionChannelCallbacks
): Promise<PermissionChannelSubscription> {
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
		console.info('[permission-channel] scheduling reconnect', {
			mapId,
			attempt: reconnectAttempt,
			delayMs,
		});
		reconnectTimer = setTimeout(() => {
			reconnectTimer = null;
			void connectSocket().catch((error) => {
				if (isStopped) return;
				console.warn('[permission-channel] reconnect attempt failed', {
					mapId,
					attempt: reconnectAttempt,
					error:
						error instanceof Error ? error.message : 'Unknown reconnect error',
				});
				scheduleReconnect();
			});
		}, delayMs);
	};

	const connectSocket = async (): Promise<void> => {
		if (isStopped) return;
		const token = await getAuthToken();
		const wsUrl = buildPermissionChannelUrl(mapId, token);
		const nextSocket = new WebSocket(wsUrl);
		socket = nextSocket;

		nextSocket.addEventListener('open', () => {
			if (socket !== nextSocket || isStopped) return;
			reconnectAttempt = 0;
			console.info('[permission-channel] connected', { mapId });
			callbacks.onOpen?.();
		});

		nextSocket.addEventListener('error', (event) => {
			if (socket !== nextSocket || isStopped) return;
			console.warn('[permission-channel] socket error', { mapId });
			callbacks.onError?.(event);
		});

		nextSocket.addEventListener('close', (event) => {
			if (socket !== nextSocket) return;
			socket = null;
			callbacks.onClose?.(event);

			if (isStopped) {
				console.info('[permission-channel] closed by client', {
					mapId,
					code: event.code,
					reason: event.reason,
				});
				return;
			}

			console.warn('[permission-channel] socket closed', {
				mapId,
				code: event.code,
				reason: event.reason,
			});

			if (event.code === 4403 && event.reason === 'access_revoked') {
				console.info(
					'[permission-channel] socket closed due to access revoke; reconnect disabled',
					{ mapId }
				);
				return;
			}

			scheduleReconnect();
		});

		nextSocket.addEventListener('message', (event) => {
			if (socket !== nextSocket || isStopped) return;
			try {
				const parsed = JSON.parse(event.data as string) as unknown;
				if (!isPermissionEvent(parsed)) {
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
		throw new Error('Failed to initialize permission WebSocket');
	}

	return {
		get socket() {
			return socket;
		},
		disconnect: () => {
			isStopped = true;
			clearReconnectTimer();
			if (
				socket &&
				(socket.readyState === WebSocket.OPEN ||
					socket.readyState === WebSocket.CONNECTING)
			) {
				socket.close(1000, 'client_unsubscribe');
			}
			socket = null;
		},
	};
}
