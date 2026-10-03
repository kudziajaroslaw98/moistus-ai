/**
 * Time formatting utilities for history components
 */

export interface FormattedTimestamp {
	display: string;
	tooltip: string;
}

/**
 * Formats a timestamp into relative time with tooltip
 * @param timestamp Unix timestamp in milliseconds
 * @returns Object with display (relative) and tooltip (absolute) strings
 */
export function formatTimestamp(timestamp: number): FormattedTimestamp {
	const date = new Date(timestamp);
	const now = Date.now();
	const diff = now - timestamp;

	// ISO timestamp for tooltip
	const tooltip = date.toLocaleString('en-US', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	});

	// Relative time for display
	let display: string;

	if (diff < 60000) {
		// Less than 1 minute
		display = 'Just now';
	} else if (diff < 3600000) {
		// Less than 1 hour
		const minutes = Math.floor(diff / 60000);
		display = `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
	} else if (diff < 86400000) {
		// Less than 1 day
		const hours = Math.floor(diff / 3600000);
		display = `${hours} hour${hours > 1 ? 's' : ''} ago`;
	} else if (diff < 172800000) {
		// Yesterday (less than 2 days)
		display = `Yesterday at ${date.toLocaleString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
		})}`;
	} else {
		// Older dates
		display = date.toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
		});
	}

	return { display, tooltip };
}
