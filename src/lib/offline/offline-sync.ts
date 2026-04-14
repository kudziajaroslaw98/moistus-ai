import {
	getOfflineSyncState,
	resetProcessingOpsToQueued,
} from '@/lib/offline/indexed-db';
import {
	flushOfflineQueueCore,
	LAST_CAPABILITY_FAILURE_STATE_KEY,
	LAST_NOTIFICATIONS_REFRESH_STATE_KEY,
	LAST_REPLAY_STATE_KEY,
	OFFLINE_SYNC_TAG,
	PERIODIC_NOTIFICATIONS_MIN_INTERVAL_MS,
	PERIODIC_NOTIFICATIONS_SYNC_TAG,
	type FlushOfflineQueueCoreOptions,
	type OfflineFlushReason,
	writeBackgroundSyncCapabilityFailure,
} from '@/lib/offline/offline-sync-core';
import type {
	BackgroundSyncCapabilities,
	BackgroundSyncCapabilityFailureMetadata,
	BackgroundSyncRunMetadata,
	BackgroundSyncStatusSnapshot,
} from '@/types/offline';
import { toast } from 'sonner';

export type { OfflineFlushReason } from '@/lib/offline/offline-sync-core';

export interface FlushOfflineQueueOptions extends FlushOfflineQueueCoreOptions {}

type OneOffBackgroundSyncRegistration = ServiceWorkerRegistration & {
	sync: {
		register: (tag: string) => Promise<void>;
	};
};

type PeriodicBackgroundSyncRegistration = ServiceWorkerRegistration & {
	periodicSync: {
		register: (
			tag: string,
			options: {
				minInterval: number;
			}
		) => Promise<void>;
	};
};

type PeriodicBackgroundSyncPermissionDescriptor = PermissionDescriptor & {
	name: 'periodic-background-sync';
};

const BACKGROUND_SYNC_FALLBACK_TOAST_KEY =
	'shiko-background-sync-fallback-toast-shown';

let onlineListenerAttached = false;
let focusListenerAttached = false;
let visibilityListenerAttached = false;
let messageListenerAttached = false;
let onlineHandler: (() => void) | null = null;
let focusHandler: (() => void) | null = null;
let visibilityHandler: (() => void) | null = null;
let serviceWorkerMessageHandler: ((event: MessageEvent) => void) | null = null;
let retryTimeout: ReturnType<typeof setTimeout> | null = null;
let retryAttempt = 0;
let fallbackToastShown = false;

const hasWindow = () => typeof window !== 'undefined';

const isOffline = () =>
	typeof navigator !== 'undefined' &&
	'onLine' in navigator &&
	navigator.onLine === false;

const supportsBackgroundSync = (
	registration: ServiceWorkerRegistration
): registration is OneOffBackgroundSyncRegistration => {
	const candidate = (
		registration as ServiceWorkerRegistration & { sync?: unknown }
	).sync;

	if (typeof candidate !== 'object' || candidate === null) {
		return false;
	}

	return typeof (candidate as { register?: unknown }).register === 'function';
};

const supportsPeriodicBackgroundSync = (
	registration: ServiceWorkerRegistration
): registration is PeriodicBackgroundSyncRegistration => {
	const candidate = (
		registration as ServiceWorkerRegistration & { periodicSync?: unknown }
	).periodicSync;

	if (typeof candidate !== 'object' || candidate === null) {
		return false;
	}

	return typeof (candidate as { register?: unknown }).register === 'function';
};

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

const markFallbackToastShown = () => {
	fallbackToastShown = true;
	if (!hasWindow()) {
		return;
	}

	try {
		window.sessionStorage.setItem(BACKGROUND_SYNC_FALLBACK_TOAST_KEY, 'true');
	} catch {
		// Ignore sessionStorage errors.
	}
};

const hasShownFallbackToast = (): boolean => {
	if (fallbackToastShown) {
		return true;
	}
	if (!hasWindow()) {
		return false;
	}

	try {
		return window.sessionStorage.getItem(BACKGROUND_SYNC_FALLBACK_TOAST_KEY) === 'true';
	} catch {
		return fallbackToastShown;
	}
};

const emitBackgroundSyncFallbackToast = (message: string) => {
	if (!hasWindow() || hasShownFallbackToast()) {
		return;
	}

	toast.info(message);
	markFallbackToastShown();
};

const getServiceWorkerRegistration = async (): Promise<ServiceWorkerRegistration | null> => {
	if (!hasWindow() || !('serviceWorker' in navigator)) {
		return null;
	}

	try {
		return (await navigator.serviceWorker.getRegistration()) ?? null;
	} catch (error) {
		console.warn('[offline] Failed to load service worker registration', error);
		return null;
	}
};

const getPeriodicSyncPermissionState = async (): Promise<PermissionState | 'unsupported'> => {
	if (
		!hasWindow() ||
		!('permissions' in navigator) ||
		typeof navigator.permissions.query !== 'function'
	) {
		return 'unsupported';
	}

	try {
		const permissionStatus = await navigator.permissions.query({
			name: 'periodic-background-sync',
		} as PeriodicBackgroundSyncPermissionDescriptor);
		return permissionStatus.state;
	} catch {
		return 'unsupported';
	}
};

export const getBackgroundSyncCapabilities =
	async (): Promise<BackgroundSyncCapabilities> => {
		const registration = await getServiceWorkerRegistration();
		if (!registration) {
			return {
				serviceWorkerEnabled: false,
				oneOffSupported: false,
				periodicSupported: false,
			};
		}

		const periodicPermissionState = await getPeriodicSyncPermissionState();

		return {
			serviceWorkerEnabled: true,
			oneOffSupported: supportsBackgroundSync(registration),
			periodicSupported:
				supportsPeriodicBackgroundSync(registration) &&
				periodicPermissionState === 'granted',
		};
	};

export const getBackgroundSyncStatus =
	async (): Promise<BackgroundSyncStatusSnapshot> => {
		const [capabilities, lastReplay, lastNotificationRefresh, lastCapabilityFailure] =
			await Promise.all([
				getBackgroundSyncCapabilities(),
				getOfflineSyncState<BackgroundSyncRunMetadata>(LAST_REPLAY_STATE_KEY),
				getOfflineSyncState<BackgroundSyncRunMetadata>(
					LAST_NOTIFICATIONS_REFRESH_STATE_KEY
				),
				getOfflineSyncState<BackgroundSyncCapabilityFailureMetadata>(
					LAST_CAPABILITY_FAILURE_STATE_KEY
				),
			]);

		return {
			capabilities,
			lastReplay,
			lastNotificationRefresh,
			lastCapabilityFailure,
		};
	};

const requestPeriodicNotificationsSync = async (): Promise<void> => {
	const registration = await getServiceWorkerRegistration();
	if (!registration) {
		return;
	}

	if (!supportsPeriodicBackgroundSync(registration)) {
		await writeBackgroundSyncCapabilityFailure({
			source: 'periodic',
			reason: 'unsupported',
			updatedAt: new Date().toISOString(),
		});
		return;
	}

	const permissionState = await getPeriodicSyncPermissionState();
	if (permissionState !== 'granted') {
		await writeBackgroundSyncCapabilityFailure({
			source: 'periodic',
			reason: `permission_${permissionState}`,
			updatedAt: new Date().toISOString(),
		});
		return;
	}

	try {
		await registration.periodicSync.register(PERIODIC_NOTIFICATIONS_SYNC_TAG, {
			minInterval: PERIODIC_NOTIFICATIONS_MIN_INTERVAL_MS,
		});
	} catch (error) {
		await writeBackgroundSyncCapabilityFailure({
			source: 'periodic',
			reason:
				error instanceof Error
					? error.message
					: 'periodic_registration_failed',
			updatedAt: new Date().toISOString(),
		});
	}
};

const requestServiceWorkerSync = async (): Promise<void> => {
	const registration = await getServiceWorkerRegistration();
	if (!registration) {
		return;
	}

	if (!supportsBackgroundSync(registration)) {
		await writeBackgroundSyncCapabilityFailure({
			source: 'one_off',
			reason: 'unsupported',
			updatedAt: new Date().toISOString(),
		});
		emitBackgroundSyncFallbackToast(
			'Background sync is unavailable; queued changes will replay while Shiko is open.'
		);
		return;
	}

	try {
		await registration.sync.register(OFFLINE_SYNC_TAG);
	} catch (error) {
		await writeBackgroundSyncCapabilityFailure({
			source: 'one_off',
			reason:
				error instanceof Error ? error.message : 'one_off_registration_failed',
			updatedAt: new Date().toISOString(),
		});
		emitBackgroundSyncFallbackToast(
			'Background sync registration failed; queued changes will replay while Shiko is open.'
		);
	}
};

export const flushOfflineQueue = async (
	options: FlushOfflineQueueOptions = {}
): Promise<void> => {
	await flushOfflineQueueCore({
		...options,
		scheduleRetryWithBackoff,
		resetRetryBackoff,
	});
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
		onlineHandler = () => {
			void flushOfflineQueue({ reason: 'online' });
		};
		window.addEventListener('online', onlineHandler);
		onlineListenerAttached = true;
	}

	if (!focusListenerAttached) {
		focusHandler = () => {
			void flushOfflineQueue({ reason: 'focus' });
		};
		window.addEventListener('focus', focusHandler);
		focusListenerAttached = true;
	}

	if (!visibilityListenerAttached) {
		visibilityHandler = () => {
			if (document.visibilityState === 'visible') {
				void flushOfflineQueue({ reason: 'visibility' });
			}
		};
		document.addEventListener('visibilitychange', visibilityHandler);
		visibilityListenerAttached = true;
	}

	if (!messageListenerAttached && 'serviceWorker' in navigator) {
		serviceWorkerMessageHandler = (event: MessageEvent) => {
			const data = event.data as { type?: string } | undefined;
			if (data?.type === 'OFFLINE_SYNC_REQUEST') {
				void flushOfflineQueue({ reason: 'sw' });
			}
		};
		navigator.serviceWorker.addEventListener('message', serviceWorkerMessageHandler);
		messageListenerAttached = true;
	}

	void (async () => {
		const registration = await getServiceWorkerRegistration();
		if (registration && !supportsBackgroundSync(registration)) {
			await writeBackgroundSyncCapabilityFailure({
				source: 'one_off',
				reason: 'unsupported',
				updatedAt: new Date().toISOString(),
			});
			emitBackgroundSyncFallbackToast(
				'Background sync is unavailable; queued changes will replay while Shiko is open.'
			);
		}

		await requestPeriodicNotificationsSync();
		await resetProcessingOpsToQueued();
		await flushOfflineQueue({ reason: 'startup' });
	})();
};

export const resetOfflineSyncForTests = () => {
	if (hasWindow()) {
		if (onlineListenerAttached && onlineHandler) {
			window.removeEventListener('online', onlineHandler);
		}
		if (focusListenerAttached && focusHandler) {
			window.removeEventListener('focus', focusHandler);
		}
		if (visibilityListenerAttached && visibilityHandler) {
			document.removeEventListener('visibilitychange', visibilityHandler);
		}
		if (
			messageListenerAttached &&
			serviceWorkerMessageHandler &&
			'serviceWorker' in navigator
		) {
			navigator.serviceWorker.removeEventListener(
				'message',
				serviceWorkerMessageHandler
			);
		}

		try {
			window.sessionStorage.removeItem(BACKGROUND_SYNC_FALLBACK_TOAST_KEY);
		} catch {
			// Ignore sessionStorage errors.
		}
	}

	onlineListenerAttached = false;
	focusListenerAttached = false;
	visibilityListenerAttached = false;
	messageListenerAttached = false;
	onlineHandler = null;
	focusHandler = null;
	visibilityHandler = null;
	serviceWorkerMessageHandler = null;
	fallbackToastShown = false;
	resetRetryBackoff();
};
