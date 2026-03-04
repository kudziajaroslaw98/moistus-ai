import useAppStore from '@/store/mind-map-store';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TextareaHTMLAttributes } from 'react';
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
			name: 'On',
		});
		await user.click(emailNotificationsToggle);

		const saveButton = screen.getByRole('button', { name: 'Save Changes' });
		await user.click(saveButton);

		await waitFor(() => {
			expect(mockState.updateUserProfile).toHaveBeenCalledTimes(1);
		});

		expect(mockState.updateUserProfile).toHaveBeenCalledWith({
			preferences: expect.objectContaining({
				notifications: {
					email: false,
				},
			}),
		});
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
});
