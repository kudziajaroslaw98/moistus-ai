/**
 * Command Executor - Simplified command execution and processing
 * Works with the refactored modular command system
 */

import type { AvailableNodeTypes } from '@/registry/node-registry';
import { commandRegistry } from './command-registry';
import type {
	Command,
	CommandCategory,
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
	return commandRegistry.executeCommand(commandId, context);
}

/**
 * Execute a command directly
 */
export async function executeCommandDirect(
	command: Command,
	context: CommandContext
): Promise<CommandResult> {
	if (!command.action) {
		return {
			success: false,
			message: `Command '${command.id}' has no action defined`,
		};
	}

	try {
		return await command.action(context);
	} catch (error) {
		console.error(`Error executing command '${command.id}':`, error);
		return {
			success: false,
			message: error instanceof Error ? error.message : 'Unknown error',
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
		const matches = commandRegistry.findMatchingCommands(text);

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
		const matches = commandRegistry.findMatchingCommands(text);

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
 * Get command completions for partial input
 */
export function getCommandCompletions(
	input: string,
	limit: number = 10
): Command[] {
	const triggerResult = detectCommandTrigger(input);

	if (!triggerResult.hasTrigger) {
		// Check if user is starting to type a trigger
		if (input.endsWith('$')) {
			return commandRegistry.getCommandsByTriggerType('node-type').slice(0, limit);
		}

		if (input.endsWith('/')) {
			return commandRegistry.getCommandsByTriggerType('slash').slice(0, limit);
		}

		return [];
	}

	// Return matching commands
	return triggerResult.matches?.slice(0, limit) || [];
}

/**
 * Apply a command to the current context
 */
export async function applyCommand(
	command: Command,
	context: CommandContext
): Promise<CommandResult> {
	return executeCommandDirect(command, context);
}

/**
 * Get suggested commands based on context
 */
export function getSuggestedCommands(
	context: CommandContext,
	limit: number = 5
): Command[] {
	const { text, nodeType } = context;

	// If text is empty, suggest node type commands
	if (!text || text.trim().length === 0) {
		return commandRegistry.getCommandsByTriggerType('node-type').slice(0, limit);
	}

	// If text starts with trigger, get completions
	if (text.startsWith('$') || text.startsWith('/')) {
		return getCommandCompletions(text, limit);
	}

	// Otherwise suggest relevant commands based on node type
	if (nodeType) {
		return commandRegistry.searchCommands({
			category: getNodeTypeCategory(nodeType),
			limit,
		});
	}

	return [];
}

/**
 * Helper to map node type to command category
 */
function getNodeTypeCategory(nodeType: AvailableNodeTypes): CommandCategory {
	const categoryMap: Record<string, CommandCategory> = {
		defaultNode: 'content',
		textNode: 'content',
		codeNode: 'content',
		taskNode: 'interactive',
		questionNode: 'interactive',
		imageNode: 'media',
		resourceNode: 'media',
		annotationNode: 'annotation',
		referenceNode: 'content',
	};

	return categoryMap[nodeType] || 'content';
}