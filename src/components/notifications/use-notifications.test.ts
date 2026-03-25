import { renderHook, waitFor } from '@testing-library/react';
import {
	resetSharedNotificationsForTests,
	useNotifications,
} from './use-notifications';

type NotificationStoreState = {
	currentUser: { id: string } | null;
};

const mockUseAppStore = jest.fn();
const mockSubscribeToNotificationChannel = jest.fn();

jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: (selector: (state: NotificationStoreState) => unknown) =>
		mockUseAppStore(selector),
}));

jest.mock('@/lib/realtime/notification-channel', () => ({
	subscribeToNotificationChannel: (...args: unknown[]) =>
		mockSubscribeToNotificationChannel(...args),
}));

describe('useNotifications', () => {
	let mockState: NotificationStoreState;
	let disconnect: jest.Mock;
	let fetchMock: jest.Mock;

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
});
