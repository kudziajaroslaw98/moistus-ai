import { createClient } from '@/helpers/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface BroadcastEvent {
	type:
		| 'cursor_move'
		| 'node_update'
		| 'node_select'
		| 'node_deselect'
		| 'activity'
		| 'custom';
	userId: string;
	mapId: string;
	timestamp: number;
	data: any;
}

export interface CursorMoveData {
	position: { x: number; y: number };
	viewport?: { x: number; y: number; zoom: number };
}

export interface NodeUpdateData {
	nodeId: string;
	changes: {
		text?: string;
		position?: { x: number; y: number };
		color?: string;
		size?: { width: number; height: number };
		[key: string]: any;
	};
	previousValues?: Record<string, any>;
}

export interface NodeSelectData {
	nodeId: string;
	isMultiSelect?: boolean;
	selectedNodes?: string[];
}

export interface ActivityData {
	activityType: 'edit' | 'comment' | 'view' | 'join' | 'leave';
	nodeId?: string;
	nodeName?: string;
	comment?: string;
	changes?: string[];
}

export type BroadcastCallback = (event: BroadcastEvent) => void;

export interface BroadcastManagerConfig {
	mapId: string;
	userId: string;
	throttleMs?: number;
	enableLogging?: boolean;
}

export class BroadcastManager {
	private supabase = createClient();
	private channel: RealtimeChannel | null = null;
	private config: BroadcastManagerConfig;
	private subscribers: Map<string, Set<BroadcastCallback>> = new Map();
	private throttleTimers: Map<string, NodeJS.Timeout> = new Map();
	private eventQueue: Map<string, BroadcastEvent> = new Map();
	private isConnected = false;
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 5;
	private reconnectDelay = 1000;

	constructor(config: BroadcastManagerConfig) {
		this.config = {
			throttleMs: 50,
			enableLogging: false,
			...config,
		};

		// Initialize subscriber maps for different event types
		const eventTypes = [
			'cursor_move',
			'node_update',
			'node_select',
			'node_deselect',
			'activity',
			'custom',
			'all',
		];
		eventTypes.forEach((type) => {
			this.subscribers.set(type, new Set());
		});
	}

	async connect(): Promise<void> {
		try {
			this.channel = this.supabase.channel(`broadcast-${this.config.mapId}`, {
				config: {
					broadcast: {
						self: false, // Don't receive own events
						ack: false,
					},
				},
			});

			// Subscribe to all broadcast events
			this.channel
				.on('broadcast', { event: '*' }, (payload) => {
					this.handleBroadcastEvent(payload.payload as BroadcastEvent);
				})
				.subscribe((status) => {
					if (status === 'SUBSCRIBED') {
						this.isConnected = true;
						this.reconnectAttempts = 0;
						this.log('Connected to broadcast channel');

						// Notify all subscribers of connection
						this.notifyConnectionChange(true);
					} else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
						this.isConnected = false;
						this.handleDisconnection();
					}
				});
		} catch (error) {
			console.error('Failed to connect broadcast channel:', error);
			this.isConnected = false;
			throw error;
		}
	}

	async disconnect(): Promise<void> {
		if (this.channel) {
			await this.channel.unsubscribe();
			this.channel = null;
		}

		this.isConnected = false;
		this.clearAllThrottleTimers();
		this.eventQueue.clear();
		this.notifyConnectionChange(false);
		this.log('Disconnected from broadcast channel');
	}

	// Subscribe to events
	subscribe(
		eventType: BroadcastEvent['type'] | 'all',
		callback: BroadcastCallback
	): () => void {
		const subscribers = this.subscribers.get(eventType);

		if (subscribers) {
			subscribers.add(callback);
		}

		// Return unsubscribe function
		return () => {
			const subs = this.subscribers.get(eventType);

			if (subs) {
				subs.delete(callback);
			}
		};
	}

	// Broadcast cursor movement
	async broadcastCursorMove(data: CursorMoveData): Promise<void> {
		const event: BroadcastEvent = {
			type: 'cursor_move',
			userId: this.config.userId,
			mapId: this.config.mapId,
			timestamp: Date.now(),
			data,
		};

		await this.broadcastThrottled('cursor_move', event);
	}

	// Broadcast node update
	async broadcastNodeUpdate(data: NodeUpdateData): Promise<void> {
		const event: BroadcastEvent = {
			type: 'node_update',
			userId: this.config.userId,
			mapId: this.config.mapId,
			timestamp: Date.now(),
			data,
		};

		await this.broadcast(event);
	}

	// Broadcast node selection
	async broadcastNodeSelect(data: NodeSelectData): Promise<void> {
		const event: BroadcastEvent = {
			type: 'node_select',
			userId: this.config.userId,
			mapId: this.config.mapId,
			timestamp: Date.now(),
			data,
		};

		await this.broadcast(event);
	}

	// Broadcast node deselection
	async broadcastNodeDeselect(nodeId: string): Promise<void> {
		const event: BroadcastEvent = {
			type: 'node_deselect',
			userId: this.config.userId,
			mapId: this.config.mapId,
			timestamp: Date.now(),
			data: { nodeId },
		};

		await this.broadcast(event);
	}

	// Broadcast activity
	async broadcastActivity(data: ActivityData): Promise<void> {
		const event: BroadcastEvent = {
			type: 'activity',
			userId: this.config.userId,
			mapId: this.config.mapId,
			timestamp: Date.now(),
			data,
		};

		await this.broadcast(event);
	}

	// Broadcast custom event
	async broadcastCustom(eventName: string, data: any): Promise<void> {
		const event: BroadcastEvent = {
			type: 'custom',
			userId: this.config.userId,
			mapId: this.config.mapId,
			timestamp: Date.now(),
			data: {
				eventName,
				...data,
			},
		};

		await this.broadcast(event);
	}

	// Internal broadcast method
	private async broadcast(event: BroadcastEvent): Promise<void> {
		if (!this.isConnected || !this.channel) {
			console.warn('Cannot broadcast: not connected');
			return;
		}

		try {
			await this.channel.send({
				type: 'broadcast',
				event: event.type,
				payload: event,
			});

			this.log(`Broadcasted ${event.type} event`, event);
		} catch (error) {
			console.error('Failed to broadcast event:', error);
			this.handleBroadcastError(error);
		}
	}

	// Throttled broadcast for high-frequency events
	private async broadcastThrottled(
		key: string,
		event: BroadcastEvent
	): Promise<void> {
		// Store the latest event
		this.eventQueue.set(key, event);

		// Clear existing timer
		const existingTimer = this.throttleTimers.get(key);

		if (existingTimer) {
			clearTimeout(existingTimer);
		}

		// Set new timer
		const timer = setTimeout(async () => {
			const queuedEvent = this.eventQueue.get(key);

			if (queuedEvent) {
				await this.broadcast(queuedEvent);
				this.eventQueue.delete(key);
			}

			this.throttleTimers.delete(key);
		}, this.config.throttleMs);

		this.throttleTimers.set(key, timer);
	}

	// Handle incoming broadcast events
	private handleBroadcastEvent(event: BroadcastEvent): void {
		// Don't process own events
		if (event.userId === this.config.userId) {
			return;
		}

		this.log(`Received ${event.type} event`, event);

		// Notify specific event type subscribers
		const typeSubscribers = this.subscribers.get(event.type);

		if (typeSubscribers) {
			typeSubscribers.forEach((callback) => {
				try {
					callback(event);
				} catch (error) {
					console.error('Error in broadcast subscriber:', error);
				}
			});
		}

		// Notify 'all' subscribers
		const allSubscribers = this.subscribers.get('all');

		if (allSubscribers) {
			allSubscribers.forEach((callback) => {
				try {
					callback(event);
				} catch (error) {
					console.error('Error in broadcast subscriber:', error);
				}
			});
		}
	}

	// Handle disconnection and reconnection
	private async handleDisconnection(): Promise<void> {
		this.log('Handling disconnection');

		if (this.reconnectAttempts < this.maxReconnectAttempts) {
			this.reconnectAttempts++;
			const delay =
				this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

			this.log(
				`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`
			);

			setTimeout(async () => {
				try {
					await this.connect();
				} catch (error) {
					console.error('Reconnection failed:', error);
				}
			}, delay);
		} else {
			console.error('Max reconnection attempts reached');
			this.notifyConnectionChange(false);
		}
	}

	// Handle broadcast errors
	private handleBroadcastError(error: any): void {
		console.error('Broadcast error:', error);

		// If it's a connection error, try to reconnect
		if (error.message && error.message.includes('connection')) {
			this.isConnected = false;
			this.handleDisconnection();
		}
	}

	// Notify subscribers of connection changes
	private notifyConnectionChange(connected: boolean): void {
		const connectionEvent: BroadcastEvent = {
			type: 'custom',
			userId: 'system',
			mapId: this.config.mapId,
			timestamp: Date.now(),
			data: {
				eventName: 'connection_change',
				connected,
			},
		};

		// Notify all subscribers
		const allSubscribers = this.subscribers.get('all');

		if (allSubscribers) {
			allSubscribers.forEach((callback) => {
				try {
					callback(connectionEvent);
				} catch (error) {
					console.error('Error notifying connection change:', error);
				}
			});
		}
	}

	// Clear all throttle timers
	private clearAllThrottleTimers(): void {
		this.throttleTimers.forEach((timer) => clearTimeout(timer));
		this.throttleTimers.clear();
	}

	// Logging helper
	private log(message: string, data?: any): void {
		if (this.config.enableLogging) {
			console.log(`[BroadcastManager] ${message}`, data || '');
		}
	}

	// Public getters
	getIsConnected(): boolean {
		return this.isConnected;
	}

	getReconnectAttempts(): number {
		return this.reconnectAttempts;
	}

	getSubscriberCount(eventType: BroadcastEvent['type'] | 'all'): number {
		const subscribers = this.subscribers.get(eventType);
		return subscribers ? subscribers.size : 0;
	}

	// Batch broadcast for multiple events
	async broadcastBatch(events: BroadcastEvent[]): Promise<void> {
		if (!this.isConnected || !this.channel) {
			console.warn('Cannot broadcast batch: not connected');
			return;
		}

		try {
			// Send events sequentially to maintain order
			for (const event of events) {
				await this.broadcast(event);
			}
		} catch (error) {
			console.error('Failed to broadcast batch:', error);
			this.handleBroadcastError(error);
		}
	}

	// Get channel status
	getChannelStatus(): 'connected' | 'connecting' | 'disconnected' {
		if (!this.channel) return 'disconnected';
		if (this.isConnected) return 'connected';
		return 'connecting';
	}
}
