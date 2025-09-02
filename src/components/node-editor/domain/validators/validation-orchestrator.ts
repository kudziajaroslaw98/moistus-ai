/**
 * Main validation orchestrator
 * Coordinates all pattern validators and provides unified validation interface
 */

import type { ValidationError } from '../../utils/validation';
import { validateColor } from './color-validator';
import { validateDate } from './date-validator';
import { validatePriority, validateTag, validateAssignee } from './pattern-validators';

/**
 * Pattern validator configuration
 */
interface PatternValidator {
	regex: RegExp;
	type: 'color' | 'date' | 'priority' | 'tag' | 'assignee';
	validator: (match: RegExpExecArray) => ValidationError | null;
}

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

/**
 * Get all validation results: errors, warnings, and suggestions
 */
export const getValidationResults = (text: string): ValidationError[] => {
	try {
		const errors = validateInput(text);
		const suggestions = findSuggestions(text);
		const incompleteWarnings = findIncompletePatterns(text);
		
		return [...errors, ...suggestions, ...incompleteWarnings];
	} catch (error) {
		console.error('Get validation results error:', error);
		return [];
	}
};