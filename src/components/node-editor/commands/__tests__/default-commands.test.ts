/**
 * Tests for the Default Commands Registry
 * Phase 1.3: Inline Node Type Switching - Command Registry Tests
 */

import {
	commandRegistry,
	registerDefaultCommands,
	executeCommand,
	getCommandsByCategory,
	getCommandsByTriggerPrefix,
	searchCommands,
	type CommandContext,
} from '../default-commands';

describe('Command Registry', () => {
	beforeEach(() => {
		// Ensure commands are registered before each test
		registerDefaultCommands();
	});

	describe('Basic Registry Operations', () => {
		it('should register all default commands', () => {
			const allCommands = commandRegistry.getAllCommands();
			expect(allCommands.length).toBeGreaterThan(0);
		});

		it('should find commands by trigger', () => {
			const noteCommand = commandRegistry.getCommand('$note');
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

	describe('Error Handling', () => {
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
			
			commandRegistry.register(mockCommand);
			
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
			const initialCount = commandRegistry.getAllCommands().length;
			expect(initialCount).toBeGreaterThan(0);
			
			commandRegistry.clear();
			expect(commandRegistry.getAllCommands().length).toBe(0);
			
			registerDefaultCommands();
			expect(commandRegistry.getAllCommands().length).toBe(initialCount);
		});
	});
});