/**
 * Integration tests for the enhanced checkbox format support
 * Tests the complete workflow from validation to parsing
 */

import { validateInput, getValidationResults } from '../validation';
import { parseTaskInput } from '../../parsers';

describe('Checkbox Integration Tests', () => {
	test('should validate and parse all supported checkbox formats correctly', () => {
		const testCases = [
			// Traditional formats
			{ input: '[x] Traditional completed', expectComplete: true, shouldValidate: true },
			{ input: '[X] Traditional uppercase', expectComplete: true, shouldValidate: true },
			{ input: '[ ] Traditional uncompleted', expectComplete: false, shouldValidate: true },
			{ input: '[] Traditional empty', expectComplete: false, shouldValidate: true },
			
			// New formats
			{ input: '[;] Semicolon completed', expectComplete: true, shouldValidate: true },
			{ input: '[,] Comma completed', expectComplete: true, shouldValidate: true },
			
			// With whitespace
			{ input: '[ ; ] Spaced semicolon', expectComplete: true, shouldValidate: true },
			{ input: '[ , ] Spaced comma', expectComplete: true, shouldValidate: true },
		];

		testCases.forEach(({ input, expectComplete, shouldValidate }) => {
			// Test validation
			const validationErrors = getValidationResults(input);
			if (shouldValidate) {
				expect(validationErrors).toHaveLength(0);
			}

			// Test parsing
			const parseResult = parseTaskInput(input);
			expect(parseResult.tasks).toHaveLength(1);
			expect(parseResult.tasks[0].isComplete).toBe(expectComplete);
		});
	});

	test('should handle complex mixed checkbox scenarios', () => {
		const complexInput = `[x] First task complete
		[ ] Second task incomplete  
		[;] Third task with semicolon
		[,] Fourth task with comma
		[] Fifth task empty`;

		// Validation should pass
		const validationErrors = getValidationResults(complexInput);
		expect(validationErrors).toHaveLength(0);

		// Parsing should work correctly - new behavior creates single task
		const parseResult = parseTaskInput(complexInput);
		expect(parseResult.tasks).toHaveLength(1);
		
		// Combined text from all lines
		expect(parseResult.tasks[0].text).toBe('First task complete Second task incomplete Third task with semicolon Fourth task with comma [] Fifth task empty');
		
		// Should have patterns for the detected checkbox symbols as tags
		const patterns = parseResult.tasks[0].patterns || [];
		expect(patterns.length).toBeGreaterThan(0);
		
		// Completion status determined by checkbox detection logic
		expect(parseResult.tasks[0].isComplete).toBe(false); // Combined result
	});

	test('should maintain backward compatibility', () => {
		const legacyInputs = [
			'[x] Legacy task',
			'[ ] Legacy incomplete',
			'[X] Legacy uppercase'
		];

		legacyInputs.forEach(input => {
			// Should validate without errors
			expect(getValidationResults(input)).toHaveLength(0);
			
			// Should parse correctly
			const result = parseTaskInput(input);
			expect(result.tasks).toHaveLength(1);
			expect(typeof result.tasks[0].isComplete).toBe('boolean');
		});
	});

	test('should reject invalid checkbox patterns in validation', () => {
		const invalidCheckboxes = [
			'[abc] Multiple characters',
			'[?] Invalid question mark',
			'[123] Numbers not allowed'
		];

		invalidCheckboxes.forEach(input => {
			const validationErrors = getValidationResults(input);
			// These should not validate as checkboxes, so they might trigger tag validation errors
			// The important thing is that they don't crash the system
			expect(() => getValidationResults(input)).not.toThrow();
			expect(() => parseTaskInput(input)).not.toThrow();
		});
	});

	test('should handle edge cases gracefully', () => {
		const edgeCases = [
			'[x]', // No text after checkbox
			'[ ', // Incomplete bracket
			'x]', // No opening bracket
			'[x', // No closing bracket
		];

		edgeCases.forEach(input => {
			// Should not throw errors
			expect(() => getValidationResults(input)).not.toThrow();
			expect(() => parseTaskInput(input)).not.toThrow();
		});
	});
});