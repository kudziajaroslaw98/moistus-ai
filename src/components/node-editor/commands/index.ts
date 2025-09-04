/**
 * Node Editor Commands Module
 * Entry point for the command system used in inline node type switching
 */

// Export the enhanced command registry as main export
export { CommandRegistry, commandRegistry } from './command-registry';

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
	Command,
	CommandCategory,
	CommandTrigger,
	CommandContext,
	CommandResult,
	CommandSearchOptions,
	RegistryStats,
} from './types';