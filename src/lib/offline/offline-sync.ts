import {
	addOfflineConflictLog,
	deleteOfflineOp,
	getOfflineQueuedOps,
	resetProcessingOpsToQueued,
	updateOfflineOp,
} from '@/lib/offline/indexed-db';
import type { OfflineBatchResponse, OfflineQueuedOp } from '@/types/offline';

const OFFLINE_SYNC_TAG = 'shiko-offline-sync';
const MAX_ATTEMPTS = 5;

export type OfflineFlushReason =
	| 'startup'
	| 'online'
	| 'focus'
	| 'visibility'
	| 'sw'
	| 'enqueue'
	| 'retry_backoff'
	| 'manual';

export interface FlushOfflineQueueOptions {
	reason?: OfflineFlushReason;
}

let inFlightFlush: Promise<void> | null = null;
let onlineListenerAttached = false;
let focusListenerAttached = false;
let visibilityListenerAttached = false;
let messageListenerAttached = false;
let retryTimeout: ReturnType<typeof setTimeout> | null = null;
let retryAttempt = 0;

const hasWindow = () => typeof window !== 'undefined';

const isOffline = () => hasWindow() && window.navigator.onLine === false;

const isAuthStatus = (status: number) => status === 401 || status === 403;
const isTransientStatus = (status: number) => status >= 500;

class SyncBatchHttpError extends Error {
	status: number;

	constructor(status: number, reason: OfflineFlushReason) {
		super(`Batch replay failed with HTTP ${status} (${reason})`);
		this.status = status;
	}
}

const resetRetryBackoff = () => {
	if (retryTimeout) {
		clearTimeout(retryTimeout);
		retryTimeout = null;
	}
	retryAttempt = 0;
};

const scheduleRetryWithBackoff = () => {
	if (!hasWindow() || isOffline()) {
		return;
	}
	if (retryTimeout) {
		return;
	}

	retryAttempt += 1;
	const delayMs = Math.min(500 * 2 ** (retryAttempt - 1), 5000);
	retryTimeout = setTimeout(() => {
		retryTimeout = null;
		void flushOfflineQueue({ reason: 'retry_backoff' });
	}, delayMs);
};

const recordPermanentFailure = async (operation: OfflineQueuedOp, message: string) => {
	const nextAttempts = operation.attempts + 1;
	await updateOfflineOp(operation.opId, {
		attempts: nextAttempts,
		lastError: message,
		status: nextAttempts >= MAX_ATTEMPTS ? 'dead_letter' : 'queued',
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
	});

	if (!response.ok) {
		throw new SyncBatchHttpError(response.status, reason);
	}

	return (await response.json()) as {
		data?: OfflineBatchResponse;
		error?: string;
	};
};

export const flushOfflineQueue = async (
	options: FlushOfflineQueueOptions = {}
): Promise<void> => {
	const reason = options.reason ?? 'manual';

	if (!hasWindow()) {
		return;
	}
	if (isOffline()) {
		return;
	}
	if (inFlightFlush) {
		return inFlightFlush;
	}

	inFlightFlush = (async () => {
		while (!isOffline()) {
			const operations = await getOfflineQueuedOps(100);
			if (operations.length === 0) {
				resetRetryBackoff();
				return;
			}

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
				resetRetryBackoff();
			} catch (error) {
				if (error instanceof SyncBatchHttpError && isAuthStatus(error.status)) {
					const message = `Replay paused due to authentication (${error.status})`;
					await Promise.all(
						operations.map((operation) => recordAuthPause(operation, message))
					);
					return;
				}

				const message =
					error instanceof Error
						? error.message
						: `Unknown sync batch error (${reason})`;
				await Promise.all(
					operations.map((operation) => recordTransientFailure(operation, message))
				);

				if (
					!(error instanceof SyncBatchHttpError) ||
					isTransientStatus(error.status)
				) {
					scheduleRetryWithBackoff();
				}
				return;
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
	})().finally(() => {
		inFlightFlush = null;
	});

	return inFlightFlush;
};

const requestServiceWorkerSync = async () => {
	if (!hasWindow()) {
		return;
	}
	if (!('serviceWorker' in navigator)) {
		return;
	}

	try {
		const registration = await navigator.serviceWorker.ready;
		// sync is still optional in browsers; do not fail hard.
		if ('sync' in registration) {
			await registration.sync.register(OFFLINE_SYNC_TAG);
		}
	} catch (error) {
		console.warn('[offline] Background sync registration failed', error);
	}
};

export const enqueueSyncKick = async (): Promise<void> => {
	await requestServiceWorkerSync();
	if (!isOffline()) {
		await flushOfflineQueue({ reason: 'enqueue' });
	}
};

export const initializeOfflineSync = () => {
	if (!hasWindow()) {
		return;
	}

	if (!onlineListenerAttached) {
		window.addEventListener('online', () => {
			void flushOfflineQueue({ reason: 'online' });
		});
		onlineListenerAttached = true;
	}

	if (!focusListenerAttached) {
		window.addEventListener('focus', () => {
			void flushOfflineQueue({ reason: 'focus' });
		});
		focusListenerAttached = true;
	}

	if (!visibilityListenerAttached) {
		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'visible') {
				void flushOfflineQueue({ reason: 'visibility' });
			}
		});
		visibilityListenerAttached = true;
	}

	if (!messageListenerAttached && 'serviceWorker' in navigator) {
		navigator.serviceWorker.addEventListener('message', (event) => {
			const data = event.data as { type?: string } | undefined;
			if (data?.type === 'OFFLINE_SYNC_REQUEST') {
				void flushOfflineQueue({ reason: 'sw' });
			}
		});
		messageListenerAttached = true;
	}

	void (async () => {
		await resetProcessingOpsToQueued();
		await flushOfflineQueue({ reason: 'startup' });
	})();
};

export const resetOfflineSyncForTests = () => {
	inFlightFlush = null;
	onlineListenerAttached = false;
	focusListenerAttached = false;
	visibilityListenerAttached = false;
	messageListenerAttached = false;
	resetRetryBackoff();
};
