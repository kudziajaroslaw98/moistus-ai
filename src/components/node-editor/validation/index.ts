/**
 * Simple validation utilities for node editor
 * Provides basic validation for common patterns
 */

import { isValidDateString } from '../parsers/common-utilities';

export interface ValidationError {
	message: string;
	position?: { start: number; end: number };
	severity: 'error' | 'warning' | 'info';
	type: 'error' | 'warning' | 'suggestion';
	suggestions?: string[];
}

/**
 * Validate color values
 */
export const isValidColor = (color: string): boolean => {
	// Hex colors
	if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(color)) return true;
	
	// RGB/RGBA colors
	if (/^rgba?\([\d,.\s]+\)$/.test(color)) return true;
	
	// Named colors
	const namedColors = [
		'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 
		'black', 'white', 'gray', 'grey', 'brown', 'cyan', 'magenta'
	];
	return namedColors.includes(color.toLowerCase());
};

/**
 * Validate priority values
 */
export const isValidPriority = (priority: string): boolean => {
	const validPriorities = ['low', 'medium', 'high', 'critical', 'urgent', 'asap', 'blocked', 'waiting'];
	return validPriorities.includes(priority.toLowerCase());
};

/**
 * Validate tag format
 */
export const isValidTag = (tag: string): boolean => {
	return tag.length > 0 && tag.length <= 50 && !/[<>&"]/.test(tag);
};

/**
 * Validate assignee format
 */
export const isValidAssignee = (assignee: string): boolean => {
	return assignee.length > 0 && assignee.length <= 100 && !/[<>&"]/.test(assignee);
};

/**
 * Basic input validation
 */
export const validateInput = (input: string): ValidationError[] => {
	const errors: ValidationError[] = [];
	
	if (!input || input.trim().length === 0) {
		errors.push({
			message: 'Input cannot be empty',
			severity: 'error',
			type: 'error'
		});
	}
	
	return errors;
};

/**
 * Get suggested values for a pattern type
 */
export const getSuggestions = (patternType: string, query: string): string[] => {
	switch (patternType) {
		case 'priority':
			const priorities = ['low', 'medium', 'high', 'critical', 'urgent'];
			return priorities.filter(p => p.toLowerCase().includes(query.toLowerCase()));
		
		case 'color':
			const colors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'black', 'white', 'gray'];
			return colors.filter(c => c.toLowerCase().includes(query.toLowerCase()));
		
		case 'tag':
			const commonTags = ['todo', 'urgent', 'meeting', 'review', 'bug', 'feature', 'docs'];
			return commonTags.filter(t => t.toLowerCase().includes(query.toLowerCase()));
		
		default:
			return [];
	}
};

/**
 * Get validation results for input text
 * This is the main validation function used by enhanced-input
 */
export const getValidationResults = (text: string): ValidationError[] => {
	const errors: ValidationError[] = [];
	
	// Basic empty check
	if (!text || text.trim().length === 0) {
		return errors; // Don't show error for empty input
	}
	
	// Check for multiple node type triggers
	const nodeTypeTriggers = text.match(/\$\w+/g);

	if (nodeTypeTriggers && nodeTypeTriggers.length > 1) {
		// Find positions of all triggers after the first one
		const nodeTypePattern = /\$\w+/g;
		let match;
		let foundFirst = false;
		
		while ((match = nodeTypePattern.exec(text)) !== null) {
			if (foundFirst) {
				// This is an additional trigger - mark as error
				errors.push({
					message: `Multiple node type triggers found. Remove "${match[0]}" or use only one per input.`,
					position: { start: match.index, end: match.index + match[0].length },
					severity: 'error',
					type: 'error',
					suggestions: [`Remove ${match[0]}`]
				});
			} else {
				foundFirst = true;
			}
			
			// Prevent infinite loop
			if (nodeTypePattern.lastIndex === match.index) {
				nodeTypePattern.lastIndex++;
			}
		}
	}
	
	// Check for incomplete patterns
	if (text.includes('@') && !text.match(/@\w+/)) {
		errors.push({
			message: 'Incomplete date pattern. Try @today, @tomorrow, or @YYYY-MM-DD',
			severity: 'warning',
			type: 'warning',
			suggestions: ['@today', '@tomorrow', '@monday']
		});
	}
	
	if (text.includes('#') && !text.match(/#\w+/)) {
		errors.push({
			message: 'Incomplete priority pattern. Try #high, #medium, or #low',
			severity: 'warning',
			type: 'warning',
			suggestions: ['#high', '#medium', '#low']
		});
	}
	
	if (text.includes('color:') && !text.match(/color:\w+/)) {
		errors.push({
			message: 'Incomplete color pattern. Try color:red, color:#ff0000',
			severity: 'warning',
			type: 'warning',
			suggestions: ['color:red', 'color:blue', 'color:#ff0000']
		});
	}
	
	if (text.includes('[') && !text.includes(']')) {
		errors.push({
			message: 'Unclosed tag pattern. Close with ]',
			severity: 'error',
			type: 'error'
		});
	}
	
	return errors;
};

// Re-export from parsers for convenience
export { isValidDateString } from '../parsers/common-utilities';