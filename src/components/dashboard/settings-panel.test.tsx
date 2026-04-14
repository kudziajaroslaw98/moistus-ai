import useAppStore from '@/store/mind-map-store';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TextareaHTMLAttributes } from 'react';
import { getBackgroundSyncStatus } from '@/lib/offline/offline-sync';
import { toast } from 'sonner';
import { SettingsPanel } from './settings-panel';

jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: jest.fn(),
}));

jest.mock('next/navigation', () => ({
	useRouter: () => ({
		push: jest.fn(),
	}),
}));

jest.mock('@/lib/offline/offline-sync', () => ({
	getBackgroundSyncStatus: jest.fn(),
}));

jest.mock('@/hooks/subscription/use-feature-gate', () => ({
	useSubscriptionLimits: () => ({
		limits: {
			mindMaps: 3,
			collaboratorsPerMap: 3,
			aiSuggestions: 0,
		},
	}),
}));

jest.mock('@/components/settings/node-type-selector', () => ({
	NodeTypeSelector: ({
		value,
		onChange,
		disabled,
	}: {
		value: string;
		onChange: (value: string) => void;
		disabled?: boolean;
	}) => (
		<select
			aria-label='Default Node Type'
			disabled={disabled}
			onChange={(e) => onChange(e.target.value)}
			value={value}
		>
			<option value='defaultNode'>Default</option>
			<option value='textNode'>Text</option>
		</select>
	),
}));

jest.mock('@/components/ui/textarea', () => ({
	Textarea: ({
		error: _error,
		...props
	}: TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }) => (
		<textarea {...props} />
	),
}));

jest.mock('@/components/account/delete-account-dialog', () => ({
	DeleteAccountDialog: ({ open }: { open: boolean }) =>
		open ? <div data-testid='delete-account-dialog'>Delete Account Dialog</div> : null,
}));

jest.mock('@/components/auth/change-password-modal', () => ({
	ChangePasswordModal: ({ open }: { open: boolean }) =>
		open ? <div data-testid='change-password-modal'>Change Password Modal</div> : null,
}));

jest.mock('@/components/dashboard/discard-account-settings-changes-dialog', () => ({
	DiscardAccountSettingsChangesDialog: ({
		open,
		onContinueEditing,
		onDiscardChanges,
	}: {
		open: boolean;
		onContinueEditing: () => void;
		onDiscardChanges: () => void;
	}) =>
		open ? (
			<div data-testid='discard-account-settings-dialog'>
				<button onClick={onContinueEditing} type='button'>
					Continue editing
				</button>
				<button onClick={onDiscardChanges} type='button'>
					Discard changes
				</button>
			</div>
		) : null,
}));

jest.mock('@/components/dashboard/cancel-subscription-dialog', () => ({
	CancelSubscriptionDialog: ({
		open,
		onConfirm,
	}: {
		open: boolean;
		onConfirm: () => void;
	}) =>
		open ? (
			<div data-testid='cancel-subscription-dialog'>
				<button onClick={onConfirm} type='button'>
					Confirm cancellation
				</button>
			</div>
		) : null,
}));

jest.mock('sonner', () => ({
	toast: {
		success: jest.fn(),
		error: jest.fn(),
	},
}));

type MockStoreState = {
	userProfile: {
		id: string;
		user_id: string;
		full_name: string;
		display_name: string;
		bio: string;
		email: string;
		created_at: string;
		updated_at: string;
		preferences: {
			theme: 'light' | 'dark' | 'system';
			accentColor: string;
			reducedMotion: boolean;
			notifications: {
				email: boolean;
				push?: boolean;
				push_comments?: boolean;
				push_mentions?: boolean;
				push_reactions?: boolean;
			};
			defaultNodeType: 'defaultNode' | 'textNode';
			privacy: {
				profile_visibility: 'public' | 'private' | 'connections';
			};
		};
	};
	isLoadingProfile: boolean;
	profileError: string | null;
	loadUserProfile: jest.Mock;
	updateUserProfile: jest.Mock;
	clearProfileError: jest.Mock;
	unsubscribeFromProfileChanges: jest.Mock;
	isLoggingOut: boolean;
	currentSubscription: {
		id: string;
		status: 'active' | 'trialing' | 'canceled';
		cancelAtPeriodEnd: boolean;
		currentPeriodStart: Date;
		currentPeriodEnd: Date;
		plan: {
			displayName: string;
			priceMonthly: number;
			name: string;
		};
	} | null;
	availablePlans: unknown[];
	isLoadingSubscription: boolean;
	fetchUserSubscription: jest.Mock;
	fetchAvailablePlans: jest.Mock;
	cancelSubscription: jest.Mock;
	isTrialing: jest.Mock;
	getTrialDaysRemaining: jest.Mock;
	setPopoverOpen: jest.Mock;
	reset: jest.Mock;
};

const mockUseAppStore = useAppStore as unknown as jest.Mock;
const mockGetBackgroundSyncStatus =
	getBackgroundSyncStatus as jest.MockedFunction<typeof getBackgroundSyncStatus>;
const toastMock = toast as jest.Mocked<typeof toast>;

const createMockState = (): MockStoreState => ({
	userProfile: {
		id: 'profile-1',
		user_id: 'user-1',
		full_name: 'Test User',
		display_name: 'Tester',
		bio: 'Original bio',
		email: 'test@example.com',
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z',
		preferences: {
			theme: 'system',
			accentColor: 'sky',
			reducedMotion: false,
			notifications: {
				email: true,
			},
			defaultNodeType: 'defaultNode',
			privacy: {
				profile_visibility: 'public',
			},
		},
	},
	isLoadingProfile: false,
	profileError: null,
	loadUserProfile: jest.fn().mockResolvedValue(undefined),
	updateUserProfile: jest.fn().mockResolvedValue(undefined),
	clearProfileError: jest.fn(),
	unsubscribeFromProfileChanges: jest.fn(),
	isLoggingOut: false,
	currentSubscription: {
		id: 'sub-1',
		status: 'active',
		cancelAtPeriodEnd: false,
		currentPeriodStart: new Date('2026-02-01T00:00:00.000Z'),
		currentPeriodEnd: new Date('2026-03-01T00:00:00.000Z'),
		plan: {
			displayName: 'Pro',
			priceMonthly: 12,
			name: 'pro',
		},
	},
	availablePlans: [],
	isLoadingSubscription: false,
	fetchUserSubscription: jest.fn().mockResolvedValue(undefined),
	fetchAvailablePlans: jest.fn().mockResolvedValue(undefined),
	cancelSubscription: jest.fn().mockResolvedValue(undefined),
	isTrialing: jest.fn(() => false),
	getTrialDaysRemaining: jest.fn(() => null),
	setPopoverOpen: jest.fn(),
	reset: jest.fn(),
});

describe('SettingsPanel', () => {
	let mockState: MockStoreState;
	let originalFetch: unknown;
	const globalWithFetch = globalThis as unknown as { fetch?: jest.Mock };

	beforeAll(() => {
		originalFetch = globalWithFetch.fetch;
	});

	beforeEach(() => {
		jest.clearAllMocks();
		mockState = createMockState();
		mockUseAppStore.mockImplementation(
			(selector: (state: MockStoreState) => unknown) => selector(mockState)
		);

		globalWithFetch.fetch = jest.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					data: {
						mindMapsCount: 1,
						collaboratorsCount: 0,
						storageUsedMB: 0,
						aiSuggestionsCount: 0,
						billingPeriod: {
							start: '2026-02-01T00:00:00.000Z',
							end: '2026-03-01T00:00:00.000Z',
						},
					},
				}),
			} as Response);

		Object.defineProperty(window, 'PushManager', {
			configurable: true,
			value: function PushManager() {},
		});
		Object.defineProperty(window, 'Notification', {
			configurable: true,
			value: {
				requestPermission: jest.fn().mockResolvedValue('granted'),
			},
		});
		Object.defineProperty(window.navigator, 'serviceWorker', {
			configurable: true,
			value: {
				getRegistration: jest.fn().mockResolvedValue(undefined),
			},
		});
		mockGetBackgroundSyncStatus.mockResolvedValue({
			capabilities: {
				serviceWorkerEnabled: true,
				oneOffSupported: true,
				periodicSupported: false,
			},
			lastReplay: {
				ok: true,
				reason: null,
				updatedAt: '2026-04-14T08:00:00.000Z',
				processedCount: 2,
			},
			lastNotificationRefresh: {
				ok: true,
				reason: null,
				updatedAt: '2026-04-14T09:00:00.000Z',
			},
			lastCapabilityFailure: {
				source: 'periodic',
				reason: 'permission_prompt',
				updatedAt: '2026-04-14T09:00:00.000Z',
			},
		});
	});

	afterEach(() => {
		if (originalFetch) {
			globalWithFetch.fetch = originalFetch as jest.Mock;
			return;
		}
		delete globalWithFetch.fetch;
	});

	it('renders account and billing sections', async () => {
		const user = userEvent.setup();

		render(<SettingsPanel isOpen onClose={jest.fn()} />);

		expect(screen.getByText('Profile')).toBeInTheDocument();
		expect(screen.getByText('Privacy')).toBeInTheDocument();
		expect(screen.getByText('Appearance')).toBeInTheDocument();
		expect(screen.getByText('Security')).toBeInTheDocument();
		expect(await screen.findByText('Background sync')).toBeInTheDocument();
		expect(screen.getByText('One-off replay supported')).toBeInTheDocument();
		expect(screen.getByText('Periodic refresh unavailable')).toBeInTheDocument();

		await user.click(screen.getByRole('tab', { name: /billing/i }));

		expect(screen.getByText('Current Plan')).toBeInTheDocument();
		expect(screen.getByText('Usage')).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: 'Cancel Subscription' })
		).toBeInTheDocument();
	});

	it('enforces validation and keeps save disabled when invalid', async () => {
		const user = userEvent.setup();

		render(<SettingsPanel isOpen onClose={jest.fn()} />);

		const saveButton = screen.getByRole('button', { name: 'Save Changes' });
		const fullNameInput = screen.getByLabelText(/full name/i);
		const displayNameInput = screen.getByLabelText(/display name/i);
		const bioInput = screen.getByLabelText(/bio/i);

		await user.clear(fullNameInput);
		fireEvent.blur(fullNameInput);
		expect(screen.getByText('Full name is required')).toBeInTheDocument();
		expect(saveButton).toBeDisabled();

		await user.type(fullNameInput, 'Valid Name');
		fireEvent.blur(fullNameInput);

		fireEvent.change(displayNameInput, { target: { value: 'd'.repeat(101) } });
		fireEvent.blur(displayNameInput);
		expect(
			screen.getByText('Display name must be 100 characters or less')
		).toBeInTheDocument();
		expect(saveButton).toBeDisabled();

		fireEvent.change(displayNameInput, { target: { value: 'ValidDisplay' } });
		fireEvent.change(bioInput, { target: { value: 'b'.repeat(501) } });
		fireEvent.blur(bioInput);
		expect(screen.getByText('Bio must be 500 characters or less')).toBeInTheDocument();
		expect(saveButton).toBeDisabled();
	});

	it('saves only changed fields with trimmed values', async () => {
		const user = userEvent.setup();

		render(<SettingsPanel isOpen onClose={jest.fn()} />);

		const fullNameInput = screen.getByLabelText(/full name/i);
		const bioInput = screen.getByLabelText(/bio/i);
		const saveButton = screen.getByRole('button', { name: 'Save Changes' });

		await user.clear(fullNameInput);
		await user.type(fullNameInput, '  New Full Name  ');
		await user.clear(bioInput);
		await user.type(bioInput, '  Updated bio  ');

		expect(saveButton).toBeEnabled();

		await user.click(saveButton);

		await waitFor(() => {
			expect(mockState.updateUserProfile).toHaveBeenCalledTimes(1);
		});

		expect(mockState.updateUserProfile).toHaveBeenCalledWith({
			full_name: 'New Full Name',
			bio: 'Updated bio',
		});
	});

	it('saves email notification toggle inside preferences', async () => {
		const user = userEvent.setup();

		render(<SettingsPanel isOpen onClose={jest.fn()} />);

		const emailNotificationsToggle = screen.getByRole('button', {
			name: /email notifications/i,
		});
		await user.click(emailNotificationsToggle);

		const saveButton = screen.getByRole('button', { name: 'Save Changes' });
		await user.click(saveButton);

		await waitFor(() => {
			expect(mockState.updateUserProfile).toHaveBeenCalledTimes(1);
		});

		expect(mockState.updateUserProfile).toHaveBeenCalledWith(
			expect.objectContaining({
				preferences: expect.objectContaining({
					notifications: expect.objectContaining({
						email: false,
					}),
				}),
			})
		);
	});

	it('opens discard dialog on unsaved close and discards on confirm', async () => {
		const user = userEvent.setup();
		const onClose = jest.fn();

		render(<SettingsPanel isOpen onClose={onClose} />);

		const fullNameInput = screen.getByLabelText(/full name/i);
		await user.type(fullNameInput, ' v2');

		await user.click(screen.getByLabelText('Close panel'));

		expect(screen.getByTestId('discard-account-settings-dialog')).toBeInTheDocument();
		expect(onClose).not.toHaveBeenCalled();

		await user.click(screen.getByRole('button', { name: 'Discard changes' }));

		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('requires confirmation before canceling subscription', async () => {
		const user = userEvent.setup();

		render(<SettingsPanel defaultTab='billing' isOpen onClose={jest.fn()} />);

		await user.click(screen.getByRole('button', { name: 'Cancel Subscription' }));
		expect(mockState.cancelSubscription).not.toHaveBeenCalled();
		expect(screen.getByTestId('cancel-subscription-dialog')).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: 'Confirm cancellation' }));

		await waitFor(() => {
			expect(mockState.cancelSubscription).toHaveBeenCalledTimes(1);
		});
		expect(mockState.cancelSubscription).toHaveBeenCalledWith('sub-1');
	});

	it('fails fast when push notifications are enabled without a service worker registration', async () => {
		const user = userEvent.setup();

		globalWithFetch.fetch = jest.fn(async (input: RequestInfo | URL) => {
			const url = typeof input === 'string' ? input : input.toString();
			if (url === '/api/push/public-key') {
				return {
					ok: true,
					json: async () => ({
						data: { publicKey: 'SGVsbG8' },
					}),
				} as Response;
			}

			return {
				ok: true,
				json: async () => ({
					data: {
						mindMapsCount: 1,
						collaboratorsCount: 0,
						storageUsedMB: 0,
						aiSuggestionsCount: 0,
						billingPeriod: {
							start: '2026-02-01T00:00:00.000Z',
							end: '2026-03-01T00:00:00.000Z',
						},
					},
				}),
			} as Response;
		});

		render(<SettingsPanel isOpen onClose={jest.fn()} />);

		await user.click(
			screen.getByRole('button', { name: /push notifications off/i })
		);

		await waitFor(() => {
			expect(toastMock.error).toHaveBeenCalledWith(
				'Push notifications require the service worker to be enabled.'
			);
		});
		expect(
			screen.getByRole('button', { name: /push notifications off/i })
		).toBeEnabled();
	});

	it('does not unsubscribe locally when removing the push subscription fails on the server', async () => {
		const user = userEvent.setup();
		const unsubscribe = jest.fn().mockResolvedValue(true);

		mockState.userProfile.preferences.notifications = {
			...mockState.userProfile.preferences.notifications,
			push: true,
			push_comments: true,
			push_mentions: true,
			push_reactions: true,
		};

		Object.defineProperty(window.navigator, 'serviceWorker', {
			configurable: true,
			value: {
				getRegistration: jest.fn().mockResolvedValue({
					pushManager: {
						getSubscription: jest.fn().mockResolvedValue({
							endpoint: 'https://push.example/subscription',
							unsubscribe,
						}),
					},
				}),
			},
		});

		globalWithFetch.fetch = jest.fn(async (input: RequestInfo | URL) => {
			const url = typeof input === 'string' ? input : input.toString();
			if (url === '/api/push/subscribe') {
				return { ok: false } as Response;
			}

			return {
				ok: true,
				json: async () => ({
					data: {
						mindMapsCount: 1,
						collaboratorsCount: 0,
						storageUsedMB: 0,
						aiSuggestionsCount: 0,
						billingPeriod: {
							start: '2026-02-01T00:00:00.000Z',
							end: '2026-03-01T00:00:00.000Z',
						},
					},
				}),
			} as Response;
		});

		render(<SettingsPanel isOpen onClose={jest.fn()} />);

		await user.click(
			screen.getByRole('button', { name: /push notifications on/i })
		);

		await waitFor(() => {
			expect(toastMock.error).toHaveBeenCalledWith(
				'Failed to remove push subscription on server.'
			);
		});
		expect(unsubscribe).not.toHaveBeenCalled();
		expect(
			screen.getByRole('button', { name: /push notifications on/i })
		).toHaveAttribute('aria-pressed', 'true');
	});
});
