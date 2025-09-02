/**
 * Date parsing utilities for mind map nodes
 * Handles natural language date parsing and formatting
 */

/**
 * Parse date strings including natural language dates
 * Supports: today, tomorrow, yesterday, weekday names, ISO dates
 */
export const parseDateString = (dateStr: string): Date | undefined => {
	const lowerDate = dateStr.toLowerCase();
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	switch (lowerDate) {
		case 'today':
			return today;
		case 'tomorrow':
			const tomorrow = new Date(today);
			tomorrow.setDate(tomorrow.getDate() + 1);
			return tomorrow;
		case 'yesterday':
			const yesterday = new Date(today);
			yesterday.setDate(yesterday.getDate() - 1);
			return yesterday;
		default:
			// Try parsing weekday names
			const weekdays = [
				'sunday',
				'monday',
				'tuesday',
				'wednesday',
				'thursday',
				'friday',
				'saturday',
			];
			const weekdayIndex = weekdays.indexOf(lowerDate);

			if (weekdayIndex !== -1) {
				const targetDate = new Date(today);
				const currentDay = today.getDay();
				const daysUntilTarget = (weekdayIndex - currentDay + 7) % 7 || 7;
				targetDate.setDate(targetDate.getDate() + daysUntilTarget);
				return targetDate;
			}

			// Try parsing as a date
			const parsed = new Date(dateStr);
			return isNaN(parsed.getTime()) ? undefined : parsed;
	}
};

/**
 * Format date for display with relative descriptions
 * Returns human-friendly date strings like "Today", "Tomorrow", "In 3 days"
 */
export const formatDateForDisplay = (date: Date, original: string): string => {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const targetDate = new Date(date);
	targetDate.setHours(0, 0, 0, 0);
	
	const diffTime = targetDate.getTime() - today.getTime();
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	
	if (diffDays === 0) return 'Today';
	if (diffDays === 1) return 'Tomorrow';
	if (diffDays === -1) return 'Yesterday';
	if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
	if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
	
	// For named dates like 'monday', 'friday', etc., keep original if it's a weekday name
	const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
	if (weekdays.includes(original.toLowerCase())) {
		return original.charAt(0).toUpperCase() + original.slice(1).toLowerCase();
	}
	
	// Default to formatted date
	return date.toLocaleDateString('en-US', { 
		month: 'short', 
		day: 'numeric',
		year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
	});
};

/**
 * Check if a string represents a valid date
 */
export const isValidDateString = (dateStr: string): boolean => {
	return parseDateString(dateStr) !== undefined;
};

/**
 * Get the list of supported weekday names
 */
export const getWeekdays = (): string[] => {
	return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
};