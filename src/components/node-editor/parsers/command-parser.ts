/**
 * Command Parser for Node Type Detection and Slash Command Processing
 *
 * This parser detects and processes:
 * - $nodeType patterns for node type switching
 * - /command patterns for slash command execution
 * - Integrates with the command registry and existing parsers
 */

import type { AvailableNodeTypes } from '../../../types/available-node-types';
import { commandRegistry } from '../commands/command-registry';
import type { Command } from '../commands/types';

/**
 * Information about a detected node type trigger ($nodeType)
 */
export interface NodeTypeTrigger {
	/** The full trigger text (e.g., '$task') */
	trigger: string;
	/** Detected node type */
	nodeType: AvailableNodeTypes;
	/** Start position in text */
	start: number;
	/** End position in text */
	end: number;
	/** Remaining text after the trigger */
	remainingText: string;
	/** Whether this is a valid node type */
	isValid: boolean;
	/** Any validation error messages */
	error?: string;
}

/**
 * Information about a detected slash command (/command)
 */
export interface CommandTrigger {
	/** The full trigger text (e.g., '/date') */
	trigger: string;
	/** Detected command (without /) */
	command: string;
	/** Start position in text */
	start: number;
	/** End position in text */
	end: number;
	/** Matching commands from registry */
	matches: Command[];
	/** Whether this is at start of line or after whitespace */
	isValidPosition: boolean;
	/** Partial match status for auto-completion */
	isPartial: boolean;
}

/**
 * Result from processing a node type switch
 */
export interface NodeTypeSwitchResult {
	/** Updated text with trigger removed */
	text: string;
	/** Target node type */
	nodeType: AvailableNodeTypes;
	/** New cursor position */
	cursorPos: number;
	/** Whether the switch was successful */
	success: boolean;
	/** Any error messages */
	error?: string;
}

/**
 * Regular expressions for pattern matching
 */
const PATTERNS = {
	// Node type pattern: $ followed by word characters
	nodeType: /\$(\w+)/g,

	// Slash command pattern: / at start of line or after whitespace, followed by word characters
	slashCommand: /(?:^|\s)(\/\w*)/g,

	// Capture word boundaries for precise matching
	wordBoundary: /\b/g,
} as const;

/**
 * Detect node type switches in text
 *
 * @param text - Text to search for node type triggers
 * @param cursorPos - Current cursor position
 * @returns NodeTypeTrigger if found, null otherwise
 */
export function detectNodeTypeSwitch(
	text: string,
	cursorPos: number
): NodeTypeTrigger | null {
	if (!text || typeof text !== 'string' || cursorPos < 0) {
		return null;
	}

	// Reset regex state
	PATTERNS.nodeType.lastIndex = 0;

	let match: RegExpExecArray | null;

	// Find all node type patterns
	while ((match = PATTERNS.nodeType.exec(text)) !== null) {
		const start = match.index;
		const end = start + match[0].length;
		const trigger = match[0]; // Full match (e.g., '$task')
		const nodeTypeInput = match[1]; // Captured group (e.g., 'task')

		// Check if cursor is at or near this trigger
		const isAtTrigger = cursorPos >= start && cursorPos <= end + 1;

		if (isAtTrigger) {
			// Get remaining text after the trigger
			const remainingText = text.slice(end).trim();

			// Try to map to a valid node type
			const nodeType = mapTriggerToNodeType(trigger);
			const isValid = nodeType !== null;

			// Check command registry for validation
			const registeredCommand = commandRegistry.getCommand(trigger);
			const hasRegisteredCommand = registeredCommand !== undefined;

			return {
				trigger,
				nodeType: nodeType || 'defaultNode',
				start,
				end,
				remainingText,
				isValid: isValid && hasRegisteredCommand,
				error: !isValid
					? `Unknown node type: ${nodeTypeInput}`
					: !hasRegisteredCommand
						? `No command registered for: ${trigger}`
						: undefined,
			};
		}

		// Prevent infinite loop
		if (PATTERNS.nodeType.lastIndex === match.index) {
			PATTERNS.nodeType.lastIndex++;
		}
	}

	return null;
}

/**
 * Detect slash commands in text
 *
 * @param text - Text to search for slash commands
 * @param cursorPos - Current cursor position
 * @returns CommandTrigger if found, null otherwise
 */
export function detectSlashCommand(
	text: string,
	cursorPos: number
): CommandTrigger | null {
	if (!text || typeof text !== 'string' || cursorPos < 0) {
		return null;
	}

	// Reset regex state
	PATTERNS.slashCommand.lastIndex = 0;

	let match: RegExpExecArray | null;

	// Find all slash command patterns
	while ((match = PATTERNS.slashCommand.exec(text)) !== null) {
		const fullMatch = match[0];
		const trigger = match[1]; // The /command part
		const start = match.index + fullMatch.indexOf(trigger);
		const end = start + trigger.length;

		// Check if cursor is at or near this command
		const isAtCommand = cursorPos >= start && cursorPos <= end + 1;

		if (isAtCommand) {
			const command = trigger.slice(1); // Remove leading /

			// Check if this is at a valid position (start of line or after whitespace)
			const beforeMatch = text.slice(0, start);
			const isValidPosition =
				beforeMatch.length === 0 || /\s$/.test(beforeMatch);

			// Find matching commands in registry
			const matches = findMatchingSlashCommands(trigger, command);
			const hasExactMatch = matches.some((cmd) => cmd.trigger === trigger);
			const isPartial = matches.length > 0 && !hasExactMatch;

			return {
				trigger,
				command,
				start,
				end,
				matches,
				isValidPosition,
				isPartial,
			};
		}

		// Prevent infinite loop
		if (PATTERNS.slashCommand.lastIndex === match.index) {
			PATTERNS.slashCommand.lastIndex++;
		}
	}

	return null;
}

/**
 * Process text for node type switches
 *
 * @param text - Original text
 * @param cursorPos - Current cursor position
 * @param currentNodeType - Current node type (for validation)
 * @returns Processed result with updated text, node type, and cursor position
 */
export function processNodeTypeSwitch(
	text: string,
	cursorPos: number,
	currentNodeType: string
): NodeTypeSwitchResult {
	const detected = detectNodeTypeSwitch(text, cursorPos);

	if (!detected) {
		return {
			text,
			nodeType: currentNodeType as AvailableNodeTypes,
			cursorPos,
			success: false,
			error: 'No node type switch detected',
		};
	}

	if (!detected.isValid) {
		return {
			text,
			nodeType: currentNodeType as AvailableNodeTypes,
			cursorPos,
			success: false,
			error: detected.error,
		};
	}

	// Remove the trigger from the text
	const beforeTrigger = text.slice(0, detected.start);
	const afterTrigger = text.slice(detected.end);
	// Clean up whitespace more carefully - avoid double spaces
	const combinedText = beforeTrigger + afterTrigger;
	const newText = combinedText.replace(/\s+/g, ' ').trim();

	// Calculate new cursor position
	let newCursorPos = detected.start;

	// If there's remaining text, position cursor at the start of it
	if (detected.remainingText) {
		newCursorPos = Math.min(newText.length, detected.start);
	}

	return {
		text: newText,
		nodeType: detected.nodeType,
		cursorPos: Math.max(0, newCursorPos),
		success: true,
	};
}

/**
 * Find matching slash commands from the registry
 */
function findMatchingSlashCommands(
	trigger: string,
	partialCommand: string
): Command[] {
	if (!partialCommand) {
		// Return all slash commands
		return commandRegistry.getCommandsByTriggerType('slash');
	}

	// Search for commands that match the partial input
	const searchResults = commandRegistry.searchCommands({
		triggerType: 'slash',
		query: partialCommand,
		limit: 10,
	});

	// Also check for exact trigger matches
	const exactMatches = commandRegistry.searchCommands({
		triggerType: 'slash',
		triggerPattern: trigger,
	});

	// Combine and deduplicate results
	const combined = [...exactMatches, ...searchResults];
	const unique = combined.filter(
		(cmd, index, arr) => arr.findIndex((c) => c.id === cmd.id) === index
	);

	return unique;
}

/**
 * Map a node type trigger to an actual node type
 */
function mapTriggerToNodeType(trigger: string): AvailableNodeTypes | null {
	const mapping: Record<string, AvailableNodeTypes> = {
		$note: 'defaultNode',
		$task: 'taskNode',
		$code: 'codeNode',
		$image: 'imageNode',
		$link: 'resourceNode',
		$resource: 'resourceNode',
		$question: 'questionNode',
		$annotation: 'annotationNode',
		$text: 'textNode',
		$reference: 'referenceNode',
		$default: 'defaultNode',
	};

	return mapping[trigger] || null;
}

/**
 * Validate if a string is a valid node type trigger
 */
export function isValidNodeTypeTrigger(trigger: string): boolean {
	return mapTriggerToNodeType(trigger) !== null;
}

/**
 * Get all valid node type triggers
 */
export function getValidNodeTypeTriggers(): string[] {
	return [
		'$note',
		'$task',
		'$code',
		'$image',
		'$link',
		'$resource',
		'$question',
		'$annotation',
		'$text',
		'$reference',
		'$default',
	];
}

/**
 * Validate if a string is a valid slash command trigger
 */
export function isValidSlashCommand(trigger: string): boolean {
	if (!trigger.startsWith('/')) {
		return false;
	}

	const command = commandRegistry.getCommand(trigger);
	return command !== undefined && command.triggerType === 'slash';
}

/**
 * Get all valid slash command triggers
 */
export function getValidSlashCommands(): string[] {
	return commandRegistry
		.getCommandsByTriggerType('slash')
		.map((cmd) => cmd.trigger);
}

/**
 * Check if text contains any command triggers
 */
export function hasCommandTriggers(text: string): boolean {
	if (!text || typeof text !== 'string') {
		return false;
	}

	// Check for node type triggers
	PATTERNS.nodeType.lastIndex = 0;
	if (PATTERNS.nodeType.test(text)) {
		return true;
	}

	// Check for slash commands
	PATTERNS.slashCommand.lastIndex = 0;
	return PATTERNS.slashCommand.test(text);
}

/**
 * Extract all command triggers from text
 */
export function extractAllCommandTriggers(text: string): {
	nodeTypeTriggers: string[];
	slashCommands: string[];
} {
	const nodeTypeTriggers: string[] = [];
	const slashCommands: string[] = [];

	if (!text || typeof text !== 'string') {
		return { nodeTypeTriggers, slashCommands };
	}

	// Extract node type triggers
	PATTERNS.nodeType.lastIndex = 0;
	let match;
	while ((match = PATTERNS.nodeType.exec(text)) !== null) {
		nodeTypeTriggers.push(match[0]);
		if (PATTERNS.nodeType.lastIndex === match.index) {
			PATTERNS.nodeType.lastIndex++;
		}
	}

	// Extract slash commands
	PATTERNS.slashCommand.lastIndex = 0;
	while ((match = PATTERNS.slashCommand.exec(text)) !== null) {
		slashCommands.push(match[1]);
		if (PATTERNS.slashCommand.lastIndex === match.index) {
			PATTERNS.slashCommand.lastIndex++;
		}
	}

	return { nodeTypeTriggers, slashCommands };
}

/**
 * Utility function for debugging - get detailed parse information
 */
export function debugParseText(
	text: string,
	cursorPos: number
): {
	text: string;
	cursorPos: number;
	nodeTypeSwitch: NodeTypeTrigger | null;
	slashCommand: CommandTrigger | null;
	hasAnyTriggers: boolean;
	allTriggers: { nodeTypeTriggers: string[]; slashCommands: string[] };
} {
	return {
		text,
		cursorPos,
		nodeTypeSwitch: detectNodeTypeSwitch(text, cursorPos),
		slashCommand: detectSlashCommand(text, cursorPos),
		hasAnyTriggers: hasCommandTriggers(text),
		allTriggers: extractAllCommandTriggers(text),
	};
}
