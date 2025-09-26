/**
 * Command Registry (Refactored) - Simplified command management system
 * Uses modular command definitions to eliminate duplication
 */

import type {
	Command,
	CommandCategory,
	CommandContext,
	CommandResult,
	CommandSearchOptions,
	CommandTrigger,
	CommandValidationResult,
	RegistryEvent,
	RegistryEventListener,
	RegistryEventType,
	RegistryStats,
} from './command-types';
import { nodeTypeCommands } from './definitions/node-type-commands';
import { patternCommands } from './definitions/pattern-commands';
import { allFormatCommands } from './definitions/format-commands';
import { templateCommands } from './definitions/template-commands';

/**
 * Simplified Command Registry using modular definitions
 * Single source of truth for command management
 */
export class CommandRegistry {
	private static instance: CommandRegistry;
	private commands = new Map<string, Command>();
	private eventListeners = new Map<RegistryEventType, RegistryEventListener[]>();
	private customCommands = new Map<string, Command>();

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
	 * Initialize registry with default commands
	 */
	private initializeCommands(): void {
		// Load all predefined commands from definitions
		const allCommands = [
			...nodeTypeCommands,
			...patternCommands,
			...allFormatCommands,
			...templateCommands,
		];

		allCommands.forEach(command => {
			this.commands.set(command.id, command);
		});
	}

	/**
	 * Register a custom command (in addition to defaults)
	 */
	public registerCustomCommand(
		command: Command,
		options: { replace?: boolean } = {}
	): boolean {
		const validation = this.validateCommand(command);
		if (!validation.isValid) {
			console.error('Command validation failed:', validation.errors);
			return false;
		}

		const commandId = command.id;

		// Check if it would override a default command
		if (this.commands.has(commandId) && !options.replace) {
			console.warn(`Command '${commandId}' already exists. Use replace option to override.`);
			return false;
		}

		// Store in custom commands map
		this.customCommands.set(commandId, command);

		// Add to main registry
		this.commands.set(commandId, command);

		this.emitEvent('command-registered', commandId, command);
		return true;
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
			const result = await command.action(context);
			this.emitEvent('command-executed', commandId, command);
			return result;
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
	 * Get custom commands only
	 */
	public getCustomCommands(): Command[] {
		return Array.from(this.customCommands.values());
	}

	/**
	 * Get commands by category
	 */
	public getCommandsByCategory(category: CommandCategory): Command[] {
		return this.searchCommands({ category });
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

	/**
	 * Get registry statistics
	 */
	public getStats(): RegistryStats {
		const commands = this.getAllCommands();

		const commandsByCategory: Record<CommandCategory, number> = {
			'node-type': 0,
			'pattern': 0,
			'format': 0,
			'template': 0,
			'content': 0,
			'media': 0,
			'interactive': 0,
			'annotation': 0,
		};

		const commandsByTriggerType: Record<CommandTrigger, number> = {
			'node-type': 0,
			'slash': 0,
			'shortcut': 0,
		};

		commands.forEach(cmd => {
			commandsByCategory[cmd.category]++;
			commandsByTriggerType[cmd.triggerType]++;
		});

		return {
			totalCommands: commands.length,
			commandsByCategory,
			commandsByTriggerType,
		};
	}

	/**
	 * Add event listener
	 */
	public addEventListener(
		eventType: RegistryEventType,
		listener: RegistryEventListener
	): void {
		if (!this.eventListeners.has(eventType)) {
			this.eventListeners.set(eventType, []);
		}
		this.eventListeners.get(eventType)!.push(listener);
	}

	/**
	 * Remove event listener
	 */
	public removeEventListener(
		eventType: RegistryEventType,
		listener: RegistryEventListener
	): void {
		const listeners = this.eventListeners.get(eventType);
		if (listeners) {
			const index = listeners.indexOf(listener);
			if (index > -1) {
				listeners.splice(index, 1);
			}
		}
	}

	/**
	 * Validate command structure
	 */
	private validateCommand(command: Command): CommandValidationResult {
		const errors: string[] = [];

		if (!command.id || command.id.trim().length === 0) {
			errors.push('Command ID is required');
		}

		if (!command.trigger || command.trigger.trim().length === 0) {
			errors.push('Command trigger is required');
		}

		if (!command.label || command.label.trim().length === 0) {
			errors.push('Command label is required');
		}

		if (!command.category) {
			errors.push('Command category is required');
		}

		if (!command.triggerType) {
			errors.push('Command trigger type is required');
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Emit event to listeners
	 */
	private emitEvent(
		type: RegistryEventType,
		commandId?: string,
		command?: Command
	): void {
		const event: RegistryEvent = {
			type,
			commandId,
			command,
			timestamp: Date.now(),
		};

		const listeners = this.eventListeners.get(type);
		if (listeners) {
			listeners.forEach(listener => {
				try {
					listener(event);
				} catch (error) {
					console.error('Error in registry event listener:', error);
				}
			});
		}
	}

	/**
	 * Reset registry to defaults
	 */
	public resetToDefaults(): void {
		this.commands.clear();
		this.customCommands.clear();
		this.initializeCommands();
		this.emitEvent('registry-cleared');
	}
}

// Export singleton instance
export const commandRegistry = CommandRegistry.getInstance();