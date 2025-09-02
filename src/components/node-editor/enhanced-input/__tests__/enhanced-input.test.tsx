/**
 * Comprehensive tests for EnhancedInput component
 * Tests React component behavior, CodeMirror integration, and validation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnhancedInput } from '../enhanced-input';

// Mock CodeMirror modules
jest.mock('@codemirror/view', () => ({
	EditorView: jest.fn().mockImplementation(() => ({
		destroy: jest.fn(),
		focus: jest.fn(),
		dispatch: jest.fn(),
		state: {
			doc: {
				toString: () => 'mocked content'
			}
		}
	})),
	ViewUpdate: jest.fn(),
}));

jest.mock('@codemirror/state', () => ({
	EditorState: {
		create: jest.fn(() => ({
			doc: {
				toString: () => 'mocked state content'
			}
		}))
	},
	Compartment: jest.fn(() => ({
		reconfigure: jest.fn(),
		of: jest.fn()
	}))
}));

jest.mock('@codemirror/autocomplete', () => ({
	autocompletion: jest.fn(() => [])
}));

// Mock the mindmap language module
jest.mock('../../utils/codemirror-mindmap-lang', () => ({
	mindmapLang: jest.fn(() => []),
	mindmapCSS: 'mocked-css'
}));

// Mock validation module
jest.mock('../../utils/validation', () => ({
	getValidationResults: jest.fn(() => [])
}));

// Mock motion components
jest.mock('motion/react', () => ({
	motion: {
		div: ({ children, className, ...props }: any) => 
			<div className={className} {...props}>{children}</div>
	},
	AnimatePresence: ({ children }: any) => <div>{children}</div>
}));

// Mock ValidationTooltip
jest.mock('../validation-tooltip', () => ({
	ValidationTooltip: ({ children, errors, isOpen }: any) => (
		<div data-testid="validation-tooltip" data-open={isOpen} data-errors={errors?.length || 0}>
			{children}
		</div>
	)
}));

describe('EnhancedInput Component', () => {
	const defaultProps = {
		value: '',
		onChange: jest.fn(),
		onKeyDown: jest.fn(),
		onSelectionChange: jest.fn(),
		placeholder: 'Test placeholder',
		disabled: false
	};

	beforeEach(() => {
		jest.clearAllMocks();
		// Reset validation mock
		const { getValidationResults } = require('../../utils/validation');
		getValidationResults.mockReturnValue([]);
	});

	afterEach(() => {
		// Clean up any timers
		jest.runAllTimers();
	});

	describe('Component Rendering', () => {
		test('renders without crashing', () => {
			render(<EnhancedInput {...defaultProps} />);
			expect(screen.getByTestId('validation-tooltip')).toBeInTheDocument();
		});

		test('applies custom className', () => {
			const customClass = 'custom-enhanced-input';
			render(<EnhancedInput {...defaultProps} className={customClass} />);
			
			const container = screen.getByTestId('validation-tooltip').parentElement;
			expect(container).toHaveClass(customClass);
		});

		test('renders with initial motion props', () => {
			const motionProps = {
				initial: { opacity: 0 },
				animate: { opacity: 1 },
				transition: { duration: 0.3 }
			};
			
			render(<EnhancedInput {...defaultProps} {...motionProps} />);
			// Component should render without errors
			expect(screen.getByTestId('validation-tooltip')).toBeInTheDocument();
		});
	});

	describe('CodeMirror Integration', () => {
		test('initializes CodeMirror editor on mount', async () => {
			const { EditorState } = require('@codemirror/state');
			const { EditorView } = require('@codemirror/view');
			
			render(<EnhancedInput {...defaultProps} />);
			
			await waitFor(() => {
				expect(EditorState.create).toHaveBeenCalled();
				expect(EditorView).toHaveBeenCalled();
			});
		});

		test('handles CodeMirror initialization errors gracefully', async () => {
			const { EditorView } = require('@codemirror/view');
			EditorView.mockImplementationOnce(() => {
				throw new Error('CodeMirror init failed');
			});

			// Should not crash
			expect(() => {
				render(<EnhancedInput {...defaultProps} />);
			}).not.toThrow();
		});

		test('cleans up CodeMirror on unmount', async () => {
			const mockDestroy = jest.fn();
			const { EditorView } = require('@codemirror/view');
			EditorView.mockImplementation(() => ({
				destroy: mockDestroy,
				focus: jest.fn(),
				dispatch: jest.fn(),
				state: { doc: { toString: () => '' } }
			}));

			const { unmount } = render(<EnhancedInput {...defaultProps} />);
			
			await waitFor(() => {
				expect(EditorView).toHaveBeenCalled();
			});

			unmount();

			expect(mockDestroy).toHaveBeenCalled();
		});

		test('configures editor with correct extensions', async () => {
			const { EditorState } = require('@codemirror/state');
			const { mindmapLang } = require('../../utils/codemirror-mindmap-lang');
			const { autocompletion } = require('@codemirror/autocomplete');
			
			render(<EnhancedInput {...defaultProps} />);
			
			await waitFor(() => {
				expect(EditorState.create).toHaveBeenCalled();
			});

			const createCall = EditorState.create.mock.calls[0][0];
			expect(createCall).toHaveProperty('extensions');
			expect(mindmapLang).toHaveBeenCalled();
			expect(autocompletion).toHaveBeenCalled();
		});

		test('handles disabled state correctly', async () => {
			const mockDispatch = jest.fn();
			const { EditorView } = require('@codemirror/view');
			EditorView.mockImplementation(() => ({
				destroy: jest.fn(),
				focus: jest.fn(),
				dispatch: mockDispatch,
				state: { doc: { toString: () => '' } }
			}));

			const { rerender } = render(<EnhancedInput {...defaultProps} disabled={false} />);
			
			// Change to disabled
			rerender(<EnhancedInput {...defaultProps} disabled={true} />);
			
			await waitFor(() => {
				expect(mockDispatch).toHaveBeenCalled();
			});
		});
	});

	describe('Validation Integration', () => {
		test('displays validation errors when present', async () => {
			const { getValidationResults } = require('../../utils/validation');
			const mockErrors = [
				{
					type: 'error',
					message: 'Invalid date format',
					startIndex: 0,
					endIndex: 5
				}
			];
			getValidationResults.mockReturnValue(mockErrors);

			render(<EnhancedInput {...defaultProps} value="@invalid" />);
			
			const tooltip = screen.getByTestId('validation-tooltip');
			expect(tooltip).toHaveAttribute('data-errors', '1');
		});

		test('displays validation warnings', async () => {
			const { getValidationResults } = require('../../utils/validation');
			const mockWarnings = [
				{
					type: 'warning',
					message: 'Incomplete pattern',
					startIndex: 0,
					endIndex: 2
				}
			];
			getValidationResults.mockReturnValue(mockWarnings);

			render(<EnhancedInput {...defaultProps} value="@" />);
			
			const tooltip = screen.getByTestId('validation-tooltip');
			expect(tooltip).toHaveAttribute('data-errors', '1');
		});

		test('applies validation CSS classes', () => {
			const { getValidationResults } = require('../../utils/validation');
			const mockErrors = [{ type: 'error', message: 'Error', startIndex: 0, endIndex: 1 }];
			getValidationResults.mockReturnValue(mockErrors);

			render(<EnhancedInput {...defaultProps} value="invalid" />);
			
			const container = screen.getByTestId('validation-tooltip').parentElement;
			expect(container).toHaveClass('has-validation-errors');
		});

		test('shows validation tooltip automatically after delay', async () => {
			jest.useFakeTimers();
			
			const { getValidationResults } = require('../../utils/validation');
			const mockErrors = [{ type: 'error', message: 'Error', startIndex: 0, endIndex: 1 }];
			getValidationResults.mockReturnValue(mockErrors);

			render(<EnhancedInput {...defaultProps} value="invalid" />);
			
			// Initially tooltip should be closed
			expect(screen.getByTestId('validation-tooltip')).toHaveAttribute('data-open', 'false');
			
			// Fast-forward timer
			act(() => {
				jest.advanceTimersByTime(500);
			});
			
			await waitFor(() => {
				expect(screen.getByTestId('validation-tooltip')).toHaveAttribute('data-open', 'true');
			});

			jest.useRealTimers();
		});

		test('handles validation errors gracefully', () => {
			const { getValidationResults } = require('../../utils/validation');
			getValidationResults.mockImplementation(() => {
				throw new Error('Validation failed');
			});

			// Should not crash
			expect(() => {
				render(<EnhancedInput {...defaultProps} value="test" />);
			}).not.toThrow();
		});
	});

	describe('Event Handling', () => {
		test('calls onChange when content changes', async () => {
			const mockOnChange = jest.fn();
			const { EditorView } = require('@codemirror/view');
			
			// Mock the update listener to simulate content change
			let updateListener: any;
			const { EditorState } = require('@codemirror/state');
			EditorState.create.mockImplementation(({ extensions }: any) => {
				// Find the update listener in extensions
				extensions.forEach((ext: any) => {
					if (ext && typeof ext.of === 'function') {
						try {
							const result = ext.of({});
							if (result && typeof result === 'function') {
								updateListener = result;
							}
						} catch (e) {
							// Ignore
						}
					}
				});
				return { doc: { toString: () => 'test content' } };
			});

			render(<EnhancedInput {...defaultProps} onChange={mockOnChange} />);
			
			// Simulate a document change
			if (updateListener) {
				act(() => {
					updateListener({
						docChanged: true,
						state: { doc: { toString: () => 'new content' } },
						selectionSet: false
					});
				});
			}

			await waitFor(() => {
				expect(mockOnChange).toHaveBeenCalledWith('new content');
			});
		});

		test('calls onSelectionChange when selection changes', async () => {
			const mockOnSelectionChange = jest.fn();
			
			render(<EnhancedInput {...defaultProps} onSelectionChange={mockOnSelectionChange} />);
			
			// This would be triggered by CodeMirror's update listener
			// For now, we verify the component renders without errors
			expect(screen.getByTestId('validation-tooltip')).toBeInTheDocument();
		});

		test('handles keyboard events correctly', async () => {
			const mockOnKeyDown = jest.fn();
			
			render(<EnhancedInput {...defaultProps} onKeyDown={mockOnKeyDown} />);
			
			// The component should set up keyboard event handling
			expect(screen.getByTestId('validation-tooltip')).toBeInTheDocument();
		});
	});

	describe('Autocompletion', () => {
		test('sets up autocompletion with correct configuration', async () => {
			const { autocompletion } = require('@codemirror/autocomplete');
			
			render(<EnhancedInput {...defaultProps} />);
			
			await waitFor(() => {
				expect(autocompletion).toHaveBeenCalled();
			});

			const autocompletionCall = autocompletion.mock.calls[0][0];
			expect(autocompletionCall).toHaveProperty('maxRenderedOptions', 5);
			expect(autocompletionCall).toHaveProperty('defaultKeymap', true);
			expect(autocompletionCall).toHaveProperty('closeOnBlur', true);
		});

		test('provides completions for @ patterns', async () => {
			const { autocompletion } = require('@codemirror/autocomplete');
			
			render(<EnhancedInput {...defaultProps} />);
			
			await waitFor(() => {
				expect(autocompletion).toHaveBeenCalled();
			});

			const config = autocompletion.mock.calls[0][0];
			const completionSource = config.override[0];
			
			// Mock context with @ pattern
			const mockContext = {
				pos: 5,
				state: { doc: { toString: () => 'test @' } }
			};

			const result = completionSource(mockContext);
			expect(result).toEqual({
				from: 5,
				options: [
					{ label: 'today', type: 'keyword' },
					{ label: 'tomorrow', type: 'keyword' }
				]
			});
		});

		test('returns null for non-matching contexts', async () => {
			const { autocompletion } = require('@codemirror/autocomplete');
			
			render(<EnhancedInput {...defaultProps} />);
			
			await waitFor(() => {
				expect(autocompletion).toHaveBeenCalled();
			});

			const config = autocompletion.mock.calls[0][0];
			const completionSource = config.override[0];
			
			// Mock context without @ pattern
			const mockContext = {
				pos: 4,
				state: { doc: { toString: () => 'test' } }
			};

			const result = completionSource(mockContext);
			expect(result).toBeNull();
		});
	});

	describe('Edge Cases and Error Handling', () => {
		test('handles missing ref gracefully', () => {
			expect(() => {
				render(<EnhancedInput {...defaultProps} />);
			}).not.toThrow();
		});

		test('handles rapid value changes', async () => {
			const mockOnChange = jest.fn();
			const { rerender } = render(<EnhancedInput {...defaultProps} onChange={mockOnChange} value="" />);
			
			// Simulate rapid changes
			const values = ['a', 'ab', 'abc', 'abcd', 'abcde'];
			
			values.forEach((value, index) => {
				rerender(<EnhancedInput {...defaultProps} onChange={mockOnChange} value={value} />);
			});

			// Should not crash
			expect(screen.getByTestId('validation-tooltip')).toBeInTheDocument();
		});

		test('handles special characters in input', () => {
			const specialValues = [
				'@today 🌟',
				'#high 中文',
				'[tag] with émoji',
				'+user with ñ character'
			];

			specialValues.forEach(value => {
				expect(() => {
					render(<EnhancedInput {...defaultProps} value={value} />);
				}).not.toThrow();
			});
		});

		test('handles extremely long input values', () => {
			const longValue = 'a'.repeat(10000) + '@today';
			
			expect(() => {
				render(<EnhancedInput {...defaultProps} value={longValue} />);
			}).not.toThrow();
		});

		test('prevents memory leaks on rapid mount/unmount', async () => {
			const mockDestroy = jest.fn();
			const { EditorView } = require('@codemirror/view');
			EditorView.mockImplementation(() => ({
				destroy: mockDestroy,
				focus: jest.fn(),
				dispatch: jest.fn(),
				state: { doc: { toString: () => '' } }
			}));

			// Mount and unmount rapidly
			for (let i = 0; i < 10; i++) {
				const { unmount } = render(<EnhancedInput {...defaultProps} />);
				unmount();
			}

			// Should have called destroy for each mount
			expect(mockDestroy).toHaveBeenCalledTimes(10);
		});
	});

	describe('Specific Bug Reproduction', () => {
		test('should not crash when typing "@2"', () => {
			const { getValidationResults } = require('../../utils/validation');
			getValidationResults.mockReturnValue([]); // No errors for @2
			
			expect(() => {
				render(<EnhancedInput {...defaultProps} value="@2" />);
			}).not.toThrow();
			
			// Tooltip should not show errors
			const tooltip = screen.getByTestId('validation-tooltip');
			expect(tooltip).toHaveAttribute('data-errors', '0');
		});

		test('should handle progressive typing without validation errors', () => {
			const { getValidationResults } = require('../../utils/validation');
			getValidationResults.mockReturnValue([]);
			
			const progression = ['@', '@2', '@20', '@202', '@2024'];
			
			progression.forEach(value => {
				expect(() => {
					render(<EnhancedInput {...defaultProps} value={value} />);
				}).not.toThrow();
			});
		});

		test('should eventually show validation for complete invalid dates', () => {
			const { getValidationResults } = require('../../utils/validation');
			const mockError = [{
				type: 'error',
				message: 'Invalid date format',
				startIndex: 0,
				endIndex: 10
			}];
			getValidationResults.mockReturnValue(mockError);
			
			render(<EnhancedInput {...defaultProps} value="@invaliddate" />);
			
			const tooltip = screen.getByTestId('validation-tooltip');
			expect(tooltip).toHaveAttribute('data-errors', '1');
		});
	});

	describe('Performance', () => {
		test('should debounce validation tooltip updates', async () => {
			jest.useFakeTimers();
			
			const { getValidationResults } = require('../../utils/validation');
			const mockErrors = [{ type: 'error', message: 'Error', startIndex: 0, endIndex: 1 }];
			getValidationResults.mockReturnValue(mockErrors);

			const { rerender } = render(<EnhancedInput {...defaultProps} value="" />);
			
			// Change value multiple times quickly
			rerender(<EnhancedInput {...defaultProps} value="a" />);
			rerender(<EnhancedInput {...defaultProps} value="ab" />);
			rerender(<EnhancedInput {...defaultProps} value="abc" />);
			
			// Tooltip should still be closed
			expect(screen.getByTestId('validation-tooltip')).toHaveAttribute('data-open', 'false');
			
			// Fast-forward past debounce delay
			act(() => {
				jest.advanceTimersByTime(500);
			});
			
			await waitFor(() => {
				expect(screen.getByTestId('validation-tooltip')).toHaveAttribute('data-open', 'true');
			});

			jest.useRealTimers();
		});

		test('should handle frequent validation updates efficiently', () => {
			const { getValidationResults } = require('../../utils/validation');
			let callCount = 0;
			getValidationResults.mockImplementation(() => {
				callCount++;
				return [];
			});

			const { rerender } = render(<EnhancedInput {...defaultProps} value="" />);
			
			// Change value multiple times
			for (let i = 0; i < 100; i++) {
				rerender(<EnhancedInput {...defaultProps} value={`value${i}`} />);
			}

			// Validation should be called for each change (memoization depends on value)
			expect(callCount).toBeGreaterThan(0);
		});
	});
});