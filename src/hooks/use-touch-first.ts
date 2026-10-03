'use client';

import { useSyncExternalStore } from 'react';

const QUERIES = ['(pointer: coarse)', '(hover: none)'] as const;

/**
 * iPadOS in desktop mode reports a Mac user agent and may report a fine
 * pointer when a trackpad is attached, so detect it by touch points instead.
 */
function isDesktopClassIpad(): boolean {
	if (typeof navigator === 'undefined') return false;
	return (
		navigator.maxTouchPoints > 1 &&
		/\b(iPad|Macintosh)\b/.test(navigator.userAgent)
	);
}

function subscribe(onChange: () => void): () => void {
	if (typeof window === 'undefined' || !window.matchMedia) return () => {};
	const mediaQueries = QUERIES.map((query) => window.matchMedia(query));
	for (const mediaQuery of mediaQueries) {
		mediaQuery.addEventListener('change', onChange);
	}
	return () => {
		for (const mediaQuery of mediaQueries) {
			mediaQuery.removeEventListener('change', onChange);
		}
	};
}

function getSnapshot(): boolean {
	if (typeof window === 'undefined' || !window.matchMedia) return false;
	return (
		QUERIES.some((query) => window.matchMedia(query).matches) ||
		isDesktopClassIpad()
	);
}

/**
 * True on touch-first devices (phones, tablets, desktop-class iPads), where a
 * hardware keyboard can't be assumed. Use it to hide keyboard-shortcut hints
 * and to pick touch-friendly surfaces regardless of viewport width.
 */
export function useTouchFirst(): boolean {
	return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
