import { renderHook, waitFor } from '@testing-library/react';
import { useIsMac } from './use-platform';

function setNavigatorPlatform({
	userAgentDataPlatform,
	platform,
}: {
	userAgentDataPlatform?: string;
	platform: string;
}) {
	Object.defineProperty(window.navigator, 'userAgentData', {
		configurable: true,
		value: userAgentDataPlatform
			? {
					platform: userAgentDataPlatform,
				}
			: undefined,
	});

	Object.defineProperty(window.navigator, 'platform', {
		configurable: true,
		value: platform,
	});
}

describe('useIsMac', () => {
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

	it('prefers navigator.userAgentData.platform when available', async () => {
		setNavigatorPlatform({
			userAgentDataPlatform: 'macOS',
			platform: 'Win32',
		});

		const { result } = renderHook(() => useIsMac());

		await waitFor(() => {
			expect(result.current).toBe(true);
		});
	});

	it('falls back to navigator.platform when userAgentData is missing', async () => {
		setNavigatorPlatform({
			platform: 'MacIntel',
		});

		const { result } = renderHook(() => useIsMac());

		await waitFor(() => {
			expect(result.current).toBe(true);
		});
	});

	it('returns false for non-mac platforms', async () => {
		setNavigatorPlatform({
			userAgentDataPlatform: 'Windows',
			platform: 'Win32',
		});

		const { result } = renderHook(() => useIsMac());

		await waitFor(() => {
			expect(result.current).toBe(false);
		});
	});
});
