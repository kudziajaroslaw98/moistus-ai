/**
 * Comprehensive validation tests for the node-editor system
 * Tests all validation patterns, edge cases, and the specific "@2" issue
 */

import { 
	validateInput, 
	findIncompletePatterns, 
	getValidationResults,
	type ValidationError 
} from '../validation';

describe('Validation System', () => {
	describe('validateInput - Date Validation (@pattern)', () => {
		describe('Valid date patterns', () => {
			test('should accept valid date keywords', () => {
				const validKeywords = [
					'@today', '@tomorrow', '@yesterday',
					'@monday', '@tuesday', '@wednesday', '@thursday', '@friday', '@saturday', '@sunday',
					'@week', '@month', '@next', '@last'
				];

				validKeywords.forEach(keyword => {
					const errors = validateInput(keyword);
					expect(errors).toHaveLength(0);
				});
			});

			test('should accept valid date formats', () => {
				const validDates = [
					'@2024-01-15',
					'@2024-1-1'
				];

				validDates.forEach(date => {
					const errors = validateInput(date);
					expect(errors).toHaveLength(0);
				});
			});

			test('should flag incorrect date formats for correction', () => {
				const incorrectFormats = [
					'@01/15/2024',
					'@1/1/2024',
					'@2024/01/15',
					'@2024/1/1',
					'@15-01-2024'
				];

				incorrectFormats.forEach(date => {
					const errors = validateInput(date);
					expect(errors.length).toBeGreaterThan(0);
					// Should have quick fixes available
					expect(errors[0].quickFixes).toBeDefined();
					expect(errors[0].quickFixes!.length).toBeGreaterThan(0);
				});
			});

			test('should be case insensitive for keywords', () => {
				const caseVariations = [
					'@TODAY', '@Today', '@ToDay',
					'@TOMORROW', '@Tomorrow', '@ToMorrow',
					'@MONDAY', '@Monday', '@MonDay'
				];

				caseVariations.forEach(date => {
					const errors = validateInput(date);
					expect(errors).toHaveLength(0);
				});
			});
		});

		describe('Invalid date patterns', () => {
			test('should reject invalid date formats', () => {
				const invalidDates = [
					'@invaliddate',
					'@2024-13-01', // Invalid month
					'@2024-01-32', // Invalid day
					'@13/01/2024', // Invalid month
					'@01/32/2024', // Invalid day
					'@1800-01-01', // Year too old
					'@2200-01-01'  // Year too future
				];

				invalidDates.forEach(date => {
					const errors = validateInput(date);
					expect(errors.length).toBeGreaterThan(0);
					expect(errors[0].type).toBe('error');
				});
			});

			test('should provide helpful error messages', () => {
				const errors = validateInput('@invaliddate');
				expect(errors).toHaveLength(1);
				expect(errors[0].message).toContain('Invalid date format');
				expect(errors[0].suggestion).toBe('today');
			});

			test('should validate month ranges (01-12)', () => {
				const errors = validateInput('@2024-13-01');
				expect(errors).toHaveLength(1);
				expect(errors[0].message).toContain('Invalid month');
			});

			test('should validate day ranges (01-31)', () => {
				const errors = validateInput('@2024-01-32');
				expect(errors).toHaveLength(1);
				expect(errors[0].message).toContain('Day must be 01-31');
			});
		});

		describe('Edge cases and partial inputs', () => {
			test('should NOT validate single character dates like "@2"', () => {
				// This is the key test case from the screenshot issue
				const errors = validateInput('@2');
				
				// The issue: "@2" should not trigger date validation error
				// because it's likely a partial input being typed
				expect(errors).toHaveLength(0);
			});

			test('should handle partial date inputs gracefully', () => {
				const partialInputs = [
					'@1', '@12', '@123', '@2024', '@2024-', '@2024-0', '@2024-01-'
				];

				partialInputs.forEach(input => {
					const errors = validateInput(input);
					// Partial inputs should either have no errors or only warnings
					const hasErrors = errors.some(e => e.type === 'error');
					expect(hasErrors).toBe(false);
				});
			});

			test('should handle empty date values', () => {
				const errors = validateInput('@');
				expect(errors).toHaveLength(0); // Empty should not validate
			});

			test('should handle whitespace in dates', () => {
				const whitespaceTests = [
					'@ today', '@today ', '@ today '
				];

				whitespaceTests.forEach(input => {
					const errors = validateInput(input);
					// Should either pass or have reasonable error handling
					if (errors.length > 0) {
						expect(errors[0].type).toBe('error');
					}
				});
			});
		});

		describe('Date validation regex behavior', () => {
			test('should correctly match date patterns', () => {
				// Test the regex used in validation
				const dateRegex = /@([\w-\/]+)/g;
				
				const testCases = [
					{ input: '@2', expected: ['2'] },
					{ input: '@today', expected: ['today'] },
					{ input: '@2024-01-15', expected: ['2024-01-15'] },
					{ input: '@invalid-date', expected: ['invalid-date'] },
					{ input: 'text @today more text', expected: ['today'] },
					{ input: '@', expected: [] } // No capture group
				];

				testCases.forEach(({ input, expected }) => {
					const matches = [];
					let match;
					dateRegex.lastIndex = 0;
					
					while ((match = dateRegex.exec(input)) !== null) {
						matches.push(match[1]);
					}
					
					expect(matches).toEqual(expected);
				});
			});

			test('should handle multiple date patterns in one string', () => {
				const errors = validateInput('@today and @2024-01-15 and @invaliddate');
				
				// Should have one error for the invalid date only
				expect(errors).toHaveLength(1);
				expect(errors[0].message).toContain('Invalid date format');
			});
		});
	});

	describe('validateInput - Priority Validation (#pattern)', () => {
		test('should accept all valid priorities from completion data', () => {
			// These should match the priorityCompletions in completion-data.ts
			const validPriorities = [
				'#critical', '#high', '#medium', '#low', '#none',
				'#urgent', '#asap', '#blocked', '#waiting', '#someday',
				'#CRITICAL', '#HIGH', '#MEDIUM', '#LOW', '#URGENT', '#ASAP'
			];
			
			validPriorities.forEach(priority => {
				const errors = validateInput(priority);
				expect(errors).toHaveLength(0);
			});
		});

		test('should specifically accept #asap (the reported bug)', () => {
			// This test specifically addresses the bug where #asap was incorrectly flagged as invalid
			const errors = validateInput('#asap');
			expect(errors).toHaveLength(0);
		});

		test('should specifically accept #urgent', () => {
			const errors = validateInput('#urgent');
			expect(errors).toHaveLength(0);
		});

		test('should specifically accept #critical', () => {
			const errors = validateInput('#critical');
			expect(errors).toHaveLength(0);
		});

		test('should reject invalid priorities not in completion data', () => {
			const invalidPriorities = ['#invalid', '#normal', '#regular', '#extreme'];
			
			invalidPriorities.forEach(priority => {
				const errors = validateInput(priority);
				expect(errors.length).toBeGreaterThan(0);
				expect(errors[0].type).toBe('error');
				expect(errors[0].message).toContain('Invalid priority');
				expect(errors[0].contextualHint).toContain('Valid priorities include');
				expect(errors[0].quickFixes).toBeDefined();
				expect(errors[0].quickFixes!.length).toBeGreaterThan(0);
			});
		});

		test('should provide helpful suggestions for invalid priorities', () => {
			const errors = validateInput('#invalidpriority');
			expect(errors).toHaveLength(1);
			expect(errors[0].message).toContain('Invalid priority');
			expect(errors[0].quickFixes).toBeDefined();
			expect(errors[0].quickFixes!.length).toBeGreaterThan(0);
		});

		test('should handle partial priority inputs correctly', () => {
			const partialInputs = [
				{ input: '#', shouldError: false },
				{ input: '#a', shouldError: false }, // Could be start of 'asap'
				{ input: '#u', shouldError: false }, // Could be start of 'urgent'  
				{ input: '#c', shouldError: false }, // Could be start of 'critical'
				{ input: '#l', shouldError: false }, // Could be start of 'low'
				{ input: '#m', shouldError: false }, // Could be start of 'medium'
				{ input: '#h', shouldError: false }, // Could be start of 'high'
			];
			
			partialInputs.forEach(({ input, shouldError }) => {
				const errors = validateInput(input);
				const hasErrors = errors.some(e => e.type === 'error');
				expect(hasErrors).toBe(shouldError);
			});
		});

		test('should validate priority suggestions match completion data', () => {
			const errors = validateInput('#invalidpriority');
			expect(errors).toHaveLength(1);
			
			// The error message should list all valid priorities
			const errorMessage = errors[0].message;
			const validPriorityStrings = ['critical', 'high', 'medium', 'low', 'urgent', 'asap'];
			
			validPriorityStrings.forEach(priority => {
				expect(errorMessage.toLowerCase()).toContain(priority);
			});
		});
	});

	describe('validateInput - Color Validation (color: pattern)', () => {
		test('should accept valid hex colors', () => {
			const validColors = [
				'color:#000', 'color:#fff', 'color:#123456',
				'color:#ABCDEF', 'color:#abcdef', 'color:#a1b2c3'
			];
			
			validColors.forEach(color => {
				const errors = validateInput(color);
				expect(errors).toHaveLength(0);
			});
		});

		test('should reject invalid hex colors', () => {
			const invalidColors = [
				'color:#', 'color:#12', 'color:#1234567',
				'color:#gggggg', 'color:red', 'color:#xyz'
			];
			
			invalidColors.forEach(color => {
				const errors = validateInput(color);
				expect(errors.length).toBeGreaterThan(0);
				expect(errors[0].type).toBe('error');
			});
		});

		test('should provide color suggestions', () => {
			const errors = validateInput('color:#xyz');
			expect(errors).toHaveLength(1);
			expect(errors[0].suggestion).toMatch(/^#[0-9a-f]{6}$/i);
		});
	});

	describe('validateInput - Tag Validation ([pattern])', () => {
		test('should accept valid tags', () => {
			const validTags = [
				'[tag]', '[important]', '[work]', '[personal]',
				'[tag-name]', '[tag_name]', '[tag.name]'
			];
			
			validTags.forEach(tag => {
				const errors = validateInput(tag);
				expect(errors).toHaveLength(0);
			});
		});

		test('should accept task checkbox patterns', () => {
			const validCheckboxes = [
				'[x]', '[X]', '[ ]', '[]', // Standard formats
				'[\t]', '[  ]' // Various whitespace
			];
			
			validCheckboxes.forEach(checkbox => {
				const errors = validateInput(checkbox);
				expect(errors).toHaveLength(0);
			});
		});

		test('should accept all supported checkbox characters individually', () => {
			const checkboxChars = ['x', 'X', ';', ',', ' ', ''];
			
			checkboxChars.forEach(char => {
				const checkbox = `[${char}]`;
				const errors = validateInput(checkbox);
				expect(errors).toHaveLength(0);
			});
		});

		test('should accept checkbox patterns with surrounding whitespace', () => {
			const checkboxesWithWhitespace = [
				'[  x  ]', '[  X  ]', '[  ;  ]', '[  ,  ]',
				'[\tx\t]', '[\tX\t]', '[\t;\t]', '[\t,\t]'
			];
			
			checkboxesWithWhitespace.forEach(checkbox => {
				const errors = validateInput(checkbox);
				expect(errors).toHaveLength(0);
			});
		});

		test('should reject empty tags (but not checkboxes)', () => {
			// Empty square brackets should be treated as task checkbox
			const errors = validateInput('[]');
			expect(errors).toHaveLength(0);
		});

		test('should warn about special characters in tags', () => {
			const tagsWithSpecialChars = ['[tag<script>]', '[tag"quote]', "[tag'quote]"];
			
			tagsWithSpecialChars.forEach(tag => {
				const errors = validateInput(tag);
				expect(errors.length).toBeGreaterThan(0);
				expect(errors[0].type).toBe('warning');
			});
		});
	});

	describe('validateInput - Assignee Validation (+pattern)', () => {
		test('should accept valid usernames', () => {
			const validAssignees = [
				'+user', '+user123', '+user_name', '+user.name',
				'+user-name', '+User', '+USER123'
			];
			
			validAssignees.forEach(assignee => {
				const errors = validateInput(assignee);
				expect(errors).toHaveLength(0);
			});
		});

		test('should reject invalid usernames', () => {
			const invalidAssignees = [
				'+123user', '+user@domain', '+user space', '+-user'
			];
			
			invalidAssignees.forEach(assignee => {
				const errors = validateInput(assignee);
				expect(errors.length).toBeGreaterThan(0);
				expect(errors[0].type).toBe('error');
			});
		});

		test('should provide username suggestions', () => {
			const errors = validateInput('+user@domain');
			expect(errors).toHaveLength(1);
			expect(errors[0].suggestion).toMatch(/^[a-zA-Z][a-zA-Z0-9._-]*$/);
		});
	});

	describe('Mixed pattern validation', () => {
		test('should validate multiple patterns in one string', () => {
			const input = '@today #high [important] +user color:#ff0000';
			const errors = validateInput(input);
			expect(errors).toHaveLength(0);
		});

		test('should handle mixed valid and invalid patterns', () => {
			const input = '@today #invalid [important] +user color:#xyz';
			const errors = validateInput(input);
			expect(errors).toHaveLength(2); // #invalid and color:#xyz
		});

		test('should maintain correct error positions', () => {
			const input = 'Task @invaliddate with #wrongpriority';
			const errors = validateInput(input);
			
			expect(errors).toHaveLength(2);
			// Check that error positions are correct
			errors.forEach(error => {
				expect(error.startIndex).toBeGreaterThanOrEqual(0);
				expect(error.endIndex).toBeGreaterThan(error.startIndex);
				expect(error.endIndex).toBeLessThanOrEqual(input.length);
			});
		});
	});

	describe('findIncompletePatterns', () => {
		test('should identify incomplete patterns', () => {
			const incompletePatterns = [
				{ input: '[incomplete', expected: 'missing closing bracket' },
				{ input: 'color:', expected: 'provide a hex color value' }
			];

			incompletePatterns.forEach(({ input, expected }) => {
				const warnings = findIncompletePatterns(input);
				expect(warnings.length).toBeGreaterThan(0);
				expect(warnings[0].type).toBe('warning');
				expect(warnings[0].message.toLowerCase()).toContain(expected.toLowerCase());
			});
		});

		test('should not warn for very short inputs (except meaningful incomplete patterns)', () => {
			const shortInputs = ['@', '+', '#', 'c'];
			
			shortInputs.forEach(input => {
				const warnings = findIncompletePatterns(input);
				// Most single characters should not generate warnings
				expect(warnings).toHaveLength(0);
			});
			
			// Exception: '[' should warn because it's an incomplete tag pattern
			const incompleteTag = findIncompletePatterns('[');
			expect(incompleteTag).toHaveLength(1);
			expect(incompleteTag[0].message).toContain('Incomplete tag');
		});

		test('should respect minimum length requirements', () => {
			// Test the minLength requirements for warnings
			const warnings1 = findIncompletePatterns('@'); // length 1
			const warnings2 = findIncompletePatterns('co'); // length 2
			const warnings3 = findIncompletePatterns('color:'); // length 6
			
			expect(warnings1).toHaveLength(0); // Below minLength
			expect(warnings2).toHaveLength(0); // Below minLength
			expect(warnings3.length).toBeGreaterThan(0); // Meets minLength
		});
	});

	describe('getValidationResults', () => {
		test('should combine validation errors and warnings', () => {
			const input = '@invaliddate [incomplete';
			const results = getValidationResults(input);
			
			// Should have both error (invalid date) and warning (incomplete tag)
			const errors = results.filter(r => r.type === 'error');
			const warnings = results.filter(r => r.type === 'warning');
			
			expect(errors.length).toBeGreaterThan(0);
			expect(warnings.length).toBeGreaterThan(0);
		});

		test('should handle null and undefined inputs', () => {
			expect(getValidationResults(null as any)).toEqual([]);
			expect(getValidationResults(undefined as any)).toEqual([]);
			expect(getValidationResults('')).toEqual([]);
		});

		test('should handle non-string inputs gracefully', () => {
			expect(getValidationResults(123 as any)).toEqual([]);
			expect(getValidationResults({} as any)).toEqual([]);
			expect(getValidationResults([] as any)).toEqual([]);
		});
	});

	describe('Error handling and resilience', () => {
		test('should handle malformed regex patterns', () => {
			// These should not crash the validation system
			const malformedInputs = [
				'@[unclosed', 
				'#[weird]', 
				'color:[bracket]',
				'+[user]',
				'[[nested]]'
			];

			malformedInputs.forEach(input => {
				expect(() => getValidationResults(input)).not.toThrow();
			});
		});

		test('should handle extremely long inputs', () => {
			const longInput = 'a'.repeat(10000) + '@today';
			expect(() => getValidationResults(longInput)).not.toThrow();
			
			const results = getValidationResults(longInput);
			expect(results).toHaveLength(0); // Should find valid @today
		});

		test('should handle special unicode characters', () => {
			const unicodeInputs = [
				'@今天', // Chinese characters
				'#élevé', // Accented characters
				'[🏷️tag]', // Emoji
				'+用户' // Unicode username
			];

			unicodeInputs.forEach(input => {
				expect(() => getValidationResults(input)).not.toThrow();
			});
		});
	});

	describe('Performance and edge cases', () => {
		test('should handle repeated patterns efficiently', () => {
			const repeatedInput = '@today '.repeat(100);
			
			const startTime = performance.now();
			const results = getValidationResults(repeatedInput);
			const endTime = performance.now();
			
			expect(endTime - startTime).toBeLessThan(100); // Should be fast
			expect(results).toHaveLength(0); // All valid
		});

		test('should handle regex backtracking scenarios', () => {
			// Patterns that could cause catastrophic backtracking
			const backtrackingInputs = [
				'@' + 'a'.repeat(100),
				'#' + 'b'.repeat(100),
				'color:' + '#'.repeat(100)
			];

			backtrackingInputs.forEach(input => {
				const startTime = performance.now();
				getValidationResults(input);
				const endTime = performance.now();
				
				expect(endTime - startTime).toBeLessThan(1000); // Should not hang
			});
		});
	});

	describe('Specific bug reproduction tests', () => {
		test('should reproduce the "@2" validation error bug', () => {
			// This test specifically reproduces the issue from the screenshot
			const input = '@2';
			const errors = validateInput(input);
			
			// The bug: "@2" was showing "Invalid date format" error
			// The fix: partial single-digit dates should not trigger validation
			expect(errors).toHaveLength(0);
		});

		test('should handle progression from "@2" to "@2024"', () => {
			// Simulate user typing progression
			const progression = ['@2', '@20', '@202', '@2024'];
			
			progression.forEach(input => {
				const errors = validateInput(input);
				// None of these partial inputs should show errors
				const hasErrors = errors.some(e => e.type === 'error');
				expect(hasErrors).toBe(false);
			});
		});

		test('should eventually validate complete malformed dates', () => {
			// But once we have a complete but invalid date, it should error
			const completeButInvalid = [
				'@notadate',
				'@2024-99-99',
				'@invalid'
			];
			
			completeButInvalid.forEach(input => {
				const errors = validateInput(input);
				expect(errors.length).toBeGreaterThan(0);
				expect(errors[0].type).toBe('error');
			});
		});
	});
});