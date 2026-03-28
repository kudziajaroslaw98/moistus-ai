import { useEffect, useState } from 'react';

export interface MobileAutocompleteViewportState {
	keyboardInset: number;
	visibleViewportHeight: number;
}

const DEFAULT_VIEWPORT_STATE: MobileAutocompleteViewportState = {
	keyboardInset: 0,
	visibleViewportHeight: 0,
};

function getViewportSnapshot(): MobileAutocompleteViewportState {
	if (typeof window === 'undefined') {
		return DEFAULT_VIEWPORT_STATE;
	}

	const visibleViewportHeight = window.visualViewport?.height ?? window.innerHeight;
	const viewportOffsetTop = window.visualViewport?.offsetTop ?? 0;
	const keyboardInset = Math.max(
		0,
		window.innerHeight - (visibleViewportHeight + viewportOffsetTop)
	);

	return {
		keyboardInset,
		visibleViewportHeight,
	};
}

function isSameViewportState(
	current: MobileAutocompleteViewportState,
	next: MobileAutocompleteViewportState
) {
	return (
		current.keyboardInset === next.keyboardInset &&
		current.visibleViewportHeight === next.visibleViewportHeight
	);
}

export function useMobileAutocompleteViewport(
	enabled: boolean
): MobileAutocompleteViewportState {
	const [viewportState, setViewportState] =
		useState<MobileAutocompleteViewportState>(() => getViewportSnapshot());

	useEffect(() => {
		if (!enabled || typeof window === 'undefined') {
			setViewportState(getViewportSnapshot());
			return;
		}

		const updateViewportState = () => {
			const nextState = getViewportSnapshot();
			setViewportState((currentState) =>
				isSameViewportState(currentState, nextState)
					? currentState
					: nextState
			);
		};

		const visualViewport = window.visualViewport;
		updateViewportState();

		window.addEventListener('resize', updateViewportState);
		visualViewport?.addEventListener('resize', updateViewportState);
		visualViewport?.addEventListener('scroll', updateViewportState);

		return () => {
			window.removeEventListener('resize', updateViewportState);
			visualViewport?.removeEventListener('resize', updateViewportState);
			visualViewport?.removeEventListener('scroll', updateViewportState);
		};
	}, [enabled]);

	return viewportState;
}
