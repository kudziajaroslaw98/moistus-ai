/**
 * Pattern-specific validators
 * Validates priority, tag, and assignee patterns with smart suggestions
 */

import type { ValidationError } from '../../utils/validation';

/**
 * Get valid priority values - hardcoded to avoid circular dependency
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