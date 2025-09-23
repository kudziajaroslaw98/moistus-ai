/**
 * Command Types - Type definitions for the command system
 */

import type { LucideIcon } from 'lucide-react';
import type { AvailableNodeTypes } from '../../../../types/available-node-types';

/**
 * Command categories for grouping related commands
 */
export type CommandCategory =
	| 'content'
	| 'media'
	| 'interactive'
	| 'annotation'
	| 'pattern'
	| 'format'
	| 'template';

/**
 * Trigger types for command activation
 */
export type CommandTriggerType = 'node-type' | 'slash' | 'shortcut';

/**
 * Command execution context
 */
export interface CommandContext {
	text: string;
	cursorPosition: number;
	selection?: {
		from: number;
		to: number;
		text: string;
	};
	nodeType?: AvailableNodeTypes;
	metadata?: Record<string, any>;
}

/**
 * Result of command execution
 */
export interface CommandResult {
	replacement?: string;
	cursorPosition?: number;
	nodeType?: AvailableNodeTypes;
	nodeData?: Record<string, any>;
	success: boolean;
	message?: string;
	closePanel?: boolean;
}

/**
 * Command action function type
 */
export type CommandAction = (
	context: CommandContext
) => CommandResult | Promise<CommandResult>;

/**
 * Command definition
 */
export interface Command {
	id: string;
	trigger: string;
	label: string;
	description: string;
	icon: LucideIcon;
	category: CommandCategory;
	triggerType: CommandTriggerType;
	nodeType?: AvailableNodeTypes;
	action?: CommandAction;
	keywords?: string[];
	shortcuts?: string[];
	examples?: string[];
	priority?: number;
	isPro?: boolean;
	isEnabled?: boolean;
}

/**
 * Command search options
 */
export interface CommandSearchOptions {
	query?: string;
	category?: CommandCategory;
	triggerType?: CommandTriggerType;
	triggerPattern?: string;
	limit?: number;
	includePro?: boolean;
	includeDisabled?: boolean;
}

/**
 * Command validation result
 */
export interface CommandValidationResult {
	isValid: boolean;
	errors: string[];
	warnings?: string[];
}

/**
 * Command trigger detection result
 */
export interface CommandTriggerResult {
	hasTrigger: boolean;
	triggerType: CommandTriggerType | null;
	triggerChar: string | null;
	command: string | null;
	triggerPosition: number;
	fullTrigger?: string;
	matches?: Command[];
}

/**
 * Node type switch result
 */
export interface NodeTypeSwitchResult {
	hasSwitch: boolean;
	nodeType: AvailableNodeTypes | null;
	processedText: string;
	originalText: string;
	cursorPosition: number;
	trigger?: string;
	remainingContent?: string;
}

/**
 * Command registration options
 */
export interface CommandRegistrationOptions {
	replace?: boolean;
	validate?: boolean;
	silent?: boolean;
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
 * Registry event
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
 * Command registry statistics
 */
export interface RegistryStats {
	totalCommands: number;
	commandsByCategory: Record<CommandCategory, number>;
	commandsByTriggerType: Record<CommandTriggerType, number>;
}
