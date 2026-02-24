'use client';

import { getSharedSupabaseClient } from '@/helpers/supabase/shared-client';
import {
	isCollaboratorRealtimeEvent,
	type CollaboratorRealtimeEvent,
} from './collaborator-events';
import { getMindMapRoomName } from './room-names';

const supabase = getSharedSupabaseClient();

export type CollaboratorChannelCallbacks = {
	onEvent: (event: CollaboratorRealtimeEvent) => void;
	onOpen?: () => void;
	onClose?: (event: CloseEvent) => void;
	onError?: (event: Event) => void;
};

export type CollaboratorChannelSubscription = {
	socket: WebSocket;
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

function buildCollaboratorChannelUrl(mapId: string, token: string | null): string {
	const baseUrl = toPartyKitWsBaseUrl(process.env.NEXT_PUBLIC_PARTYKIT_URL);
	const partyName = encodeURIComponent(getPartyKitPartyName());
	const roomName = encodeURIComponent(getMindMapRoomName(mapId, 'sharing'));
	const url = new URL(`${baseUrl}/parties/${partyName}/${roomName}`);
	if (token) {
		url.searchParams.set('token', token);
	}
	return url.toString();
}

export async function subscribeToCollaboratorChannel(
	mapId: string,
	callbacks: CollaboratorChannelCallbacks
): Promise<CollaboratorChannelSubscription> {
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
		console.info('[collaborator-channel] scheduling reconnect', {
			mapId,
			attempt: reconnectAttempt,
			delayMs,
		});
		reconnectTimer = setTimeout(() => {
			reconnectTimer = null;
			void connectSocket().catch((error) => {
				if (isStopped) return;
				console.warn('[collaborator-channel] reconnect attempt failed', {
					mapId,
					attempt: reconnectAttempt,
					error:
						error instanceof Error
							? error.message
							: 'Unknown reconnect error',
				});
				scheduleReconnect();
			});
		}, delayMs);
	};

	const connectSocket = async (): Promise<void> => {
		if (isStopped) return;
		const token = await getAuthToken();
		const wsUrl = buildCollaboratorChannelUrl(mapId, token);
		const nextSocket = new WebSocket(wsUrl);
		socket = nextSocket;

		nextSocket.addEventListener('open', () => {
			if (socket !== nextSocket || isStopped) return;
			reconnectAttempt = 0;
			console.info('[collaborator-channel] connected', { mapId });
			callbacks.onOpen?.();
		});

		nextSocket.addEventListener('error', (event) => {
			if (socket !== nextSocket || isStopped) return;
			console.warn('[collaborator-channel] socket error', { mapId });
			callbacks.onError?.(event);
		});

		nextSocket.addEventListener('close', (event) => {
			if (socket !== nextSocket) return;
			socket = null;
			callbacks.onClose?.(event);

			if (isStopped) {
				console.info('[collaborator-channel] closed by client', {
					mapId,
					code: event.code,
					reason: event.reason,
				});
				return;
			}

			console.warn('[collaborator-channel] socket closed', {
				mapId,
				code: event.code,
				reason: event.reason,
			});

			if (event.code === 4403 && event.reason === 'owner_only') {
				console.info(
					'[collaborator-channel] socket closed due to owner-only policy; reconnect disabled',
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
				if (!isCollaboratorRealtimeEvent(parsed)) {
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
		throw new Error('Failed to initialize collaborator WebSocket');
	}

	return {
		socket: initialSocket,
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

