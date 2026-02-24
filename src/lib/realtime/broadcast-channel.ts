'use client';

/**
 * Broadcast Channel Manager (Yjs/PartyKit adapter)
 *
 * Keeps the existing API surface while routing sync/presence/cursor
 * traffic through Yjs + PartyKit instead of Supabase broadcasts.
 */

import {
	applyYjsGraphMutation,
	cleanupAllYjsRooms,
	clearYjsAwarenessPresence,
	replaceYjsGraphState,
	sendYjsSyncEvent,
	setYjsAwarenessPresence,
	subscribeToYjsAwareness,
	subscribeToYjsGraphMutations,
	subscribeToYjsSyncEvents,
	type ReplaceYjsGraphStateInput,
	type YjsGraphMutation,
	type YjsPresenceMap,
} from '@/lib/realtime/yjs-provider';
import { getMindMapRoomName } from '@/lib/realtime/room-names';
import type { RealtimeChannel } from '@supabase/supabase-js';

// =====================================================
// EVENT TYPES
// =====================================================

export const BROADCAST_EVENTS = {
	// Node events
	NODE_CREATE: 'node:create',
	NODE_UPDATE: 'node:update',
	NODE_DELETE: 'node:delete',
	// Edge events
	EDGE_CREATE: 'edge:create',
	EDGE_UPDATE: 'edge:update',
	EDGE_DELETE: 'edge:delete',
	// History events
	HISTORY_REVERT: 'history:revert',
} as const;

export type BroadcastEventType =
	(typeof BROADCAST_EVENTS)[keyof typeof BROADCAST_EVENTS];

// =====================================================
// PAYLOAD TYPES
// =====================================================

export type NodeBroadcastPayload = {
	/** The node ID */
	id: string;
	/** Full node data (for create/update) */
	data?: Record<string, unknown>;
	/** User ID who made the change */
	userId: string;
	/** Timestamp of the change */
	timestamp: number;
};

export type EdgeBroadcastPayload = {
	/** The edge ID */
	id: string;
	/** Full edge data (for create/update) */
	data?: Record<string, unknown>;
	/** User ID who made the change */
	userId: string;
	/** Timestamp of the change */
	timestamp: number;
};

export type HistoryRevertPayload = {
	/** The history entry ID reverted to */
	historyEntryId: string;
	/** User ID who triggered the revert */
	userId: string;
	/** Timestamp of the revert */
	timestamp: number;
};

export type BroadcastPayload =
	| NodeBroadcastPayload
	| EdgeBroadcastPayload
	| HistoryRevertPayload;

type ChannelStatus = 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED';

type BroadcastListener = (payload: { payload: unknown }) => void;
type PresenceSyncListener = () => void;
type StatusListener = (status: ChannelStatus, err?: Error) => void;
type SyncEventHandlers = {
	onNodeCreate?: (payload: NodeBroadcastPayload) => void;
	onNodeUpdate?: (payload: NodeBroadcastPayload) => void;
	onNodeDelete?: (payload: NodeBroadcastPayload) => void;
	onEdgeCreate?: (payload: EdgeBroadcastPayload) => void;
	onEdgeUpdate?: (payload: EdgeBroadcastPayload) => void;
	onEdgeDelete?: (payload: EdgeBroadcastPayload) => void;
	onHistoryRevert?: (payload: HistoryRevertPayload) => void;
};

function isSyncRoom(roomName: string): boolean {
	return roomName.endsWith(':sync');
}

function getActorIdFromRecord(
	record: Record<string, unknown> | null | undefined
): string {
	const actorId = record?.user_id;
	return typeof actorId === 'string' ? actorId : '';
}

function getTimestampFromRecord(
	record: Record<string, unknown> | null | undefined
): number | null {
	const updatedAt = record?.updated_at;
	if (typeof updatedAt === 'string') {
		const parsed = Date.parse(updatedAt);
		if (!Number.isNaN(parsed)) return parsed;
	}
	return null;
}

const MUTATION_EVENT_MAP: Record<string, BroadcastEventType> = {
	'node:add': BROADCAST_EVENTS.NODE_CREATE,
	'node:update': BROADCAST_EVENTS.NODE_UPDATE,
	'node:delete': BROADCAST_EVENTS.NODE_DELETE,
	'edge:add': BROADCAST_EVENTS.EDGE_CREATE,
	'edge:update': BROADCAST_EVENTS.EDGE_UPDATE,
	'edge:delete': BROADCAST_EVENTS.EDGE_DELETE,
};

function toBroadcastEnvelopeFromGraphMutation(
	mutation: YjsGraphMutation
): { event: BroadcastEventType; payload: BroadcastPayload } | null {
	const event = MUTATION_EVENT_MAP[`${mutation.entity}:${mutation.action}`];
	if (!event) return null;

	const actorId =
		(typeof mutation.actorId === 'string' ? mutation.actorId : null) ||
		getActorIdFromRecord(mutation.value) ||
		getActorIdFromRecord(mutation.oldValue) ||
		'';
	const timestamp =
		(typeof mutation.timestampMs === 'number' &&
		Number.isFinite(mutation.timestampMs)
			? mutation.timestampMs
			: null) ??
		getTimestampFromRecord(mutation.value) ??
		getTimestampFromRecord(mutation.oldValue) ??
		Date.now();

	return {
		event,
		payload: {
			id: mutation.id,
			data: mutation.action !== 'delete' ? (mutation.value ?? undefined) : undefined,
			userId: actorId,
			timestamp,
		},
	};
}

function dispatchSyncEnvelopeToHandlers(
	event: string,
	payload: unknown,
	handlers: SyncEventHandlers
): void {
	switch (event) {
		case BROADCAST_EVENTS.NODE_CREATE:
			handlers.onNodeCreate?.(payload as NodeBroadcastPayload);
			break;
		case BROADCAST_EVENTS.NODE_UPDATE:
			handlers.onNodeUpdate?.(payload as NodeBroadcastPayload);
			break;
		case BROADCAST_EVENTS.NODE_DELETE:
			handlers.onNodeDelete?.(payload as NodeBroadcastPayload);
			break;
		case BROADCAST_EVENTS.EDGE_CREATE:
			handlers.onEdgeCreate?.(payload as EdgeBroadcastPayload);
			break;
		case BROADCAST_EVENTS.EDGE_UPDATE:
			handlers.onEdgeUpdate?.(payload as EdgeBroadcastPayload);
			break;
		case BROADCAST_EVENTS.EDGE_DELETE:
			handlers.onEdgeDelete?.(payload as EdgeBroadcastPayload);
			break;
		case BROADCAST_EVENTS.HISTORY_REVERT:
			handlers.onHistoryRevert?.(payload as HistoryRevertPayload);
			break;
		default:
			break;
	}
}

function hasGraphEventHandlers(handlers: SyncEventHandlers): boolean {
	return Boolean(
		handlers.onNodeCreate ||
			handlers.onNodeUpdate ||
			handlers.onNodeDelete ||
			handlers.onEdgeCreate ||
			handlers.onEdgeUpdate ||
			handlers.onEdgeDelete
	);
}

function hasHistoryEventHandler(handlers: SyncEventHandlers): boolean {
	return Boolean(handlers.onHistoryRevert);
}

class YjsRealtimeChannelAdapter {
	private readonly roomName: string;
	private readonly broadcastListeners = new Map<
		string,
		Set<BroadcastListener>
	>();
	private readonly presenceSyncListeners = new Set<PresenceSyncListener>();
	private readonly statusListeners = new Set<StatusListener>();

	private cleanupSync: (() => void) | null = null;
	private cleanupGraph: (() => void) | null = null;
	private cleanupAwareness: (() => void) | null = null;
	private awarenessState: YjsPresenceMap = {};
	private subscribed = false;
	private closed = false;
	private setupPromise: Promise<void> | null = null;

	constructor(roomName: string) {
		this.roomName = roomName;
	}

	on(
		type: 'broadcast' | 'presence',
		filter: { event: string },
		callback: BroadcastListener | PresenceSyncListener
	): RealtimeChannel {
		if (type === 'broadcast' && filter?.event) {
			const listeners = this.broadcastListeners.get(filter.event) ?? new Set();
			listeners.add(callback as BroadcastListener);
			this.broadcastListeners.set(filter.event, listeners);
		}

		if (type === 'presence' && filter?.event === 'sync') {
			this.presenceSyncListeners.add(callback as PresenceSyncListener);
		}

		return this.asRealtimeChannel();
	}

	subscribe(statusCallback?: StatusListener): RealtimeChannel {
		if (statusCallback) {
			this.statusListeners.add(statusCallback);
		}

		if (this.closed) {
			this.emitStatus('CLOSED');
			return this.asRealtimeChannel();
		}

		if (this.subscribed) {
			this.emitStatus('SUBSCRIBED');
			return this.asRealtimeChannel();
		}

		if (!this.setupPromise) {
			this.setupPromise = this.setup();
		}

		return this.asRealtimeChannel();
	}

	async send(payload: {
		type: 'broadcast';
		event: string;
		payload?: unknown;
	}): Promise<void> {
		if (this.closed) return;
		if (payload.type !== 'broadcast' || !payload.event) return;

		// Wait for setup to complete before sending (prevents race with subscribe)
		if (this.setupPromise) {
			await this.setupPromise;
		}

		if (isSyncRoom(this.roomName)) {
			const applied = await applyYjsGraphMutation(
				this.roomName,
				payload.event,
				payload.payload ?? null
			);
			if (applied) return;
		}

		await sendYjsSyncEvent(
			this.roomName,
			payload.event,
			payload.payload ?? null
		);
	}

	async track(payload: Record<string, unknown>): Promise<void> {
		if (this.closed) return;
		await setYjsAwarenessPresence(this.roomName, payload);
	}

	presenceState<T>(): Record<string, T[]> {
		return this.awarenessState as unknown as Record<string, T[]>;
	}

	async unsubscribe(): Promise<void> {
		if (this.closed) return;

		this.closed = true;
		this.subscribed = false;
		this.setupPromise = null;

		if (this.cleanupSync) {
			this.cleanupSync();
			this.cleanupSync = null;
		}

		if (this.cleanupGraph) {
			this.cleanupGraph();
			this.cleanupGraph = null;
		}

		if (this.cleanupAwareness) {
			this.cleanupAwareness();
			this.cleanupAwareness = null;
		}

		await clearYjsAwarenessPresence(this.roomName);
		this.emitStatus('CLOSED');

		this.broadcastListeners.clear();
		this.presenceSyncListeners.clear();
		this.statusListeners.clear();
	}

	private async setup(): Promise<void> {
		try {
			const graphListenersEnabled = this.hasGraphBroadcastListeners();
			const syncRoom = isSyncRoom(this.roomName);
			const subscribeGraph = syncRoom && graphListenersEnabled;

			if (subscribeGraph) {
				this.cleanupGraph = await subscribeToYjsGraphMutations(
					this.roomName,
					(mutation) => {
						const graphEnvelope = toBroadcastEnvelopeFromGraphMutation(mutation);
						if (!graphEnvelope) return;
						this.dispatchBroadcastEvent(
							graphEnvelope.event,
							graphEnvelope.payload
						);
					}
				);
			}

			const subscribeSync =
				!syncRoom ||
				this.hasHistoryBroadcastListener() ||
				!graphListenersEnabled;

			if (subscribeSync) {
				this.cleanupSync = await subscribeToYjsSyncEvents(
					this.roomName,
					(envelope) => {
						this.dispatchBroadcastEvent(envelope.event, envelope.payload);
					}
				);
			}

			this.cleanupAwareness = await subscribeToYjsAwareness(
				this.roomName,
				(presenceMap) => {
					this.awarenessState = presenceMap;
					for (const listener of this.presenceSyncListeners) {
						listener();
					}
				}
			);

			this.subscribed = true;
			this.emitStatus('SUBSCRIBED');
		} catch (error) {
			this.subscribed = false;
			this.setupPromise = null;
			this.emitStatus(
				'CHANNEL_ERROR',
				error instanceof Error
					? error
					: new Error('Failed to subscribe to Yjs room')
			);
		}
	}

	private dispatchBroadcastEvent(event: string, payload: unknown): void {
		const listeners = this.broadcastListeners.get(event);
		if (!listeners || listeners.size === 0) return;

		for (const listener of listeners) {
			listener({ payload });
		}
	}

	private emitStatus(status: ChannelStatus, err?: Error): void {
		for (const listener of this.statusListeners) {
			listener(status, err);
		}

		if (
			status === 'SUBSCRIBED' ||
			status === 'CHANNEL_ERROR' ||
			status === 'CLOSED'
		) {
			this.statusListeners.clear();
		}
	}

	private hasGraphBroadcastListeners(): boolean {
		return Boolean(
			this.broadcastListeners.get(BROADCAST_EVENTS.NODE_CREATE)?.size ||
				this.broadcastListeners.get(BROADCAST_EVENTS.NODE_UPDATE)?.size ||
				this.broadcastListeners.get(BROADCAST_EVENTS.NODE_DELETE)?.size ||
				this.broadcastListeners.get(BROADCAST_EVENTS.EDGE_CREATE)?.size ||
				this.broadcastListeners.get(BROADCAST_EVENTS.EDGE_UPDATE)?.size ||
				this.broadcastListeners.get(BROADCAST_EVENTS.EDGE_DELETE)?.size
		);
	}

	private hasHistoryBroadcastListener(): boolean {
		return Boolean(
			this.broadcastListeners.get(BROADCAST_EVENTS.HISTORY_REVERT)?.size
		);
	}

	private asRealtimeChannel(): RealtimeChannel {
		return this as unknown as RealtimeChannel;
	}
}

// =====================================================
// CHANNEL HELPERS
// =====================================================

const activeSyncChannels = new Map<string, YjsRealtimeChannelAdapter>();
const syncSubscriptionCleanups = new Map<string, Set<() => void>>();

/**
 * Generates the channel name for a map's sync channel.
 * Format: "mind-map:{mapId}:sync"
 */
function getSyncChannelName(mapId: string): string {
	return getMindMapRoomName(mapId, 'sync');
}

/**
 * Generates the channel name for a map's cursor channel.
 * Format: "mind-map:{mapId}:cursor"
 */
export function getCursorChannelName(mapId: string): string {
	return getMindMapRoomName(mapId, 'cursor');
}

/**
 * Generates the channel name for a map's presence channel.
 * Format: "mind-map:{mapId}:presence"
 */
export function getPresenceChannelName(mapId: string): string {
	return getMindMapRoomName(mapId, 'presence');
}

/**
 * Gets or creates a sync channel adapter for a map.
 */
export async function getOrCreateSyncChannel(
	mapId: string
): Promise<RealtimeChannel> {
	const existing = activeSyncChannels.get(mapId);
	if (existing) return existing as unknown as RealtimeChannel;

	const channel = new YjsRealtimeChannelAdapter(getSyncChannelName(mapId));
	activeSyncChannels.set(mapId, channel);
	return channel as unknown as RealtimeChannel;
}

/**
 * Creates a private channel adapter for cursor/presence use.
 */
export async function createPrivateChannel(
	channelName: string
): Promise<RealtimeChannel> {
	return new YjsRealtimeChannelAdapter(
		channelName
	) as unknown as RealtimeChannel;
}

/**
 * Broadcasts an event to all subscribers of a map's sync channel.
 */
export async function broadcast(
	mapId: string,
	event: BroadcastEventType,
	payload: BroadcastPayload
): Promise<void> {
	const roomName = getSyncChannelName(mapId);

	const applied = await applyYjsGraphMutation(roomName, event, payload);
	if (applied) return;

	await sendYjsSyncEvent(roomName, event, payload);
}

export async function replaceGraphState(
	mapId: string,
	input: ReplaceYjsGraphStateInput
): Promise<void> {
	const roomName = getSyncChannelName(mapId);
	await replaceYjsGraphState(roomName, input);
}

/**
 * Subscribes to all sync events for a map.
 */
export async function subscribeToSyncEvents(
	mapId: string,
	handlers: SyncEventHandlers
): Promise<() => void> {
	const roomName = getSyncChannelName(mapId);
	const cleanups: Array<() => void> = [];

	const subscribeGraph = hasGraphEventHandlers(handlers);
	if (subscribeGraph) {
		const cleanupGraph = await subscribeToYjsGraphMutations(
			roomName,
			(mutation) => {
				const graphEnvelope = toBroadcastEnvelopeFromGraphMutation(mutation);
				if (!graphEnvelope) return;
				dispatchSyncEnvelopeToHandlers(
					graphEnvelope.event,
					graphEnvelope.payload,
					handlers
				);
			}
		);
		cleanups.push(cleanupGraph);
	}

	const subscribeSync =
		hasHistoryEventHandler(handlers) || !hasGraphEventHandlers(handlers);

	if (subscribeSync) {
		const cleanupSync = await subscribeToYjsSyncEvents(roomName, (envelope) => {
			dispatchSyncEnvelopeToHandlers(envelope.event, envelope.payload, handlers);
		});
		cleanups.push(cleanupSync);
	}

	const cleanup = () => {
		for (const fn of cleanups) {
			fn();
		}
	};

	if (!syncSubscriptionCleanups.has(mapId)) {
		syncSubscriptionCleanups.set(mapId, new Set());
	}
	const mapCleanups = syncSubscriptionCleanups.get(mapId)!;
	mapCleanups.add(cleanup);

	return () => {
		cleanup();
		const cleanups = syncSubscriptionCleanups.get(mapId);
		if (!cleanups) return;
		cleanups.delete(cleanup);
		if (cleanups.size === 0) {
			syncSubscriptionCleanups.delete(mapId);
		}
	};
}

/**
 * Force unsubscribes from a map's sync subscriptions and channel.
 */
export async function unsubscribeFromSyncChannel(mapId: string): Promise<void> {
	const cleanups = syncSubscriptionCleanups.get(mapId);
	if (cleanups) {
		for (const cleanup of cleanups) {
			cleanup();
		}
		syncSubscriptionCleanups.delete(mapId);
	}

	const channel = activeSyncChannels.get(mapId);
	if (channel) {
		await channel.unsubscribe();
		activeSyncChannels.delete(mapId);
	}
}

/**
 * Legacy no-op for compatibility.
 */
export function resetAuth(): void {
	// No-op: auth is attached per PartyKit request via JWT params.
}

/**
 * Cleans up all active channels/rooms.
 */
export async function cleanupAllChannels(): Promise<void> {
	for (const [mapId, cleanups] of syncSubscriptionCleanups) {
		for (const cleanup of cleanups) {
			cleanup();
		}
		syncSubscriptionCleanups.delete(mapId);
	}

	for (const [mapId, channel] of activeSyncChannels) {
		await channel.unsubscribe();
		activeSyncChannels.delete(mapId);
	}

	cleanupAllYjsRooms();
}
