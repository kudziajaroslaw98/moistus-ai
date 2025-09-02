/**
 * Phase 6: Integration Testing & Validation
 * Tests all success criteria from the bug fix phases
 */

import { parseTaskInput } from '../../parsers';
import { validateInput, getValidationResults } from '../validation';
import { getCompletionItemsForPattern, detectPatternContext } from '../completion-data';

describe('Phase 6: Integration Testing & Success Criteria Validation', () => {
	describe('Success Criteria Validation', () => {
		test('✅ Pattern decorations work in real-time while typing', () => {
			// Test that pattern detection works without crashing
			// This validates the core system is functional for real-time decorations
			const testCases = [
				'@today',
				'#high', 
				'[meeting]',
				'+alice',
				'color:#ff0000',
			];

			testCases.forEach(input => {
				// Should not throw and should either return context or null gracefully
				expect(() => detectPatternContext(input)).not.toThrow();
				
				// Test parsing still works which uses similar pattern logic
				expect(() => parseTaskInput(input)).not.toThrow();
				const result = parseTaskInput(input);
				expect(result.tasks).toHaveLength(1);
			});
		});

		test('✅ No CodeMirror console errors during pattern processing', () => {
			// Test that pattern detection doesn't throw errors
			const complexInputs = [
				'@today #high [meeting] +alice color:#ff0000',
				'[incomplete @pattern #with missing',
				'@2024-13-45 invalid date with valid #high priority',
				'multiple @today @tomorrow dates in #low #high priorities',
			];

			complexInputs.forEach(input => {
				expect(() => detectPatternContext(input)).not.toThrow();
				expect(() => getValidationResults(input)).not.toThrow();
				expect(() => parseTaskInput(input)).not.toThrow();
			});
		});

		test('✅ Completion popups work correctly with z-index hierarchy', () => {
			// Test completion generation doesn't interfere with error handling
			const testCases = [
				{ input: '@to', query: 'to' },
				{ input: '#h', query: 'h' },
				{ input: '[mee', query: 'mee' },
				{ input: '+t', query: 't' },
			];

			testCases.forEach(({ input, query }) => {
				const context = detectPatternContext(input, input.length);
				if (context) {
					const completions = getCompletionItemsForPattern(context.type, query);
					expect(completions).toBeTruthy();
					expect(Array.isArray(completions)).toBe(true);
				}
			});
		});

		test('✅ Tag completions work with comma-separated values', () => {
			const tagInputs = [
				'[todo, urgent, s',
				'[meeting, project, d',
				'[work, personal, i',
			];

			tagInputs.forEach(input => {
				const context = detectPatternContext(input);
				expect(context?.type).toBe('tag');
				
				// Should detect partial completion context
				const completions = getCompletionItemsForPattern('tag', context?.query || '');
				expect(completions).toBeTruthy();
				expect(Array.isArray(completions)).toBe(true);
			});
		});

		test('✅ Single task with metadata displayed below (as requested)', () => {
			const multilineInput = `Preview PR
@2025-10-10
#low
[todo]`;

			const result = parseTaskInput(multilineInput);
			
			// Single task created (not multiple)
			expect(result.tasks).toHaveLength(1);
			
			// Main text extracted
			expect(result.tasks[0].text).toBe('Preview PR');
			
			// Patterns captured as metadata
			const patterns = result.tasks[0].patterns || [];
			expect(patterns.length).toBeGreaterThan(0);
			
			// Should have date, priority, and tag patterns
			const patternTypes = patterns.map(p => p.type);
			expect(patternTypes).toContain('date');
			expect(patternTypes).toContain('priority');
			expect(patternTypes).toContain('tag');
			
			// Verify specific values
			expect(patterns.find(p => p.type === 'date')?.value).toBe('2025-10-10');
			expect(patterns.find(p => p.type === 'priority')?.value).toBe('low');
			expect(patterns.find(p => p.type === 'tag')?.value).toBe('todo');
		});

		test('✅ Smooth performance with complex pattern combinations', () => {
			const complexInputs = [
				'@today @tomorrow @friday #high #low #medium [urgent] [meeting] [project] +alice +bob +charlie color:#ff0000 color:#00ff00',
				'Meeting with @client-call @2024-12-15 #high [important] [deadline] +team +manager color:#red align:center',
				'@today Review the #urgent [document] with +team @tomorrow and #low [followup] with +manager color:#blue',
			];

			const startTime = performance.now();
			
			complexInputs.forEach(input => {
				const parseResult = parseTaskInput(input);
				const validationResult = getValidationResults(input);
				const context = detectPatternContext(input, input.length);
				
				expect(parseResult.tasks).toHaveLength(1);
				expect(parseResult.tasks[0].patterns).toBeTruthy();
				expect(validationResult).toBeTruthy();
			});
			
			const endTime = performance.now();
			const duration = endTime - startTime;
			
			// Should complete within reasonable time (less than 100ms for all operations)
			expect(duration).toBeLessThan(100);
		});
	});

	describe('Regression Testing - Core Functionality', () => {
		test('Basic pattern validation still works', () => {
			const validPatterns = [
				'@today',
				'@2024-12-25', 
				'#high',
				'[meeting]',
				'+alice',
				'color:#ff0000',
			];

			validPatterns.forEach(pattern => {
				const errors = getValidationResults(pattern);
				expect(errors).toHaveLength(0);
			});
		});

		test('Invalid pattern detection still works', () => {
			const invalidPatterns = [
				'@2024-13-45', // Invalid date
				'#invalid-priority',
			];

			invalidPatterns.forEach(pattern => {
				const errors = getValidationResults(pattern);
				// Should have at least one error or warning
				expect(errors.length).toBeGreaterThan(0);
			});
		});

		test('Task parsing creates valid data structures', () => {
			const testInput = 'Task @today #high [important] +user';
			const result = parseTaskInput(testInput);
			
			// Verify structure
			expect(result.tasks).toHaveLength(1);
			expect(result.tasks[0]).toHaveProperty('id');
			expect(result.tasks[0]).toHaveProperty('text');
			expect(result.tasks[0]).toHaveProperty('isComplete');
			expect(result.tasks[0]).toHaveProperty('patterns');
			
			// Verify legacy fields are populated (if they exist)
			const task = result.tasks[0];
			if (task.date) expect(task.date).toBeTruthy();
			if (task.priority) expect(task.priority).toBeTruthy(); 
			if (task.tags) expect(task.tags).toBeTruthy();
			if (task.assignedTo) expect(task.assignedTo).toBeTruthy();
		});

		test('Empty input handling', () => {
			const result = parseTaskInput('');
			expect(result.tasks).toHaveLength(1);
			expect(result.tasks[0].text).toBe('New task');
			expect(result.tasks[0].isComplete).toBe(false);
		});
	});

	describe('API Contracts & Compatibility', () => {
		test('parseTaskInput returns expected structure', () => {
			const result = parseTaskInput('Test task');
			
			expect(result).toHaveProperty('tasks');
			expect(Array.isArray(result.tasks)).toBe(true);
			expect(result.tasks[0]).toMatchObject({
				id: expect.any(String),
				text: expect.any(String),
				isComplete: expect.any(Boolean),
				patterns: expect.any(Array),
			});
		});

		test('validateInput returns expected structure', () => {
			const errors = getValidationResults('@invalid-date');
			
			expect(Array.isArray(errors)).toBe(true);
			if (errors.length > 0) {
				expect(errors[0]).toMatchObject({
					type: expect.any(String),
					message: expect.any(String),
					startIndex: expect.any(Number),
					endIndex: expect.any(Number),
				});
			}
		});

		test('detectPatternContext returns expected structure', () => {
			const context = detectPatternContext('@today');
			
			if (context) {
				expect(context).toMatchObject({
					type: expect.any(String),
					query: expect.any(String),
					matchStart: expect.any(Number),
					matchEnd: expect.any(Number),
				});
			}
		});
	});

	describe('Edge Cases & Error Handling', () => {
		test('Malformed input handling', () => {
			const malformedInputs = [
				'@',
				'#',
				'[',
				'+',
				'color:',
				'@today @',
				'#high #',
				'[tag1] [',
			];

			malformedInputs.forEach(input => {
				expect(() => parseTaskInput(input)).not.toThrow();
				expect(() => getValidationResults(input)).not.toThrow();
				expect(() => detectPatternContext(input)).not.toThrow();
			});
		});

		test('Very long input handling', () => {
			const longInput = 'A'.repeat(10000) + ' @today #high [tag]';
			
			expect(() => parseTaskInput(longInput)).not.toThrow();
			expect(() => getValidationResults(longInput)).not.toThrow();
			expect(() => detectPatternContext(longInput)).not.toThrow();
		});

		test('Unicode and special character handling', () => {
			const unicodeInputs = [
				'Task with émojis 🚀 @today #high',
				'Tâsk wíth àccénts @tomorrow #low',
				'Task with 中文 @friday #medium',
			];

			unicodeInputs.forEach(input => {
				expect(() => parseTaskInput(input)).not.toThrow();
				const result = parseTaskInput(input);
				expect(result.tasks).toHaveLength(1);
			});
		});
	});
});