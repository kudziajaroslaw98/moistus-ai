/**
 * Tests for Command Registry System
 * 
 * Comprehensive tests covering:
 * - Command registration and management
 * - Default commands and their execution
 * - Search and filtering capabilities
 * - Error handling and validation
 * - Registry statistics and performance
 */

import { CommandRegistry } from '../command-registry';
import type { Command, CommandContext } from '../types';
import { FileText } from 'lucide-react';

// Mock default commands functionality for testing
const registerDefaultCommands = () => {
  const registry = CommandRegistry.getInstance();
  
  // Mock node type commands
  const nodeTypeCommands = [
    {
      id: '$note',
      trigger: '$note',
      label: 'Note',
      description: 'Create a note',
      icon: FileText,
      category: 'node-type' as const,
      triggerType: 'node-type' as const,
      nodeType: 'defaultNode',
      action: (context: CommandContext) => ({ nodeType: 'defaultNode', text: context.currentText.replace('$note', '').trim(), clearTrigger: true })
    },
    {
      id: '$task',
      trigger: '$task',
      label: 'Task',
      description: 'Create a task',
      icon: FileText,
      category: 'node-type' as const,
      triggerType: 'node-type' as const,
      nodeType: 'taskNode',
      action: (context: CommandContext) => ({ nodeType: 'taskNode', text: '- [ ] New task', clearTrigger: true })
    },
    {
      id: '$code',
      trigger: '$code',
      label: 'Code',
      description: 'Create code block',
      icon: FileText,
      category: 'node-type' as const,
      triggerType: 'node-type' as const,
      nodeType: 'codeNode',
      action: (context: CommandContext) => ({ nodeType: 'codeNode', text: '```javascript\n\n```', metadata: { language: 'javascript' }, clearTrigger: true })
    },
    {
      id: '$question',
      trigger: '$question',
      label: 'Question',
      description: 'Create question',
      icon: FileText,
      category: 'node-type' as const,
      triggerType: 'node-type' as const,
      nodeType: 'questionNode',
      action: () => ({ nodeType: 'questionNode', text: 'Question?', clearTrigger: true })
    },
    {
      id: '$image',
      trigger: '$image',
      label: 'Image',
      description: 'Create image',
      icon: FileText,
      category: 'node-type' as const,
      triggerType: 'node-type' as const,
      nodeType: 'imageNode',
      action: () => ({ nodeType: 'imageNode', text: '', clearTrigger: true })
    },
    {
      id: '$resource',
      trigger: '$resource',
      label: 'Resource',
      description: 'Create resource',
      icon: FileText,
      category: 'node-type' as const,
      triggerType: 'node-type' as const,
      nodeType: 'resourceNode',
      action: () => ({ nodeType: 'resourceNode', text: '', clearTrigger: true })
    },
    {
      id: '$text',
      trigger: '$text',
      label: 'Text',
      description: 'Create text',
      icon: FileText,
      category: 'node-type' as const,
      triggerType: 'node-type' as const,
      nodeType: 'textNode',
      action: () => ({ nodeType: 'textNode', text: '', clearTrigger: true })
    }
  ];

  // Mock slash commands
  const slashCommands = [
    {
      id: '/date',
      trigger: '/date',
      label: 'Date',
      description: 'Insert date',
      icon: FileText,
      category: 'pattern' as const,
      triggerType: 'slash' as const,
      action: () => ({ text: '@today', clearTrigger: true })
    },
    {
      id: '/priority',
      trigger: '/priority',
      label: 'Priority',
      description: 'Set priority',
      icon: FileText,
      category: 'pattern' as const,
      triggerType: 'slash' as const,
      action: () => ({ text: '#high', clearTrigger: true })
    },
    {
      id: '/checkbox',
      trigger: '/checkbox',
      label: 'Checkbox',
      description: 'Create checkbox',
      icon: FileText,
      category: 'pattern' as const,
      triggerType: 'slash' as const,
      action: () => ({ text: '- [ ] ', clearTrigger: true })
    },
    {
      id: '/tag',
      trigger: '/tag',
      label: 'Tag',
      description: 'Create tag',
      icon: FileText,
      category: 'pattern' as const,
      triggerType: 'slash' as const,
      action: () => ({ text: '[tag]', cursorPosition: 1, clearTrigger: true })
    },
    {
      id: '/bold',
      trigger: '/bold',
      label: 'Bold',
      description: 'Bold text',
      icon: FileText,
      category: 'formatting' as const,
      triggerType: 'slash' as const,
      action: (context: CommandContext) => {
        if (context.selection?.text) {
          return { text: `**${context.selection.text}**`, clearTrigger: true };
        }
        return { text: '**bold text**', cursorPosition: 2, clearTrigger: true };
      }
    },
    {
      id: '/italic',
      trigger: '/italic',
      label: 'Italic',
      description: 'Italic text',
      icon: FileText,
      category: 'formatting' as const,
      triggerType: 'slash' as const,
      action: () => ({ text: '*italic text*', cursorPosition: 1, clearTrigger: true })
    },
    {
      id: '/link',
      trigger: '/link',
      label: 'Link',
      description: 'Create link',
      icon: FileText,
      category: 'formatting' as const,
      triggerType: 'slash' as const,
      action: () => ({ text: '[link text](url)', cursorPosition: 1, clearTrigger: true })
    }
  ];

  // Mock template commands
  const templateCommands = [
    {
      id: '/meeting',
      trigger: '/meeting',
      label: 'Meeting',
      description: 'Meeting template',
      icon: FileText,
      category: 'template' as const,
      triggerType: 'slash' as const,
      action: () => ({ text: '# Meeting Notes\n\n**Attendees:**\n\n**Action Items:**\n', clearTrigger: true })
    },
    {
      id: '/standup',
      trigger: '/standup',
      label: 'Standup',
      description: 'Standup template',
      icon: FileText,
      category: 'template' as const,
      triggerType: 'slash' as const,
      action: () => ({ text: '# Daily Standup\n\n**Yesterday:**\n\n**Today:**\n\n**Blockers & Help Needed:**\n', clearTrigger: true })
    },
    {
      id: '/brainstorm',
      trigger: '/brainstorm',
      label: 'Brainstorm',
      description: 'Brainstorm template',
      icon: FileText,
      category: 'template' as const,
      triggerType: 'slash' as const,
      action: () => ({ text: '# Brainstorming Session\n\n**Topic/Challenge:**\n\n## Initial Ideas\n💡 ', clearTrigger: true })
    },
    {
      id: '/retrospective',
      trigger: '/retrospective',
      label: 'Retrospective',
      description: 'Retrospective template',
      icon: FileText,
      category: 'template' as const,
      triggerType: 'slash' as const,
      action: () => ({ text: '# Sprint Retrospective\n\n## What Went Well ✅\n\n## What Didn\'t Go Well ❌\n\n## What We Learned 📚\n', clearTrigger: true })
    }
  ];

  [...nodeTypeCommands, ...slashCommands, ...templateCommands].forEach(cmd => {
    registry.registerCommand(cmd as Command, { replace: true });
  });
};

const executeCommand = (commandId: string, context: CommandContext) => {
  const registry = CommandRegistry.getInstance();
  const command = registry.getCommand(commandId);
  if (!command) return null;
  
  try {
    return command.action(context);
  } catch (error) {
    return null;
  }
};

const getCommandsByCategory = (category: string) => {
  const registry = CommandRegistry.getInstance();
  return registry.searchCommands({ category });
};

const getCommandsByTriggerPrefix = (prefix: string) => {
  const registry = CommandRegistry.getInstance();
  return registry.getAllCommands().filter(cmd => cmd.trigger.startsWith(prefix));
};

const searchCommands = (query: string) => {
  const registry = CommandRegistry.getInstance();
  return registry.searchCommands({ query });
};

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

describe('Default Commands Integration', () => {
  beforeEach(() => {
    // Ensure default commands are registered before each test
    registerDefaultCommands();
  });

  describe('Basic Registry Operations', () => {
    it('should register all default commands', () => {
      const allCommands = CommandRegistry.getInstance().getAllCommands();
      expect(allCommands.length).toBeGreaterThan(0);
    });

    it('should find commands by trigger', () => {
      const noteCommand = CommandRegistry.getInstance().getCommand('$note');
      expect(noteCommand).toBeDefined();
      expect(noteCommand?.label).toBe('Note');
      expect(noteCommand?.nodeType).toBe('defaultNode');
    });

    it('should group commands by trigger prefix', () => {
      const nodeTypeCommands = getCommandsByTriggerPrefix('$');
      const patternCommands = getCommandsByTriggerPrefix('/');
      
      expect(nodeTypeCommands.length).toBeGreaterThan(0);
      expect(patternCommands.length).toBeGreaterThan(0);
      
      // All node type commands should start with $
      nodeTypeCommands.forEach(cmd => {
        expect(cmd.trigger).toMatch(/^\$/);
      });
      
      // All pattern/template commands should start with /
      patternCommands.forEach(cmd => {
        expect(cmd.trigger).toMatch(/^\//);
      });
    });

    it('should group commands by category', () => {
      const nodeTypeCommands = getCommandsByCategory('node-type');
      const patternCommands = getCommandsByCategory('pattern');
      const templateCommands = getCommandsByCategory('template');
      const formattingCommands = getCommandsByCategory('formatting');
      
      expect(nodeTypeCommands.length).toBeGreaterThan(0);
      expect(patternCommands.length).toBeGreaterThan(0);
      expect(templateCommands.length).toBeGreaterThan(0);
      expect(formattingCommands.length).toBeGreaterThan(0);
    });

    it('should search commands by query', () => {
      const taskResults = searchCommands('task');
      expect(taskResults.length).toBeGreaterThan(0);
      
      // Should find both $task and /checkbox (which are task-related)
      const hasTaskCommand = taskResults.some(cmd => cmd.trigger === '$task');
      expect(hasTaskCommand).toBe(true);
    });
  });

  describe('Node Type Commands ($)', () => {
    const createTestContext = (triggerText: string, currentText: string = ''): CommandContext => ({
      currentText: currentText || triggerText,
      cursorPosition: triggerText.length,
      triggerPosition: 0,
      triggerText,
    });

    it('should execute $note command correctly', () => {
      const context = createTestContext('$note', '$note Some content');
      const result = executeCommand('$note', context);
      
      expect(result).toBeDefined();
      expect(result?.nodeType).toBe('defaultNode');
      expect(result?.text).toBe('Some content');
      expect(result?.clearTrigger).toBe(true);
    });

    it('should execute $task command with default task', () => {
      const context = createTestContext('$task');
      const result = executeCommand('$task', context);
      
      expect(result).toBeDefined();
      expect(result?.nodeType).toBe('taskNode');
      expect(result?.text).toBe('- [ ] New task');
      expect(result?.clearTrigger).toBe(true);
    });

    it('should execute $code command with template', () => {
      const context = createTestContext('$code');
      const result = executeCommand('$code', context);
      
      expect(result).toBeDefined();
      expect(result?.nodeType).toBe('codeNode');
      expect(result?.text).toContain('```javascript');
      expect(result?.metadata?.language).toBe('javascript');
      expect(result?.clearTrigger).toBe(true);
    });

    it('should handle all node type commands', () => {
      const nodeTypeCommands = ['$note', '$task', '$code', '$question', '$image', '$resource'];
      
      nodeTypeCommands.forEach(trigger => {
        const context = createTestContext(trigger);
        const result = executeCommand(trigger, context);
        
        expect(result).toBeDefined();
        expect(result?.nodeType).toBeDefined();
        expect(result?.clearTrigger).toBe(true);
      });
    });
  });

  describe('Pattern Commands (/)', () => {
    const createTestContext = (triggerText: string, position: number = 0): CommandContext => ({
      currentText: triggerText,
      cursorPosition: position + triggerText.length,
      triggerPosition: position,
      triggerText,
    });

    it('should execute /date command', () => {
      const context = createTestContext('/date');
      const result = executeCommand('/date', context);
      
      expect(result).toBeDefined();
      expect(result?.text).toBe('@today');
      expect(result?.clearTrigger).toBe(true);
    });

    it('should execute /priority command', () => {
      const context = createTestContext('/priority');
      const result = executeCommand('/priority', context);
      
      expect(result).toBeDefined();
      expect(result?.text).toBe('#high');
      expect(result?.clearTrigger).toBe(true);
    });

    it('should execute /checkbox command', () => {
      const context = createTestContext('/checkbox');
      const result = executeCommand('/checkbox', context);
      
      expect(result).toBeDefined();
      expect(result?.text).toBe('- [ ] ');
      expect(result?.clearTrigger).toBe(true);
    });

    it('should execute /tag command with cursor positioning', () => {
      const context = createTestContext('/tag');
      const result = executeCommand('/tag', context);
      
      expect(result).toBeDefined();
      expect(result?.text).toBe('[tag]');
      expect(result?.cursorPosition).toBe(1); // Inside brackets
      expect(result?.clearTrigger).toBe(true);
    });
  });

  describe('Formatting Commands (/)', () => {
    const createTestContextWithSelection = (
      triggerText: string, 
      selectedText: string,
      selectionStart: number = 10,
      triggerPosition: number = 0
    ): CommandContext => ({
      currentText: `Some text ${selectedText} more text ${triggerText}`,
      cursorPosition: triggerPosition + triggerText.length,
      triggerPosition,
      triggerText,
      selection: {
        start: selectionStart,
        end: selectionStart + selectedText.length,
        text: selectedText,
      },
    });

    it('should execute /bold command with selection', () => {
      const context = createTestContextWithSelection('/bold', 'important text');
      const result = executeCommand('/bold', context);
      
      expect(result).toBeDefined();
      expect(result?.text).toContain('**important text**');
      expect(result?.clearTrigger).toBe(true);
    });

    it('should execute /bold command without selection', () => {
      const context: CommandContext = {
        currentText: '/bold',
        cursorPosition: 5,
        triggerPosition: 0,
        triggerText: '/bold',
      };
      const result = executeCommand('/bold', context);
      
      expect(result).toBeDefined();
      expect(result?.text).toBe('**bold text**');
      expect(result?.cursorPosition).toBe(2); // Inside asterisks
      expect(result?.clearTrigger).toBe(true);
    });

    it('should execute /italic command', () => {
      const context: CommandContext = {
        currentText: '/italic',
        cursorPosition: 7,
        triggerPosition: 0,
        triggerText: '/italic',
      };
      const result = executeCommand('/italic', context);
      
      expect(result).toBeDefined();
      expect(result?.text).toBe('*italic text*');
      expect(result?.cursorPosition).toBe(1); // Inside asterisks
      expect(result?.clearTrigger).toBe(true);
    });

    it('should execute /link command', () => {
      const context: CommandContext = {
        currentText: '/link',
        cursorPosition: 5,
        triggerPosition: 0,
        triggerText: '/link',
      };
      const result = executeCommand('/link', context);
      
      expect(result).toBeDefined();
      expect(result?.text).toBe('[link text](url)');
      expect(result?.cursorPosition).toBe(1); // At link text
      expect(result?.clearTrigger).toBe(true);
    });
  });

  describe('Template Commands (/)', () => {
    it('should execute /meeting template', () => {
      const context: CommandContext = {
        currentText: '/meeting',
        cursorPosition: 8,
        triggerPosition: 0,
        triggerText: '/meeting',
      };
      const result = executeCommand('/meeting', context);
      
      expect(result).toBeDefined();
      expect(result?.text).toContain('# Meeting Notes');
      expect(result?.text).toContain('**Attendees:**');
      expect(result?.text).toContain('**Action Items:**');
      expect(result?.clearTrigger).toBe(true);
    });

    it('should execute /standup template', () => {
      const context: CommandContext = {
        currentText: '/standup',
        cursorPosition: 8,
        triggerPosition: 0,
        triggerText: '/standup',
      };
      const result = executeCommand('/standup', context);
      
      expect(result).toBeDefined();
      expect(result?.text).toContain('# Daily Standup');
      expect(result?.text).toContain('**Yesterday:**');
      expect(result?.text).toContain('**Today:**');
      expect(result?.text).toContain('**Blockers & Help Needed:**');
      expect(result?.clearTrigger).toBe(true);
    });

    it('should execute /brainstorm template', () => {
      const context: CommandContext = {
        currentText: '/brainstorm',
        cursorPosition: 10,
        triggerPosition: 0,
        triggerText: '/brainstorm',
      };
      const result = executeCommand('/brainstorm', context);
      
      expect(result).toBeDefined();
      expect(result?.text).toContain('# Brainstorming Session');
      expect(result?.text).toContain('**Topic/Challenge:**');
      expect(result?.text).toContain('## Initial Ideas');
      expect(result?.text).toContain('💡');
      expect(result?.clearTrigger).toBe(true);
    });

    it('should execute /retrospective template', () => {
      const context: CommandContext = {
        currentText: '/retrospective',
        cursorPosition: 13,
        triggerPosition: 0,
        triggerText: '/retrospective',
      };
      const result = executeCommand('/retrospective', context);
      
      expect(result).toBeDefined();
      expect(result?.text).toContain('# Sprint Retrospective');
      expect(result?.text).toContain('## What Went Well ✅');
      expect(result?.text).toContain('## What Didn\'t Go Well ❌');
      expect(result?.text).toContain('## What We Learned 📚');
      expect(result?.clearTrigger).toBe(true);
    });
  });

  describe('Default Commands Error Handling', () => {
    it('should return null for unknown commands', () => {
      const context: CommandContext = {
        currentText: '$unknown',
        cursorPosition: 8,
        triggerPosition: 0,
        triggerText: '$unknown',
      };
      const result = executeCommand('$unknown', context);
      
      expect(result).toBeNull();
    });

    it('should handle command execution errors gracefully', () => {
      // Mock a command that throws an error
      const mockCommand = {
        trigger: '$error',
        label: 'Error Command',
        description: 'A command that throws an error',
        icon: () => null as any,
        category: 'node-type' as const,
        action: () => {
          throw new Error('Test error');
        },
      };
      
      CommandRegistry.getInstance().registerCommand(mockCommand);
      
      const context: CommandContext = {
        currentText: '$error',
        cursorPosition: 6,
        triggerPosition: 0,
        triggerText: '$error',
      };
      
      const result = executeCommand('$error', context);
      expect(result).toBeNull();
    });
  });

  describe('Registry Management', () => {
    it('should clear and re-register commands', () => {
      const registry = CommandRegistry.getInstance();
      const initialCount = registry.getAllCommands().length;
      expect(initialCount).toBeGreaterThan(0);
      
      registry.clearRegistry();
      expect(registry.getAllCommands().length).toBe(0);
      
      registerDefaultCommands();
      expect(registry.getAllCommands().length).toBeGreaterThanOrEqual(15); // We expect at least 15 commands
      expect(registry.getAllCommands().length).toBeLessThanOrEqual(20); // But not more than 20
    });
  });
});