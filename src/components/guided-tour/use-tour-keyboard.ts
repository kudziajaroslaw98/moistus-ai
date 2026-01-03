/**
 * Keyboard Hook for Guided Tour
 *
 * Handles keyboard navigation:
 * - ArrowRight / Space / Enter: Next stop
 * - ArrowLeft / Backspace: Previous stop
 * - Escape: Exit tour
 * - F: Toggle fullscreen
 * - Home: Go to first stop
 * - End: Go to last stop
 * - 1-9: Jump to stop N
 */

import { useEffect, useCallback } from 'react';

interface UseTourKeyboardOptions {
	isActive: boolean;
	totalStops: number;
	onNext: () => void;
	onPrevious: () => void;
	onExit: () => void;
	onGoToStop: (index: number) => void;
	onToggleFullscreen?: () => void;
}

export function useTourKeyboard({
	isActive,
	totalStops,
	onNext,
	onPrevious,
	onExit,
	onGoToStop,
	onToggleFullscreen,
}: UseTourKeyboardOptions) {
	const handleKeyDown = useCallback(
		(event: KeyboardEvent) => {
			if (!isActive) return;

			// Don't handle if user is typing in an input
			if (
				event.target instanceof HTMLInputElement ||
				event.target instanceof HTMLTextAreaElement
			) {
				return;
			}

			switch (event.key) {
				case 'ArrowRight':
				case ' ':
				case 'Enter':
					event.preventDefault();
					onNext();
					break;

				case 'ArrowLeft':
				case 'Backspace':
					event.preventDefault();
					onPrevious();
					break;

				case 'ArrowDown':
					event.preventDefault();
					onNext();
					break;

				case 'ArrowUp':
					event.preventDefault();
					onPrevious();
					break;

				case 'f':
				case 'F':
					if (onToggleFullscreen) {
						event.preventDefault();
						onToggleFullscreen();
					}
					break;

				case 'Escape':
					event.preventDefault();
					onExit();
					break;

				case 'Home':
					event.preventDefault();
					onGoToStop(0);
					break;

				case 'End':
					event.preventDefault();
					onGoToStop(totalStops - 1);
					break;

				// Number keys 1-9 to jump to specific stops
				case '1':
				case '2':
				case '3':
				case '4':
				case '5':
				case '6':
				case '7':
				case '8':
				case '9':
					event.preventDefault();
					const stopIndex = parseInt(event.key) - 1;
					if (stopIndex < totalStops) {
						onGoToStop(stopIndex);
					}
					break;
			}
		},
		[isActive, totalStops, onNext, onPrevious, onExit, onGoToStop, onToggleFullscreen]
	);

	useEffect(() => {
		if (isActive) {
			window.addEventListener('keydown', handleKeyDown);
			return () => window.removeEventListener('keydown', handleKeyDown);
		}
	}, [isActive, handleKeyDown]);
}
