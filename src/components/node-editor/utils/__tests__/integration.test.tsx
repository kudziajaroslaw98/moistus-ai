/**
 * Integration tests for the complete node-editor system
 * Tests the interaction between validation, enhanced input, and tooltip components
 * Focuses on real-world scenarios and regression testing (especially the @2 bug)
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Import the actual validation functions to test them properly
import { validateInput, getValidationResults } from '../../domain/validators';

// Import test fixtures
import testFixtures, { regressionTests, userWorkflows, realWorldInputs } from './test-fixtures';

describe('Node Editor Integration Tests', () => {
	// Test the actual validation logic with real scenarios
	describe('Real Validation Logic', () => {
		test('reproduces the "@2" bug scenario', () => {
			// This is the critical test case from the screenshot
			const input = '@2';
			const errors = validateInput(input);
			
			// The bug was that "@2" was showing "Invalid date format" error
			// The fix: partial inputs like "@2" should not trigger validation errors
			expect(errors).toHaveLength(0);
		});

		test('handles progressive date typing without errors', () => {
			const progression = ['@', '@2', '@20', '@202', '@2024', '@2024-', '@2024-0', '@2024-01'];
			
			progression.forEach((input, index) => {
				const errors = validateInput(input);
				// None of these partial inputs should generate errors
				const errorMessages = errors.map(e => e.message);
				expect(errors).toHaveLength(0);
			});
		});

		test('eventually validates complete but invalid dates', () => {
			const completeInvalidDates = [
				'@invaliddate',
				'@2024-13-01', // Invalid month
				'@2024-01-32'  // Invalid day
			];
			
			completeInvalidDates.forEach(input => {
				const errors = validateInput(input);
				expect(errors.length).toBeGreaterThan(0);
				expect(errors[0].type).toBe('error');
			});
		});

		test('validates mixed patterns correctly', () => {
			const mixedValid = '@today #high [important] +user color:#ff0000';
			const errors = validateInput(mixedValid);
			expect(errors).toHaveLength(0);
			
			const mixedInvalid = '@invaliddate #wrong [tag<script>] +123user color:#xyz';
			const errorsMixed = validateInput(mixedInvalid);
			expect(errorsMixed.length).toBeGreaterThan(0);
		});

		test('handles real-world user input patterns', () => {
			testFixtures.realWorldInputs.taskCreation.forEach(input => {
				expect(() => validateInput(input)).not.toThrow();
			});
		});

		test('processes edge cases without crashing', () => {
			testFixtures.realWorldInputs.edgeCases.forEach(input => {
				expect(() => getValidationResults(input)).not.toThrow();
			});
		});
	});

	describe('Progressive Typing Scenarios', () => {
		test('simulates user typing complete date progressively', () => {
			const finalDate = '@2024-01-15';
			const progression = [];
			
			// Build progression step by step
			for (let i = 1; i <= finalDate.length; i++) {
				progression.push(finalDate.substring(0, i));
			}
			
			// Track when errors start appearing
			const errorStates = progression.map(input => ({
				input,
				errors: validateInput(input),
				hasErrors: validateInput(input).some(e => e.type === 'error')
			}));
			
			// Early stages should not have errors
			expect(errorStates[0].hasErrors).toBe(false); // '@'
			expect(errorStates[1].hasErrors).toBe(false); // '@2'
			expect(errorStates[2].hasErrors).toBe(false); // '@20'
			expect(errorStates[3].hasErrors).toBe(false); // '@202'
			expect(errorStates[4].hasErrors).toBe(false); // '@2024'
			
			// Final complete date should not have errors
			const finalState = errorStates[errorStates.length - 1];
			expect(finalState.hasErrors).toBe(false);
			expect(finalState.input).toBe('@2024-01-15');
		});

		test('handles rapid typing without performance issues', () => {
			const startTime = performance.now();
			
			// Simulate rapid typing of 100 characters
			for (let i = 0; i < 100; i++) {
				const input = '@2024-01-15'.repeat(i);
				validateInput(input);
			}
			
			const endTime = performance.now();
			const executionTime = endTime - startTime;
			
			// Should complete within reasonable time
			expect(executionTime).toBeLessThan(1000); // 1 second max
		});
	});

	describe('User Workflow Simulations', () => {
		test('simulates new user learning workflow', () => {
			const workflow = userWorkflows.newUserLearning;
			
			workflow.forEach((input, stepIndex) => {
				const errors = validateInput(input);
				
				// Early steps should not have many errors
				if (stepIndex < 5) {
					const errorCount = errors.filter(e => e.type === 'error').length;
					expect(errorCount).toBeLessThanOrEqual(1);
				}
				
				// Final step should have no errors (complete valid task)
				if (stepIndex === workflow.length - 1) {
					expect(errors.filter(e => e.type === 'error')).toHaveLength(0);
				}
			});
		});

		test('simulates power user rapid entry', () => {
			userWorkflows.powerUserRapid.forEach(input => {
				const errors = validateInput(input);
				const errorCount = errors.filter(e => e.type === 'error').length;
				
				// Power user entries should be valid
				expect(errorCount).toBe(0);
			});
		});

		test('simulates mistake correction workflow', () => {
			const workflow = userWorkflows.mistakeCorrection;
			const results = workflow.map(input => ({
				input,
				errors: validateInput(input),
				errorCount: validateInput(input).filter(e => e.type === 'error').length
			}));
			
			// Should show progression from errors to no errors
			expect(results[0].errorCount).toBeGreaterThan(0); // 'Task @invaliddate'
			expect(results[1].errorCount).toBeGreaterThan(0); // 'Task @invalid'
			expect(results[2].errorCount).toBe(0);            // 'Task @'
			expect(results[3].errorCount).toBe(0);            // 'Task @today'
			expect(results[4].errorCount).toBeGreaterThan(0); // 'Task @today #wrong'
			expect(results[5].errorCount).toBe(0);            // 'Task @today #high'
		});
	});

	describe('Performance and Stress Testing', () => {
		test('handles large input without performance degradation', () => {
			const largeInput = testFixtures.performanceTestData.largeSets.veryLongText;
			
			const startTime = performance.now();
			const errors = validateInput(largeInput);
			const endTime = performance.now();
			
			expect(endTime - startTime).toBeLessThan(100); // Should be fast
			expect(errors).toBeDefined(); // Should not crash
		});

		test('handles many patterns efficiently', () => {
			const manyPatterns = testFixtures.performanceTestData.largeSets.manyPatterns;
			
			const startTime = performance.now();
			const errors = validateInput(manyPatterns);
			const endTime = performance.now();
			
			expect(endTime - startTime).toBeLessThan(500); // Should handle many patterns
			expect(errors).toHaveLength(0); // All patterns should be valid
		});

		test('prevents regex backtracking issues', () => {
			testFixtures.performanceTestData.backtrackingTests.forEach(input => {
				const startTime = performance.now();
				validateInput(input);
				const endTime = performance.now();
				
				// Should not hang due to backtracking
				expect(endTime - startTime).toBeLessThan(1000);
			});
		});
	});

	describe('Regression Tests', () => {
		test('prevents "@2" bug regression', () => {
			const bugCase = regressionTests.at2Bug;
			
			const errors = validateInput(bugCase.input);
			expect(errors).toHaveLength(bugCase.expectedErrors);
			
			// Specifically test that no error messages mention date format
			const hasDateFormatError = errors.some(e => 
				e.message.toLowerCase().includes('invalid date format')
			);
			expect(hasDateFormatError).toBe(false);
		});

		test('prevents empty validation crashes', () => {
			regressionTests.emptyValidationCrash.inputs.forEach(input => {
				expect(() => getValidationResults(input)).not.toThrow();
			});
		});

		test('handles unicode characters safely', () => {
			regressionTests.unicodeBreaksRegex.inputs.forEach(input => {
				expect(() => validateInput(input)).not.toThrow();
			});
		});
	});

	describe('Validation Error Quality', () => {
		test('provides helpful error messages', () => {
			const testCases = [
				{ input: '@invaliddate', shouldContain: ['date format', 'keywords', 'YYYY-MM-DD'] },
				{ input: '#invalid', shouldContain: ['priority', 'low', 'medium', 'high'] },
				{ input: 'color:#xyz', shouldContain: ['hex color', '#RGB', '#RRGGBB'] },
				{ input: '+123user', shouldContain: ['assignee format', 'letter'] }
			];
			
			testCases.forEach(({ input, shouldContain }) => {
				const errors = validateInput(input);
				expect(errors.length).toBeGreaterThan(0);
				
				const errorMessage = errors[0].message.toLowerCase();
				shouldContain.forEach(term => {
					expect(errorMessage).toContain(term.toLowerCase());
				});
			});
		});

		test('provides useful suggestions', () => {
			const testCases = [
				{ input: '@invaliddate', expectedSuggestion: 'today' },
				{ input: '#invalid', expectedSuggestion: 'medium' },
				{ input: '[empty]', expectedSuggestion: null } // Some errors may not have suggestions
			];
			
			testCases.forEach(({ input, expectedSuggestion }) => {
				const errors = validateInput(input);
				if (expectedSuggestion) {
					expect(errors[0].suggestion).toBe(expectedSuggestion);
				}
			});
		});

		test('reports accurate error positions', () => {
			const input = 'Valid @today and invalid @notadate with #medium';
			const errors = validateInput(input);
			
			errors.forEach(error => {
				expect(error.startIndex).toBeGreaterThanOrEqual(0);
				expect(error.endIndex).toBeGreaterThan(error.startIndex);
				expect(error.endIndex).toBeLessThanOrEqual(input.length);
				
				// The error should point to actual content
				const errorContent = input.substring(error.startIndex, error.endIndex);
				expect(errorContent.trim()).not.toBe('');
			});
		});
	});

	describe('Pattern Recognition Accuracy', () => {
		test('correctly identifies all pattern types', () => {
			const mixedInput = 'Task @today #high [important] +user color:#ff0000 [incomplete';
			const allResults = getValidationResults(mixedInput);
			
			// Should identify the incomplete pattern as warning
			const warnings = allResults.filter(r => r.type === 'warning');
			const errors = allResults.filter(r => r.type === 'error');
			
			// The incomplete tag should generate a warning
			expect(warnings.length).toBeGreaterThanOrEqual(1);
			// All other patterns are valid, so no errors expected
			expect(errors).toHaveLength(0);
		});

		test('distinguishes between task checkboxes and regular tags', () => {
			const checkboxes = ['[x]', '[X]', '[ ]', '[]'];
			const regularTags = ['[tag]', '[important]', '[work]'];
			const emptyTag = ['[']; // This should be treated as incomplete, not empty tag
			
			// Checkboxes should not generate errors
			checkboxes.forEach(checkbox => {
				const errors = validateInput(checkbox);
				expect(errors.filter(e => e.type === 'error')).toHaveLength(0);
			});
			
			// Regular tags should not generate errors
			regularTags.forEach(tag => {
				const errors = validateInput(tag);
				expect(errors.filter(e => e.type === 'error')).toHaveLength(0);
			});
			
			// Incomplete tag should generate warning
			emptyTag.forEach(tag => {
				const results = getValidationResults(tag);
				const hasIncompleteWarning = results.some(r => 
					r.type === 'warning' && r.message.toLowerCase().includes('incomplete')
				);
				expect(hasIncompleteWarning).toBe(true);
			});
		});
	});

	describe('Edge Case Handling', () => {
		test('handles overlapping patterns gracefully', () => {
			// Patterns that might interfere with each other
			const overlappingInputs = [
				'@@today', // Double @
				'##high',  // Double #
				'[[tag]]', // Double brackets
				'++user',  // Double +
				'@today@tomorrow' // Adjacent dates
			];
			
			overlappingInputs.forEach(input => {
				expect(() => validateInput(input)).not.toThrow();
			});
		});

		test('handles malformed patterns without crashing', () => {
			const malformedInputs = [
				'@[invalid]',
				'#[priority]',
				'color:[value]',
				'+[assignee]',
				'[nested[brackets]]'
			];
			
			malformedInputs.forEach(input => {
				expect(() => getValidationResults(input)).not.toThrow();
			});
		});

		test('validates patterns at different positions', () => {
			const positions = [
				'@today at start',
				'middle @today position',
				'at end @today'
			];
			
			positions.forEach(input => {
				const errors = validateInput(input);
				// @today should be valid regardless of position
				expect(errors.filter(e => e.type === 'error')).toHaveLength(0);
			});
		});
	});

	describe('Memory and Resource Management', () => {
		test('does not leak memory with repeated validation', () => {
			// Run validation many times to check for memory leaks
			const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
			
			for (let i = 0; i < 1000; i++) {
				validateInput(`Test input ${i} @today #high [tag] +user`);
			}
			
			// Force garbage collection if available
			if (global.gc) {
				global.gc();
			}
			
			const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
			
			// Memory usage should not grow excessively
			if (initialMemory > 0 && finalMemory > 0) {
				const memoryGrowth = finalMemory - initialMemory;
				expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024); // Less than 10MB growth
			}
		});

		test('handles rapid validation calls efficiently', () => {
			const inputs = Array.from({ length: 100 }, (_, i) => `input${i}`);
			
			const startTime = performance.now();
			
			inputs.forEach(input => {
				validateInput(input);
			});
			
			const endTime = performance.now();
			const averageTime = (endTime - startTime) / inputs.length;
			
			// Each validation should be very fast
			expect(averageTime).toBeLessThan(1); // Less than 1ms per validation
		});
	});
});

// Specific regression test for the screenshot issue
describe('Screenshot Bug Reproduction', () => {
	test('reproduces exact scenario from screenshot: "@2" showing "Invalid date format"', () => {
		// This is the exact test case that should have been failing before the fix
		const userInput = '@2';
		
		// Run actual validation
		const validationErrors = validateInput(userInput);
		
		// The bug: this was showing "Invalid date format. Use keywords like..."
		// The fix: should show no errors for partial input "@2"
		expect(validationErrors).toHaveLength(0);
		
		// Double-check that no error mentions "Invalid date format"
		const hasDateFormatError = validationErrors.some(error => 
			error.message.includes('Invalid date format')
		);
		expect(hasDateFormatError).toBe(false);
		
		// Also verify through getValidationResults (the main API)
		const allResults = getValidationResults(userInput);
		expect(allResults).toHaveLength(0);
		
		console.log(`✅ Regression test passed: "${userInput}" produces ${validationErrors.length} errors`);
	});

	test('verifies fix works for similar partial inputs', () => {
		const partialInputs = ['@1', '@2', '@3', '@12', '@20', '@202'];
		
		partialInputs.forEach(input => {
			const errors = validateInput(input);
			expect(errors).toHaveLength(0);
			
			// Ensure no "Invalid date format" errors
			const hasDateFormatError = errors.some(e => 
				e.message.includes('Invalid date format')
			);
			expect(hasDateFormatError).toBe(false);
		});
	});

	test('still validates complete invalid dates', () => {
		const completeInvalidDates = ['@invaliddate', '@notadate', '@wrongformat'];
		
		completeInvalidDates.forEach(input => {
			const errors = validateInput(input);
			expect(errors.length).toBeGreaterThan(0);
			expect(errors[0].type).toBe('error');
			expect(errors[0].message).toContain('Invalid date format');
		});
	});
});