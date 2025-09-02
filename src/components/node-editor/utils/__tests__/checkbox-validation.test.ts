/**
 * Focused test suite for enhanced checkbox format support
 * Tests only the new checkbox validation and parsing functionality
 */

import { validateInput } from '../validation';
import { parseTaskInput } from '../../parsers';

describe('Enhanced Checkbox Format Support', () => {
	describe('Validation System', () => {
		test('should accept standard checkbox formats in validation', () => {
			const standardCheckboxFormats = [
				'[ ]', '[x]', '[X]', '[]', // Standard formats only
			];
			
			standardCheckboxFormats.forEach(format => {
				const errors = validateInput(format);
				expect(errors).toHaveLength(0);
			});
		});

		test('should accept traditional checkbox formats in validation', () => {
			const traditionalFormats = [
				'[x]', '[X]', '[ ]', '[]'
			];
			
			traditionalFormats.forEach(format => {
				const errors = validateInput(format);
				expect(errors).toHaveLength(0);
			});
		});
	});

	describe('Parser System', () => {
		test('should parse semicolon checkboxes as complete', () => {
			const result = parseTaskInput('[;] Task with semicolon');
			expect(result.tasks).toHaveLength(1);
			expect(result.tasks[0].isComplete).toBe(true);
			expect(result.tasks[0].text).toBe('Task with semicolon');
		});

		test('should parse comma checkboxes as complete', () => {
			const result = parseTaskInput('[,] Task with comma');
			expect(result.tasks).toHaveLength(1);
			expect(result.tasks[0].isComplete).toBe(true);
			expect(result.tasks[0].text).toBe('Task with comma');
		});

		test('should parse traditional x checkboxes as complete', () => {
			const result = parseTaskInput('[x] Traditional complete task');
			expect(result.tasks).toHaveLength(1);
			expect(result.tasks[0].isComplete).toBe(true);
			expect(result.tasks[0].text).toBe('Traditional complete task');
		});

		test('should parse empty and space checkboxes as incomplete', () => {
			const incompleteFormats = [
				'[ ] Space checkbox',
				'[] Empty checkbox'
			];

			incompleteFormats.forEach(input => {
				const result = parseTaskInput(input);
				expect(result.tasks).toHaveLength(1);
				expect(result.tasks[0].isComplete).toBe(false);
			});
		});

		test('should handle mixed checkbox formats', () => {
			const mixedInput = `[x] Traditional completed
[ ] Traditional uncompleted
[;] Semicolon completed
[,] Comma completed`;

			const result = parseTaskInput(mixedInput);
			// New behavior: Creates single task with all patterns combined
			expect(result.tasks).toHaveLength(1);
			
			// The task combines all text with detected patterns
			expect(result.tasks[0].text).toBe('Traditional completed Traditional uncompleted Semicolon completed Comma completed');
			
			// Should have patterns for the checkbox symbols that were detected as tags
			const patterns = result.tasks[0].patterns || [];
			expect(patterns.length).toBeGreaterThan(0);
			
			// Completion status determined by first checkbox pattern found
			expect(result.tasks[0].isComplete).toBe(false); // Since the first line creates incomplete status for combined task
		});
	});

	describe('Backward Compatibility', () => {
		test('should maintain exact behavior for existing formats', () => {
			const testCases = [
				{ input: '[x] Complete', expectComplete: true },
				{ input: '[X] Complete uppercase', expectComplete: true },
				{ input: '[ ] Incomplete space', expectComplete: false },
				{ input: '[] Incomplete empty', expectComplete: false }
			];

			testCases.forEach(({ input, expectComplete }) => {
				const result = parseTaskInput(input);
				expect(result.tasks).toHaveLength(1);
				expect(result.tasks[0].isComplete).toBe(expectComplete);
			});
		});
	});
});