/**
 * Component Tests for QuickInput Command Integration
 * 
 * Tests the QuickInput component's integration with the command system:
 * - Command detection and processing
 * - Node type switching functionality
 * - Command palette integration
 * - User interaction patterns
 * - State management and callbacks
 * - Error handling and edge cases
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuickInput } from '../quick-input';
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

// Mock the node creation utilities
jest.mock('../node-creator', () => ({
  createNodeFromQuickInput: jest.fn(() => Promise.resolve({ id: 'test-node' })),
}));

// Mock the parsers
jest.mock('../parsers', () => ({
  parseTextInput: jest.fn((text) => ({ content: text, metadata: {} })),
  parseTaskInput: jest.fn((text) => ({ 
    tasks: [{ text: text, isComplete: false }],
    dueDate: null,
    priority: null 
  })),
}));

const createMockCommand = (nodeType: string = 'defaultNode') => ({
  id: `test-command-${nodeType}`,
  label: `Create ${nodeType}`,
  description: `Create a new ${nodeType} node`,
  parentNode: 'test-parent',
  position: { x: 100, y: 100 },
  nodeType: nodeType as any,
  initialContent: '',
});

describe('QuickInput Command Integration', () => {
  let mockStoreActions: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockStoreActions = {
      setCommandPaletteOpen: jest.fn(),
      updateCommandPaletteState: jest.fn(),
      createNode: jest.fn(),
      updateNode: jest.fn(),
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

    // Clear and setup command registry
    commandRegistry.clearRegistry();
    
    // Register test commands
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
        id: '$note',
        trigger: '$note',
        label: 'Note',
        description: 'Create a note',
        category: 'node-type',
        triggerType: 'node-type',
        nodeType: 'defaultNode',
        action: () => ({ nodeType: 'defaultNode', replacement: '' })
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
        id: '/priority',
        trigger: '/priority',
        label: 'Priority',
        description: 'Set priority',
        category: 'pattern',
        triggerType: 'slash',
        action: (context) => ({ 
          replacement: context.args?.[0] || 'medium',
          cursorPosition: context.cursorPosition + 6 
        })
      }
    ];

    testCommands.forEach(cmd => commandRegistry.registerCommand(cmd as any));
  });

  describe('Command Detection Integration', () => {
    it('should detect node type commands during typing', async () => {
      const user = userEvent.setup();
      const mockOnNodeTypeChange = jest.fn();

      render(
        <QuickInput
          command={createMockCommand()}
          onNodeTypeChange={mockOnNodeTypeChange}
        />
      );

      const input = screen.getByRole('textbox');

      // Type content with node type trigger
      await user.type(input, 'Buy milk $task');

      // Should detect the command
      const trigger = detectCommandTrigger('Buy milk $task', 12);
      expect(trigger).toBeTruthy();
      expect(trigger?.type).toBe('node-type');
      expect(trigger?.nodeType).toBe('taskNode');

      // Component should integrate with command detection
      expect(input).toHaveValue('Buy milk $task');
    });

    it('should detect slash commands and integrate with command palette', async () => {
      const user = userEvent.setup();

      render(<QuickInput command={createMockCommand()} />);

      const input = screen.getByRole('textbox');

      // Type slash command
      await user.type(input, 'Task due /date');

      // Should detect slash command
      const trigger = detectCommandTrigger('Task due /date', 12);
      expect(trigger).toBeTruthy();
      expect(trigger?.type).toBe('slash');
      expect(trigger?.trigger).toBe('/date');

      // Should integrate with command palette
      expect(mockStoreActions.setCommandPaletteOpen).toHaveBeenCalledWith(true);
    });

    it('should handle partial command detection for autocompletion', async () => {
      const user = userEvent.setup();

      render(<QuickInput command={createMockCommand()} />);

      const input = screen.getByRole('textbox');

      // Type partial command
      await user.type(input, '$ta');

      // Should detect partial command
      const trigger = detectCommandTrigger('$ta', 3);
      expect(trigger).toBeTruthy();
      expect(trigger?.isPartial).toBe(true);

      // Should provide matches for completion
      const matches = commandRegistry.findMatchingCommands('$ta');
      expect(matches.some(cmd => cmd.trigger === '$task')).toBe(true);
    });

    it('should detect commands at various cursor positions', async () => {
      const user = userEvent.setup();

      render(<QuickInput command={createMockCommand()} />);

      const input = screen.getByRole('textbox') as HTMLInputElement;

      await user.type(input, 'Start $task middle $note end');

      // Test detection at different positions
      const testPositions = [
        { pos: 7, expectedTrigger: '$task', expectedType: 'taskNode' },
        { pos: 20, expectedTrigger: '$note', expectedType: 'defaultNode' },
        { pos: 0, expectedTrigger: null, expectedType: null },
        { pos: 30, expectedTrigger: null, expectedType: null },
      ];

      testPositions.forEach(({ pos, expectedTrigger, expectedType }) => {
        const trigger = detectCommandTrigger(input.value, pos);
        
        if (expectedTrigger) {
          expect(trigger?.trigger).toBe(expectedTrigger);
          expect(trigger?.nodeType).toBe(expectedType);
        } else {
          expect(trigger).toBeNull();
        }
      });
    });
  });

  describe('Node Type Switching Integration', () => {
    it('should process node type switches correctly', async () => {
      const user = userEvent.setup();
      const mockOnNodeTypeChange = jest.fn();

      render(
        <QuickInput
          command={createMockCommand()}
          onNodeTypeChange={mockOnNodeTypeChange}
        />
      );

      const input = screen.getByRole('textbox');
      await user.type(input, 'Shopping list $task');

      // Process the switch
      const switchResult = processNodeTypeSwitch('Shopping list $task', 18, 'defaultNode');
      expect(switchResult.success).toBe(true);
      expect(switchResult.nodeType).toBe('taskNode');
      expect(switchResult.text).toBe('Shopping list');

      // Should call the callback when processing occurs
      expect(mockOnNodeTypeChange).toHaveBeenCalledWith('taskNode');
    });

    it('should handle multiple node type switches', async () => {
      const user = userEvent.setup();
      const mockOnNodeTypeChange = jest.fn();

      render(
        <QuickInput
          command={createMockCommand()}
          onNodeTypeChange={mockOnNodeTypeChange}
        />
      );

      const input = screen.getByRole('textbox');

      // First switch
      await user.type(input, 'Content $task');
      let switchResult = processNodeTypeSwitch('Content $task', 12, 'defaultNode');
      expect(switchResult.success).toBe(true);

      // Clear and second switch
      await user.clear(input);
      await user.type(input, 'Code $code');
      
      // Mock $code command
      commandRegistry.registerCommand({
        id: '$code',
        trigger: '$code',
        label: 'Code',
        nodeType: 'codeNode',
        category: 'node-type',
        triggerType: 'node-type',
        action: () => ({ nodeType: 'codeNode', replacement: '' })
      } as any);

      switchResult = processNodeTypeSwitch('Code $code', 10, 'taskNode');
      expect(switchResult.success).toBe(true);
      expect(switchResult.nodeType).toBe('codeNode');

      expect(mockOnNodeTypeChange).toHaveBeenCalledTimes(2);
    });

    it('should handle invalid node type switches gracefully', async () => {
      const user = userEvent.setup();
      const mockOnNodeTypeChange = jest.fn();

      render(
        <QuickInput
          command={createMockCommand()}
          onNodeTypeChange={mockOnNodeTypeChange}
        />
      );

      const input = screen.getByRole('textbox');
      await user.type(input, 'Content $invalid');

      // Should handle invalid switch
      const switchResult = processNodeTypeSwitch('Content $invalid', 15, 'defaultNode');
      expect(switchResult.success).toBe(false);
      expect(switchResult.error).toBeDefined();

      // Should not call callback for invalid switch
      expect(mockOnNodeTypeChange).not.toHaveBeenCalled();
    });

    it('should preserve cursor position during switches', async () => {
      const user = userEvent.setup();

      render(<QuickInput command={createMockCommand()} />);

      const input = screen.getByRole('textbox') as HTMLInputElement;
      await user.type(input, 'Start $task middle end');

      // Set cursor at the trigger
      act(() => {
        input.setSelectionRange(8, 8);
      });

      const switchResult = processNodeTypeSwitch(
        input.value, 
        input.selectionStart || 0, 
        'defaultNode'
      );

      expect(switchResult.success).toBe(true);
      expect(switchResult.cursorPos).toBe(6); // Should position at start of "middle"
    });
  });

  describe('Command Palette Integration', () => {
    it('should open command palette for slash commands', async () => {
      const user = userEvent.setup();

      render(<QuickInput command={createMockCommand()} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'Content /');

      // Should detect slash command and open palette
      const trigger = detectCommandTrigger('Content /', 9);
      expect(trigger?.type).toBe('slash');
      expect(mockStoreActions.setCommandPaletteOpen).toHaveBeenCalledWith(true);
    });

    it('should update command palette state based on input', async () => {
      const user = userEvent.setup();

      render(<QuickInput command={createMockCommand()} />);

      const input = screen.getByRole('textbox');
      await user.type(input, '/da');

      // Should update palette with filtered commands
      expect(mockStoreActions.updateCommandPaletteState).toHaveBeenCalled();

      const trigger = detectCommandTrigger('/da', 3);
      expect(trigger?.isPartial).toBe(true);
      expect(trigger?.command).toBe('da');
    });

    it('should handle command selection from palette', async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();

      render(
        <QuickInput
          command={createMockCommand()}
          onChange={mockOnChange}
        />
      );

      const input = screen.getByRole('textbox');
      await user.type(input, 'Task /date');

      // Simulate command selection
      const dateCommand = commandRegistry.getCommand('/date');
      expect(dateCommand).toBeDefined();

      // Execute the command
      const result = await commandRegistry.executeCommand('/date', {
        currentText: 'Task /date',
        cursorPosition: 9
      });

      expect(result).toBeDefined();
      expect(result?.replacement).toBeDefined();
    });

    it('should close command palette appropriately', async () => {
      const user = userEvent.setup();

      // Set palette as open initially
      mockStore.mockReturnValue({
        uiState: {
          isCommandPaletteOpen: true,
          commandPaletteState: {
            selectedIndex: 0,
            searchQuery: 'date',
            filteredCommands: [],
          }
        },
        actions: mockStoreActions,
      } as any);

      render(<QuickInput command={createMockCommand()} />);

      const input = screen.getByRole('textbox');

      // Press Escape to close
      fireEvent.keyDown(input, { key: 'Escape' });
      expect(mockStoreActions.setCommandPaletteOpen).toHaveBeenCalledWith(false);
    });
  });

  describe('User Interaction Patterns', () => {
    it('should handle Enter key for submission', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn();

      render(
        <QuickInput
          command={createMockCommand()}
          onSubmit={mockOnSubmit}
        />
      );

      const input = screen.getByRole('textbox');
      await user.type(input, 'Test content');
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it('should handle Tab key for completion', async () => {
      const user = userEvent.setup();

      render(<QuickInput command={createMockCommand()} />);

      const input = screen.getByRole('textbox');
      await user.type(input, '$ta');
      
      // Tab should trigger completion
      fireEvent.keyDown(input, { key: 'Tab' });

      // Should complete to full command
      const matches = commandRegistry.findMatchingCommands('$ta');
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should handle Ctrl+K for command palette', async () => {
      const user = userEvent.setup();

      render(<QuickInput command={createMockCommand()} />);

      const input = screen.getByRole('textbox');
      await user.click(input);

      // Ctrl+K should open command palette
      fireEvent.keyDown(input, { key: 'k', ctrlKey: true });
      expect(mockStoreActions.setCommandPaletteOpen).toHaveBeenCalledWith(true);
    });

    it('should handle backspace to remove command triggers', async () => {
      const user = userEvent.setup();

      render(<QuickInput command={createMockCommand()} />);

      const input = screen.getByRole('textbox');
      await user.type(input, '$task');

      // Backspace should remove characters
      await user.keyboard('{Backspace}');
      expect(input).toHaveValue('$tas');

      // Should still detect partial command
      const trigger = detectCommandTrigger('$tas', 4);
      expect(trigger?.isPartial).toBe(true);
    });

    it('should handle mouse clicks for cursor positioning', async () => {
      const user = userEvent.setup();

      render(<QuickInput command={createMockCommand()} />);

      const input = screen.getByRole('textbox') as HTMLInputElement;
      await user.type(input, 'Start $task middle end');

      // Simulate click at position
      act(() => {
        input.setSelectionRange(8, 8); // At the trigger
      });

      // Should detect command at clicked position
      const trigger = detectCommandTrigger(input.value, 8);
      expect(trigger?.trigger).toBe('$task');
    });
  });

  describe('State Management Integration', () => {
    it('should sync with store state changes', async () => {
      const user = userEvent.setup();

      // Start with closed palette
      let paletteOpen = false;
      mockStore.mockImplementation(() => ({
        uiState: {
          isCommandPaletteOpen: paletteOpen,
          commandPaletteState: {
            selectedIndex: 0,
            searchQuery: '',
            filteredCommands: [],
          }
        },
        actions: {
          ...mockStoreActions,
          setCommandPaletteOpen: jest.fn((open) => { paletteOpen = open; }),
        },
      }));

      const { rerender } = render(<QuickInput command={createMockCommand()} />);

      const input = screen.getByRole('textbox');
      await user.type(input, '/date');

      // Should open palette
      expect(paletteOpen).toBe(true);

      // Re-render with updated state
      rerender(<QuickInput command={createMockCommand()} />);
    });

    it('should handle concurrent state updates', async () => {
      const user = userEvent.setup();

      render(<QuickInput command={createMockCommand()} />);

      const input = screen.getByRole('textbox');

      // Rapid state changes
      await user.type(input, '/');
      await user.type(input, 'date');
      await user.keyboard('{Backspace}{Backspace}{Backspace}{Backspace}');
      await user.type(input, 'priority');

      // Should handle rapid changes without errors
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('priority');
    });

    it('should persist changes correctly', async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();

      render(
        <QuickInput
          command={createMockCommand()}
          onChange={mockOnChange}
        />
      );

      const input = screen.getByRole('textbox');
      await user.type(input, 'Test input $task');

      // Should call onChange for each character
      expect(mockOnChange).toHaveBeenCalledTimes('Test input $task'.length);

      // Should persist the final value
      expect(input).toHaveValue('Test input $task');
    });
  });

  describe('Error Handling', () => {
    it('should handle command execution errors gracefully', async () => {
      const user = userEvent.setup();

      // Register error-throwing command
      commandRegistry.registerCommand({
        id: '/error',
        trigger: '/error',
        label: 'Error Command',
        category: 'pattern',
        triggerType: 'slash',
        action: () => {
          throw new Error('Test error');
        }
      } as any);

      render(<QuickInput command={createMockCommand()} />);

      const input = screen.getByRole('textbox');
      await user.type(input, '/error');

      // Should not crash the component
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('/error');
    });

    it('should handle invalid input gracefully', async () => {
      const user = userEvent.setup();

      render(<QuickInput command={createMockCommand()} />);

      const input = screen.getByRole('textbox');

      // Type various invalid patterns
      const invalidInputs = ['$', '/', '$unknown', '/invalid', '$$task', '//date'];

      for (const invalidInput of invalidInputs) {
        await user.clear(input);
        await user.type(input, invalidInput);

        // Should not crash
        expect(input).toBeInTheDocument();
        expect(input).toHaveValue(invalidInput);
      }
    });

    it('should recover from state corruption', async () => {
      const user = userEvent.setup();

      // Mock corrupted store state
      mockStore.mockReturnValue({
        uiState: {
          isCommandPaletteOpen: undefined,
          commandPaletteState: null,
        },
        actions: mockStoreActions,
      } as any);

      render(<QuickInput command={createMockCommand()} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'Test');

      // Should handle corrupted state gracefully
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('Test');
    });
  });

  describe('Performance', () => {
    it('should handle rapid typing efficiently', async () => {
      const user = userEvent.setup();

      render(<QuickInput command={createMockCommand()} />);

      const input = screen.getByRole('textbox');

      const startTime = performance.now();

      // Rapid typing simulation
      const rapidText = 'Rapid typing with $task and /date commands';
      for (const char of rapidText) {
        fireEvent.change(input, { target: { value: input.value + char } });
      }

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(500); // Should be fast

      expect(input).toHaveValue(rapidText);
    });

    it('should handle large content efficiently', async () => {
      const user = userEvent.setup();

      render(<QuickInput command={createMockCommand()} />);

      const input = screen.getByRole('textbox');

      const largeContent = 'word '.repeat(1000) + '$task' + ' word '.repeat(1000);

      const startTime = performance.now();
      fireEvent.change(input, { target: { value: largeContent } });
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should handle large content
      expect(input).toHaveValue(largeContent);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty input', async () => {
      const user = userEvent.setup();

      render(<QuickInput command={createMockCommand()} />);

      const input = screen.getByRole('textbox');

      // Should handle empty input without errors
      expect(input).toHaveValue('');

      const trigger = detectCommandTrigger('', 0);
      expect(trigger).toBeNull();
    });

    it('should handle cursor at text boundaries', async () => {
      const user = userEvent.setup();

      render(<QuickInput command={createMockCommand()} />);

      const input = screen.getByRole('textbox') as HTMLInputElement;
      await user.type(input, '$task content');

      // Test cursor at start
      act(() => { input.setSelectionRange(0, 0); });
      let trigger = detectCommandTrigger(input.value, 0);
      expect(trigger?.trigger).toBe('$task');

      // Test cursor at end
      act(() => { input.setSelectionRange(input.value.length, input.value.length); });
      trigger = detectCommandTrigger(input.value, input.value.length);
      expect(trigger).toBeNull();
    });

    it('should handle special characters in content', async () => {
      const user = userEvent.setup();

      render(<QuickInput command={createMockCommand()} />);

      const input = screen.getByRole('textbox');

      const specialContent = 'Content with émojis 🎉 and symbols @#$%^&*()';
      await user.type(input, specialContent);

      expect(input).toHaveValue(specialContent);

      // Should not detect false positives
      const trigger = detectCommandTrigger(specialContent, 20);
      expect(trigger).toBeNull();
    });
  });
});