/**
 * CRITICAL UI REGRESSION TESTS
 * 
 * These tests prevent the critical bug where the input field disappears
 * when validation errors are shown. This was a breaking UI issue that
 * made the component completely unusable.
 * 
 * DO NOT REMOVE OR DISABLE THESE TESTS
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';

// Mock all CodeMirror dependencies to focus on React component behavior
jest.mock('@codemirror/view', () => ({
  EditorView: jest.fn().mockImplementation((config) => {
    // Create a mock DOM element to simulate CodeMirror editor
    const mockElement = document.createElement('div');
    mockElement.setAttribute('data-testid', 'codemirror-editor');
    mockElement.style.minHeight = '60px';
    mockElement.style.visibility = 'visible';
    config.parent?.appendChild(mockElement);
    
    return {
      destroy: jest.fn(),
      dispatch: jest.fn(),
      focus: jest.fn(),
      dom: mockElement,
    };
  }),
}));

jest.mock('@codemirror/state', () => ({
  EditorState: {
    create: jest.fn(() => ({ doc: { toString: () => '' } })),
  },
  Compartment: jest.fn().mockImplementation(() => ({
    of: jest.fn(),
    reconfigure: jest.fn(),
  })),
}));

jest.mock('@codemirror/autocomplete', () => ({
  autocompletion: jest.fn(() => []),
}));

jest.mock('@codemirror/language', () => ({
  StreamLanguage: {
    define: jest.fn(() => []),
  },
}));

jest.mock('../../utils/codemirror-mindmap-lang', () => ({
  mindmapLang: jest.fn(() => []),
  mindmapCSS: '',
}));

jest.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock the validation functions to return predictable results
jest.mock('../../utils/validation', () => ({
  getValidationResults: jest.fn((value: string) => {
    if (value.includes('#invalid')) {
      return [{
        type: 'error',
        message: 'Invalid priority. Use "low", "medium", or "high".',
        startIndex: 0,
        endIndex: 8,
        suggestion: 'medium'
      }];
    }
    if (value.includes('color:#xyz')) {
      return [{
        type: 'error',
        message: 'Invalid hex color format. Use #RGB or #RRGGBB format.',
        startIndex: 6,
        endIndex: 10,
        suggestion: '#000000'
      }];
    }
    if (value.includes('@invaliddate')) {
      return [{
        type: 'error',
        message: 'Invalid date format. Use keywords like "today", "tomorrow" or YYYY-MM-DD format.',
        startIndex: 1,
        endIndex: 12,
        suggestion: 'today'
      }];
    }
    return [];
  })
}));

// Import after mocking
import { EnhancedInput } from '../enhanced-input';

describe('🚨 CRITICAL INPUT VISIBILITY REGRESSION TESTS 🚨', () => {
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

  describe('❌ BUG PREVENTION: Input Must Never Disappear During Validation', () => {
    test('🔴 CRITICAL: Input container remains in DOM when showing priority errors', async () => {
      const { rerender, container } = render(<EnhancedInput {...mockProps} />);

      // Initial state - input should be present
      const initialContainer = container.querySelector('[data-testid="enhanced-input-container"]');
      expect(initialContainer).toBeInTheDocument();
      expect(initialContainer).toBeVisible();

      // Trigger validation error state
      rerender(<EnhancedInput {...mockProps} value="#invalid" />);

      await waitFor(() => {
        // CRITICAL: Input container must still exist and be visible
        const containerAfterError = container.querySelector('[data-testid="enhanced-input-container"]');
        expect(containerAfterError).toBeInTheDocument();
        expect(containerAfterError).toBeVisible();
        
        // Verify it's the same element (not recreated)
        expect(containerAfterError).toBe(initialContainer);
      }, { timeout: 2000 });
    });

    test('🔴 CRITICAL: Input editor area stays in DOM during validation errors', async () => {
      const { rerender, container } = render(<EnhancedInput {...mockProps} />);

      // Wait for input area to be present (the div that would contain CodeMirror)
      await waitFor(() => {
        const editorDiv = container.querySelector('.w-full.rounded-md');
        expect(editorDiv).toBeInTheDocument();
        expect(editorDiv).toBeVisible();
      });

      // Trigger error state
      rerender(<EnhancedInput {...mockProps} value="color:#xyz" />);

      await waitFor(() => {
        // CRITICAL: Input editor area must still be present
        const editorAfterError = container.querySelector('.w-full.rounded-md');
        expect(editorAfterError).toBeInTheDocument();
        expect(editorAfterError).toBeVisible();
      });
    });

    test('🔴 CRITICAL: Input wrapper structure remains stable', async () => {
      const { rerender, container } = render(<EnhancedInput {...mockProps} />);

      const wrapper = container.querySelector('.enhanced-input-wrapper');
      expect(wrapper).toBeInTheDocument();

      // Multiple error state transitions
      rerender(<EnhancedInput {...mockProps} value="@invaliddate" />);
      
      await waitFor(() => {
        const wrapperAfterError = container.querySelector('.enhanced-input-wrapper');
        expect(wrapperAfterError).toBeInTheDocument();
        expect(wrapperAfterError).toBeVisible();
      });

      // Back to valid state
      rerender(<EnhancedInput {...mockProps} value="@today" />);
      
      await waitFor(() => {
        const wrapperAfterValid = container.querySelector('.enhanced-input-wrapper');
        expect(wrapperAfterValid).toBeInTheDocument();
        expect(wrapperAfterValid).toBeVisible();
      });
    });

    test('🔴 CRITICAL: Multiple validation errors do not break input visibility', async () => {
      const { rerender, container } = render(<EnhancedInput {...mockProps} />);

      // Complex input with multiple validation errors
      rerender(<EnhancedInput {...mockProps} value="#invalid color:#xyz @invaliddate" />);

      await waitFor(() => {
        const container_el = container.querySelector('[data-testid="enhanced-input-container"]');
        expect(container_el).toBeInTheDocument();
        expect(container_el).toBeVisible();
        
        const wrapper = container.querySelector('.enhanced-input-wrapper');
        expect(wrapper).toBeInTheDocument();
        expect(wrapper).toBeVisible();
      });
    });

    test('🔴 CRITICAL: Rapid validation state changes maintain input visibility', async () => {
      const { rerender, container } = render(<EnhancedInput {...mockProps} />);

      const testSequence = [
        '',
        '#',
        '#i',
        '#in',  
        '#invalid',
        '#invalid color:#xyz',
        '@invaliddate',
        '@today',
        ''
      ];

      for (const value of testSequence) {
        rerender(<EnhancedInput {...mockProps} value={value} />);
        
        // Input must remain visible throughout all changes
        const container_el = container.querySelector('[data-testid="enhanced-input-container"]');
        expect(container_el).toBeInTheDocument();
        expect(container_el).toBeVisible();
      }
    });
  });

  describe('📊 Validation Error Display Without Breaking Input', () => {
    test('ValidationTooltip renders without affecting input visibility', async () => {
      const { rerender, container } = render(<EnhancedInput {...mockProps} />);

      rerender(<EnhancedInput {...mockProps} value="#invalid" />);

      await waitFor(() => {
        // Both input and validation tooltip should be present
        const inputContainer = container.querySelector('[data-testid="enhanced-input-container"]');
        expect(inputContainer).toBeInTheDocument();
        expect(inputContainer).toBeVisible();

        // Validation classes should be applied but not hide input
        expect(inputContainer?.classList.contains('has-validation-errors') || 
               inputContainer?.classList.contains('has-errors')).toBe(true);
      });
    });

    test('CSS classes for validation states do not interfere with visibility', async () => {
      const { rerender, container } = render(<EnhancedInput {...mockProps} />);

      rerender(<EnhancedInput {...mockProps} value="color:#xyz" />);

      await waitFor(() => {
        const inputContainer = container.querySelector('[data-testid="enhanced-input-container"]');
        
        // Verify validation classes are present
        const hasValidationClasses = inputContainer?.classList.contains('has-validation-errors') ||
                                    inputContainer?.classList.contains('has-errors') ||
                                    inputContainer?.classList.contains('has-validation-warnings') ||
                                    inputContainer?.classList.contains('has-warnings');
        
        expect(hasValidationClasses).toBe(true);
        
        // But input must still be visible
        expect(inputContainer).toBeVisible();
        
        // Check computed styles don't hide the element
        if (inputContainer) {
          const computedStyle = window.getComputedStyle(inputContainer);
          expect(computedStyle.display).not.toBe('none');
          expect(computedStyle.visibility).not.toBe('hidden');
          // Only check opacity if it's a valid number (JSDOM might return undefined)
          const opacity = parseFloat(computedStyle.opacity);
          if (!isNaN(opacity)) {
            expect(opacity).toBeGreaterThan(0);
          }
        }
      });
    });
  });

  describe('🛡️ DOM Stability and Performance', () => {
    test('No DOM node leaks during validation state changes', () => {
      const { rerender, container, unmount } = render(<EnhancedInput {...mockProps} />);

      const initialNodeCount = container.querySelectorAll('*').length;

      // Rapid state changes
      for (let i = 0; i < 10; i++) {
        rerender(<EnhancedInput {...mockProps} value={`#invalid${i}`} />);
      }

      const finalNodeCount = container.querySelectorAll('*').length;
      
      // Should not create excessive DOM nodes (some increase is expected for validation tooltips)
      expect(finalNodeCount - initialNodeCount).toBeLessThan(20);

      unmount();
    });

    test('Input container element reference remains stable', async () => {
      const { rerender, container } = render(<EnhancedInput {...mockProps} />);

      const originalContainer = container.querySelector('[data-testid="enhanced-input-container"]');
      expect(originalContainer).toBeInTheDocument();

      // State change should not recreate the container
      rerender(<EnhancedInput {...mockProps} value="#invalid" />);

      await waitFor(() => {
        const updatedContainer = container.querySelector('[data-testid="enhanced-input-container"]');
        expect(updatedContainer).toBe(originalContainer); // Same object reference
      });
    });
  });
});

/**
 * Export helper function for manual testing
 */
export const assertInputVisibility = (container: HTMLElement, testContext: string) => {
  const inputContainer = container.querySelector('[data-testid="enhanced-input-container"]');
  
  if (!inputContainer) {
    throw new Error(`❌ ${testContext}: Input container not found in DOM - CRITICAL BUG DETECTED`);
  }
  
  if (!inputContainer.checkVisibility || !inputContainer.checkVisibility()) {
    throw new Error(`❌ ${testContext}: Input container is not visible - CRITICAL BUG DETECTED`);
  }
  
  const computedStyle = window.getComputedStyle(inputContainer);
  if (computedStyle.display === 'none' || 
      computedStyle.visibility === 'hidden' || 
      parseFloat(computedStyle.opacity) === 0) {
    throw new Error(`❌ ${testContext}: Input container is hidden via CSS - CRITICAL BUG DETECTED`);
  }
  
  console.log(`✅ ${testContext}: Input visibility verified`);
  return inputContainer;
};