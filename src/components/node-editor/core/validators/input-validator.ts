/**
 * Input Validator - Core validation logic for node editor
 * Provides unified validation for all input patterns
 */

import { isValidColor } from '../utils/color-utils';
import { isValidDateString } from '../utils/date-utils';
import { isValidPriority } from '../utils/priority-utils';
import type { ValidationError, ValidationResult } from './validation-types';

export interface ValidationRule {
	pattern: RegExp;
	validate: (match: RegExpExecArray, text: string) => ValidationError | null;
}

/**
 * Built-in validation rules
 */
const VALIDATION_RULES: ValidationRule[] = [
	// Multiple node type triggers
	{
		pattern: /\$\w+/g,
		validate: (match, text) => {
			const allMatches: string[] = text.match(/\$\w+/g) || [];

			if (allMatches.length > 1 && allMatches.indexOf(match[0] as string) > 0) {
				return {
					message: `Multiple node type triggers found. Remove "${match[0]}"`,
					startIndex: match.index,
					endIndex: match.index + match[0].length,
					type: 'error',
					quickFixes: [
						{
							label: 'Remove duplicate',
							replacement: '',
							description: 'Remove this duplicate node type trigger',
						},
					],
				};
			}

			return null;
		},
	},

	// Invalid date format
	{
		pattern: /\^([^\s^]+)/g, // Using ^ prefix for dates
		validate: (match) => {
			const dateValue = match[1];

			if (!isValidDateString(dateValue)) {
				return {
					message: `Invalid date format: "${dateValue}"`,
					startIndex: match.index,
					endIndex: match.index + match[0].length,
					type: 'warning',
					suggestion: 'Use ^today, ^tomorrow, or ^YYYY-MM-DD',
					quickFixes: [
						{ label: 'Today', replacement: '^today' },
						{ label: 'Tomorrow', replacement: '^tomorrow' },
						{ label: 'Next Monday', replacement: '^monday' },
					],
				};
			}

			return null;
		},
	},

	// Invalid priority (uses ! prefix)
	{
		pattern: /!(high|medium|low|critical|urgent|asap|blocked|waiting|1|2|3)\b/gi,
		validate: (match) => {
			const priority = match[1].toLowerCase();
			// All matched values are valid, so no error
			// This rule is kept for future validation if needed
			return null;
		},
	},

	// Invalid color format
	{
		pattern: /color:([^\s]+)/gi,
		validate: (match) => {
			const color = match[1];

			if (!isValidColor(color)) {
				return {
					message: `Invalid color format: "${color}"`,
					startIndex: match.index,
					endIndex: match.index + match[0].length,
					type: 'warning',
					suggestion: 'Use hex (#fff), rgb(r,g,b), or color names',
					quickFixes: [
						{ label: 'Red', replacement: 'color:red' },
						{ label: 'Blue', replacement: 'color:blue' },
						{ label: 'Green', replacement: 'color:green' },
					],
				};
			}

			return null;
		},
	},

	// Unclosed brackets
	{
		pattern: /\[([^\]]*$)/g,
		validate: (match) => {
			return {
				message: 'Unclosed bracket - add ]',
				startIndex: match.index,
				endIndex: match.index + match[0].length,
				type: 'error',
				quickFixes: [
					{
						label: 'Close bracket',
						replacement: match[0] + ']',
					},
				],
			};
		},
	},
];

// Validation helper functions are now imported from utility modules
// isValidDateString is imported from '../utils/date-utils'
// isValidColor is imported from '../utils/color-utils'
// isValidPriority is imported from '../utils/priority-utils'

/**
 * Main validation function
 */
export function validateInput(text: string): ValidationResult {
	const errors: ValidationError[] = [];
	const warnings: ValidationError[] = [];
	const suggestions: string[] = [];

	// Apply all validation rules
	for (const rule of VALIDATION_RULES) {
		rule.pattern.lastIndex = 0;
		let match;

		while ((match = rule.pattern.exec(text)) !== null) {
			const error = rule.validate(match, text);

			if (error) {
				if (error.type === 'error') {
					errors.push(error);
				} else if (error.type === 'warning') {
					warnings.push(error);
				}

				if (error.suggestion && !suggestions.includes(error.suggestion)) {
					suggestions.push(error.suggestion);
				}
			}

			// Prevent infinite loop
			if (rule.pattern.lastIndex === match.index) {
				rule.pattern.lastIndex++;
			}
		}
	}

	// Check for incomplete patterns
	checkIncompletePatterns(text, warnings);

	return {
		isValid: errors.length === 0,
		errors,
		warnings,
		suggestions: [],
	};
}

/**
 * Check for incomplete patterns
 */
function checkIncompletePatterns(
	text: string,
	warnings: ValidationError[]
): void {
	// Check for incomplete date pattern (using ^)
	const dateMatch = text.match(/\^(?!\w)/);

	if (dateMatch && dateMatch.index !== undefined) {
		warnings.push({
			message: 'Incomplete date pattern',
			startIndex: dateMatch.index,
			endIndex: dateMatch.index + 1,
			type: 'info',
			suggestion: 'Complete the date: ^today, ^tomorrow, ^2024-01-01',
		});
	}

	// Check for incomplete priority pattern (uses ! prefix)
	const priorityMatch = text.match(/!(?!\w)/);

	if (priorityMatch && priorityMatch.index !== undefined) {
		warnings.push({
			message: 'Incomplete priority pattern',
			startIndex: priorityMatch.index,
			endIndex: priorityMatch.index + 1,
			type: 'info',
			suggestion: 'Complete the priority: !high, !medium, !low, or use !, !!, !!!',
		});
	}

	// Check for incomplete color pattern
	const colorMatch = text.match(/color:(?!\S)/);

	if (colorMatch && colorMatch.index !== undefined) {
		warnings.push({
			message: 'Incomplete color pattern',
			startIndex: colorMatch.index,
			endIndex: colorMatch.index + 6,
			type: 'info',
			suggestion: 'Complete the color: color:red, color:#ff0000',
		});
	}
}

/**
 * Get suggestions for a pattern type
 */
export function getSuggestions(
	patternType: string,
	query: string = ''
): string[] {
	const suggestions: Record<string, string[]> = {
		priority: ['high', 'medium', 'low', 'critical', 'urgent'],
		date: [
			'today',
			'tomorrow',
			'monday',
			'tuesday',
			'wednesday',
			'thursday',
			'friday',
		],
		color: [
			'red',
			'blue',
			'green',
			'yellow',
			'orange',
			'purple',
			'black',
			'white',
		],
		status: ['active', 'pending', 'completed', 'blocked', 'in-progress'],
		assignee: [], // Would be populated from user data
	};

	const items = suggestions[patternType] || [];

	if (query) {
		return items.filter((item) =>
			item.toLowerCase().includes(query.toLowerCase())
		);
	}

	return items;
}
