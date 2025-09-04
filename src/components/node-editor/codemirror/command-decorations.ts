/**
 * CodeMirror Command Decorations Extension
 * 
 * Provides visual feedback for command triggers:
 * - Highlights $nodeType patterns while typing
 * - Highlights /command patterns while typing
 * - Uses distinct styling for different trigger types
 * - Automatically removes decorations after command execution
 */

import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  WidgetType
} from '@codemirror/view';
import { Extension, Range } from '@codemirror/state';
import { detectNodeTypeSwitch, detectSlashCommand, extractAllCommandTriggers } from '../parsers/command-parser';
import { commandRegistry } from '../commands/command-registry';

/**
 * Widget for showing trigger hints
 */
class TriggerHintWidget extends WidgetType {
  constructor(
    private triggerType: 'node-type' | 'slash',
    private hint: string,
    private isValid: boolean
  ) {
    super();
  }
  
  toDOM(): HTMLElement {
    const span = document.createElement('span');
    span.className = `trigger-hint ${this.triggerType}-hint ${this.isValid ? 'valid' : 'invalid'}`;
    span.textContent = this.hint;
    return span;
  }
  
  eq(widget: TriggerHintWidget): boolean {
    return this.triggerType === widget.triggerType &&
           this.hint === widget.hint &&
           this.isValid === widget.isValid;
  }
}

/**
 * Create decorations for command triggers in the text
 */
function createDecorations(view: EditorView): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const text = view.state.doc.toString();
  const cursorPos = view.state.selection.main.head;
  
  try {
    // Get all command triggers
    const { nodeTypeTriggers, slashCommands } = extractAllCommandTriggers(text);
    
    // Decorate node type triggers
    decorateNodeTypeTriggers(text, nodeTypeTriggers, cursorPos, decorations);
    
    // Decorate slash commands
    decorateSlashCommands(text, slashCommands, cursorPos, decorations);
    
  } catch (error) {
    console.error('Error creating command decorations:', error);
  }
  
  return Decoration.set(decorations.sort((a, b) => a.from - b.from));
}

/**
 * Create decorations for node type triggers ($nodeType)
 */
function decorateNodeTypeTriggers(
  text: string,
  triggers: string[],
  cursorPos: number,
  decorations: Range<Decoration>[]
): void {
  // Use regex to find all positions of node type triggers
  const nodeTypePattern = /\$(\w+)/g;
  let match;
  
  while ((match = nodeTypePattern.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    const trigger = match[0];
    const nodeType = match[1];
    
    // Check if this trigger is near the cursor (within 10 characters)
    const isNearCursor = Math.abs(cursorPos - start) <= 10 || Math.abs(cursorPos - end) <= 10;
    
    if (isNearCursor) {
      // Check if the trigger is valid
      const command = commandRegistry.getCommand(trigger);
      const isValid = command !== undefined;
      
      // Create main trigger decoration
      decorations.push({
        from: start,
        to: end,
        value: Decoration.mark({
          class: `command-trigger node-type-trigger ${isValid ? 'valid' : 'invalid'}`,
          attributes: {
            'data-trigger': trigger,
            'data-node-type': nodeType,
            'data-valid': isValid.toString()
          }
        })
      });
      
      // Add hint widget after the trigger
      if (isValid && command) {
        decorations.push({
          from: end,
          to: end,
          value: Decoration.widget({
            widget: new TriggerHintWidget('node-type', ` → ${command.label}`, true),
            side: 1
          })
        });
      } else {
        decorations.push({
          from: end,
          to: end,
          value: Decoration.widget({
            widget: new TriggerHintWidget('node-type', ` (unknown)`, false),
            side: 1
          })
        });
      }
    }
    
    // Prevent infinite loop
    if (nodeTypePattern.lastIndex === match.index) {
      nodeTypePattern.lastIndex++;
    }
  }
}

/**
 * Create decorations for slash commands (/command)
 */
function decorateSlashCommands(
  text: string,
  commands: string[],
  cursorPos: number,
  decorations: Range<Decoration>[]
): void {
  // Use regex to find all positions of slash commands
  const slashPattern = /(^|\s)(\/\w*)/g;
  let match;
  
  while ((match = slashPattern.exec(text)) !== null) {
    const fullMatch = match[0];
    const trigger = match[2];
    const start = match.index + fullMatch.indexOf(trigger);
    const end = start + trigger.length;
    const command = trigger.slice(1); // Remove leading /
    
    // Check if this command is near the cursor (within 10 characters)
    const isNearCursor = Math.abs(cursorPos - start) <= 10 || Math.abs(cursorPos - end) <= 10;
    
    if (isNearCursor) {
      // Find matching commands
      const matchingCommands = commandRegistry.searchCommands({
        triggerType: 'slash',
        query: command,
        limit: 1
      });
      
      const exactMatch = commandRegistry.getCommand(trigger);
      const hasExactMatch = exactMatch !== undefined;
      const hasPartialMatches = matchingCommands.length > 0;
      
      let decorationClass = 'command-trigger slash-command-trigger';
      let hintText = '';
      let isValid = false;
      
      if (hasExactMatch) {
        decorationClass += ' valid exact-match';
        hintText = ` → ${exactMatch.label}`;
        isValid = true;
      } else if (hasPartialMatches && command.length > 0) {
        decorationClass += ' partial-match';
        hintText = ` → ${matchingCommands[0].label}`;
        isValid = true;
      } else if (command.length > 0) {
        decorationClass += ' invalid';
        hintText = ' (unknown)';
        isValid = false;
      } else {
        // Just "/" - show available commands count
        const allSlashCommands = commandRegistry.getCommandsByTriggerType('slash');
        decorationClass += ' trigger-start';
        hintText = ` (${allSlashCommands.length} commands)`;
        isValid = true;
      }
      
      // Create main trigger decoration
      decorations.push({
        from: start,
        to: end,
        value: Decoration.mark({
          class: decorationClass,
          attributes: {
            'data-trigger': trigger,
            'data-command': command,
            'data-valid': isValid.toString()
          }
        })
      });
      
      // Add hint widget after the trigger
      if (hintText) {
        decorations.push({
          from: end,
          to: end,
          value: Decoration.widget({
            widget: new TriggerHintWidget('slash', hintText, isValid),
            side: 1
          })
        });
      }
    }
    
    // Prevent infinite loop
    if (slashPattern.lastIndex === match.index) {
      slashPattern.lastIndex++;
    }
  }
}

/**
 * Update decorations on view changes
 */
function updateDecorations(update: ViewUpdate): DecorationSet | null {
  // Update decorations if:
  // 1. Document changed
  // 2. Selection changed (cursor moved)
  // 3. Viewport changed (scrolling)
  if (update.docChanged || update.selectionSet || update.viewportChanged) {
    return createDecorations(update.view);
  }
  
  return null;
}

/**
 * ViewPlugin for managing command decorations
 */
const commandDecorationsPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    
    constructor(view: EditorView) {
      this.decorations = createDecorations(view);
    }
    
    update(update: ViewUpdate) {
      const newDecorations = updateDecorations(update);
      if (newDecorations !== null) {
        this.decorations = newDecorations;
      }
    }
  },
  {
    decorations: (instance) => instance.decorations,
    provide: (plugin) =>
      EditorView.atomicRanges.of((view) => {
        return view.plugin(plugin)?.decorations || Decoration.none;
      })
  }
);

/**
 * CSS theme for command decorations
 */
const commandDecorationTheme = EditorView.theme({
  // Node type trigger styles
  '.node-type-trigger': {
    borderRadius: '3px',
    padding: '1px 2px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
  },
  '.node-type-trigger.valid': {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    color: 'rgb(34, 197, 94)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
  },
  '.node-type-trigger.invalid': {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: 'rgb(239, 68, 68)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
  },
  
  // Slash command trigger styles
  '.slash-command-trigger': {
    borderRadius: '3px',
    padding: '1px 2px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
  },
  '.slash-command-trigger.valid': {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    color: 'rgb(59, 130, 246)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
  },
  '.slash-command-trigger.exact-match': {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    color: 'rgb(34, 197, 94)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
  },
  '.slash-command-trigger.partial-match': {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    color: 'rgb(251, 191, 36)',
    border: '1px solid rgba(251, 191, 36, 0.3)',
  },
  '.slash-command-trigger.trigger-start': {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    color: 'rgb(168, 85, 247)',
    border: '1px solid rgba(168, 85, 247, 0.3)',
  },
  '.slash-command-trigger.invalid': {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: 'rgb(239, 68, 68)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
  },
  
  // Trigger hint styles
  '.trigger-hint': {
    fontSize: '12px',
    fontWeight: '400',
    fontStyle: 'italic',
    opacity: '0.8',
    marginLeft: '4px',
    padding: '1px 4px',
    borderRadius: '2px',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    transition: 'all 0.2s ease',
  },
  '.node-type-hint.valid': {
    color: 'rgb(34, 197, 94)',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  '.node-type-hint.invalid': {
    color: 'rgb(239, 68, 68)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  '.slash-hint.valid': {
    color: 'rgb(59, 130, 246)',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  '.slash-hint.invalid': {
    color: 'rgb(239, 68, 68)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  
  // Animation for decoration changes
  '.command-trigger': {
    animation: 'command-trigger-fade-in 0.3s ease-out',
  },
  '@keyframes command-trigger-fade-in': {
    from: {
      opacity: '0',
      transform: 'translateY(-2px)',
    },
    to: {
      opacity: '1',
      transform: 'translateY(0)',
    },
  },
  
  // Hover effects
  '.command-trigger:hover': {
    transform: 'translateY(-1px)',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  
  // Focus/selection effects
  '.cm-focused .command-trigger': {
    boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)',
  }
}, { dark: true });

/**
 * Create the command decorations extension
 */
export function createCommandDecorations(): Extension {
  return [
    commandDecorationsPlugin,
    commandDecorationTheme
  ];
}

/**
 * Manual decoration functions for external use
 */
export {
  updateDecorations as updateCommandDecorations,
  TriggerHintWidget
};

// Export the main decoration creation function
export default createCommandDecorations;