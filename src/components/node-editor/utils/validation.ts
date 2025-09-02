/**
 * Validation utilities for pattern inputs
 * Provides real-time validation with detailed error messages
 */

export interface ValidationError {
	type: 'error' | 'warning' | 'suggestion';
	message: string;
	startIndex: number;
	endIndex: number;
	suggestion?: string;
	errorCode?: string; // For programmatic error handling
	contextualHint?: string; // For showing format hints
	quickFixes?: Array<{
		label: string;
		replacement: string;
		description?: string;
	}>; // For actionable suggestions
}

// Validate hex colors
const validateColor = (colorValue: string, startIndex: number): ValidationError | null => {
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

// Helper function to check if a year is a leap year
const isLeapYear = (year: number): boolean => {
	return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
};

// Helper function to get days in a month
const getDaysInMonth = (month: number, year: number): number => {
	const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
	if (month === 2 && isLeapYear(year)) {
		return 29;
	}
	return daysInMonth[month - 1] || 0;
};

// Helper function to get month name
const getMonthName = (month: number): string => {
	const months = [
		'January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'
	];
	return months[month - 1] || 'Unknown';
};

// Helper function to suggest closest valid date
const suggestClosestValidDate = (year: number, month: number, invalidDay: number): string => {
	const maxDays = getDaysInMonth(month, year);
	const suggestedDay = Math.min(invalidDay, maxDays);
	return `${year}-${month.toString().padStart(2, '0')}-${suggestedDay.toString().padStart(2, '0')}`;
};

// Validate date formats with comprehensive calendar date checking
const validateDate = (dateValue: string, startIndex: number): ValidationError | null => {
	const lowerDate = dateValue.toLowerCase().trim();
	
	// Skip validation for very short partial numeric inputs that look like incomplete dates
	if (/^\d{1,2}$/.test(dateValue)) {
		return null; // Only skip 1-2 digit numbers like "2" or "20"
	}
	
	// Skip validation for 3-digit numbers that look like partial years
	if (/^\d{3}$/.test(dateValue)) {
		return null; // Skip "202" as it's likely partial "2024"
	}
	
	// Skip validation for 4-digit years that look complete but might be partial
	if (/^\d{4}$/.test(dateValue)) {
		return null; // Skip "2024" as it could be partial date input
	}
	
	// Skip validation for partial date patterns that look like they're still being typed
	if (/^\d{4}-$/.test(dateValue) || /^\d{4}-\d{1,2}$/.test(dateValue) || /^\d{4}-\d{1,2}-$/.test(dateValue)) {
		return null;
	}
	
	// Known valid date keywords
	const validKeywords = [
		'today', 'tomorrow', 'yesterday',
		'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
		'week', 'month', 'next', 'last'
	];
	
	// Check if it's a valid keyword
	if (validKeywords.includes(lowerDate)) {
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

// Import priority completions to ensure validation matches completion data
import { priorityCompletions } from './completion-data';

// Get all valid priority values from completion data
const getValidPriorities = (): string[] => {
	return priorityCompletions.map(item => item.value.toLowerCase());
};

// Validate priority values
const validatePriority = (priorityValue: string, startIndex: number): ValidationError | null => {
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

// Validate tag format
const validateTag = (tagContent: string, startIndex: number): ValidationError | null => {
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
			suggestion: 'new-tag'
		};
	}
	
	// Check for invalid characters (basic validation)
	const invalidChars = /[<>'"]/;
	if (invalidChars.test(tagContent)) {
		return {
			type: 'warning',
			message: 'Tags contain special characters that may cause issues.',
			startIndex,
			endIndex: startIndex + tagContent.length
		};
	}
	
	return null;
};

// Validate assignee format
const validateAssignee = (assigneeValue: string, startIndex: number): ValidationError | null => {
	// Skip validation for very short partial inputs that look like they're being typed
	if (assigneeValue.length <= 1 && /^[a-zA-Z]$/.test(assigneeValue)) {
		return null;
	}
	
	// Basic username validation
	const usernamePattern = /^[a-zA-Z][a-zA-Z0-9._-]*$/;
	
	if (!usernamePattern.test(assigneeValue)) {
		return {
			type: 'error',
			message: 'Invalid assignee format. Must start with letter and contain only letters, numbers, dots, underscores, or hyphens.',
			startIndex,
			endIndex: startIndex + assigneeValue.length,
			suggestion: assigneeValue.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase() || 'username'
		};
	}
	
	return null;
};

// Main validation function
export const validateInput = (text: string): ValidationError[] => {
	const errors: ValidationError[] = [];
	
	try {
		// Don't validate very short incomplete patterns
		if (text.length <= 1) {
			return errors;
		}
		
		// Pattern definitions for validation
		// Order matters! More specific patterns should come first
		const patterns = [
			{
				regex: /\[([^\]]*)\]/g,
				type: 'tag' as const,
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
			{
				regex: /color:([^,\s\]]*)/gi,
				type: 'color' as const,
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
								suggestion: '#000000'
							};
						}
						
						return validateColor(color, startIndex);
					} catch (error) {
						console.error('Color validation error:', error);
						return null;
					}
				}
			},
			{
				regex: /#([a-zA-Z]+)/gi,
				type: 'priority' as const,
				validator: (match: RegExpExecArray) => {
					try {
						const priority = match[1];
						// Skip empty priority matches
						if (!priority || priority.length === 0) {
							return null;
						}
						// Skip if this looks like part of a hex color in a color: pattern
						const fullText = match.input || '';
						const matchStart = match.index!;
						// Look for 'color:' before this match (more generous range)
						const beforeMatch = fullText.substring(Math.max(0, matchStart - 10), matchStart);
						if (beforeMatch.toLowerCase().includes('color:')) {
							return null;
						}
						// Also skip if the match looks like a hex color (contains hex chars)
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
			{
				regex: /@([a-zA-Z]\w*|\d[\d\-\/]*)/g,
				type: 'date' as const,
				validator: (match: RegExpExecArray) => {
					try {
						const date = match[1];
						// Skip single character date matches
						if (!date || date.length === 0) {
							return null;
						}
						
						// Skip if this @ is part of an assignee pattern (preceded by +)
						const fullText = match.input || '';
						const matchStart = match.index!;
						// Look for '+' before this @ match (check a reasonable range before)
						for (let i = Math.max(0, matchStart - 20); i < matchStart; i++) {
							if (fullText[i] === '+') {
								// Check if there are only valid assignee characters between + and @
								const between = fullText.substring(i + 1, matchStart);
								if (/^[a-zA-Z][a-zA-Z0-9._-]*$/.test(between)) {
									return null; // Skip this date validation as it's part of an assignee
								}
							}
						}
						
						const startIndex = match.index! + 1; // Skip @
						return validateDate(date, startIndex);
					} catch (error) {
						console.error('Date validation error:', error);
						return null;
					}
				}
			},
			{
				regex: /\+(\S+)/g,
				type: 'assignee' as const,
				validator: (match: RegExpExecArray) => {
					try {
						const assignee = match[1];
						// Skip empty assignee matches
						if (!assignee || assignee.length === 0) {
							return null;
						}
						
						const fullText = match.input || '';
						const matchEnd = match.index! + match[0].length;
						
						// Check if there's a space immediately after this assignee (suggests malformed input like "+user space")
						if (matchEnd < fullText.length && fullText[matchEnd] === ' ') {
							// Look ahead to see what comes after the space
							const afterSpace = fullText.substring(matchEnd + 1).trim();
							
							// Only flag as error if:
							// 1. There's text after the space AND
							// 2. It doesn't start with a pattern character (@+#[color:) AND  
							// 3. It looks like it could be part of an intended username (single word, no spaces)
							if (afterSpace && 
								!afterSpace.match(/^[@+#\[c]/) && // Not a pattern starter 
								!/^color:/i.test(afterSpace) && // Not a color pattern
								afterSpace.split(' ')[0].length > 0 && // Has content
								afterSpace.split(' ').length === 1) { // Single word (no additional spaces)
								
								// This looks like a malformed assignee with space
								return {
									type: 'error',
									message: 'Invalid assignee format. Usernames cannot contain spaces.',
									startIndex: match.index! + 1, // Skip +
									endIndex: matchEnd + afterSpace.split(' ')[0].length + 1, // Include the problematic part
									suggestion: assignee + afterSpace.split(' ')[0].replace(/[^a-zA-Z0-9._-]/g, '') || 'username'
								};
							}
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
		
		// Run validation for each pattern
		patterns.forEach(({ regex, validator }) => {
			try {
				let match;
				regex.lastIndex = 0; // Reset regex state
				
				while ((match = regex.exec(text)) !== null) {
					// Add the full text to the match object for context
					match.input = text;
					const error = validator(match);
					if (error) {
						errors.push(error);
					}
					
					// Prevent infinite loops
					if (regex.lastIndex === match.index) {
						break;
					}
				}
			} catch (error) {
				console.error('Pattern matching error:', error);
			}
		});
		
	} catch (error) {
		console.error('validateInput error:', error);
	}
	
	return errors;
};

// Check for optimization suggestions
const findSuggestions = (text: string): ValidationError[] => {
	const suggestions: ValidationError[] = [];
	
	try {
		// Suggest more specific priority when using generic terms
		if (text.includes('#normal') || text.includes('#regular')) {
			const match = text.match(/#(normal|regular)/);
			if (match) {
				const startIndex = text.indexOf(match[0]) + 1; // Skip #
				suggestions.push({
					type: 'suggestion',
					message: 'Consider using "medium" instead for better clarity.',
					startIndex,
					endIndex: startIndex + match[1].length,
					suggestion: 'medium'
				});
			}
		}
		
		// Suggest using tags for common organizational words
		if (text.includes('urgent') || text.includes('important')) {
			const match = text.match(/\b(urgent|important)\b/i);
			if (match) {
				const startIndex = text.indexOf(match[0]);
				suggestions.push({
					type: 'suggestion',
					message: 'Consider using a tag format for better organization.',
					startIndex,
					endIndex: startIndex + match[0].length,
					suggestion: `[${match[0].toLowerCase()}]`
				});
			}
		}
		
	} catch (error) {
		console.error('findSuggestions error:', error);
	}
	
	return suggestions;
};

// Check for incomplete patterns (for warnings)
export const findIncompletePatterns = (text: string): ValidationError[] => {
	const warnings: ValidationError[] = [];
	
	try {
		// Don't show warnings for very short text (but allow single character pattern warnings)
		if (text.length < 1) {
			return warnings;
		}
		
		// Look for incomplete patterns at the end of text
		const incompletePatterns = [
			{
				regex: /\[[^\]]*$/,
				message: 'Incomplete tag - missing closing bracket',
				type: 'warning' as const,
				minLength: 1 // Show even for single [ character
			},
			{
				regex: /color:\s*#?[0-9a-fA-F]{0,2}$/i,
				message: 'Incomplete color - provide a hex color value',
				type: 'warning' as const,
				minLength: 6
			},
			{
				regex: /@\s*$/,
				message: 'Incomplete date - provide a date value',
				type: 'warning' as const,
				minLength: 2
			},
			{
				regex: /\+\s*$/,
				message: 'Incomplete assignee - provide a username',
				type: 'warning' as const,
				minLength: 2
			},
			{
				regex: /#\s*$/,
				message: 'Incomplete priority - use low, medium, or high',
				type: 'warning' as const,
				minLength: 2
			}
		];
		
		incompletePatterns.forEach(({ regex, message, type, minLength }) => {
			try {
				regex.lastIndex = 0; // Reset regex state
				const match = regex.exec(text);
				if (match && text.length >= minLength) {
					warnings.push({
						type,
						message,
						startIndex: match.index,
						endIndex: match.index + match[0].length
					});
				}
			} catch (error) {
				console.error('Incomplete pattern matching error:', error);
			}
		});
		
	} catch (error) {
		console.error('findIncompletePatterns error:', error);
	}
	
	return warnings;
};

// Get all validation errors, warnings, and suggestions
export const getValidationResults = (text: string): ValidationError[] => {
	try {
		if (!text || typeof text !== 'string') {
			return [];
		}
		
		const errors = validateInput(text);
		const warnings = findIncompletePatterns(text);
		const suggestions = findSuggestions(text);
		
		return [...errors, ...warnings, ...suggestions];
	} catch (error) {
		console.error('getValidationResults error:', error);
		return [];
	}
};