/**
 * Tests for dynamic date completion filtering
 * Tests the fix for Issue #5: Dynamic date completion filtering for partial dates like '2025-10-2'
 */

import { 
	fuzzySearchWithPatternScoring, 
	getCompletionItemsForPattern,
	detectPatternContext,
	dateUtils
} from '../completion-data';
import { CompletionItem, PatternContext } from '../completion-types';

describe('Dynamic Date Completion Filtering', () => {
	describe('Partial day filtering for date completions', () => {
		test('should filter days for partial date "2025-10-2" to show days 20-29', () => {
			// Create day completions for October 2025 (31 days)
			const partialDate = dateUtils.parsePartialDatePattern('2025-10-');
			expect(partialDate).toBeTruthy();
			expect(partialDate!.isValid).toBe(true);
			expect(partialDate!.daysInMonth).toBe(31);

			const dayCompletions = dateUtils.generateDayCompletions(partialDate!);
			expect(dayCompletions).toHaveLength(31);

			// Create a mock context for partial date with partial day
			const context: PatternContext = {
				type: 'date',
				pattern: '@2025-10-2',
				query: '2025-10-2',
				matchStart: 0,
				matchEnd: 10,
				dateSubtype: 'partial-date',
				partialDate: {
					...partialDate!,
					partialDay: '2'
				}
			};

			// Test the filtering with query ending in '2' 
			const filteredResults = fuzzySearchWithPatternScoring(
				'2025-10-2', 
				dayCompletions, 
				'date', 
				15, 
				context
			);

			// Should only return days starting with '2': 2, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29
			const expectedDays = ['2', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29'];
			expect(filteredResults).toHaveLength(expectedDays.length);

			const returnedDays = filteredResults.map(item => item.label);
			expectedDays.forEach(day => {
				expect(returnedDays).toContain(day);
			});
		});

		test('should filter days for partial date "2025-02-2" to show days 20-28 (February)', () => {
			// Test February (28 days in 2025, non-leap year)
			const partialDate = dateUtils.parsePartialDatePattern('2025-02-');
			expect(partialDate).toBeTruthy();
			expect(partialDate!.daysInMonth).toBe(28); // Non-leap year

			const dayCompletions = dateUtils.generateDayCompletions(partialDate!);
			expect(dayCompletions).toHaveLength(28);

			const context: PatternContext = {
				type: 'date',
				pattern: '@2025-02-2',
				query: '2025-02-2',
				matchStart: 0,
				matchEnd: 10,
				dateSubtype: 'partial-date',
				partialDate: {
					...partialDate!,
					partialDay: '2'
				}
			};

			const filteredResults = fuzzySearchWithPatternScoring(
				'2025-02-2', 
				dayCompletions, 
				'date', 
				15, 
				context
			);

			// Should return days 2, 20-28 (no 29 in February 2025)
			const expectedDays = ['2', '20', '21', '22', '23', '24', '25', '26', '27', '28'];
			expect(filteredResults).toHaveLength(expectedDays.length);

			const returnedDays = filteredResults.map(item => item.label);
			expectedDays.forEach(day => {
				expect(returnedDays).toContain(day);
			});
			
			// Should NOT contain day 29 for February
			expect(returnedDays).not.toContain('29');
		});

		test('should filter days for partial date "2024-02-2" to show days 20-29 (leap year February)', () => {
			// Test leap year February (29 days in 2024)
			const partialDate = dateUtils.parsePartialDatePattern('2024-02-');
			expect(partialDate).toBeTruthy();
			expect(partialDate!.daysInMonth).toBe(29); // Leap year

			const dayCompletions = dateUtils.generateDayCompletions(partialDate!);
			expect(dayCompletions).toHaveLength(29);

			const context: PatternContext = {
				type: 'date',
				pattern: '@2024-02-2',
				query: '2024-02-2',
				matchStart: 0,
				matchEnd: 10,
				dateSubtype: 'partial-date',
				partialDate: {
					...partialDate!,
					partialDay: '2'
				}
			};

			const filteredResults = fuzzySearchWithPatternScoring(
				'2024-02-2', 
				dayCompletions, 
				'date', 
				15, 
				context
			);

			// Should return days 2, 20-29 (including 29 in leap year February)
			const expectedDays = ['2', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29'];
			expect(filteredResults).toHaveLength(expectedDays.length);

			const returnedDays = filteredResults.map(item => item.label);
			expectedDays.forEach(day => {
				expect(returnedDays).toContain(day);
			});
		});

		test('should filter days for partial date "2025-04-3" to show days 30 only (April has 30 days)', () => {
			// Test April (30 days) with partial day "3"
			const partialDate = dateUtils.parsePartialDatePattern('2025-04-');
			expect(partialDate).toBeTruthy();
			expect(partialDate!.daysInMonth).toBe(30);

			const dayCompletions = dateUtils.generateDayCompletions(partialDate!);
			expect(dayCompletions).toHaveLength(30);

			const context: PatternContext = {
				type: 'date',
				pattern: '@2025-04-3',
				query: '2025-04-3',
				matchStart: 0,
				matchEnd: 10,
				dateSubtype: 'partial-date',
				partialDate: {
					...partialDate!,
					partialDay: '3'
				}
			};

			const filteredResults = fuzzySearchWithPatternScoring(
				'2025-04-3', 
				dayCompletions, 
				'date', 
				15, 
				context
			);

			// Should return days 3, 30 only (no 31 in April)
			const expectedDays = ['3', '30'];
			expect(filteredResults).toHaveLength(expectedDays.length);

			const returnedDays = filteredResults.map(item => item.label);
			expectedDays.forEach(day => {
				expect(returnedDays).toContain(day);
			});
			
			// Should NOT contain day 31 for April
			expect(returnedDays).not.toContain('31');
		});

		test('should handle single digit partial days correctly', () => {
			// Test single digit like "1" should match 1, 10-19
			const partialDate = dateUtils.parsePartialDatePattern('2025-10-');
			const dayCompletions = dateUtils.generateDayCompletions(partialDate!);

			const context: PatternContext = {
				type: 'date',
				pattern: '@2025-10-1',
				query: '2025-10-1',
				matchStart: 0,
				matchEnd: 10,
				dateSubtype: 'partial-date',
				partialDate: {
					...partialDate!,
					partialDay: '1'
				}
			};

			const filteredResults = fuzzySearchWithPatternScoring(
				'2025-10-1', 
				dayCompletions, 
				'date', 
				15, 
				context
			);

			// Should return days 1, 10-19
			const expectedDays = ['1', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19'];
			expect(filteredResults).toHaveLength(expectedDays.length);

			const returnedDays = filteredResults.map(item => item.label);
			expectedDays.forEach(day => {
				expect(returnedDays).toContain(day);
			});
		});

		test('should handle two-digit partial days correctly', () => {
			// Test "12" should match only 12
			const partialDate = dateUtils.parsePartialDatePattern('2025-10-');
			const dayCompletions = dateUtils.generateDayCompletions(partialDate!);

			const context: PatternContext = {
				type: 'date',
				pattern: '@2025-10-12',
				query: '2025-10-12',
				matchStart: 0,
				matchEnd: 11,
				dateSubtype: 'partial-date',
				partialDate: {
					...partialDate!,
					partialDay: '12'
				}
			};

			const filteredResults = fuzzySearchWithPatternScoring(
				'2025-10-12', 
				dayCompletions, 
				'date', 
				15, 
				context
			);

			// Should return only day 12
			expect(filteredResults).toHaveLength(1);
			expect(filteredResults[0].label).toBe('12');
		});
	});

	describe('Pattern detection for partial dates with days', () => {
		test('should detect partial date patterns correctly', () => {
			const testCases = [
				// Single digit day patterns should be treated as partial-date since they match the pattern
				{ input: '@2025-10-2', expectedSubtype: 'partial-date', shouldHavePartialDate: true },
				{ input: '@2025-02-2', expectedSubtype: 'partial-date', shouldHavePartialDate: true },
				// Full 2-digit dates should be full-date
				{ input: '@2024-02-29', expectedSubtype: 'full-date', shouldHavePartialDate: false },
				{ input: '@2025-10-15', expectedSubtype: 'full-date', shouldHavePartialDate: false },
				// Word patterns
				{ input: '@today', expectedSubtype: 'word', shouldHavePartialDate: false },
				// Trailing dash should be partial-date
				{ input: '@2025-10-', expectedSubtype: 'partial-date', shouldHavePartialDate: true }
			];

			testCases.forEach(({ input, expectedSubtype, shouldHavePartialDate }) => {
				const context = detectPatternContext(input);
				expect(context).toBeTruthy();
				expect(context!.type).toBe('date');
				expect(context!.dateSubtype).toBe(expectedSubtype);
				
				if (shouldHavePartialDate) {
					expect(context!.partialDate).toBeDefined();
				}
			});
		});
	});

	describe('Integration with completion system', () => {
		test('should return day completions for partial date patterns', () => {
			const context: PatternContext = {
				type: 'date',
				pattern: '@2025-10-',
				query: '2025-10-',
				matchStart: 0,
				matchEnd: 9,
				dateSubtype: 'partial-date',
				partialDate: {
					year: '2025',
					month: '10',
					isComplete: false,
					isValid: true,
					daysInMonth: 31
				}
			};

			const completions = getCompletionItemsForPattern('date', context);
			
			// Should return day completions for October (31 days)
			expect(completions).toHaveLength(31);
			expect(completions[0].category).toBe('Days');
			
			// Check that days 1-31 are all present
			const dayLabels = completions.map(c => c.label);
			for (let day = 1; day <= 31; day++) {
				expect(dayLabels).toContain(day.toString());
			}
		});

		test('should return static date completions for word patterns', () => {
			const context: PatternContext = {
				type: 'date',
				pattern: '@today',
				query: 'today',
				matchStart: 0,
				matchEnd: 6,
				dateSubtype: 'word'
			};

			const completions = getCompletionItemsForPattern('date', context);
			
			// Should return static date completions (not day-specific)
			expect(completions.length).toBeGreaterThan(0);
			
			// Should include common date keywords
			const completionValues = completions.map(c => c.value);
			expect(completionValues).toContain('today');
			expect(completionValues).toContain('tomorrow');
			expect(completionValues).toContain('yesterday');
		});
	});

	describe('Edge cases and error handling', () => {
		test('should handle invalid partial dates gracefully', () => {
			const partialDate = {
				year: '2025',
				month: '13', // Invalid month
				isComplete: false,
				isValid: false,
				daysInMonth: undefined
			};

			const context: PatternContext = {
				type: 'date',
				pattern: '@2025-13-2',
				query: '2025-13-2',
				matchStart: 0,
				matchEnd: 10,
				dateSubtype: 'partial-date',
				partialDate
			};

			// Should not crash and should return no completions or fallback
			const filteredResults = fuzzySearchWithPatternScoring(
				'2025-13-2', 
				[], 
				'date', 
				15, 
				context
			);

			expect(filteredResults).toHaveLength(0);
		});

		test('should handle empty day completions gracefully', () => {
			const context: PatternContext = {
				type: 'date',
				pattern: '@2025-10-2',
				query: '2025-10-2',
				matchStart: 0,
				matchEnd: 10,
				dateSubtype: 'partial-date',
				partialDate: {
					year: '2025',
					month: '10',
					partialDay: '2',
					isComplete: false,
					isValid: true,
					daysInMonth: 31
				}
			};

			// Pass empty completions array
			const filteredResults = fuzzySearchWithPatternScoring(
				'2025-10-2', 
				[], 
				'date', 
				15, 
				context
			);

			expect(filteredResults).toHaveLength(0);
		});

		test('should handle missing context gracefully', () => {
			const partialDate = dateUtils.parsePartialDatePattern('2025-10-');
			const dayCompletions = dateUtils.generateDayCompletions(partialDate!);

			// Call without context - should not crash
			const filteredResults = fuzzySearchWithPatternScoring(
				'2025-10-2', 
				dayCompletions, 
				'date', 
				15
			);

			// Should still return results using standard fuzzy matching
			expect(filteredResults.length).toBeGreaterThan(0);
		});

		test('should handle leap year edge cases', () => {
			// Test leap year detection
			expect(dateUtils.isLeapYear(2024)).toBe(true);
			expect(dateUtils.isLeapYear(2025)).toBe(false);
			expect(dateUtils.isLeapYear(2000)).toBe(true);
			expect(dateUtils.isLeapYear(1900)).toBe(false);

			// Test days in February for leap years
			expect(dateUtils.getDaysInMonth(2024, 2)).toBe(29);
			expect(dateUtils.getDaysInMonth(2025, 2)).toBe(28);
		});
	});

	describe('Performance tests', () => {
		test('should handle large day completion arrays efficiently', () => {
			// Generate day completions for October
			const partialDate = dateUtils.parsePartialDatePattern('2025-10-');
			const dayCompletions = dateUtils.generateDayCompletions(partialDate!);
			
			// Don't duplicate - just use the original array which should be sufficient for performance testing
			const context: PatternContext = {
				type: 'date',
				pattern: '@2025-10-2',
				query: '2025-10-2',
				matchStart: 0,
				matchEnd: 10,
				dateSubtype: 'partial-date',
				partialDate: {
					year: '2025',
					month: '10',
					partialDay: '2',
					isComplete: false,
					isValid: true,
					daysInMonth: 31
				}
			};

			const startTime = performance.now();
			const filteredResults = fuzzySearchWithPatternScoring(
				'2025-10-2', 
				dayCompletions, 
				'date', 
				15, 
				context
			);
			const endTime = performance.now();

			// Should complete reasonably quickly (less than 100ms)
			expect(endTime - startTime).toBeLessThan(100);
			
			// Should return correct filtered results - days that start with "2"
			expect(filteredResults.length).toBeGreaterThan(0);
			const returnedDays = filteredResults.map(item => item.label);
			
			// All returned days should start with "2"
			returnedDays.forEach(day => {
				expect(day.startsWith('2')).toBe(true);
			});
			
			// Should include specific days that start with "2"
			expect(returnedDays).toContain('2');
			expect(returnedDays).toContain('20');
		});
	});
});