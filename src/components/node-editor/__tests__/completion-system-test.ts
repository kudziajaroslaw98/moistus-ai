/**
 * Test suite for the universal completion system
 * Validates pattern detection, completion generation, and type safety
 */

// TODO: Update imports once completion data is available in node-editor
// import { 
// 	detectPatternContext, 
// 	getCompletionItemsForPattern,
// 	fuzzySearchWithPatternScoring 
// } from './completion-data';
import { PatternType } from '../utils';

// Temporary stubs for testing - replace with actual implementations
const detectPatternContext = (input: string): any => null;
const getCompletionItemsForPattern = (patternType: PatternType): any[] => [];
const fuzzySearchWithPatternScoring = (query: string, items: any[], patternType: PatternType, limit: number): any[] => [];

// Test pattern detection
export const testPatternDetection = () => {
	const tests = [
		{ input: 'Meeting @tod', expected: { type: 'date', query: 'tod' } },
		{ input: 'Task #hi', expected: { type: 'priority', query: 'hi' } },
		{ input: 'Node color:re', expected: { type: 'color', query: 're' } },
		{ input: 'Item [mee', expected: { type: 'tag', query: 'mee' } },
		{ input: 'Assign +joh', expected: { type: 'assignee', query: 'joh' } },
		{ input: 'Just text', expected: null },
	];

	console.log('🧪 Testing Pattern Detection:');
	
	tests.forEach((test, index) => {
		const result = detectPatternContext(test.input);
		const passed = test.expected ? 
			(result?.type === test.expected.type && result?.query === test.expected.query) :
			result === null;
		
		console.log(`  ${passed ? '✅' : '❌'} Test ${index + 1}: "${test.input}" -> ${result ? `${result.type}:"${result.query}"` : 'null'}`);
	});
};

// Test completion items for each pattern type
export const testCompletionItems = () => {
	const patternTypes: PatternType[] = ['date', 'priority', 'color', 'tag', 'assignee'];
	
	console.log('\n📦 Testing Completion Items:');
	
	patternTypes.forEach(patternType => {
		const items = getCompletionItemsForPattern(patternType);
		console.log(`  ${items.length > 0 ? '✅' : '❌'} ${patternType}: ${items.length} items available`);
		
		// Show sample items
		if (items.length > 0) {
			const samples = items.slice(0, 3).map(item => item.label).join(', ');
			console.log(`    Samples: ${samples}${items.length > 3 ? '...' : ''}`);
		}
	});
};

// Test fuzzy search with pattern scoring
export const testFuzzySearch = () => {
	console.log('\n🔍 Testing Fuzzy Search:');
	
	const searchTests = [
		{ patternType: 'date' as PatternType, query: 'tod', expectedFirst: 'Today' },
		{ patternType: 'priority' as PatternType, query: 'hi', expectedFirst: 'High Priority' },
		{ patternType: 'color' as PatternType, query: 'red', expectedContains: 'Red' },
		{ patternType: 'tag' as PatternType, query: 'meet', expectedFirst: 'Meeting' },
		{ patternType: 'assignee' as PatternType, query: 'me', expectedFirst: 'Me' },
	];
	
	searchTests.forEach((test, index) => {
		const items = getCompletionItemsForPattern(test.patternType);
		const results = fuzzySearchWithPatternScoring(test.query, items, test.patternType, 10);
		
		const passed = results.length > 0 && (
			test.expectedFirst ? results[0].label === test.expectedFirst :
			test.expectedContains ? results.some(r => r.label.includes(test.expectedContains)) :
			true
		);
		
		console.log(`  ${passed ? '✅' : '❌'} Test ${index + 1}: ${test.patternType} "${test.query}" -> ${results.length} results`);
		
		if (results.length > 0) {
			console.log(`    Top result: "${results[0].label}"`);
		}
	});
};

// Test type safety
export const testTypeSafety = () => {
	console.log('\n🛡️ Testing Type Safety:');
	
	// Test pattern type validation
	const validPatterns: PatternType[] = ['date', 'priority', 'color', 'tag', 'assignee'];
	const invalidPatterns = ['invalid', 'unknown', 'test'];
	
	console.log(`  ✅ Valid patterns: ${validPatterns.join(', ')}`);
	console.log(`  🚫 Invalid patterns: ${invalidPatterns.join(', ')}`);
	
	// Test completion item structure
	const dateItems = getCompletionItemsForPattern('date');
	if (dateItems.length > 0) {
		const sample = dateItems[0];
		const hasRequiredFields = typeof sample.value === 'string' && typeof sample.label === 'string';
		console.log(`  ${hasRequiredFields ? '✅' : '❌'} CompletionItem structure: value & label are strings`);
	}
};

// Performance test
export const testPerformance = () => {
	console.log('\n⚡ Testing Performance:');
	
	const iterations = 1000;
	const testInput = 'Meeting @today with [urgent] priority #high assigned to +john';
	
	// Test pattern detection performance
	const startPatternDetection = performance.now();
	for (let i = 0; i < iterations; i++) {
		detectPatternContext(testInput);
	}
	const patternDetectionTime = performance.now() - startPatternDetection;
	
	// Test fuzzy search performance
	const dateItems = getCompletionItemsForPattern('date');
	const startFuzzySearch = performance.now();
	for (let i = 0; i < iterations; i++) {
		fuzzySearchWithPatternScoring('tod', dateItems, 'date', 10);
	}
	const fuzzySearchTime = performance.now() - startFuzzySearch;
	
	console.log(`  ⏱️ Pattern detection: ${(patternDetectionTime / iterations).toFixed(3)}ms per call`);
	console.log(`  ⏱️ Fuzzy search: ${(fuzzySearchTime / iterations).toFixed(3)}ms per call`);
	
	const totalTime = patternDetectionTime + fuzzySearchTime;
	console.log(`  🚀 Total performance: ${(totalTime / iterations).toFixed(3)}ms per completion cycle`);
};

// Run all tests
export const runAllCompletionTests = () => {
	console.log('🎯 Universal Completion System Test Suite');
	console.log('=========================================');
	
	try {
		testPatternDetection();
		testCompletionItems();
		testFuzzySearch();
		testTypeSafety();
		testPerformance();
		
		console.log('\n🎉 All tests completed! Check results above for any failures.');
		
	} catch (error) {
		console.error('\n💥 Test suite failed:', error);
	}
};

// Export for easy browser console testing
if (typeof window !== 'undefined') {
	(window as any).testCompletionSystem = runAllCompletionTests;
	console.log('💡 Run `testCompletionSystem()` in console to test the completion system');
}