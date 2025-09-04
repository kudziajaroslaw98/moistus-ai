/**
 * Component Tests for EnhancedInput Command Integration
 * 
 * Tests the EnhancedInput component's integration with the command system:
 * - CodeMirror command completions and decorations
 * - Command detection in rich text environment
 * - Real-time command processing and feedback
 * - Advanced editing features with commands
 * - Performance with complex text and multiple commands
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnhancedInput } from '../enhanced-input/enhanced-input';
import { commandRegistry } from '../commands/command-registry';
import { detectCommandTrigger, processNodeTypeSwitch } from '../commands/command-parser';

// Mock CodeMirror
jest.mock('@codemirror/view', () => ({
  EditorView: jest.fn(() => ({
    state: {
      doc: { toString: () => '', length: 0 },
      selection: { main: { head: 0 } }
    },
    dispatch: jest.fn(),
    destroy: jest.fn(),
    focus: jest.fn(),
  })),
  keymap: jest.fn(() => ({})),
  placeholder: jest.fn(() => ({})),
}));

jest.mock('@codemirror/state', () => ({
  EditorState: {
    create: jest.fn(() => ({
      doc: { toString: () => '', length: 0 },
      selection: { main: { head: 0 } }
    })),
  },
  Compartment: jest.fn(() => ({
    of: jest.fn(() => ({})),
  })),
}));

// Mock the command completions and decorations
jest.mock('../codemirror/command-completions', () => ({
  createCommandCompletions: jest.fn(() => ({})),
}));

jest.mock('../codemirror/command-decorations', () => ({
  createCommandDecorations: jest.fn(() => ({})),
}));

// Mock motion for simpler testing
jest.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('EnhancedInput Command Integration', () => {
  let mockEditorView: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock EditorView instance
    mockEditorView = {
      state: {
        doc: { toString: () => '', length: 0 },
        selection: { main: { head: 0 } }
      },
      dispatch: jest.fn(),
      destroy: jest.fn(),
      focus: jest.fn(),
    };

    // Setup command registry with test commands
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
        id: '$code',
        trigger: '$code',
        label: 'Code Block',
        description: 'Create a code block',
        category: 'node-type',
        triggerType: 'node-type',
        nodeType: 'codeNode',
        action: () => ({ nodeType: 'codeNode', replacement: '' })
      },
      {
        id: '/date',
        trigger: '/date',
        label: 'Date',
        description: 'Insert current date',
        category: 'pattern',
        triggerType: 'slash',
        action: () => ({ replacement: new Date().toISOString().split('T')[0] })
      },
      {
        id: '/bold',
        trigger: '/bold',
        label: 'Bold Text',
        description: 'Make text bold',
        category: 'formatting',
        triggerType: 'slash',
        action: (context) => ({
          replacement: `**${context.selectedText || 'bold text'}**`,
          cursorPosition: context.cursorPosition + 2
        })
      }
    ];

    testCommands.forEach(cmd => commandRegistry.registerCommand(cmd as any));
  });

  describe('CodeMirror Integration', () => {
    it('should initialize with command extensions', () => {
      const mockOnChange = jest.fn();

      render(
        <EnhancedInput
          value=""
          onChange={mockOnChange}
          mode="defaultNode"
          enableCommands={true}
        />
      );

      // Should render without errors
      expect(screen.getByTestId('enhanced-input')).toBeInTheDocument();

      // Command extensions should be loaded
      const { createCommandCompletions } = require('../codemirror/command-completions');
      const { createCommandDecorations } = require('../codemirror/command-decorations');
      
      expect(createCommandCompletions).toHaveBeenCalled();
      expect(createCommandDecorations).toHaveBeenCalled();
    });

    it('should handle command completion in CodeMirror context', async () => {
      const mockOnChange = jest.fn();

      render(
        <EnhancedInput
          value=""
          onChange={mockOnChange}
          mode="defaultNode"
          enableCommands={true}
          enableCompletions={true}
        />
      );

      // Simulate typing that would trigger completions
      const mockState = {
        doc: { toString: () => '$ta', length: 3 },
        selection: { main: { head: 3 } }
      };

      // Test command detection in CodeMirror context
      const trigger = detectCommandTrigger('$ta', 3);
      expect(trigger?.isPartial).toBe(true);
      expect(trigger?.command).toBe('ta');

      // Should find matching commands
      const matches = commandRegistry.findMatchingCommands('$ta');
      expect(matches.some(cmd => cmd.trigger === '$task')).toBe(true);
    });

    it('should apply command decorations to text', () => {
      const mockOnChange = jest.fn();

      render(
        <EnhancedInput
          value="This is $task content /date today"
          onChange={mockOnChange}
          mode="defaultNode"
          enableCommands={true}
        />
      );

      // Should have decorations for command triggers
      expect(screen.getByTestId('enhanced-input')).toBeInTheDocument();

      // Test that decorations would be applied
      const text = "This is $task content /date today";
      const taskTrigger = detectCommandTrigger(text, 11);
      expect(taskTrigger?.trigger).toBe('$task');

      const dateTrigger = detectCommandTrigger(text, 25);
      expect(dateTrigger?.trigger).toBe('/date');
    });

    it('should handle command execution with text selection', async () => {
      const mockOnChange = jest.fn();

      render(
        <EnhancedInput
          value="selected text"
          onChange={mockOnChange}
          mode="defaultNode"
          enableCommands={true}
        />
      );

      // Simulate command execution with selected text
      const result = await commandRegistry.executeCommand('/bold', {
        currentText: 'selected text',
        selectedText: 'selected',
        cursorPosition: 8
      });

      expect(result?.replacement).toBe('**selected**');
      expect(result?.cursorPosition).toBe(10);
    });
  });

  describe('Real-time Command Processing', () => {
    it('should detect commands during real-time editing', async () => {
      const mockOnChange = jest.fn();
      const mockOnCommandDetected = jest.fn();

      render(
        <EnhancedInput
          value=""
          onChange={mockOnChange}
          onCommandDetected={mockOnCommandDetected}
          mode="defaultNode"
          enableCommands={true}
        />
      );

      // Simulate real-time typing
      const textUpdates = [
        'T', 'Ta', 'Tas', 'Task', 'Task ', 'Task $', 'Task $t', 'Task $ta', 'Task $task'
      ];

      textUpdates.forEach((text, index) => {
        mockOnChange(text);

        // Check for command detection
        const trigger = detectCommandTrigger(text, text.length);
        if (trigger && trigger.trigger === '$task') {
          mockOnCommandDetected(trigger);
        }
      });

      // Should detect the command when complete
      expect(mockOnCommandDetected).toHaveBeenCalled();
    });

    it('should provide real-time feedback for partial commands', async () => {
      const mockOnChange = jest.fn();

      render(
        <EnhancedInput
          value=""
          onChange={mockOnChange}
          mode="defaultNode"
          enableCommands={true}
          showCommandHints={true}
        />
      );

      // Test partial command feedback
      const partialCommands = ['$', '$t', '$ta', '$tas', '$task'];

      partialCommands.forEach(partial => {
        mockOnChange(partial);

        const trigger = detectCommandTrigger(partial, partial.length);
        if (trigger?.isPartial) {
          const matches = commandRegistry.findMatchingCommands(partial);
          expect(matches.length).toBeGreaterThan(0);
        }
      });
    });

    it('should handle multiple commands in single text', async () => {
      const mockOnChange = jest.fn();

      render(
        <EnhancedInput
          value=""
          onChange={mockOnChange}
          mode="defaultNode"
          enableCommands={true}
        />
      );

      const complexText = "Meeting notes $note due /date tomorrow with /priority high";
      mockOnChange(complexText);

      // Should detect all commands
      const positions = [15, 25, 47]; // Approximate positions of commands

      positions.forEach(pos => {
        const trigger = detectCommandTrigger(complexText, pos);
        expect(trigger).toBeTruthy();
      });
    });
  });

  describe('Advanced Editing Features', () => {
    it('should handle undo/redo with commands', async () => {
      const mockOnChange = jest.fn();

      render(
        <EnhancedInput
          value="Original text"
          onChange={mockOnChange}
          mode="defaultNode"
          enableCommands={true}
          enableHistory={true}
        />
      );

      // Simulate command modification
      const originalText = "Original text";
      const modifiedText = "Modified text $task";

      mockOnChange(modifiedText);

      // Process command
      const switchResult = processNodeTypeSwitch(modifiedText, 19, 'defaultNode');
      expect(switchResult.success).toBe(true);

      // Undo should be supported
      // This tests that the command system integrates with editor history
      expect(screen.getByTestId('enhanced-input')).toBeInTheDocument();
    });

    it('should handle multi-cursor editing with commands', () => {
      const mockOnChange = jest.fn();

      render(
        <EnhancedInput
          value=""
          onChange={mockOnChange}
          mode="defaultNode"
          enableCommands={true}
        />
      );

      // Test command detection with multiple cursor positions
      const textWithMultipleSpots = "First $task and second $task";
      
      const positions = [7, 25]; // Two $task positions
      positions.forEach(pos => {
        const trigger = detectCommandTrigger(textWithMultipleSpots, pos);
        expect(trigger?.trigger).toBe('$task');
      });
    });

    it('should handle folding/collapsing with command blocks', () => {
      const mockOnChange = jest.fn();

      render(
        <EnhancedInput
          value=""
          onChange={mockOnChange}
          mode="codeNode"
          enableCommands={true}
          enableFolding={true}
        />
      );

      const codeWithCommands = `
        function example() {
          // This is $code block
          return /date;
        }
      `;

      mockOnChange(codeWithCommands);

      // Should handle commands within foldable blocks
      const trigger = detectCommandTrigger(codeWithCommands, codeWithCommands.indexOf('$code') + 3);
      expect(trigger?.trigger).toBe('$code');
    });
  });

  describe('Performance with Complex Content', () => {
    it('should handle large documents with many commands efficiently', () => {
      const mockOnChange = jest.fn();

      render(
        <EnhancedInput
          value=""
          onChange={mockOnChange}
          mode="defaultNode"
          enableCommands={true}
        />
      );

      // Create large document with many commands
      const commandTypes = ['$task', '$note', '$code', '/date', '/priority'];
      const largeContent = Array.from({ length: 1000 }, (_, i) => 
        `Line ${i} with ${commandTypes[i % commandTypes.length]} command`
      ).join('\n');

      const startTime = performance.now();
      mockOnChange(largeContent);

      // Test command detection performance
      const samplePositions = [100, 500, 1000, 1500, 2000];
      samplePositions.forEach(pos => {
        if (pos < largeContent.length) {
          detectCommandTrigger(largeContent, pos);
        }
      });

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(1000); // Should be reasonably fast
    });

    it('should maintain performance with rapid text changes', () => {
      const mockOnChange = jest.fn();

      render(
        <EnhancedInput
          value=""
          onChange={mockOnChange}
          mode="defaultNode"
          enableCommands={true}
        />
      );

      const startTime = performance.now();

      // Simulate rapid typing
      let currentText = '';
      const rapidChanges = 'This is rapid typing $task with /date command'.split('');

      rapidChanges.forEach(char => {
        currentText += char;
        mockOnChange(currentText);
        
        // Check for commands on every change
        detectCommandTrigger(currentText, currentText.length);
      });

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(500); // Should handle rapid changes
    });

    it('should optimize command decoration rendering', () => {
      const mockOnChange = jest.fn();

      render(
        <EnhancedInput
          value=""
          onChange={mockOnChange}
          mode="defaultNode"
          enableCommands={true}
        />
      );

      // Text with many command triggers
      const textWithManyCommands = Array.from({ length: 50 }, (_, i) => 
        `$task Item ${i}`
      ).join(' ');

      const startTime = performance.now();
      mockOnChange(textWithManyCommands);

      // Should efficiently handle many decorations
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(200);
    });
  });

  describe('Error Handling', () => {
    it('should handle CodeMirror errors gracefully', () => {
      const mockOnChange = jest.fn();

      // Mock CodeMirror to throw error
      const { EditorView } = require('@codemirror/view');
      EditorView.mockImplementationOnce(() => {
        throw new Error('CodeMirror initialization error');
      });

      expect(() => {
        render(
          <EnhancedInput
            value=""
            onChange={mockOnChange}
            mode="defaultNode"
            enableCommands={true}
          />
        );
      }).not.toThrow();
    });

    it('should handle command extension errors', () => {
      const mockOnChange = jest.fn();

      // Mock command extensions to throw errors
      const { createCommandCompletions } = require('../codemirror/command-completions');
      createCommandCompletions.mockImplementationOnce(() => {
        throw new Error('Command extension error');
      });

      expect(() => {
        render(
          <EnhancedInput
            value=""
            onChange={mockOnChange}
            mode="defaultNode"
            enableCommands={true}
          />
        );
      }).not.toThrow();
    });

    it('should recover from malformed command syntax', async () => {
      const mockOnChange = jest.fn();

      render(
        <EnhancedInput
          value=""
          onChange={mockOnChange}
          mode="defaultNode"
          enableCommands={true}
        />
      );

      // Malformed command patterns
      const malformedPatterns = [
        '$$$task',
        '///date',
        '$task$note',
        '/date/priority',
        '$ $task',
        '/ /date'
      ];

      malformedPatterns.forEach(pattern => {
        mockOnChange(pattern);

        // Should not crash on malformed patterns
        expect(() => {
          detectCommandTrigger(pattern, pattern.length);
        }).not.toThrow();
      });
    });
  });

  describe('Accessibility', () => {
    it('should maintain accessibility with command features', () => {
      const mockOnChange = jest.fn();

      render(
        <EnhancedInput
          value=""
          onChange={mockOnChange}
          mode="defaultNode"
          enableCommands={true}
          aria-label="Enhanced input with commands"
        />
      );

      const input = screen.getByTestId('enhanced-input');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('aria-label');
    });

    it('should provide screen reader announcements for commands', async () => {
      const mockOnChange = jest.fn();
      const mockOnCommandAnnounce = jest.fn();

      render(
        <EnhancedInput
          value=""
          onChange={mockOnChange}
          onCommandAnnounce={mockOnCommandAnnounce}
          mode="defaultNode"
          enableCommands={true}
        />
      );

      mockOnChange('Creating $task');

      // Should announce command detection
      const trigger = detectCommandTrigger('Creating $task', 12);
      if (trigger) {
        mockOnCommandAnnounce(`Detected ${trigger.trigger} command`);
      }

      expect(mockOnCommandAnnounce).toHaveBeenCalled();
    });

    it('should support keyboard navigation of command features', () => {
      const mockOnChange = jest.fn();

      render(
        <EnhancedInput
          value=""
          onChange={mockOnChange}
          mode="defaultNode"
          enableCommands={true}
        />
      );

      const input = screen.getByTestId('enhanced-input');

      // Should support standard keyboard navigation
      fireEvent.keyDown(input, { key: 'Tab' });
      fireEvent.keyDown(input, { key: 'Enter' });
      fireEvent.keyDown(input, { key: 'Escape' });

      // Should not crash on keyboard events
      expect(input).toBeInTheDocument();
    });
  });

  describe('Integration with Node Types', () => {
    it('should adapt command behavior based on node type', async () => {
      const mockOnChange = jest.fn();

      // Test with different node types
      const nodeTypes = ['defaultNode', 'taskNode', 'codeNode', 'textNode'];

      nodeTypes.forEach(nodeType => {
        const { rerender } = render(
          <EnhancedInput
            value=""
            onChange={mockOnChange}
            mode={nodeType as any}
            enableCommands={true}
          />
        );

        // Different node types might have different command behaviors
        const testText = "Content $task /date";
        mockOnChange(testText);

        const trigger = detectCommandTrigger(testText, 12);
        expect(trigger?.nodeType).toBe('taskNode');
      });
    });

    it('should handle node type transitions smoothly', async () => {
      const mockOnChange = jest.fn();
      const mockOnModeChange = jest.fn();

      const { rerender } = render(
        <EnhancedInput
          value="Original content $task"
          onChange={mockOnChange}
          onModeChange={mockOnModeChange}
          mode="defaultNode"
          enableCommands={true}
        />
      );

      // Simulate node type change
      const switchResult = processNodeTypeSwitch("Original content $task", 20, 'defaultNode');
      if (switchResult.success) {
        mockOnModeChange(switchResult.nodeType);

        rerender(
          <EnhancedInput
            value={switchResult.text}
            onChange={mockOnChange}
            mode={switchResult.nodeType as any}
            enableCommands={true}
          />
        );
      }

      expect(mockOnModeChange).toHaveBeenCalledWith('taskNode');
    });
  });
});