import { act, render, screen } from '@testing-library/react';
import { ActionBar } from './action-bar';

function setNavigatorPlatform(platform: string) {
	Object.defineProperty(window.navigator, 'userAgentData', {
		configurable: true,
		value: { platform },
	});
	Object.defineProperty(window.navigator, 'platform', {
		configurable: true,
		value: platform,
	});
}

describe('ActionBar', () => {
	const originalPlatform = window.navigator.platform;
	const originalUserAgentData = (
		window.navigator as Navigator & {
			userAgentData?: { platform?: string };
		}
	).userAgentData;

	afterEach(() => {
		Object.defineProperty(window.navigator, 'userAgentData', {
			configurable: true,
			value: originalUserAgentData,
		});
		Object.defineProperty(window.navigator, 'platform', {
			configurable: true,
			value: originalPlatform,
		});
	});

	it('shows mac shortcut hints when platform is macOS', async () => {
		setNavigatorPlatform('MacIntel');

		await act(async () => {
			render(
				<ActionBar
					canCreate
					isCreating={false}
					onCreate={jest.fn()}
				/>
			);
		});

		expect(
			screen.getByText(/Cmd\+Enter to create/)
		).toBeInTheDocument();
		expect(
			screen.getByText(/Cmd\+\./)
		).toBeInTheDocument();
	});

	it('shows ctrl shortcut hints for non-mac platforms', async () => {
		setNavigatorPlatform('Win32');

		await act(async () => {
			render(
				<ActionBar
					canCreate
					isCreating={false}
					onCreate={jest.fn()}
				/>
			);
		});

		expect(
			screen.getByText(/Ctrl\+Enter to create/)
		).toBeInTheDocument();
		expect(
			screen.getByText(/Ctrl\+Space/)
		).toBeInTheDocument();
	});
});