/**
 * Tests for Command Registry System
 */

import { CommandRegistry } from '../command-registry';
import type { Command, CommandContext } from '../types';
import { FileText } from 'lucide-react';

describe('CommandRegistry', () => {
  let registry: CommandRegistry;

  beforeEach(() => {
    // Get the singleton and clear it for clean tests
    registry = CommandRegistry.getInstance();
    registry.clearRegistry();
  });

  describe('Command Registration', () => {
    it('should register a command successfully', () => {
      const command: Command = {
        id: 'test-command',
        trigger: '/test',
        label: 'Test Command',
        description: 'A test command',
        icon: FileText,
        category: 'pattern',
        triggerType: 'slash',
        action: (context: CommandContext) => ({ replacement: 'test' })
      };

      const result = registry.registerCommand(command);
      expect(result).toBe(true);
      expect(registry.getCommand('test-command')).toEqual(command);
    });

    it('should not register command with duplicate ID without replace option', () => {
      const command: Command = {
        id: 'test-command',
        trigger: '/test',
        label: 'Test Command',
        description: 'A test command',
        icon: FileText,
        category: 'pattern',
        triggerType: 'slash',
        action: (context: CommandContext) => ({ replacement: 'test' })
      };

      registry.registerCommand(command);
      const result = registry.registerCommand(command);
      expect(result).toBe(false);
    });

    it('should replace command when replace option is true', () => {
      const originalCommand: Command = {
        id: 'test-command',
        trigger: '/test',
        label: 'Original Command',
        description: 'Original description',
        icon: FileText,
        category: 'pattern',
        triggerType: 'slash',
        action: (context: CommandContext) => ({ replacement: 'original' })
      };

      const newCommand: Command = {
        ...originalCommand,
        label: 'New Command',
        description: 'New description',
        action: (context: CommandContext) => ({ replacement: 'new' })
      };

      registry.registerCommand(originalCommand);
      const result = registry.registerCommand(newCommand, { replace: true });
      
      expect(result).toBe(true);
      const retrieved = registry.getCommand('test-command');
      expect(retrieved?.label).toBe('New Command');
      expect(retrieved?.description).toBe('New description');
    });

    it('should unregister a command successfully', () => {
      const command: Command = {
        id: 'test-command',
        trigger: '/test',
        label: 'Test Command',
        description: 'A test command',
        icon: FileText,
        category: 'pattern',
        triggerType: 'slash',
        action: (context: CommandContext) => ({ replacement: 'test' })
      };

      registry.registerCommand(command);
      expect(registry.getCommand('test-command')).toBeDefined();

      const result = registry.unregisterCommand('test-command');
      expect(result).toBe(true);
      expect(registry.getCommand('test-command')).toBeUndefined();
    });
  });

  describe('Command Search', () => {
    beforeEach(() => {
      // Register test commands with unique triggers to avoid conflicts
      const commands: Command[] = [
        {
          id: 'test-note-command',
          trigger: '$testnote',
          label: 'Test Note',
          description: 'Create a test note',
          icon: FileText,
          category: 'node-type',
          triggerType: 'node-type',
          action: () => ({ replacement: '' })
        },
        {
          id: 'test-task-command',
          trigger: '$testtask',
          label: 'Test Task',
          description: 'Create a test task list',
          icon: FileText,
          category: 'node-type',
          triggerType: 'node-type',
          keywords: ['todo', 'checklist'],
          action: () => ({ replacement: '' })
        },
        {
          id: 'test-date-command',
          trigger: '/testdate',
          label: 'Test Date',
          description: 'Insert test current date',
          icon: FileText,
          category: 'pattern',
          triggerType: 'slash',
          action: () => ({ replacement: '' })
        }
      ];

      commands.forEach(cmd => registry.registerCommand(cmd, { replace: true }));
    });

    it('should search commands by query', () => {
      const results = registry.searchCommands({ query: 'task' });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('test-task-command');
    });

    it('should search commands by keywords', () => {
      const results = registry.searchCommands({ query: 'todo' });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('test-task-command');
    });

    it('should filter commands by category', () => {
      const results = registry.searchCommands({ category: 'node-type' });
      expect(results).toHaveLength(2);
      expect(results.map(r => r.id)).toContain('test-note-command');
      expect(results.map(r => r.id)).toContain('test-task-command');
    });

    it('should filter commands by trigger type', () => {
      const results = registry.searchCommands({ triggerType: 'slash' });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('test-date-command');
    });

    it('should find matching commands by trigger pattern', () => {
      const results = registry.findMatchingCommands('$testnote something');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('test-note-command');
    });

    it('should find matching slash commands', () => {
      const results = registry.findMatchingCommands('/testdate');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('test-date-command');
    });
  });

  describe('Command Execution', () => {
    beforeEach(() => {
      const testCommand: Command = {
        id: 'test-action',
        trigger: '/test',
        label: 'Test Action',
        description: 'Test command execution',
        icon: FileText,
        category: 'pattern',
        triggerType: 'slash',
        action: (context: CommandContext) => ({
          replacement: `Processed: ${context.currentText}`,
          cursorPosition: context.currentText.length + 11
        })
      };

      registry.registerCommand(testCommand, { replace: true });
    });

    it('should execute command successfully', async () => {
      const context: CommandContext = {
        currentText: 'hello world',
        cursorPosition: 11
      };

      const result = await registry.executeCommand('test-action', context);
      expect(result).toBeDefined();
      expect(result?.replacement).toBe('Processed: hello world');
      expect(result?.cursorPosition).toBe(22);
    });

    it('should return null for non-existent command', async () => {
      const context: CommandContext = {
        currentText: 'hello world',
        cursorPosition: 11
      };

      const result = await registry.executeCommand('non-existent', context);
      expect(result).toBeNull();
    });

    it('should handle command execution errors gracefully', async () => {
      const errorCommand: Command = {
        id: 'error-command',
        trigger: '/error',
        label: 'Error Command',
        description: 'Command that throws error',
        icon: FileText,
        category: 'pattern',
        triggerType: 'slash',
        action: () => {
          throw new Error('Test error');
        }
      };

      registry.registerCommand(errorCommand, { replace: true });

      const context: CommandContext = {
        currentText: 'test',
        cursorPosition: 4
      };

      const result = await registry.executeCommand('error-command', context);
      expect(result).toBeDefined();
      expect(result?.message).toContain('Failed to execute command');
    });
  });

  describe('Registry Statistics', () => {
    it('should return correct statistics', () => {
      const commands: Command[] = [
        {
          id: 'stat-node1',
          trigger: '$statnote',
          label: 'Stat Note',
          description: 'Stat Note',
          icon: FileText,
          category: 'node-type',
          triggerType: 'node-type',
          action: () => ({})
        },
        {
          id: 'stat-node2',
          trigger: '$stattask',
          label: 'Stat Task',
          description: 'Stat Task',
          icon: FileText,
          category: 'node-type',
          triggerType: 'node-type',
          action: () => ({})
        },
        {
          id: 'stat-pattern1',
          trigger: '/statdate',
          label: 'Stat Date',
          description: 'Stat Date',
          icon: FileText,
          category: 'pattern',
          triggerType: 'slash',
          action: () => ({})
        }
      ];

      commands.forEach(cmd => registry.registerCommand(cmd));

      const stats = registry.getStats();
      expect(stats.totalCommands).toBe(3);
      expect(stats.commandsByCategory['node-type']).toBe(2);
      expect(stats.commandsByCategory['pattern']).toBe(1);
      expect(stats.commandsByTriggerType['node-type']).toBe(2);
      expect(stats.commandsByTriggerType['slash']).toBe(1);
    });
  });

  describe('Event System', () => {
    it('should emit events when commands are registered', (done) => {
      let eventReceived = false;
      
      registry.addEventListener('command-registered', (event) => {
        expect(event.type).toBe('command-registered');
        expect(event.commandId).toBe('test-event');
        expect(event.command).toBeDefined();
        eventReceived = true;
        done();
      });

      const command: Command = {
        id: 'test-event',
        trigger: '/test',
        label: 'Test Event',
        description: 'Test event emission',
        icon: FileText,
        category: 'pattern',
        triggerType: 'slash',
        action: () => ({})
      };

      registry.registerCommand(command);
      
      // Give event system time to process
      if (!eventReceived) {
        setTimeout(() => {
          if (!eventReceived) {
            done();
          }
        }, 100);
      }
    });
  });
});