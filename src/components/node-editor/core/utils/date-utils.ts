/**
 * Date Utilities - Date parsing and formatting functions
 */

/**
 * Parse a date string into a Date object
 * Supports various formats including relative dates
 */
export function parseDateString(dateStr: string): Date | undefined {
	const normalized = dateStr.trim().toLowerCase();
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	// Relative dates - support both space and hyphen separators
	const relativeMap: Record<string, () => Date> = {
		today: () => today,
		tomorrow: () => {
			const date = new Date(today);
			date.setDate(date.getDate() + 1);
			return date;
		},
		yesterday: () => {
			const date = new Date(today);
			date.setDate(date.getDate() - 1);
			return date;
		},
		'next week': () => {
			const date = new Date(today);
			date.setDate(date.getDate() + 7);
			return date;
		},
		'next-week': () => {
			const date = new Date(today);
			date.setDate(date.getDate() + 7);
			return date;
		},
		'next month': () => {
			const date = new Date(today);
			date.setMonth(date.getMonth() + 1);
			return date;
		},
		'next-month': () => {
			const date = new Date(today);
			date.setMonth(date.getMonth() + 1);
			return date;
		},
		// End of day - set to 23:59:59 today
		eod: () => {
			const date = new Date(today);
			date.setHours(23, 59, 59, 999);
			return date;
		},
		// End of week - next Sunday
		eow: () => {
			const date = new Date(today);
			const daysUntilSunday = 7 - date.getDay();
			date.setDate(date.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
			return date;
		},
		// End of month - last day of current month
		eom: () => {
			const date = new Date(today);
			date.setMonth(date.getMonth() + 1, 0); // Day 0 of next month = last day of current month
			return date;
		},
	};

	if (relativeMap[normalized]) {
		return relativeMap[normalized]();
	}

	// Weekday names
	const weekdays = getWeekdays();
	const weekdayIndex = weekdays.findIndex(
		(day) => normalized === day.toLowerCase()
	);

	if (weekdayIndex !== -1) {
		const date = new Date(today);
		const currentDay = date.getDay();
		let daysToAdd = weekdayIndex - currentDay;

		if (daysToAdd <= 0) daysToAdd += 7;

		date.setDate(date.getDate() + daysToAdd);
		return date;
	}

	// Try parsing as standard date
	const parsed = new Date(dateStr);

	if (!isNaN(parsed.getTime())) {
		return parsed;
	}

	// Try common formats
	const formats = [
		/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY
		/^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
		/^(\d{1,2})-(\d{1,2})-(\d{4})$/, // DD-MM-YYYY
	];

	for (const format of formats) {
		const match = dateStr.match(format);

		if (match) {
			const date = new Date(dateStr);

			if (!isNaN(date.getTime())) {
				return date;
			}
		}
	}

	return undefined;
}

/**
 * Format a date for display
 */
export function formatDateForDisplay(date: Date): string {
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const tomorrow = new Date(today);
	tomorrow.setDate(tomorrow.getDate() + 1);

	const dateOnly = new Date(date);
	dateOnly.setHours(0, 0, 0, 0);

	// Check for relative dates
	if (dateOnly.getTime() === today.getTime()) {
		return 'Today';
	}

	if (dateOnly.getTime() === tomorrow.getTime()) {
		return 'Tomorrow';
	}

	// Check if it's this week
	const weekStart = new Date(today);
	weekStart.setDate(weekStart.getDate() - weekStart.getDay());

	const weekEnd = new Date(weekStart);
	weekEnd.setDate(weekEnd.getDate() + 6);

	if (dateOnly >= weekStart && dateOnly <= weekEnd && dateOnly > today) {
		const weekdays = getWeekdays();
		return weekdays[dateOnly.getDay()];
	}

	// Return formatted date
	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
	});
}

/**
 * Validate if a string is a valid date format
 */
export function isValidDateString(dateStr: string): boolean {
	if (!dateStr) return false;

	const date = parseDateString(dateStr);
	return date !== undefined && !isNaN(date.getTime());
}

/**
 * Get weekday names
 */
export function getWeekdays(): string[] {
	return [
		'Sunday',
		'Monday',
		'Tuesday',
		'Wednesday',
		'Thursday',
		'Friday',
		'Saturday',
	];
}

/**
 * Get relative date options for suggestions
 */
export function getRelativeDateOptions(): string[] {
	return [
		'today',
		'tomorrow',
		'yesterday',
		'next-week',
		'next-month',
		'eod', // End of day
		'eow', // End of week
		'eom', // End of month
		...getWeekdays().map((day) => day.toLowerCase()),
	];
}

/**
 * Parse a date range string
 */
export function parseDateRange(rangeStr: string): { start?: Date; end?: Date } {
	const parts = rangeStr.split(/\s*(?:to|-)\s*/i);

	if (parts.length === 2) {
		const start = parseDateString(parts[0]);
		const end = parseDateString(parts[1]);
		return { start, end };
	}

	const single = parseDateString(rangeStr);

	if (single) {
		return { start: single, end: single };
	}

	return {};
}

/**
 * Format duration between two dates
 */
export function formatDuration(start: Date, end: Date): string {
	const diff = Math.abs(end.getTime() - start.getTime());
	const days = Math.floor(diff / (1000 * 60 * 60 * 24));

	if (days === 0) return 'Same day';
	if (days === 1) return '1 day';
	if (days < 7) return `${days} days`;
	if (days < 30) return `${Math.floor(days / 7)} week${days >= 14 ? 's' : ''}`;
	if (days < 365)
		return `${Math.floor(days / 30)} month${days >= 60 ? 's' : ''}`;

	return `${Math.floor(days / 365)} year${days >= 730 ? 's' : ''}`;
}
