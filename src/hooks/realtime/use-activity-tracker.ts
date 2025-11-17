'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ActivityState } from './use-realtime-presence-room';

const IDLE_TIMEOUT = 30000; // 30 seconds of inactivity = idle
const UPDATE_DEBOUNCE = 1000; // Debounce activity updates by 1 second

/**
 * Hook to track user activity state for real-time collaboration.
 * Automatically transitions to 'idle' after 30 seconds of inactivity.
 */
export function useActivityTracker() {
	const [activityState, setActivityState] = useState<ActivityState>('viewing');
	const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const lastUpdateRef = useRef<number>(0);

	// Reset idle timeout whenever activity changes
	const resetIdleTimeout = useCallback(() => {
		if (idleTimeoutRef.current) {
			clearTimeout(idleTimeoutRef.current);
		}

		idleTimeoutRef.current = setTimeout(() => {
			setActivityState('idle');
		}, IDLE_TIMEOUT);
	}, []);

	// Update activity state with debouncing
	const updateActivity = useCallback(
		(newState: ActivityState) => {
			const now = Date.now();

			// Debounce updates to prevent spam
			if (now - lastUpdateRef.current < UPDATE_DEBOUNCE) {
				return;
			}

			lastUpdateRef.current = now;
			setActivityState(newState);
			resetIdleTimeout();
		},
		[resetIdleTimeout]
	);

	// Specific activity setters for cleaner API
	const setEditing = useCallback(() => updateActivity('editing'), [updateActivity]);
	const setTyping = useCallback(() => updateActivity('typing'), [updateActivity]);
	const setDragging = useCallback(() => updateActivity('dragging'), [updateActivity]);
	const setViewing = useCallback(() => updateActivity('viewing'), [updateActivity]);

	// Clean up timeout on unmount
	useEffect(() => {
		resetIdleTimeout();

		return () => {
			if (idleTimeoutRef.current) {
				clearTimeout(idleTimeoutRef.current);
			}
		};
	}, [resetIdleTimeout]);

	return {
		activityState,
		setEditing,
		setTyping,
		setDragging,
		setViewing,
		updateActivity,
	};
}
