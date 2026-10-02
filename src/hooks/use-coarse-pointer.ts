'use client';

import { useSyncExternalStore } from 'react';

const QUERIES = ['(hover: none)', '(pointer: coarse)'] as const;

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
	return QUERIES.some((query) => window.matchMedia(query).matches);
}

/**
 * True on touch-first devices (no hover or a coarse primary pointer), where
 * hover-only affordances need a tap alternative.
 */
export function useCoarsePointer(): boolean {
	return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
