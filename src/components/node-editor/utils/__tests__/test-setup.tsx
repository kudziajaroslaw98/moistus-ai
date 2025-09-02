/**
 * Centralized test setup and mocking infrastructure
 * Provides consistent mocking for CodeMirror, motion, and other dependencies
 */

// Mock CodeMirror core modules
export const mockCodeMirror = () => {
	// Mock EditorView
	const mockEditorView = {
		destroy: jest.fn(),
		focus: jest.fn(),
		dispatch: jest.fn(),
		state: {
			doc: {
				toString: () => ''
			}
		}
	};

	// Mock EditorState
	const mockEditorState = {
		create: jest.fn(() => ({
			doc: {
				toString: () => ''
			}
		}))
	};

	// Mock Compartment
	const mockCompartment = jest.fn(() => ({
		reconfigure: jest.fn(),
		of: jest.fn()
	}));

	// Mock autocompletion
	const mockAutocompletion = jest.fn(() => []);

	return {
		mockEditorView,
		mockEditorState,
		mockCompartment,
		mockAutocompletion
	};
};

// Mock motion/react components
export const mockMotion = () => {
	const MockMotionDiv = ({ children, className, ...props }: any) => (
		<div className={className} {...props} data-testid="motion-div">
			{children}
		</div>
	);

	const MockAnimatePresence = ({ children }: any) => (
		<div data-testid="animate-presence">{children}</div>
	);

	return {
		motion: {
			div: MockMotionDiv
		},
		AnimatePresence: MockAnimatePresence
	};
};

// Mock mindmap language utilities
export const mockMindmapLang = () => ({
	mindmapLang: jest.fn(() => []),
	mindmapCSS: 'mocked-css'
});

// Mock validation utilities
export const createMockValidationError = (overrides: Partial<any> = {}) => ({
	type: 'error',
	message: 'Mock validation error',
	startIndex: 0,
	endIndex: 5,
	suggestion: 'mock-suggestion',
	...overrides
});

export const mockValidationUtils = () => {
	const mockGetValidationResults = jest.fn(() => []);
	const mockValidateInput = jest.fn(() => []);
	const mockFindIncompletePatterns = jest.fn(() => []);

	return {
		getValidationResults: mockGetValidationResults,
		validateInput: mockValidateInput,
		findIncompletePatterns: mockFindIncompletePatterns
	};
};

// Mock CN utility
export const mockCn = () => {
	return jest.fn((...classes: any[]) => classes.filter(Boolean).join(' '));
};

// Test utilities for common scenarios
export const testUtils = {
	// Create mock validation errors for different scenarios
	createDateError: () => createMockValidationError({
		type: 'error',
		message: 'Invalid date format. Use keywords like "today", "tomorrow" or YYYY-MM-DD format.',
		suggestion: 'today'
	}),

	createPriorityError: () => createMockValidationError({
		type: 'error',
		message: 'Invalid priority. Use "low", "medium", or "high".',
		suggestion: 'medium'
	}),

	createColorError: () => createMockValidationError({
		type: 'error',
		message: 'Invalid hex color format. Use #RGB or #RRGGBB format.',
		suggestion: '#000000'
	}),

	createTagError: () => createMockValidationError({
		type: 'error',
		message: 'Tags cannot be empty.',
		suggestion: 'new-tag'
	}),

	createAssigneeError: () => createMockValidationError({
		type: 'error',
		message: 'Invalid assignee format. Must start with letter and contain only letters, numbers, dots, underscores, or hyphens.',
		suggestion: 'username'
	}),

	createWarning: () => createMockValidationError({
		type: 'warning',
		message: 'Incomplete pattern - missing closing bracket'
	}),

	// Create arrays of mixed errors for testing
	createMixedErrors: () => [
		testUtils.createDateError(),
		testUtils.createWarning()
	],

	// Common test inputs that should trigger specific behaviors
	testInputs: {
		// Valid inputs that should not generate errors
		validInputs: [
			'@today',
			'@tomorrow',
			'@2024-01-15',
			'#low',
			'#medium',
			'#high',
			'[task]',
			'[x]',
			'[ ]',
			'+user',
			'+user123',
			'color:#ff0000',
			'color:#000'
		],

		// Invalid complete inputs that should generate errors
		invalidCompleteInputs: [
			'@invaliddate',
			'@2024-13-01',
			'@2024-01-32',
			'#invalid',
			'[',
			'+123user',
			'+user@domain',
			'color:#xyz',
			'color:#'
		],

		// Partial inputs that should NOT generate errors (key for @2 bug)
		partialInputs: [
			'@',
			'@2',
			'@20',
			'@202',
			'#',
			'#l',
			'#m',
			'[',
			'[t',
			'+',
			'+u',
			'color:',
			'color:#'
		],

		// Progressive typing sequences
		progressiveSequences: {
			date: ['@', '@2', '@20', '@202', '@2024', '@2024-', '@2024-0', '@2024-01', '@2024-01-', '@2024-01-15'],
			priority: ['#', '#l', '#lo', '#low'],
			tag: ['[', '[t', '[ta', '[tag', '[tag]'],
			assignee: ['+', '+u', '+us', '+use', '+user'],
			color: ['c', 'co', 'col', 'colo', 'color', 'color:', 'color:#', 'color:#f', 'color:#ff', 'color:#ff0000']
		}
	}
};

// Setup function to initialize all mocks
export const setupTestMocks = () => {
	const codeMirrorMocks = mockCodeMirror();
	const motionMocks = mockMotion();
	const mindmapMocks = mockMindmapLang();
	const validationMocks = mockValidationUtils();
	const cnMock = mockCn();

	// Apply all mocks
	jest.doMock('@codemirror/view', () => ({
		EditorView: jest.fn().mockImplementation(() => codeMirrorMocks.mockEditorView)
	}));

	jest.doMock('@codemirror/state', () => ({
		EditorState: codeMirrorMocks.mockEditorState,
		Compartment: codeMirrorMocks.mockCompartment
	}));

	jest.doMock('@codemirror/autocomplete', () => ({
		autocompletion: codeMirrorMocks.mockAutocompletion
	}));

	jest.doMock('motion/react', () => motionMocks);

	jest.doMock('../../utils/codemirror-mindmap-lang', () => mindmapMocks);

	jest.doMock('../../utils/validation', () => validationMocks);

	jest.doMock('@/utils/cn', () => ({ cn: cnMock }));

	return {
		codeMirrorMocks,
		motionMocks,
		mindmapMocks,
		validationMocks,
		cnMock
	};
};

// Helper to create test props for components
export const createTestProps = {
	enhancedInput: (overrides: any = {}) => ({
		value: '',
		onChange: jest.fn(),
		onKeyDown: jest.fn(),
		onSelectionChange: jest.fn(),
		placeholder: 'Test placeholder',
		disabled: false,
		...overrides
	}),

	validationTooltip: (overrides: any = {}) => ({
		children: <div data-testid="child-content">Child Content</div>,
		errors: [],
		isOpen: false,
		onOpenChange: jest.fn(),
		...overrides
	})
};

// Performance testing utilities
export const performanceUtils = {
	// Measure execution time of a function
	measureExecutionTime: async (fn: () => Promise<void> | void): Promise<number> => {
		const start = performance.now();
		await fn();
		const end = performance.now();
		return end - start;
	},

	// Test with large amounts of data
	createLargeDataset: (size: number = 1000) => ({
		longText: 'a'.repeat(size),
		manyErrors: Array.from({ length: size }, (_, i) => 
			createMockValidationError({
				message: `Error ${i}`,
				startIndex: i * 10,
				endIndex: (i + 1) * 10
			})
		),
		rapidChanges: Array.from({ length: size }, (_, i) => `value${i}`)
	}),

	// Timer utilities for debounce testing
	setupFakeTimers: () => {
		jest.useFakeTimers();
		return () => {
			jest.runAllTimers();
			jest.useRealTimers();
		};
	}
};

// Error boundary testing utilities
export const errorUtils = {
	// Create errors that might crash components
	createCrashingError: () => {
		const error = new Error('Test error');
		error.stack = 'Mock stack trace';
		return error;
	},

	// Mock console methods to suppress logs during testing
	mockConsole: () => {
		const originalConsole = { ...console };
		console.error = jest.fn();
		console.warn = jest.fn();
		console.log = jest.fn();
		
		return () => {
			Object.assign(console, originalConsole);
		};
	}
};

// Type-safe test assertion helpers
export const assertions = {
	// Check if validation errors have correct structure
	validateErrorStructure: (error: any) => {
		expect(error).toHaveProperty('type');
		expect(error).toHaveProperty('message');
		expect(error).toHaveProperty('startIndex');
		expect(error).toHaveProperty('endIndex');
		expect(typeof error.type).toBe('string');
		expect(typeof error.message).toBe('string');
		expect(typeof error.startIndex).toBe('number');
		expect(typeof error.endIndex).toBe('number');
		expect(error.startIndex).toBeLessThanOrEqual(error.endIndex);
	},

	// Check if component handles errors gracefully
	expectNoThrow: (fn: () => void) => {
		expect(fn).not.toThrow();
	},

	// Check performance constraints
	expectPerformant: (executionTime: number, maxTime: number = 100) => {
		expect(executionTime).toBeLessThan(maxTime);
	}
};

export default {
	mockCodeMirror,
	mockMotion,
	mockMindmapLang,
	mockValidationUtils,
	mockCn,
	testUtils,
	setupTestMocks,
	createTestProps,
	performanceUtils,
	errorUtils,
	assertions,
	createMockValidationError
};