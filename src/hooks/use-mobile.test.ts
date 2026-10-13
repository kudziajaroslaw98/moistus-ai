import { renderHook } from '@testing-library/react';
import { useIsMobile } from './use-mobile';

const MOBILE_QUERY =
	'(max-width: 767px), (pointer: coarse) and (max-height: 500px)';

function mockMatchMedia(matches: boolean) {
	window.matchMedia = jest.fn((query: string) => ({
		matches: query === MOBILE_QUERY ? matches : false,
		media: query,
		onchange: null,
		addListener: jest.fn(),
		removeListener: jest.fn(),
		addEventListener: jest.fn(),
		removeEventListener: jest.fn(),
		dispatchEvent: jest.fn(),
	})) as unknown as typeof window.matchMedia;
}

describe('useIsMobile', () => {
	const originalMatchMedia = window.matchMedia;

	afterEach(() => {
		window.matchMedia = originalMatchMedia;
	});

	it('queries narrow viewports and short touch viewports (landscape phones)', () => {
		mockMatchMedia(true);
		const { result } = renderHook(() => useIsMobile());

		expect(result.current).toBe(true);
		expect(window.matchMedia).toHaveBeenCalledWith(MOBILE_QUERY);
	});

	it('is false when the query does not match (desktop, tablets)', () => {
		mockMatchMedia(false);
		const { result } = renderHook(() => useIsMobile());

		expect(result.current).toBe(false);
	});
});
