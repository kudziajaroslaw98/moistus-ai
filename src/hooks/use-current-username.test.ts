import { generateFunName } from '@/helpers/user-profile-helpers';
import { renderHook } from '@testing-library/react';
import { useCurrentUserName } from './use-current-username';

type StoreState = {
	currentUser: {
		id?: string;
		email?: string | null;
		user_metadata?: Record<string, unknown>;
	} | null;
	userProfile: {
		user_id?: string;
		display_name?: string | null;
		full_name?: string | null;
		email?: string | null;
	} | null;
};

const mockUseAppStore = jest.fn();

jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: (selector: (state: StoreState) => unknown) =>
		mockUseAppStore(selector),
}));

describe('useCurrentUserName', () => {
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

	it('prefers user_profiles display_name over full_name and metadata', () => {
		mockState = {
			currentUser: {
				id: 'user-1',
				email: 'metadata@example.com',
				user_metadata: {
					display_name: 'Metadata Name',
					full_name: 'Metadata Full Name',
				},
			},
			userProfile: {
				user_id: 'user-1',
				display_name: 'Profile Display Name',
				full_name: 'Profile Full Name',
				email: 'profile@example.com',
			},
		};

		const { result } = renderHook(() => useCurrentUserName());
		expect(result.current).toBe('Profile Display Name');
	});

	it('falls back to metadata then email prefix when profile fields are missing', () => {
		mockState = {
			currentUser: {
				id: 'user-2',
				email: 'current-user@example.com',
				user_metadata: {
					full_name: 'Metadata Full Name',
				},
			},
			userProfile: {
				user_id: 'user-2',
				display_name: ' ',
				full_name: '',
				email: 'profile-email@example.com',
			},
		};

		const { result, rerender } = renderHook(() => useCurrentUserName());
		expect(result.current).toBe('Metadata Full Name');

		mockState = {
			currentUser: {
				id: 'user-2',
				email: 'current-user@example.com',
				user_metadata: {},
			},
			userProfile: {
				user_id: 'user-2',
				display_name: null,
				full_name: null,
				email: 'profile-email@example.com',
			},
		};
		rerender();

		expect(result.current).toBe('profile-email');
	});

	it('uses deterministic fun-name fallback when profile, metadata, and email are absent', () => {
		mockState = {
			currentUser: {
				id: 'user-3',
				email: null,
				user_metadata: {},
			},
			userProfile: {
				user_id: 'user-3',
				display_name: null,
				full_name: null,
				email: null,
			},
		};

		const { result } = renderHook(() => useCurrentUserName());
		expect(result.current).toBe(generateFunName('user-3'));
	});
});

