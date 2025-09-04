/**
 * Legacy Bridge for Command Registry Integration
 * 
 * This module provides utilities to integrate the new command registry system
 * with the existing node-commands.tsx system, ensuring backward compatibility
 * while enabling new features.
 */

import type { NodeCommand } from '../types';
import type { Command, CommandContext, CommandResult } from './types';
import { commandRegistry } from './command-registry';
import { nodeCommands } from '../node-commands';

/**
 * Convert legacy NodeCommand to new Command format
 */
export function convertLegacyCommand(nodeCommand: NodeCommand): Command {
  const trigger = nodeCommand.command; // e.g., '/task'
  const nodeTypeTrigger = `$${nodeCommand.nodeType.replace('Node', '').toLowerCase()}`;
  
  return {
    id: `legacy-${nodeCommand.command.replace('/', '')}`,
    trigger: nodeTypeTrigger, // Convert to $nodeType format
    label: nodeCommand.label,
    description: nodeCommand.description,
    icon: nodeCommand.icon as any,
    category: 'node-type',
    triggerType: 'node-type',
    keywords: [nodeCommand.label.toLowerCase(), nodeCommand.nodeType],
    examples: nodeCommand.examples || [],
    action: createLegacyCommandAction(nodeCommand),
    priority: getLegacyCommandPriority(nodeCommand.nodeType)
  };
}

/**
 * Create command action that uses legacy parser
 */
function createLegacyCommandAction(nodeCommand: NodeCommand) {
  return (context: CommandContext): CommandResult => {
    const { currentText } = context;
    
    // Parse using legacy parser if available
    let parsedData = {};

    if (nodeCommand.quickParse) {
      try {
        // Extract content after the trigger (e.g., everything after '$task ')
        const triggerMatch = currentText.match(/\$\w+\s*(.*)/);
        const content = triggerMatch ? triggerMatch[1] : currentText;
        
        parsedData = nodeCommand.quickParse(content);
      } catch (error) {
        console.warn('Legacy parser failed:', error);
        parsedData = { content: currentText };
      }
    }

    return {
      replacement: '', // Clear the input after parsing
      nodeType: nodeCommand.nodeType,
      nodeData: parsedData,
      cursorPosition: 0,
      closePanel: true,
      message: `Created ${nodeCommand.label}`
    };
  };
}

/**
 * Get priority for legacy commands based on node type
 */
function getLegacyCommandPriority(nodeType: string): number {
  const priorities: Record<string, number> = {
    'defaultNode': 1,
    'taskNode': 2, 
    'textNode': 3,
    'codeNode': 4,
    'imageNode': 5,
    'resourceNode': 6,
    'questionNode': 7,
    'annotationNode': 8
  };
  
  return priorities[nodeType] || 50;
}

/**
 * Register all legacy commands in the new registry
 */
export function registerLegacyCommands(): void {
  nodeCommands.forEach(nodeCommand => {
    const command = convertLegacyCommand(nodeCommand);
    
    // Register with replace option to avoid conflicts
    commandRegistry.registerCommand(command, { 
      replace: true,
      validate: false // Skip validation for legacy commands
    });
  });
}

/**
 * Get legacy NodeCommand by node type
 */
export function getLegacyCommandByNodeType(nodeType: string): NodeCommand | undefined {
  return nodeCommands.find(cmd => cmd.nodeType === nodeType);
}

/**
 * Create context for legacy command execution
 */
export function createLegacyContext(
  text: string,
  cursorPosition: number,
  selection?: { from: number; to: number; text: string }
): CommandContext {
  return {
    currentText: text,
    cursorPosition,
    selection,
    nodeType: 'defaultNode',
    metadata: {}
  };
}

/**
 * Execute legacy command with new registry
 */
export async function executeLegacyCommand(
  nodeType: string,
  context: CommandContext
): Promise<CommandResult | null> {
  const legacyCommand = getLegacyCommandByNodeType(nodeType);

  if (!legacyCommand) {
    return null;
  }

  const command = convertLegacyCommand(legacyCommand);
  return commandRegistry.executeCommand(command.id, context);
}

/**
 * Bridge function to handle both old and new command formats
 */
export function handleCommandExecution(
  input: string,
  context: CommandContext
): Promise<CommandResult | null> {
  // Try new registry first
  const matchingCommands = commandRegistry.findMatchingCommands(input);
  
  if (matchingCommands.length > 0) {
    return commandRegistry.executeCommand(matchingCommands[0].id, context);
  }

  // Fallback to legacy system
  const slashMatch = input.match(/\/(\w+)/);

  if (slashMatch) {
    const commandName = slashMatch[1];
    const legacyCommand = nodeCommands.find(cmd => 
      cmd.command === `/${commandName}`
    );
    
    if (legacyCommand) {
      return executeLegacyCommand(legacyCommand.nodeType, context);
    }
  }

  return null;
}

// Initialize legacy bridge on import
registerLegacyCommands();