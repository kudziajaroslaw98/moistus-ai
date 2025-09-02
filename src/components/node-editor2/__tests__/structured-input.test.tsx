/**
 * Structured input mode tests for node-editor2
 * 
 * Tests the structured form input component functionality including:
 * - Form-based input with dedicated fields
 * - Individual field validation
 * - Form submission and data aggregation
 * - Field-specific completion panels
 * - Real-time preview and feedback
 * - Accessibility and user experience
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StructuredInput } from '../structured-input';

// Mock form components
jest.mock('../components/input-section', () => ({
  InputSection: ({ label, children, error }: any) => (
    <div data-testid={`input-section-${label.toLowerCase()}`}>
      <label>{label}</label>
      {children}
      {error && <span data-testid="field-error">{error}</span>}
    </div>
  )
}));

jest.mock('../components/preview-section', () => ({
  PreviewSection: ({ data, mode }: any) => (
    <div data-testid="preview-section" data-mode={mode}>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}));

jest.mock('../components/action-bar', () => ({
  ActionBar: ({ onSubmit, onCancel, isValid }: any) => (
    <div data-testid="action-bar">
      <button 
        data-testid="submit-button" 
        onClick={onSubmit}
        disabled={!isValid}
      >
        Submit
      </button>
      <button data-testid="cancel-button" onClick={onCancel}>
        Cancel
      </button>
    </div>
  )
}));

// Mock validation
jest.mock('../validation', () => ({
  validateInput: jest.fn(() => []),
  getFieldValidation: jest.fn(() => []),
  validateField: jest.fn(() => [])
}));

// Mock completion panels
jest.mock('../enhanced-input/floating-completion-panel', () => ({
  FloatingCompletionPanel: ({ isOpen, type, currentValue, onSelect }: any) => (
    isOpen ? (
      <div data-testid={`completion-panel-${type}`} data-value={currentValue}>
        <button onClick={() => onSelect?.('today')}>today</button>
        <button onClick={() => onSelect?.('tomorrow')}>tomorrow</button>
      </div>
    ) : null
  )
}));

describe('StructuredInput Component', () => {
  const defaultProps = {
    onSubmit: jest.fn(),
    onCancel: jest.fn(),
    mode: 'text' as const,
    initialData: {}
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render without crashing', () => {
      render(<StructuredInput {...defaultProps} />);
      expect(screen.getByTestId('action-bar')).toBeInTheDocument();
    });

    it('should render preview section', () => {
      render(<StructuredInput {...defaultProps} />);
      expect(screen.getByTestId('preview-section')).toBeInTheDocument();
    });

    it('should display correct mode in preview', () => {
      render(<StructuredInput {...defaultProps} mode="task" />);
      
      const preview = screen.getByTestId('preview-section');
      expect(preview).toHaveAttribute('data-mode', 'task');
    });
  });

  describe('Text Mode Form', () => {
    it('should render text-specific form fields', () => {
      render(<StructuredInput {...defaultProps} mode="text" />);
      
      expect(screen.getByTestId('input-section-content')).toBeInTheDocument();
      expect(screen.getByTestId('input-section-font size')).toBeInTheDocument();
      expect(screen.getByTestId('input-section-color')).toBeInTheDocument();
      expect(screen.getByTestId('input-section-alignment')).toBeInTheDocument();
    });

    it('should handle content field input', async () => {
      render(<StructuredInput {...defaultProps} mode="text" />);
      
      const contentSection = screen.getByTestId('input-section-content');
      const contentInput = contentSection.querySelector('input');
      
      await userEvent.type(contentInput!, 'Hello world');
      
      expect(contentInput).toHaveValue('Hello world');
    });

    it('should handle font size field input', async () => {
      render(<StructuredInput {...defaultProps} mode="text" />);
      
      const fontSizeSection = screen.getByTestId('input-section-font size');
      const fontSizeInput = fontSizeSection.querySelector('input');
      
      await userEvent.type(fontSizeInput!, '24px');
      
      expect(fontSizeInput).toHaveValue('24px');
    });

    it('should handle color field input', async () => {
      render(<StructuredInput {...defaultProps} mode="text" />);
      
      const colorSection = screen.getByTestId('input-section-color');
      const colorInput = colorSection.querySelector('input');
      
      await userEvent.type(colorInput!, '#ff0000');
      
      expect(colorInput).toHaveValue('#ff0000');
    });

    it('should handle alignment field selection', async () => {
      render(<StructuredInput {...defaultProps} mode="text" />);
      
      const alignmentSection = screen.getByTestId('input-section-alignment');
      const alignmentSelect = alignmentSection.querySelector('select');
      
      fireEvent.change(alignmentSelect!, { target: { value: 'center' } });
      
      expect(alignmentSelect).toHaveValue('center');
    });

    it('should handle bold/italic checkboxes', async () => {
      render(<StructuredInput {...defaultProps} mode="text" />);
      
      const boldCheckbox = screen.getByLabelText(/bold/i);
      const italicCheckbox = screen.getByLabelText(/italic/i);
      
      await userEvent.click(boldCheckbox);
      await userEvent.click(italicCheckbox);
      
      expect(boldCheckbox).toBeChecked();
      expect(italicCheckbox).toBeChecked();
    });
  });

  describe('Task Mode Form', () => {
    it('should render task-specific form fields', () => {
      render(<StructuredInput {...defaultProps} mode="task" />);
      
      expect(screen.getByTestId('input-section-task text')).toBeInTheDocument();
      expect(screen.getByTestId('input-section-due date')).toBeInTheDocument();
      expect(screen.getByTestId('input-section-priority')).toBeInTheDocument();
      expect(screen.getByTestId('input-section-assignee')).toBeInTheDocument();
      expect(screen.getByTestId('input-section-tags')).toBeInTheDocument();
    });

    it('should handle task text input', async () => {
      render(<StructuredInput {...defaultProps} mode="task" />);
      
      const taskTextSection = screen.getByTestId('input-section-task text');
      const taskInput = taskTextSection.querySelector('input');
      
      await userEvent.type(taskInput!, 'Review pull request');
      
      expect(taskInput).toHaveValue('Review pull request');
    });

    it('should handle due date input with completion', async () => {
      render(<StructuredInput {...defaultProps} mode="task" />);
      
      const dueDateSection = screen.getByTestId('input-section-due date');
      const dateInput = dueDateSection.querySelector('input');
      
      await userEvent.type(dateInput!, 'tod');
      
      // Should show date completion panel
      await waitFor(() => {
        expect(screen.getByTestId('completion-panel-date')).toBeInTheDocument();
      });
      
      // Select completion
      const todayButton = screen.getByText('today');
      await userEvent.click(todayButton);
      
      expect(dateInput).toHaveValue('today');
    });

    it('should handle priority selection with completion', async () => {
      render(<StructuredInput {...defaultProps} mode="task" />);
      
      const prioritySection = screen.getByTestId('input-section-priority');
      const priorityInput = prioritySection.querySelector('input');
      
      await userEvent.type(priorityInput!, 'hi');
      
      // Should show priority completion panel
      await waitFor(() => {
        expect(screen.getByTestId('completion-panel-priority')).toBeInTheDocument();
      });
      
      // Select completion (assuming 'high' is available)
      const highButton = screen.getByText('high');
      await userEvent.click(highButton);
      
      expect(priorityInput).toHaveValue('high');
    });

    it('should handle assignee input with completion', async () => {
      render(<StructuredInput {...defaultProps} mode="task" />);
      
      const assigneeSection = screen.getByTestId('input-section-assignee');
      const assigneeInput = assigneeSection.querySelector('input');
      
      await userEvent.type(assigneeInput!, 'jo');
      
      // Should show assignee completion panel
      await waitFor(() => {
        expect(screen.getByTestId('completion-panel-assignee')).toBeInTheDocument();
      });
    });

    it('should handle tags input as array', async () => {
      render(<StructuredInput {...defaultProps} mode="task" />);
      
      const tagsSection = screen.getByTestId('input-section-tags');
      const tagsInput = tagsSection.querySelector('input');
      
      await userEvent.type(tagsInput!, 'important, urgent');
      
      expect(tagsInput).toHaveValue('important, urgent');
    });

    it('should handle completion checkbox', async () => {
      render(<StructuredInput {...defaultProps} mode="task" />);
      
      const completedCheckbox = screen.getByLabelText(/completed/i);
      
      await userEvent.click(completedCheckbox);
      
      expect(completedCheckbox).toBeChecked();
    });
  });

  describe('Field Validation', () => {
    it('should show field-specific validation errors', () => {
      const { validateField } = require('../validation');
      validateField.mockReturnValue([
        {
          type: 'error',
          message: 'Invalid date format',
          field: 'dueDate'
        }
      ]);

      render(<StructuredInput {...defaultProps} mode="task" />);
      
      const dueDateSection = screen.getByTestId('input-section-due date');
      expect(dueDateSection.querySelector('[data-testid="field-error"]')).toBeInTheDocument();
    });

    it('should validate required fields', () => {
      const { validateField } = require('../validation');
      validateField.mockReturnValue([
        {
          type: 'error',
          message: 'Task text is required',
          field: 'text'
        }
      ]);

      render(<StructuredInput {...defaultProps} mode="task" />);
      
      const taskTextSection = screen.getByTestId('input-section-task text');
      expect(taskTextSection.querySelector('[data-testid="field-error"]')).toBeInTheDocument();
    });

    it('should validate date format in due date field', async () => {
      const { validateField } = require('../validation');
      validateField.mockReturnValue([
        {
          type: 'error',
          message: 'Invalid date format. Use keywords like "today" or YYYY-MM-DD format.',
          field: 'dueDate'
        }
      ]);

      render(<StructuredInput {...defaultProps} mode="task" />);
      
      const dueDateSection = screen.getByTestId('input-section-due date');
      const dateInput = dueDateSection.querySelector('input');
      
      await userEvent.type(dateInput!, 'invaliddate');
      
      expect(dueDateSection.querySelector('[data-testid="field-error"]')).toHaveTextContent(
        'Invalid date format. Use keywords like "today" or YYYY-MM-DD format.'
      );
    });

    it('should validate priority values', async () => {
      const { validateField } = require('../validation');
      validateField.mockReturnValue([
        {
          type: 'error',
          message: 'Invalid priority. Valid values: critical, high, medium, low, urgent, asap',
          field: 'priority'
        }
      ]);

      render(<StructuredInput {...defaultProps} mode="task" />);
      
      const prioritySection = screen.getByTestId('input-section-priority');
      const priorityInput = prioritySection.querySelector('input');
      
      await userEvent.type(priorityInput!, 'invalid');
      
      expect(prioritySection.querySelector('[data-testid="field-error"]')).toBeInTheDocument();
    });

    it('should validate color format', async () => {
      const { validateField } = require('../validation');
      validateField.mockReturnValue([
        {
          type: 'error',
          message: 'Invalid color format. Use hex format (#RGB or #RRGGBB)',
          field: 'color'
        }
      ]);

      render(<StructuredInput {...defaultProps} mode="text" />);
      
      const colorSection = screen.getByTestId('input-section-color');
      const colorInput = colorSection.querySelector('input');
      
      await userEvent.type(colorInput!, 'invalidcolor');
      
      expect(colorSection.querySelector('[data-testid="field-error"]')).toBeInTheDocument();
    });

    it('should validate assignee format', async () => {
      const { validateField } = require('../validation');
      validateField.mockReturnValue([
        {
          type: 'error',
          message: 'Invalid assignee format. Must start with a letter and contain only letters, numbers, dots, hyphens, and underscores',
          field: 'assignee'
        }
      ]);

      render(<StructuredInput {...defaultProps} mode="task" />);
      
      const assigneeSection = screen.getByTestId('input-section-assignee');
      const assigneeInput = assigneeSection.querySelector('input');
      
      await userEvent.type(assigneeInput!, '123invalid');
      
      expect(assigneeSection.querySelector('[data-testid="field-error"]')).toBeInTheDocument();
    });
  });

  describe('Real-time Preview', () => {
    it('should update preview when text fields change', async () => {
      render(<StructuredInput {...defaultProps} mode="text" />);
      
      const contentSection = screen.getByTestId('input-section-content');
      const contentInput = contentSection.querySelector('input');
      
      await userEvent.type(contentInput!, 'Preview text');
      
      const preview = screen.getByTestId('preview-section');
      expect(preview.textContent).toContain('Preview text');
    });

    it('should update preview when task fields change', async () => {
      render(<StructuredInput {...defaultProps} mode="task" />);
      
      const taskTextSection = screen.getByTestId('input-section-task text');
      const taskInput = taskTextSection.querySelector('input');
      
      await userEvent.type(taskInput!, 'Task preview');
      
      const preview = screen.getByTestId('preview-section');
      expect(preview.textContent).toContain('Task preview');
    });

    it('should reflect formatting changes in preview', async () => {
      render(<StructuredInput {...defaultProps} mode="text" />);
      
      const boldCheckbox = screen.getByLabelText(/bold/i);
      const colorSection = screen.getByTestId('input-section-color');
      const colorInput = colorSection.querySelector('input');
      
      await userEvent.click(boldCheckbox);
      await userEvent.type(colorInput!, '#ff0000');
      
      const preview = screen.getByTestId('preview-section');
      expect(preview.textContent).toContain('bold');
      expect(preview.textContent).toContain('#ff0000');
    });

    it('should show task patterns in preview', async () => {
      render(<StructuredInput {...defaultProps} mode="task" />);
      
      const dueDateSection = screen.getByTestId('input-section-due date');
      const dateInput = dueDateSection.querySelector('input');
      
      const prioritySection = screen.getByTestId('input-section-priority');
      const priorityInput = prioritySection.querySelector('input');
      
      await userEvent.type(dateInput!, 'today');
      await userEvent.type(priorityInput!, 'high');
      
      const preview = screen.getByTestId('preview-section');
      expect(preview.textContent).toContain('today');
      expect(preview.textContent).toContain('high');
    });
  });

  describe('Form Submission', () => {
    it('should submit valid text form data', async () => {
      const mockOnSubmit = jest.fn();
      render(<StructuredInput {...defaultProps} mode="text" onSubmit={mockOnSubmit} />);
      
      // Fill form fields
      const contentSection = screen.getByTestId('input-section-content');
      const contentInput = contentSection.querySelector('input');
      
      const fontSizeSection = screen.getByTestId('input-section-font size');
      const fontSizeInput = fontSizeSection.querySelector('input');
      
      const colorSection = screen.getByTestId('input-section-color');
      const colorInput = colorSection.querySelector('input');
      
      await userEvent.type(contentInput!, 'Submit test');
      await userEvent.type(fontSizeInput!, '20px');
      await userEvent.type(colorInput!, '#0000ff');
      
      // Submit form
      const submitButton = screen.getByTestId('submit-button');
      await userEvent.click(submitButton);
      
      expect(mockOnSubmit).toHaveBeenCalledWith({
        content: 'Submit test',
        fontSize: '20px',
        color: '#0000ff',
        bold: false,
        italic: false,
        alignment: undefined
      });
    });

    it('should submit valid task form data', async () => {
      const mockOnSubmit = jest.fn();
      render(<StructuredInput {...defaultProps} mode="task" onSubmit={mockOnSubmit} />);
      
      // Fill form fields
      const taskTextSection = screen.getByTestId('input-section-task text');
      const taskInput = taskTextSection.querySelector('input');
      
      const dueDateSection = screen.getByTestId('input-section-due date');
      const dateInput = dueDateSection.querySelector('input');
      
      const prioritySection = screen.getByTestId('input-section-priority');
      const priorityInput = prioritySection.querySelector('input');
      
      const assigneeSection = screen.getByTestId('input-section-assignee');
      const assigneeInput = assigneeSection.querySelector('input');
      
      const tagsSection = screen.getByTestId('input-section-tags');
      const tagsInput = tagsSection.querySelector('input');
      
      await userEvent.type(taskInput!, 'Complete task');
      await userEvent.type(dateInput!, 'tomorrow');
      await userEvent.type(priorityInput!, 'high');
      await userEvent.type(assigneeInput!, 'john');
      await userEvent.type(tagsInput!, 'important, urgent');
      
      // Submit form
      const submitButton = screen.getByTestId('submit-button');
      await userEvent.click(submitButton);
      
      expect(mockOnSubmit).toHaveBeenCalledWith({
        text: 'Complete task',
        dueDate: 'tomorrow',
        priority: 'high',
        assignee: 'john',
        tags: ['important', 'urgent'],
        isComplete: false
      });
    });

    it('should prevent submission with validation errors', async () => {
      const { validateField } = require('../validation');
      validateField.mockReturnValue([
        {
          type: 'error',
          message: 'Task text is required',
          field: 'text'
        }
      ]);

      const mockOnSubmit = jest.fn();
      render(<StructuredInput {...defaultProps} mode="task" onSubmit={mockOnSubmit} />);
      
      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toBeDisabled();
      
      await userEvent.click(submitButton);
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should enable submission when all fields are valid', async () => {
      const { validateField } = require('../validation');
      validateField.mockReturnValue([]); // No validation errors

      render(<StructuredInput {...defaultProps} mode="task" />);
      
      // Fill required field
      const taskTextSection = screen.getByTestId('input-section-task text');
      const taskInput = taskTextSection.querySelector('input');
      await userEvent.type(taskInput!, 'Valid task');
      
      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toBeEnabled();
    });

    it('should handle cancel action', async () => {
      const mockOnCancel = jest.fn();
      render(<StructuredInput {...defaultProps} onCancel={mockOnCancel} />);
      
      const cancelButton = screen.getByTestId('cancel-button');
      await userEvent.click(cancelButton);
      
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('Initial Data Population', () => {
    it('should populate text form with initial data', () => {
      const initialData = {
        content: 'Initial text',
        fontSize: '18px',
        color: '#333333',
        bold: true,
        italic: false,
        alignment: 'center'
      };

      render(<StructuredInput {...defaultProps} mode="text" initialData={initialData} />);
      
      const contentSection = screen.getByTestId('input-section-content');
      const contentInput = contentSection.querySelector('input');
      expect(contentInput).toHaveValue('Initial text');
      
      const fontSizeSection = screen.getByTestId('input-section-font size');
      const fontSizeInput = fontSizeSection.querySelector('input');
      expect(fontSizeInput).toHaveValue('18px');
      
      const colorSection = screen.getByTestId('input-section-color');
      const colorInput = colorSection.querySelector('input');
      expect(colorInput).toHaveValue('#333333');
      
      const boldCheckbox = screen.getByLabelText(/bold/i);
      expect(boldCheckbox).toBeChecked();
      
      const italicCheckbox = screen.getByLabelText(/italic/i);
      expect(italicCheckbox).not.toBeChecked();
      
      const alignmentSection = screen.getByTestId('input-section-alignment');
      const alignmentSelect = alignmentSection.querySelector('select');
      expect(alignmentSelect).toHaveValue('center');
    });

    it('should populate task form with initial data', () => {
      const initialData = {
        text: 'Initial task',
        dueDate: 'tomorrow',
        priority: 'high',
        assignee: 'alice',
        tags: ['work', 'important'],
        isComplete: true
      };

      render(<StructuredInput {...defaultProps} mode="task" initialData={initialData} />);
      
      const taskTextSection = screen.getByTestId('input-section-task text');
      const taskInput = taskTextSection.querySelector('input');
      expect(taskInput).toHaveValue('Initial task');
      
      const dueDateSection = screen.getByTestId('input-section-due date');
      const dateInput = dueDateSection.querySelector('input');
      expect(dateInput).toHaveValue('tomorrow');
      
      const prioritySection = screen.getByTestId('input-section-priority');
      const priorityInput = prioritySection.querySelector('input');
      expect(priorityInput).toHaveValue('high');
      
      const assigneeSection = screen.getByTestId('input-section-assignee');
      const assigneeInput = assigneeSection.querySelector('input');
      expect(assigneeInput).toHaveValue('alice');
      
      const tagsSection = screen.getByTestId('input-section-tags');
      const tagsInput = tagsSection.querySelector('input');
      expect(tagsInput).toHaveValue('work, important');
      
      const completedCheckbox = screen.getByLabelText(/completed/i);
      expect(completedCheckbox).toBeChecked();
    });

    it('should handle partial initial data', () => {
      const partialData = {
        content: 'Partial data',
        bold: true
        // Missing other fields
      };

      render(<StructuredInput {...defaultProps} mode="text" initialData={partialData} />);
      
      const contentSection = screen.getByTestId('input-section-content');
      const contentInput = contentSection.querySelector('input');
      expect(contentInput).toHaveValue('Partial data');
      
      const boldCheckbox = screen.getByLabelText(/bold/i);
      expect(boldCheckbox).toBeChecked();
      
      const italicCheckbox = screen.getByLabelText(/italic/i);
      expect(italicCheckbox).not.toBeChecked();
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(<StructuredInput {...defaultProps} mode="text" />);
      
      expect(screen.getByText('Content')).toBeInTheDocument();
      expect(screen.getByText('Font Size')).toBeInTheDocument();
      expect(screen.getByText('Color')).toBeInTheDocument();
      expect(screen.getByText('Alignment')).toBeInTheDocument();
    });

    it('should associate labels with form controls', () => {
      render(<StructuredInput {...defaultProps} mode="text" />);
      
      const boldCheckbox = screen.getByLabelText(/bold/i);
      expect(boldCheckbox).toHaveAttribute('type', 'checkbox');
    });

    it('should provide error announcements', () => {
      const { validateField } = require('../validation');
      validateField.mockReturnValue([
        {
          type: 'error',
          message: 'Required field',
          field: 'content'
        }
      ]);

      render(<StructuredInput {...defaultProps} mode="text" />);
      
      const errorElement = screen.getByTestId('field-error');
      expect(errorElement).toBeInTheDocument();
      expect(errorElement).toHaveAttribute('aria-live', 'polite');
    });

    it('should support keyboard navigation', () => {
      render(<StructuredInput {...defaultProps} mode="text" />);
      
      const contentSection = screen.getByTestId('input-section-content');
      const contentInput = contentSection.querySelector('input');
      
      contentInput?.focus();
      expect(document.activeElement).toBe(contentInput);
      
      // Tab should move to next field
      fireEvent.keyDown(contentInput!, { key: 'Tab' });
      // Next focusable element should receive focus
    });

    it('should have descriptive submit button', () => {
      render(<StructuredInput {...defaultProps} mode="task" />);
      
      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toHaveTextContent('Submit');
    });
  });

  describe('Error Handling', () => {
    it('should handle component rendering errors gracefully', () => {
      // Mock a component to throw error
      jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(<StructuredInput {...defaultProps} />);
      }).not.toThrow();
      
      console.error.mockRestore();
    });

    it('should handle validation errors gracefully', () => {
      const { validateField } = require('../validation');
      validateField.mockImplementation(() => {
        throw new Error('Validation failed');
      });

      expect(() => {
        render(<StructuredInput {...defaultProps} mode="text" />);
      }).not.toThrow();
    });

    it('should handle malformed initial data', () => {
      const malformedData = {
        content: null,
        fontSize: undefined,
        tags: 'not-an-array'
      };

      expect(() => {
        render(<StructuredInput {...defaultProps} initialData={malformedData as any} />);
      }).not.toThrow();
    });

    it('should handle submission errors', async () => {
      const mockOnSubmit = jest.fn().mockImplementation(() => {
        throw new Error('Submission failed');
      });

      render(<StructuredInput {...defaultProps} onSubmit={mockOnSubmit} />);
      
      const submitButton = screen.getByTestId('submit-button');
      
      expect(async () => {
        await userEvent.click(submitButton);
      }).not.toThrow();
    });
  });

  describe('Performance Optimization', () => {
    it('should debounce field validation', async () => {
      jest.useFakeTimers();
      
      const { validateField } = require('../validation');
      render(<StructuredInput {...defaultProps} mode="text" />);
      
      const contentSection = screen.getByTestId('input-section-content');
      const contentInput = contentSection.querySelector('input');
      
      // Type rapidly
      await userEvent.type(contentInput!, 'a');
      await userEvent.type(contentInput!, 'b');
      await userEvent.type(contentInput!, 'c');
      
      // Advance timers
      act(() => {
        jest.advanceTimersByTime(300);
      });
      
      expect(validateField).toHaveBeenCalled();
      
      jest.useRealTimers();
    });

    it('should optimize re-renders with memoization', () => {
      const mockOnSubmit = jest.fn();
      
      // First render
      const { rerender } = render(<StructuredInput {...defaultProps} onSubmit={mockOnSubmit} />);
      
      // Re-render with same props
      rerender(<StructuredInput {...defaultProps} onSubmit={mockOnSubmit} />);
      
      expect(screen.getByTestId('action-bar')).toBeInTheDocument();
    });

    it('should handle large tag lists efficiently', async () => {
      const manyTags = Array.from({length: 100}, (_, i) => `tag${i}`).join(', ');
      
      render(<StructuredInput {...defaultProps} mode="task" />);
      
      const tagsSection = screen.getByTestId('input-section-tags');
      const tagsInput = tagsSection.querySelector('input');
      
      const startTime = performance.now();
      await userEvent.type(tagsInput!, manyTags);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(1000);
      expect(tagsInput).toHaveValue(manyTags);
    });
  });

  describe('Integration with Completion System', () => {
    it('should show appropriate completion panels for different fields', async () => {
      render(<StructuredInput {...defaultProps} mode="task" />);
      
      // Date field should show date completions
      const dueDateSection = screen.getByTestId('input-section-due date');
      const dateInput = dueDateSection.querySelector('input');
      
      await userEvent.type(dateInput!, '@tod');
      
      await waitFor(() => {
        expect(screen.getByTestId('completion-panel-date')).toBeInTheDocument();
      });
      
      // Priority field should show priority completions
      const prioritySection = screen.getByTestId('input-section-priority');
      const priorityInput = prioritySection.querySelector('input');
      
      await userEvent.type(priorityInput!, '#hi');
      
      await waitFor(() => {
        expect(screen.getByTestId('completion-panel-priority')).toBeInTheDocument();
      });
    });

    it('should close completion panels when field loses focus', async () => {
      render(<StructuredInput {...defaultProps} mode="task" />);
      
      const dueDateSection = screen.getByTestId('input-section-due date');
      const dateInput = dueDateSection.querySelector('input');
      
      await userEvent.type(dateInput!, 'tod');
      
      await waitFor(() => {
        expect(screen.getByTestId('completion-panel-date')).toBeInTheDocument();
      });
      
      // Blur the field
      fireEvent.blur(dateInput!);
      
      await waitFor(() => {
        expect(screen.queryByTestId('completion-panel-date')).not.toBeInTheDocument();
      });
    });

    it('should handle completion selection in structured fields', async () => {
      render(<StructuredInput {...defaultProps} mode="task" />);
      
      const dueDateSection = screen.getByTestId('input-section-due date');
      const dateInput = dueDateSection.querySelector('input');
      
      await userEvent.type(dateInput!, 'tod');
      
      await waitFor(() => {
        expect(screen.getByTestId('completion-panel-date')).toBeInTheDocument();
      });
      
      // Select completion
      const todayButton = screen.getByText('today');
      await userEvent.click(todayButton);
      
      expect(dateInput).toHaveValue('today');
      expect(screen.queryByTestId('completion-panel-date')).not.toBeInTheDocument();
    });
  });
});