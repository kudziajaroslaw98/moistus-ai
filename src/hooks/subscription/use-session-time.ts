'use client';

import { useCallback, useEffect } from 'react';

const SESSION_START_KEY = 'moistus_session_start';

/**
 * Tracks session time using localStorage.
 * Session starts on first page load and persists across refreshes.
 */
export function useSessionTime() {
	// Initialize session start time on mount
	useEffect(() => {
		if (typeof window === 'undefined') return;

		if (!localStorage.getItem(SESSION_START_KEY)) {
			localStorage.setItem(SESSION_START_KEY, Date.now().toString());
		}
	}, []);

	const getSessionMinutes = useCallback(() => {
		if (typeof window === 'undefined') return 0;

		const start = localStorage.getItem(SESSION_START_KEY);
		if (!start) return 0;

		const startTime = parseInt(start, 10);
		if (isNaN(startTime)) return 0;

		return Math.floor((Date.now() - startTime) / 1000 / 60);
	}, []);

	const resetSession = useCallback(() => {
		if (typeof window === 'undefined') return;
		localStorage.removeItem(SESSION_START_KEY);
	}, []);

	return { getSessionMinutes, resetSession };
}
