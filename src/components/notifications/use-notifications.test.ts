import { act, renderHook, waitFor } from '@testing-library/react';
import type { NotificationRecord } from '@/types/notification';
import {
	resetSharedNotificationsForTests,
	useNotifications,
} from './use-notifications';

type NotificationStoreState = {
	currentUser: { id: string } | null;
};

const mockUseAppStore = jest.fn();
const mockSubscribeToNotificationChannel = jest.fn();
const mockGetWorkspaceCacheRecord = jest.fn();
const mockSetWorkspaceCacheRecord = jest.fn();
const mockQueueMutation = jest.fn();

jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: (selector: (state: NotificationStoreState) => unknown) =>
		mockUseAppStore(selector),
}));

jest.mock('@/lib/realtime/notification-channel', () => ({
	subscribeToNotificationChannel: (...args: unknown[]) =>
		mockSubscribeToNotificationChannel(...args),
}));

jest.mock('@/lib/offline/indexed-db', () => ({
	getWorkspaceCacheRecord: (...args: unknown[]) =>
		mockGetWorkspaceCacheRecord(...args),
	setWorkspaceCacheRecord: (...args: unknown[]) =>
		mockSetWorkspaceCacheRecord(...args),
}));

jest.mock('@/lib/offline/offline-mutation-adapter', () => ({
	queueMutation: (...args: unknown[]) => mockQueueMutation(...args),
}));

const createNotification = (
	id: string,
	mapId: string | null,
	overrides: Partial<NotificationRecord> = {}
): NotificationRecord => ({
	id,
	recipient_user_id: 'user-1',
	actor_user_id: null,
	map_id: mapId,
	event_type: 'comment_mention',
	title: `Notification ${id}`,
	body: `Body ${id}`,
	metadata: {},
	dedupe_key: `${id}:dedupe`,
	is_read: false,
	read_at: null,
	email_status: 'pending',
	email_error: null,
	emailed_at: null,
	created_at: '2026-04-13T08:00:00.000Z',
	updated_at: '2026-04-13T08:00:00.000Z',
	...overrides,
});

describe('useNotifications', () => {
	let mockState: NotificationStoreState;
	let disconnect: jest.Mock;
	let fetchMock: jest.Mock;
	let cacheStore: Map<string, unknown>;

	beforeEach(() => {
		jest.clearAllMocks();
		resetSharedNotificationsForTests();

		mockState = {
			currentUser: { id: 'user-1' },
		};
		mockUseAppStore.mockImplementation(
			(selector: (state: NotificationStoreState) => unknown) =>
				selector(mockState)
		);

		disconnect = jest.fn();
		mockSubscribeToNotificationChannel.mockResolvedValue({
			socket: null,
			disconnect,
		});

		cacheStore = new Map();
		mockSetWorkspaceCacheRecord.mockImplementation(
			async (key: string, value: unknown) => {
				cacheStore.set(key, value);
			}
		);
		mockGetWorkspaceCacheRecord.mockImplementation(async (key: string) => {
			if (!cacheStore.has(key)) {
				return null;
			}

			return { payload: cacheStore.get(key) };
		});
		mockQueueMutation.mockResolvedValue({ status: 'applied', opId: 'op-1' });

		fetchMock = jest.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				status: 'success',
				data: {
					notifications: [],
					unreadCount: 0,
				},
			}),
		});
		global.fetch = fetchMock as typeof fetch;
	});

	it('drops an idle scope so the same filter refetches on remount', async () => {
		const firstRender = renderHook(() =>
			useNotifications({ filterMapId: 'map-1' })
		);

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledTimes(1);
		});

		firstRender.unmount();
		fetchMock.mockClear();

		renderHook(() => useNotifications({ filterMapId: 'map-1' }));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledTimes(1);
		});
	});

	it('keeps the shared realtime channel alive until the last listener unsubscribes', async () => {
		const firstRender = renderHook(() =>
			useNotifications({ filterMapId: 'map-1' })
		);
		const secondRender = renderHook(() =>
			useNotifications({ filterMapId: 'map-2' })
		);

		await waitFor(() => {
			expect(mockSubscribeToNotificationChannel).toHaveBeenCalledTimes(1);
		});

		firstRender.unmount();
		expect(disconnect).not.toHaveBeenCalled();

		secondRender.unmount();

		await waitFor(() => {
			expect(disconnect).toHaveBeenCalledTimes(1);
		});
	});

	it('uses user-scoped cache keys and applies optimistic queued read updates across affected scopes', async () => {
		const mapNotification = createNotification('notif-map', 'map-1');
		const otherNotification = createNotification('notif-other', 'map-2');
		let shouldFailFetch = false;

		fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
			if (shouldFailFetch) {
				throw new Error('offline');
			}

			const url = typeof input === 'string' ? input : input.toString();
			if (url.includes('mapId=map-1')) {
				return {
					ok: true,
					json: async () => ({
						status: 'success',
						data: {
							notifications: [mapNotification],
							unreadCount: 1,
						},
					}),
				} as Response;
			}

			return {
				ok: true,
				json: async () => ({
					status: 'success',
					data: {
						notifications: [mapNotification, otherNotification],
						unreadCount: 2,
					},
				}),
			} as Response;
		});
		mockQueueMutation.mockResolvedValue({ status: 'queued', opId: 'queued-op-1' });

		const allScope = renderHook(() => useNotifications());
		const mapScope = renderHook(() =>
			useNotifications({ filterMapId: 'map-1' })
		);

		await waitFor(() => {
			expect(allScope.result.current.visibleUnreadCount).toBe(2);
			expect(mapScope.result.current.visibleUnreadCount).toBe(1);
		});

		expect(mockSetWorkspaceCacheRecord).toHaveBeenCalledWith(
			'notifications:user-1:__all__',
			expect.objectContaining({
				unreadCount: 2,
			})
		);
		expect(mockSetWorkspaceCacheRecord).toHaveBeenCalledWith(
			'notifications:user-1:map-1',
			expect.objectContaining({
				unreadCount: 1,
			})
		);

		shouldFailFetch = true;
		await act(async () => {
			await mapScope.result.current.markAllAsRead();
		});

		await waitFor(() => {
			expect(mapScope.result.current.visibleUnreadCount).toBe(0);
			expect(allScope.result.current.visibleUnreadCount).toBe(1);
		});

		expect(cacheStore.get('notifications:user-1:map-1')).toEqual(
			expect.objectContaining({
				unreadCount: 0,
			})
		);
		expect(cacheStore.get('notifications:user-1:__all__')).toEqual(
			expect.objectContaining({
				unreadCount: 1,
			})
		);
	});
});
