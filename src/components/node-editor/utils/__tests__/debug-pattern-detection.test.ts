/**
 * Debug test for pattern detection
 */

import { detectPatternContext } from '../completion-data';

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