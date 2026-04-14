import { queueMutation } from './offline-mutation-adapter';

const mockDeleteOfflineOp = jest.fn();
const mockEnqueueOfflineOp = jest.fn();
const mockUpdateOfflineOp = jest.fn();
const mockEnqueueSyncKick = jest.fn();

jest.mock('@/lib/offline/indexed-db', () => ({
	deleteOfflineOp: (...args: unknown[]) => mockDeleteOfflineOp(...args),
	enqueueOfflineOp: (...args: unknown[]) => mockEnqueueOfflineOp(...args),
	updateOfflineOp: (...args: unknown[]) => mockUpdateOfflineOp(...args),
}));

jest.mock('@/lib/offline/offline-sync', () => ({
	enqueueSyncKick: (...args: unknown[]) => mockEnqueueSyncKick(...args),
}));

describe('queueMutation', () => {
	beforeEach(() => {
		jest.clearAllMocks();

		Object.defineProperty(window.navigator, 'onLine', {
			configurable: true,
			value: true,
		});
	});

	it('still applies online mutations when local queue persistence fails', async () => {
		mockEnqueueOfflineOp.mockRejectedValueOnce(new Error('IndexedDB unavailable'));
		const executeOnline = jest.fn().mockResolvedValue({ id: 'map-1' });

		const result = await queueMutation({
			entity: 'mind_maps',
			action: 'update',
			payload: {
				table: 'mind_maps',
				values: { title: 'Updated' },
				match: { id: 'map-1' },
			},
			executeOnline,
		});

		expect(result.status).toBe('applied');
		expect(result.data).toEqual({ id: 'map-1' });
		expect(executeOnline).toHaveBeenCalledTimes(1);
		expect(mockDeleteOfflineOp).not.toHaveBeenCalled();
		expect(mockUpdateOfflineOp).not.toHaveBeenCalled();
	});

	it('returns queued only when the offline mutation was persisted', async () => {
		Object.defineProperty(window.navigator, 'onLine', {
			configurable: true,
			value: false,
		});

		mockEnqueueOfflineOp.mockResolvedValueOnce(true);

		const result = await queueMutation({
			entity: 'mind_maps',
			action: 'update',
			payload: {
				table: 'mind_maps',
				values: { title: 'Queued' },
				match: { id: 'map-1' },
			},
			executeOnline: jest.fn(),
		});

		expect(result.status).toBe('queued');
		expect(mockEnqueueSyncKick).toHaveBeenCalledTimes(1);
	});

	it('throws offline when queue persistence failed and nothing was stored', async () => {
		Object.defineProperty(window.navigator, 'onLine', {
			configurable: true,
			value: false,
		});

		mockEnqueueOfflineOp.mockResolvedValueOnce(false);

		await expect(
			queueMutation({
				entity: 'mind_maps',
				action: 'update',
				payload: {
					table: 'mind_maps',
					values: { title: 'Queued' },
					match: { id: 'map-1' },
				},
				executeOnline: jest.fn(),
			})
		).rejects.toThrow('Failed to queue offline mutation while the client is offline.');

		expect(mockEnqueueSyncKick).not.toHaveBeenCalled();
	});
});
