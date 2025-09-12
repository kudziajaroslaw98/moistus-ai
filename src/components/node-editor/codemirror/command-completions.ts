/**
 * CodeMirror Command Completions Extension
 * 
 * Provides real-time autocompletion for:
 * - $nodeType triggers for node type switching
 * - /command triggers for slash commands
 * 
 * Integrates with command registry and parser systems
 */

import {
  CompletionContext,
  CompletionResult,
  Completion,
  autocompletion,
  CompletionSource,
  insertCompletionText
} from '@codemirror/autocomplete';
import { EditorState, StateEffect, StateField, Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { commandRegistry } from '../commands/command-registry';
import { detectNodeTypeSwitch, detectSlashCommand } from '../parsers/command-parser';
import type { Command } from '../commands/types';
import type { AvailableNodeTypes } from '../../../types/available-node-types';

/**
 * Custom event types for command completion integration
 */
export interface NodeTypeChangeEvent extends CustomEvent {
  detail: {
    nodeType: AvailableNodeTypes;
    text: string;
    cursorPosition: number;
    triggerText?: string; // Optional trigger that caused the change
  };
}

export interface CommandExecutedEvent extends CustomEvent {
  detail: {
    commandId: string;
    result: any;
    text: string;
    cursorPosition: number;
  };
}

/**
 * State effect for triggering node type changes
 */
const nodeTypeChangeEffect = StateEffect.define<{
  nodeType: AvailableNodeTypes;
  text: string;
  cursorPosition: number;
}>();

/**
 * State effect for triggering command execution
 */
const commandExecutedEffect = StateEffect.define<{
  commandId: string;
  result: any;
  text: string;
  cursorPosition: number;
}>();

/**
 * State field to track command completion state
 */
const commandCompletionState = StateField.define({
  create() {
    return {
      lastTriggerType: null as 'node-type' | 'slash' | null,
      lastTriggerText: '',
      completionActive: false
    };
  },
  update(value, tr) {
    let newValue = { ...value };
    
    // Reset completion state on document changes
    if (tr.docChanged) {
      newValue.completionActive = false;
    }
    
    // Handle state effects
    for (const effect of tr.effects) {
      if (effect.is(nodeTypeChangeEffect)) {
        newValue = {
          ...newValue,
          lastTriggerType: 'node-type',
          lastTriggerText: '',
          completionActive: false
        };
      } else if (effect.is(commandExecutedEffect)) {
        newValue = {
          ...newValue,
          lastTriggerType: 'slash',
          lastTriggerText: '',
          completionActive: false
        };
      }
    }
    
    return newValue;
  }
});

/**
 * Main completion source for command triggers
 */
function commandCompletions(context: CompletionContext): CompletionResult | null {
  try {
    const { state, pos } = context;
    const text = state.doc.toString();
    
    // Try node type completions first
    const nodeTypeResult = nodeTypeCompletions(context);
    if (nodeTypeResult) {
      return nodeTypeResult;
    }
    
    // Try slash command completions
    const slashResult = slashCommandCompletions(context);
    if (slashResult) {
      return slashResult;
    }
    
    return null;
  } catch (error) {
    console.error('Command completions error:', error);
    return null;
  }
}

/**
 * Node type completions for $nodeType triggers
 */
function nodeTypeCompletions(context: CompletionContext): CompletionResult | null {
  const { state, pos } = context;
  const text = state.doc.toString();
  
  // Look for $ triggers near cursor
  const beforeCursor = text.slice(Math.max(0, pos - 20), pos);
  const dollarMatch = beforeCursor.match(/\$(\w*)$/);
  
  if (!dollarMatch) {
    return null;
  }
  
  const trigger = dollarMatch[0];
  const partialNodeType = dollarMatch[1];
  const triggerStart = pos - trigger.length;
  
  // Get node type commands from registry
  const nodeTypeCommands = commandRegistry.getCommandsByTriggerType('node-type');
  
  // Filter commands based on partial input
  const matchingCommands = nodeTypeCommands.filter(cmd => {
    const cmdTrigger = cmd.trigger.slice(1); // Remove $
    return partialNodeType.length === 0 || 
           cmdTrigger.toLowerCase().startsWith(partialNodeType.toLowerCase());
  });
  
  if (matchingCommands.length === 0) {
    return null;
  }
  
  // Convert to completions
  const completions: Completion[] = matchingCommands.map(cmd => ({
    label: cmd.trigger,
    detail: cmd.description,
    info: cmd.label,
    type: 'variable',
    boost: cmd.priority ? 100 - cmd.priority : 0,
    section: {
      name: 'Node Types',
      rank: 1
    },
    apply: (view: EditorView, completion: Completion, from: number, to: number) => {
      try {
        const nodeType = mapTriggerToNodeType(cmd.trigger);
        if (!nodeType) {
          console.error(`No node type mapping for trigger: ${cmd.trigger}`);
          return;
        }
        
        // Get the completed trigger (e.g., "$task")
        const completedTrigger = cmd.trigger;
        
        // Get the rest of the text after the partial trigger
        const fullText = view.state.doc.toString();
        const beforeTrigger = fullText.slice(0, from);
        const afterTrigger = fullText.slice(to);
        
        // Complete the trigger and add a space for better UX
        // Always add a space after the trigger to make it easy to start typing content
        const insertText = completedTrigger + ' ';
        
        // Calculate new cursor position (after the completed trigger)
        const newCursorPos = from + insertText.length;
        const newFullText = beforeTrigger + insertText + afterTrigger;
        
        // Apply the completion with explicit text changes
        view.dispatch({
          changes: {
            from: from,           // Start of the partial trigger
            to: to,               // End of the partial trigger
            insert: insertText    // Insert the completed trigger
          },
          selection: {
            anchor: newCursorPos  // Position cursor after the completed trigger
          },
          effects: [
            nodeTypeChangeEffect.of({
              nodeType,
              text: newFullText,
              cursorPosition: newCursorPos
            })
          ]
        });
        
        // Dispatch custom event with the new text
        const event = new CustomEvent('nodeTypeChange', {
          detail: {
            nodeType,
            text: newFullText,
            cursorPosition: newCursorPos,
            triggerText: completedTrigger
          }
        }) as NodeTypeChangeEvent;
        
        view.dom.dispatchEvent(event);
        
      } catch (error) {
        console.error('Node type completion apply error:', error);
      }
    }
  }));
  
  return {
    from: triggerStart,
    options: completions,
    validFor: /^\$\w*/
  };
}

/**
 * Slash command completions for /command triggers
 */
function slashCommandCompletions(context: CompletionContext): CompletionResult | null {
  const { state, pos } = context;
  const text = state.doc.toString();
  
  // Look for / triggers at valid positions (start of line or after whitespace)
  const beforeCursor = text.slice(Math.max(0, pos - 30), pos);
  const slashMatch = beforeCursor.match(/(^|\s)(\/\w*)$/);
  
  if (!slashMatch) {
    return null;
  }
  
  const trigger = slashMatch[2];
  const partialCommand = trigger.slice(1); // Remove /
  const triggerStart = pos - trigger.length;
  
  // Get slash commands from registry
  const slashCommands = commandRegistry.getCommandsByTriggerType('slash');
  
  // Filter commands based on partial input
  const matchingCommands = slashCommands.filter(cmd => {
    const cmdTrigger = cmd.trigger.slice(1); // Remove /
    return partialCommand.length === 0 || 
           cmdTrigger.toLowerCase().startsWith(partialCommand.toLowerCase()) ||
           cmd.label.toLowerCase().includes(partialCommand.toLowerCase()) ||
           cmd.keywords?.some(kw => kw.toLowerCase().includes(partialCommand.toLowerCase()));
  });
  
  if (matchingCommands.length === 0) {
    return null;
  }
  
  // Group commands by category
  const commandsByCategory = matchingCommands.reduce((acc, cmd) => {
    const category = cmd.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(cmd);
    return acc;
  }, {} as Record<string, Command[]>);
  
  // Convert to completions with categories
  const completions: Completion[] = [];
  
  Object.entries(commandsByCategory).forEach(([category, commands], categoryIndex) => {
    commands.forEach(cmd => {
      completions.push({
        label: cmd.trigger,
        detail: cmd.description,
        info: cmd.examples?.[0] || cmd.label,
        type: getCMCompletionType(cmd.category),
        boost: cmd.priority ? 100 - cmd.priority : 0,
        section: {
          name: formatCategoryName(category),
          rank: categoryIndex + 2 // Node types get rank 1
        },
        apply: async (view: EditorView, completion: Completion, from: number, to: number) => {
          try {
            // Execute the command
            const currentText = view.state.doc.toString();
            const cursorPos = view.state.selection.main.head;
            
            const commandContext = {
              currentText,
              cursorPosition: cursorPos,
              selection: null // TODO: Add selection support if needed
            };
            
            const result = await commandRegistry.executeCommand(cmd.id, commandContext);
            
            if (result) {
              // Apply the command result
              const changes = [];
              
              if (result.replacement !== undefined) {
                // Replace the trigger with the result
                changes.push({
                  from: triggerStart,
                  to: to,
                  insert: result.replacement
                });
              }
              
              const newCursorPos = result.cursorPosition !== undefined ? 
                (triggerStart + (result.cursorPosition || 0)) : to;
              
              view.dispatch({
                changes,
                selection: {
                  anchor: newCursorPos
                },
                effects: [
                  commandExecutedEffect.of({
                    commandId: cmd.id,
                    result,
                    text: result.replacement || '',
                    cursorPosition: newCursorPos
                  })
                ]
              });
              
              // Handle node type change if specified
              if (result.nodeType) {
                const nodeTypeEvent = new CustomEvent('nodeTypeChange', {
                  detail: {
                    nodeType: result.nodeType,
                    text: result.replacement || '',
                    cursorPosition: newCursorPos
                  }
                }) as NodeTypeChangeEvent;
                
                view.dom.dispatchEvent(nodeTypeEvent);
              }
              
              // Dispatch command executed event
              const executedEvent = new CustomEvent('commandExecuted', {
                detail: {
                  commandId: cmd.id,
                  result,
                  text: result.replacement || '',
                  cursorPosition: newCursorPos
                }
              }) as CommandExecutedEvent;
              
              view.dom.dispatchEvent(executedEvent);
            }
            
          } catch (error) {
            console.error('Slash command completion apply error:', error);
          }
        }
      });
    });
  });
  
  return {
    from: triggerStart,
    options: completions,
    validFor: /^\/\w*/
  };
}

/**
 * Map command category to CodeMirror completion type
 */
function getCMCompletionType(category: string): string {
  switch (category) {
    case 'pattern':
      return 'function';
    case 'format':
      return 'property';
    case 'template':
      return 'class';
    case 'node-type':
      return 'variable';
    default:
      return 'keyword';
  }
}

/**
 * Format category name for display
 */
function formatCategoryName(category: string): string {
  switch (category) {
    case 'node-type':
      return 'Node Types';
    case 'pattern':
      return 'Patterns';
    case 'format':
      return 'Formatting';
    case 'template':
      return 'Templates';
    default:
      return category.charAt(0).toUpperCase() + category.slice(1);
  }
}

/**
 * Map node type trigger to actual node type
 */
function mapTriggerToNodeType(trigger: string): AvailableNodeTypes | null {
  const mapping: Record<string, AvailableNodeTypes> = {
    '$note': 'defaultNode',
    '$task': 'taskNode',
    '$code': 'codeNode',
    '$image': 'imageNode',
    '$link': 'resourceNode',
    '$question': 'questionNode',
    '$annotation': 'annotationNode',
    '$text': 'textNode'
  };
  
  return mapping[trigger] || null;
}

/**
 * Create the command completions extension
 */
export function createCommandCompletions(): Extension {
  return [
    commandCompletionState,
    autocompletion({
      override: [commandCompletions],
      maxRenderedOptions: 25, // Increased from 15 to show more completions
      defaultKeymap: true,
      closeOnBlur: true,
      activateOnTyping: true,
      activateOnCompletion: () => true,
      interactionDelay: 75, // Small delay for smoother experience
      selectOnOpen: false,
      tooltipClass: () => 'enhanced-completion-tooltip',
      optionClass: (completion) => {
        const classes = ['command-completion-item'];
        
        if (completion.section && typeof completion.section === 'object' && 'name' in completion.section) {
          classes.push(`completion-section-${completion.section.name.toLowerCase().replace(/\s+/g, '-')}`);
        }
        
        if (completion.type) {
          classes.push(`completion-type-${completion.type}`);
        }
        
        return classes.join(' ');
      },
      compareCompletions: (a, b) => {
        // Prioritize by boost, then section rank, then alphabetical
        const boostDiff = (b.boost || 0) - (a.boost || 0);
        if (boostDiff !== 0) return boostDiff;
        
        const aSectionRank = (a.section && typeof a.section === 'object' && 'rank' in a.section) ? a.section.rank : 10;
        const bSectionRank = (b.section && typeof b.section === 'object' && 'rank' in b.section) ? b.section.rank : 10;
        const sectionDiff = aSectionRank - bSectionRank;
        if (sectionDiff !== 0) return sectionDiff;
        
        return a.label.localeCompare(b.label);
      }
    })
  ];
}

// Export individual completion functions for testing
export {
  commandCompletions,
  nodeTypeCompletions,
  slashCommandCompletions,
  nodeTypeChangeEffect,
  commandExecutedEffect,
  commandCompletionState,
  mapTriggerToNodeType
};