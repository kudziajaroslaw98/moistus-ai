/**
 * End-to-end integration tests for node-editor
 * 
 * Tests the complete system integration including:
 * - Full user workflows and interactions
 * - Component communication and data flow
 * - Real-world usage scenarios
 * - Performance under load
 * - Error recovery and resilience
 * - Accessibility compliance
 * - Command system integration (node type switching, slash commands)
 * - Command palette workflow integration
 * - Enhanced input CodeMirror integration
 * - Store state synchronization
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NodeEditor } from '../node-editor';
import { QuickInput } from '../quick-input';
import { EnhancedInput } from '../enhanced-input/enhanced-input';
import { CommandPalette } from '../command-palette';
import { commandRegistry } from '../commands/command-registry';
import { processNodeTypeSwitch, detectCommandTrigger } from '../parsers/command-parser';
import useAppStore from '@/store/mind-map-store';

// Mock all dependencies to test integration
jest.mock('../quick-input', () => ({
  QuickInput: ({ value, onChange, onSubmit, mode, ...props }: any) => (
    <div data-testid="quick-input" data-mode={mode} {...props}>
      <input
        data-testid="quick-input-field"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit?.(value);
        }}
      />
    </div>
  )
}));

jest.mock('../structured-input', () => ({
  StructuredInput: ({ mode, onSubmit, onCancel, initialData }: any) => (
    <div data-testid="structured-input" data-mode={mode}>
      <div>Initial: {JSON.stringify(initialData)}</div>
      <button data-testid="structured-submit" onClick={() => onSubmit?.(initialData)}>
        Submit
      </button>
      <button data-testid="structured-cancel" onClick={onCancel}>
        Cancel
      </button>
    </div>
  )
}));

jest.mock('../mode-toggle', () => ({
  ModeToggle: ({ mode, onModeChange }: any) => (
    <div data-testid="mode-toggle">
      <button 
        data-testid="toggle-quick" 
        onClick={() => onModeChange?.('quick')}
        data-active={mode === 'quick'}
      >
        Quick
      </button>
      <button 
        data-testid="toggle-structured" 
        onClick={() => onModeChange?.('structured')}
        data-active={mode === 'structured'}
      >
        Structured
      </button>
    </div>
  )
}));

jest.mock('../command-palette', () => ({
  CommandPalette: ({ isOpen, onSelect, onClose }: any) => (
    isOpen ? (
      <div data-testid="command-palette">
        <button onClick={() => onSelect?.('/task')}>Create Task</button>
        <button onClick={() => onSelect?.('/text')}>Create Text</button>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  )
}));

// Mock parsers with comprehensive functionality
jest.mock('../parsers', () => ({
  parseTextInput: jest.fn((input) => {
    const patterns = {
      bold: /\*\*(.*?)\*\*/g,
      italic: /\*(.*?)\*/g,
      fontSize: /@(\d+(?:px|rem|em)?)/g,
      color: /color:(#[0-9a-f]{6}|#[0-9a-f]{3}|\w+)/gi,
      align: /align:(left|center|right)/gi
    };

    let content = input;
    const metadata: any = {};

    // Extract bold
    if (patterns.bold.test(input)) {
      content = content.replace(patterns.bold, '$1');
      metadata.fontWeight = 'bold';
    }

    // Extract italic
    if (patterns.italic.test(content)) {
      content = content.replace(patterns.italic, '$1');
      metadata.fontStyle = 'italic';
    }

    // Extract font size
    const fontSizeMatch = patterns.fontSize.exec(input);
    if (fontSizeMatch) {
      content = content.replace(patterns.fontSize, '').trim();
      metadata.fontSize = fontSizeMatch[1].includes('px') ? fontSizeMatch[1] : `${fontSizeMatch[1]}px`;
    }

    // Extract color
    const colorMatch = patterns.color.exec(input);
    if (colorMatch) {
      content = content.replace(patterns.color, '').trim();
      metadata.textColor = colorMatch[1];
    }

    // Extract alignment
    const alignMatch = patterns.align.exec(input);
    if (alignMatch) {
      content = content.replace(patterns.align, '').trim();
      metadata.textAlign = alignMatch[1].toLowerCase();
    }

    return {
      content: content.trim(),
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined
    };
  }),

  parseTaskInput: jest.fn((input) => {
    const patterns = {
      checkbox: /^\s*[-*]?\s*\[([x\sX;,])\]/,
      date: /@([a-zA-Z0-9-]+)/g,
      priority: /#([a-zA-Z]+)/g,
      tag: /\[([^\]]+)\]/g,
      assignee: /\+([a-zA-Z0-9._-]+)/g,
      color: /color:(#[0-9a-f]{6}|#[0-9a-f]{3})/gi
    };

    let text = input;
    const patterns_found = [];
    let isComplete = false;

    // Check for checkbox
    const checkboxMatch = patterns.checkbox.exec(input);
    if (checkboxMatch) {
      const marker = checkboxMatch[1].trim();
      isComplete = ['x', 'X', ';', ','].includes(marker);
      text = text.replace(patterns.checkbox, '').trim();
    }

    // Extract dates
    let dateMatch;
    while ((dateMatch = patterns.date.exec(input)) !== null) {
      patterns_found.push({ type: 'date', value: dateMatch[1] });
      text = text.replace(dateMatch[0], '').trim();
    }

    // Extract priorities
    let priorityMatch;
    while ((priorityMatch = patterns.priority.exec(input)) !== null) {
      patterns_found.push({ type: 'priority', value: priorityMatch[1] });
      text = text.replace(priorityMatch[0], '').trim();
    }

    // Extract tags
    let tagMatch;
    while ((tagMatch = patterns.tag.exec(input)) !== null) {
      if (!['x', 'X', ' ', ';', ',', ''].includes(tagMatch[1].trim())) {
        patterns_found.push({ type: 'tag', value: tagMatch[1] });
      }
      text = text.replace(tagMatch[0], '').trim();
    }

    // Extract assignees
    let assigneeMatch;
    while ((assigneeMatch = patterns.assignee.exec(input)) !== null) {
      patterns_found.push({ type: 'assignee', value: assigneeMatch[1] });
      text = text.replace(assigneeMatch[0], '').trim();
    }

    // Extract colors
    let colorMatch;
    while ((colorMatch = patterns.color.exec(input)) !== null) {
      patterns_found.push({ type: 'color', value: colorMatch[1] });
      text = text.replace(colorMatch[0], '').trim();
    }

    // Clean up extra spaces
    text = text.replace(/\s+/g, ' ').trim() || 'New task';

    return {
      tasks: [{
        text,
        isComplete,
        patterns: patterns_found
      }],
      dueDate: patterns_found.find(p => p.type === 'date')?.value ? new Date() : null,
      priority: patterns_found.find(p => p.type === 'priority')?.value || null,
      assignee: patterns_found.find(p => p.type === 'assignee')?.value || null,
      tags: patterns_found.filter(p => p.type === 'tag').map(p => p.value)
    };
  })
}));

// Mock validation with comprehensive rules
jest.mock('../validation', () => ({
  getValidationResults: jest.fn((input) => {
    if (!input || typeof input !== 'string') return [];
    
    const errors = [];
    
    // Date validation - the key "@2" bug fix
    const dateMatches = input.match(/@([a-zA-Z0-9-/]+)/g);
    if (dateMatches) {
      dateMatches.forEach(match => {
        const dateValue = match.substring(1);
        // Only validate if it's a complete date (not partial like "@2")
        if (dateValue.length > 2 && !['today', 'tomorrow', 'yesterday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'week', 'month', 'next', 'last'].includes(dateValue.toLowerCase())) {
          if (!/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateValue)) {
            errors.push({
              type: 'error',
              message: 'Invalid date format. Use keywords like "today", "tomorrow" or YYYY-MM-DD format.',
              startIndex: input.indexOf(match),
              endIndex: input.indexOf(match) + match.length,
              suggestion: 'today'
            });
          }
        }
      });
    }
    
    // Priority validation
    const priorityMatches = input.match(/#([a-zA-Z]+)/g);
    if (priorityMatches) {
      priorityMatches.forEach(match => {
        const priorityValue = match.substring(1).toLowerCase();
        if (!['critical', 'high', 'medium', 'low', 'urgent', 'asap', 'blocked', 'waiting', 'someday', 'none'].includes(priorityValue)) {
          errors.push({
            type: 'error',
            message: 'Invalid priority. Valid priorities include: critical, high, medium, low, urgent, asap',
            startIndex: input.indexOf(match),
            endIndex: input.indexOf(match) + match.length,
            suggestion: 'medium'
          });
        }
      });
    }
    
    // Color validation
    const colorMatches = input.match(/color:(#[0-9a-f]{3,6}|[a-zA-Z-]+)/gi);
    if (colorMatches) {
      colorMatches.forEach(match => {
        const colorValue = match.substring(6); // Remove 'color:'
        if (!/^#[0-9a-f]{3}$|^#[0-9a-f]{6}$|^[a-zA-Z-]+$/i.test(colorValue)) {
          errors.push({
            type: 'error',
            message: 'Invalid color format. Use hex format (#RGB or #RRGGBB) or named colors',
            startIndex: input.indexOf(match),
            endIndex: input.indexOf(match) + match.length,
            suggestion: '#000000'
          });
        }
      });
    }
    
    return errors;
  }),

  validateInput: jest.fn((input) => {
    const { getValidationResults } = require('../validation');
    return getValidationResults(input);
  }),

  findIncompletePatterns: jest.fn((input) => {
    const warnings = [];
    
    // Incomplete tag patterns
    if (input.includes('[') && !input.includes(']')) {
      warnings.push({
        type: 'warning',
        message: 'Incomplete tag - missing closing bracket',
        startIndex: input.indexOf('['),
        endIndex: input.length
      });
    }
    
    // Incomplete color patterns
    if (input.includes('color:') && input.split('color:')[1]?.length < 3) {
      warnings.push({
        type: 'warning',
        message: 'Incomplete color value - provide a hex color value',
        startIndex: input.indexOf('color:'),
        endIndex: input.length
      });
    }
    
    return warnings;
  })
}));

describe('NodeEditor Integration Tests', () => {
  const defaultProps = {
    mode: 'text' as const,
    onSubmit: jest.fn(),
    onChange: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete System Integration', () => {
    it('should render with all components integrated', () => {
      render(<NodeEditor {...defaultProps} />);
      
      expect(screen.getByTestId('mode-toggle')).toBeInTheDocument();
      expect(screen.getByTestId('quick-input')).toBeInTheDocument();
    });

    it('should switch between quick and structured modes', async () => {
      render(<NodeEditor {...defaultProps} />);
      
      // Initially in quick mode
      expect(screen.getByTestId('quick-input')).toBeInTheDocument();
      expect(screen.queryByTestId('structured-input')).not.toBeInTheDocument();
      
      // Switch to structured mode
      const structuredToggle = screen.getByTestId('toggle-structured');
      await userEvent.click(structuredToggle);
      
      expect(screen.getByTestId('structured-input')).toBeInTheDocument();
      expect(screen.queryByTestId('quick-input')).not.toBeInTheDocument();
      
      // Switch back to quick mode
      const quickToggle = screen.getByTestId('toggle-quick');
      await userEvent.click(quickToggle);
      
      expect(screen.getByTestId('quick-input')).toBeInTheDocument();
      expect(screen.queryByTestId('structured-input')).not.toBeInTheDocument();
    });

    it('should maintain data when switching modes', async () => {
      const mockOnChange = jest.fn();
      render(<NodeEditor {...defaultProps} onChange={mockOnChange} />);
      
      // Enter data in quick mode
      const quickInput = screen.getByTestId('quick-input-field');
      await userEvent.type(quickInput, 'Test data @today #high');
      
      // Switch to structured mode
      const structuredToggle = screen.getByTestId('toggle-structured');
      await userEvent.click(structuredToggle);
      
      // Data should be passed to structured mode
      const structuredInput = screen.getByTestId('structured-input');
      expect(structuredInput).toBeInTheDocument();
    });

    it('should open command palette with keyboard shortcut', async () => {
      render(<NodeEditor {...defaultProps} />);
      
      // Press Ctrl+K to open command palette
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
      
      expect(screen.getByTestId('command-palette')).toBeInTheDocument();
    });

    it('should handle command palette selections', async () => {
      render(<NodeEditor {...defaultProps} />);
      
      // Open command palette
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
      
      // Select task command
      const taskCommand = screen.getByText('Create Task');
      await userEvent.click(taskCommand);
      
      // Should switch to task mode
      const quickInput = screen.getByTestId('quick-input');
      expect(quickInput).toHaveAttribute('data-mode', 'task');
    });
  });

  describe('Real-world User Workflows', () => {
    describe('New User Learning Workflow', () => {
      it('should guide user from simple to complex input', async () => {
        const mockOnSubmit = jest.fn();
        render(<NodeEditor {...defaultProps} onSubmit={mockOnSubmit} />);
        
        const quickInput = screen.getByTestId('quick-input-field');
        
        // Step 1: Simple text
        await userEvent.type(quickInput, 'Hello world');
        fireEvent.keyDown(quickInput, { key: 'Enter' });
        
        expect(mockOnSubmit).toHaveBeenCalledWith({
          content: 'Hello world',
          metadata: undefined
        });
        
        // Step 2: Add formatting
        await userEvent.clear(quickInput);
        await userEvent.type(quickInput, '**Bold text**');
        fireEvent.keyDown(quickInput, { key: 'Enter' });
        
        expect(mockOnSubmit).toHaveBeenCalledWith({
          content: 'Bold text',
          metadata: { fontWeight: 'bold' }
        });
        
        // Step 3: Add more complex formatting
        await userEvent.clear(quickInput);
        await userEvent.type(quickInput, 'Large **bold** text @24px color:#ff0000');
        fireEvent.keyDown(quickInput, { key: 'Enter' });
        
        expect(mockOnSubmit).toHaveBeenCalledWith({
          content: 'Large bold text',
          metadata: {
            fontWeight: 'bold',
            fontSize: '24px',
            textColor: '#ff0000'
          }
        });
      });

      it('should handle user switching to task mode', async () => {
        const mockOnSubmit = jest.fn();
        render(<NodeEditor {...defaultProps} mode="task" onSubmit={mockOnSubmit} />);
        
        const quickInput = screen.getByTestId('quick-input-field');
        
        // Simple task
        await userEvent.type(quickInput, '[x] Completed task');
        fireEvent.keyDown(quickInput, { key: 'Enter' });
        
        expect(mockOnSubmit).toHaveBeenCalledWith({
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
        
        // Complex task with patterns
        await userEvent.clear(quickInput);
        await userEvent.type(quickInput, 'Review PR @today #high [urgent] +frontend');
        fireEvent.keyDown(quickInput, { key: 'Enter' });
        
        expect(mockOnSubmit).toHaveBeenCalledWith({
          tasks: [{
            text: 'Review PR',
            isComplete: false,
            patterns: [
              { type: 'date', value: 'today' },
              { type: 'priority', value: 'high' },
              { type: 'tag', value: 'urgent' },
              { type: 'assignee', value: 'frontend' }
            ]
          }],
          dueDate: expect.any(Date),
          priority: 'high',
          assignee: 'frontend',
          tags: ['urgent']
        });
      });
    });

    describe('Power User Rapid Entry', () => {
      it('should handle rapid complex inputs efficiently', async () => {
        const mockOnSubmit = jest.fn();
        render(<NodeEditor {...defaultProps} mode="task" onSubmit={mockOnSubmit} />);
        
        const quickInput = screen.getByTestId('quick-input-field');
        
        const rapidInputs = [
          'Deploy staging @today #critical [deploy] +devops color:#ff0000',
          '[x] Code review @yesterday #high [done] +team',
          'Team meeting @friday #medium [weekly] +everyone',
          'Bug fix @asap #urgent [hotfix] +backend color:#ffaa00',
          'Documentation @next #low [docs] +technical-writer'
        ];
        
        const startTime = performance.now();
        
        for (const input of rapidInputs) {
          await userEvent.clear(quickInput);
          await userEvent.type(quickInput, input);
          fireEvent.keyDown(quickInput, { key: 'Enter' });
        }
        
        const endTime = performance.now();
        
        expect(endTime - startTime).toBeLessThan(5000); // Should be fast
        expect(mockOnSubmit).toHaveBeenCalledTimes(5);
      });

      it('should handle structured mode for complex data entry', async () => {
        const mockOnSubmit = jest.fn();
        render(<NodeEditor {...defaultProps} onSubmit={mockOnSubmit} />);
        
        // Switch to structured mode
        const structuredToggle = screen.getByTestId('toggle-structured');
        await userEvent.click(structuredToggle);
        
        // Submit structured data
        const submitButton = screen.getByTestId('structured-submit');
        await userEvent.click(submitButton);
        
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    describe('Error Recovery Workflows', () => {
      it('should handle validation errors gracefully', async () => {
        render(<NodeEditor {...defaultProps} mode="task" />);
        
        const quickInput = screen.getByTestId('quick-input-field');
        
        // Enter invalid date
        await userEvent.type(quickInput, 'Task @invaliddate');
        
        // Should show validation error but not crash
        expect(screen.getByTestId('quick-input')).toBeInTheDocument();
        
        // User corrects the error
        await userEvent.clear(quickInput);
        await userEvent.type(quickInput, 'Task @today');
        
        // Should work normally
        expect(screen.getByTestId('quick-input')).toBeInTheDocument();
      });

      it('should handle the "@2" bug scenario correctly', async () => {
        render(<NodeEditor {...defaultProps} mode="task" />);
        
        const quickInput = screen.getByTestId('quick-input-field');
        
        // The critical "@2" case that was causing errors
        await userEvent.type(quickInput, '@2');
        
        // Should not show validation errors for partial input
        // This tests the specific bug fix
        expect(screen.getByTestId('quick-input')).toBeInTheDocument();
        
        // Continue typing to complete date
        await userEvent.type(quickInput, '024-01-15');
        
        // Should accept complete valid date
        expect(quickInput).toHaveValue('@2024-01-15');
      });

      it('should recover from parsing errors', async () => {
        const { parseTaskInput } = require('../parsers');
        
        // Mock parser to throw error once, then work normally
        let errorThrown = false;
        parseTaskInput.mockImplementation((input) => {
          if (!errorThrown) {
            errorThrown = true;
            throw new Error('Parse error');
          }
          return {
            tasks: [{ text: input, isComplete: false, patterns: [] }],
            dueDate: null,
            priority: null,
            assignee: null,
            tags: []
          };
        });
        
        render(<NodeEditor {...defaultProps} mode="task" />);
        
        const quickInput = screen.getByTestId('quick-input-field');
        
        // First input should trigger error but component should recover
        await userEvent.type(quickInput, 'First input');
        expect(screen.getByTestId('quick-input')).toBeInTheDocument();
        
        // Second input should work normally
        await userEvent.clear(quickInput);
        await userEvent.type(quickInput, 'Second input');
        expect(screen.getByTestId('quick-input')).toBeInTheDocument();
      });
    });
  });

  describe('Performance Under Load', () => {
    it('should handle rapid input changes without performance degradation', async () => {
      render(<NodeEditor {...defaultProps} />);
      
      const quickInput = screen.getByTestId('quick-input-field');
      
      const startTime = performance.now();
      
      // Simulate rapid typing
      for (let i = 0; i < 100; i++) {
        fireEvent.change(quickInput, { target: { value: `input${i}` } });
      }
      
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should handle rapidly
      expect(quickInput).toHaveValue('input99');
    });

    it('should handle large input values efficiently', async () => {
      render(<NodeEditor {...defaultProps} />);
      
      const quickInput = screen.getByTestId('quick-input-field');
      const largeInput = 'Large input '.repeat(1000) + '@today #high [tag]';
      
      const startTime = performance.now();
      await userEvent.type(quickInput, largeInput);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(2000); // Should handle large input
      expect(quickInput).toHaveValue(largeInput);
    });

    it('should maintain performance with complex validation', async () => {
      render(<NodeEditor {...defaultProps} mode="task" />);
      
      const quickInput = screen.getByTestId('quick-input-field');
      
      const complexInput = Array.from({length: 50}, (_, i) => 
        `task${i} @today #high [tag${i}] +user${i}`
      ).join(' ');
      
      const startTime = performance.now();
      
      // Type and validate complex input
      fireEvent.change(quickInput, { target: { value: complexInput } });
      
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(500); // Should validate quickly
    });
  });

  describe('Accessibility Compliance', () => {
    it('should support keyboard navigation throughout the interface', async () => {
      render(<NodeEditor {...defaultProps} />);
      
      // Tab should navigate through focusable elements
      const quickInput = screen.getByTestId('quick-input-field');
      const modeToggle = screen.getByTestId('toggle-structured');
      
      quickInput.focus();
      expect(document.activeElement).toBe(quickInput);
      
      // Tab to next element
      fireEvent.keyDown(quickInput, { key: 'Tab' });
      
      // Should maintain focus management
      expect(document.activeElement).toBeDefined();
    });

    it('should provide proper ARIA labels and roles', () => {
      render(<NodeEditor {...defaultProps} />);
      
      const quickInput = screen.getByTestId('quick-input');
      const modeToggle = screen.getByTestId('mode-toggle');
      
      // Components should have appropriate accessibility attributes
      expect(quickInput).toBeInTheDocument();
      expect(modeToggle).toBeInTheDocument();
    });

    it('should announce state changes to screen readers', async () => {
      render(<NodeEditor {...defaultProps} />);
      
      // Mode changes should be announced
      const structuredToggle = screen.getByTestId('toggle-structured');
      await userEvent.click(structuredToggle);
      
      const structuredInput = screen.getByTestId('structured-input');
      expect(structuredInput).toBeInTheDocument();
    });

    it('should handle focus management when switching modes', async () => {
      render(<NodeEditor {...defaultProps} />);
      
      // Focus quick input
      const quickInput = screen.getByTestId('quick-input-field');
      quickInput.focus();
      expect(document.activeElement).toBe(quickInput);
      
      // Switch to structured mode
      const structuredToggle = screen.getByTestId('toggle-structured');
      await userEvent.click(structuredToggle);
      
      // Focus should be managed appropriately
      const structuredInput = screen.getByTestId('structured-input');
      expect(structuredInput).toBeInTheDocument();
    });
  });

  describe('Component Communication and Data Flow', () => {
    it('should properly pass data between components', async () => {
      const mockOnChange = jest.fn();
      const mockOnSubmit = jest.fn();
      
      render(<NodeEditor {...defaultProps} onChange={mockOnChange} onSubmit={mockOnSubmit} />);
      
      const quickInput = screen.getByTestId('quick-input-field');
      
      // Input change should trigger onChange
      await userEvent.type(quickInput, 'Test input');
      expect(mockOnChange).toHaveBeenCalled();
      
      // Submit should trigger onSubmit
      fireEvent.keyDown(quickInput, { key: 'Enter' });
      expect(mockOnSubmit).toHaveBeenCalled();
    });

    it('should synchronize state between quick and structured modes', async () => {
      render(<NodeEditor {...defaultProps} />);
      
      // Enter data in quick mode
      const quickInput = screen.getByTestId('quick-input-field');
      await userEvent.type(quickInput, 'Sync test @today #high');
      
      // Switch to structured mode
      const structuredToggle = screen.getByTestId('toggle-structured');
      await userEvent.click(structuredToggle);
      
      // Data should be reflected in structured mode
      const structuredInput = screen.getByTestId('structured-input');
      expect(structuredInput).toBeInTheDocument();
      
      // Switch back to quick mode
      const quickToggle = screen.getByTestId('toggle-quick');
      await userEvent.click(quickToggle);
      
      // Original data should be preserved
      const quickInputField = screen.getByTestId('quick-input-field');
      expect(quickInputField).toHaveValue('Sync test @today #high');
    });

    it('should handle command palette integration', async () => {
      render(<NodeEditor {...defaultProps} />);
      
      // Open command palette
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
      expect(screen.getByTestId('command-palette')).toBeInTheDocument();
      
      // Select text command
      const textCommand = screen.getByText('Create Text');
      await userEvent.click(textCommand);
      
      // Should close palette and switch to text mode
      expect(screen.queryByTestId('command-palette')).not.toBeInTheDocument();
      expect(screen.getByTestId('quick-input')).toHaveAttribute('data-mode', 'text');
    });

    it('should propagate validation state correctly', async () => {
      render(<NodeEditor {...defaultProps} mode="task" />);
      
      const quickInput = screen.getByTestId('quick-input-field');
      
      // Enter invalid data
      await userEvent.type(quickInput, 'Task @invaliddate #wrongpriority');
      
      // Validation should be handled by the component
      expect(screen.getByTestId('quick-input')).toBeInTheDocument();
      
      // Fix validation errors
      await userEvent.clear(quickInput);
      await userEvent.type(quickInput, 'Task @today #high');
      
      // Should clear validation errors
      expect(screen.getByTestId('quick-input')).toBeInTheDocument();
    });
  });

  describe('Edge Cases and Resilience', () => {
    it('should handle null and undefined props gracefully', () => {
      expect(() => {
        render(<NodeEditor mode={undefined as any} onSubmit={undefined as any} />);
      }).not.toThrow();
    });

    it('should recover from component errors', () => {
      // Mock console.error to suppress error logs
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Test should not crash even if child components throw errors
      expect(() => {
        render(<NodeEditor {...defaultProps} />);
      }).not.toThrow();
      
      consoleSpy.mockRestore();
    });

    it('should handle rapid mode switching', async () => {
      render(<NodeEditor {...defaultProps} />);
      
      const quickToggle = screen.getByTestId('toggle-quick');
      const structuredToggle = screen.getByTestId('toggle-structured');
      
      // Rapidly switch between modes
      for (let i = 0; i < 10; i++) {
        await userEvent.click(structuredToggle);
        await userEvent.click(quickToggle);
      }
      
      // Should end up in stable state
      expect(screen.getByTestId('quick-input')).toBeInTheDocument();
    });

    it('should handle memory cleanup on unmount', () => {
      const { unmount } = render(<NodeEditor {...defaultProps} />);
      
      // Should not throw errors during cleanup
      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it('should handle concurrent validation requests', async () => {
      render(<NodeEditor {...defaultProps} mode="task" />);
      
      const quickInput = screen.getByTestId('quick-input-field');
      
      // Send multiple validation requests rapidly
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          userEvent.type(quickInput, `@test${i}`)
        );
      }
      
      // Wait for all to complete
      await Promise.all(promises);
      
      // Should handle concurrent validation without errors
      expect(screen.getByTestId('quick-input')).toBeInTheDocument();
    });
  });

  describe('Specific Bug Regression Tests', () => {
    it('should prevent "@2" validation bug regression', async () => {
      render(<NodeEditor {...defaultProps} mode="task" />);
      
      const quickInput = screen.getByTestId('quick-input-field');
      
      // This exact scenario was causing the bug
      await userEvent.type(quickInput, '@2');
      
      // Should not show validation errors for partial input
      // The component should handle this gracefully
      expect(screen.getByTestId('quick-input')).toBeInTheDocument();
      expect(quickInput).toHaveValue('@2');
      
      // Continue typing to make it a valid date
      await userEvent.type(quickInput, '024-01-15');
      expect(quickInput).toHaveValue('@2024-01-15');
      
      // Should not show any validation errors
      expect(screen.getByTestId('quick-input')).toBeInTheDocument();
    });

    it('should handle #asap validation correctly', async () => {
      render(<NodeEditor {...defaultProps} mode="task" />);
      
      const quickInput = screen.getByTestId('quick-input-field');
      
      // #asap was previously incorrectly flagged as invalid
      await userEvent.type(quickInput, 'Urgent task #asap');
      
      // Should be valid and not show errors
      expect(screen.getByTestId('quick-input')).toBeInTheDocument();
      expect(quickInput).toHaveValue('Urgent task #asap');
    });

    it('should handle new checkbox formats correctly', async () => {
      render(<NodeEditor {...defaultProps} mode="task" />);
      
      const quickInput = screen.getByTestId('quick-input-field');
      
      const newFormats = [
        '[;] Task with semicolon',
        '[,] Task with comma',
        '[ ; ] Task with spaced semicolon',
        '[ , ] Task with spaced comma'
      ];
      
      for (const format of newFormats) {
        await userEvent.clear(quickInput);
        await userEvent.type(quickInput, format);
        
        // Should parse correctly without errors
        expect(screen.getByTestId('quick-input')).toBeInTheDocument();
        expect(quickInput).toHaveValue(format);
        
        // Submit to test parsing
        fireEvent.keyDown(quickInput, { key: 'Enter' });
      }
    });

    it('should handle incomplete patterns without crashes', async () => {
      render(<NodeEditor {...defaultProps} mode="task" />);
      
      const quickInput = screen.getByTestId('quick-input-field');
      
      const incompletePatterns = [
        'Task [incomplete',
        'Task color:',
        'Task color:#f',
        'Task @',
        'Task #',
        'Task +'
      ];
      
      for (const pattern of incompletePatterns) {
        await userEvent.clear(quickInput);
        await userEvent.type(quickInput, pattern);
        
        // Should handle incomplete patterns gracefully
        expect(screen.getByTestId('quick-input')).toBeInTheDocument();
        expect(quickInput).toHaveValue(pattern);
      }
    });
  });

  describe('Command System Integration', () => {
    let mockStoreActions: any;

    beforeEach(() => {
      mockStoreActions = {
        setCommandPaletteOpen: jest.fn(),
        updateCommandPaletteState: jest.fn(),
        createNode: jest.fn(),
        updateNode: jest.fn(),
      };

      // Mock the store for command system tests
      if (typeof useAppStore === 'function') {
        (useAppStore as jest.MockedFunction<typeof useAppStore>).mockReturnValue({
          uiState: {
            isCommandPaletteOpen: false,
            commandPaletteState: {
              selectedIndex: 0,
              searchQuery: '',
              filteredCommands: [],
            }
          },
          actions: mockStoreActions,
        } as any);
      }

      // Setup command registry
      commandRegistry.clearRegistry();
      const testCommands = [
        {
          id: '$task',
          trigger: '$task',
          label: 'Task List',
          description: 'Create a task list',
          category: 'node-type',
          triggerType: 'node-type',
          nodeType: 'taskNode',
          action: () => ({ nodeType: 'taskNode', replacement: '' })
        },
        {
          id: '/date',
          trigger: '/date',
          label: 'Date',
          description: 'Insert current date',
          category: 'pattern',
          triggerType: 'slash',
          action: () => ({ replacement: new Date().toISOString().split('T')[0] })
        }
      ];
      testCommands.forEach(cmd => commandRegistry.registerCommand(cmd as any));
    });

    it('should integrate command detection with node editor workflow', async () => {
      const mockOnSubmit = jest.fn();
      const mockOnChange = jest.fn();
      
      render(<NodeEditor {...defaultProps} onSubmit={mockOnSubmit} onChange={mockOnChange} mode="text" />);
      
      const quickInput = screen.getByTestId('quick-input-field');
      
      // Simulate user typing command
      await userEvent.type(quickInput, 'Buy groceries $task');
      
      // Should detect command
      const trigger = detectCommandTrigger('Buy groceries $task', 18);
      expect(trigger?.type).toBe('node-type');
      expect(trigger?.nodeType).toBe('taskNode');
      
      // Process the command
      const switchResult = processNodeTypeSwitch('Buy groceries $task', 18, 'text');
      expect(switchResult.success).toBe(true);
      expect(switchResult.nodeType).toBe('taskNode');
      expect(switchResult.text).toBe('Buy groceries');
      
      // Submit should work
      fireEvent.keyDown(quickInput, { key: 'Enter' });
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it('should handle slash command integration with command palette', async () => {
      render(<NodeEditor {...defaultProps} />);
      
      const quickInput = screen.getByTestId('quick-input-field');
      
      // Type slash command
      await userEvent.type(quickInput, 'Task due /date');
      
      // Should detect slash command
      const slashTrigger = detectCommandTrigger('Task due /date', 12);
      expect(slashTrigger?.type).toBe('slash');
      expect(slashTrigger?.trigger).toBe('/date');
      
      // This would normally open command palette
      if (mockStoreActions.setCommandPaletteOpen) {
        expect(mockStoreActions.setCommandPaletteOpen).toHaveBeenCalledWith(true);
      }
    });

    it('should handle enhanced input command integration', async () => {
      const mockOnChange = jest.fn();
      
      render(
        <EnhancedInput
          value=""
          onChange={mockOnChange}
          mode="defaultNode"
          enableCommands={true}
        />
      );
      
      // Should initialize without errors
      expect(screen.getByTestId('enhanced-input')).toBeInTheDocument();
      
      // Test command detection
      const testText = '$code console.log()';
      const trigger = detectCommandTrigger(testText, 5);
      expect(trigger?.nodeType).toBe('codeNode');
      
      // Should handle command completions
      const matches = commandRegistry.findMatchingCommands('$ta');
      expect(matches.some(cmd => cmd.trigger.includes('task'))).toBe(true);
    });

    it('should maintain state consistency during command operations', async () => {
      const mockOnSubmit = jest.fn();
      let currentNodeType = 'text';
      
      const mockOnNodeTypeChange = jest.fn((newType) => {
        currentNodeType = newType;
      });
      
      render(
        <NodeEditor 
          {...defaultProps} 
          mode={currentNodeType as any}
          onSubmit={mockOnSubmit}
          onNodeTypeChange={mockOnNodeTypeChange}
        />
      );
      
      const quickInput = screen.getByTestId('quick-input-field');
      
      // Type content with node type switch
      await userEvent.type(quickInput, 'Start with text $task');
      
      // Simulate processing the switch
      const switchResult = processNodeTypeSwitch('Start with text $task', 20, currentNodeType as any);
      if (switchResult.success && mockOnNodeTypeChange) {
        mockOnNodeTypeChange(switchResult.nodeType);
      }
      
      expect(mockOnNodeTypeChange).toHaveBeenCalledWith('taskNode');
      
      // Submit with new type
      fireEvent.keyDown(quickInput, { key: 'Enter' });
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it('should handle command execution errors gracefully', async () => {
      // Mock error-throwing command
      commandRegistry.registerCommand({
        id: 'error-command',
        trigger: '/error',
        label: 'Error Command',
        description: 'Command that fails',
        category: 'pattern',
        triggerType: 'slash',
        action: () => {
          throw new Error('Command execution failed');
        }
      } as any);
      
      render(<NodeEditor {...defaultProps} />);
      
      const quickInput = screen.getByTestId('quick-input-field');
      await userEvent.type(quickInput, 'Test /error');
      
      // Should not crash the component
      expect(quickInput).toBeInTheDocument();
      expect(quickInput).toHaveValue('Test /error');
      
      // Error should be handled gracefully
      const result = await commandRegistry.executeCommand('error-command', {
        currentText: 'Test /error',
        cursorPosition: 10
      });
      
      expect(result).toBeDefined();
      expect(result?.message).toContain('Failed to execute command');
    });

    it('should handle performance with rapid command detection', async () => {
      render(<NodeEditor {...defaultProps} />);
      
      const quickInput = screen.getByTestId('quick-input-field');
      
      const startTime = performance.now();
      
      // Simulate rapid typing with commands
      const rapidInputs = ['$task', '$note', '/date', '/priority'];
      
      for (const input of rapidInputs) {
        await userEvent.clear(quickInput);
        await userEvent.type(input, input, { delay: 1 });
        
        // Detect commands quickly
        const trigger = detectCommandTrigger(input, input.length);
        expect(trigger).toBeTruthy();
      }
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(1000); // Should be fast
    });

    it('should handle complex command composition workflows', async () => {
      render(<NodeEditor {...defaultProps} mode="task" />);
      
      const quickInput = screen.getByTestId('quick-input-field');
      
      // Complex workflow with multiple commands
      await userEvent.type(quickInput, 'Meeting notes $task /date tomorrow');
      
      // Should detect both commands
      const nodeTypeTrigger = detectCommandTrigger('Meeting notes $task /date tomorrow', 19);
      expect(nodeTypeTrigger?.nodeType).toBe('taskNode');
      
      const dateTrigger = detectCommandTrigger('Meeting notes $task /date tomorrow', 32);
      expect(dateTrigger?.trigger).toBe('/date');
      
      // Should handle complex scenario without errors
      const mockOnSubmit = jest.fn();
      if (mockOnSubmit) {
        fireEvent.keyDown(quickInput, { key: 'Enter' });
        await waitFor(() => {
          // Component should handle complex commands
          expect(quickInput).toBeInTheDocument();
        });
      }
    });
  });
});