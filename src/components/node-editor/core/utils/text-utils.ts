/**
 * Utility functions for text processing and accessibility
 */

/**
 * Announces text to screen readers using aria-live regions
 */
export const announceToScreenReader = (message: string) => {
	const announcement = document.createElement('div');
	announcement.setAttribute('aria-live', 'polite');
	announcement.setAttribute('aria-atomic', 'true');
	announcement.className = 'sr-only';
	announcement.textContent = message;

	document.body.appendChild(announcement);

	// Clean up after a short delay
	setTimeout(() => {
		if (announcement.parentNode) {
			announcement.parentNode.removeChild(announcement);
		}
	}, 1000);
};

/**
 * Truncates text to a specified length with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
	if (text.length <= maxLength) return text;
	return text.slice(0, maxLength - 3) + '...';
};

/**
 * Capitalizes the first letter of a string
 */
export const capitalizeFirst = (str: string): string => {
	if (!str) return '';
	return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Converts a string to sentence case
 */
export const toSentenceCase = (str: string): string => {
	if (!str) return '';
	return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};
