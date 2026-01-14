'use client';

import { useCallback, useEffect } from 'react';

const SESSION_START_KEY = 'shiko_session_start';

/**
 * Tracks session time using localStorage.
 * Session starts on first page load and persists across refreshes.
 */
export function useSessionTime() {
	// Initialize session start time on mount
	useEffect(() => {
		if (typeof window === 'undefined') return;

		try {
			if (!localStorage.getItem(SESSION_START_KEY)) {
				localStorage.setItem(SESSION_START_KEY, Date.now().toString());
			}
		} catch {
			// localStorage may be unavailable in restricted environments (private browsing, etc.)
		}
	}, []);

	const getSessionMinutes = useCallback(() => {
		if (typeof window === 'undefined') return 0;

		try {
			const start = localStorage.getItem(SESSION_START_KEY);
			if (!start) return 0;

			const startTime = Number(start);
			if (!Number.isFinite(startTime) || startTime <= 0) return 0;

			const elapsed = Math.floor((Date.now() - startTime) / 1000 / 60);
			return Number.isFinite(elapsed) && elapsed >= 0 ? elapsed : 0;
		} catch {
			// localStorage may be unavailable
			return 0;
		}
	}, []);

	const resetSession = useCallback(() => {
		if (typeof window === 'undefined') return;

		try {
			localStorage.removeItem(SESSION_START_KEY);
		} catch {
			// localStorage may be unavailable
		}
	}, []);

	return { getSessionMinutes, resetSession };
}
