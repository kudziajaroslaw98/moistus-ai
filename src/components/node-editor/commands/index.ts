/**
 * Node Editor Commands Module
 * Entry point for the command system used in inline node type switching
 */

export {
	commandRegistry,
	registerDefaultCommands,
	executeCommand,
	getCommandsByCategory,
	getCommandsByTriggerPrefix,
	searchCommands,
} from './default-commands';

export type {
	Command,
	CommandContext,
	CommandResult,
	CommandAction,
} from './default-commands';

// Export the enhanced command registry
export { CommandRegistry, commandRegistry as registry } from './command-registry';

// Export command parser utilities
export {
	CommandParser,
	processNodeTypeSwitch,
	detectCommandTrigger,
	shouldAutoProcessSwitch,
} from './command-parser';

export type {
	NodeTypeSwitchResult,
	CommandTriggerResult,
} from './command-parser';

// Export enhanced types
export type {
	Command as EnhancedCommand,
	CommandCategory,
	CommandTrigger,
	CommandSearchOptions,
	CommandResult as EnhancedCommandResult,
	RegistryStats,
} from './types';