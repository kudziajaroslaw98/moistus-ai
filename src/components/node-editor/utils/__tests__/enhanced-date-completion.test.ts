/**
 * Test suite for enhanced date completion functionality
 * Verifies dynamic day number generation for partial date patterns
 */

import {
	detectPatternContext,
	getCompletionItemsForPattern,
	dateUtils,
	getCachedDayCompletions,
	validateAndFormatDate,
} from '../completion-data';

describe('Enhanced Date Completion System', () => {
	describe('Pattern Detection', () => {
		test('detects partial date patterns correctly', () => {
			const testCases = [
				{ input: '@2025-10-', expected: 'partial-date' },
				{ input: '@2024-02-', expected: 'partial-date' },
				{ input: '@2023-12-', expected: 'partial-date' },
			];

			for (const { input, expected } of testCases) {
				const context = detectPatternContext(input);
				expect(context).not.toBeNull();
				expect(context?.type).toBe('date');
				expect(context?.dateSubtype).toBe(expected);
			}
		});

		test('detects word-based date patterns correctly', () => {
			const testCases = [
				{ input: '@tod', expected: 'word' },
				{ input: '@tomorrow', expected: 'word' },
				{ input: '@monday', expected: 'word' },
			];

			for (const { input, expected } of testCases) {
				const context = detectPatternContext(input);
				expect(context).not.toBeNull();
				expect(context?.type).toBe('date');
				expect(context?.dateSubtype).toBe(expected);
			}
		});

		test('detects full date patterns correctly', () => {
			const testCases = [
				{ input: '@2025-01-15', expected: 'full-date' },
				{ input: '@2024-12-31', expected: 'full-date' },
			];

			for (const { input, expected } of testCases) {
				const context = detectPatternContext(input);
				expect(context).not.toBeNull();
				expect(context?.type).toBe('date');
				expect(context?.dateSubtype).toBe(expected);
			}
		});
	});

	describe('Partial Date Parsing', () => {
		test('parses valid partial date patterns', () => {
			const testCases = [
				{
					query: '2025-10-',
					expected: {
						year: '2025',
						month: '10',
						isValid: true,
						daysInMonth: 31,
					},
				},
				{
					query: '2024-02-',
					expected: {
						year: '2024',
						month: '02',
						isValid: true,
						daysInMonth: 29, // 2024 is a leap year
					},
				},
				{
					query: '2025-02-',
					expected: {
						year: '2025',
						month: '02',
						isValid: true,
						daysInMonth: 28, // 2025 is not a leap year
					},
				},
			];

			for (const { query, expected } of testCases) {
				const result = dateUtils.parsePartialDatePattern(query);
				expect(result).not.toBeNull();
				expect(result?.year).toBe(expected.year);
				expect(result?.month).toBe(expected.month);
				expect(result?.isValid).toBe(expected.isValid);
				expect(result?.daysInMonth).toBe(expected.daysInMonth);
			}
		});

		test('handles invalid partial date patterns', () => {
			const invalidQueries = [
				'2025-13-', // Invalid month
				'2025-00-', // Invalid month
				'999-10-', // Invalid year
				'invalid-format',
			];

			for (const query of invalidQueries) {
				const result = dateUtils.parsePartialDatePattern(query);
				if (result !== null) {
					expect(result.isValid).toBe(false);
				}
			}
		});
	});

	describe('Day Completion Generation', () => {
		test('generates correct number of days for different months', () => {
			const testCases = [
				{ year: 2025, month: 1, expectedDays: 31 }, // January
				{ year: 2025, month: 4, expectedDays: 30 }, // April
				{ year: 2024, month: 2, expectedDays: 29 }, // February (leap year)
				{ year: 2025, month: 2, expectedDays: 28 }, // February (non-leap year)
			];

			for (const { year, month, expectedDays } of testCases) {
				const partialDate = {
					year: year.toString(),
					month: month.toString().padStart(2, '0'),
					isComplete: false,
					isValid: true,
					daysInMonth: dateUtils.getDaysInMonth(year, month),
				};

				const completions = dateUtils.generateDayCompletions(partialDate);
				expect(completions).toHaveLength(expectedDays);
				
				// Check first and last day
				expect(completions[0].label).toBe('1');
				expect(completions[completions.length - 1].label).toBe(expectedDays.toString());
				
				// Check value formatting
				expect(completions[0].value).toBe(`${year}-${month.toString().padStart(2, '0')}-01`);
				expect(completions[completions.length - 1].value).toBe(
					`${year}-${month.toString().padStart(2, '0')}-${expectedDays.toString().padStart(2, '0')}`
				);
			}
		});

		test('includes proper description and category', () => {
			const partialDate = {
				year: '2025',
				month: '10',
				isComplete: false,
				isValid: true,
				daysInMonth: 31,
			};

			const completions = dateUtils.generateDayCompletions(partialDate);
			
			// Check that all completions have proper format
			for (const completion of completions) {
				expect(completion.category).toBe('Days');
				expect(completion.description).toContain('October');
				expect(completion.description).toContain('2025');
				expect(completion.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			}
		});
	});

	describe('Enhanced Completion Integration', () => {
		test('returns day completions for partial date patterns', () => {
			const context = detectPatternContext('@2025-10-');
			expect(context).not.toBeNull();
			
			const completions = getCompletionItemsForPattern('date', context!);
			expect(completions).toHaveLength(31); // October has 31 days
			
			// Check that we get day numbers, not word-based dates
			expect(completions[0].label).toBe('1');
			expect(completions[30].label).toBe('31');
			expect(completions[0].category).toBe('Days');
		});

		test('returns word-based completions for word patterns', () => {
			const context = detectPatternContext('@tod');
			expect(context).not.toBeNull();
			
			const completions = getCompletionItemsForPattern('date', context!);
			
			// Should return the regular date completions, not day numbers
			expect(completions.length).toBeGreaterThan(31);
			const todayCompletion = completions.find(c => c.value === 'today');
			expect(todayCompletion).toBeDefined();
		});
	});

	describe('Leap Year Handling', () => {
		test('correctly identifies leap years', () => {
			const leapYears = [2000, 2004, 2008, 2012, 2016, 2020, 2024];
			const nonLeapYears = [1900, 2001, 2002, 2003, 2021, 2022, 2023, 2025];
			
			for (const year of leapYears) {
				expect(dateUtils.isLeapYear(year)).toBe(true);
			}
			
			for (const year of nonLeapYears) {
				expect(dateUtils.isLeapYear(year)).toBe(false);
			}
		});

		test('generates 29 days for February in leap years', () => {
			const partialDate = {
				year: '2024',
				month: '02',
				isComplete: false,
				isValid: true,
				daysInMonth: 29,
			};

			const completions = dateUtils.generateDayCompletions(partialDate);
			expect(completions).toHaveLength(29);
			expect(completions[28].value).toBe('2024-02-29');
		});

		test('generates 28 days for February in non-leap years', () => {
			const partialDate = {
				year: '2025',
				month: '02',
				isComplete: false,
				isValid: true,
				daysInMonth: 28,
			};

			const completions = dateUtils.generateDayCompletions(partialDate);
			expect(completions).toHaveLength(28);
			expect(completions[27].value).toBe('2025-02-28');
		});
	});

	describe('Caching', () => {
		test('caches day completions for performance', () => {
			const partialDate = {
				year: '2025',
				month: '10',
				isComplete: false,
				isValid: true,
				daysInMonth: 31,
			};

			// First call should generate completions
			const firstCall = getCachedDayCompletions(partialDate);
			expect(firstCall).toHaveLength(31);

			// Second call should return cached results (same reference)
			const secondCall = getCachedDayCompletions(partialDate);
			expect(secondCall).toBe(firstCall);
		});
	});

	describe('Date Validation', () => {
		test('validates and formats complete dates correctly', () => {
			const validCases = [
				{ input: '2025-01-01', expected: '2025-01-01' },
				{ input: '2025-1-1', expected: '2025-01-01' },
				{ input: '2024-02-29', expected: '2024-02-29' }, // Leap year
			];

			for (const { input, expected } of validCases) {
				const result = validateAndFormatDate(input);
				expect(result.isValid).toBe(true);
				expect(result.formatted).toBe(expected);
			}
		});

		test('rejects invalid dates', () => {
			const invalidCases = [
				'2025-02-29', // Not a leap year
				'2025-13-01', // Invalid month
				'2025-04-31', // April only has 30 days
				'invalid-date',
				'2025/01/01', // Wrong format
			];

			for (const input of invalidCases) {
				const result = validateAndFormatDate(input);
				expect(result.isValid).toBe(false);
				expect(result.error).toBeDefined();
			}
		});
	});
});