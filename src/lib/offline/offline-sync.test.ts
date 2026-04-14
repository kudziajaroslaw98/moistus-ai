import type { OfflineQueuedOp } from '@/types/offline';
import { waitFor } from '@testing-library/react';
import {
	flushOfflineQueue,
	getBackgroundSyncStatus,
	initializeOfflineSync,
	resetOfflineSyncForTests,
} from './offline-sync';

const mockAddOfflineConflictLog = jest.fn();
const mockDeleteOfflineOp = jest.fn();
const mockGetOfflineQueuedOps = jest.fn();
const mockGetOfflineSyncState = jest.fn();
const mockResetProcessingOpsToQueued = jest.fn();
const mockSetOfflineSyncState = jest.fn();
const mockSetWorkspaceCacheRecord = jest.fn();
const mockUpdateOfflineOp = jest.fn();
const mockToastInfo = jest.fn();

jest.mock('@/lib/offline/indexed-db', () => ({
	addOfflineConflictLog: (...args: unknown[]) => mockAddOfflineConflictLog(...args),
	deleteOfflineOp: (...args: unknown[]) => mockDeleteOfflineOp(...args),
	getOfflineQueuedOps: (...args: unknown[]) => mockGetOfflineQueuedOps(...args),
	getOfflineSyncState: (...args: unknown[]) => mockGetOfflineSyncState(...args),
	resetProcessingOpsToQueued: (...args: unknown[]) =>
		mockResetProcessingOpsToQueued(...args),
	setOfflineSyncState: (...args: unknown[]) => mockSetOfflineSyncState(...args),
	setWorkspaceCacheRecord: (...args: unknown[]) =>
		mockSetWorkspaceCacheRecord(...args),
	updateOfflineOp: (...args: unknown[]) => mockUpdateOfflineOp(...args),
}));

jest.mock('sonner', () => ({
	toast: {
		info: (...args: unknown[]) => mockToastInfo(...args),
	},
}));

const createOperation = (opId: string): OfflineQueuedOp => ({
	opId,
	entity: 'maps',
	action: 'update',
	payload: {
		table: 'mind_maps',
		values: { title: `Map ${opId}` },
		match: { id: opId },
	},
	baseVersion: null,
	queuedAt: new Date().toISOString(),
	attempts: 0,
	status: 'queued',
	lastError: null,
});

const createSuccessResponse = (operations: OfflineQueuedOp[]) => ({
	ok: true,
	status: 200,
	json: async () => ({
		data: {
			results: operations.map((operation) => ({
				opId: operation.opId,
				status: 'applied',
			})),
		},
	}),
});

const getFetchUrl = (input: string | URL | Request): string => {
	if (typeof input === 'string') {
		return input;
	}

	if (input instanceof URL) {
		return input.toString();
	}

	return input.url;
};

describe('offline-sync reconnect behavior', () => {
	beforeEach(() => {
		jest.useRealTimers();
		jest.clearAllMocks();
		resetOfflineSyncForTests();

		Object.defineProperty(window.navigator, 'onLine', {
			configurable: true,
			value: true,
		});

		Object.defineProperty(document, 'visibilityState', {
			configurable: true,
			value: 'visible',
		});

		Object.defineProperty(window.navigator, 'serviceWorker', {
			configurable: true,
			value: {
				getRegistration: jest.fn().mockResolvedValue({
					sync: { register: jest.fn() },
					periodicSync: { register: jest.fn() },
				}),
				ready: Promise.resolve({ sync: { register: jest.fn() } }),
				addEventListener: jest.fn(),
				removeEventListener: jest.fn(),
			},
		});
		Object.defineProperty(window.navigator, 'permissions', {
			configurable: true,
			value: {
				query: jest.fn().mockResolvedValue({ state: 'granted' }),
			},
		});
	});

	it('drains multiple batches in one reconnect flush', async () => {
		const firstBatch = Array.from({ length: 100 }, (_, index) =>
			createOperation(`batch-1-${index}`)
		);
		const secondBatch = Array.from({ length: 20 }, (_, index) =>
			createOperation(`batch-2-${index}`)
		);

		mockGetOfflineQueuedOps
			.mockResolvedValueOnce(firstBatch)
			.mockResolvedValueOnce(secondBatch)
			.mockResolvedValueOnce([]);

		global.fetch = jest.fn(async (input, init) => {
			const url = getFetchUrl(input);
			if (url === '/api/offline/ops/batch') {
				const body = JSON.parse((init?.body as string) ?? '{}') as {
					operations: OfflineQueuedOp[];
				};
				return createSuccessResponse(body.operations) as unknown as Response;
			}
			if (url === '/api/auth/user') {
				return {
					ok: true,
					status: 200,
					json: async () => ({ id: 'user-1' }),
				} as Response;
			}
			if (url === '/api/notifications?limit=30') {
				return {
					ok: true,
					status: 200,
					json: async () => ({
						status: 'success',
						data: { notifications: [], unreadCount: 0 },
					}),
				} as Response;
			}
			throw new Error(`Unexpected fetch URL: ${url}`);
		}) as jest.MockedFunction<typeof fetch>;

		await flushOfflineQueue({ reason: 'online' });

		expect(
			(global.fetch as jest.Mock).mock.calls.filter(
				([input]) =>
					getFetchUrl(input as string | URL | Request) === '/api/offline/ops/batch'
			)
		).toHaveLength(2);
		expect(
			(global.fetch as jest.Mock).mock.calls.filter(
				([input]) =>
					getFetchUrl(input as string | URL | Request) === '/api/auth/user'
			)
		).toHaveLength(1);
		expect(
			(global.fetch as jest.Mock).mock.calls.filter(
				([input]) =>
					getFetchUrl(input as string | URL | Request) ===
					'/api/notifications?limit=30'
			)
		).toHaveLength(1);
		expect(mockDeleteOfflineOp).toHaveBeenCalledTimes(120);
	});

	it('pauses replay on auth failure and resumes on next successful trigger', async () => {
		const operation = createOperation('auth-op-1');

		mockGetOfflineQueuedOps
			.mockResolvedValueOnce([operation])
			.mockResolvedValueOnce([operation])
			.mockResolvedValueOnce([]);

		global.fetch = jest
			.fn()
			.mockResolvedValueOnce({
				ok: false,
				status: 401,
			})
			.mockImplementationOnce(async (_url, init) => {
				const body = JSON.parse((init?.body as string) ?? '{}') as {
					operations: OfflineQueuedOp[];
				};
				return createSuccessResponse(body.operations);
			}) as jest.MockedFunction<typeof fetch>;

		await flushOfflineQueue({ reason: 'online' });

		expect(mockDeleteOfflineOp).not.toHaveBeenCalled();
		expect(mockUpdateOfflineOp).toHaveBeenCalledWith(
			operation.opId,
			expect.objectContaining({
				status: 'queued',
				lastError: expect.stringContaining('authentication'),
			})
		);

		await flushOfflineQueue({ reason: 'focus' });
		expect(mockDeleteOfflineOp).toHaveBeenCalledWith(operation.opId);
	});

	it('retries transient network failure with backoff and eventually succeeds', async () => {
		jest.useFakeTimers();
		const operation = createOperation('retry-op-1');

		mockGetOfflineQueuedOps
			.mockResolvedValueOnce([operation])
			.mockResolvedValueOnce([operation])
			.mockResolvedValueOnce([]);

		global.fetch = jest
			.fn()
			.mockRejectedValueOnce(new TypeError('Failed to fetch'))
			.mockImplementationOnce(async (input, init) => {
				const url = getFetchUrl(input);
				if (url !== '/api/offline/ops/batch') {
					throw new Error(`Unexpected batch URL: ${url}`);
				}
				const body = JSON.parse((init?.body as string) ?? '{}') as {
					operations: OfflineQueuedOp[];
				};
				return createSuccessResponse(body.operations);
			})
			.mockImplementationOnce(async (input) => {
				const url = getFetchUrl(input);
				if (url === '/api/auth/user') {
					return {
						ok: true,
						status: 200,
						json: async () => ({ id: 'user-1' }),
					} as Response;
				}
				if (url === '/api/notifications?limit=30') {
					return {
						ok: true,
						status: 200,
						json: async () => ({
							status: 'success',
							data: { notifications: [], unreadCount: 0 },
						}),
					} as Response;
				}
				throw new Error(`Unexpected fetch URL: ${url}`);
			}) as jest.MockedFunction<typeof fetch>;

		await flushOfflineQueue({ reason: 'online' });
		expect(mockDeleteOfflineOp).not.toHaveBeenCalled();

		await jest.advanceTimersByTimeAsync(500);

		expect(
			(global.fetch as jest.Mock).mock.calls.filter(
				([input]) =>
					getFetchUrl(input as string | URL | Request) === '/api/offline/ops/batch'
			)
		).toHaveLength(2);
		expect(mockDeleteOfflineOp).toHaveBeenCalledWith(operation.opId);
	});

	it('dead-letters non-auth 4xx replay failures without scheduling a retry', async () => {
		jest.useFakeTimers();
		const operation = createOperation('terminal-op-1');

		mockGetOfflineQueuedOps.mockResolvedValueOnce([operation]);
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: false,
			status: 422,
		}) as jest.MockedFunction<typeof fetch>;

		await flushOfflineQueue({ reason: 'online' });
		await jest.advanceTimersByTimeAsync(5000);

		expect(mockUpdateOfflineOp).toHaveBeenCalledWith(
			operation.opId,
			expect.objectContaining({
				attempts: operation.attempts + 1,
				status: 'dead_letter',
				lastError: expect.stringContaining('HTTP 422'),
			})
		);
		expect(global.fetch).toHaveBeenCalledTimes(1);
		expect(mockDeleteOfflineOp).not.toHaveBeenCalled();
	});

	it('replays queued ops when background sync runs without a window client', async () => {
		const operation = createOperation('sw-op-1');

		mockGetOfflineQueuedOps
			.mockResolvedValueOnce([operation])
			.mockResolvedValueOnce([]);

		global.fetch = jest.fn(async (input, init) => {
			const url = getFetchUrl(input);
			if (url === '/api/offline/ops/batch') {
				const body = JSON.parse((init?.body as string) ?? '{}') as {
					operations: OfflineQueuedOp[];
				};
				return createSuccessResponse(body.operations) as unknown as Response;
			}
			if (url === '/api/auth/user') {
				return {
					ok: true,
					status: 200,
					json: async () => ({ id: 'user-1' }),
				} as Response;
			}
			if (url === '/api/notifications?limit=30') {
				return {
					ok: true,
					status: 200,
					json: async () => ({
						status: 'success',
						data: { notifications: [], unreadCount: 0 },
					}),
				} as Response;
			}
			throw new Error(`Unexpected fetch URL: ${url}`);
		}) as jest.MockedFunction<typeof fetch>;

		await flushOfflineQueue({ reason: 'sw', allowWithoutWindow: true });

		expect(
			(global.fetch as jest.Mock).mock.calls.filter(
				([input]) =>
					getFetchUrl(input as string | URL | Request) === '/api/offline/ops/batch'
			)
		).toHaveLength(1);
		expect(mockDeleteOfflineOp).toHaveBeenCalledWith(operation.opId);
	});

	it('recovers processing entries on startup and flushes again on visibility', async () => {
		mockResetProcessingOpsToQueued.mockResolvedValue(2);
		mockGetOfflineQueuedOps.mockResolvedValue([]);
		global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

		initializeOfflineSync();

		await waitFor(() => {
			expect(mockResetProcessingOpsToQueued).toHaveBeenCalledTimes(1);
		});
		await waitFor(() => {
			expect(mockGetOfflineQueuedOps).toHaveBeenCalledTimes(1);
		});

		document.dispatchEvent(new Event('visibilitychange'));

		await waitFor(() => {
			expect(mockGetOfflineQueuedOps).toHaveBeenCalledTimes(2);
		});
		expect(
			(
				window.navigator.serviceWorker as ServiceWorkerContainer & {
					getRegistration: jest.Mock;
				}
			).getRegistration
		).toHaveBeenCalled();
		expect(
			(
				(
					await (
						window.navigator.serviceWorker as ServiceWorkerContainer & {
							getRegistration: jest.Mock;
						}
					).getRegistration.mock.results[0]?.value
				) as { periodicSync: { register: jest.Mock } }
			).periodicSync.register
		).toHaveBeenCalledWith('shiko-notifications-refresh', {
			minInterval: 12 * 60 * 60 * 1000,
		});
	});

	it('surfaces a one-time fallback toast when one-off background sync is unsupported', async () => {
		Object.defineProperty(window.navigator, 'serviceWorker', {
			configurable: true,
			value: {
				getRegistration: jest.fn().mockResolvedValue({
					periodicSync: { register: jest.fn() },
				}),
				addEventListener: jest.fn(),
				removeEventListener: jest.fn(),
			},
		});

		mockResetProcessingOpsToQueued.mockResolvedValue(0);
		mockGetOfflineQueuedOps.mockResolvedValue([]);

		initializeOfflineSync();
		initializeOfflineSync();

		await waitFor(() => {
			expect(mockToastInfo).toHaveBeenCalledTimes(1);
		});
	});

	it('reports background sync capabilities and last metadata for settings', async () => {
		mockGetOfflineSyncState
			.mockResolvedValueOnce({
				ok: true,
				updatedAt: '2026-04-14T08:00:00.000Z',
				reason: null,
			})
			.mockResolvedValueOnce({
				ok: true,
				updatedAt: '2026-04-14T09:00:00.000Z',
				reason: null,
			})
			.mockResolvedValueOnce({
				source: 'one_off',
				reason: 'unsupported',
				updatedAt: '2026-04-14T10:00:00.000Z',
			});

		const status = await getBackgroundSyncStatus();

		expect(status.capabilities).toEqual({
			serviceWorkerEnabled: true,
			oneOffSupported: true,
			periodicSupported: true,
		});
		expect(status.lastReplay?.updatedAt).toBe('2026-04-14T08:00:00.000Z');
		expect(status.lastNotificationRefresh?.updatedAt).toBe(
			'2026-04-14T09:00:00.000Z'
		);
		expect(status.lastCapabilityFailure?.reason).toBe('unsupported');
	});

	it('removes registered listeners during test reset', async () => {
		const windowAddSpy = jest.spyOn(window, 'addEventListener');
		const windowRemoveSpy = jest.spyOn(window, 'removeEventListener');
		const documentAddSpy = jest.spyOn(document, 'addEventListener');
		const documentRemoveSpy = jest.spyOn(document, 'removeEventListener');
		const serviceWorker = window.navigator.serviceWorker as ServiceWorkerContainer & {
			addEventListener: jest.Mock;
			removeEventListener: jest.Mock;
		};

		mockResetProcessingOpsToQueued.mockResolvedValue(0);
		mockGetOfflineQueuedOps.mockResolvedValue([]);
		global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

		try {
			initializeOfflineSync();

			await waitFor(() => {
				expect(mockResetProcessingOpsToQueued).toHaveBeenCalledTimes(1);
			});

			const onlineHandler = windowAddSpy.mock.calls.find(
				([eventName]) => String(eventName) === 'online'
			)?.[1];
			const focusHandler = windowAddSpy.mock.calls.find(
				([eventName]) => String(eventName) === 'focus'
			)?.[1];
			const visibilityHandler = documentAddSpy.mock.calls.find(
				([eventName]) => String(eventName) === 'visibilitychange'
			)?.[1];
			const messageHandler = serviceWorker.addEventListener.mock.calls.find(
				([eventName]) => String(eventName) === 'message'
			)?.[1];

			expect(onlineHandler).toEqual(expect.any(Function));
			expect(focusHandler).toEqual(expect.any(Function));
			expect(visibilityHandler).toEqual(expect.any(Function));
			expect(messageHandler).toEqual(expect.any(Function));

			resetOfflineSyncForTests();

			expect(windowRemoveSpy).toHaveBeenCalledWith('online', onlineHandler);
			expect(windowRemoveSpy).toHaveBeenCalledWith('focus', focusHandler);
			expect(documentRemoveSpy).toHaveBeenCalledWith(
				'visibilitychange',
				visibilityHandler
			);
			expect(serviceWorker.removeEventListener).toHaveBeenCalledWith(
				'message',
				messageHandler
			);
		} finally {
			windowAddSpy.mockRestore();
			windowRemoveSpy.mockRestore();
			documentAddSpy.mockRestore();
			documentRemoveSpy.mockRestore();
		}
	});
});
