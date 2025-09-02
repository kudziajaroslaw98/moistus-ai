/**
 * Test fixtures and data for comprehensive node-editor testing
 * Provides realistic test data, edge cases, and regression scenarios
 */

import { type ValidationError } from '../validation';

// Real-world input examples that users might type
export const realWorldInputs = {
	// Common task creation patterns
	taskCreation: [
		'Review the quarterly report @today #high [urgent]',
		'Call client about project status +john @tomorrow',
		'Fix bug in authentication system [bug] #medium',
		'Schedule team meeting [meeting] @next-week +manager',
		'Update documentation for API endpoints color:#blue'
	],

	// Progressive typing patterns (simulating real user behavior)
	progressiveTyping: {
		// Typing "@2" should not show errors (key regression test)
		dateTyping: [
			'@',           // No error
			'@2',          // No error (this was the bug!)
			'@20',         // No error
			'@202',        // No error
			'@2024',       // No error
			'@2024-',      // No error
			'@2024-0',     // No error
			'@2024-01',    // No error
			'@2024-01-',   // No error
			'@2024-01-15'  // No error - valid date
		],

		priorityTyping: [
			'#',      // No error
			'#l',     // No error
			'#lo',    // No error
			'#low'    // No error - valid priority
		],

		tagTyping: [
			'[',       // Warning - incomplete
			'[t',      // Warning - incomplete
			'[ta',     // Warning - incomplete
			'[tag',    // Warning - incomplete
			'[tag]'    // No error - complete tag
		],

		assigneeTyping: [
			'+',       // No error (too short)
			'+u',      // No error
			'+us',     // No error
			'+use',    // No error
			'+user'    // No error - valid assignee
		],

		colorTyping: [
			'color:',     // Warning - incomplete
			'color:#',    // Error - invalid hex
			'color:#f',   // Error - invalid hex (too short)
			'color:#ff',  // Error - invalid hex (too short)
			'color:#fff'  // No error - valid hex
		]
	},

	// Mixed pattern examples
	complexMixed: [
		'Complete project @2024-01-15 #high [important] +team color:#ff0000',
		'Review code [x] @today +reviewer #medium',
		'Bug report: login fails [bug] [critical] +developer @tomorrow',
		'Meeting notes [meeting] @2024-01-20 color:#blue +attendees'
	],

	// Edge cases and special characters
	edgeCases: [
		// Unicode and special characters
		'Task with émoji 🚀 @today',
		'Chinese characters 任务 @明天',
		'Mixed languages タスク @today',

		// Long inputs
		'This is a very long task description that might test the limits of validation and rendering performance. It contains multiple patterns like @2024-01-15 and #high priority with [multiple] [tags] and +assignee references that need to be validated properly without performance issues.',

		// Multiple identical patterns
		'@today @today @today #high #high #high',

		// Malformed but realistic patterns
		'@2024-13-45 #superhigh [unclosed +invalid@user',

		// Empty and whitespace
		'',
		'   ',
		'\n\t',

		// Only symbols
		'@@##[[++',

		// Mixed valid and invalid
		'Valid @today and invalid @notadate with #medium and #invalid'
	]
};

// Validation error scenarios for testing
export const validationScenarios = {
	// Date validation errors
	dateErrors: {
		// Complete invalid dates (should error)
		invalidDates: [
			{ input: '@invaliddate', expectedError: 'Invalid date format' },
			{ input: '@2024-13-01', expectedError: 'Invalid month' },
			{ input: '@2024-01-32', expectedError: 'Invalid day' },
			{ input: '@1800-01-01', expectedError: 'Date year seems unusual' },
			{ input: '@notadate123', expectedError: 'Invalid date format' }
		],

		// Valid dates (should not error)
		validDates: [
			'@today', '@tomorrow', '@yesterday',
			'@monday', '@tuesday', '@wednesday', '@thursday', '@friday', '@saturday', '@sunday',
			'@2024-01-15', '@2024-1-1', '@01/15/2024', '@2024/01/15',
			'@week', '@month', '@next', '@last'
		],

		// Partial dates (should not error - key for @2 bug fix)
		partialDates: [
			'@1', '@2', '@12', '@123', '@2024', '@2024-', '@2024-0', '@2024-01-'
		]
	},

	// Priority validation errors
	priorityErrors: {
		invalidPriorities: [
			{ input: '#urgent', expectedError: 'Invalid priority' },
			{ input: '#critical', expectedError: 'Invalid priority' },
			{ input: '#normal', expectedError: 'Invalid priority' }
		],

		validPriorities: [
			'#low', '#medium', '#high', '#LOW', '#MEDIUM', '#HIGH'
		],

		partialPriorities: [
			'#l', '#m', '#h'  // Should not error
		]
	},

	// Color validation errors
	colorErrors: {
		invalidColors: [
			{ input: 'color:#', expectedError: 'Invalid hex color format' },
			{ input: 'color:#12', expectedError: 'Invalid hex color format' },
			{ input: 'color:#1234567', expectedError: 'Invalid hex color format' },
			{ input: 'color:#gggggg', expectedError: 'Invalid hex color format' },
			{ input: 'color:red', expectedError: 'Invalid hex color format' }
		],

		validColors: [
			'color:#000', 'color:#fff', 'color:#123456',
			'color:#ABCDEF', 'color:#abcdef', 'color:#a1b2c3'
		]
	},

	// Tag validation errors
	tagErrors: {
		invalidTags: [
			{ input: '[tag<script>]', expectedError: 'special characters', type: 'warning' },
			{ input: '[tag"quote]', expectedError: 'special characters', type: 'warning' }
		],

		validTags: [
			'[tag]', '[important]', '[work]', '[tag-name]', '[tag_name]', '[tag.name]',
			'[x]', '[X]', '[ ]', '[]'  // Task checkboxes
		],

		incompleteTags: [
			'[incomplete'  // Should show warning
		]
	},

	// Assignee validation errors
	assigneeErrors: {
		invalidAssignees: [
			{ input: '+123user', expectedError: 'Invalid assignee format' },
			{ input: '+user@domain', expectedError: 'Invalid assignee format' },
			{ input: '+user space', expectedError: 'Invalid assignee format' },
			{ input: '+-user', expectedError: 'Invalid assignee format' }
		],

		validAssignees: [
			'+user', '+user123', '+user_name', '+user.name', '+user-name'
		]
	}
};

// Performance test data
export const performanceTestData = {
	// Large datasets for performance testing
	largeSets: {
		manyPatterns: '@today '.repeat(100) + '#high '.repeat(100) + '[tag] '.repeat(100),
		veryLongText: 'a'.repeat(10000) + ' @today #high [tag] +user color:#ff0000',
		deepNesting: '[[[[[[nested]]]]]] @today',
		rapidChanges: Array.from({ length: 1000 }, (_, i) => `change${i}`)
	},

	// Regex backtracking scenarios
	backtrackingTests: [
		'@' + 'a'.repeat(100),     // Could cause backtracking
		'#' + 'b'.repeat(100),     // Could cause backtracking
		'color:' + '#'.repeat(100) // Could cause backtracking
	],

	// Stress test patterns
	stressTests: {
		manyErrors: Array.from({ length: 100 }, (_, i) => `@invalid${i}`).join(' '),
		mixedValidInvalid: Array.from({ length: 50 }, (_, i) => 
			i % 2 === 0 ? '@today' : '@invalid'
		).join(' ')
	}
};

// Mock validation errors for testing components
export const mockValidationErrors: Record<string, ValidationError[]> = {
	singleError: [
		{
			type: 'error',
			message: 'Invalid date format. Use keywords like "today", "tomorrow" or YYYY-MM-DD format.',
			startIndex: 0,
			endIndex: 10,
			suggestion: 'today'
		}
	],

	singleWarning: [
		{
			type: 'warning',
			message: 'Incomplete pattern - missing closing bracket',
			startIndex: 15,
			endIndex: 20
		}
	],

	mixedErrorsAndWarnings: [
		{
			type: 'error',
			message: 'Invalid date format. Use keywords like "today", "tomorrow" or YYYY-MM-DD format.',
			startIndex: 0,
			endIndex: 10,
			suggestion: 'today'
		},
		{
			type: 'warning',
			message: 'Incomplete pattern - missing closing bracket',
			startIndex: 15,
			endIndex: 20
		},
		{
			type: 'error',
			message: 'Invalid priority. Use "low", "medium", or "high".',
			startIndex: 25,
			endIndex: 35,
			suggestion: 'medium'
		}
	],

	manyErrors: Array.from({ length: 10 }, (_, i) => ({
		type: 'error' as const,
		message: `Error message ${i + 1}`,
		startIndex: i * 10,
		endIndex: (i + 1) * 10,
		suggestion: `suggestion${i + 1}`
	})),

	errorsWithoutSuggestions: [
		{
			type: 'error',
			message: 'Error without suggestion',
			startIndex: 0,
			endIndex: 5
		}
	],

	malformedErrors: [
		{
			type: 'error',
			message: null as any,
			startIndex: 0,
			endIndex: 5
		},
		{
			// Missing type
			message: 'Message without type',
			startIndex: 0,
			endIndex: 5
		} as any,
		{
			type: 'error'
			// Missing message
		} as any
	]
};

// Regression test cases - specific bugs that were found and fixed
export const regressionTests = {
	// The "@2" bug - showing "Invalid date format" error for partial input
	at2Bug: {
		description: 'Typing "@2" should not show validation error',
		input: '@2',
		expectedErrors: 0,
		expectedErrorType: null,
		context: 'User typing a date progressively should not see errors for partial valid inputs'
	},

	// Empty validation crashes
	emptyValidationCrash: {
		description: 'Empty inputs should not crash validation',
		inputs: ['', null, undefined],
		expectedBehavior: 'Should not throw errors'
	},

	// Rapid typing causes validation storms
	rapidTypingStorm: {
		description: 'Rapid typing should be debounced to prevent validation storm',
		sequence: ['a', 'ab', 'abc', 'abcd', 'abcde'],
		expectedBehavior: 'Should debounce validation calls'
	},

	// Unicode characters breaking regex
	unicodeBreaksRegex: {
		description: 'Unicode characters should not break validation regex',
		inputs: ['@今天', '#élevé', '[🏷️tag]', '+用户'],
		expectedBehavior: 'Should handle gracefully without crashing'
	},

	// Memory leak on rapid mount/unmount
	memoryLeak: {
		description: 'Rapid mount/unmount should not cause memory leaks',
		scenario: 'Mount and unmount component 100 times rapidly',
		expectedBehavior: 'All cleanup functions should be called'
	}
};

// Test scenarios for different user workflows
export const userWorkflows = {
	// New user learning the system
	newUserLearning: [
		'',                    // Starting empty
		'T',                   // Typing first character
		'Task',                // Basic task
		'Task @',              // Adding date
		'Task @t',             // Partial date
		'Task @today',         // Complete date
		'Task @today #',       // Adding priority
		'Task @today #h',      // Partial priority
		'Task @today #high',   // Complete priority
		'Task @today #high [', // Adding tag
		'Task @today #high [urgent]' // Complete task
	],

	// Power user rapid entry
	powerUserRapid: [
		'Review docs @tomorrow #medium [docs] +reviewer',
		'Fix login bug @today #high [bug] +developer color:#ff0000',
		'Team meeting [x] @2024-01-20 +team #low',
		'Release v2.0 @2024-02-01 #high [release] +manager'
	],

	// User making mistakes and correcting
	mistakeCorrection: [
		'Task @invaliddate',      // Mistake
		'Task @invalid',          // Still wrong
		'Task @',                 // Clearing
		'Task @today',            // Corrected
		'Task @today #wrong',     // Another mistake
		'Task @today #high'       // Corrected
	]
};

// Component integration test scenarios
export const integrationScenarios = {
	// Enhanced input with validation tooltip
	enhancedInputWithTooltip: {
		scenarios: [
			{
				name: 'Show error tooltip on invalid input',
				input: '@invaliddate',
				expectedTooltipOpen: true,
				expectedErrorCount: 1
			},
			{
				name: 'Hide tooltip on valid input',
				input: '@today',
				expectedTooltipOpen: false,
				expectedErrorCount: 0
			},
			{
				name: 'Show mixed errors and warnings',
				input: '@invaliddate [incomplete',
				expectedTooltipOpen: true,
				expectedErrorCount: 2 // One error, one warning
			}
		]
	},

	// CodeMirror integration scenarios
	codeMirrorIntegration: {
		scenarios: [
			{
				name: 'Initialize editor successfully',
				expectedCalls: ['EditorState.create', 'EditorView constructor']
			},
			{
				name: 'Handle initialization failure gracefully',
				simulateError: 'EditorView constructor throws',
				expectedBehavior: 'Should not crash, should render fallback'
			},
			{
				name: 'Clean up on unmount',
				action: 'unmount',
				expectedCalls: ['EditorView.destroy']
			}
		]
	},

	// Autocompletion integration scenarios
	autocompletionIntegration: {
		scenarios: [
			{
				name: 'Show completions for @',
				cursorAfter: '@',
				expectedCompletions: ['today', 'tomorrow']
			},
			{
				name: 'No completions for regular text',
				cursorAfter: 'regular text',
				expectedCompletions: []
			}
		]
	}
};

// Export utility functions for creating test data
export const testDataGenerators = {
	// Generate validation errors with different patterns
	generateErrors: (count: number, type: 'error' | 'warning' = 'error'): ValidationError[] =>
		Array.from({ length: count }, (_, i) => ({
			type,
			message: `${type} message ${i + 1}`,
			startIndex: i * 10,
			endIndex: (i + 1) * 10,
			suggestion: `suggestion${i + 1}`
		})),

	// Generate progressive typing sequences
	generateTypingSequence: (finalText: string): string[] => {
		const sequence = [];
		for (let i = 1; i <= finalText.length; i++) {
			sequence.push(finalText.substring(0, i));
		}
		return sequence;
	},

	// Generate random valid patterns
	generateValidPattern: (type: 'date' | 'priority' | 'tag' | 'assignee' | 'color'): string => {
		const patterns = {
			date: ['@today', '@tomorrow', '@2024-01-15', '@monday', '@next'],
			priority: ['#low', '#medium', '#high'],
			tag: ['[work]', '[personal]', '[urgent]', '[bug]', '[feature]'],
			assignee: ['+user', '+developer', '+manager', '+reviewer', '+tester'],
			color: ['color:#ff0000', 'color:#00ff00', 'color:#0000ff', 'color:#fff', 'color:#000']
		};

		const options = patterns[type];
		return options[Math.floor(Math.random() * options.length)];
	},

	// Generate mixed pattern text
	generateMixedText: (patternCount: number = 3): string => {
		const types: Array<'date' | 'priority' | 'tag' | 'assignee' | 'color'> = 
			['date', 'priority', 'tag', 'assignee', 'color'];
		
		const patterns = [];
		for (let i = 0; i < patternCount; i++) {
			const type = types[Math.floor(Math.random() * types.length)];
			patterns.push(testDataGenerators.generateValidPattern(type));
		}
		
		return `Task with patterns: ${patterns.join(' ')}`;
	}
};

export default {
	realWorldInputs,
	validationScenarios,
	performanceTestData,
	mockValidationErrors,
	regressionTests,
	userWorkflows,
	integrationScenarios,
	testDataGenerators
};