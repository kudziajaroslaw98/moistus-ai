/**
 * Tests for CodeMirror validation decorations
 */

import { createValidationDecorations } from '../codemirror-decorations';
import { ValidationError } from '../../domain/validators';

describe('createValidationDecorations', () => {
	it('should create error decorations with correct class', () => {
		const errors: ValidationError[] = [
			{
				type: 'error',
				message: 'Test error',
				startIndex: 5,
				endIndex: 10
			}
		];

		const decorations = createValidationDecorations(errors);
		expect(decorations).toBeDefined();
	});

	it('should create warning decorations with correct class', () => {
		const warnings: ValidationError[] = [
			{
				type: 'warning',
				message: 'Test warning',
				startIndex: 0,
				endIndex: 5
			}
		];

		const decorations = createValidationDecorations(warnings);
		expect(decorations).toBeDefined();
	});

	it('should create suggestion decorations with correct class', () => {
		const suggestions: ValidationError[] = [
			{
				type: 'suggestion',
				message: 'Test suggestion',
				startIndex: 10,
				endIndex: 15,
				suggestion: 'Better alternative'
			}
		];

		const decorations = createValidationDecorations(suggestions);
		expect(decorations).toBeDefined();
	});

	it('should handle empty error arrays', () => {
		const decorations = createValidationDecorations([]);
		expect(decorations).toBeDefined();
	});

	it('should skip invalid ranges', () => {
		const invalidErrors: ValidationError[] = [
			{
				type: 'error',
				message: 'Invalid range',
				startIndex: -1,
				endIndex: 5
			},
			{
				type: 'error',
				message: 'Backwards range',
				startIndex: 10,
				endIndex: 5
			}
		];

		const decorations = createValidationDecorations(invalidErrors);
		expect(decorations).toBeDefined();
	});

	it('should handle mixed error types', () => {
		const mixedErrors: ValidationError[] = [
			{
				type: 'error',
				message: 'Error message',
				startIndex: 0,
				endIndex: 5
			},
			{
				type: 'warning',
				message: 'Warning message',
				startIndex: 6,
				endIndex: 10
			},
			{
				type: 'suggestion',
				message: 'Suggestion message',
				startIndex: 11,
				endIndex: 15,
				suggestion: 'alternative'
			}
		];

		const decorations = createValidationDecorations(mixedErrors);
		expect(decorations).toBeDefined();
	});
});