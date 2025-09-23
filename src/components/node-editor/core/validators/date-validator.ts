/**
 * Date Validator - Validation for date values
 */

import {
	getRelativeDateOptions,
	isValidDateString,
	parseDateString,
} from '../utils/date-utils';
import type {
	QuickFix,
	ValidationContext,
	ValidationError,
} from './validation-types';

/**
 * Validate date string format
 */
export function validateDate(
	dateStr: string,
	context?: ValidationContext
): ValidationError | null {
	if (!dateStr || dateStr.trim().length === 0) {
		return {
			type: 'error',
			message: 'Date value cannot be empty.',
			startIndex: context?.startIndex ?? 0,
			endIndex: context?.endIndex ?? 0,
			errorCode: 'DATE_EMPTY',
		};
	}

	if (isValidDateString(dateStr)) {
		return null;
	}

	const startIndex = context?.startIndex ?? 0;
	const endIndex = startIndex + dateStr.length;

	return {
		type: 'error',
		message: 'Invalid date format.',
		startIndex,
		endIndex,
		errorCode: 'DATE_INVALID',
		contextualHint: 'Use formats like: today, tomorrow, YYYY-MM-DD, MM/DD/YYYY',
		quickFixes: getDateQuickFixes(dateStr),
	};
}

/**
 * Validate date is in the future
 */
export function validateFutureDate(
	dateStr: string,
	context?: ValidationContext
): ValidationError | null {
	const baseError = validateDate(dateStr, context);
	if (baseError) return baseError;

	const date = parseDateString(dateStr);
	if (!date) {
		return {
			type: 'error',
			message: 'Could not parse date.',
			startIndex: context?.startIndex ?? 0,
			endIndex: context?.endIndex ?? dateStr.length,
			errorCode: 'DATE_PARSE_ERROR',
		};
	}

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	if (date < today) {
		return {
			type: 'warning',
			message: 'Date is in the past.',
			startIndex: context?.startIndex ?? 0,
			endIndex: context?.endIndex ?? dateStr.length,
			errorCode: 'DATE_IN_PAST',
			contextualHint:
				'Consider using a future date for deadlines and appointments',
			quickFixes: [
				{
					label: 'Use today',
					replacement: 'today',
					description: 'Set to today',
				},
				{
					label: 'Use tomorrow',
					replacement: 'tomorrow',
					description: 'Set to tomorrow',
				},
				{
					label: 'Use next week',
					replacement: 'next week',
					description: 'Set to next week',
				},
			],
		};
	}

	return null;
}

/**
 * Validate date is in the past
 */
export function validatePastDate(
	dateStr: string,
	context?: ValidationContext
): ValidationError | null {
	const baseError = validateDate(dateStr, context);
	if (baseError) return baseError;

	const date = parseDateString(dateStr);
	if (!date) {
		return {
			type: 'error',
			message: 'Could not parse date.',
			startIndex: context?.startIndex ?? 0,
			endIndex: context?.endIndex ?? dateStr.length,
			errorCode: 'DATE_PARSE_ERROR',
		};
	}

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	if (date > today) {
		return {
			type: 'warning',
			message: 'Date is in the future.',
			startIndex: context?.startIndex ?? 0,
			endIndex: context?.endIndex ?? dateStr.length,
			errorCode: 'DATE_IN_FUTURE',
			contextualHint: 'This field expects a past date',
			quickFixes: [
				{
					label: 'Use today',
					replacement: 'today',
					description: 'Set to today',
				},
				{
					label: 'Use yesterday',
					replacement: 'yesterday',
					description: 'Set to yesterday',
				},
			],
		};
	}

	return null;
}

/**
 * Validate date is within a range
 */
export function validateDateRange(
	dateStr: string,
	minDate?: Date | string,
	maxDate?: Date | string,
	context?: ValidationContext
): ValidationError | null {
	const baseError = validateDate(dateStr, context);
	if (baseError) return baseError;

	const date = parseDateString(dateStr);
	if (!date) {
		return {
			type: 'error',
			message: 'Could not parse date.',
			startIndex: context?.startIndex ?? 0,
			endIndex: context?.endIndex ?? dateStr.length,
			errorCode: 'DATE_PARSE_ERROR',
		};
	}

	const min = minDate
		? typeof minDate === 'string'
			? parseDateString(minDate)
			: minDate
		: null;
	const max = maxDate
		? typeof maxDate === 'string'
			? parseDateString(maxDate)
			: maxDate
		: null;

	if (min && date < min) {
		return {
			type: 'error',
			message: `Date must be after ${min.toLocaleDateString()}.`,
			startIndex: context?.startIndex ?? 0,
			endIndex: context?.endIndex ?? dateStr.length,
			errorCode: 'DATE_TOO_EARLY',
			quickFixes: [
				{
					label: 'Use minimum date',
					replacement: min.toISOString().split('T')[0],
					description: `Set to ${min.toLocaleDateString()}`,
				},
			],
		};
	}

	if (max && date > max) {
		return {
			type: 'error',
			message: `Date must be before ${max.toLocaleDateString()}.`,
			startIndex: context?.startIndex ?? 0,
			endIndex: context?.endIndex ?? dateStr.length,
			errorCode: 'DATE_TOO_LATE',
			quickFixes: [
				{
					label: 'Use maximum date',
					replacement: max.toISOString().split('T')[0],
					description: `Set to ${max.toLocaleDateString()}`,
				},
			],
		};
	}

	return null;
}

/**
 * Get quick fixes for invalid dates
 */
function getDateQuickFixes(value: string): QuickFix[] {
	const fixes: QuickFix[] = [];

	// Try to parse and fix common mistakes
	const trimmed = value.trim();

	// Check if it's close to a relative date
	const relatives = getRelativeDateOptions();
	const lower = trimmed.toLowerCase();

	for (const rel of relatives) {
		if (rel.includes(lower) || lower.includes(rel)) {
			fixes.push({
				label: `Use '${rel}'`,
				replacement: rel,
				description: `Change to relative date '${rel}'`,
			});
		}
	}

	// Add common date formats
	const today = new Date();
	fixes.push(
		{ label: 'Use today', replacement: 'today', description: 'Set to today' },
		{
			label: 'Use tomorrow',
			replacement: 'tomorrow',
			description: 'Set to tomorrow',
		},
		{
			label: 'Use ISO format',
			replacement: today.toISOString().split('T')[0],
			description: 'Use YYYY-MM-DD format',
		}
	);

	return fixes;
}

/**
 * Validate incomplete date patterns
 */
export function validateIncompleteDatePattern(
	text: string,
	context?: ValidationContext
): ValidationError | null {
	// Check for @ without a complete date
	const incompletePattern = /@(?!\w+)/;
	const match = text.match(incompletePattern);

	if (match && match.index !== undefined) {
		return {
			type: 'warning',
			message: 'Incomplete date pattern. Try @today, @tomorrow, or @YYYY-MM-DD',
			startIndex: context?.startIndex ?? match.index,
			endIndex: context?.endIndex ?? match.index + 1,
			errorCode: 'DATE_PATTERN_INCOMPLETE',
			suggestion: '@today',
			quickFixes: [
				{ label: '@today', replacement: '@today', description: 'Set to today' },
				{
					label: '@tomorrow',
					replacement: '@tomorrow',
					description: 'Set to tomorrow',
				},
				{
					label: '@monday',
					replacement: '@monday',
					description: 'Set to next Monday',
				},
			],
		};
	}

	return null;
}

/**
 * Create date validator with options
 */
export function createDateValidator(options?: {
	allowEmpty?: boolean;
	futureOnly?: boolean;
	pastOnly?: boolean;
	minDate?: Date | string;
	maxDate?: Date | string;
}) {
	return (value: string, context?: ValidationContext) => {
		if (options?.allowEmpty && !value) {
			return null;
		}

		if (options?.futureOnly) {
			return validateFutureDate(value, context);
		}

		if (options?.pastOnly) {
			return validatePastDate(value, context);
		}

		if (options?.minDate || options?.maxDate) {
			return validateDateRange(
				value,
				options.minDate,
				options.maxDate,
				context
			);
		}

		return validateDate(value, context);
	};
}
