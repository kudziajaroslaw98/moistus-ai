/**
 * Validator exports and factory
 * Centralized access to all validators with backward compatibility
 */

// Export all validator modules
export * from './color-validator';
export * from './date-validator';
export * from './pattern-validators';
export * from './validation-orchestrator';

// Export main validation functions for backward compatibility
export { validateInput, findSuggestions, findIncompletePatterns, getValidationResults } from './validation-orchestrator';

// Import validators for registry
import { validateColor } from './color-validator';
import { validateDate } from './date-validator';
import { validatePriority, validateTag, validateAssignee } from './pattern-validators';

// Re-export specific validators
export {
	validateColor,
	isValidColor,
	convertToHex
} from './color-validator';

export {
	validateDate,
	isLeapYear,
	getDaysInMonth,
	getMonthName,
	isValidDateFormat,
	getValidDateKeywords
} from './date-validator';

export {
	validatePriority,
	validateTag,
	validateAssignee,
	getValidPriorities,
	isValidPriority,
	isValidTag,
	isValidAssignee,
	getSuggestedPriorities,
	getCommonTagSuggestions
} from './pattern-validators';

// Type exports
import type { ValidationError } from '../../utils/validation';
export type { ValidationError };

// Validator registry for dynamic access
export const validatorRegistry = {
	color: validateColor,
	date: validateDate,
	priority: validatePriority,
	tag: validateTag,
	assignee: validateAssignee,
};

/**
 * Get validator for a specific pattern type
 */
export const getValidatorForPattern = (patternType: keyof typeof validatorRegistry) => {
	return validatorRegistry[patternType];
};

/**
 * Check if a validator exists for a pattern type
 */
export const hasValidatorForPattern = (patternType: string): patternType is keyof typeof validatorRegistry => {
	return patternType in validatorRegistry;
};

/**
 * Quick validation check for any pattern type
 */
export const quickValidate = (patternType: string, value: string): boolean => {
	switch (patternType) {
		case 'color':
			return isValidColor(value);
		case 'date':
			return isValidDateFormat(value);
		case 'priority':
			return isValidPriority(value);
		case 'tag':
			return isValidTag(value);
		case 'assignee':
			return isValidAssignee(value);
		default:
			return false;
	}
};