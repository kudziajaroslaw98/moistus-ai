/**
 * Command Registry Demo
 * 
 * This file demonstrates how to use the enhanced command registry system
 * for node type switching and command palette functionality.
 */

import { commandRegistry } from './index';
import type { Command, CommandContext } from './types';
import { Zap, Star, Heart } from 'lucide-react';

/**
 * Demo: Basic command registration and execution
 */
export async function demoBasicUsage() {
  console.log('=== Command Registry Demo ===\n');

  // 1. Search for existing commands
  console.log('1. Searching for task-related commands:');
  const taskCommands = commandRegistry.searchCommands({ query: 'task' });
  taskCommands.forEach(cmd => {
    console.log(`  - ${cmd.label}: ${cmd.description}`);
  });

  // 2. Get commands by category
  console.log('\n2. Node type commands:');
  const nodeCommands = commandRegistry.getCommandsByCategory('node-type');
  console.log(`  Found ${nodeCommands.length} node type commands`);

  // 3. Execute a command
  console.log('\n3. Executing $task command:');
  const context: CommandContext = {
    currentText: '$task Buy milk; Send email @tomorrow #high',
    cursorPosition: 35
  };

  const taskCommand = commandRegistry.findMatchingCommands('$task')[0];

  if (taskCommand) {
    const result = await commandRegistry.executeCommand(taskCommand.id, context);
    console.log('  Result:', result);
  }

  // 4. Registry statistics
  console.log('\n4. Registry statistics:');
  const stats = commandRegistry.getStats();
  console.log(`  Total commands: ${stats.totalCommands}`);
  console.log('  By category:', stats.commandsByCategory);
  console.log('  By trigger type:', stats.commandsByTriggerType);
}

/**
 * Demo: Custom command registration
 */
export function demoCustomCommands() {
  console.log('\n=== Custom Command Demo ===\n');

  // Register a custom node type command
  const customNodeCommand: Command = {
    id: 'sparkle-node',
    trigger: '$sparkle',
    label: 'Sparkle Node',
    description: 'Create a sparkly magical node',
    icon: Star,
    category: 'node-type',
    triggerType: 'node-type',
    keywords: ['sparkle', 'magic', 'special'],
    examples: ['$sparkle Magic happens here ✨'],
    priority: 1,
    action: (context: CommandContext) => {
      const content = context.currentText.replace(/\$sparkle\s*/, '');
      return {
        replacement: '',
        nodeType: 'annotationNode',
        nodeData: {
          text: `✨ ${content} ✨`,
          type: 'success'
        },
        closePanel: true,
        message: 'Sparkle node created! ✨'
      };
    }
  };

  commandRegistry.registerCommand(customNodeCommand);
  console.log('✅ Registered custom sparkle node command');

  // Register a custom pattern command
  const emojiCommand: Command = {
    id: 'random-emoji',
    trigger: '/emoji',
    label: 'Random Emoji',
    description: 'Insert a random emoji',
    icon: Heart,
    category: 'pattern',
    triggerType: 'slash',
    keywords: ['emoji', 'random', 'fun'],
    action: (context: CommandContext) => {
      const emojis = ['🎉', '🚀', '💡', '⭐', '🔥', '💯', '🎯', '✨'];
      const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
      const newText = context.currentText.replace('/emoji', randomEmoji);
      
      return {
        replacement: newText,
        cursorPosition: newText.length,
        closePanel: true,
        message: `Added ${randomEmoji}!`
      };
    }
  };

  commandRegistry.registerCommand(emojiCommand);
  console.log('✅ Registered random emoji command');

  // Register a formatting command
  const uppercaseCommand: Command = {
    id: 'uppercase',
    trigger: 'uppercase',
    label: 'Uppercase',
    description: 'Convert selected text to uppercase',
    icon: Zap,
    category: 'format',
    triggerType: 'shortcut',
    shortcuts: ['Ctrl+Shift+U'],
    action: (context: CommandContext) => {
      if (!context.selection) {
        return {
          message: 'Please select text to convert to uppercase'
        };
      }

      const { from, to, text } = context.selection;
      const uppercaseText = text.toUpperCase();
      const newText = context.currentText.substring(0, from) + 
                      uppercaseText + 
                      context.currentText.substring(to);

      return {
        replacement: newText,
        cursorPosition: from + uppercaseText.length,
        closePanel: true,
        message: 'Text converted to uppercase!'
      };
    }
  };

  commandRegistry.registerCommand(uppercaseCommand);
  console.log('✅ Registered uppercase formatting command');
}

/**
 * Demo: Command search and filtering
 */
export function demoSearchAndFiltering() {
  console.log('\n=== Search & Filtering Demo ===\n');

  // Search by different criteria
  const searchTests = [
    { criteria: { query: 'sparkle' }, description: 'Search for "sparkle"' },
    { criteria: { category: 'pattern' as const }, description: 'All pattern commands' },
    { criteria: { triggerType: 'node-type' as const }, description: 'All node-type triggers' },
    { criteria: { query: 'emoji', triggerType: 'slash' as const }, description: 'Slash commands with "emoji"' }
  ];

  searchTests.forEach(test => {
    const results = commandRegistry.searchCommands(test.criteria);
    console.log(`${test.description}:`);
    console.log(`  Found ${results.length} commands`);
    results.forEach(cmd => {
      console.log(`    - ${cmd.trigger} (${cmd.label})`);
    });
    console.log();
  });
}

/**
 * Demo: Event system
 */
export function demoEventSystem() {
  console.log('\n=== Event System Demo ===\n');

  // Listen for registry events
  commandRegistry.addEventListener('command-registered', (event) => {
    console.log(`📝 Command registered: ${event.commandId}`);
  });

  commandRegistry.addEventListener('command-executed', (event) => {
    console.log(`⚡ Command executed: ${event.commandId}`);
  });

  // Register a test command to trigger events
  const testCommand: Command = {
    id: 'test-event-command',
    trigger: '/test-event',
    label: 'Test Event',
    description: 'Test command for event demo',
    icon: Zap,
    category: 'pattern',
    triggerType: 'slash',
    action: () => ({ message: 'Test event command executed!' })
  };

  console.log('Registering test command...');
  commandRegistry.registerCommand(testCommand);
  
  console.log('Executing test command...');
  commandRegistry.executeCommand('test-event-command', {
    currentText: '/test-event',
    cursorPosition: 11
  });
}

/**
 * Demo: Integration patterns
 */
export async function demoIntegrationPatterns() {
  console.log('\n=== Integration Patterns Demo ===\n');

  // Simulate command palette usage
  console.log('1. Command palette simulation:');
  const userInput = '$ta'; // User types partial trigger
  const suggestions = commandRegistry.findMatchingCommands(userInput);
  console.log(`  User types: "${userInput}"`);
  console.log(`  Found ${suggestions.length} suggestions:`);
  suggestions.forEach(cmd => {
    console.log(`    - ${cmd.trigger}: ${cmd.description}`);
  });

  // Simulate CodeMirror completion
  console.log('\n2. CodeMirror completion simulation:');
  const editorText = 'Meeting notes /d';
  const completions = commandRegistry.searchCommands({ 
    query: 'd',
    triggerType: 'slash',
    limit: 5
  });
  console.log(`  Editor text: "${editorText}"`);
  console.log(`  Available completions:`);
  completions.forEach(cmd => {
    console.log(`    - ${cmd.trigger}: ${cmd.label}`);
  });

  // Simulate context-aware suggestions
  console.log('\n3. Context-aware suggestions:');
  const contextualCommands = commandRegistry.searchCommands({
    category: 'format'
  }).slice(0, 3);
  console.log('  Format commands for selected text:');
  contextualCommands.forEach(cmd => {
    console.log(`    - ${cmd.shortcuts?.[0] || cmd.trigger}: ${cmd.label}`);
  });
}

/**
 * Run all demos
 */
export async function runAllDemos() {
  try {
    await demoBasicUsage();
    demoCustomCommands();
    demoSearchAndFiltering();
    demoEventSystem();
    await demoIntegrationPatterns();
    
    console.log('\n=== Demo Complete! ===');
    console.log('The command registry is ready for integration with your UI components.');
  } catch (error) {
    console.error('Demo error:', error);
  }
}

// Auto-run demos if this file is executed directly
if (typeof module !== 'undefined' && require.main === module) {
  runAllDemos();
}