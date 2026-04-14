import { buildNotificationsCacheKey } from '@/lib/notifications/notifications-cache';
import type { OfflineQueuedOp } from '@/types/offline';
import {
	flushOfflineQueueCore,
	LAST_NOTIFICATIONS_REFRESH_STATE_KEY,
	LAST_REPLAY_STATE_KEY,
	refreshGlobalNotificationsCache,
} from './offline-sync-core';

const mockAddOfflineConflictLog = jest.fn();
const mockDeleteOfflineOp = jest.fn();
const mockGetOfflineQueuedOps = jest.fn();
const mockSetOfflineSyncState = jest.fn();
const mockSetWorkspaceCacheRecord = jest.fn();
const mockUpdateOfflineOp = jest.fn();

jest.mock('@/lib/offline/indexed-db', () => ({
	addOfflineConflictLog: (...args: unknown[]) => mockAddOfflineConflictLog(...args),
	deleteOfflineOp: (...args: unknown[]) => mockDeleteOfflineOp(...args),
	getOfflineQueuedOps: (...args: unknown[]) => mockGetOfflineQueuedOps(...args),
	setOfflineSyncState: (...args: unknown[]) => mockSetOfflineSyncState(...args),
	setWorkspaceCacheRecord: (...args: unknown[]) =>
		mockSetWorkspaceCacheRecord(...args),
	updateOfflineOp: (...args: unknown[]) => mockUpdateOfflineOp(...args),
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

const getFetchUrl = (input: string | URL | Request): string => {
	if (typeof input === 'string') {
		return input;
	}

	if (input instanceof URL) {
		return input.toString();
	}

	return input.url;
};

describe('offline-sync-core', () => {
	beforeEach(() => {
		jest.clearAllMocks();

		Object.defineProperty(window.navigator, 'onLine', {
			configurable: true,
			value: true,
		});
	});

	it('refreshes only the global notifications cache key', async () => {
		global.fetch = jest.fn(async (input) => {
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
						data: {
							notifications: [{ id: 'notification-1' }],
							unreadCount: 1,
						},
					}),
				} as Response;
			}
			throw new Error(`Unexpected fetch URL: ${url}`);
		}) as jest.MockedFunction<typeof fetch>;

		await refreshGlobalNotificationsCache();

		expect(mockSetWorkspaceCacheRecord).toHaveBeenCalledTimes(1);
		expect(mockSetWorkspaceCacheRecord).toHaveBeenCalledWith(
			buildNotificationsCacheKey('user-1', null),
			{
				notifications: [{ id: 'notification-1' }],
				unreadCount: 1,
			}
		);
		expect(mockSetOfflineSyncState).toHaveBeenCalledWith(
			LAST_NOTIFICATIONS_REFRESH_STATE_KEY,
			expect.objectContaining({
				ok: true,
				reason: null,
			})
		);
	});

	it('replays queued ops through the shared core for service-worker sync', async () => {
		const operation = createOperation('sw-core-1');

		mockGetOfflineQueuedOps
			.mockResolvedValueOnce([operation])
			.mockResolvedValueOnce([]);

		global.fetch = jest.fn(async (input, init) => {
			const url = getFetchUrl(input);
			if (url === '/api/offline/ops/batch') {
				const body = JSON.parse((init?.body as string) ?? '{}') as {
					operations: OfflineQueuedOp[];
				};
				return {
					ok: true,
					status: 200,
					json: async () => ({
						data: {
							results: body.operations.map((queuedOperation) => ({
								opId: queuedOperation.opId,
								status: 'applied',
							})),
						},
					}),
				} as Response;
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

		const result = await flushOfflineQueueCore({
			reason: 'sw',
			allowWithoutWindow: true,
		});

		expect(result).toEqual({
			ok: true,
			processedCount: 1,
			reason: null,
			authPaused: false,
		});
		expect(mockDeleteOfflineOp).toHaveBeenCalledWith(operation.opId);
		expect(mockSetWorkspaceCacheRecord).toHaveBeenCalledWith(
			buildNotificationsCacheKey('user-1', null),
			{
				notifications: [],
				unreadCount: 0,
			}
		);
		expect(mockSetOfflineSyncState).toHaveBeenCalledWith(
			LAST_REPLAY_STATE_KEY,
			expect.objectContaining({
				ok: true,
				processedCount: 1,
			})
		);
	});

	it('pauses on auth failure without scheduling a retry', async () => {
		const operation = createOperation('auth-core-1');
		const scheduleRetryWithBackoff = jest.fn();

		mockGetOfflineQueuedOps.mockResolvedValueOnce([operation]);
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: false,
			status: 401,
		}) as jest.MockedFunction<typeof fetch>;

		const result = await flushOfflineQueueCore({
			reason: 'online',
			scheduleRetryWithBackoff,
		});

		expect(result).toEqual({
			ok: false,
			processedCount: 1,
			reason: 'Replay paused due to authentication (401)',
			authPaused: true,
		});
		expect(scheduleRetryWithBackoff).not.toHaveBeenCalled();
		expect(mockUpdateOfflineOp).toHaveBeenCalledWith(
			operation.opId,
			expect.objectContaining({
				status: 'queued',
				lastError: expect.stringContaining('authentication'),
			})
		);
	});

	it('dead-letters non-auth 4xx failures without retrying', async () => {
		const operation = createOperation('terminal-core-1');
		const scheduleRetryWithBackoff = jest.fn();

		mockGetOfflineQueuedOps.mockResolvedValueOnce([operation]);
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: false,
			status: 422,
		}) as jest.MockedFunction<typeof fetch>;

		const result = await flushOfflineQueueCore({
			reason: 'online',
			scheduleRetryWithBackoff,
		});

		expect(result).toEqual({
			ok: false,
			processedCount: 1,
			reason: 'Batch replay failed with HTTP 422 (online)',
			authPaused: false,
		});
		expect(scheduleRetryWithBackoff).not.toHaveBeenCalled();
		expect(mockUpdateOfflineOp).toHaveBeenCalledWith(
			operation.opId,
			expect.objectContaining({
				attempts: 1,
				status: 'dead_letter',
				lastError: 'Batch replay failed with HTTP 422 (online)',
			})
		);
	});
});
