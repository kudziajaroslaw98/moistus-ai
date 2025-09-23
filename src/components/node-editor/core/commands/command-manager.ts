/**
 * Command Manager - Core command system for node editor
 * Manages command registration, execution, and discovery
 */

import type { LucideIcon } from 'lucide-react';
import type { AvailableNodeTypes } from '../../../../types/available-node-types';

export type CommandCategory =
	| 'content'
	| 'media'
	| 'interactive'
	| 'annotation';
export type TriggerType = 'node-type' | 'slash' | 'shortcut';

export interface Command {
	id: string;
	trigger: string;
	label: string;
	description: string;
	icon: LucideIcon;
	category: CommandCategory;
	triggerType: TriggerType;
	nodeType?: AvailableNodeTypes;
	action?: CommandAction;
	keywords?: string[];
	shortcuts?: string[];
	examples?: string[];
	priority?: number;
}

export interface CommandContext {
	text: string;
	cursorPosition: number;
	selection?: { from: number; to: number; text: string };
	nodeType?: AvailableNodeTypes;
	metadata?: Record<string, any>;
}

export interface CommandResult {
	replacement?: string;
	cursorPosition?: number;
	nodeType?: AvailableNodeTypes;
	nodeData?: Record<string, any>;
	success: boolean;
	message?: string;
}

export type CommandAction = (
	context: CommandContext
) => CommandResult | Promise<CommandResult>;

/**
 * Command Manager class - Singleton pattern
 */
export class CommandManager {
	private static instance: CommandManager;
	private commands: Map<string, Command> = new Map();

	private constructor() {}

	public static getInstance(): CommandManager {
		if (!CommandManager.instance) {
			CommandManager.instance = new CommandManager();
		}
		return CommandManager.instance;
	}

	/**
	 * Register a command
	 */
	public register(command: Command): void {
		if (!command.id || !command.trigger) {
			throw new Error('Command must have an id and trigger');
		}
		this.commands.set(command.id, command);
	}

	/**
	 * Unregister a command
	 */
	public unregister(commandId: string): void {
		this.commands.delete(commandId);
	}

	/**
	 * Get a command by id
	 */
	public get(commandId: string): Command | undefined {
		return this.commands.get(commandId);
	}

	/**
	 * Get command by trigger
	 */
	public getByTrigger(trigger: string): Command | undefined {
		return Array.from(this.commands.values()).find(
			(cmd) => cmd.trigger === trigger
		);
	}

	/**
	 * Search commands
	 */
	public search(options: {
		query?: string;
		category?: CommandCategory;
		triggerType?: TriggerType;
		limit?: number;
	}): Command[] {
		let results = Array.from(this.commands.values());

		// Filter by trigger type
		if (options.triggerType) {
			results = results.filter(
				(cmd) => cmd.triggerType === options.triggerType
			);
		}

		// Filter by category
		if (options.category) {
			results = results.filter((cmd) => cmd.category === options.category);
		}

		// Search by query
		if (options.query) {
			const query = options.query.toLowerCase();
			results = results.filter(
				(cmd) =>
					cmd.label.toLowerCase().includes(query) ||
					cmd.description.toLowerCase().includes(query) ||
					cmd.trigger.toLowerCase().includes(query) ||
					(cmd.keywords &&
						cmd.keywords.some((k) => k.toLowerCase().includes(query)))
			);
		}

		// Sort by priority and relevance
		results.sort((a, b) => {
			const priorityDiff = (a.priority || 0) - (b.priority || 0);
			if (priorityDiff !== 0) return priorityDiff;

			// Sort by relevance if query exists
			if (options.query) {
				const query = options.query.toLowerCase();
				const aExact = a.trigger.toLowerCase() === query ? -1 : 0;
				const bExact = b.trigger.toLowerCase() === query ? -1 : 0;
				return aExact - bExact;
			}

			return a.label.localeCompare(b.label);
		});

		// Limit results
		if (options.limit) {
			results = results.slice(0, options.limit);
		}

		return results;
	}

	/**
	 * Execute a command
	 */
	public async execute(
		commandId: string,
		context: CommandContext
	): Promise<CommandResult> {
		const command = this.commands.get(commandId);

		if (!command) {
			return {
				success: false,
				message: `Command not found: ${commandId}`,
			};
		}

		if (!command.action) {
			return {
				success: false,
				message: `Command has no action: ${commandId}`,
			};
		}

		try {
			const result = await command.action(context);
			return result;
		} catch (error) {
			console.error(`Error executing command ${commandId}:`, error);
			return {
				success: false,
				message:
					error instanceof Error ? error.message : 'Command execution failed',
			};
		}
	}

	/**
	 * Get all commands
	 */
	public getAll(): Command[] {
		return Array.from(this.commands.values());
	}

	/**
	 * Get commands by category
	 */
	public getByCategory(category: CommandCategory): Command[] {
		return this.search({ category });
	}

	/**
	 * Get commands by trigger type
	 */
	public getByTriggerType(triggerType: TriggerType): Command[] {
		return this.search({ triggerType });
	}

	/**
	 * Clear all commands
	 */
	public clear(): void {
		this.commands.clear();
	}

	/**
	 * Get statistics
	 */
	public getStats(): {
		total: number;
		byCategory: Record<CommandCategory, number>;
		byTriggerType: Record<TriggerType, number>;
	} {
		const stats = {
			total: this.commands.size,
			byCategory: {} as Record<CommandCategory, number>,
			byTriggerType: {} as Record<TriggerType, number>,
		};

		for (const cmd of this.commands.values()) {
			stats.byCategory[cmd.category] =
				(stats.byCategory[cmd.category] || 0) + 1;
			stats.byTriggerType[cmd.triggerType] =
				(stats.byTriggerType[cmd.triggerType] || 0) + 1;
		}

		return stats;
	}
}

// Export singleton instance
export const commandManager = CommandManager.getInstance();
