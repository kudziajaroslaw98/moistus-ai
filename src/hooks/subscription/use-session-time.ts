'use client';

import { useCallback, useEffect } from 'react';

/**
 * When this tab first used Shiko, held in memory only. It times the free-plan
 * upgrade prompt, which nobody asked for, so it must never be written to
 * browser storage (the cookie notice and privacy policy say storage is only
 * for what the person asked Shiko to do).
 */
let sessionStartedAt: number | null = null;

/**
 * Tracks session time in memory.
 * Session starts on first page load and lasts until the tab is closed or
 * reloaded; client-side navigation keeps it.
 */
export function useSessionTime() {
	// Initialize session start time on mount
	useEffect(() => {
		if (sessionStartedAt === null) {
			sessionStartedAt = Date.now();
		}
	}, []);

	const getSessionMinutes = useCallback(() => {
		if (typeof window === 'undefined') return 0;
		if (sessionStartedAt === null) return 0;

		const elapsed = Math.floor((Date.now() - sessionStartedAt) / 1000 / 60);
		return Number.isFinite(elapsed) && elapsed >= 0 ? elapsed : 0;
	}, []);

	const resetSession = useCallback(() => {
		sessionStartedAt = null;
	}, []);

	return { getSessionMinutes, resetSession };
}
