/**
 * Insert text at the cursor position in a text input or textarea
 * @param currentValue The current value of the input
 * @param textToInsert The text to insert
 * @param cursorPosition The current cursor position
 * @returns The new value and cursor position
 */
export const insertAtCursor = (
	currentValue: string,
	textToInsert: string,
	cursorPosition: number
): { newValue: string; newCursorPosition: number } => {
	const before = currentValue.substring(0, cursorPosition);
	const after = currentValue.substring(cursorPosition);
	const newValue = before + textToInsert + after;
	const newCursorPosition = cursorPosition + textToInsert.length;

	return { newValue, newCursorPosition };
};

/**
 * Replace selected text in a text input or textarea
 * @param currentValue The current value of the input
 * @param textToInsert The text to insert
 * @param selectionStart The start of the selection
 * @param selectionEnd The end of the selection
 * @returns The new value and cursor position
 */
export const replaceSelection = (
	currentValue: string,
	textToInsert: string,
	selectionStart: number,
	selectionEnd: number
): { newValue: string; newCursorPosition: number } => {
	const before = currentValue.substring(0, selectionStart);
	const after = currentValue.substring(selectionEnd);
	const newValue = before + textToInsert + after;
	const newCursorPosition = selectionStart + textToInsert.length;

	return { newValue, newCursorPosition };
};

/**
 * Set the cursor position in a text input or textarea
 * @param element The input element
 * @param position The desired cursor position
 */
export const setCursorPosition = (
	element: HTMLInputElement | HTMLTextAreaElement,
	position: number
): void => {
	if (element.setSelectionRange) {
		element.focus();
		element.setSelectionRange(position, position);
	}
};

/**
 * Get the current cursor position in a text input or textarea
 * @param element The input element
 * @returns The cursor position
 */
export const getCursorPosition = (
	element: HTMLInputElement | HTMLTextAreaElement
): number => {
	return element.selectionStart || 0;
};

/**
 * Announce text to screen readers
 * @param message The message to announce
 * @param priority The priority level ('polite' or 'assertive')
 */
export const announceToScreenReader = (
	message: string,
	priority: 'polite' | 'assertive' = 'polite'
): void => {
	const announcement = document.createElement('div');
	announcement.setAttribute('role', 'status');
	announcement.setAttribute('aria-live', priority);
	announcement.style.position = 'absolute';
	announcement.style.left = '-10000px';
	announcement.style.width = '1px';
	announcement.style.height = '1px';
	announcement.style.overflow = 'hidden';
	announcement.textContent = message;

	document.body.appendChild(announcement);

	// Remove the announcement after a delay
	setTimeout(() => {
		document.body.removeChild(announcement);
	}, 1000);
};
