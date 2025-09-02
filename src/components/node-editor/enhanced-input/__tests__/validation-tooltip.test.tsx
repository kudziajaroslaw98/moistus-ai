/**
 * Comprehensive tests for ValidationTooltip component
 * Tests tooltip display logic, error message rendering, and user interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ValidationTooltip } from '../validation-tooltip';
import { type ValidationError } from '../../utils/validation';

// Mock motion components
jest.mock('motion/react', () => ({
	AnimatePresence: ({ children }: any) => <div data-testid="animate-presence">{children}</div>,
	motion: {
		div: ({ children, className, ...props }: any) => 
			<div className={className} {...props} data-testid="motion-div">{children}</div>
	}
}));

// Mock cn utility
jest.mock('@/utils/cn', () => ({
	cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}));

describe('ValidationTooltip Component', () => {
	const mockErrors: ValidationError[] = [
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
		}
	];

	const defaultProps = {
		children: <div data-testid="child-content">Child Content</div>,
		errors: [],
		isOpen: false,
		onOpenChange: jest.fn()
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('Basic Rendering', () => {
		test('renders children when no errors', () => {
			render(<ValidationTooltip {...defaultProps} />);
			expect(screen.getByTestId('child-content')).toBeInTheDocument();
		});

		test('renders children when errors exist but tooltip is closed', () => {
			render(
				<ValidationTooltip 
					{...defaultProps} 
					errors={mockErrors} 
					isOpen={false} 
				/>
			);
			expect(screen.getByTestId('child-content')).toBeInTheDocument();
		});

		test('applies correct CSS classes based on error types', () => {
			const { container } = render(
				<ValidationTooltip 
					{...defaultProps} 
					errors={mockErrors} 
					isOpen={false} 
				/>
			);
			
			const trigger = container.querySelector('.validation-trigger');
			expect(trigger).toHaveClass('has-errors');
			expect(trigger).toHaveClass('has-warnings');
		});

		test('applies only error class when only errors present', () => {
			const errorOnlyErrors: ValidationError[] = [
				{
					type: 'error',
					message: 'Error only',
					startIndex: 0,
					endIndex: 5
				}
			];

			const { container } = render(
				<ValidationTooltip 
					{...defaultProps} 
					errors={errorOnlyErrors} 
					isOpen={false} 
				/>
			);
			
			const trigger = container.querySelector('.validation-trigger');
			expect(trigger).toHaveClass('has-errors');
			expect(trigger).not.toHaveClass('has-warnings');
		});

		test('applies only warning class when only warnings present', () => {
			const warningOnlyErrors: ValidationError[] = [
				{
					type: 'warning',
					message: 'Warning only',
					startIndex: 0,
					endIndex: 5
				}
			];

			const { container } = render(
				<ValidationTooltip 
					{...defaultProps} 
					errors={warningOnlyErrors} 
					isOpen={false} 
				/>
			);
			
			const trigger = container.querySelector('.validation-trigger');
			expect(trigger).not.toHaveClass('has-errors');
			expect(trigger).toHaveClass('has-warnings');
		});
	});

	describe('Tooltip Display', () => {
		test('does not render tooltip when closed', () => {
			render(
				<ValidationTooltip 
					{...defaultProps} 
					errors={mockErrors} 
					isOpen={false} 
				/>
			);
			
			expect(screen.queryByRole('button', { name: 'Dismiss errors' })).not.toBeInTheDocument();
		});

		test('renders tooltip when open with errors', () => {
			render(
				<ValidationTooltip 
					{...defaultProps} 
					errors={mockErrors} 
					isOpen={true} 
				/>
			);
			
			expect(screen.getByRole('button', { name: 'Dismiss errors' })).toBeInTheDocument();
		});

		test('displays error messages correctly', () => {
			render(
				<ValidationTooltip 
					{...defaultProps} 
					errors={mockErrors} 
					isOpen={true} 
				/>
			);
			
			expect(screen.getByText('Invalid date format. Use keywords like "today", "tomorrow" or YYYY-MM-DD format.')).toBeInTheDocument();
			expect(screen.getByText('Incomplete pattern - missing closing bracket')).toBeInTheDocument();
		});

		test('displays suggestions when available', () => {
			render(
				<ValidationTooltip 
					{...defaultProps} 
					errors={mockErrors} 
					isOpen={true} 
				/>
			);
			
			expect(screen.getByText('Try:')).toBeInTheDocument();
			expect(screen.getByText('today')).toBeInTheDocument();
		});

		test('uses error styling when errors are present', () => {
			const errorOnlyErrors: ValidationError[] = [
				{
					type: 'error',
					message: 'Error message',
					startIndex: 0,
					endIndex: 5
				}
			];

			const { container } = render(
				<ValidationTooltip 
					{...defaultProps} 
					errors={errorOnlyErrors} 
					isOpen={true} 
				/>
			);
			
			const tooltip = container.querySelector('.bg-red-900\\/95');
			expect(tooltip).toBeInTheDocument();
		});

		test('uses warning styling when only warnings are present', () => {
			const warningOnlyErrors: ValidationError[] = [
				{
					type: 'warning',
					message: 'Warning message',
					startIndex: 0,
					endIndex: 5
				}
			];

			const { container } = render(
				<ValidationTooltip 
					{...defaultProps} 
					errors={warningOnlyErrors} 
					isOpen={true} 
				/>
			);
			
			const tooltip = container.querySelector('.bg-yellow-900\\/95');
			expect(tooltip).toBeInTheDocument();
		});
	});

	describe('Error Type Indicators', () => {
		test('displays red indicator for errors', () => {
			const errorOnlyErrors: ValidationError[] = [
				{
					type: 'error',
					message: 'Error message',
					startIndex: 0,
					endIndex: 5
				}
			];

			const { container } = render(
				<ValidationTooltip 
					{...defaultProps} 
					errors={errorOnlyErrors} 
					isOpen={true} 
				/>
			);
			
			const indicator = container.querySelector('.bg-red-400');
			expect(indicator).toBeInTheDocument();
		});

		test('displays yellow indicator for warnings', () => {
			const warningOnlyErrors: ValidationError[] = [
				{
					type: 'warning',
					message: 'Warning message',
					startIndex: 0,
					endIndex: 5
				}
			];

			const { container } = render(
				<ValidationTooltip 
					{...defaultProps} 
					errors={warningOnlyErrors} 
					isOpen={true} 
				/>
			);
			
			const indicator = container.querySelector('.bg-yellow-400');
			expect(indicator).toBeInTheDocument();
		});

		test('displays multiple indicators for mixed error types', () => {
			const { container } = render(
				<ValidationTooltip 
					{...defaultProps} 
					errors={mockErrors} 
					isOpen={true} 
				/>
			);
			
			const redIndicator = container.querySelector('.bg-red-400');
			const yellowIndicator = container.querySelector('.bg-yellow-400');
			
			expect(redIndicator).toBeInTheDocument();
			expect(yellowIndicator).toBeInTheDocument();
		});
	});

	describe('Error Limiting', () => {
		test('displays maximum 3 errors', () => {
			const manyErrors: ValidationError[] = Array.from({ length: 6 }, (_, i) => ({
				type: 'error' as const,
				message: `Error ${i + 1}`,
				startIndex: i * 5,
				endIndex: (i + 1) * 5
			}));

			render(
				<ValidationTooltip 
					{...defaultProps} 
					errors={manyErrors} 
					isOpen={true} 
				/>
			);
			
			// Should display first 3 errors
			expect(screen.getByText('Error 1')).toBeInTheDocument();
			expect(screen.getByText('Error 2')).toBeInTheDocument();
			expect(screen.getByText('Error 3')).toBeInTheDocument();
			
			// Should not display 4th, 5th, 6th errors
			expect(screen.queryByText('Error 4')).not.toBeInTheDocument();
			expect(screen.queryByText('Error 5')).not.toBeInTheDocument();
			expect(screen.queryByText('Error 6')).not.toBeInTheDocument();
		});

		test('shows count of additional errors', () => {
			const manyErrors: ValidationError[] = Array.from({ length: 5 }, (_, i) => ({
				type: 'error' as const,
				message: `Error ${i + 1}`,
				startIndex: i * 5,
				endIndex: (i + 1) * 5
			}));

			render(
				<ValidationTooltip 
					{...defaultProps} 
					errors={manyErrors} 
					isOpen={true} 
				/>
			);
			
			expect(screen.getByText('+2 more errors')).toBeInTheDocument();
		});

		test('uses singular form for exactly 4 total errors', () => {
			const fourErrors: ValidationError[] = Array.from({ length: 4 }, (_, i) => ({
				type: 'error' as const,
				message: `Error ${i + 1}`,
				startIndex: i * 5,
				endIndex: (i + 1) * 5
			}));

			render(
				<ValidationTooltip 
					{...defaultProps} 
					errors={fourErrors} 
					isOpen={true} 
				/>
			);
			
			expect(screen.getByText('+1 more error')).toBeInTheDocument();
		});
	});

	describe('User Interactions', () => {
		test('calls onOpenChange when dismiss button is clicked', async () => {
			const mockOnOpenChange = jest.fn();
			
			render(
				<ValidationTooltip 
					{...defaultProps} 
					errors={mockErrors} 
					isOpen={true}
					onOpenChange={mockOnOpenChange}
				/>
			);
			
			const dismissButton = screen.getByRole('button', { name: 'Dismiss errors' });
			await userEvent.click(dismissButton);
			
			expect(mockOnOpenChange).toHaveBeenCalledWith(false);
		});

		test('dismiss button has proper accessibility attributes', () => {
			render(
				<ValidationTooltip 
					{...defaultProps} 
					errors={mockErrors} 
					isOpen={true}
				/>
			);
			
			const dismissButton = screen.getByRole('button', { name: 'Dismiss errors' });
			expect(dismissButton).toHaveAttribute('aria-label', 'Dismiss errors');
		});

		test('tooltip has pointer events enabled', () => {
			const { container } = render(
				<ValidationTooltip 
					{...defaultProps} 
					errors={mockErrors} 
					isOpen={true}
				/>
			);
			
			const tooltip = container.querySelector('.pointer-events-auto');
			expect(tooltip).toBeInTheDocument();
		});
	});

	describe('Edge Cases and Error Handling', () => {
		test('handles null errors gracefully', () => {
			expect(() => {
				render(
					<ValidationTooltip 
						{...defaultProps} 
						errors={null as any}
						isOpen={true}
					/>
				);
			}).not.toThrow();
			
			expect(screen.getByTestId('child-content')).toBeInTheDocument();
		});

		test('handles undefined errors gracefully', () => {
			expect(() => {
				render(
					<ValidationTooltip 
						{...defaultProps} 
						errors={undefined as any}
						isOpen={true}
					/>
				);
			}).not.toThrow();
			
			expect(screen.getByTestId('child-content')).toBeInTheDocument();
		});

		test('handles empty errors array', () => {
			render(
				<ValidationTooltip 
					{...defaultProps} 
					errors={[]}
					isOpen={true}
				/>
			);
			
			expect(screen.getByTestId('child-content')).toBeInTheDocument();
			expect(screen.queryByRole('button', { name: 'Dismiss errors' })).not.toBeInTheDocument();
		});

		test('handles errors without suggestions', () => {
			const errorsWithoutSuggestions: ValidationError[] = [
				{
					type: 'error',
					message: 'Error without suggestion',
					startIndex: 0,
					endIndex: 5
				}
			];

			render(
				<ValidationTooltip 
					{...defaultProps} 
					errors={errorsWithoutSuggestions}
					isOpen={true}
				/>
			);
			
			expect(screen.getByText('Error without suggestion')).toBeInTheDocument();
			expect(screen.queryByText('Try:')).not.toBeInTheDocument();
		});

		test('handles malformed error objects', () => {
			const malformedErrors: any[] = [
				{
					type: 'error',
					message: null,
					startIndex: 0,
					endIndex: 5
				},
				{
					// Missing type
					message: 'Message without type',
					startIndex: 0,
					endIndex: 5
				},
				{
					type: 'error'
					// Missing message
				}
			];

			expect(() => {
				render(
					<ValidationTooltip 
						{...defaultProps} 
						errors={malformedErrors}
						isOpen={true}
					/>
				);
			}).not.toThrow();
		});

		test('handles rendering errors gracefully', () => {
			// Mock console.error to suppress error logs during test
			const originalError = console.error;
			console.error = jest.fn();

			// Force a render error by providing an invalid child
			const invalidChild = { invalid: 'object' };
			
			expect(() => {
				render(
					<ValidationTooltip 
						{...defaultProps} 
						children={invalidChild as any}
						errors={mockErrors}
						isOpen={true}
					/>
				);
			}).not.toThrow();

			console.error = originalError;
		});
	});

	describe('Animation Integration', () => {
		test('wraps tooltip in AnimatePresence', () => {
			render(
				<ValidationTooltip 
					{...defaultProps} 
					errors={mockErrors} 
					isOpen={true}
				/>
			);
			
			expect(screen.getByTestId('animate-presence')).toBeInTheDocument();
		});

		test('applies motion props to tooltip container', () => {
			render(
				<ValidationTooltip 
					{...defaultProps} 
					errors={mockErrors} 
					isOpen={true}
				/>
			);
			
			expect(screen.getByTestId('motion-div')).toBeInTheDocument();
		});

		test('positions tooltip correctly', () => {
			const { container } = render(
				<ValidationTooltip 
					{...defaultProps} 
					errors={mockErrors} 
					isOpen={true}
				/>
			);
			
			const tooltip = container.querySelector('.absolute.top-full.left-0.right-0.mt-1.z-\\[40\\]');
			expect(tooltip).toBeInTheDocument();
		});
	});

	describe('Tooltip Content Structure', () => {
		test('contains proper spacing and layout classes', () => {
			const { container } = render(
				<ValidationTooltip 
					{...defaultProps} 
					errors={mockErrors} 
					isOpen={true}
				/>
			);
			
			const content = container.querySelector('.space-y-2.pr-6');
			expect(content).toBeInTheDocument();
		});

		test('suggestion code blocks have proper styling', () => {
			const { container } = render(
				<ValidationTooltip 
					{...defaultProps} 
					errors={mockErrors} 
					isOpen={true}
				/>
			);
			
			const codeBlock = container.querySelector('code.px-1\\.5.py-0\\.5.rounded.bg-black\\/25.text-xs.font-mono');
			expect(codeBlock).toBeInTheDocument();
		});

		test('error indicators have proper size and styling', () => {
			const { container } = render(
				<ValidationTooltip 
					{...defaultProps} 
					errors={mockErrors} 
					isOpen={true}
				/>
			);
			
			const indicators = container.querySelectorAll('.w-2.h-2.rounded-full');
			expect(indicators).toHaveLength(2); // One for error, one for warning
		});
	});

	describe('Accessibility', () => {
		test('dismiss button is keyboard accessible', async () => {
			render(
				<ValidationTooltip 
					{...defaultProps} 
					errors={mockErrors} 
					isOpen={true}
				/>
			);
			
			const dismissButton = screen.getByRole('button', { name: 'Dismiss errors' });
			dismissButton.focus();
			
			expect(document.activeElement).toBe(dismissButton);
		});

		test('tooltip content is readable by screen readers', () => {
			render(
				<ValidationTooltip 
					{...defaultProps} 
					errors={mockErrors} 
					isOpen={true}
				/>
			);
			
			// Error messages should be accessible as text content
			const errorText = screen.getByText('Invalid date format. Use keywords like "today", "tomorrow" or YYYY-MM-DD format.');
			const warningText = screen.getByText('Incomplete pattern - missing closing bracket');
			
			expect(errorText).toBeInTheDocument();
			expect(warningText).toBeInTheDocument();
		});

		test('maintains proper focus management', async () => {
			const mockOnOpenChange = jest.fn();
			
			render(
				<ValidationTooltip 
					{...defaultProps} 
					errors={mockErrors} 
					isOpen={true}
					onOpenChange={mockOnOpenChange}
				/>
			);
			
			const dismissButton = screen.getByRole('button', { name: 'Dismiss errors' });
			
			// Test keyboard interaction
			fireEvent.keyDown(dismissButton, { key: 'Enter' });
			await userEvent.click(dismissButton);
			
			expect(mockOnOpenChange).toHaveBeenCalledWith(false);
		});
	});
});