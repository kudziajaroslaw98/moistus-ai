/**
 * Validation Types - Common types for validation system
 */

/**
 * Validation error severity levels
 */
export type ValidationSeverity = 'error' | 'warning' | 'info' | 'suggestion';

/**
 * Validation error structure
 */
export interface ValidationError {
	type: ValidationSeverity;
	message: string;
	startIndex?: number;
	endIndex?: number;
	position?: {
		start: number;
		end: number;
	};
	suggestion?: string;
	errorCode?: string;
	contextualHint?: string;
	quickFixes?: QuickFix[];
}

/**
 * Quick fix suggestion
 */
export interface QuickFix {
	label: string;
	replacement: string;
	description?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
	isValid: boolean;
	errors: ValidationError[];
	warnings?: ValidationError[];
	suggestions?: ValidationError[];
}

/**
 * Validator function type
 */
export type ValidatorFunction = (
	value: string,
	context?: ValidationContext
) => ValidationError | null;

/**
 * Async validator function type
 */
export type AsyncValidatorFunction = (
	value: string,
	context?: ValidationContext
) => Promise<ValidationError | null>;

/**
 * Validation context
 */
export interface ValidationContext {
	startIndex?: number;
	endIndex?: number;
	fullText?: string;
	nodeType?: string;
	metadata?: Record<string, any>;
}

/**
 * Validator configuration
 */
export interface ValidatorConfig {
	name: string;
	description?: string;
	validator: ValidatorFunction | AsyncValidatorFunction;
	isAsync?: boolean;
	enabled?: boolean;
	priority?: number;
}

/**
 * Pattern validator configuration
 */
export interface PatternValidator {
	pattern: RegExp;
	type: string;
	validator: (
		match: RegExpMatchArray,
		context?: ValidationContext
	) => ValidationError | null;
	enabled?: boolean;
}

/**
 * Validation rule
 */
export interface ValidationRule {
	id: string;
	name: string;
	description?: string;
	validators: ValidatorConfig[];
	enabled?: boolean;
	appliesTo?: string[];
}
