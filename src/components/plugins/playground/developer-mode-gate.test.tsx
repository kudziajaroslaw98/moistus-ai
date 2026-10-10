import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let mockState: Record<string, unknown> = {};

jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: (selector: (state: Record<string, unknown>) => unknown) =>
		selector(mockState),
}));

import { DeveloperModeGate } from './developer-mode-gate';

const updatePreferences = jest.fn().mockResolvedValue(undefined);

function setup(userProfile: unknown) {
	mockState = { userProfile, updatePreferences };
	render(
		<DeveloperModeGate>
			<p>The playground</p>
		</DeveloperModeGate>
	);
	return userEvent.setup();
}

beforeEach(() => jest.clearAllMocks());

describe('DeveloperModeGate', () => {
	it('shows the page once Developer mode is on', () => {
		setup({ is_anonymous: false, preferences: { developerMode: true } });
		expect(screen.getByText('The playground')).toBeInTheDocument();
		expect(screen.queryByRole('switch')).not.toBeInTheDocument();
	});

	it('says what Developer mode is and offers the switch when it is off', async () => {
		const user = setup({
			is_anonymous: false,
			preferences: { developerMode: false },
		});

		expect(screen.queryByText('The playground')).not.toBeInTheDocument();
		expect(
			screen.getByRole('heading', {
				name: /Writing plugins needs Developer mode/,
			})
		).toBeInTheDocument();
		expect(screen.getByText(/Only you see your drafts/)).toBeInTheDocument();

		await user.click(screen.getByRole('switch', { name: 'Developer mode' }));
		expect(updatePreferences).toHaveBeenCalledWith({ developerMode: true });
	});

	it('shows nothing of the page while the profile is still loading', () => {
		setup(null);
		expect(screen.queryByText('The playground')).not.toBeInTheDocument();
		expect(screen.queryByRole('heading')).not.toBeInTheDocument();
	});
});
