import {
	addOfflineConflictLog,
	deleteOfflineOp,
	getOfflineQueuedOps,
	setOfflineSyncState,
	setWorkspaceCacheRecord,
	updateOfflineOp,
} from '@/lib/offline/indexed-db';
import {
	buildNotificationsCacheKey,
} from '@/lib/notifications/notifications-cache';
import type {
	BackgroundSyncCapabilityFailureMetadata,
	BackgroundSyncRunMetadata,
	OfflineBatchResponse,
	OfflineQueuedOp,
} from '@/types/offline';

export const OFFLINE_SYNC_TAG = 'shiko-offline-sync';
export const PERIODIC_NOTIFICATIONS_SYNC_TAG = 'shiko-notifications-refresh';
export const PERIODIC_NOTIFICATIONS_MIN_INTERVAL_MS = 12 * 60 * 60 * 1000;

export const LAST_REPLAY_STATE_KEY = 'background_sync:last_replay';
export const LAST_NOTIFICATIONS_REFRESH_STATE_KEY =
	'background_sync:last_notifications_refresh';
export const LAST_CAPABILITY_FAILURE_STATE_KEY =
	'background_sync:last_capability_failure';

export type OfflineFlushReason =
	| 'startup'
	| 'online'
	| 'focus'
	| 'visibility'
	| 'sw'
	| 'enqueue'
	| 'retry_backoff'
	| 'manual';

export interface FlushOfflineQueueCoreOptions {
	reason?: OfflineFlushReason;
	allowWithoutWindow?: boolean;
	scheduleRetryWithBackoff?: () => void;
	resetRetryBackoff?: () => void;
}

export interface FlushOfflineQueueCoreResult {
	ok: boolean;
	processedCount: number;
	reason: string | null;
	authPaused: boolean;
}

let inFlightFlush: Promise<FlushOfflineQueueCoreResult> | null = null;

const hasWindow = () => typeof window !== 'undefined';
const hasNavigator = () => typeof navigator !== 'undefined';
const canReplayOfflineQueue = () => typeof fetch === 'function';

const isOffline = () =>
	hasNavigator() && 'onLine' in navigator && navigator.onLine === false;

const isAuthStatus = (status: number) => status === 401 || status === 403;
const isTransientStatus = (status: number) => status >= 500;

class SyncBatchHttpError extends Error {
	status: number;

	constructor(status: number, reason: OfflineFlushReason) {
		super(`Batch replay failed with HTTP ${status} (${reason})`);
		this.status = status;
	}
}

const writeReplayMetadata = async (
	metadata: BackgroundSyncRunMetadata
): Promise<void> => {
	await setOfflineSyncState(LAST_REPLAY_STATE_KEY, metadata);
};

const writeNotificationsRefreshMetadata = async (
	metadata: BackgroundSyncRunMetadata
): Promise<void> => {
	await setOfflineSyncState(LAST_NOTIFICATIONS_REFRESH_STATE_KEY, metadata);
};

export const writeBackgroundSyncCapabilityFailure = async (
	metadata: BackgroundSyncCapabilityFailureMetadata
): Promise<void> => {
	await setOfflineSyncState(LAST_CAPABILITY_FAILURE_STATE_KEY, metadata);
};

const recordPermanentFailure = async (operation: OfflineQueuedOp, message: string) => {
	await updateOfflineOp(operation.opId, {
		attempts: operation.attempts + 1,
		lastError: message,
		status: 'dead_letter',
	});
};

const recordTransientFailure = async (operation: OfflineQueuedOp, message: string) => {
	await updateOfflineOp(operation.opId, {
		attempts: operation.attempts + 1,
		lastError: message,
		status: 'queued',
	});
};

const recordAuthPause = async (operation: OfflineQueuedOp, message: string) => {
	await updateOfflineOp(operation.opId, {
		lastError: message,
		status: 'queued',
	});
};

const syncBatch = async (
	operations: OfflineQueuedOp[],
	reason: OfflineFlushReason
) => {
	const response = await fetch('/api/offline/ops/batch', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ operations }),
		credentials: 'same-origin',
		cache: 'no-store',
	});

	if (!response.ok) {
		throw new SyncBatchHttpError(response.status, reason);
	}

	return (await response.json()) as {
		data?: OfflineBatchResponse;
		error?: string;
	};
};

export const refreshGlobalNotificationsCache = async (): Promise<void> => {
	const updatedAt = new Date().toISOString();

	if (!canReplayOfflineQueue()) {
		await writeNotificationsRefreshMetadata({
			ok: false,
			updatedAt,
			reason: 'fetch_unavailable',
		});
		return;
	}

	if (isOffline()) {
		await writeNotificationsRefreshMetadata({
			ok: false,
			updatedAt,
			reason: 'offline',
		});
		return;
	}

	try {
		const authResponse = await fetch('/api/auth/user', {
			credentials: 'same-origin',
			cache: 'no-store',
		});

		if (!authResponse.ok) {
			await writeNotificationsRefreshMetadata({
				ok: false,
				updatedAt,
				reason: `auth_${authResponse.status}`,
			});
			return;
		}

		const authPayload = (await authResponse.json()) as { id?: string };
		if (!authPayload.id) {
			await writeNotificationsRefreshMetadata({
				ok: false,
				updatedAt,
				reason: 'missing_user_id',
			});
			return;
		}

		const notificationsResponse = await fetch('/api/notifications?limit=30', {
			credentials: 'same-origin',
			cache: 'no-store',
		});
		if (!notificationsResponse.ok) {
			await writeNotificationsRefreshMetadata({
				ok: false,
				updatedAt,
				reason: `notifications_${notificationsResponse.status}`,
			});
			return;
		}

		const notificationsPayload = (await notificationsResponse.json()) as {
			status?: string;
			data?: {
				notifications?: unknown[];
				unreadCount?: number;
			};
		};

		if (notificationsPayload.status !== 'success' || !notificationsPayload.data) {
			await writeNotificationsRefreshMetadata({
				ok: false,
				updatedAt,
				reason: 'invalid_notifications_response',
			});
			return;
		}

		await setWorkspaceCacheRecord(
			buildNotificationsCacheKey(authPayload.id, null),
			{
				notifications: Array.isArray(notificationsPayload.data.notifications)
					? notificationsPayload.data.notifications
					: [],
				unreadCount:
					typeof notificationsPayload.data.unreadCount === 'number'
						? notificationsPayload.data.unreadCount
						: 0,
			}
		);

		await writeNotificationsRefreshMetadata({
			ok: true,
			updatedAt,
			reason: null,
		});
	} catch (error) {
		await writeNotificationsRefreshMetadata({
			ok: false,
			updatedAt,
			reason: error instanceof Error ? error.message : 'Unknown refresh error',
		});
	}
};

export const flushOfflineQueueCore = async (
	options: FlushOfflineQueueCoreOptions = {}
): Promise<FlushOfflineQueueCoreResult> => {
	const reason = options.reason ?? 'manual';
	const allowWithoutWindow = options.allowWithoutWindow ?? false;

	if (!hasWindow() && !allowWithoutWindow) {
		return {
			ok: false,
			processedCount: 0,
			reason: 'window_unavailable',
			authPaused: false,
		};
	}
	if (!canReplayOfflineQueue()) {
		return {
			ok: false,
			processedCount: 0,
			reason: 'fetch_unavailable',
			authPaused: false,
		};
	}
	if (isOffline()) {
		return {
			ok: false,
			processedCount: 0,
			reason: 'offline',
			authPaused: false,
		};
	}
	if (inFlightFlush) {
		return inFlightFlush;
	}

	inFlightFlush = (async () => {
		let processedCount = 0;
		let authPaused = false;

		while (!isOffline()) {
			const operations = await getOfflineQueuedOps(100);
			if (operations.length === 0) {
				options.resetRetryBackoff?.();
				const successResult = {
					ok: true,
					processedCount,
					reason: null,
					authPaused,
				} satisfies FlushOfflineQueueCoreResult;
				await writeReplayMetadata({
					ok: true,
					updatedAt: new Date().toISOString(),
					reason: null,
					processedCount,
				});
				if (processedCount > 0) {
					await refreshGlobalNotificationsCache();
				}
				return successResult;
			}

			processedCount += operations.length;

			await Promise.all(
				operations.map((op) =>
					updateOfflineOp(op.opId, {
						status: 'processing',
					})
				)
			);

			let payload: { data?: OfflineBatchResponse; error?: string } | null = null;
			try {
				payload = await syncBatch(operations, reason);
				options.resetRetryBackoff?.();
			} catch (error) {
				if (error instanceof SyncBatchHttpError && isAuthStatus(error.status)) {
					const message = `Replay paused due to authentication (${error.status})`;
					await Promise.all(
						operations.map((operation) => recordAuthPause(operation, message))
					);
					authPaused = true;
					await writeReplayMetadata({
						ok: false,
						updatedAt: new Date().toISOString(),
						reason: message,
						processedCount,
					});
					return {
						ok: false,
						processedCount,
						reason: message,
						authPaused: true,
					};
				}

				const message =
					error instanceof Error
						? error.message
						: `Unknown sync batch error (${reason})`;
				const isPermanentClientError =
					error instanceof SyncBatchHttpError &&
					!isAuthStatus(error.status) &&
					!isTransientStatus(error.status);
				await Promise.all(
					operations.map((operation) =>
						isPermanentClientError
							? recordPermanentFailure(operation, message)
							: recordTransientFailure(operation, message)
					)
				);

				if (
					!(error instanceof SyncBatchHttpError) ||
					isTransientStatus(error.status)
				) {
					options.scheduleRetryWithBackoff?.();
				}

				await writeReplayMetadata({
					ok: false,
					updatedAt: new Date().toISOString(),
					reason: message,
					processedCount,
				});
				return {
					ok: false,
					processedCount,
					reason: message,
					authPaused: false,
				};
			}

			const results = payload.data?.results ?? [];
			const resultsById = new Map(results.map((result) => [result.opId, result]));

			await Promise.all(
				operations.map(async (operation) => {
					const result = resultsById.get(operation.opId);
					if (!result) {
						await recordPermanentFailure(
							operation,
							payload?.error || 'Operation missing from batch result'
						);
						return;
					}

					if (result.status === 'applied' || result.status === 'duplicate') {
						await deleteOfflineOp(operation.opId);
						return;
					}

					if (result.status === 'conflict') {
						await addOfflineConflictLog({
							id: crypto.randomUUID(),
							opId: operation.opId,
							entity: operation.entity,
							action: operation.action,
							baseVersion: operation.baseVersion,
							serverVersion: result.serverVersion ?? null,
							details: result.details ?? {},
							createdAt: new Date().toISOString(),
						});
						await deleteOfflineOp(operation.opId);
						return;
					}

					await recordPermanentFailure(operation, result.message || 'Replay failed');
				})
			);
		}

		const offlineResult = {
			ok: false,
			processedCount,
			reason: 'offline',
			authPaused: false,
		} satisfies FlushOfflineQueueCoreResult;
		await writeReplayMetadata({
			ok: false,
			updatedAt: new Date().toISOString(),
			reason: 'offline',
			processedCount,
		});
		return offlineResult;
	})().finally(() => {
		inFlightFlush = null;
	});

	return inFlightFlush;
};
