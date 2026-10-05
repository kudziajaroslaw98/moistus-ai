import { renderHook } from '@testing-library/react';
import { useTouchFirst } from './use-touch-first';

function mockMatchMedia(matchingQueries: string[]) {
	window.matchMedia = jest.fn((query: string) => ({
		matches: matchingQueries.includes(query),
		media: query,
		onchange: null,
		addListener: jest.fn(),
		removeListener: jest.fn(),
		addEventListener: jest.fn(),
		removeEventListener: jest.fn(),
		dispatchEvent: jest.fn(),
	})) as unknown as typeof window.matchMedia;
}

function mockTouchPoints(maxTouchPoints: number, userAgent: string) {
	Object.defineProperty(window.navigator, 'maxTouchPoints', {
		configurable: true,
		value: maxTouchPoints,
	});
	Object.defineProperty(window.navigator, 'userAgent', {
		configurable: true,
		value: userAgent,
	});
}

describe('useTouchFirst', () => {
	const originalMatchMedia = window.matchMedia;
	const originalUserAgent = window.navigator.userAgent;
	const originalMaxTouchPoints = window.navigator.maxTouchPoints;

	afterEach(() => {
		window.matchMedia = originalMatchMedia;
		mockTouchPoints(originalMaxTouchPoints, originalUserAgent);
	});

	it('is false for a desktop with a fine, hovering pointer', () => {
		mockMatchMedia([]);
		mockTouchPoints(0, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)');

		expect(renderHook(() => useTouchFirst()).result.current).toBe(false);
	});

	it.each(['(pointer: coarse)', '(hover: none)'])(
		'is true when %s matches',
		(query) => {
			mockMatchMedia([query]);
			mockTouchPoints(0, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)');

			expect(renderHook(() => useTouchFirst()).result.current).toBe(true);
		}
	);

	it('is true for a desktop-class iPad reporting a Mac user agent', () => {
		mockMatchMedia([]);
		mockTouchPoints(5, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');

		expect(renderHook(() => useTouchFirst()).result.current).toBe(true);
	});
});
