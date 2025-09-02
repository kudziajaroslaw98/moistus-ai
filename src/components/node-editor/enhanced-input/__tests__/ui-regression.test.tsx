import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { EnhancedInput } from '../enhanced-input';

// Mock motion to avoid animation-related issues in tests
jest.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock CodeMirror to focus on UI behavior
jest.mock('@codemirror/view', () => ({
  EditorView: jest.fn().mockImplementation(() => ({
    destroy: jest.fn(),
    dispatch: jest.fn(),
    focus: jest.fn(),
    dom: document.createElement('div'),
  })),
}));

jest.mock('@codemirror/state', () => ({
  EditorState: {
    create: jest.fn(() => ({})),
  },
  Compartment: jest.fn().mockImplementation(() => ({
    of: jest.fn(),
    reconfigure: jest.fn(),
  })),
}));

describe('EnhancedInput UI Regression Tests', () => {
  const mockProps = {
    value: '',
    onChange: jest.fn(),
    onKeyDown: jest.fn(),
    onSelectionChange: jest.fn(),
    placeholder: 'Type something...',
    disabled: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Input Visibility During Validation States', () => {
    test('CRITICAL: input remains visible when showing priority validation errors', async () => {
      const { rerender } = render(<EnhancedInput {...mockProps} />);

      // Verify input starts visible
      const inputContainer = screen.getByTestId('enhanced-input-container') || 
                           document.querySelector('.enhanced-input-container');
      expect(inputContainer).toBeInTheDocument();
      expect(inputContainer).toBeVisible();

      // Simulate invalid priority input
      rerender(<EnhancedInput {...mockProps} value="#invalid" />);

      await waitFor(() => {
        // CRITICAL ASSERTION: Input must remain visible during error state
        const inputAfterError = screen.getByTestId('enhanced-input-container') || 
                              document.querySelector('.enhanced-input-container');
        expect(inputAfterError).toBeInTheDocument();
        expect(inputAfterError).toBeVisible();
      }, { timeout: 2000 });

      // Validation error should also be visible
      await waitFor(() => {
        expect(screen.getByText(/invalid priority/i)).toBeVisible();
      });
    });

    test('CRITICAL: input remains visible when showing color validation errors', async () => {
      const { rerender } = render(<EnhancedInput {...mockProps} />);

      // Simulate invalid color input
      rerender(<EnhancedInput {...mockProps} value="color:#xyz" />);

      await waitFor(() => {
        // CRITICAL: Input must not disappear
        const inputContainer = document.querySelector('.enhanced-input-wrapper') || 
                             document.querySelector('[class*="cm-editor"]');
        expect(inputContainer).toBeInTheDocument();
        expect(inputContainer).toBeVisible();
      });

      // Error should show without breaking input
      await waitFor(() => {
        expect(screen.getByText(/invalid hex color/i)).toBeVisible();
      });
    });

    test('CRITICAL: input remains visible when showing date validation errors', async () => {
      const { rerender } = render(<EnhancedInput {...mockProps} />);

      rerender(<EnhancedInput {...mockProps} value="@invaliddate" />);

      await waitFor(() => {
        const editorElement = document.querySelector('[class*="enhanced-input"]');
        expect(editorElement).toBeInTheDocument();
        expect(editorElement).toBeVisible();
      });
    });

    test('CRITICAL: input remains visible when showing assignee validation errors', async () => {
      const { rerender } = render(<EnhancedInput {...mockProps} />);

      rerender(<EnhancedInput {...mockProps} value="+user space" />);

      await waitFor(() => {
        const inputWrapper = document.querySelector('.enhanced-input-wrapper');
        expect(inputWrapper).toBeInTheDocument();
        expect(inputWrapper).toBeVisible();
      });
    });

    test('CRITICAL: input remains visible with incomplete pattern warnings', async () => {
      const { rerender } = render(<EnhancedInput {...mockProps} />);

      rerender(<EnhancedInput {...mockProps} value="[incomplete" />);

      await waitFor(() => {
        const container = document.querySelector('.enhanced-input-container');
        expect(container).toBeInTheDocument();
        expect(container).toBeVisible();
      });
    });
  });

  describe('State Transition Stability', () => {
    test('input remains stable during valid→invalid→valid transitions', async () => {
      const { rerender } = render(<EnhancedInput {...mockProps} />);

      // Start with valid input
      rerender(<EnhancedInput {...mockProps} value="@today" />);
      let container = document.querySelector('.enhanced-input-container');
      expect(container).toBeVisible();

      // Transition to invalid
      rerender(<EnhancedInput {...mockProps} value="@invalid" />);
      await waitFor(() => {
        container = document.querySelector('.enhanced-input-container');
        expect(container).toBeVisible(); // MUST stay visible
      });

      // Transition back to valid
      rerender(<EnhancedInput {...mockProps} value="@tomorrow" />);
      await waitFor(() => {
        container = document.querySelector('.enhanced-input-container');
        expect(container).toBeVisible(); // MUST stay visible
      });
    });

    test('rapid validation changes do not break input visibility', async () => {
      const { rerender } = render(<EnhancedInput {...mockProps} />);

      // Rapid state changes
      const testValues = ['#', '#l', '#lo', '#low', '#lows', '#invalid'];
      
      for (const value of testValues) {
        rerender(<EnhancedInput {...mockProps} value={value} />);
        
        // Input must remain visible throughout rapid changes
        const container = document.querySelector('.enhanced-input-container');
        expect(container).toBeInTheDocument();
        expect(container).toBeVisible();
      }
    });
  });

  describe('Multiple Error Handling', () => {
    test('input remains visible with multiple validation errors', async () => {
      const { rerender } = render(<EnhancedInput {...mockProps} />);

      // Multiple invalid patterns in one input
      rerender(<EnhancedInput {...mockProps} value="@invalid #badpriority color:#xyz +user space" />);

      await waitFor(() => {
        const container = document.querySelector('.enhanced-input-container');
        expect(container).toBeInTheDocument();
        expect(container).toBeVisible();
      });

      // Should show error messages without breaking input
      await waitFor(() => {
        const errorElements = document.querySelectorAll('[class*="error"], [class*="warning"]');
        expect(errorElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Animation and Motion Integration', () => {
    test('motion animations do not interfere with input visibility', async () => {
      const motionProps = {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.2 }
      };

      const { rerender } = render(
        <EnhancedInput {...mockProps} {...motionProps} />
      );

      // Add validation error during animation
      rerender(
        <EnhancedInput {...mockProps} {...motionProps} value="#invalid" />
      );

      // Input should remain visible despite motion props
      await waitFor(() => {
        const container = document.querySelector('.enhanced-input-container');
        expect(container).toBeVisible();
      });
    });
  });

  describe('Focus and Interaction Stability', () => {
    test('input remains functional during error states', async () => {
      const onChangeMock = jest.fn();
      const { rerender } = render(
        <EnhancedInput {...mockProps} onChange={onChangeMock} />
      );

      // Start with error state
      rerender(<EnhancedInput {...mockProps} value="#invalid" onChange={onChangeMock} />);

      await waitFor(() => {
        const container = document.querySelector('.enhanced-input-container');
        expect(container).toBeVisible();
      });

      // Input should still be interactive
      const inputElement = document.querySelector('[class*="cm-content"]') || 
                          document.querySelector('input') ||
                          document.querySelector('[contenteditable]');
      
      if (inputElement) {
        expect(inputElement).toBeVisible();
      }
    });
  });

  describe('CSS Class and Styling Regression', () => {
    test('validation CSS classes do not hide input', async () => {
      const { rerender } = render(<EnhancedInput {...mockProps} />);

      rerender(<EnhancedInput {...mockProps} value="#invalid" />);

      await waitFor(() => {
        const container = document.querySelector('.enhanced-input-container');
        
        // Check for validation classes
        expect(container?.classList.contains('has-validation-errors') || 
               container?.classList.contains('has-errors')).toBeTruthy();
        
        // But input should still be visible
        expect(container).toBeVisible();
      });
    });

    test('error tooltip positioning does not hide input', async () => {
      const { rerender } = render(<EnhancedInput {...mockProps} />);

      rerender(<EnhancedInput {...mockProps} value="color:#invalid" />);

      await waitFor(() => {
        // Both input and tooltip should be visible
        const container = document.querySelector('.enhanced-input-container');
        expect(container).toBeVisible();

        // Tooltip might be visible
        const tooltip = document.querySelector('[class*="tooltip"]') ||
                       document.querySelector('[class*="validation"]');
        if (tooltip) {
          expect(tooltip).toBeVisible();
        }
      });
    });
  });

  describe('Performance and Memory Leak Prevention', () => {
    test('rapid validation changes do not cause DOM node leaks', () => {
      const { rerender, unmount } = render(<EnhancedInput {...mockProps} />);

      // Get initial node count
      const initialNodes = document.querySelectorAll('*').length;

      // Rapid changes
      for (let i = 0; i < 10; i++) {
        rerender(<EnhancedInput {...mockProps} value={`#invalid${i}`} />);
      }

      const afterNodes = document.querySelectorAll('*').length;
      
      // Should not create excessive DOM nodes
      expect(afterNodes - initialNodes).toBeLessThan(50);

      unmount();
    });
  });
});

// Helper function for testing input visibility
export const assertInputVisibility = (testName: string) => {
  const container = document.querySelector('.enhanced-input-container') ||
                   document.querySelector('.enhanced-input-wrapper') ||
                   document.querySelector('[class*="enhanced-input"]');

  if (!container) {
    throw new Error(`${testName}: Enhanced input container not found in DOM`);
  }

  if (!container.checkVisibility || container.checkVisibility() === false) {
    throw new Error(`${testName}: Enhanced input container is not visible`);
  }

  return container;
};