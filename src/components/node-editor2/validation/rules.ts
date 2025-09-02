/**
 * Consolidated validation rules and logic
 * Contains all validation functionality for colors, dates, patterns, and more
 */

/**
 * ValidationError interface - defines the structure of validation results
 */
export interface ValidationError {
	type: 'error' | 'warning' | 'suggestion';
	message: string;
	startIndex: number;
	endIndex: number;
	suggestion?: string;
	errorCode: string;
	contextualHint?: string;
	quickFixes?: Array<{
		label: string;
		replacement: string;
		description?: string;
	}>;
}

/**
 * Pattern validator configuration
 */
interface PatternValidator {
	regex: RegExp;
	type: 'color' | 'date' | 'priority' | 'tag' | 'assignee';
	validator: (match: RegExpExecArray) => ValidationError | null;
}

// =============================================================================
// COLOR VALIDATION RULES
// =============================================================================

/**
 * Validate hex colors with comprehensive error handling and quick fixes
 */
export const validateColor = (colorValue: string, startIndex: number): ValidationError | null => {
	// Check if it's a valid hex color (3 or 6 characters after #)
	const hexPattern = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
	
	if (!hexPattern.test(colorValue)) {
		const fallbackColor = colorValue.length > 1 ? '#' + colorValue.slice(1).replace(/[^0-9a-fA-F]/g, '0').padEnd(6, '0').slice(0, 6) : '#000000';
		
		return {
			type: 'error',
			message: 'Invalid hex color format. Use #RGB or #RRGGBB format.',
			startIndex,
			endIndex: startIndex + colorValue.length,
			suggestion: fallbackColor,
			errorCode: 'COLOR_FORMAT_INVALID',
			contextualHint: 'Use #RGB or #RRGGBB format (e.g., #ff0000 for red)',
			quickFixes: [
				{ label: 'Fix format', replacement: fallbackColor, description: 'Convert to valid hex color' },
				{ label: 'Use red', replacement: '#ff0000', description: 'Set to red color' },
				{ label: 'Use blue', replacement: '#0000ff', description: 'Set to blue color' },
				{ label: 'Use black', replacement: '#000000', description: 'Set to black color' }
			]
		};
	}
	
	return null;
};

/**
 * Validate RGB/RGBA color format
 */
export const validateRgbColor = (colorValue: string, startIndex: number): ValidationError | null => {
	const rgbPattern = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([01]?\.?\d*))?\s*\)$/;
	const match = colorValue.match(rgbPattern);
	
	if (!match) {
		return {
			type: 'error',
			message: 'Invalid RGB color format. Use rgb(r,g,b) or rgba(r,g,b,a).',
			startIndex,
			endIndex: startIndex + colorValue.length,
			suggestion: 'rgb(0, 0, 0)',
			errorCode: 'RGB_FORMAT_INVALID',
			contextualHint: 'RGB values should be 0-255, alpha 0-1',
			quickFixes: [
				{ label: 'Fix format', replacement: 'rgb(0, 0, 0)', description: 'Use valid RGB format' },
				{ label: 'Use red', replacement: 'rgb(255, 0, 0)', description: 'Set to red color' },
				{ label: 'Use blue', replacement: 'rgb(0, 0, 255)', description: 'Set to blue color' }
			]
		};
	}
	
	const [, r, g, b, a] = match;
	const red = parseInt(r, 10);
	const green = parseInt(g, 10);
	const blue = parseInt(b, 10);
	const alpha = a ? parseFloat(a) : 1;
	
	if (red > 255 || green > 255 || blue > 255) {
		return {
			type: 'error',
			message: 'RGB values must be between 0-255.',
			startIndex,
			endIndex: startIndex + colorValue.length,
			suggestion: `rgb(${Math.min(red, 255)}, ${Math.min(green, 255)}, ${Math.min(blue, 255)})`,
			errorCode: 'RGB_VALUES_OUT_OF_RANGE'
		};
	}
	
	if (alpha > 1 || alpha < 0) {
		return {
			type: 'error',
			message: 'Alpha value must be between 0-1.',
			startIndex,
			endIndex: startIndex + colorValue.length,
			suggestion: `rgba(${red}, ${green}, ${blue}, ${Math.max(0, Math.min(1, alpha))})`,
			errorCode: 'ALPHA_VALUE_OUT_OF_RANGE'
		};
	}
	
	return null;
};

/**
 * Validate named colors
 */
export const validateNamedColor = (colorValue: string, startIndex: number): ValidationError | null => {
	const namedColors = [
		'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink',
		'black', 'white', 'gray', 'grey', 'brown', 'cyan', 'magenta'
	];
	
	const normalizedColor = colorValue.toLowerCase();
	if (!namedColors.includes(normalizedColor)) {
		const suggestions = namedColors.filter(color => 
			color.startsWith(normalizedColor.charAt(0))
		).slice(0, 3);
		
		return {
			type: 'warning',
			message: `Unknown named color: ${colorValue}`,
			startIndex,
			endIndex: startIndex + colorValue.length,
			suggestion: suggestions[0] || 'black',
			errorCode: 'UNKNOWN_NAMED_COLOR',
			contextualHint: `Valid named colors: ${namedColors.join(', ')}`,
			quickFixes: suggestions.map(color => ({
				label: `Use ${color}`,
				replacement: color,
				description: `Change to ${color}`
			}))
		};
	}
	
	return null;
};

/**
 * Check if color value is valid in any format
 */
export const isValidColor = (colorValue: string): boolean => {
	// Check hex
	if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(colorValue)) {
		return true;
	}
	
	// Check RGB/RGBA
	if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[01]?\.?\d*)?\s*\)$/.test(colorValue)) {
		return true;
	}
	
	// Check named colors
	const namedColors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'black', 'white', 'gray', 'grey'];
	return namedColors.includes(colorValue.toLowerCase());
};

/**
 * Convert color to hex format if possible
 */
export const convertToHex = (colorValue: string): string | null => {
	// Already hex
	if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(colorValue)) {
		return colorValue.toUpperCase();
	}
	
	// Named color conversion
	const namedColors: Record<string, string> = {
		red: '#FF0000', blue: '#0000FF', green: '#008000',
		yellow: '#FFFF00', orange: '#FFA500', purple: '#800080',
		pink: '#FFC0CB', black: '#000000', white: '#FFFFFF',
		gray: '#808080', grey: '#808080'
	};
	
	return namedColors[colorValue.toLowerCase()] || null;
};

// =============================================================================
// DATE VALIDATION RULES
// =============================================================================

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

// =============================================================================
// PATTERN VALIDATION RULES (Priority, Tag, Assignee)
// =============================================================================

/**
 * Get valid priority values
 */
export const getValidPriorities = (): string[] => {
	return [
		'critical', 'high', 'medium', 'low', 
		'urgent', 'asap', 'blocked', 'waiting', 
		'review', 'done', 'todo', 'next', 'later'
	];
};

/**
 * Validate priority values against known valid priorities
 */
export const validatePriority = (priorityValue: string, startIndex: number): ValidationError | null => {
	// Skip validation for very short partial inputs that could be partial valid priorities
	if (priorityValue.length <= 2) {
		const validPriorities = getValidPriorities();
		const lowerPriority = priorityValue.toLowerCase();
		
		// Check if this could be a partial match for any valid priority
		const hasPartialMatch = validPriorities.some(priority => 
			priority.startsWith(lowerPriority)
		);
		
		if (hasPartialMatch) {
			return null;
		}
	}
	
	const validPriorities = getValidPriorities();
	const lowerPriority = priorityValue.toLowerCase();
	
	if (!validPriorities.includes(lowerPriority)) {
		// Find closest match for better suggestion
		const closestMatch = validPriorities.find(priority => 
			priority.startsWith(lowerPriority.charAt(0))
		) || 'medium';
		
		return {
			type: 'error',
			message: `Invalid priority "${priorityValue}". Use one of: ${validPriorities.join(', ')}.`,
			startIndex,
			endIndex: startIndex + priorityValue.length,
			suggestion: closestMatch,
			errorCode: 'PRIORITY_INVALID',
			contextualHint: 'Valid priorities include: critical, high, medium, low, urgent, asap, blocked, waiting, etc.',
			quickFixes: [
				{ label: `Use "${closestMatch}"`, replacement: closestMatch, description: `Change to ${closestMatch}` },
				{ label: 'Use "high"', replacement: 'high', description: 'Set to high priority' },
				{ label: 'Use "medium"', replacement: 'medium', description: 'Set to medium priority' },
				{ label: 'Use "urgent"', replacement: 'urgent', description: 'Set to urgent status' }
			]
		};
	}
	
	return null;
};

/**
 * Validate tag format and detect task checkboxes
 */
export const validateTag = (tagContent: string, startIndex: number): ValidationError | null => {
	// Check if this is a task checkbox (valid patterns: x, X, space, empty)
	// Supported checkbox formats:
	// - [ ] - unchecked (space)
	// - [x] - checked (lowercase x)  
	// - [X] - checked (uppercase X)
	// - [] - unchecked (empty brackets)
	const taskCheckboxPattern = /^[\s]*[xX]?[\s]*$/;
	if (taskCheckboxPattern.test(tagContent)) {
		// This is a valid task checkbox, no validation needed
		return null;
	}
	
	// For actual tags, they should not be empty
	if (!tagContent.trim()) {
		return {
			type: 'error',
			message: 'Tags cannot be empty.',
			startIndex,
			endIndex: startIndex + tagContent.length,
			suggestion: 'new-tag',
			errorCode: 'TAG_EMPTY',
			contextualHint: 'Tags should contain descriptive text',
			quickFixes: [
				{ label: 'Add "important"', replacement: 'important', description: 'Add important tag' },
				{ label: 'Add "todo"', replacement: 'todo', description: 'Add todo tag' },
				{ label: 'Add "work"', replacement: 'work', description: 'Add work tag' }
			]
		};
	}
	
	// Check for invalid characters (basic validation)
	const invalidChars = /[<>'"]/;
	if (invalidChars.test(tagContent)) {
		const cleanTag = tagContent.replace(/[<>'"]/g, '');
		return {
			type: 'warning',
			message: 'Tags contain special characters that may cause issues.',
			startIndex,
			endIndex: startIndex + tagContent.length,
			suggestion: cleanTag,
			errorCode: 'TAG_INVALID_CHARS',
			contextualHint: 'Avoid using <, >, \', " in tags',
			quickFixes: [
				{ label: 'Remove special chars', replacement: cleanTag, description: 'Remove problematic characters' }
			]
		};
	}
	
	// Check for overly long tags
	if (tagContent.length > 50) {
		return {
			type: 'warning',
			message: 'Tag is very long. Consider shortening for better readability.',
			startIndex,
			endIndex: startIndex + tagContent.length,
			suggestion: tagContent.substring(0, 47) + '...',
			errorCode: 'TAG_TOO_LONG',
			contextualHint: 'Tags should be short and descriptive'
		};
	}
	
	return null;
};

/**
 * Validate assignee username format
 */
export const validateAssignee = (assigneeValue: string, startIndex: number): ValidationError | null => {
	// Skip validation for very short partial inputs that look like they're being typed
	if (assigneeValue.length <= 1 && /^[a-zA-Z]$/.test(assigneeValue)) {
		return null;
	}
	
	// Basic username validation
	const usernamePattern = /^[a-zA-Z][a-zA-Z0-9._-]*$/;
	
	if (!usernamePattern.test(assigneeValue)) {
		const cleanAssignee = assigneeValue.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase() || 'username';
		
		return {
			type: 'error',
			message: 'Invalid assignee format. Must start with letter and contain only letters, numbers, dots, underscores, or hyphens.',
			startIndex,
			endIndex: startIndex + assigneeValue.length,
			suggestion: cleanAssignee,
			errorCode: 'ASSIGNEE_INVALID_FORMAT',
			contextualHint: 'Username format: start with letter, use letters, numbers, dots, underscores, or hyphens',
			quickFixes: [
				{ label: 'Fix format', replacement: cleanAssignee, description: 'Remove invalid characters' },
				{ label: 'Use "user"', replacement: 'user', description: 'Set to generic username' }
			]
		};
	}
	
	// Check for overly long usernames
	if (assigneeValue.length > 30) {
		return {
			type: 'warning',
			message: 'Username is very long. Consider using a shorter alias.',
			startIndex,
			endIndex: startIndex + assigneeValue.length,
			suggestion: assigneeValue.substring(0, 27) + '...',
			errorCode: 'ASSIGNEE_TOO_LONG',
			contextualHint: 'Usernames should be concise for readability'
		};
	}
	
	return null;
};

/**
 * Check if priority is valid
 */
export const isValidPriority = (priority: string): boolean => {
	return getValidPriorities().includes(priority.toLowerCase());
};

/**
 * Check if tag content is valid
 */
export const isValidTag = (tagContent: string): boolean => {
	if (!tagContent.trim()) return false;
	if (/[<>'"]/g.test(tagContent)) return false;
	return true;
};

/**
 * Check if assignee format is valid
 */
export const isValidAssignee = (assignee: string): boolean => {
	const usernamePattern = /^[a-zA-Z][a-zA-Z0-9._-]*$/;
	return usernamePattern.test(assignee) && assignee.length <= 30;
};

/**
 * Get suggested priorities based on partial input
 */
export const getSuggestedPriorities = (partial: string): string[] => {
	const validPriorities = getValidPriorities();
	const lowerPartial = partial.toLowerCase();
	
	return validPriorities
		.filter(priority => priority.startsWith(lowerPartial))
		.slice(0, 5);
};

/**
 * Get common tag suggestions
 */
export const getCommonTagSuggestions = (): string[] => {
	return ['important', 'urgent', 'work', 'personal', 'meeting', 'todo', 'idea', 'bug', 'feature'];
};

// =============================================================================
// MAIN VALIDATION ORCHESTRATION
// =============================================================================

/**
 * Main validation function that orchestrates all pattern validators
 */
export const validateInput = (text: string): ValidationError[] => {
	const errors: ValidationError[] = [];
	
	try {
		// Don't validate very short incomplete patterns
		if (text.length <= 1) {
			return errors;
		}
		
		// Pattern definitions for validation - order matters!
		const patterns: PatternValidator[] = [
			// Tag patterns - must come first to avoid conflicts
			{
				regex: /\[([^\]]*)\]/g,
				type: 'tag',
				validator: (match: RegExpExecArray) => {
					try {
						const content = match[1];
						const startIndex = match.index! + 1; // Skip opening bracket
						return validateTag(content, startIndex);
					} catch (error) {
						console.error('Tag validation error:', error);
						return null;
					}
				}
			},
			
			// Color patterns - must come before priority to avoid conflicts
			{
				regex: /color:([^,\s\]]*)/gi,
				type: 'color',
				validator: (match: RegExpExecArray) => {
					try {
						const color = match[1];
						const startIndex = match.index! + 6; // Skip "color:"
						
						// If color is empty or doesn't start with #, it's invalid
						if (!color || !color.startsWith('#')) {
							return {
								type: 'error',
								message: 'Invalid hex color format. Use #RGB or #RRGGBB format.',
								startIndex,
								endIndex: startIndex + color.length,
								suggestion: '#000000',
								errorCode: 'COLOR_FORMAT_INVALID'
							};
						}
						
						return validateColor(color, startIndex);
					} catch (error) {
						console.error('Color validation error:', error);
						return null;
					}
				}
			},
			
			// Priority patterns
			{
				regex: /#([a-zA-Z]+)/gi,
				type: 'priority',
				validator: (match: RegExpExecArray) => {
					try {
						const priority = match[1];
						if (!priority || priority.length === 0) {
							return null;
						}
						
						// Skip if this looks like part of a hex color in a color: pattern
						const fullText = match.input || '';
						const matchStart = match.index!;
						const beforeMatch = fullText.substring(Math.max(0, matchStart - 10), matchStart);
						if (beforeMatch.toLowerCase().includes('color:')) {
							return null;
						}
						
						// Skip if the match looks like a hex color
						if (/^[0-9a-fA-F]+$/.test(priority)) {
							return null;
						}
						
						const startIndex = match.index! + 1; // Skip hash
						return validatePriority(priority, startIndex);
					} catch (error) {
						console.error('Priority validation error:', error);
						return null;
					}
				}
			},
			
			// Date patterns
			{
				regex: /@([a-zA-Z]\w*|\d[\d\-\/]*)/g,
				type: 'date',
				validator: (match: RegExpExecArray) => {
					try {
						const date = match[1];
						if (!date || date.length === 0) {
							return null;
						}
						
						const startIndex = match.index! + 1; // Skip @
						return validateDate(date, startIndex);
					} catch (error) {
						console.error('Date validation error:', error);
						return null;
					}
				}
			},
			
			// Assignee patterns
			{
				regex: /\+([a-zA-Z][a-zA-Z0-9._-]*)/g,
				type: 'assignee',
				validator: (match: RegExpExecArray) => {
					try {
						const assignee = match[1];
						if (!assignee || assignee.length === 0) {
							return null;
						}
						
						const startIndex = match.index! + 1; // Skip +
						return validateAssignee(assignee, startIndex);
					} catch (error) {
						console.error('Assignee validation error:', error);
						return null;
					}
				}
			}
		];
		
		// Apply all validators
		for (const pattern of patterns) {
			pattern.regex.lastIndex = 0; // Reset regex state
			let match;
			
			while ((match = pattern.regex.exec(text)) !== null) {
				const validationError = pattern.validator(match);
				if (validationError) {
					errors.push(validationError);
				}
				
				// Prevent infinite loops
				if (pattern.regex.lastIndex === match.index) {
					pattern.regex.lastIndex++;
				}
			}
		}
		
		return errors;
	} catch (error) {
		console.error('Validation orchestrator error:', error);
		return [];
	}
};

/**
 * Find optimization suggestions for the input
 */
export const findSuggestions = (text: string): ValidationError[] => {
	const suggestions: ValidationError[] = [];
	
	try {
		// Suggest adding patterns for common words
		if (text.includes('urgent') && !text.includes('#urgent')) {
			suggestions.push({
				type: 'suggestion',
				message: 'Consider using #urgent for better priority visibility.',
				startIndex: text.indexOf('urgent'),
				endIndex: text.indexOf('urgent') + 6,
				suggestion: '#urgent',
				errorCode: 'PRIORITY_SUGGESTION'
			});
		}
		
		// Suggest date patterns for date-like words
		if (/(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(text) && !text.includes('@')) {
			const match = text.match(/(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
			if (match) {
				const word = match[0];
				const index = match.index!;
				suggestions.push({
					type: 'suggestion',
					message: `Consider using @${word} for date pattern.`,
					startIndex: index,
					endIndex: index + word.length,
					suggestion: `@${word}`,
					errorCode: 'DATE_PATTERN_SUGGESTION'
				});
			}
		}
		
		return suggestions;
	} catch (error) {
		console.error('Suggestions error:', error);
		return [];
	}
};

/**
 * Find incomplete patterns that might need completion
 */
export const findIncompletePatterns = (text: string): ValidationError[] => {
	const warnings: ValidationError[] = [];
	
	try {
		// Check for incomplete patterns
		const incompletePatterns = [
			{ pattern: /@$/, message: 'Incomplete date pattern' },
			{ pattern: /#$/, message: 'Incomplete priority pattern' },
			{ pattern: /\+$/, message: 'Incomplete assignee pattern' },
			{ pattern: /color:$/, message: 'Incomplete color pattern' },
			{ pattern: /\[$/, message: 'Incomplete tag pattern' }
		];
		
		for (const incomplete of incompletePatterns) {
			const match = incomplete.pattern.exec(text);
			if (match) {
				warnings.push({
					type: 'warning',
					message: incomplete.message,
					startIndex: match.index,
					endIndex: match.index + match[0].length,
					errorCode: 'PATTERN_INCOMPLETE'
				});
			}
		}
		
		return warnings;
	} catch (error) {
		console.error('Incomplete patterns error:', error);
		return [];
	}
};