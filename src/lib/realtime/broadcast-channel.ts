/**
 * Broadcast Channel Manager
 *
 * Centralized manager for secure real-time broadcast channels.
 * Handles private channel creation with RLS authorization.
 *
 * Architecture:
 * - One sync channel per map: "mind-map:{mapId}:sync"
 * - Channels are private (RLS-protected via realtime.messages policies)
 * - setAuth() called automatically to send JWT to Realtime server
 *
 * Event Types:
 * - node:* - Node create/update/delete events
 * - edge:* - Edge create/update/delete events
 * - history:revert - History revert notifications
 */

import { getSharedSupabaseClient } from '@/helpers/supabase/shared-client';
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

// =====================================================
// CHANNEL MANAGER
// =====================================================

const supabase = getSharedSupabaseClient();

/** Active channels indexed by mapId */
const activeChannels = new Map<string, RealtimeChannel>();

/** Track subscription state per channel (waiting, subscribed, error) */
const channelSubscriptionState = new Map<string, 'pending' | 'subscribed' | 'error'>();

/** Track number of active subscriptions per channel for proper cleanup */
const channelSubscriptionCount = new Map<string, number>();

/** Track if setAuth has been called this session */
let authSet = false;

/**
 * Ensures the Realtime server has the user's JWT for authorization.
 * Must be called before subscribing to private channels.
 */
async function ensureAuth(): Promise<void> {
	if (authSet) return;

	try {
		await supabase.realtime.setAuth();
		authSet = true;
	} catch (error) {
		console.error('[broadcast-channel] Failed to set auth:', error);
		throw error;
	}
}

/**
 * Generates the channel name for a map's sync channel.
 * Format: "mind-map:{mapId}:sync"
 */
function getSyncChannelName(mapId: string): string {
	return `mind-map:${mapId}:sync`;
}

/**
 * Generates the channel name for a map's cursor channel.
 * Format: "mind-map:{mapId}:cursor"
 */
export function getCursorChannelName(mapId: string): string {
	return `mind-map:${mapId}:cursor`;
}

/**
 * Generates the channel name for a map's presence channel.
 * Format: "mind-map:{mapId}:presence"
 */
export function getPresenceChannelName(mapId: string): string {
	return `mind-map:${mapId}:presence`;
}

/**
 * Gets or creates a private broadcast channel for a map.
 * Automatically handles authentication with the Realtime server.
 *
 * @param mapId - The map ID to create/get channel for
 * @returns The RealtimeChannel instance
 */
export async function getOrCreateSyncChannel(
	mapId: string
): Promise<RealtimeChannel> {
	// Check if channel already exists
	const existing = activeChannels.get(mapId);
	if (existing) {
		return existing;
	}

	// Ensure auth is set before creating private channel
	await ensureAuth();

	// Create new private channel
	const channelName = getSyncChannelName(mapId);
	const channel = supabase.channel(channelName, {
		config: { private: true },
	});

	activeChannels.set(mapId, channel);
	return channel;
}

/**
 * Creates a private channel with auth for cursor/presence use.
 * Does not cache the channel (caller manages lifecycle).
 *
 * @param channelName - Full channel name (e.g., "mind-map:abc:cursor")
 * @returns The RealtimeChannel instance
 */
export async function createPrivateChannel(
	channelName: string
): Promise<RealtimeChannel> {
	await ensureAuth();
	return supabase.channel(channelName, {
		config: { private: true },
	});
}

/**
 * Broadcasts an event to all subscribers of a map's sync channel.
 *
 * @param mapId - The map ID to broadcast to
 * @param event - The event type
 * @param payload - The event payload
 */
export async function broadcast(
	mapId: string,
	event: BroadcastEventType,
	payload: BroadcastPayload
): Promise<void> {
	const channel = await getOrCreateSyncChannel(mapId);

	try {
		await channel.send({
			type: 'broadcast',
			event,
			payload,
		});
	} catch (error) {
		console.error(`[broadcast-channel] Failed to send ${event}:`, error);
	}
}

/**
 * Subscribes to all sync events for a map.
 * Supports multiple callers - tracks subscription count and only unsubscribes
 * when all callers have cleaned up.
 *
 * @param mapId - The map ID to subscribe to
 * @param handlers - Event handlers for each event type
 * @returns Cleanup function (decrements subscription count, unsubscribes when 0)
 */
export async function subscribeToSyncEvents(
	mapId: string,
	handlers: {
		onNodeCreate?: (payload: NodeBroadcastPayload) => void;
		onNodeUpdate?: (payload: NodeBroadcastPayload) => void;
		onNodeDelete?: (payload: NodeBroadcastPayload) => void;
		onEdgeCreate?: (payload: EdgeBroadcastPayload) => void;
		onEdgeUpdate?: (payload: EdgeBroadcastPayload) => void;
		onEdgeDelete?: (payload: EdgeBroadcastPayload) => void;
		onHistoryRevert?: (payload: HistoryRevertPayload) => void;
	}
): Promise<() => void> {
	const channel = await getOrCreateSyncChannel(mapId);

	// Register handlers for each event type
	if (handlers.onNodeCreate) {
		channel.on(
			'broadcast',
			{ event: BROADCAST_EVENTS.NODE_CREATE },
			({ payload }) => handlers.onNodeCreate!(payload as NodeBroadcastPayload)
		);
	}
	if (handlers.onNodeUpdate) {
		channel.on(
			'broadcast',
			{ event: BROADCAST_EVENTS.NODE_UPDATE },
			({ payload }) => handlers.onNodeUpdate!(payload as NodeBroadcastPayload)
		);
	}
	if (handlers.onNodeDelete) {
		channel.on(
			'broadcast',
			{ event: BROADCAST_EVENTS.NODE_DELETE },
			({ payload }) => handlers.onNodeDelete!(payload as NodeBroadcastPayload)
		);
	}
	if (handlers.onEdgeCreate) {
		channel.on(
			'broadcast',
			{ event: BROADCAST_EVENTS.EDGE_CREATE },
			({ payload }) => handlers.onEdgeCreate!(payload as EdgeBroadcastPayload)
		);
	}
	if (handlers.onEdgeUpdate) {
		channel.on(
			'broadcast',
			{ event: BROADCAST_EVENTS.EDGE_UPDATE },
			({ payload }) => handlers.onEdgeUpdate!(payload as EdgeBroadcastPayload)
		);
	}
	if (handlers.onEdgeDelete) {
		channel.on(
			'broadcast',
			{ event: BROADCAST_EVENTS.EDGE_DELETE },
			({ payload }) => handlers.onEdgeDelete!(payload as EdgeBroadcastPayload)
		);
	}
	if (handlers.onHistoryRevert) {
		channel.on(
			'broadcast',
			{ event: BROADCAST_EVENTS.HISTORY_REVERT },
			({ payload }) =>
				handlers.onHistoryRevert!(payload as HistoryRevertPayload)
		);
	}

	// Subscribe to the channel only if not already subscribed
	const currentState = channelSubscriptionState.get(mapId);
	if (currentState !== 'subscribed') {
		channelSubscriptionState.set(mapId, 'pending');

		await new Promise<void>((resolve, reject) => {
			channel.subscribe((status) => {
				if (status === 'SUBSCRIBED') {
					channelSubscriptionState.set(mapId, 'subscribed');
					console.log(
						`[broadcast-channel] Subscribed to sync channel: ${mapId}`
					);
					resolve();
				} else if (status === 'CHANNEL_ERROR') {
					channelSubscriptionState.set(mapId, 'error');
					console.error(
						`[broadcast-channel] Failed to subscribe to sync channel: ${mapId}`
					);
					reject(new Error('Channel subscription failed'));
				}
			});
		});
	}

	// Increment subscription count
	const currentCount = channelSubscriptionCount.get(mapId) || 0;
	channelSubscriptionCount.set(mapId, currentCount + 1);

	// Return cleanup function that decrements count and only unsubscribes when count reaches 0
	return () => {
		const count = channelSubscriptionCount.get(mapId) || 0;
		if (count <= 1) {
			// Last subscriber - actually unsubscribe
			channel.unsubscribe();
			activeChannels.delete(mapId);
			channelSubscriptionState.delete(mapId);
			channelSubscriptionCount.delete(mapId);
			console.log(
				`[broadcast-channel] Fully unsubscribed from sync channel: ${mapId}`
			);
		} else {
			// Still have other subscribers
			channelSubscriptionCount.set(mapId, count - 1);
		}
	};
}

/**
 * Force unsubscribes from a map's sync channel, ignoring subscription count.
 * Use this when you need to immediately disconnect (e.g., on page unload).
 *
 * @param mapId - The map ID to unsubscribe from
 */
export async function unsubscribeFromSyncChannel(mapId: string): Promise<void> {
	const channel = activeChannels.get(mapId);
	if (channel) {
		await channel.unsubscribe();
		activeChannels.delete(mapId);
		channelSubscriptionState.delete(mapId);
		channelSubscriptionCount.delete(mapId);
		console.log(
			`[broadcast-channel] Force unsubscribed from sync channel: ${mapId}`
		);
	}
}

/**
 * Resets the auth state (call on logout).
 */
export function resetAuth(): void {
	authSet = false;
}

/**
 * Cleans up all active channels (call on app unmount).
 */
export async function cleanupAllChannels(): Promise<void> {
	for (const [mapId, channel] of activeChannels) {
		await channel.unsubscribe();
		console.log(`[broadcast-channel] Cleaned up channel: ${mapId}`);
	}
	activeChannels.clear();
	channelSubscriptionState.clear();
	channelSubscriptionCount.clear();
	authSet = false;
}
