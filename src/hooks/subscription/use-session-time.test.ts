import { act, renderHook } from '@testing-library/react';
import { useSessionTime } from './use-session-time';

describe('useSessionTime', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		jest.setSystemTime(new Date('2026-10-17T12:00:00Z'));
		// Module state outlives a test, so start each one with no session
		const { result } = renderHook(() => useSessionTime());
		act(() => result.current.resetSession());
	});

	afterEach(() => {
		jest.useRealTimers();
		jest.restoreAllMocks();
	});

	it('reports 0 minutes before the session has started', () => {
		const { result } = renderHook(() => useSessionTime());
		// the mount effect starts it, so reset right after mounting
		act(() => result.current.resetSession());

		expect(result.current.getSessionMinutes()).toBe(0);
	});

	it('counts whole minutes since the tab first used Shiko', () => {
		const { result } = renderHook(() => useSessionTime());

		act(() => {
			jest.advanceTimersByTime(31 * 60 * 1000 + 20_000);
		});

		expect(result.current.getSessionMinutes()).toBe(31);
	});

	it('keeps the same start across remounts (client-side navigation)', () => {
		const first = renderHook(() => useSessionTime());
		act(() => {
			jest.advanceTimersByTime(10 * 60 * 1000);
		});
		first.unmount();

		const second = renderHook(() => useSessionTime());

		expect(second.result.current.getSessionMinutes()).toBe(10);
	});

	it('never reads or writes browser storage', () => {
		const getItem = jest.spyOn(Storage.prototype, 'getItem');
		const setItem = jest.spyOn(Storage.prototype, 'setItem');
		const removeItem = jest.spyOn(Storage.prototype, 'removeItem');

		const { result } = renderHook(() => useSessionTime());
		act(() => {
			jest.advanceTimersByTime(5 * 60 * 1000);
		});
		result.current.getSessionMinutes();
		act(() => result.current.resetSession());

		expect(getItem).not.toHaveBeenCalled();
		expect(setItem).not.toHaveBeenCalled();
		expect(removeItem).not.toHaveBeenCalled();
	});
});
