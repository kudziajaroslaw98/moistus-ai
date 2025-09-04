import type { EditorView } from '@codemirror/view';
import type { LucideIcon } from 'lucide-react';
import type { AvailableNodeTypes } from '../../../types/available-node-types';

/**
 * Command categories for organizing commands in the registry
 */
export type CommandCategory = 
  | 'node-type'    // Node type switching commands ($nodeType)
  | 'pattern'      // Pattern insertion commands (/pattern)
  | 'format'       // Text formatting commands
  | 'template';    // Content template commands

/**
 * Command trigger types for different activation patterns
 */
export type CommandTrigger = 
  | 'node-type'    // $nodeType triggers
  | 'slash'        // /command triggers
  | 'shortcut';    // Keyboard shortcut triggers

/**
 * Context provided to command actions
 */
export interface CommandContext {
  /** Current text in the editor */
  currentText: string;
  /** Current cursor position */
  cursorPosition: number;
  /** Selected text range (if any) */
  selection?: { from: number; to: number; text: string };
  /** Current node type */
  nodeType?: AvailableNodeTypes;
  /** CodeMirror editor view instance */
  editorView?: EditorView;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Result returned by command actions
 */
export interface CommandResult {
  /** Text to replace current text/selection with */
  replacement?: string;
  /** New cursor position after replacement */
  cursorPosition?: number;
  /** New node type to switch to */
  nodeType?: AvailableNodeTypes;
  /** Additional data to set on the node */
  nodeData?: Record<string, any>;
  /** Whether to close the command palette */
  closePanel?: boolean;
  /** Success/error message */
  message?: string;
}

/**
 * Command action function signature
 */
export type CommandAction = (context: CommandContext) => CommandResult | Promise<CommandResult>;

/**
 * Enhanced command interface for the registry system
 */
export interface Command {
  /** Unique command identifier */
  id: string;
  /** Command trigger pattern (e.g., '$task', '/date', 'bold') */
  trigger: string;
  /** Display label for the command */
  label: string;
  /** Detailed description */
  description: string;
  /** Icon for visual representation */
  icon: LucideIcon;
  /** Command category for organization */
  category: CommandCategory;
  /** Trigger type for filtering */
  triggerType: CommandTrigger;
  /** Command action function */
  action: CommandAction;
  /** Keywords for search functionality */
  keywords?: string[];
  /** Keyboard shortcuts */
  shortcuts?: string[];
  /** Whether command requires pro subscription */
  isPro?: boolean;
  /** Example usage patterns */
  examples?: string[];
  /** Sort priority (lower = higher priority) */
  priority?: number;
}

/**
 * Command search options
 */
export interface CommandSearchOptions {
  /** Search query string */
  query?: string;
  /** Filter by category */
  category?: CommandCategory;
  /** Filter by trigger type */
  triggerType?: CommandTrigger;
  /** Filter by trigger pattern */
  triggerPattern?: string;
  /** Maximum number of results */
  limit?: number;
  /** Include pro commands in results */
  includePro?: boolean;
}

/**
 * Command registration options
 */
export interface CommandRegistrationOptions {
  /** Whether to replace existing command with same ID */
  replace?: boolean;
  /** Whether to validate command before registration */
  validate?: boolean;
}

/**
 * Registry event types
 */
export type RegistryEventType = 
  | 'command-registered'
  | 'command-unregistered'
  | 'command-executed'
  | 'registry-cleared';

/**
 * Registry event data
 */
export interface RegistryEvent {
  type: RegistryEventType;
  commandId?: string;
  command?: Command;
  timestamp: number;
}

/**
 * Registry event listener
 */
export type RegistryEventListener = (event: RegistryEvent) => void;

/**
 * Command validation result
 */
export interface CommandValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Registry statistics
 */
export interface RegistryStats {
  totalCommands: number;
  commandsByCategory: Record<CommandCategory, number>;
  commandsByTriggerType: Record<CommandTrigger, number>;
}