/**
 * Keyboard Hook for Presentation Mode
 *
 * Handles keyboard navigation:
 * - ArrowRight / Space / Enter: Next slide
 * - ArrowLeft / Backspace: Previous slide
 * - ArrowUp / ArrowDown: Navigate slides
 * - F: Toggle fullscreen
 * - Escape: Exit presentation
 * - P: Toggle laser pointer
 * - N: Toggle speaker notes
 */

import { useEffect, useCallback } from 'react';

interface UsePresentationKeyboardOptions {
	isActive: boolean;
	onNext: () => void;
	onPrevious: () => void;
	onToggleFullscreen: () => void;
	onExit: () => void;
	onToggleLaserPointer: () => void;
	onToggleSpeakerNotes: () => void;
}

export function usePresentationKeyboard({
	isActive,
	onNext,
	onPrevious,
	onToggleFullscreen,
	onExit,
	onToggleLaserPointer,
	onToggleSpeakerNotes,
}: UsePresentationKeyboardOptions) {
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
					event.preventDefault();
					onToggleFullscreen();
					break;

				case 'Escape':
					event.preventDefault();
					onExit();
					break;

				case 'p':
				case 'P':
					event.preventDefault();
					onToggleLaserPointer();
					break;

				case 'n':
				case 'N':
					event.preventDefault();
					onToggleSpeakerNotes();
					break;
			}
		},
		[
			isActive,
			onNext,
			onPrevious,
			onToggleFullscreen,
			onExit,
			onToggleLaserPointer,
			onToggleSpeakerNotes,
		]
	);

	useEffect(() => {
		if (isActive) {
			window.addEventListener('keydown', handleKeyDown);
			return () => window.removeEventListener('keydown', handleKeyDown);
		}
	}, [isActive, handleKeyDown]);
}
