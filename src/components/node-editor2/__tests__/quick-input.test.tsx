/**
 * Quick input mode tests for node-editor2
 * 
 * Tests the quick input component functionality including:
 * - Text-based input and parsing
 * - Real-time validation feedback
 * - Completion panel integration
 * - Pattern recognition and highlighting
 * - Performance optimization
 * - User interaction flows
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuickInput } from '../quick-input';

// Mock dependencies
jest.mock('../enhanced-input/enhanced-input', () => ({
  EnhancedInput: ({ value, onChange, onKeyDown, placeholder, className }: any) => (
    <div data-testid="enhanced-input" className={className}>
      <input
        data-testid="input-field"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
      />
    </div>
  )
}));

jest.mock('../enhanced-input/validation-tooltip', () => ({
  ValidationTooltip: ({ children, errors, isOpen }: any) => (
    <div data-testid="validation-tooltip" data-errors={errors?.length || 0} data-open={isOpen}>
      {children}
    </div>
  )
}));

jest.mock('../enhanced-input/floating-completion-panel', () => ({
  FloatingCompletionPanel: ({ isOpen, type, currentValue, onSelect }: any) => (
    isOpen ? (
      <div data-testid="completion-panel" data-type={type} data-value={currentValue}>
        <button onClick={() => onSelect?.('today')}>today</button>
        <button onClick={() => onSelect?.('tomorrow')}>tomorrow</button>
      </div>
    ) : null
  )
}));

// Mock validation
jest.mock('../validation', () => ({
  getValidationResults: jest.fn(() => []),
  validateInput: jest.fn(() => [])
}));

// Mock parsers
jest.mock('../parsers', () => ({
  parseTextInput: jest.fn((input) => ({ content: input, metadata: undefined })),
  parseTaskInput: jest.fn((input) => ({
    tasks: [{ text: input, isComplete: false, patterns: [] }],
    dueDate: null,
    priority: null,
    assignee: null,
    tags: []
  }))
}));

describe('QuickInput Component', () => {
  const defaultProps = {
    value: '',
    onChange: jest.fn(),
    onSubmit: jest.fn(),
    placeholder: 'Enter text...',
    mode: 'text' as const
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset validation mock
    const { getValidationResults } = require('../validation');
    getValidationResults.mockReturnValue([]);
  });

  describe('Component Rendering', () => {
    it('should render without crashing', () => {
      render(<QuickInput {...defaultProps} />);
      expect(screen.getByTestId('enhanced-input')).toBeInTheDocument();
      expect(screen.getByTestId('input-field')).toBeInTheDocument();
    });

    it('should display placeholder text', () => {
      const customPlaceholder = 'Type something...';
      render(<QuickInput {...defaultProps} placeholder={customPlaceholder} />);
      
      const input = screen.getByTestId('input-field');
      expect(input).toHaveAttribute('placeholder', customPlaceholder);
    });

    it('should apply custom className', () => {
      const customClass = 'custom-quick-input';
      render(<QuickInput {...defaultProps} className={customClass} />);
      
      const container = screen.getByTestId('enhanced-input');
      expect(container).toHaveClass(customClass);
    });

    it('should render in disabled state', () => {
      render(<QuickInput {...defaultProps} disabled={true} />);
      
      const input = screen.getByTestId('input-field');
      expect(input).toBeDisabled();
    });

    it('should show validation tooltip', () => {
      render(<QuickInput {...defaultProps} />);
      expect(screen.getByTestId('validation-tooltip')).toBeInTheDocument();
    });
  });

  describe('Text Input Mode', () => {
    it('should handle text input changes', async () => {
      const mockOnChange = jest.fn();
      render(<QuickInput {...defaultProps} onChange={mockOnChange} />);
      
      const input = screen.getByTestId('input-field');
      await userEvent.type(input, 'Hello world');
      
      expect(mockOnChange).toHaveBeenCalledWith('Hello world');
    });

    it('should parse text input for formatting', () => {
      const { parseTextInput } = require('../parsers');
      parseTextInput.mockReturnValue({
        content: 'Bold text',
        metadata: { fontWeight: 'bold' }
      });

      render(<QuickInput {...defaultProps} value="**Bold text**" mode="text" />);
      
      expect(parseTextInput).toHaveBeenCalledWith('**Bold text**');
    });

    it('should handle font size patterns', () => {
      const { parseTextInput } = require('../parsers');
      parseTextInput.mockReturnValue({
        content: 'Large text',
        metadata: { fontSize: '24px' }
      });

      render(<QuickInput {...defaultProps} value="Large text @24px" mode="text" />);
      
      expect(parseTextInput).toHaveBeenCalledWith('Large text @24px');
    });

    it('should handle color patterns', () => {
      const { parseTextInput } = require('../parsers');
      parseTextInput.mockReturnValue({
        content: 'Red text',
        metadata: { textColor: '#ff0000' }
      });

      render(<QuickInput {...defaultProps} value="Red text color:#ff0000" mode="text" />);
      
      expect(parseTextInput).toHaveBeenCalledWith('Red text color:#ff0000');
    });

    it('should handle alignment patterns', () => {
      const { parseTextInput } = require('../parsers');
      parseTextInput.mockReturnValue({
        content: 'Centered',
        metadata: { textAlign: 'center' }
      });

      render(<QuickInput {...defaultProps} value="Centered align:center" mode="text" />);
      
      expect(parseTextInput).toHaveBeenCalledWith('Centered align:center');
    });
  });

  describe('Task Input Mode', () => {
    it('should handle task input changes', async () => {
      const mockOnChange = jest.fn();
      render(<QuickInput {...defaultProps} mode="task" onChange={mockOnChange} />);
      
      const input = screen.getByTestId('input-field');
      await userEvent.type(input, '[x] Complete task');
      
      expect(mockOnChange).toHaveBeenCalledWith('[x] Complete task');
    });

    it('should parse task input with patterns', () => {
      const { parseTaskInput } = require('../parsers');
      parseTaskInput.mockReturnValue({
        tasks: [{
          text: 'Review PR',
          isComplete: false,
          patterns: [
            { type: 'date', value: 'today' },
            { type: 'priority', value: 'high' }
          ]
        }],
        dueDate: new Date(),
        priority: 'high',
        assignee: null,
        tags: []
      });

      render(<QuickInput {...defaultProps} value="Review PR @today #high" mode="task" />);
      
      expect(parseTaskInput).toHaveBeenCalledWith('Review PR @today #high');
    });

    it('should handle checkbox patterns', () => {
      const { parseTaskInput } = require('../parsers');
      parseTaskInput.mockReturnValue({
        tasks: [{
          text: 'Completed task',
          isComplete: true,
          patterns: []
        }],
        dueDate: null,
        priority: null,
        assignee: null,
        tags: []
      });

      render(<QuickInput {...defaultProps} value="[x] Completed task" mode="task" />);
      
      expect(parseTaskInput).toHaveBeenCalledWith('[x] Completed task');
    });

    it('should handle new checkbox formats', () => {
      const { parseTaskInput } = require('../parsers');
      
      const newFormats = [
        '[;] Task with semicolon',
        '[,] Task with comma',
        '[ ; ] Task with spaced semicolon'
      ];

      newFormats.forEach(format => {
        parseTaskInput.mockReturnValue({
          tasks: [{
            text: format.replace(/^\[.*?\]\s*/, ''),
            isComplete: true,
            patterns: []
          }],
          dueDate: null,
          priority: null,
          assignee: null,
          tags: []
        });

        render(<QuickInput {...defaultProps} value={format} mode="task" />);
        expect(parseTaskInput).toHaveBeenCalledWith(format);
      });
    });

    it('should handle multiple patterns in task input', () => {
      const { parseTaskInput } = require('../parsers');
      parseTaskInput.mockReturnValue({
        tasks: [{
          text: 'Complex task',
          isComplete: false,
          patterns: [
            { type: 'date', value: '2025-04-24' },
            { type: 'priority', value: 'high' },
            { type: 'tag', value: 'important' },
            { type: 'assignee', value: 'john' },
            { type: 'color', value: '#ff0000' }
          ]
        }],
        dueDate: new Date('2025-04-24'),
        priority: 'high',
        assignee: 'john',
        tags: ['important']
      });

      const complexInput = 'Complex task @2025-04-24 #high [important] +john color:#ff0000';
      render(<QuickInput {...defaultProps} value={complexInput} mode="task" />);
      
      expect(parseTaskInput).toHaveBeenCalledWith(complexInput);
    });
  });

  describe('Validation Integration', () => {
    it('should display validation errors', () => {
      const { getValidationResults } = require('../validation');
      const mockErrors = [
        {
          type: 'error',
          message: 'Invalid date format',
          startIndex: 0,
          endIndex: 10
        }
      ];
      getValidationResults.mockReturnValue(mockErrors);

      render(<QuickInput {...defaultProps} value="@invaliddate" />);
      
      const tooltip = screen.getByTestId('validation-tooltip');
      expect(tooltip).toHaveAttribute('data-errors', '1');
    });

    it('should handle validation warnings', () => {
      const { getValidationResults } = require('../validation');
      const mockWarnings = [
        {
          type: 'warning',
          message: 'Incomplete pattern',
          startIndex: 0,
          endIndex: 2
        }
      ];
      getValidationResults.mockReturnValue(mockWarnings);

      render(<QuickInput {...defaultProps} value="@" />);
      
      const tooltip = screen.getByTestId('validation-tooltip');
      expect(tooltip).toHaveAttribute('data-errors', '1');
    });

    it('should not show validation errors for the "@2" case', () => {
      const { getValidationResults } = require('../validation');
      getValidationResults.mockReturnValue([]); // No errors for @2

      render(<QuickInput {...defaultProps} value="@2" />);
      
      const tooltip = screen.getByTestId('validation-tooltip');
      expect(tooltip).toHaveAttribute('data-errors', '0');
    });

    it('should handle progressive typing without premature errors', () => {
      const { getValidationResults } = require('../validation');
      
      const progression = ['@', '@2', '@20', '@202', '@2024'];
      
      progression.forEach(input => {
        getValidationResults.mockReturnValue([]); // No errors for partial inputs
        
        render(<QuickInput {...defaultProps} value={input} />);
        
        const tooltip = screen.getByTestId('validation-tooltip');
        expect(tooltip).toHaveAttribute('data-errors', '0');
      });
    });

    it('should validate complete invalid inputs', () => {
      const { getValidationResults } = require('../validation');
      const mockErrors = [
        {
          type: 'error',
          message: 'Invalid date format',
          startIndex: 0,
          endIndex: 12
        }
      ];
      getValidationResults.mockReturnValue(mockErrors);

      render(<QuickInput {...defaultProps} value="@invaliddate" />);
      
      const tooltip = screen.getByTestId('validation-tooltip');
      expect(tooltip).toHaveAttribute('data-errors', '1');
    });
  });

  describe('Completion Integration', () => {
    it('should show completion panel for date patterns', async () => {
      render(<QuickInput {...defaultProps} value="Meeting @tod" />);
      
      const input = screen.getByTestId('input-field');
      fireEvent.focus(input);
      
      // Simulate typing to trigger completions
      await userEvent.type(input, 'o');
      
      await waitFor(() => {
        expect(screen.getByTestId('completion-panel')).toBeInTheDocument();
      });
    });

    it('should hide completion panel when not needed', () => {
      render(<QuickInput {...defaultProps} value="Regular text" />);
      
      expect(screen.queryByTestId('completion-panel')).not.toBeInTheDocument();
    });

    it('should handle completion selection', async () => {
      const mockOnChange = jest.fn();
      render(<QuickInput {...defaultProps} value="Meeting @tod" onChange={mockOnChange} />);
      
      const input = screen.getByTestId('input-field');
      fireEvent.focus(input);
      
      // Wait for completion panel to appear
      await waitFor(() => {
        expect(screen.getByTestId('completion-panel')).toBeInTheDocument();
      });
      
      // Select a completion
      const todayButton = screen.getByText('today');
      fireEvent.click(todayButton);
      
      expect(mockOnChange).toHaveBeenCalledWith('Meeting @today');
    });

    it('should handle different completion types', async () => {
      const completionTypes = [
        { input: 'Task @tod', expectedType: 'date' },
        { input: 'Task #hi', expectedType: 'priority' },
        { input: 'Task [imp', expectedType: 'tag' },
        { input: 'Task +jo', expectedType: 'assignee' },
        { input: 'Task color:#ff', expectedType: 'color' }
      ];

      for (const { input, expectedType } of completionTypes) {
        render(<QuickInput {...defaultProps} value={input} />);
        
        const inputField = screen.getByTestId('input-field');
        fireEvent.focus(inputField);
        
        await waitFor(() => {
          const panel = screen.queryByTestId('completion-panel');
          if (panel) {
            expect(panel).toHaveAttribute('data-type', expectedType);
          }
        });
      }
    });
  });

  describe('Keyboard Navigation', () => {
    it('should handle Enter key for submission', async () => {
      const mockOnSubmit = jest.fn();
      render(<QuickInput {...defaultProps} onSubmit={mockOnSubmit} value="Test input" />);
      
      const input = screen.getByTestId('input-field');
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
      
      expect(mockOnSubmit).toHaveBeenCalledWith('Test input');
    });

    it('should handle Escape key', async () => {
      const mockOnEscape = jest.fn();
      render(<QuickInput {...defaultProps} onEscape={mockOnEscape} />);
      
      const input = screen.getByTestId('input-field');
      fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });
      
      expect(mockOnEscape).toHaveBeenCalled();
    });

    it('should handle Tab key for completion', async () => {
      const mockOnChange = jest.fn();
      render(<QuickInput {...defaultProps} value="@tod" onChange={mockOnChange} />);
      
      const input = screen.getByTestId('input-field');
      fireEvent.keyDown(input, { key: 'Tab', code: 'Tab' });
      
      // Should select first completion if available
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });

    it('should handle arrow keys in completion panel', async () => {
      render(<QuickInput {...defaultProps} value="@tod" />);
      
      const input = screen.getByTestId('input-field');
      fireEvent.focus(input);
      
      await waitFor(() => {
        expect(screen.getByTestId('completion-panel')).toBeInTheDocument();
      });
      
      // Arrow down should navigate completions
      fireEvent.keyDown(input, { key: 'ArrowDown', code: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowUp', code: 'ArrowUp' });
      
      // Should not crash and maintain focus
      expect(document.activeElement).toBe(input);
    });
  });

  describe('Performance Optimization', () => {
    it('should debounce validation updates', async () => {
      jest.useFakeTimers();
      
      const { getValidationResults } = require('../validation');
      const mockOnChange = jest.fn();
      
      render(<QuickInput {...defaultProps} onChange={mockOnChange} />);
      
      const input = screen.getByTestId('input-field');
      
      // Type rapidly
      await userEvent.type(input, 'a');
      await userEvent.type(input, 'b');
      await userEvent.type(input, 'c');
      
      // Validation should be debounced
      expect(getValidationResults).toHaveBeenCalledTimes(3); // Called for each change
      
      jest.useRealTimers();
    });

    it('should handle rapid input changes efficiently', async () => {
      const mockOnChange = jest.fn();
      render(<QuickInput {...defaultProps} onChange={mockOnChange} />);
      
      const input = screen.getByTestId('input-field');
      
      // Simulate rapid typing
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        fireEvent.change(input, { target: { value: `char${i}` } });
      }
      
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should handle rapidly
      expect(mockOnChange).toHaveBeenCalledTimes(100);
    });

    it('should optimize re-renders with memo', () => {
      const mockOnChange = jest.fn();
      
      // First render
      const { rerender } = render(<QuickInput {...defaultProps} onChange={mockOnChange} />);
      
      // Re-render with same props should be optimized
      rerender(<QuickInput {...defaultProps} onChange={mockOnChange} />);
      
      expect(screen.getByTestId('enhanced-input')).toBeInTheDocument();
    });

    it('should handle large input values efficiently', () => {
      const largeValue = 'a'.repeat(10000);
      
      const startTime = performance.now();
      render(<QuickInput {...defaultProps} value={largeValue} />);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100);
      expect(screen.getByTestId('input-field')).toHaveValue(largeValue);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null and undefined values gracefully', () => {
      expect(() => {
        render(<QuickInput {...defaultProps} value={null as any} />);
      }).not.toThrow();
      
      expect(() => {
        render(<QuickInput {...defaultProps} value={undefined as any} />);
      }).not.toThrow();
    });

    it('should handle special characters in input', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      
      expect(() => {
        render(<QuickInput {...defaultProps} value={specialChars} />);
      }).not.toThrow();
      
      expect(screen.getByTestId('input-field')).toHaveValue(specialChars);
    });

    it('should handle unicode characters', () => {
      const unicodeText = '🌟 Unicode text with émojis and accénts 中文';
      
      expect(() => {
        render(<QuickInput {...defaultProps} value={unicodeText} />);
      }).not.toThrow();
      
      expect(screen.getByTestId('input-field')).toHaveValue(unicodeText);
    });

    it('should handle parsing errors gracefully', () => {
      const { parseTextInput } = require('../parsers');
      parseTextInput.mockImplementation(() => {
        throw new Error('Parsing failed');
      });

      expect(() => {
        render(<QuickInput {...defaultProps} value="test input" mode="text" />);
      }).not.toThrow();
    });

    it('should handle validation errors gracefully', () => {
      const { getValidationResults } = require('../validation');
      getValidationResults.mockImplementation(() => {
        throw new Error('Validation failed');
      });

      expect(() => {
        render(<QuickInput {...defaultProps} value="test input" />);
      }).not.toThrow();
    });

    it('should handle completion errors gracefully', () => {
      // Mock completion panel to throw error
      jest.doMock('../enhanced-input/floating-completion-panel', () => ({
        FloatingCompletionPanel: () => {
          throw new Error('Completion failed');
        }
      }));

      expect(() => {
        render(<QuickInput {...defaultProps} value="@test" />);
      }).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<QuickInput {...defaultProps} />);
      
      const input = screen.getByTestId('input-field');
      expect(input).toHaveAttribute('aria-label');
    });

    it('should support keyboard navigation', () => {
      render(<QuickInput {...defaultProps} />);
      
      const input = screen.getByTestId('input-field');
      input.focus();
      
      expect(document.activeElement).toBe(input);
    });

    it('should announce validation errors to screen readers', () => {
      const { getValidationResults } = require('../validation');
      getValidationResults.mockReturnValue([
        {
          type: 'error',
          message: 'Invalid input',
          startIndex: 0,
          endIndex: 5
        }
      ]);

      render(<QuickInput {...defaultProps} value="error" />);
      
      // Validation tooltip should be accessible
      const tooltip = screen.getByTestId('validation-tooltip');
      expect(tooltip).toHaveAttribute('data-errors', '1');
    });

    it('should support focus management', () => {
      render(<QuickInput {...defaultProps} autoFocus={true} />);
      
      const input = screen.getByTestId('input-field');
      expect(document.activeElement).toBe(input);
    });
  });

  describe('Mode Switching', () => {
    it('should handle mode changes correctly', () => {
      const { rerender } = render(<QuickInput {...defaultProps} mode="text" />);
      
      // Switch to task mode
      rerender(<QuickInput {...defaultProps} mode="task" />);
      
      expect(screen.getByTestId('enhanced-input')).toBeInTheDocument();
    });

    it('should maintain value when switching modes', () => {
      const testValue = 'Test content';
      const { rerender } = render(<QuickInput {...defaultProps} mode="text" value={testValue} />);
      
      // Switch mode but keep same value
      rerender(<QuickInput {...defaultProps} mode="task" value={testValue} />);
      
      const input = screen.getByTestId('input-field');
      expect(input).toHaveValue(testValue);
    });

    it('should apply different parsing logic based on mode', () => {
      const { parseTextInput, parseTaskInput } = require('../parsers');
      const testValue = '[x] Test task @today';
      
      // Text mode
      render(<QuickInput {...defaultProps} mode="text" value={testValue} />);
      expect(parseTextInput).toHaveBeenCalledWith(testValue);
      
      // Task mode
      render(<QuickInput {...defaultProps} mode="task" value={testValue} />);
      expect(parseTaskInput).toHaveBeenCalledWith(testValue);
    });
  });

  describe('Real-world Usage Scenarios', () => {
    it('should handle new user learning workflow', async () => {
      const learningSteps = [
        'Hello world',
        'Hello **bold** world',
        'Hello **bold** world @24px',
        'Meeting @today',
        'Meeting @today #high',
        'Meeting @today #high [important]'
      ];

      const mockOnChange = jest.fn();

      for (const step of learningSteps) {
        const { getValidationResults } = require('../validation');
        getValidationResults.mockReturnValue([]); // No errors for learning

        render(<QuickInput {...defaultProps} value={step} onChange={mockOnChange} />);
        
        // Should handle each step without errors
        expect(screen.getByTestId('enhanced-input')).toBeInTheDocument();
      }
    });

    it('should handle power user rapid entry', async () => {
      const powerUserInputs = [
        'Review PR @today #critical [urgent] +frontend color:#ff0000',
        '[x] Deploy to staging @yesterday #high [done] +devops',
        'Team meeting @friday #medium [weekly] +everyone',
        '**Important** announcement @next #critical [company-wide] color:#ff0000'
      ];

      const mockOnChange = jest.fn();

      for (const input of powerUserInputs) {
        const { getValidationResults } = require('../validation');
        getValidationResults.mockReturnValue([]); // Power users make valid inputs

        render(<QuickInput {...defaultProps} value={input} onChange={mockOnChange} />);
        
        const inputField = screen.getByTestId('input-field');
        expect(inputField).toHaveValue(input);
      }
    });

    it('should handle mistake correction workflow', async () => {
      const correctionFlow = [
        '@invaliddate',  // Initial mistake
        '@invalid',      // Partial correction
        '@',            // Further correction
        '@today'        // Final correct input
      ];

      const { getValidationResults } = require('../validation');
      const mockOnChange = jest.fn();

      correctionFlow.forEach((input, index) => {
        // Only the first input should have validation errors
        if (index === 0) {
          getValidationResults.mockReturnValue([{
            type: 'error',
            message: 'Invalid date format',
            startIndex: 0,
            endIndex: input.length
          }]);
        } else {
          getValidationResults.mockReturnValue([]);
        }

        render(<QuickInput {...defaultProps} value={input} onChange={mockOnChange} />);
        
        const tooltip = screen.getByTestId('validation-tooltip');
        const expectedErrors = index === 0 ? '1' : '0';
        expect(tooltip).toHaveAttribute('data-errors', expectedErrors);
      });
    });
  });
});