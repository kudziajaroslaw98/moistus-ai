import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let mockState: Record<string, unknown> = {};

jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: (selector: (state: Record<string, unknown>) => unknown) =>
		selector(mockState),
}));

import { DeveloperModeSetting } from './developer-mode-switch';

const updatePreferences = jest.fn().mockResolvedValue(undefined);

function setup(userProfile: unknown) {
	mockState = { userProfile, updatePreferences };
	render(<DeveloperModeSetting id='dev-mode' />);
	return userEvent.setup();
}

beforeEach(() => jest.clearAllMocks());

describe('DeveloperModeSetting', () => {
	it('shows the saved choice and saves a change right away', async () => {
		const user = setup({ is_anonymous: false, preferences: { developerMode: true } });

		const toggle = screen.getByRole('switch', { name: 'Developer mode' });
		expect(toggle).toBeChecked();
		expect(toggle).toHaveAccessibleDescription(/Only you see those plugins/);
		await user.click(toggle);

		expect(updatePreferences).toHaveBeenCalledWith({ developerMode: false });
	});

	it('is disabled for guests', () => {
		setup({ is_anonymous: true, preferences: {} });
		expect(screen.getByRole('switch', { name: 'Developer mode' })).toBeDisabled();
	});

	it('is disabled until the profile has loaded', () => {
		setup(null);
		expect(screen.getByRole('switch', { name: 'Developer mode' })).toBeDisabled();
	});
});
