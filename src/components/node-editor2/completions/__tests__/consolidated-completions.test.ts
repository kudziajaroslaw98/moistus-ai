/**
 * Tests for the consolidated completion system
 * Verifies all pattern types, fuzzy search, and caching work correctly
 */

import { CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { EditorState, Text } from '@codemirror/state';
import universalCompletionSource, {
	detectPatternContext,
	fuzzySearchWithScoring,
	clearCompletionCache,
	getCompletionCacheSize,
	completionData,
	patternRegistry
} from '../index';

// Helper function to create completion context
const createCompletionContext = (text: string, cursor: number): CompletionContext => {
	const doc = Text.of([text]);
	const state = EditorState.create({ doc });
	
	return {
		pos: cursor,
		state,
		explicit: false
	};
};

describe('Consolidated Completion System', () => {
	beforeEach(() => {
		clearCompletionCache();
	});

	describe('Pattern Detection', () => {
		it('should detect date patterns', () => {
			const context = detectPatternContext('Hello @tod');
			expect(context).toEqual({
				type: 'date',
				pattern: '@tod',
				query: 'tod',
				matchStart: 6,
				matchEnd: 10,
				fullMatch: '@tod'
			});
		});

		it('should detect priority patterns', () => {
			const context = detectPatternContext('Task #hig');
			expect(context).toEqual({
				type: 'priority',
				pattern: '#hig',
				query: 'hig',
				matchStart: 5,
				matchEnd: 9,
				fullMatch: '#hig'
			});
		});

		it('should detect color patterns', () => {
			const context = detectPatternContext('Style color:re');
			expect(context).toEqual({
				type: 'color',
				pattern: 'color:re',
				query: 're',
				matchStart: 6,
				matchEnd: 14,
				fullMatch: 'color:re'
			});
		});

		it('should detect tag patterns', () => {
			const context = detectPatternContext('Items [uurg');
			expect(context).toEqual({
				type: 'tag',
				pattern: '[uurg',
				query: 'uurg',
				matchStart: 6,
				matchEnd: 11,
				fullMatch: '[uurg'
			});
		});

		it('should detect assignee patterns', () => {
			const context = detectPatternContext('Assign +m');
			expect(context).toEqual({
				type: 'assignee',
				pattern: '+m',
				query: 'm',
				matchStart: 7,
				matchEnd: 9,
				fullMatch: '+m'
			});
		});

		it('should return null for no patterns', () => {
			const context = detectPatternContext('Regular text');
			expect(context).toBeNull();
		});

		it('should prioritize pattern closest to cursor', () => {
			// Multiple patterns in text, should detect the last one
			const context = detectPatternContext('Task @today #hig');
			expect(context?.type).toBe('priority');
			expect(context?.query).toBe('hig');
		});
	});

	describe('Fuzzy Search', () => {
		it('should return exact matches first', () => {
			const results = fuzzySearchWithScoring('high', completionData.priority, 'priority', 10);
			expect(results[0].value).toBe('high');
			expect(results[0].matchType).toBe('exact');
			expect(results[0].score).toBeGreaterThan(100);
		});

		it('should handle starts-with matches', () => {
			const results = fuzzySearchWithScoring('tod', completionData.date, 'date', 10);
			expect(results[0].value).toBe('today');
			expect(results[0].matchType).toBe('starts-with');
		});

		it('should handle contains matches', () => {
			const results = fuzzySearchWithScoring('day', completionData.date, 'date', 10);
			const dayResults = results.filter(r => r.matchType === 'contains');
			expect(dayResults.length).toBeGreaterThan(0);
		});

		it('should respect limit parameter', () => {
			const results = fuzzySearchWithScoring('', completionData.date, 'date', 3);
			expect(results.length).toBe(3);
		});

		it('should apply category boosts', () => {
			const results = fuzzySearchWithScoring('t', completionData.date, 'date', 10);
			// Quick category items should be boosted
			const quickItems = results.filter(r => r.category === 'Quick');
			expect(quickItems.length).toBeGreaterThan(0);
		});
	});

	describe('Universal Completion Source', () => {
		it('should return date completions for @pattern', () => {
			const context = createCompletionContext('Meeting @tod', 11);
			const result = universalCompletionSource(context);
			
			expect(result).not.toBeNull();
			expect(result?.options.length).toBeGreaterThan(0);
			expect(result?.options[0].label).toContain('@today');
		});

		it('should return priority completions for #pattern', () => {
			const context = createCompletionContext('Task #hi', 8);
			const result = universalCompletionSource(context);
			
			expect(result).not.toBeNull();
			expect(result?.options.length).toBeGreaterThan(0);
			expect(result?.options[0].label).toContain('#high');
		});

		it('should return color completions for color:pattern', () => {
			const context = createCompletionContext('Style color:re', 14);
			const result = universalCompletionSource(context);
			
			expect(result).not.toBeNull();
			expect(result?.options.length).toBeGreaterThan(0);
			// Should find red-related colors
			const hasRedColor = result?.options.some(opt => 
				opt.label.toLowerCase().includes('red')
			);
			expect(hasRedColor).toBe(true);
		});

		it('should return tag completions for [pattern', () => {
			const context = createCompletionContext('Item [urg', 9);
			const result = universalCompletionSource(context);
			
			expect(result).not.toBeNull();
			expect(result?.options.length).toBeGreaterThan(0);
			expect(result?.options[0].label).toContain('[urgent]');
		});

		it('should return assignee completions for +pattern', () => {
			const context = createCompletionContext('Assign +m', 9);
			const result = universalCompletionSource(context);
			
			expect(result).not.toBeNull();
			expect(result?.options.length).toBeGreaterThan(0);
			expect(result?.options[0].label).toContain('+me');
		});

		it('should handle bare pattern triggers', () => {
			const context = createCompletionContext('Test @', 6);
			const result = universalCompletionSource(context);
			
			expect(result).not.toBeNull();
			expect(result?.options.length).toBeGreaterThan(0);
			expect(result?.from).toBe(5); // Position of @
		});

		it('should return null for no patterns', () => {
			const context = createCompletionContext('Regular text', 7);
			const result = universalCompletionSource(context);
			
			expect(result).toBeNull();
		});

		it('should handle multi-pattern text correctly', () => {
			// Should detect the pattern closest to cursor
			const context = createCompletionContext('Task @today #hi', 15);
			const result = universalCompletionSource(context);
			
			expect(result).not.toBeNull();
			// Should be priority completions since #hi is closer to cursor
			expect(result?.options[0].label).toContain('#high');
		});
	});

	describe('Caching System', () => {
		it('should cache completion results', () => {
			const context = createCompletionContext('Test @tod', 9);
			
			// First call - cache miss
			const result1 = universalCompletionSource(context);
			expect(getCompletionCacheSize()).toBe(1);
			
			// Second call - cache hit
			const result2 = universalCompletionSource(context);
			expect(result2).toEqual(result1);
		});

		it('should clear cache when requested', () => {
			const context = createCompletionContext('Test @tod', 9);
			universalCompletionSource(context);
			expect(getCompletionCacheSize()).toBeGreaterThan(0);
			
			clearCompletionCache();
			expect(getCompletionCacheSize()).toBe(0);
		});
	});

	describe('Pattern Registry', () => {
		it('should have all required pattern types', () => {
			const requiredPatterns = ['date', 'priority', 'color', 'tag', 'assignee'];
			requiredPatterns.forEach(pattern => {
				expect(patternRegistry[pattern]).toBeDefined();
				expect(patternRegistry[pattern].regex).toBeInstanceOf(RegExp);
				expect(patternRegistry[pattern].validationPattern).toBeInstanceOf(RegExp);
			});
		});

		it('should have completion data for all patterns', () => {
			const requiredPatterns = ['date', 'priority', 'color', 'tag', 'assignee'];
			requiredPatterns.forEach(pattern => {
				expect(completionData[pattern]).toBeDefined();
				expect(Array.isArray(completionData[pattern])).toBe(true);
				expect(completionData[pattern].length).toBeGreaterThan(0);
			});
		});
	});

	describe('Error Handling', () => {
		it('should handle invalid context gracefully', () => {
			// Create an invalid context
			const invalidContext = {
				pos: -1,
				state: null as any,
				explicit: false
			};
			
			const result = universalCompletionSource(invalidContext);
			expect(result).toBeNull();
		});

		it('should handle malformed text gracefully', () => {
			const context = createCompletionContext('Test @[#color:', 13);
			const result = universalCompletionSource(context);
			
			// Should handle malformed patterns gracefully without crashing
			// May return null if no valid pattern is detected at cursor position
			expect(() => universalCompletionSource(context)).not.toThrow();
		});
	});

	describe('Performance', () => {
		it('should handle large completion lists efficiently', () => {
			const start = performance.now();
			
			// Test with all completion types
			const patterns = ['@test', '#test', 'color:test', '[test', '+test'];
			patterns.forEach((pattern, i) => {
				const context = createCompletionContext(`Test ${pattern}`, `Test ${pattern}`.length);
				universalCompletionSource(context);
			});
			
			const end = performance.now();
			expect(end - start).toBeLessThan(100); // Should complete within 100ms
		});
	});
});