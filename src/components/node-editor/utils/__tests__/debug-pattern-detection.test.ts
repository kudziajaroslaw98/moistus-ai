/**
 * Debug test for pattern detection
 */

// Note: detectPatternContext needs to be implemented in completion-providers
// import { detectPatternContext } from '../../domain/completion-providers';

describe('Debug Pattern Detection', () => {
	test('Debug pattern detection for various inputs', () => {
		const testCases = [
			'@today',
			'#high',
			'[meeting]',
			'+alice',
			'color:#ff0000',
		];

		testCases.forEach(input => {
			console.log(`Input: "${input}"`);
			const context = detectPatternContext(input);
			console.log('Result:', context);
			console.log('---');
		});
	});
});