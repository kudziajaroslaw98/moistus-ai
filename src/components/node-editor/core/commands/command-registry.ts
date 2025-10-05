/**
 * Command Registry - Simplified command management system
 * Single source of truth for node type commands
 */

import type {
	Command,
	CommandCategory,
	CommandContext,
	CommandResult,
	CommandSearchOptions,
	CommandTrigger,
} from './command-types';
import { nodeTypeCommands } from './definitions/node-type-commands';

/**
 * Simplified Command Registry
 * Manages only node-type commands (no events, no custom commands, no stats)
 */
export class CommandRegistry {
	private static instance: CommandRegistry;
	private commands = new Map<string, Command>();

	private constructor() {
		this.initializeCommands();
	}

	/**
	 * Get singleton instance
	 */
	public static getInstance(): CommandRegistry {
		if (!CommandRegistry.instance) {
			CommandRegistry.instance = new CommandRegistry();
		}

		return CommandRegistry.instance;
	}

	/**
	 * Initialize registry with node type commands
	 */
	private initializeCommands(): void {
		nodeTypeCommands.forEach(command => {
			this.commands.set(command.id, command);
		});
	}

	/**
	 * Get a command by ID
	 */
	public getCommand(commandId: string): Command | undefined {
		return this.commands.get(commandId);
	}

	/**
	 * Get command by trigger
	 */
	public getCommandByTrigger(trigger: string): Command | undefined {
		return Array.from(this.commands.values()).find(
			cmd => cmd.trigger === trigger
		);
	}

	/**
	 * Search commands with various filters
	 */
	public searchCommands(options: CommandSearchOptions = {}): Command[] {
		const {
			query,
			category,
			triggerType,
			triggerPattern,
			limit,
			includeDisabled = false,
		} = options;

		let results = Array.from(this.commands.values());

		// Filter by enabled state
		if (!includeDisabled) {
			results = results.filter(cmd => cmd.isEnabled !== false);
		}

		// Filter by category
		if (category) {
			results = results.filter(cmd => cmd.category === category);
		}

		// Filter by trigger type
		if (triggerType) {
			results = results.filter(cmd => cmd.triggerType === triggerType);
		}

		// Filter by trigger pattern
		if (triggerPattern) {
			const pattern = triggerPattern.toLowerCase();
			results = results.filter(cmd =>
				cmd.trigger.toLowerCase().includes(pattern)
			);
		}

		// Search by query
		if (query) {
			const searchQuery = query.toLowerCase();
			results = results.filter(cmd => {
				// Check trigger, label, description
				if (
					cmd.trigger.toLowerCase().includes(searchQuery) ||
					cmd.label.toLowerCase().includes(searchQuery) ||
					cmd.description.toLowerCase().includes(searchQuery)
				) {
					return true;
				}

				// Check keywords
				return cmd.keywords?.some(keyword =>
					keyword.toLowerCase().includes(searchQuery)
				) || false;
			});
		}

		// Sort by priority
		results.sort((a, b) => {
			const priorityA = a.priority || 100;
			const priorityB = b.priority || 100;
			return priorityA - priorityB;
		});

		// Apply limit
		if (limit && limit > 0) {
			results = results.slice(0, limit);
		}

		return results;
	}

	/**
	 * Execute a command
	 */
	public async executeCommand(
		commandId: string,
		context: CommandContext
	): Promise<CommandResult> {
		const command = this.commands.get(commandId);

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
			return await command.action(context);
		} catch (error) {
			console.error(`Error executing command '${commandId}':`, error);
			return {
				success: false,
				message: error instanceof Error ? error.message : 'Command execution failed',
			};
		}
	}

	/**
	 * Get all commands
	 */
	public getAllCommands(): Command[] {
		return Array.from(this.commands.values());
	}

	/**
	 * Get commands by trigger type
	 */
	public getCommandsByTriggerType(triggerType: CommandTrigger): Command[] {
		return this.searchCommands({ triggerType });
	}

	/**
	 * Find matching commands for input text
	 */
	public findMatchingCommands(input: string): Command[] {
		const results: Command[] = [];

		// Check for node type triggers ($nodeType)
		if (input.includes('$')) {
			const nodeTypeMatch = input.match(/\$(\w+)/);

			if (nodeTypeMatch) {
				const pattern = `$${nodeTypeMatch[1]}`;
				results.push(...this.searchCommands({
					triggerType: 'node-type',
					triggerPattern: pattern,
				}));
			}
		}

		// Check for slash commands (/command)
		if (input.includes('/')) {
			const slashMatch = input.match(/\/(\w+)/);

			if (slashMatch) {
				const pattern = `/${slashMatch[1]}`;
				results.push(...this.searchCommands({
					triggerType: 'slash',
					triggerPattern: pattern,
				}));
			}
		}

		return results;
	}
}

// Export singleton instance
export const commandRegistry = CommandRegistry.getInstance();
