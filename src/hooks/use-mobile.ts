import { useSyncExternalStore } from 'react';

const MOBILE_BREAKPOINT = 768;

/**
 * Narrow viewports, plus landscape phones: a touch device whose viewport is
 * too short to be a tablet. Landscape phones are wider than the width
 * breakpoint (~844-932px) but only ~390-430px tall, so width alone misses them.
 */
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px), (pointer: coarse) and (max-height: 500px)`;

function subscribe(onChange: () => void): () => void {
	if (typeof window === 'undefined' || !window.matchMedia) return () => {};
	const mediaQuery = window.matchMedia(MOBILE_QUERY);
	mediaQuery.addEventListener('change', onChange);
	return () => mediaQuery.removeEventListener('change', onChange);
}

function getSnapshot(): boolean {
	if (typeof window === 'undefined' || !window.matchMedia) return false;
	return window.matchMedia(MOBILE_QUERY).matches;
}

export function useIsMobile(): boolean {
	return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
