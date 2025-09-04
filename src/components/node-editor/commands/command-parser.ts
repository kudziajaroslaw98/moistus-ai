import type { AvailableNodeTypes } from '../../../types/available-node-types';

/**
 * Interface for node type switch processing results
 */
export interface NodeTypeSwitchResult {
  /** Whether a node type switch was detected and processed */
  hasSwitch: boolean;
  /** The detected node type (null if no switch detected) */
  nodeType: AvailableNodeTypes | null;
  /** The processed text after removing node type trigger */
  processedText: string;
  /** Original text before processing */
  originalText: string;
  /** Position where cursor should be placed after processing */
  cursorPosition: number;
  /** The matched trigger pattern (e.g., "$task") */
  trigger?: string;
  /** Any remaining content after the trigger */
  remainingContent?: string;
}

/**
 * Interface for command trigger detection results
 */
export interface CommandTriggerResult {
  /** Whether a command trigger was detected */
  hasTrigger: boolean;
  /** The type of trigger detected */
  triggerType: 'node-type' | 'slash' | null;
  /** The trigger character ($, /) */
  triggerChar: string | null;
  /** The command word after the trigger */
  command: string | null;
  /** Position of the trigger in text */
  triggerPosition: number;
  /** Full trigger pattern (e.g., "$task", "/date") */
  fullTrigger?: string;
}

/**
 * Command Parser utility for processing inline node type switches and command triggers
 * 
 * Features:
 * - Detects $nodeType patterns for node type switching
 * - Processes node type switches and extracts remaining content
 * - Detects /command patterns for command palette triggers
 * - Provides cursor positioning after text processing
 * - Handles edge cases and malformed patterns
 */
export class CommandParser {
  /**
   * Node type mapping from trigger patterns to actual node types
   */
  private static readonly NODE_TYPE_MAPPING: Record<string, AvailableNodeTypes> = {
    '$note': 'defaultNode',
    '$text': 'textNode',
    '$task': 'taskNode',
    '$question': 'questionNode',
    '$code': 'codeNode',
    '$image': 'imageNode',
    '$link': 'resourceNode',
    '$resource': 'resourceNode',
    '$annotation': 'annotationNode',
    '$group': 'groupNode',
    '$reference': 'referenceNode'
  };

  /**
   * Process potential node type switch in text
   * 
   * @param text - The input text to process
   * @param currentPosition - Current cursor position
   * @returns Processing result with node type and cleaned text
   */
  static processNodeTypeSwitch(
    text: string, 
    currentPosition: number = 0
  ): NodeTypeSwitchResult {
    const result: NodeTypeSwitchResult = {
      hasSwitch: false,
      nodeType: null,
      processedText: text,
      originalText: text,
      cursorPosition: currentPosition,
    };

    if (!text || text.trim().length === 0) {
      return result;
    }

    // Look for $nodeType patterns at the start of the text or after whitespace
    const nodeTypeRegex = /^(\s*)?(\$\w+)(\s+(.*))?$/;
    const match = text.match(nodeTypeRegex);

    if (!match) {
      return result;
    }

    const [, leadingWhitespace = '', trigger, , remainingContent = ''] = match;
    const nodeType = this.NODE_TYPE_MAPPING[trigger];

    if (!nodeType) {
      // Unknown node type trigger - return unchanged
      return result;
    }

    // Process the switch
    result.hasSwitch = true;
    result.nodeType = nodeType;
    result.trigger = trigger;
    result.remainingContent = remainingContent;
    result.processedText = leadingWhitespace + remainingContent;
    result.cursorPosition = result.processedText.length;

    return result;
  }

  /**
   * Detect command triggers in text ($ or /)
   * 
   * @param text - The input text to analyze
   * @param currentPosition - Current cursor position
   * @returns Trigger detection result
   */
  static detectCommandTrigger(
    text: string, 
    currentPosition: number = 0
  ): CommandTriggerResult {
    const result: CommandTriggerResult = {
      hasTrigger: false,
      triggerType: null,
      triggerChar: null,
      command: null,
      triggerPosition: -1,
    };

    if (!text || currentPosition < 0) {
      return result;
    }

    // Check for triggers near cursor position
    const beforeCursor = text.substring(0, currentPosition);
    const afterCursor = text.substring(currentPosition);

    // Look for $ or / triggers
    const triggerRegex = /[\$\/](\w*)$/;
    const match = beforeCursor.match(triggerRegex);

    if (!match) {
      return result;
    }

    const fullMatch = match[0];
    const triggerChar = fullMatch[0];
    const command = match[1] || '';

    result.hasTrigger = true;
    result.triggerChar = triggerChar;
    result.command = command;
    result.triggerPosition = beforeCursor.length - fullMatch.length;
    result.fullTrigger = fullMatch;

    // Determine trigger type
    if (triggerChar === '$') {
      result.triggerType = 'node-type';
    } else if (triggerChar === '/') {
      result.triggerType = 'slash';
    }

    return result;
  }

  /**
   * Check if a node type switch should be processed automatically
   * 
   * @param text - Current text content
   * @param nodeType - Current node type
   * @returns Whether auto-processing should occur
   */
  static shouldAutoProcessSwitch(
    text: string, 
    currentNodeType?: AvailableNodeTypes
  ): boolean {
    const switchResult = this.processNodeTypeSwitch(text);
    
    // Only auto-process if:
    // 1. A valid switch was detected
    // 2. The detected node type is different from current
    // 3. There's either no remaining content or it's substantial enough
    return switchResult.hasSwitch && 
           switchResult.nodeType !== currentNodeType &&
           (switchResult.remainingContent!.length === 0 || 
            switchResult.remainingContent!.trim().length > 0);
  }

  /**
   * Get available node types for autocompletion
   * 
   * @param prefix - Current typing prefix (e.g., "ta" for "$task")
   * @returns Array of matching node type triggers
   */
  static getNodeTypeCompletions(prefix: string = ''): string[] {
    const triggers = Object.keys(this.NODE_TYPE_MAPPING);
    
    if (!prefix || prefix.length === 0) {
      return triggers;
    }

    const lowerPrefix = prefix.toLowerCase();
    return triggers.filter(trigger => 
      trigger.toLowerCase().includes(lowerPrefix)
    );
  }

  /**
   * Get the display name for a node type
   * 
   * @param nodeType - The node type
   * @returns Human-readable display name
   */
  static getNodeTypeDisplayName(nodeType: AvailableNodeTypes): string {
    const displayNames: Record<AvailableNodeTypes, string> = {
      'defaultNode': 'Note',
      'textNode': 'Text',
      'taskNode': 'Task List',
      'questionNode': 'Question',
      'codeNode': 'Code Block',
      'imageNode': 'Image',
      'resourceNode': 'Resource Link',
      'annotationNode': 'Annotation',
      'groupNode': 'Group',
      'referenceNode': 'Reference',
      'ghostNode': 'Ghost'
    };

    return displayNames[nodeType] || nodeType;
  }

  /**
   * Get the trigger pattern for a node type
   * 
   * @param nodeType - The node type
   * @returns The trigger pattern (e.g., "$task")
   */
  static getTriggerForNodeType(nodeType: AvailableNodeTypes): string | null {
    const reverseMapping = Object.entries(this.NODE_TYPE_MAPPING)
      .find(([, type]) => type === nodeType);
    
    return reverseMapping ? reverseMapping[0] : null;
  }

  /**
   * Validate a command trigger pattern
   * 
   * @param trigger - The trigger to validate (e.g., "$task", "/date")
   * @returns Whether the trigger is valid
   */
  static isValidTrigger(trigger: string): boolean {
    if (!trigger || trigger.length < 2) {
      return false;
    }

    const triggerChar = trigger[0];
    const command = trigger.substring(1);

    // Check for valid trigger characters
    if (triggerChar !== '$' && triggerChar !== '/') {
      return false;
    }

    // Check for valid command format (alphanumeric + underscore/hyphen)
    const commandRegex = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
    return commandRegex.test(command);
  }

  /**
   * Extract command context from current text and cursor position
   * 
   * @param text - Current text
   * @param cursorPosition - Current cursor position
   * @returns Command context for execution
   */
  static getCommandContext(text: string, cursorPosition: number) {
    return {
      currentText: text,
      cursorPosition,
      selection: null, // Selection not available in this context
      timestamp: Date.now()
    };
  }

  /**
   * Clean text after command processing
   * 
   * @param text - Text to clean
   * @param trigger - The trigger pattern to remove
   * @returns Cleaned text
   */
  static cleanTextAfterCommand(text: string, trigger: string): string {
    if (!text || !trigger) {
      return text;
    }

    // Remove the trigger from the beginning of text
    const triggerRegex = new RegExp(`^\\s*${trigger.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`);
    return text.replace(triggerRegex, '').trim();
  }
}

/**
 * Convenience function for processing node type switches
 */
export function processNodeTypeSwitch(
  text: string, 
  cursorPosition: number = 0, 
  currentNodeType?: AvailableNodeTypes
): NodeTypeSwitchResult {
  return CommandParser.processNodeTypeSwitch(text, cursorPosition);
}

/**
 * Convenience function for detecting command triggers
 */
export function detectCommandTrigger(
  text: string, 
  cursorPosition: number = 0
): CommandTriggerResult {
  return CommandParser.detectCommandTrigger(text, cursorPosition);
}

/**
 * Convenience function to check if auto-processing should occur
 */
export function shouldAutoProcessSwitch(
  text: string, 
  currentNodeType?: AvailableNodeTypes
): boolean {
  return CommandParser.shouldAutoProcessSwitch(text, currentNodeType);
}