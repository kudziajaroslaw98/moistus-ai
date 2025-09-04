/**
 * @jest-environment jsdom
 */

import { commandRegistry } from '../../commands/command-registry';
import { mapTriggerToNodeType } from '../command-completions';

describe('Command Completions', () => {
  test('command registry has node type commands', () => {
    const nodeTypeCommands = commandRegistry.getCommandsByTriggerType('node-type');
    
    expect(nodeTypeCommands).toBeDefined();
    expect(nodeTypeCommands.length).toBeGreaterThan(0);
    
    // Check for $task specifically
    const taskCommand = nodeTypeCommands.find(cmd => cmd.trigger === '$task');
    expect(taskCommand).toBeDefined();
    expect(taskCommand?.label).toBe('Task List');
    expect(taskCommand?.category).toBe('node-type');
  });

  test('command registry has slash commands', () => {
    const slashCommands = commandRegistry.getCommandsByTriggerType('slash');
    
    expect(slashCommands).toBeDefined();
    expect(slashCommands.length).toBeGreaterThan(0);
  });

  test('mapTriggerToNodeType returns correct mappings', () => {
    expect(mapTriggerToNodeType('$task')).toBe('taskNode');
    expect(mapTriggerToNodeType('$note')).toBe('defaultNode');
    expect(mapTriggerToNodeType('$code')).toBe('codeNode');
    expect(mapTriggerToNodeType('$invalid')).toBe(null);
  });

  test('$task command execution returns correct result', async () => {
    const taskCommand = commandRegistry.getCommand('$task');
    expect(taskCommand).toBeDefined();

    if (taskCommand) {
      const context = {
        currentText: '$task Buy milk',
        cursorPosition: 10,
        selection: null
      };

      const result = await commandRegistry.executeCommand('$task', context);
      expect(result).toBeDefined();
      expect(result?.nodeType).toBe('taskNode');
      expect(result?.replacement).toBe('Buy milk');
    }
  });
});