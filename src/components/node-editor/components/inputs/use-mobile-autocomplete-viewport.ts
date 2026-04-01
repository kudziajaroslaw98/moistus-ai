import { useEffect, useState } from 'react';

interface ViewportRect {
	top: number;
	right: number;
	bottom: number;
	left: number;
	width: number;
	height: number;
}

export interface MobileAutocompleteViewportState {
	keyboardInset: number;
	keyboardOpen: boolean;
	visibleViewportHeight: number;
	visualViewportRect: ViewportRect;
}

const DEFAULT_VIEWPORT_RECT: ViewportRect = {
	top: 0,
	right: 0,
	bottom: 0,
	left: 0,
	width: 0,
	height: 0,
};

const DEFAULT_VIEWPORT_STATE: MobileAutocompleteViewportState = {
	keyboardInset: 0,
	keyboardOpen: false,
	visibleViewportHeight: 0,
	visualViewportRect: DEFAULT_VIEWPORT_RECT,
};

/**
 * Returns the current editor-facing viewport snapshot.
 * Falls back to the layout viewport when `window` or `window.visualViewport` is missing, computes `visualViewportRect` from the visual viewport offsets and size, and infers keyboard visibility from `layoutViewportHeight - visualViewportRect.bottom` crossing `max(96px, 12% of the layout viewport)` while the editor is focused.
 */
function getViewportSnapshot(
	isEditorFocused: boolean
): MobileAutocompleteViewportState {
	if (typeof window === 'undefined') {
		return DEFAULT_VIEWPORT_STATE;
	}

	const layoutViewportHeight = window.innerHeight;
	const layoutViewportWidth = window.innerWidth;
	const visualViewport = window.visualViewport;

	if (!visualViewport) {
		return {
			keyboardInset: 0,
			keyboardOpen: false,
			visibleViewportHeight: layoutViewportHeight,
			visualViewportRect: {
				top: 0,
				left: 0,
				right: layoutViewportWidth,
				bottom: layoutViewportHeight,
				width: layoutViewportWidth,
				height: layoutViewportHeight,
			},
		};
	}

	const visualViewportRect: ViewportRect = {
		top: visualViewport.offsetTop,
		left: visualViewport.offsetLeft,
		right: visualViewport.offsetLeft + visualViewport.width,
		bottom: visualViewport.offsetTop + visualViewport.height,
		width: visualViewport.width,
		height: visualViewport.height,
	};
	const keyboardInset = Math.max(
		0,
		layoutViewportHeight - visualViewportRect.bottom
	);
	const keyboardThreshold = Math.max(96, layoutViewportHeight * 0.12);

	return {
		keyboardInset,
		keyboardOpen: isEditorFocused && keyboardInset >= keyboardThreshold,
		visibleViewportHeight: visualViewportRect.height,
		visualViewportRect,
	};
}

function isSameViewportRect(current: ViewportRect, next: ViewportRect) {
	return (
		current.top === next.top &&
		current.right === next.right &&
		current.bottom === next.bottom &&
		current.left === next.left &&
		current.width === next.width &&
		current.height === next.height
	);
}

function isSameViewportState(
	current: MobileAutocompleteViewportState,
	next: MobileAutocompleteViewportState
) {
	return (
		current.keyboardInset === next.keyboardInset &&
		current.keyboardOpen === next.keyboardOpen &&
		current.visibleViewportHeight === next.visibleViewportHeight &&
		isSameViewportRect(current.visualViewportRect, next.visualViewportRect)
	);
}

/**
 * Tracks viewport changes for the mobile autocomplete presenter.
 * The hook refreshes its snapshot on mount plus `resize`/`visualViewport.resize`/`visualViewport.scroll`; `visibleViewportHeight` is the unobscured visual viewport height and `visualViewportRect` is the screen-space box the tray should stay inside.
 */
export function useMobileAutocompleteViewport(
	enabled: boolean,
	isEditorFocused: boolean
): MobileAutocompleteViewportState {
	const [viewportState, setViewportState] =
		useState<MobileAutocompleteViewportState>(() =>
			getViewportSnapshot(isEditorFocused)
		);

	useEffect(() => {
		if (typeof window === 'undefined') {
			return;
		}

		const updateViewportState = () => {
			const nextState = getViewportSnapshot(isEditorFocused);
			setViewportState((currentState) =>
				isSameViewportState(currentState, nextState)
					? currentState
					: nextState
			);
		};

		if (!enabled) {
			updateViewportState();
			return;
		}

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
	}, [enabled, isEditorFocused]);

	return viewportState;
}
