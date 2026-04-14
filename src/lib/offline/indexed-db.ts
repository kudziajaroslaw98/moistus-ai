import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { OfflineConflictLogItem, OfflineQueuedOp } from '@/types/offline';

const OFFLINE_DB_NAME = 'shiko-offline-db';
const OFFLINE_DB_VERSION = 1;

interface OfflineSyncState {
	key: string;
	value: unknown;
	updatedAt: string;
}

export interface OfflineMapCacheRecord {
	mapId: string;
	payload: unknown;
	updatedAt: string;
}

export interface WorkspaceCacheRecord {
	key: string;
	payload: unknown;
	updatedAt: string;
}

interface OfflineDBSchema extends DBSchema {
	op_queue: {
		key: string;
		value: OfflineQueuedOp;
		indexes: {
			by_status: OfflineQueuedOp['status'];
			by_queued_at: string;
		};
	};
	sync_state: {
		key: string;
		value: OfflineSyncState;
	};
	map_cache: {
		key: string;
		value: OfflineMapCacheRecord;
		indexes: {
			by_updated_at: string;
		};
	};
	workspace_cache: {
		key: string;
		value: WorkspaceCacheRecord;
		indexes: {
			by_updated_at: string;
		};
	};
	conflict_log: {
		key: string;
		value: OfflineConflictLogItem;
		indexes: {
			by_created_at: string;
			by_op_id: string;
		};
	};
}

let dbPromise: Promise<IDBPDatabase<OfflineDBSchema> | null> | null = null;

const getDB = async (): Promise<IDBPDatabase<OfflineDBSchema> | null> => {
	if (typeof indexedDB === 'undefined') {
		return null;
	}

	if (!dbPromise) {
		dbPromise = openDB<OfflineDBSchema>(OFFLINE_DB_NAME, OFFLINE_DB_VERSION, {
			upgrade(db) {
				if (!db.objectStoreNames.contains('op_queue')) {
					const store = db.createObjectStore('op_queue', { keyPath: 'opId' });
					store.createIndex('by_status', 'status');
					store.createIndex('by_queued_at', 'queuedAt');
				}
				if (!db.objectStoreNames.contains('sync_state')) {
					db.createObjectStore('sync_state', { keyPath: 'key' });
				}
				if (!db.objectStoreNames.contains('map_cache')) {
					const store = db.createObjectStore('map_cache', { keyPath: 'mapId' });
					store.createIndex('by_updated_at', 'updatedAt');
				}
				if (!db.objectStoreNames.contains('workspace_cache')) {
					const store = db.createObjectStore('workspace_cache', { keyPath: 'key' });
					store.createIndex('by_updated_at', 'updatedAt');
				}
				if (!db.objectStoreNames.contains('conflict_log')) {
					const store = db.createObjectStore('conflict_log', { keyPath: 'id' });
					store.createIndex('by_created_at', 'createdAt');
					store.createIndex('by_op_id', 'opId');
				}
			},
		}).catch((error) => {
			dbPromise = null;
			console.warn('[offline] IndexedDB open failed', error);
			return null;
		});
	}

	return await dbPromise;
};

export const enqueueOfflineOp = async (
	operation: OfflineQueuedOp
): Promise<boolean> => {
	const db = await getDB();
	if (!db) {
		return false;
	}
	await db.put('op_queue', operation);
	return true;
};

export const deleteOfflineOp = async (opId: string): Promise<void> => {
	const db = await getDB();
	if (!db) {
		return;
	}
	await db.delete('op_queue', opId);
};

export const updateOfflineOp = async (
	opId: string,
	updates: Partial<OfflineQueuedOp>
): Promise<void> => {
	const db = await getDB();
	if (!db) {
		return;
	}
	const existing = await db.get('op_queue', opId);
	if (!existing) {
		return;
	}

	await db.put('op_queue', {
		...existing,
		...updates,
	});
};

export const getOfflineQueuedOps = async (
	limit = 100
): Promise<OfflineQueuedOp[]> => {
	const db = await getDB();
	if (!db) {
		return [];
	}
	const tx = db.transaction('op_queue', 'readonly');
	const index = tx.store.index('by_queued_at');
	const all = await index.getAll();
	await tx.done;
	return all
		.filter((item) => item.status === 'queued' || item.status === 'processing')
		.slice(0, limit);
};

export const resetProcessingOpsToQueued = async (): Promise<number> => {
	const db = await getDB();
	if (!db) {
		return 0;
	}

	const tx = db.transaction('op_queue', 'readwrite');
	const index = tx.store.index('by_status');
	const processingOps = await index.getAll('processing');

	for (const operation of processingOps) {
		await tx.store.put({
			...operation,
			status: 'queued',
			lastError:
				operation.lastError ??
				'Recovered queued operation after interrupted sync session',
		});
	}

	await tx.done;
	return processingOps.length;
};

export const setOfflineSyncState = async (
	key: string,
	value: unknown
): Promise<void> => {
	const db = await getDB();
	if (!db) {
		return;
	}
	await db.put('sync_state', {
		key,
		value,
		updatedAt: new Date().toISOString(),
	});
};

export const getOfflineSyncState = async <T>(
	key: string
): Promise<T | null> => {
	const db = await getDB();
	if (!db) {
		return null;
	}
	const state = await db.get('sync_state', key);
	return (state?.value as T | undefined) ?? null;
};

export const setMapCacheRecord = async (
	mapId: string,
	payload: unknown
): Promise<void> => {
	const db = await getDB();
	if (!db) {
		return;
	}
	await db.put('map_cache', {
		mapId,
		payload,
		updatedAt: new Date().toISOString(),
	});
};

export const getMapCacheRecord = async (
	mapId: string
): Promise<OfflineMapCacheRecord | null> => {
	const db = await getDB();
	if (!db) {
		return null;
	}
	return (await db.get('map_cache', mapId)) ?? null;
};

export const setWorkspaceCacheRecord = async (
	key: string,
	payload: unknown
): Promise<void> => {
	const db = await getDB();
	if (!db) {
		return;
	}
	await db.put('workspace_cache', {
		key,
		payload,
		updatedAt: new Date().toISOString(),
	});
};

export const getWorkspaceCacheRecord = async (
	key: string
): Promise<WorkspaceCacheRecord | null> => {
	const db = await getDB();
	if (!db) {
		return null;
	}
	return (await db.get('workspace_cache', key)) ?? null;
};

export const addOfflineConflictLog = async (
	conflict: OfflineConflictLogItem
): Promise<void> => {
	const db = await getDB();
	if (!db) {
		return;
	}
	await db.put('conflict_log', conflict);
};

export const getRecentOfflineConflicts = async (
	limit = 20
): Promise<OfflineConflictLogItem[]> => {
	const db = await getDB();
	if (!db) {
		return [];
	}
	const tx = db.transaction('conflict_log', 'readonly');
	const index = tx.store.index('by_created_at');
	const all = await index.getAll();
	await tx.done;
	return all.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1)).slice(0, limit);
};
