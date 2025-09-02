/**
 * Date validation utilities
 * Comprehensive date format validation with calendar date checking
 */

import type { ValidationError } from '../../utils/validation';

/**
 * Check if a year is a leap year
 */
export const isLeapYear = (year: number): boolean => {
	return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
};

/**
 * Get the number of days in a specific month and year
 */
export const getDaysInMonth = (month: number, year: number): number => {
	const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
	if (month === 2 && isLeapYear(year)) {
		return 29;
	}
	return daysInMonth[month - 1] || 0;
};

/**
 * Get month name from month number (1-12)
 */
export const getMonthName = (month: number): string => {
	const months = [
		'January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'
	];
	return months[month - 1] || 'Unknown';
};

/**
 * Suggest the closest valid date for invalid calendar dates
 */
export const suggestClosestValidDate = (year: number, month: number, invalidDay: number): string => {
	const maxDays = getDaysInMonth(month, year);
	const suggestedDay = Math.min(invalidDay, maxDays);
	return `${year}-${month.toString().padStart(2, '0')}-${suggestedDay.toString().padStart(2, '0')}`;
};

/**
 * Get list of valid date keywords
 */
export const getValidDateKeywords = (): string[] => {
	return [
		'today', 'tomorrow', 'yesterday',
		'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
		'week', 'month', 'next', 'last'
	];
};

/**
 * Check if a string is a valid date keyword
 */
export const isValidDateKeyword = (dateValue: string): boolean => {
	const lowerDate = dateValue.toLowerCase().trim();
	return getValidDateKeywords().includes(lowerDate);
};

/**
 * Validate date formats with comprehensive calendar date checking
 */
export const validateDate = (dateValue: string, startIndex: number): ValidationError | null => {
	const lowerDate = dateValue.toLowerCase().trim();
	
	// Skip validation for partial numeric inputs that look like incomplete dates
	if (/^\d{1,4}$/.test(dateValue)) {
		return null; // Skip partial years and days
	}
	
	// Skip validation for partial date patterns that look like they're still being typed
	if (/^\d{4}-$/.test(dateValue) || /^\d{4}-\d{1,2}$/.test(dateValue) || /^\d{4}-\d{1,2}-$/.test(dateValue)) {
		return null;
	}
	
	// Check if it's a valid keyword
	if (isValidDateKeyword(lowerDate)) {
		return null;
	}
	
	// Check for common format mistakes first
	if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(dateValue)) {
		const [year, month, day] = dateValue.split('/').map(Number);
		const correctFormat = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
		
		return {
			type: 'error',
			message: 'Invalid date format - use hyphens instead of slashes.',
			startIndex,
			endIndex: startIndex + dateValue.length,
			suggestion: correctFormat,
			errorCode: 'DATE_FORMAT_SLASH',
			contextualHint: 'Use @YYYY-MM-DD format (e.g., @2025-02-15)',
			quickFixes: [{
				label: 'Fix format',
				replacement: correctFormat,
				description: 'Convert to @YYYY-MM-DD format'
			}]
		};
	}
	
	if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateValue)) {
		const [month, day, year] = dateValue.split('/').map(Number);
		const correctFormat = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
		
		return {
			type: 'error',
			message: 'Invalid MM/DD/YYYY format - use @YYYY-MM-DD instead.',
			startIndex,
			endIndex: startIndex + dateValue.length,
			suggestion: correctFormat,
			errorCode: 'DATE_FORMAT_US',
			contextualHint: 'Use @YYYY-MM-DD format (e.g., @2025-02-15)',
			quickFixes: [{
				label: 'Fix format',
				replacement: correctFormat,
				description: 'Convert to @YYYY-MM-DD format'
			}]
		};
	}
	
	if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateValue)) {
		const [month, day, year] = dateValue.split('-').map(Number);
		const correctFormat = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
		
		return {
			type: 'error',
			message: 'Invalid MM-DD-YYYY format - use @YYYY-MM-DD instead.',
			startIndex,
			endIndex: startIndex + dateValue.length,
			suggestion: correctFormat,
			errorCode: 'DATE_FORMAT_US_HYPHEN',
			contextualHint: 'Use @YYYY-MM-DD format (e.g., @2025-02-15)',
			quickFixes: [{
				label: 'Fix format',
				replacement: correctFormat,
				description: 'Convert to @YYYY-MM-DD format'
			}]
		};
	}
	
	// Check if it's a valid YYYY-MM-DD format
	if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateValue)) {
		const [year, month, day] = dateValue.split('-').map(Number);
		
		// Year validation
		if (year < 1900 || year > 2100) {
			const currentYear = new Date().getFullYear();
			const suggestedDate = `${currentYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
			
			return {
				type: 'error',
				message: `Year ${year} seems unusual. Expected 1900-2100.`,
				startIndex,
				endIndex: startIndex + dateValue.length,
				suggestion: suggestedDate,
				errorCode: 'DATE_YEAR_RANGE',
				contextualHint: 'Year should be between 1900 and 2100',
				quickFixes: [{
					label: 'Use current year',
					replacement: suggestedDate,
					description: `Change year to ${currentYear}`
				}]
			};
		}
		
		// Month validation
		if (month < 1 || month > 12) {
			const suggestedMonth = month > 12 ? 12 : (month < 1 ? 1 : month);
			const suggestedDate = `${year}-${suggestedMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
			
			return {
				type: 'error',
				message: `Invalid month ${month.toString().padStart(2, '0')} - must be 01-12.`,
				startIndex,
				endIndex: startIndex + dateValue.length,
				suggestion: suggestedDate,
				errorCode: 'DATE_MONTH_RANGE',
				contextualHint: 'Month must be 01-12 (e.g., 02 for February)',
				quickFixes: [{
					label: month > 12 ? 'Fix to December' : 'Fix month',
					replacement: suggestedDate,
					description: `Change month to ${suggestedMonth.toString().padStart(2, '0')}`
				}]
			};
		}
		
		// Day validation - check both range and calendar validity
		const daysInMonth = getDaysInMonth(month, year);
		
		if (day < 1 || day > 31) {
			const suggestedDay = day > 31 ? daysInMonth : (day < 1 ? 1 : day);
			const suggestedDate = `${year}-${month.toString().padStart(2, '0')}-${suggestedDay.toString().padStart(2, '0')}`;
			
			return {
				type: 'error',
				message: `Day must be 01-31, but got ${day.toString().padStart(2, '0')}.`,
				startIndex,
				endIndex: startIndex + dateValue.length,
				suggestion: suggestedDate,
				errorCode: 'DATE_DAY_RANGE',
				contextualHint: 'Day must be 01-31 depending on the month',
				quickFixes: [{
					label: 'Fix day',
					replacement: suggestedDate,
					description: `Change day to ${suggestedDay.toString().padStart(2, '0')}`
				}]
			};
		}
		
		// Calendar date validation - check if the date actually exists
		if (day > daysInMonth) {
			const monthName = getMonthName(month);
			const suggestedDate = suggestClosestValidDate(year, month, day);
			const isLeap = month === 2 && isLeapYear(year);
			
			let message: string;
			let quickFixes: Array<{label: string; replacement: string; description?: string}> = [];
			
			if (month === 2) {
				if (isLeap) {
					message = `${monthName} has 29 days in ${year} (leap year), but got day ${day}.`;
					quickFixes = [
						{ label: 'Use Feb 29', replacement: suggestedDate, description: 'Change to last day of February (leap year)' }
					];
				} else {
					message = `${monthName} has 28 days in ${year}, but got day ${day}.`;
					quickFixes = [
						{ label: 'Use Feb 28', replacement: suggestedDate, description: 'Change to last day of February' }
					];
				}
			} else {
				message = `${monthName} only has ${daysInMonth} days, but got day ${day}.`;
				quickFixes = [
					{ label: `Use ${monthName} ${daysInMonth}`, replacement: suggestedDate, description: `Change to last day of ${monthName}` }
				];
				
				// Suggest next month if user might have meant that
				if (day <= getDaysInMonth(month + 1 <= 12 ? month + 1 : 1, month + 1 <= 12 ? year : year + 1)) {
					const nextMonth = month + 1 <= 12 ? month + 1 : 1;
					const nextYear = month + 1 <= 12 ? year : year + 1;
					const nextMonthDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
					const nextMonthName = getMonthName(nextMonth);
					quickFixes.push({
						label: `Use ${nextMonthName} ${day}`,
						replacement: nextMonthDate,
						description: `Change to ${nextMonthName} ${day}, ${nextYear}`
					});
				}
			}
			
			return {
				type: 'error',
				message,
				startIndex,
				endIndex: startIndex + dateValue.length,
				suggestion: suggestedDate,
				errorCode: 'DATE_CALENDAR_INVALID',
				contextualHint: `${monthName} ${year} has ${daysInMonth} days${isLeap ? ' (leap year)' : ''}`,
				quickFixes
			};
		}
		
		// Date is valid
		return null;
	}
	
	// If we get here, the format is not recognized
	const currentDate = new Date().toISOString().split('T')[0];
	const tomorrow = new Date();
	tomorrow.setDate(tomorrow.getDate() + 1);
	const tomorrowDate = tomorrow.toISOString().split('T')[0];
	
	return {
		type: 'error',
		message: 'Invalid date format. Use keywords like "today", "tomorrow" or YYYY-MM-DD format.',
		startIndex,
		endIndex: startIndex + dateValue.length,
		suggestion: 'today',
		errorCode: 'DATE_FORMAT_INVALID',
		contextualHint: 'Valid formats: @today, @tomorrow, @2025-02-15',
		quickFixes: [
			{ label: 'Use "today"', replacement: 'today', description: 'Set to today\'s date' },
			{ label: 'Use "tomorrow"', replacement: 'tomorrow', description: 'Set to tomorrow\'s date' },
			{ label: 'Use current date', replacement: currentDate, description: `Set to today (${currentDate})` },
			{ label: 'Use tomorrow date', replacement: tomorrowDate, description: `Set to tomorrow (${tomorrowDate})` }
		]
	};
};

/**
 * Quick validation for date format only (without comprehensive calendar checking)
 */
export const isValidDateFormat = (dateValue: string): boolean => {
	const lowerDate = dateValue.toLowerCase().trim();
	
	// Check keywords
	if (isValidDateKeyword(lowerDate)) {
		return true;
	}
	
	// Check YYYY-MM-DD format
	return /^\d{4}-\d{1,2}-\d{1,2}$/.test(dateValue);
};