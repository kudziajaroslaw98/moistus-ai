import {
	AlignCenter,
	AlignLeft,
	AlignRight,
	Bold,
	Calendar,
	CheckSquare,
	Code,
	FileText,
	Flag,
	Image,
	Italic,
	Lightbulb,
	Link,
	MessageCircle,
	Palette,
	Tag,
	Type,
	User,
} from 'lucide-react';

import type { AvailableNodeTypes } from '@/types/available-node-types';
import type {
	Command,
	CommandCategory,
	CommandContext,
	CommandRegistrationOptions,
	CommandResult,
	CommandSearchOptions,
	CommandTrigger,
	CommandValidationResult,
	RegistryEvent,
	RegistryEventListener,
	RegistryEventType,
	RegistryStats,
} from './command-types';

/**
 * Enhanced Command Registry for managing node type switching and command palette functionality
 *
 * Features:
 * - Singleton pattern for global access
 * - Command registration and management
 * - Search and filtering capabilities
 * - Event system for registry changes
 * - Built-in validation and error handling
 */
export class CommandRegistry {
	private static instance: CommandRegistry;
	private commands = new Map<string, Command>();
	private eventListeners = new Map<
		RegistryEventType,
		RegistryEventListener[]
	>();

	private constructor() {
		this.initializeDefaultCommands();
	}

	/**
	 * Get the singleton instance of the command registry
	 */
	public static getInstance(): CommandRegistry {
		if (!CommandRegistry.instance) {
			CommandRegistry.instance = new CommandRegistry();
		}

		return CommandRegistry.instance;
	}

	/**
	 * Register a new command in the registry
	 */
	public registerCommand(
		command: Command,
		options: CommandRegistrationOptions = {}
	): boolean {
		const { replace = false, validate = true } = options;

		if (validate) {
			const validation = this.validateCommand(command);

			if (!validation.isValid) {
				console.error('Command validation failed:', validation.errors);
				return false;
			}
		}

		if (!replace && this.commands.has(command.id)) {
			console.warn(
				`Command with ID '${command.id}' already exists. Use replace option to override.`
			);
			return false;
		}

		this.commands.set(command.id, command);
		this.emitEvent('command-registered', command.id, command);
		return true;
	}

	/**
	 * Unregister a command from the registry
	 */
	public unregisterCommand(commandId: string): boolean {
		const existed = this.commands.delete(commandId);

		if (existed) {
			this.emitEvent('command-unregistered', commandId);
		}

		return existed;
	}

	/**
	 * Get a command by ID
	 */
	public getCommand(commandId: string): Command | undefined {
		return this.commands.get(commandId);
	}

	/**
	 * Get all commands
	 */
	public getAllCommands(): Command[] {
		return Array.from(this.commands.values());
	}

	/**
	 * Search for commands based on various criteria
	 */
	public searchCommands(options: CommandSearchOptions = {}): Command[] {
		const {
			query,
			category,
			triggerType,
			triggerPattern,
			limit,
			includePro = true,
		} = options;

		let results = Array.from(this.commands.values());

		// Filter by category
		if (category) {
			results = results.filter((cmd) => cmd.category === category);
		}

		// Filter by trigger type
		if (triggerType) {
			results = results.filter((cmd) => cmd.triggerType === triggerType);
		}

		// Filter by trigger pattern
		if (triggerPattern) {
			const pattern = triggerPattern.toLowerCase();
			results = results.filter((cmd) =>
				cmd.trigger.toLowerCase().includes(pattern)
			);
		}

		// Filter by pro status
		if (!includePro) {
			results = results.filter((cmd) => !cmd.isPro);
		}

		// Search by query
		if (query) {
			const searchQuery = query.toLowerCase();
			results = results.filter((cmd) => {
				// Check trigger, label, description
				const matchesBasic =
					cmd.trigger.toLowerCase().includes(searchQuery) ||
					cmd.label.toLowerCase().includes(searchQuery) ||
					cmd.description.toLowerCase().includes(searchQuery);

				// Check keywords
				const matchesKeywords =
					cmd.keywords?.some((keyword) =>
						keyword.toLowerCase().includes(searchQuery)
					) || false;

				return matchesBasic || matchesKeywords;
			});
		}

		// Sort by priority (lower number = higher priority), then alphabetically
		results.sort((a, b) => {
			const priorityA = a.priority || 100;
			const priorityB = b.priority || 100;

			if (priorityA !== priorityB) {
				return priorityA - priorityB;
			}

			return a.label.localeCompare(b.label);
		});

		// Apply limit
		if (limit && limit > 0) {
			results = results.slice(0, limit);
		}

		return results;
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
	 * Find commands that match a trigger pattern
	 */
	public findMatchingCommands(input: string): Command[] {
		const results: Command[] = [];

		// Check for node type triggers ($nodeType)
		const nodeTypeMatch = input.match(/\$(\w+)/);

		if (nodeTypeMatch) {
			const nodeType = nodeTypeMatch[1];
			const nodeCommands = this.searchCommands({
				triggerType: 'node-type',
				triggerPattern: `$${nodeType}`,
			});
			results.push(...nodeCommands);
		}

		// Check for slash commands (/command)
		const slashMatch = input.match(/\/(\w+)/);

		if (slashMatch) {
			const command = slashMatch[1];
			const slashCommands = this.searchCommands({
				triggerType: 'slash',
				triggerPattern: `/${command}`,
			});
			results.push(...slashCommands);
		}

		return results;
	}

	/**
	 * Execute a command with given context
	 */
	public async executeCommand(
		commandId: string,
		context: CommandContext
	): Promise<CommandResult | null> {
		const command = this.commands.get(commandId);

		if (!command) {
			console.error(`Command '${commandId}' not found`);
			return null;
		}

		try {
			const result = await command.action(context);
			this.emitEvent('command-executed', commandId, command);
			return result;
		} catch (error) {
			console.error(`Error executing command '${commandId}':`, error);
			return {
				message: `Failed to execute command: ${error instanceof Error ? error.message : 'Unknown error'}`,
			};
		}
	}

	/**
	 * Clear all commands from the registry
	 */
	public clearRegistry(): void {
		this.commands.clear();
		this.emitEvent('registry-cleared');
	}

	/**
	 * Get registry statistics
	 */
	public getStats(): RegistryStats {
		const commands = this.getAllCommands();

		const commandsByCategory: Record<CommandCategory, number> = {
			'node-type': 0,
			pattern: 0,
			format: 0,
			template: 0,
		};

		const commandsByTriggerType: Record<CommandTrigger, number> = {
			'node-type': 0,
			slash: 0,
			shortcut: 0,
		};

		commands.forEach((cmd) => {
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
	 * Add event listener for registry events
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
	 * Validate a command before registration
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

		if (!command.action || typeof command.action !== 'function') {
			errors.push('Command action must be a function');
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
	 * Emit registry event to all listeners
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
			listeners.forEach((listener) => {
				try {
					listener(event);
				} catch (error) {
					console.error('Error in registry event listener:', error);
				}
			});
		}
	}

	/**
	 * Initialize default commands for the registry
	 */
	private initializeDefaultCommands(): void {
		// Node type commands ($nodeType)
		this.registerDefaultNodeTypeCommands();

		// Pattern insertion commands (/pattern)
		this.registerDefaultPatternCommands();

		// Formatting commands
		this.registerDefaultFormatCommands();

		// Template commands
		this.registerDefaultTemplateCommands();
	}

	/**
	 * Register default node type switching commands
	 */
	private registerDefaultNodeTypeCommands(): void {
		const nodeTypeCommands: Omit<Command, 'id' | 'action'>[] = [
			{
				trigger: '$note',
				label: 'Note',
				description: 'Switch to note node type',
				icon: FileText,
				category: 'node-type',
				triggerType: 'node-type',
				keywords: ['note', 'text', 'content'],
				examples: ['$note', '$note Simple note content'],
				priority: 1,
			},
			{
				trigger: '$task',
				label: 'Task List',
				description: 'Switch to task list node type',
				icon: CheckSquare,
				category: 'node-type',
				triggerType: 'node-type',
				keywords: ['task', 'todo', 'checklist'],
				examples: ['$task', '$task Buy milk; Send email @tomorrow'],
				priority: 2,
			},
			{
				trigger: '$code',
				label: 'Code Block',
				description: 'Switch to code block node type',
				icon: Code,
				category: 'node-type',
				triggerType: 'node-type',
				keywords: ['code', 'snippet', 'programming'],
				examples: ['$code', '$code javascript console.log("hello")'],
				priority: 3,
			},
			{
				trigger: '$image',
				label: 'Image',
				description: 'Switch to image node type',
				icon: Image,
				category: 'node-type',
				triggerType: 'node-type',
				keywords: ['image', 'picture', 'photo'],
				examples: ['$image', '$image https://example.com/image.jpg'],
				priority: 4,
			},
			{
				trigger: '$link',
				label: 'Resource Link',
				description: 'Switch to resource link node type',
				icon: Link,
				category: 'node-type',
				triggerType: 'node-type',
				keywords: ['link', 'url', 'resource'],
				examples: ['$link', '$link https://example.com "Documentation"'],
				priority: 5,
			},
			{
				trigger: '$question',
				label: 'Question',
				description: 'Switch to question node type',
				icon: MessageCircle,
				category: 'node-type',
				triggerType: 'node-type',
				keywords: ['question', 'q&a', 'inquiry'],
				examples: ['$question', '$question How can we improve performance?'],
				priority: 6,
			},
			{
				trigger: '$annotation',
				label: 'Annotation',
				description: 'Switch to annotation node type',
				icon: Lightbulb,
				category: 'node-type',
				triggerType: 'node-type',
				keywords: ['annotation', 'comment', 'note'],
				examples: ['$annotation', '$annotation ⚠️ Important note'],
				priority: 7,
			},
			{
				trigger: '$text',
				label: 'Text',
				description: 'Switch to text node type',
				icon: Type,
				category: 'node-type',
				triggerType: 'node-type',
				keywords: ['text', 'typography', 'content'],
				examples: ['$text', '$text **Bold text** @24px'],
				priority: 8,
			},
			{
				trigger: '$reference',
				label: 'Reference',
				description: 'Switch to reference node type',
				icon: Link,
				category: 'node-type',
				triggerType: 'node-type',
				keywords: ['reference', 'link', 'cross-reference'],
				examples: ['$reference', '$reference target:node-123'],
				priority: 9,
			},
		];

		nodeTypeCommands.forEach((cmdData) => {
			const command: Command = {
				...cmdData,
				id: cmdData.trigger,
				action: this.createNodeTypeSwitchAction(
					this.getNodeTypeFromTrigger(cmdData.trigger)
				),
			};
			this.registerCommand(command, { replace: true });
		});
	}

	/**
	 * Register default pattern insertion commands
	 */
	private registerDefaultPatternCommands(): void {
		const patternCommands: Omit<Command, 'id' | 'action'>[] = [
			{
				trigger: '/date',
				label: 'Date',
				description: 'Insert current date',
				icon: Calendar,
				category: 'pattern',
				triggerType: 'slash',
				keywords: ['date', 'today', 'time'],
				examples: ['/date', '/date @tomorrow', '/date @2024-12-25'],
				priority: 10,
			},
			{
				trigger: '/priority',
				label: 'Priority',
				description: 'Insert priority marker',
				icon: Flag,
				category: 'pattern',
				triggerType: 'slash',
				keywords: ['priority', 'important', 'urgent'],
				examples: ['/priority', '#high', '#medium', '#low'],
				priority: 11,
			},
			{
				trigger: '/tag',
				label: 'Tag',
				description: 'Insert tag marker',
				icon: Tag,
				category: 'pattern',
				triggerType: 'slash',
				keywords: ['tag', 'label', 'category'],
				examples: ['/tag', '[meeting, important]', '#work'],
				priority: 12,
			},
			{
				trigger: '/assignee',
				label: 'Assignee',
				description: 'Insert assignee marker',
				icon: User,
				category: 'pattern',
				triggerType: 'slash',
				keywords: ['assignee', 'user', 'person'],
				examples: ['/assignee', '@john', '@team'],
				priority: 13,
			},
			{
				trigger: '/color',
				label: 'Color',
				description: 'Insert color marker',
				icon: Palette,
				category: 'pattern',
				triggerType: 'slash',
				keywords: ['color', 'highlight', 'style'],
				examples: ['/color', 'color:red', 'color:#ff0000'],
				priority: 14,
			},
		];

		patternCommands.forEach((cmdData) => {
			const command: Command = {
				...cmdData,
				id: cmdData.trigger,
				action: this.createPatternInsertionAction(cmdData.trigger),
			};
			this.registerCommand(command, { replace: true });
		});
	}

	/**
	 * Register default formatting commands
	 */
	private registerDefaultFormatCommands(): void {
		const formatCommands: Omit<Command, 'id' | 'action'>[] = [
			{
				trigger: 'bold',
				label: 'Bold',
				description: 'Make text bold',
				icon: Bold,
				category: 'format',
				triggerType: 'shortcut',
				shortcuts: ['Ctrl+B', 'Cmd+B'],
				keywords: ['bold', 'strong', 'emphasis'],
				examples: ['**text**', '__text__'],
				priority: 20,
			},
			{
				trigger: 'italic',
				label: 'Italic',
				description: 'Make text italic',
				icon: Italic,
				category: 'format',
				triggerType: 'shortcut',
				shortcuts: ['Ctrl+I', 'Cmd+I'],
				keywords: ['italic', 'emphasis', 'style'],
				examples: ['*text*', '_text_'],
				priority: 21,
			},
			{
				trigger: 'align-left',
				label: 'Align Left',
				description: 'Align text to the left',
				icon: AlignLeft,
				category: 'format',
				triggerType: 'shortcut',
				keywords: ['align', 'left', 'alignment'],
				examples: ['align:left'],
				priority: 22,
			},
			{
				trigger: 'align-center',
				label: 'Align Center',
				description: 'Center align text',
				icon: AlignCenter,
				category: 'format',
				triggerType: 'shortcut',
				keywords: ['align', 'center', 'alignment'],
				examples: ['align:center'],
				priority: 23,
			},
			{
				trigger: 'align-right',
				label: 'Align Right',
				description: 'Align text to the right',
				icon: AlignRight,
				category: 'format',
				triggerType: 'shortcut',
				keywords: ['align', 'right', 'alignment'],
				examples: ['align:right'],
				priority: 24,
			},
		];

		formatCommands.forEach((cmdData) => {
			const command: Command = {
				...cmdData,
				id: cmdData.trigger,
				action: this.createFormatAction(cmdData.trigger),
			};
			this.registerCommand(command, { replace: true });
		});
	}

	/**
	 * Register default template commands
	 */
	private registerDefaultTemplateCommands(): void {
		const templateCommands: Omit<Command, 'id' | 'action'>[] = [
			{
				trigger: '/meeting',
				label: 'Meeting Template',
				description: 'Insert meeting notes template',
				icon: Calendar,
				category: 'template',
				triggerType: 'slash',
				keywords: ['meeting', 'notes', 'template'],
				examples: ['/meeting'],
				priority: 30,
			},
			{
				trigger: '/checklist',
				label: 'Checklist Template',
				description: 'Insert checklist template',
				icon: CheckSquare,
				category: 'template',
				triggerType: 'slash',
				keywords: ['checklist', 'todo', 'template'],
				examples: ['/checklist'],
				priority: 31,
			},
		];

		templateCommands.forEach((cmdData) => {
			const command: Command = {
				...cmdData,
				id: cmdData.trigger,
				action: this.createTemplateAction(cmdData.trigger),
			};
			this.registerCommand(command, { replace: true });
		});
	}

	/**
	 * Create action for node type switching
	 */
	private createNodeTypeSwitchAction(
		nodeType: AvailableNodeTypes
	): (context: CommandContext) => CommandResult {
		return (context: CommandContext): CommandResult => {
			const triggerMatch = context.currentText.match(/\$\w+\s*(.*)/);
			const remainingText = triggerMatch ? triggerMatch[1].trim() : '';

			return {
				replacement: remainingText,
				nodeType: nodeType,
				cursorPosition: remainingText.length,
				closePanel: true,
				message: `Switched to ${nodeType}`,
			};
		};
	}

	/**
	 * Create action for pattern insertion
	 */
	private createPatternInsertionAction(
		trigger: string
	): (context: CommandContext) => CommandResult {
		return (context: CommandContext): CommandResult => {
			let insertText = '';

			switch (trigger) {
				case '/date':
					insertText = `@${new Date().toLocaleDateString()}`;
					break;
				case '/priority':
					insertText = '#medium';
					break;
				case '/tag':
					insertText = '[tag]';
					break;
				case '/assignee':
					insertText = '@user';
					break;
				case '/color':
					insertText = 'color:blue';
					break;
				default:
					insertText = trigger.replace('/', '');
			}

			const newText = context.currentText.replace(/\/\w+/, insertText);
			return {
				replacement: newText,
				cursorPosition: newText.length,
				closePanel: true,
			};
		};
	}

	/**
	 * Create action for formatting commands
	 */
	private createFormatAction(
		trigger: string
	): (context: CommandContext) => CommandResult {
		return (context: CommandContext): CommandResult => {
			const { currentText, selection } = context;
			let newText = currentText;
			let newCursorPosition = context.cursorPosition;

			if (selection) {
				const { from, to, text } = selection;
				let formattedText = text;

				switch (trigger) {
					case 'bold':
						formattedText = `**${text}**`;
						break;
					case 'italic':
						formattedText = `*${text}*`;
						break;
					case 'align-left':
						formattedText = `${text} align:left`;
						break;
					case 'align-center':
						formattedText = `${text} align:center`;
						break;
					case 'align-right':
						formattedText = `${text} align:right`;
						break;
				}

				newText =
					currentText.substring(0, from) +
					formattedText +
					currentText.substring(to);
				newCursorPosition = from + formattedText.length;
			}

			return {
				replacement: newText,
				cursorPosition: newCursorPosition,
				closePanel: true,
			};
		};
	}

	/**
	 * Create action for template insertion
	 */
	private createTemplateAction(
		trigger: string
	): (context: CommandContext) => CommandResult {
		return (context: CommandContext): CommandResult => {
			let template = '';

			switch (trigger) {
				case '/meeting':
					template = `# Meeting Notes
Date: @${new Date().toLocaleDateString()}
Attendees:
Agenda:
-
Notes:
-
Action Items:
- [ ] `;
					break;
				case '/checklist':
					template = `- [ ] Task 1
- [ ] Task 2
- [ ] Task 3`;
					break;
				default:
					template = 'Template content';
			}

			const newText = context.currentText.replace(/\/\w+/, template);
			return {
				replacement: newText,
				cursorPosition: newText.length,
				closePanel: true,
			};
		};
	}

	/**
	 * Map trigger to node type
	 */
	private getNodeTypeFromTrigger(trigger: string): AvailableNodeTypes {
		const mapping: Record<string, AvailableNodeTypes> = {
			$note: 'defaultNode',
			$task: 'taskNode',
			$code: 'codeNode',
			$image: 'imageNode',
			$link: 'resourceNode',
			$question: 'questionNode',
			$annotation: 'annotationNode',
			$text: 'textNode',
			$reference: 'referenceNode',
		};

		return mapping[trigger] || 'defaultNode';
	}
}

// Export singleton instance
export const commandRegistry = CommandRegistry.getInstance();
