/**
 * Command Executor - Handles command execution and processing
 */

import type { AvailableNodeTypes } from '../../../../types/available-node-types';
import { commandRegistry } from './command-registry';
import type {
	Command,
	CommandContext,
	CommandResult,
	CommandTriggerResult,
	NodeTypeSwitchResult,
} from './command-types';

/**
 * Execute a command by ID
 */
export async function executeCommand(
	commandId: string,
	context: CommandContext
): Promise<CommandResult> {
	const command = commandRegistry.get(commandId);

	if (!command) {
		return {
			success: false,
			message: `Command '${commandId}' not found`,
		};
	}

	if (!command.action) {
		return {
			success: false,
			message: `Command '${commandId}' has no action defined`,
		};
	}

	try {
		const result = await command.action(context);
		return result;
	} catch (error) {
		console.error(`Error executing command '${commandId}':`, error);
		return {
			success: false,
			message: `Failed to execute command: ${error instanceof Error ? error.message : 'Unknown error'}`,
		};
	}
}

/**
 * Detect command triggers in text
 */
export function detectCommandTrigger(text: string): CommandTriggerResult {
	// Check for node type trigger ($nodeType)
	const nodeTypeMatch = text.match(/\$(\w+)/);
	if (nodeTypeMatch) {
		const trigger = `$${nodeTypeMatch[1]}`;
		const matches = commandRegistry.findMatching(text);

		return {
			hasTrigger: true,
			triggerType: 'node-type',
			triggerChar: '$',
			command: nodeTypeMatch[1],
			triggerPosition: nodeTypeMatch.index || 0,
			fullTrigger: trigger,
			matches,
		};
	}

	// Check for slash command (/command)
	const slashMatch = text.match(/\/(\w+)/);
	if (slashMatch) {
		const trigger = `/${slashMatch[1]}`;
		const matches = commandRegistry.findMatching(text);

		return {
			hasTrigger: true,
			triggerType: 'slash',
			triggerChar: '/',
			command: slashMatch[1],
			triggerPosition: slashMatch.index || 0,
			fullTrigger: trigger,
			matches,
		};
	}

	return {
		hasTrigger: false,
		triggerType: null,
		triggerChar: null,
		command: null,
		triggerPosition: -1,
	};
}

/**
 * Process node type switch in text
 */
export function processNodeTypeSwitch(text: string): NodeTypeSwitchResult {
	const triggerResult = detectCommandTrigger(text);

	if (!triggerResult.hasTrigger || triggerResult.triggerType !== 'node-type') {
		return {
			hasSwitch: false,
			nodeType: null,
			processedText: text,
			originalText: text,
			cursorPosition: text.length,
		};
	}

	// Get the command to determine node type
	const command = triggerResult.matches?.[0];
	if (!command || !command.nodeType) {
		return {
			hasSwitch: false,
			nodeType: null,
			processedText: text,
			originalText: text,
			cursorPosition: text.length,
		};
	}

	// Remove the trigger from the text
	const triggerPattern = new RegExp(`\\${triggerResult.fullTrigger}\\s*`);
	const processedText = text.replace(triggerPattern, '').trim();

	return {
		hasSwitch: true,
		nodeType: command.nodeType,
		processedText,
		originalText: text,
		cursorPosition: processedText.length,
		trigger: triggerResult.fullTrigger,
		remainingContent: processedText,
	};
}

/**
 * Get completions for partial command input
 */
export function getCommandCompletions(
	input: string,
	limit: number = 10
): Command[] {
	// Detect what type of trigger we're dealing with
	const triggerResult = detectCommandTrigger(input);

	if (!triggerResult.hasTrigger) {
		// Check if user is starting to type a trigger
		if (input.endsWith('$')) {
			return commandRegistry.getByTriggerType('node-type').slice(0, limit);
		}
		if (input.endsWith('/')) {
			return commandRegistry.getByTriggerType('slash').slice(0, limit);
		}
		return [];
	}

	// Return matching commands
	return triggerResult.matches?.slice(0, limit) || [];
}

/**
 * Create a default action for node type switching
 */
export function createNodeTypeSwitchAction(
	nodeType: AvailableNodeTypes
): CommandResult {
	return {
		nodeType,
		success: true,
		closePanel: true,
		message: `Switched to ${nodeType}`,
	};
}

/**
 * Create a default action for pattern insertion
 */
export function createPatternInsertionAction(pattern: string): CommandResult {
	return {
		replacement: pattern,
		success: true,
		closePanel: true,
	};
}

/**
 * Apply a command to the current context
 */
export async function applyCommand(
	command: Command,
	context: CommandContext
): Promise<CommandResult> {
	if (!command.action) {
		// Use default actions based on command type
		if (command.triggerType === 'node-type' && command.nodeType) {
			return createNodeTypeSwitchAction(command.nodeType);
		}

		if (command.triggerType === 'slash') {
			return createPatternInsertionAction(command.trigger);
		}

		return {
			success: false,
			message: 'Command has no action defined',
		};
	}

	return executeCommand(command.id, context);
}
