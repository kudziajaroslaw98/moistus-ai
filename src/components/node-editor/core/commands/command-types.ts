/**
 * Command Types - Type definitions for the command system
 */

import type { LucideIcon } from 'lucide-react';
import type { AvailableNodeTypes } from '@/registry/node-registry';

/**
 * Command categories for grouping related commands
 */
export type CommandCategory =
	| 'content'
	| 'media'
	| 'interactive'
	| 'node-type'
	| 'annotation'
	| 'pattern'
	| 'format'
	| 'template';

/**
 * Trigger types for command activation
 */
export type CommandTriggerType = 'node-type' | 'slash' | 'shortcut';

/**
 * Alias for CommandTriggerType (used in registry methods)
 */
export type CommandTrigger = CommandTriggerType;

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
 * Field configuration for structured input
 */
export type FieldType =
	| 'text'
	| 'textarea'
	| 'select'
	| 'date'
	| 'array'
	| 'code'
	| 'url'
	| 'image'
	| 'checkbox'
	| 'task';

export interface FieldConfig {
	name: string;
	type: FieldType;
	label?: string;
	placeholder?: string;
	required?: boolean;
	options?: Array<{ value: string; label: string }>;
	itemType?: string;
	validation?: (value: any) => string | null;
}

/**
 * Parsing pattern for quick input
 */
export type PatternCategory =
	| 'metadata'
	| 'formatting'
	| 'content'
	| 'structure';

export interface ParsingPattern {
	pattern: string;
	description: string;
	examples: string[];
	category: PatternCategory;
	insertText?: string;
	icon?: LucideIcon;
}

/**
 * Quick parser function type
 */
export type QuickParser<T = any> = (input: string) => T;

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
	// UI-specific fields (optional)
	quickParse?: QuickParser;
	fields?: FieldConfig[];
	parsingPatterns?: ParsingPattern[];
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
