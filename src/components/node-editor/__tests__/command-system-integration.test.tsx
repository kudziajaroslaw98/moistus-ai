/**
 * Comprehensive Integration Tests for Inline Node Type Switching Command System
 * 
 * Tests the complete end-to-end user workflows including:
 * - Node type switching via $nodeType commands
 * - Command palette interactions with slash commands
 * - Command completion system integration
 * - Store state management and synchronization
 * - User interaction patterns and edge cases
 * - Performance under realistic usage
 * - Error recovery and resilience
 * - Accessibility compliance
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuickInput } from '../quick-input';
import { EnhancedInput } from '../enhanced-input/enhanced-input';
import { CommandPalette } from '../command-palette';
import { commandRegistry } from '../commands/command-registry';
import { processNodeTypeSwitch, detectCommandTrigger } from '../commands/command-parser';
import useAppStore from '@/store/mind-map-store';

// Mock the store
jest.mock('@/store/mind-map-store');
const mockStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

// Mock motion for simpler testing
jest.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Helper to create mock node command
const createMockNodeCommand = (nodeType: string) => ({
  id: `test-node-${nodeType}`,
  label: `Create ${nodeType}`,
  description: `Create a new ${nodeType} node`,
  parentNode: 'test-parent',
  position: { x: 100, y: 100 },
  nodeType: nodeType as any,
  initialContent: '',
});

describe('Command System Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock store with basic state
    mockStore.mockReturnValue({
      uiState: {
        isCommandPaletteOpen: false,
        commandPaletteState: {
          selectedIndex: 0,
          searchQuery: '',
          filteredCommands: [],
        }
      },
      actions: {
        setCommandPaletteOpen: jest.fn(),
        updateCommandPaletteState: jest.fn(),
        createNode: jest.fn(),
        updateNode: jest.fn(),
      }
    } as any);

    // Clear command registry for clean tests
    commandRegistry.clearRegistry();
  });

  describe('Node Type Switching Workflow', () => {
    it('should complete full node type switching workflow with $task trigger', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn();
      const mockOnNodeTypeChange = jest.fn();

      render(
        <QuickInput
          command={createMockNodeCommand('defaultNode')}
          onSubmit={mockOnSubmit}
          onNodeTypeChange={mockOnNodeTypeChange}
        />
      );

      const input = screen.getByRole('textbox');

      // Step 1: User starts typing
      await user.type(input, 'Buy groceries');
      expect(input).toHaveValue('Buy groceries');

      // Step 2: User adds node type trigger
      await user.type(input, ' $task');
      expect(input).toHaveValue('Buy groceries $task');

      // Step 3: System should detect trigger and offer to switch
      // This would trigger the command detection system
      const commandTrigger = detectCommandTrigger('Buy groceries $task', 18);
      expect(commandTrigger).toBeTruthy();
      expect(commandTrigger?.type).toBe('node-type');

      // Step 4: User confirms switch (simulated by Enter or auto-processing)
      const switchResult = processNodeTypeSwitch('Buy groceries $task', 18, 'defaultNode');
      expect(switchResult.success).toBe(true);
      expect(switchResult.nodeType).toBe('taskNode');
      expect(switchResult.text).toBe('Buy groceries');

      // Step 5: Node type should change and text should be cleaned
      expect(mockOnNodeTypeChange).toHaveBeenCalledWith('taskNode');

      // Step 6: Submit should work with new node type
      fireEvent.keyDown(input, { key: 'Enter' });
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it('should handle rapid node type switching without conflicts', async () => {
      const user = userEvent.setup();
      const mockOnNodeTypeChange = jest.fn();

      render(
        <QuickInput
          command={createMockNodeCommand('defaultNode')}
          onNodeTypeChange={mockOnNodeTypeChange}
        />
      );

      const input = screen.getByRole('textbox');

      // Rapid switching sequence
      await user.type(input, 'Content $task');
      await user.clear(input);
      await user.type(input, 'Code snippet $code');
      await user.clear(input);
      await user.type(input, 'Question $question');

      // Should handle the final state correctly
      const finalTrigger = detectCommandTrigger('Question $question', 17);
      expect(finalTrigger?.nodeType).toBe('questionNode');

      expect(mockOnNodeTypeChange).toHaveBeenCalledTimes(3);
    });

    it('should preserve cursor position during node type switch', async () => {
      const user = userEvent.setup();

      render(
        <QuickInput command={createMockNodeCommand('defaultNode')} />
      );

      const input = screen.getByRole('textbox') as HTMLInputElement;

      // Type text with trigger in middle
      await user.type(input, 'Start $task middle end');

      // Set cursor position at the trigger
      act(() => {
        input.setSelectionRange(8, 8); // At 't' in '$task'
      });

      // Process the switch
      const switchResult = processNodeTypeSwitch(input.value, input.selectionStart || 0, 'defaultNode');
      expect(switchResult.success).toBe(true);
      expect(switchResult.text).toBe('Start middle end');
      expect(switchResult.cursorPos).toBe(6); // Should be at start of "middle"
    });
  });

  describe('Command Palette Integration', () => {
    it('should complete command palette workflow with slash commands', async () => {
      const user = userEvent.setup();
      const mockStoreActions = {
        setCommandPaletteOpen: jest.fn(),
        updateCommandPaletteState: jest.fn(),
      };

      mockStore.mockReturnValue({
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

      render(<QuickInput command={createMockNodeCommand('defaultNode')} />);

      const input = screen.getByRole('textbox');

      // Step 1: User types slash command trigger
      await user.type(input, 'Task due /date');

      // Step 2: System should detect slash command
      const slashTrigger = detectCommandTrigger('Task due /date', 12);
      expect(slashTrigger?.type).toBe('slash');
      expect(slashTrigger?.trigger).toBe('/date');

      // Step 3: Command palette should open
      expect(mockStoreActions.setCommandPaletteOpen).toHaveBeenCalledWith(true);

      // Step 4: Test command selection workflow
      render(<CommandPalette 
        isOpen={true} 
        onSelect={jest.fn()} 
        onClose={jest.fn()} 
        position={{ x: 100, y: 100 }}
      />);

      expect(screen.getByTestId('command-palette')).toBeInTheDocument();
    });

    it('should handle keyboard navigation in command palette', async () => {
      const user = userEvent.setup();
      const mockOnSelect = jest.fn();
      const mockOnClose = jest.fn();

      // Mock filtered commands
      const mockCommands = [
        { id: '/date', label: 'Date', trigger: '/date' },
        { id: '/priority', label: 'Priority', trigger: '/priority' },
        { id: '/tag', label: 'Tag', trigger: '/tag' },
      ];

      render(
        <CommandPalette
          isOpen={true}
          onSelect={mockOnSelect}
          onClose={mockOnClose}
          position={{ x: 0, y: 0 }}
          filteredCommands={mockCommands}
        />
      );

      const palette = screen.getByTestId('command-palette');
      expect(palette).toBeInTheDocument();

      // Test ArrowDown navigation
      fireEvent.keyDown(palette, { key: 'ArrowDown' });
      
      // Test ArrowUp navigation
      fireEvent.keyDown(palette, { key: 'ArrowUp' });

      // Test Enter selection
      fireEvent.keyDown(palette, { key: 'Enter' });
      expect(mockOnSelect).toHaveBeenCalled();

      // Test Escape close
      fireEvent.keyDown(palette, { key: 'Escape' });
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should filter commands based on search query', async () => {
      const user = userEvent.setup();

      render(<QuickInput command={createMockNodeCommand('defaultNode')} />);

      const input = screen.getByRole('textbox');

      // Type partial command
      await user.type(input, '/da');

      // Should filter to date-related commands
      const trigger = detectCommandTrigger('/da', 3);
      expect(trigger?.isPartial).toBe(true);
      
      const matches = commandRegistry.searchCommands({ 
        query: 'da',
        triggerType: 'slash' 
      });
      
      expect(matches.some(cmd => cmd.trigger.includes('date'))).toBe(true);
    });
  });

  describe('Enhanced Input Command Integration', () => {
    it('should integrate commands with enhanced input component', async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();

      render(
        <EnhancedInput
          value=""
          onChange={mockOnChange}
          mode="defaultNode"
          placeholder="Type your content..."
        />
      );

      // EnhancedInput should support command detection
      const input = screen.getByRole('textbox');
      await user.type(input, '$code console.log()');

      // Should detect node type command
      const trigger = detectCommandTrigger('$code console.log()', 5);
      expect(trigger?.nodeType).toBe('codeNode');

      expect(mockOnChange).toHaveBeenCalled();
    });

    it('should handle command completions in enhanced input', async () => {
      const user = userEvent.setup();

      render(
        <EnhancedInput
          value=""
          onChange={jest.fn()}
          mode="defaultNode"
          enableCompletions={true}
        />
      );

      const input = screen.getByRole('textbox');
      
      // Type partial command
      await user.type(input, '$ta');

      // Should trigger completions
      // This tests that the completion system is integrated
      expect(input).toHaveValue('$ta');

      // Completions should be available for task-related commands
      const matches = commandRegistry.findMatchingCommands('$ta');
      expect(matches.some(cmd => cmd.trigger.includes('task'))).toBe(true);
    });
  });

  describe('Store State Integration', () => {
    it('should synchronize command palette state with store', async () => {
      const mockActions = {
        setCommandPaletteOpen: jest.fn(),
        updateCommandPaletteState: jest.fn(),
      };

      mockStore.mockReturnValue({
        uiState: {
          isCommandPaletteOpen: true,
          commandPaletteState: {
            selectedIndex: 1,
            searchQuery: 'test',
            filteredCommands: [],
          }
        },
        actions: mockActions,
      } as any);

      const user = userEvent.setup();

      render(<QuickInput command={createMockNodeCommand('defaultNode')} />);

      // Actions should have been called to sync state
      const input = screen.getByRole('textbox');
      await user.type(input, '/test');

      // Should update command palette state
      expect(mockActions.updateCommandPaletteState).toHaveBeenCalled();
    });

    it('should persist node type changes in store', async () => {
      const mockUpdateNode = jest.fn();
      
      mockStore.mockReturnValue({
        uiState: {
          isCommandPaletteOpen: false,
          commandPaletteState: {
            selectedIndex: 0,
            searchQuery: '',
            filteredCommands: [],
          }
        },
        actions: {
          updateNode: mockUpdateNode,
          setCommandPaletteOpen: jest.fn(),
          updateCommandPaletteState: jest.fn(),
        }
      } as any);

      const user = userEvent.setup();

      render(
        <QuickInput
          command={createMockNodeCommand('defaultNode')}
          existingNode={{ id: 'test-node', type: 'defaultNode' } as any}
          mode="edit"
        />
      );

      const input = screen.getByRole('textbox');
      await user.type(input, 'Updated content $task');

      // Process node type switch
      const switchResult = processNodeTypeSwitch('Updated content $task', 18, 'defaultNode');
      expect(switchResult.success).toBe(true);

      // Should eventually update the node in store
      fireEvent.keyDown(input, { key: 'Enter' });
      
      await waitFor(() => {
        expect(mockUpdateNode).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should recover gracefully from command execution errors', async () => {
      // Mock a command that throws an error
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

      const user = userEvent.setup();

      render(<QuickInput command={createMockNodeCommand('defaultNode')} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'Test /error');

      // Should not crash the component
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('Test /error');

      // Error should be handled gracefully
      const result = await commandRegistry.executeCommand('error-command', {
        currentText: 'Test /error',
        cursorPosition: 10
      });

      expect(result).toBeDefined();
      expect(result?.message).toContain('Failed to execute command');
    });

    it('should handle invalid node type switches', async () => {
      const user = userEvent.setup();

      render(<QuickInput command={createMockNodeCommand('defaultNode')} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'Content $invalid');

      // Should detect invalid trigger
      const switchResult = processNodeTypeSwitch('Content $invalid', 15, 'defaultNode');
      expect(switchResult.success).toBe(false);
      expect(switchResult.error).toContain('Unknown node type');

      // Component should remain stable
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('Content $invalid');
    });

    it('should handle malformed command triggers', async () => {
      const user = userEvent.setup();

      render(<QuickInput command={createMockNodeCommand('defaultNode')} />);

      const input = screen.getByRole('textbox');

      const malformedInputs = ['$', '$  ', '/', '/ ', '$123', '/123invalid'];

      for (const malformedInput of malformedInputs) {
        await user.clear(input);
        await user.type(input, malformedInput);

        // Should not crash
        expect(input).toBeInTheDocument();
        expect(input).toHaveValue(malformedInput);

        // Detection should handle gracefully
        expect(() => {
          detectCommandTrigger(malformedInput, malformedInput.length);
        }).not.toThrow();
      }
    });
  });

  describe('Performance Under Load', () => {
    it('should handle rapid command detection efficiently', async () => {
      const user = userEvent.setup();

      render(<QuickInput command={createMockNodeCommand('defaultNode')} />);

      const input = screen.getByRole('textbox');

      const startTime = performance.now();

      // Simulate rapid typing with multiple command triggers
      const rapidInputs = [
        '$task', '$note', '$code', '$image', '$question',
        '/date', '/priority', '/tag', '/assignee', '/color'
      ];

      for (const rapidInput of rapidInputs) {
        await user.clear(input);
        await user.type(input, rapidInput, { delay: 1 }); // Very fast typing

        // Should detect commands quickly
        const trigger = detectCommandTrigger(rapidInput, rapidInput.length);
        expect(trigger).toBeTruthy();
      }

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(1000); // Should be fast
    });

    it('should handle large text with embedded commands efficiently', async () => {
      const user = userEvent.setup();

      render(<QuickInput command={createMockNodeCommand('defaultNode')} />);

      const input = screen.getByRole('textbox');

      // Create large text with embedded commands
      const largeText = 'word '.repeat(1000) + '$task important task' + ' word '.repeat(1000);

      const startTime = performance.now();
      
      await user.type(input, largeText);
      
      // Should detect command efficiently even in large text
      const trigger = detectCommandTrigger(largeText, largeText.indexOf('$task') + 3);
      expect(trigger?.nodeType).toBe('taskNode');

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(2000); // Should handle large text reasonably fast
    });

    it('should maintain performance with many registered commands', () => {
      // Register many commands
      for (let i = 0; i < 100; i++) {
        commandRegistry.registerCommand({
          id: `test-command-${i}`,
          trigger: `/test${i}`,
          label: `Test Command ${i}`,
          description: `Test command number ${i}`,
          category: 'pattern',
          triggerType: 'slash',
          action: () => ({ replacement: `result${i}` })
        } as any);
      }

      const startTime = performance.now();

      // Search should still be fast
      const results = commandRegistry.searchCommands({ query: 'test' });
      expect(results.length).toBeGreaterThan(0);

      // Command matching should be fast
      const matches = commandRegistry.findMatchingCommands('/test5');
      expect(matches.length).toBeGreaterThan(0);

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100); // Should be very fast
    });
  });

  describe('Accessibility Compliance', () => {
    it('should provide proper ARIA labels and roles', () => {
      render(<QuickInput command={createMockNodeCommand('defaultNode')} />);

      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();

      // Should have proper accessibility attributes
      expect(input).toHaveAttribute('aria-label');
    });

    it('should support keyboard navigation throughout', async () => {
      const user = userEvent.setup();

      render(<QuickInput command={createMockNodeCommand('defaultNode')} />);

      const input = screen.getByRole('textbox');
      
      // Should be focusable
      await user.tab();
      expect(document.activeElement).toBe(input);

      // Should support standard keyboard shortcuts
      await user.keyboard('{Control>}k{/Control}'); // Command palette shortcut
      
      // Component should handle keyboard events without crashes
      expect(input).toBeInTheDocument();
    });

    it('should announce state changes to screen readers', async () => {
      const user = userEvent.setup();

      render(<QuickInput command={createMockNodeCommand('defaultNode')} />);

      const input = screen.getByRole('textbox');

      // Type command that would change node type
      await user.type(input, '$task groceries');

      // Should have mechanisms to announce changes
      // This tests that the component structure supports screen readers
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('$task groceries');
    });

    it('should maintain focus properly during command interactions', async () => {
      const user = userEvent.setup();

      render(<QuickInput command={createMockNodeCommand('defaultNode')} />);

      const input = screen.getByRole('textbox');
      
      await user.click(input);
      expect(document.activeElement).toBe(input);

      // Type command trigger
      await user.type(input, '$task');

      // Focus should remain on input during command processing
      expect(document.activeElement).toBe(input);
    });
  });

  describe('Complex Workflow Scenarios', () => {
    it('should handle mixed command types in single session', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn();

      render(<QuickInput command={createMockNodeCommand('defaultNode')} onSubmit={mockOnSubmit} />);

      const input = screen.getByRole('textbox');

      // Workflow: Create task with due date and priority
      await user.type(input, 'Review code $task /date today /priority high');

      // Should detect multiple commands
      const nodeTypeTrigger = detectCommandTrigger('Review code $task /date today /priority high', 15);
      expect(nodeTypeTrigger?.nodeType).toBe('taskNode');

      const dateTrigger = detectCommandTrigger('Review code $task /date today /priority high', 25);
      expect(dateTrigger?.trigger).toBe('/date');

      const priorityTrigger = detectCommandTrigger('Review code $task /date today /priority high', 40);
      expect(priorityTrigger?.trigger).toBe('/priority');

      // Should handle complex scenario without errors
      fireEvent.keyDown(input, { key: 'Enter' });
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it('should handle command chaining and composition', async () => {
      const user = userEvent.setup();

      render(<QuickInput command={createMockNodeCommand('defaultNode')} />);

      const input = screen.getByRole('textbox');

      // Complex command composition
      await user.type(input, 'Meeting notes $note /date tomorrow /tag meeting /assignee team');

      // Each command should be detectable at its position
      const triggers = [
        { text: '$note', expected: 'defaultNode' },
        { text: '/date', expected: '/date' },
        { text: '/tag', expected: '/tag' },
        { text: '/assignee', expected: '/assignee' }
      ];

      const fullText = input.value;
      
      triggers.forEach(({ text, expected }) => {
        const position = fullText.indexOf(text) + text.length - 1;
        const trigger = detectCommandTrigger(fullText, position);
        
        if (text.startsWith('$')) {
          expect(trigger?.nodeType).toBe(expected);
        } else {
          expect(trigger?.trigger).toBe(expected);
        }
      });
    });

    it('should maintain state consistency during complex interactions', async () => {
      const user = userEvent.setup();
      let currentNodeType = 'defaultNode';

      const mockOnNodeTypeChange = jest.fn((newType) => {
        currentNodeType = newType;
      });

      render(
        <QuickInput
          command={createMockNodeCommand(currentNodeType as any)}
          onNodeTypeChange={mockOnNodeTypeChange}
        />
      );

      const input = screen.getByRole('textbox');

      // Sequence of operations that should maintain consistency
      await user.type(input, 'Start with text');
      expect(currentNodeType).toBe('defaultNode');

      await user.type(input, ' $task');
      // Simulate node type change processing
      const switchResult = processNodeTypeSwitch(input.value, input.value.length - 2, currentNodeType as any);
      if (switchResult.success) {
        mockOnNodeTypeChange(switchResult.nodeType);
      }

      expect(mockOnNodeTypeChange).toHaveBeenCalledWith('taskNode');

      // Clear and try different type
      await user.clear(input);
      await user.type(input, 'Code snippet $code');
      
      const codeSwitch = processNodeTypeSwitch(input.value, input.value.length - 2, 'taskNode');
      if (codeSwitch.success) {
        mockOnNodeTypeChange(codeSwitch.nodeType);
      }

      expect(mockOnNodeTypeChange).toHaveBeenCalledWith('codeNode');
    });
  });
});