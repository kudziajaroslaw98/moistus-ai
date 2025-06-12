import { getSharedSupabaseClient } from '@/helpers/supabase/shared-client';
import { BroadcastManager } from './broadcast-manager';

export interface NodeLock {
	nodeId: string;
	userId: string;
	userName?: string;
	timestamp: number;
	expiresAt: number;
	type: 'edit' | 'comment' | 'view';
}

export interface LockRequest {
	nodeId: string;
	userId: string;
	userName?: string;
	type: 'edit' | 'comment' | 'view';
	priority?: number;
	callback?: (granted: boolean) => void;
}

export interface LockQueueItem extends LockRequest {
	id: string;
	requestedAt: number;
}

export interface ConflictInfo {
	nodeId: string;
	currentLockHolder: NodeLock;
	conflictingRequest: LockRequest;
	suggestedResolution: 'wait' | 'merge' | 'override' | 'cancel';
}

export interface NodeLockManagerConfig {
	mapId: string;
	userId: string;
	lockDurationMs?: number;
	queueTimeoutMs?: number;
	enableAutoRelease?: boolean;
	onConflict?: (conflict: ConflictInfo) => void;
	onLockAcquired?: (lock: NodeLock) => void;
	onLockReleased?: (nodeId: string, userId: string) => void;
}

export class NodeLockManager {
	private locks: Map<string, NodeLock> = new Map();
	private queue: Map<string, LockQueueItem[]> = new Map();
	private myLocks: Set<string> = new Set();
	private broadcastManager: BroadcastManager | null = null;
	private config: NodeLockManagerConfig;
	private expirationTimers: Map<string, NodeJS.Timeout> = new Map();
	private queueTimers: Map<string, NodeJS.Timeout> = new Map();
	private supabase = getSharedSupabaseClient();

	constructor(config: NodeLockManagerConfig) {
		this.config = {
			lockDurationMs: 30000, // 30 seconds default
			queueTimeoutMs: 10000, // 10 seconds default
			enableAutoRelease: true,
			...config,
		};

		this.initializeBroadcastManager();
	}

	private async initializeBroadcastManager(): Promise<void> {
		this.broadcastManager = new BroadcastManager({
			mapId: this.config.mapId,
			userId: this.config.userId,
			enableLogging: false,
		});

		await this.broadcastManager.connect();

		// Subscribe to lock events
		this.broadcastManager.subscribe('all', (event) => {
			if (event.data?.eventName === 'node_lock') {
				this.handleRemoteLockEvent(event.data);
			}
		});
	}

	async requestLock(request: LockRequest): Promise<boolean> {
		const { nodeId, userId, userName, type } = request;

		// Check if node is already locked
		const existingLock = this.locks.get(nodeId);

		if (existingLock) {
			// If we already have the lock, renew it
			if (existingLock.userId === userId) {
				return this.renewLock(nodeId);
			}

			// Check if existing lock is expired
			if (Date.now() > existingLock.expiresAt) {
				// Force release the expired lock
				await this.forceReleaseLock(nodeId, existingLock.userId);
			} else {
				// Add to queue or handle conflict
				return this.handleLockConflict(request, existingLock);
			}
		}

		// Grant the lock
		const lock: NodeLock = {
			nodeId,
			userId,
			userName,
			timestamp: Date.now(),
			expiresAt: Date.now() + this.config.lockDurationMs!,
			type,
		};

		this.locks.set(nodeId, lock);

		if (userId === this.config.userId) {
			this.myLocks.add(nodeId);
		}

		// Set expiration timer
		this.setExpirationTimer(nodeId, lock);

		// Broadcast lock acquisition
		await this.broadcastLockEvent('acquired', lock);

		// Notify callbacks
		this.config.onLockAcquired?.(lock);
		request.callback?.(true);

		// Process queue for this node
		this.processQueue(nodeId);

		return true;
	}

	async releaseLock(nodeId: string, userId?: string): Promise<boolean> {
		const lock = this.locks.get(nodeId);

		if (!lock) {
			return false;
		}

		// Only the lock holder or system can release
		if (userId && lock.userId !== userId) {
			return false;
		}

		// Clear lock
		this.locks.delete(nodeId);
		this.myLocks.delete(nodeId);

		// Clear expiration timer
		const timer = this.expirationTimers.get(nodeId);

		if (timer) {
			clearTimeout(timer);
			this.expirationTimers.delete(nodeId);
		}

		// Broadcast lock release
		await this.broadcastLockEvent('released', { nodeId, userId: lock.userId });

		// Notify callbacks
		this.config.onLockReleased?.(nodeId, lock.userId);

		// Process queue for this node
		this.processQueue(nodeId);

		return true;
	}

	private async renewLock(nodeId: string): Promise<boolean> {
		const lock = this.locks.get(nodeId);

		if (!lock || lock.userId !== this.config.userId) {
			return false;
		}

		// Update expiration
		lock.expiresAt = Date.now() + this.config.lockDurationMs!;

		// Reset expiration timer
		this.setExpirationTimer(nodeId, lock);

		// Broadcast renewal
		await this.broadcastLockEvent('renewed', lock);

		return true;
	}

	private async forceReleaseLock(
		nodeId: string,
		userId: string
	): Promise<void> {
		await this.releaseLock(nodeId);

		// Log forced release for audit
		try {
			await this.supabase.from('share_access_logs').insert({
				map_id: this.config.mapId,
				user_id: this.config.userId,
				action: 'force_unlock',
				metadata: {
					nodeId,
					previousHolder: userId,
					reason: 'expired',
				},
			});
		} catch (error) {
			console.error('Failed to log force release:', error);
		}
	}

	private handleLockConflict(
		request: LockRequest,
		existingLock: NodeLock
	): boolean {
		const conflict: ConflictInfo = {
			nodeId: request.nodeId,
			currentLockHolder: existingLock,
			conflictingRequest: request,
			suggestedResolution: this.suggestResolution(request, existingLock),
		};

		// Notify about conflict
		this.config.onConflict?.(conflict);

		// Add to queue based on resolution
		if (conflict.suggestedResolution === 'wait') {
			this.addToQueue(request);
			return false;
		}

		// For other resolutions, the UI should handle
		request.callback?.(false);
		return false;
	}

	private suggestResolution(
		request: LockRequest,
		existingLock: NodeLock
	): ConflictInfo['suggestedResolution'] {
		// If existing lock is view-only and request is edit, suggest override
		if (existingLock.type === 'view' && request.type === 'edit') {
			return 'override';
		}

		// If both are comments, suggest merge
		if (existingLock.type === 'comment' && request.type === 'comment') {
			return 'merge';
		}

		// If lock is about to expire soon, suggest wait
		const timeUntilExpire = existingLock.expiresAt - Date.now();

		if (timeUntilExpire < 5000) {
			// Less than 5 seconds
			return 'wait';
		}

		// Default to wait
		return 'wait';
	}

	private addToQueue(request: LockRequest): void {
		const queueItem: LockQueueItem = {
			...request,
			id: crypto.randomUUID(),
			requestedAt: Date.now(),
		};

		const nodeQueue = this.queue.get(request.nodeId) || [];
		nodeQueue.push(queueItem);
		nodeQueue.sort((a, b) => {
			// Sort by priority first, then by request time
			const priorityDiff = (b.priority || 0) - (a.priority || 0);
			return priorityDiff !== 0 ? priorityDiff : a.requestedAt - b.requestedAt;
		});

		this.queue.set(request.nodeId, nodeQueue);

		// Set queue timeout
		const timer = setTimeout(() => {
			this.removeFromQueue(request.nodeId, queueItem.id);
			request.callback?.(false);
		}, this.config.queueTimeoutMs!);

		this.queueTimers.set(queueItem.id, timer);
	}

	private removeFromQueue(nodeId: string, queueItemId: string): void {
		const nodeQueue = this.queue.get(nodeId);
		if (!nodeQueue) return;

		const index = nodeQueue.findIndex((item) => item.id === queueItemId);

		if (index !== -1) {
			nodeQueue.splice(index, 1);

			if (nodeQueue.length === 0) {
				this.queue.delete(nodeId);
			}

			// Clear queue timer
			const timer = this.queueTimers.get(queueItemId);

			if (timer) {
				clearTimeout(timer);
				this.queueTimers.delete(queueItemId);
			}
		}
	}

	private processQueue(nodeId: string): void {
		const nodeQueue = this.queue.get(nodeId);
		if (!nodeQueue || nodeQueue.length === 0) return;

		// Check if node is still locked
		if (this.locks.has(nodeId)) return;

		// Grant lock to first in queue
		const nextRequest = nodeQueue.shift()!;

		// Clear queue timer for this request
		const timer = this.queueTimers.get(nextRequest.id);

		if (timer) {
			clearTimeout(timer);
			this.queueTimers.delete(nextRequest.id);
		}

		// Request lock for queued item
		this.requestLock(nextRequest);
	}

	private setExpirationTimer(nodeId: string, lock: NodeLock): void {
		// Clear existing timer
		const existingTimer = this.expirationTimers.get(nodeId);

		if (existingTimer) {
			clearTimeout(existingTimer);
		}

		// Set new timer
		const timeUntilExpire = lock.expiresAt - Date.now();
		const timer = setTimeout(() => {
			if (this.config.enableAutoRelease) {
				this.releaseLock(nodeId, lock.userId);
			}
		}, timeUntilExpire);

		this.expirationTimers.set(nodeId, timer);
	}

	private async broadcastLockEvent(
		action: 'acquired' | 'released' | 'renewed',
		data: NodeLock | { nodeId: string; userId: string }
	): Promise<void> {
		if (!this.broadcastManager) return;

		await this.broadcastManager.broadcastCustom('node_lock', {
			action,
			...data,
			timestamp: Date.now(),
		});
	}

	private handleRemoteLockEvent(data: any): void {
		const { action, nodeId, userId } = data;

		if (userId === this.config.userId) return; // Ignore own events

		switch (action) {
			case 'acquired':
				// Add remote lock
				const lock: NodeLock = {
					nodeId: data.nodeId,
					userId: data.userId,
					userName: data.userName,
					timestamp: data.timestamp,
					expiresAt: data.expiresAt,
					type: data.type,
				};
				this.locks.set(nodeId, lock);
				this.setExpirationTimer(nodeId, lock);
				break;

			case 'released':
				// Remove remote lock
				this.locks.delete(nodeId);
				this.processQueue(nodeId);
				break;

			case 'renewed':
				// Update expiration
				const existingLock = this.locks.get(nodeId);

				if (existingLock && existingLock.userId === userId) {
					existingLock.expiresAt = data.expiresAt;
					this.setExpirationTimer(nodeId, existingLock);
				}

				break;
		}
	}

	// Public methods for querying lock state
	isLocked(nodeId: string): boolean {
		return this.locks.has(nodeId);
	}

	getLock(nodeId: string): NodeLock | undefined {
		return this.locks.get(nodeId);
	}

	hasLock(nodeId: string): boolean {
		const lock = this.locks.get(nodeId);
		return lock?.userId === this.config.userId;
	}

	getMyLocks(): NodeLock[] {
		return Array.from(this.myLocks)
			.map((nodeId) => this.locks.get(nodeId)!)
			.filter(Boolean);
	}

	getQueueLength(nodeId: string): number {
		return this.queue.get(nodeId)?.length || 0;
	}

	getQueuePosition(nodeId: string, userId: string): number {
		const nodeQueue = this.queue.get(nodeId);
		if (!nodeQueue) return -1;

		const index = nodeQueue.findIndex((item) => item.userId === userId);
		return index;
	}

	// Cleanup
	async disconnect(): Promise<void> {
		// Release all my locks
		for (const nodeId of this.myLocks) {
			await this.releaseLock(nodeId);
		}

		// Clear all timers
		this.expirationTimers.forEach((timer) => clearTimeout(timer));
		this.queueTimers.forEach((timer) => clearTimeout(timer));

		// Disconnect broadcast manager
		if (this.broadcastManager) {
			await this.broadcastManager.disconnect();
		}

		// Clear all data
		this.locks.clear();
		this.queue.clear();
		this.myLocks.clear();
		this.expirationTimers.clear();
		this.queueTimers.clear();
	}
}
