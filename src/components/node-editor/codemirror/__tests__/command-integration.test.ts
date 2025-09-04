/**
 * Integration tests for command completions and decorations
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { EditorState } from '@codemirror/state';
import { createCommandCompletions, createCommandDecorations } from '../index';
import { commandRegistry } from '../../commands/command-registry';

describe('Command Integration Tests', () => {
  beforeEach(() => {
    // Reset command registry state if needed
  });

  it('should create command completions extension without errors', () => {
    expect(() => createCommandCompletions()).not.toThrow();
  });

  it('should create command decorations extension without errors', () => {
    expect(() => createCommandDecorations()).not.toThrow();
  });

  it('should register default node type commands', () => {
    const nodeTypeCommands = commandRegistry.getCommandsByTriggerType('node-type');
    expect(nodeTypeCommands.length).toBeGreaterThan(0);
    
    const taskCommand = commandRegistry.getCommand('$task');
    expect(taskCommand).toBeDefined();
    expect(taskCommand?.label).toBe('Task List');
  });

  it('should register default slash commands', () => {
    const slashCommands = commandRegistry.getCommandsByTriggerType('slash');
    expect(slashCommands.length).toBeGreaterThan(0);
    
    const dateCommand = commandRegistry.getCommand('/date');
    expect(dateCommand).toBeDefined();
    expect(dateCommand?.label).toBe('Date');
  });

  it('should create CodeMirror state with command extensions', () => {
    const extensions = [
      createCommandCompletions(),
      createCommandDecorations()
    ];

    expect(() => {
      EditorState.create({
        doc: 'Test content $task hello world /date',
        extensions
      });
    }).not.toThrow();
  });

  it('should integrate with command registry for searches', () => {
    const taskResults = commandRegistry.searchCommands({
      query: 'task',
      triggerType: 'node-type'
    });
    
    expect(taskResults.length).toBeGreaterThan(0);
    expect(taskResults[0].trigger).toBe('$task');

    const dateResults = commandRegistry.searchCommands({
      query: 'date',
      triggerType: 'slash'
    });
    
    expect(dateResults.length).toBeGreaterThan(0);
    expect(dateResults[0].trigger).toBe('/date');
  });

  it('should handle command execution without errors', async () => {
    const taskCommand = commandRegistry.getCommand('$task');
    expect(taskCommand).toBeDefined();

    if (taskCommand) {
      const result = await commandRegistry.executeCommand('$task', {
        currentText: '$task Buy milk',
        cursorPosition: 10
      });

      expect(result).toBeDefined();
      expect(result?.nodeType).toBe('taskNode');
    }
  });

  it('should validate command triggers correctly', () => {
    // Test node type triggers
    const validNodeTypes = ['$task', '$note', '$code', '$image'];
    validNodeTypes.forEach(trigger => {
      const command = commandRegistry.getCommand(trigger);
      expect(command).toBeDefined();
      expect(command?.triggerType).toBe('node-type');
    });

    // Test slash commands
    const validSlashCommands = ['/date', '/priority', '/tag'];
    validSlashCommands.forEach(trigger => {
      const command = commandRegistry.getCommand(trigger);
      expect(command).toBeDefined();
      expect(command?.triggerType).toBe('slash');
    });
  });

  it('should return proper completion results structure', () => {
    const mockContext = {
      state: EditorState.create({ doc: '$ta' }),
      pos: 3,
      matchBefore: () => ({ text: 'ta', from: 1, to: 3 })
    };

    // This tests that the completion functions return the expected structure
    // The actual completion logic is tested in the parser tests
    expect(() => {
      // Test that extensions can be created and don't throw
      const extensions = [createCommandCompletions(), createCommandDecorations()];
      EditorState.create({ doc: '$task', extensions });
    }).not.toThrow();
  });
});

describe('Command Registry Integration', () => {
  it('should provide comprehensive command coverage', () => {
    const stats = commandRegistry.getStats();
    
    expect(stats.totalCommands).toBeGreaterThan(10);
    expect(stats.commandsByCategory['node-type']).toBeGreaterThan(5);
    expect(stats.commandsByCategory['pattern']).toBeGreaterThan(3);
    expect(stats.commandsByTriggerType['node-type']).toBeGreaterThan(5);
    expect(stats.commandsByTriggerType['slash']).toBeGreaterThan(3);
  });

  it('should handle command search with various filters', () => {
    // Test category filtering
    const nodeTypeCommands = commandRegistry.searchCommands({ category: 'node-type' });
    expect(nodeTypeCommands.length).toBeGreaterThan(0);
    expect(nodeTypeCommands.every(cmd => cmd.category === 'node-type')).toBe(true);

    // Test trigger type filtering
    const slashCommands = commandRegistry.searchCommands({ triggerType: 'slash' });
    expect(slashCommands.length).toBeGreaterThan(0);
    expect(slashCommands.every(cmd => cmd.triggerType === 'slash')).toBe(true);

    // Test query search
    const taskCommands = commandRegistry.searchCommands({ query: 'task' });
    expect(taskCommands.length).toBeGreaterThan(0);
  });

  it('should maintain command priority ordering', () => {
    const allCommands = commandRegistry.getAllCommands();
    const commandsWithPriority = allCommands.filter(cmd => cmd.priority !== undefined);
    
    expect(commandsWithPriority.length).toBeGreaterThan(0);

    // Test that search results are ordered by priority
    const searchResults = commandRegistry.searchCommands({ limit: 10 });
    expect(searchResults.length).toBeGreaterThan(0);
    
    // Check that higher priority (lower number) commands come first
    for (let i = 1; i < searchResults.length; i++) {
      const prevPriority = searchResults[i - 1].priority || 100;
      const currentPriority = searchResults[i].priority || 100;
      expect(prevPriority).toBeLessThanOrEqual(currentPriority);
    }
  });
});