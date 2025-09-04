/**
 * Integration test specifically for $task completion functionality
 * Tests the complete path from typing "$task" to completing the action
 */

import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { commandRegistry } from '../../commands/command-registry';
import { createCommandCompletions } from '../command-completions';

describe('$task Completion Integration', () => {
  let editorView: EditorView;
  let mockContainer: HTMLElement;

  beforeEach(() => {
    // Create mock DOM container
    mockContainer = document.createElement('div');
    document.body.appendChild(mockContainer);

    // Create editor with command completions
    const startState = EditorState.create({
      doc: '',
      extensions: [createCommandCompletions()]
    });

    editorView = new EditorView({
      state: startState,
      parent: mockContainer
    });
  });

  afterEach(() => {
    editorView.destroy();
    document.body.removeChild(mockContainer);
  });

  test('command registry contains $task command', () => {
    const taskCommand = commandRegistry.getCommand('$task');
    
    expect(taskCommand).toBeDefined();
    expect(taskCommand?.trigger).toBe('$task');
    expect(taskCommand?.label).toBe('Task List');
    expect(taskCommand?.category).toBe('node-type');
    expect(taskCommand?.triggerType).toBe('node-type');
  });

  test('$task command execution produces correct result', async () => {
    const taskCommand = commandRegistry.getCommand('$task');
    
    if (taskCommand) {
      const context = {
        currentText: '$task Buy groceries and cook dinner',
        cursorPosition: 5,
        selection: null
      };

      const result = await commandRegistry.executeCommand('$task', context);
      
      expect(result).toBeDefined();
      expect(result?.nodeType).toBe('taskNode');
      expect(result?.replacement).toBe('Buy groceries and cook dinner');
      expect(result?.cursorPosition).toBe(29); // Length of remaining text
      expect(result?.closePanel).toBe(true);
    }
  });

  test('node type commands are available for completion', () => {
    const nodeTypeCommands = commandRegistry.getCommandsByTriggerType('node-type');
    
    expect(nodeTypeCommands.length).toBeGreaterThan(0);
    
    const taskCommand = nodeTypeCommands.find(cmd => cmd.trigger === '$task');
    expect(taskCommand).toBeDefined();
    
    const noteCommand = nodeTypeCommands.find(cmd => cmd.trigger === '$note');
    expect(noteCommand).toBeDefined();
    
    const codeCommand = nodeTypeCommands.find(cmd => cmd.trigger === '$code');
    expect(codeCommand).toBeDefined();
  });

  test('slash commands are available for completion', () => {
    const slashCommands = commandRegistry.getCommandsByTriggerType('slash');
    
    expect(slashCommands.length).toBeGreaterThan(0);
    
    const dateCommand = slashCommands.find(cmd => cmd.trigger === '/date');
    expect(dateCommand).toBeDefined();
    
    const priorityCommand = slashCommands.find(cmd => cmd.trigger === '/priority');
    expect(priorityCommand).toBeDefined();
  });

  test('editor integration works without errors', () => {
    // Test that the editor can be created with command completions
    expect(editorView).toBeDefined();
    expect(editorView.state).toBeDefined();
    
    // Test inserting text
    editorView.dispatch({
      changes: { from: 0, insert: '$task Test content' }
    });
    
    expect(editorView.state.doc.toString()).toBe('$task Test content');
  });

  test('findMatchingCommands works for partial input', () => {
    // Test partial $task matching
    const matches = commandRegistry.findMatchingCommands('$ta');
    const taskMatches = matches.filter(cmd => cmd.trigger === '$task');
    expect(taskMatches.length).toBe(1);
    
    // Test partial slash command matching
    const slashMatches = commandRegistry.findMatchingCommands('/da');
    const dateMatches = slashMatches.filter(cmd => cmd.trigger === '/date');
    expect(dateMatches.length).toBe(1);
  });

  test('searchCommands with triggerPattern works correctly', () => {
    // Search for task-related commands
    const taskResults = commandRegistry.searchCommands({
      triggerPattern: '$task'
    });
    
    expect(taskResults.length).toBe(1);
    expect(taskResults[0].trigger).toBe('$task');
    
    // Search for all $ triggers
    const dollarResults = commandRegistry.searchCommands({
      triggerType: 'node-type'
    });
    
    expect(dollarResults.length).toBeGreaterThan(0);
    expect(dollarResults.every(cmd => cmd.trigger.startsWith('$'))).toBe(true);
  });
});