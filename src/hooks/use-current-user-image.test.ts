import { generateFallbackAvatar } from '@/helpers/user-profile-helpers';
import { renderHook } from '@testing-library/react';
import { useCurrentUserImage } from './use-current-user-image';

type StoreState = {
	currentUser: {
		id?: string;
		email?: string | null;
		user_metadata?: Record<string, unknown>;
	} | null;
	userProfile: {
		user_id?: string;
		avatar_url?: string | null;
		email?: string | null;
	} | null;
};

const mockUseAppStore = jest.fn();

jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: (selector: (state: StoreState) => unknown) =>
		mockUseAppStore(selector),
}));

describe('useCurrentUserImage', () => {
	let mockState: StoreState;

	beforeEach(() => {
		mockState = {
			currentUser: null,
			userProfile: null,
		};
		mockUseAppStore.mockImplementation((selector: (state: StoreState) => unknown) =>
			selector(mockState)
		);
	});

	it('prefers user_profiles avatar over metadata avatars', () => {
		mockState = {
			currentUser: {
				id: 'user-1',
				user_metadata: {
					avatar_url: 'https://cdn.example.com/meta-avatar.png',
				},
			},
			userProfile: {
				user_id: 'user-1',
				avatar_url: 'https://cdn.example.com/profile-avatar.png',
			},
		};

		const { result } = renderHook(() => useCurrentUserImage('#ffffff'));
		expect(result.current).toBe('https://cdn.example.com/profile-avatar.png');
	});

	it('falls back to metadata avatar_url and picture when profile avatar is missing', () => {
		mockState = {
			currentUser: {
				id: 'user-2',
				user_metadata: {
					avatar_url: 'https://cdn.example.com/meta-avatar.png',
				},
			},
			userProfile: {
				user_id: 'user-2',
				avatar_url: ' ',
			},
		};

		const { result, rerender } = renderHook(() => useCurrentUserImage());
		expect(result.current).toBe('https://cdn.example.com/meta-avatar.png');

		mockState = {
			currentUser: {
				id: 'user-2',
				user_metadata: {
					picture: 'https://cdn.example.com/meta-picture.png',
				},
			},
			userProfile: {
				user_id: 'user-2',
				avatar_url: null,
			},
		};
		rerender();
		expect(result.current).toBe('https://cdn.example.com/meta-picture.png');
	});

	it('falls back to deterministic avatar when profile and metadata are missing', () => {
		mockState = {
			currentUser: {
				id: 'user-3',
				user_metadata: {},
			},
			userProfile: {
				user_id: 'user-3',
				avatar_url: null,
			},
		};

		const { result } = renderHook(() => useCurrentUserImage());
		expect(result.current).toBe(generateFallbackAvatar('user-3'));
	});
});

