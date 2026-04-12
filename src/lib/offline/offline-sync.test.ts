import type { OfflineQueuedOp } from '@/types/offline';
import { waitFor } from '@testing-library/react';
import {
	flushOfflineQueue,
	initializeOfflineSync,
	resetOfflineSyncForTests,
} from './offline-sync';

const mockAddOfflineConflictLog = jest.fn();
const mockDeleteOfflineOp = jest.fn();
const mockGetOfflineQueuedOps = jest.fn();
const mockResetProcessingOpsToQueued = jest.fn();
const mockUpdateOfflineOp = jest.fn();

jest.mock('@/lib/offline/indexed-db', () => ({
	addOfflineConflictLog: (...args: unknown[]) => mockAddOfflineConflictLog(...args),
	deleteOfflineOp: (...args: unknown[]) => mockDeleteOfflineOp(...args),
	getOfflineQueuedOps: (...args: unknown[]) => mockGetOfflineQueuedOps(...args),
	resetProcessingOpsToQueued: (...args: unknown[]) =>
		mockResetProcessingOpsToQueued(...args),
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
				ready: Promise.resolve({ sync: { register: jest.fn() } }),
				addEventListener: jest.fn(),
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

		global.fetch = jest.fn(async (_url, init) => {
			const body = JSON.parse((init?.body as string) ?? '{}') as {
				operations: OfflineQueuedOp[];
			};
			return createSuccessResponse(body.operations) as unknown as Response;
		}) as jest.MockedFunction<typeof fetch>;

		await flushOfflineQueue({ reason: 'online' });

		expect(global.fetch).toHaveBeenCalledTimes(2);
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
			.mockImplementationOnce(async (_url, init) => {
				const body = JSON.parse((init?.body as string) ?? '{}') as {
					operations: OfflineQueuedOp[];
				};
				return createSuccessResponse(body.operations);
			}) as jest.MockedFunction<typeof fetch>;

		await flushOfflineQueue({ reason: 'online' });
		expect(mockDeleteOfflineOp).not.toHaveBeenCalled();

		await jest.advanceTimersByTimeAsync(500);

		expect(global.fetch).toHaveBeenCalledTimes(2);
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
	});
});
