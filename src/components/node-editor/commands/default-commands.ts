/**
 * Default Commands Registry for Node Editor
 * Phase 1.3: Inline Node Type Switching - Command Registry Implementation
 * 
 * This file provides a comprehensive set of default commands that populate the command registry
 * for the mind mapping application's node editor. Commands are organized into categories:
 * - Node Type Commands ($) - Switch between different node types
 * - Pattern Commands (/) - Insert common patterns and formatting
 * - Template Commands (/) - Insert structured templates for common use cases
 */

import {
	Calendar,
	CheckSquare,
	Code,
	FileText,
	Flag,
	Image,
	Link,
	MessageCircle,
	Tag,
	User,
	Palette,
	Bold,
	Italic,
	LinkIcon,
	Users,
	Clock,
	Target,
	Lightbulb,
} from 'lucide-react';

// Command system types
export interface CommandContext {
	currentText: string;
	cursorPosition: number;
	selection?: {
		start: number;
		end: number;
		text: string;
	};
	triggerPosition: number;
	triggerText: string;
}

export interface CommandResult {
	text: string;
	cursorPosition: number;
	nodeType?: string;
	metadata?: Record<string, any>;
	clearTrigger?: boolean;
}

export type CommandAction = (context: CommandContext) => CommandResult;

export interface Command {
	trigger: string;
	label: string;
	description: string;
	icon: React.ComponentType<{ className?: string }>;
	category: 'node-type' | 'pattern' | 'template' | 'formatting';
	action: CommandAction;
	keywords?: string[];
	examples?: string[];
	insertText?: string;
	nodeType?: string; // Optional node type for node-type commands
}

// Command Registry Class
class CommandRegistry {
	private commands = new Map<string, Command>();
	private triggerMap = new Map<string, Command[]>();

	register(command: Command): void {
		this.commands.set(command.trigger, command);
		
		// Group by trigger prefix for efficient lookup
		const prefix = command.trigger.charAt(0);

		if (!this.triggerMap.has(prefix)) {
			this.triggerMap.set(prefix, []);
		}

		this.triggerMap.get(prefix)!.push(command);
	}

	getCommand(trigger: string): Command | undefined {
		return this.commands.get(trigger);
	}

	getCommandsByTrigger(triggerPrefix: string): Command[] {
		return this.triggerMap.get(triggerPrefix) || [];
	}

	getAllCommands(): Command[] {
		return Array.from(this.commands.values());
	}

	search(query: string): Command[] {
		const searchTerm = query.toLowerCase();
		return Array.from(this.commands.values()).filter(command => 
			command.label.toLowerCase().includes(searchTerm) ||
			command.description.toLowerCase().includes(searchTerm) ||
			command.keywords?.some(keyword => keyword.toLowerCase().includes(searchTerm)) ||
			command.trigger.toLowerCase().includes(searchTerm)
		);
	}

	clear(): void {
		this.commands.clear();
		this.triggerMap.clear();
	}
}

// Global command registry instance
const globalCommandRegistry = new CommandRegistry();

// Helper functions for text manipulation
const replaceTextRange = (text: string, start: number, end: number, replacement: string): string => {
	return text.slice(0, start) + replacement + text.slice(end);
};

const removeTriggerText = (text: string, triggerPosition: number, triggerLength: number): string => {
	return text.slice(0, triggerPosition) + text.slice(triggerPosition + triggerLength);
};

const getCurrentDate = (): string => {
	return new Date().toISOString().split('T')[0];
};

const getTomorrowDate = (): string => {
	const tomorrow = new Date();
	tomorrow.setDate(tomorrow.getDate() + 1);
	return tomorrow.toISOString().split('T')[0];
};

// Node Type Commands ($)
const nodeTypeCommands: Command[] = [
	{
		trigger: '$note',
		label: 'Note',
		description: 'Switch to note node with markdown support',
		icon: FileText,
		category: 'node-type',
		nodeType: 'defaultNode',
		keywords: ['note', 'text', 'markdown', 'basic'],
		examples: ['Meeting notes', 'Project ideas'],
		action: (context: CommandContext): CommandResult => {
			const cleanText = removeTriggerText(context.currentText, context.triggerPosition, context.triggerText.length).trim();
			return {
				text: cleanText,
				cursorPosition: context.triggerPosition,
				nodeType: 'defaultNode',
				clearTrigger: true,
			};
		},
	},
	{
		trigger: '$task',
		label: 'Task List',
		description: 'Switch to task node with checkboxes',
		icon: CheckSquare,
		category: 'node-type',
		nodeType: 'taskNode',
		keywords: ['task', 'todo', 'checklist', 'checkbox'],
		examples: ['- [ ] Review PR', '- [ ] Deploy to production'],
		action: (context: CommandContext): CommandResult => {
			const cleanText = removeTriggerText(context.currentText, context.triggerPosition, context.triggerText.length).trim();
			const taskText = cleanText || '- [ ] New task';
			return {
				text: taskText,
				cursorPosition: context.triggerPosition + taskText.length,
				nodeType: 'taskNode',
				clearTrigger: true,
			};
		},
	},
	{
		trigger: '$code',
		label: 'Code Block',
		description: 'Switch to code node with syntax highlighting',
		icon: Code,
		category: 'node-type',
		nodeType: 'codeNode',
		keywords: ['code', 'snippet', 'programming', 'syntax'],
		examples: ['```javascript', '```python'],
		action: (context: CommandContext): CommandResult => {
			const cleanText = removeTriggerText(context.currentText, context.triggerPosition, context.triggerText.length).trim();
			const codeText = cleanText || '```javascript\n// Your code here\n```';
			return {
				text: codeText,
				cursorPosition: context.triggerPosition + codeText.indexOf('// Your code here'),
				nodeType: 'codeNode',
				metadata: { language: 'javascript' },
				clearTrigger: true,
			};
		},
	},
	{
		trigger: '$question',
		label: 'Question',
		description: 'Switch to question node for brainstorming',
		icon: MessageCircle,
		category: 'node-type',
		nodeType: 'questionNode',
		keywords: ['question', 'q&a', 'brainstorm', 'inquiry'],
		examples: ['How can we improve performance?', 'What are the main risks?'],
		action: (context: CommandContext): CommandResult => {
			const cleanText = removeTriggerText(context.currentText, context.triggerPosition, context.triggerText.length).trim();
			const questionText = cleanText || 'Your question here?';
			return {
				text: questionText,
				cursorPosition: context.triggerPosition + questionText.length,
				nodeType: 'questionNode',
				clearTrigger: true,
			};
		},
	},
	{
		trigger: '$image',
		label: 'Image',
		description: 'Switch to image node for visual content',
		icon: Image,
		category: 'node-type',
		nodeType: 'imageNode',
		keywords: ['image', 'picture', 'visual', 'media'],
		examples: ['https://example.com/image.png', 'diagram.jpg "Architecture"'],
		action: (context: CommandContext): CommandResult => {
			const cleanText = removeTriggerText(context.currentText, context.triggerPosition, context.triggerText.length).trim();
			const imageText = cleanText || 'https://example.com/image.jpg';
			return {
				text: imageText,
				cursorPosition: context.triggerPosition + imageText.length,
				nodeType: 'imageNode',
				clearTrigger: true,
			};
		},
	},
	{
		trigger: '$resource',
		label: 'Resource Link',
		description: 'Switch to resource node for external links',
		icon: Link,
		category: 'node-type',
		nodeType: 'resourceNode',
		keywords: ['link', 'resource', 'url', 'reference'],
		examples: ['https://docs.example.com', 'API Documentation'],
		action: (context: CommandContext): CommandResult => {
			const cleanText = removeTriggerText(context.currentText, context.triggerPosition, context.triggerText.length).trim();
			const resourceText = cleanText || 'https://example.com';
			return {
				text: resourceText,
				cursorPosition: context.triggerPosition + resourceText.length,
				nodeType: 'resourceNode',
				clearTrigger: true,
			};
		},
	},
];

// Pattern Commands (/)
const patternCommands: Command[] = [
	{
		trigger: '/date',
		label: 'Insert Date',
		description: 'Insert date patterns (@today, @tomorrow)',
		icon: Calendar,
		category: 'pattern',
		keywords: ['date', 'time', 'schedule', 'calendar'],
		examples: ['@today', '@tomorrow', '@2024-01-15'],
		action: (context: CommandContext): CommandResult => {
			const dateText = `@today`;
			const newText = replaceTextRange(
				context.currentText,
				context.triggerPosition,
				context.triggerPosition + context.triggerText.length,
				dateText
			);
			return {
				text: newText,
				cursorPosition: context.triggerPosition + dateText.length,
				clearTrigger: true,
			};
		},
	},
	{
		trigger: '/priority',
		label: 'Priority Tag',
		description: 'Insert priority tags (#high, #medium, #low)',
		icon: Flag,
		category: 'pattern',
		keywords: ['priority', 'importance', 'urgent', 'level'],
		examples: ['#high', '#medium', '#low'],
		action: (context: CommandContext): CommandResult => {
			const priorityText = '#high';
			const newText = replaceTextRange(
				context.currentText,
				context.triggerPosition,
				context.triggerPosition + context.triggerText.length,
				priorityText
			);
			return {
				text: newText,
				cursorPosition: context.triggerPosition + priorityText.length,
				clearTrigger: true,
			};
		},
	},
	{
		trigger: '/checkbox',
		label: 'Checkbox',
		description: 'Insert checkbox pattern (- [ ])',
		icon: CheckSquare,
		category: 'pattern',
		keywords: ['checkbox', 'task', 'todo', 'check'],
		examples: ['- [ ] Task item', '- [x] Completed task'],
		action: (context: CommandContext): CommandResult => {
			const checkboxText = '- [ ] ';
			const newText = replaceTextRange(
				context.currentText,
				context.triggerPosition,
				context.triggerPosition + context.triggerText.length,
				checkboxText
			);
			return {
				text: newText,
				cursorPosition: context.triggerPosition + checkboxText.length,
				clearTrigger: true,
			};
		},
	},
	{
		trigger: '/tag',
		label: 'Tag',
		description: 'Insert tag patterns [tag1, tag2]',
		icon: Tag,
		category: 'pattern',
		keywords: ['tag', 'label', 'category', 'metadata'],
		examples: ['[important, urgent]', '[meeting, notes]'],
		action: (context: CommandContext): CommandResult => {
			const tagText = '[tag]';
			const newText = replaceTextRange(
				context.currentText,
				context.triggerPosition,
				context.triggerPosition + context.triggerText.length,
				tagText
			);
			return {
				text: newText,
				cursorPosition: context.triggerPosition + 1, // Position cursor inside brackets
				clearTrigger: true,
			};
		},
	},
	{
		trigger: '/assignee',
		label: 'Assignee',
		description: 'Insert assignee pattern (+username)',
		icon: User,
		category: 'pattern',
		keywords: ['assignee', 'user', 'assigned', 'responsible'],
		examples: ['+john.doe', '+team.lead'],
		action: (context: CommandContext): CommandResult => {
			const assigneeText = '+username';
			const newText = replaceTextRange(
				context.currentText,
				context.triggerPosition,
				context.triggerPosition + context.triggerText.length,
				assigneeText
			);
			return {
				text: newText,
				cursorPosition: context.triggerPosition + 1, // Position cursor after +
				clearTrigger: true,
			};
		},
	},
	{
		trigger: '/color',
		label: 'Color Code',
		description: 'Insert color patterns (color:red, #ff0000)',
		icon: Palette,
		category: 'pattern',
		keywords: ['color', 'highlight', 'background', 'style'],
		examples: ['color:red', '#ff0000', 'bg:blue-500'],
		action: (context: CommandContext): CommandResult => {
			const colorText = 'color:red';
			const newText = replaceTextRange(
				context.currentText,
				context.triggerPosition,
				context.triggerPosition + context.triggerText.length,
				colorText
			);
			return {
				text: newText,
				cursorPosition: context.triggerPosition + 6, // Position cursor after 'color:'
				clearTrigger: true,
			};
		},
	},
];

// Formatting Commands (/)
const formattingCommands: Command[] = [
	{
		trigger: '/bold',
		label: 'Bold Text',
		description: 'Make selected text bold (**text**)',
		icon: Bold,
		category: 'formatting',
		keywords: ['bold', 'strong', 'emphasis', 'format'],
		examples: ['**Important**', '**Warning**'],
		action: (context: CommandContext): CommandResult => {
			let newText: string;
			let newCursor: number;

			if (context.selection && context.selection.text) {
				// Wrap selection in bold markers
				const boldText = `**${context.selection.text}**`;
				newText = replaceTextRange(
					context.currentText,
					context.selection.start,
					context.selection.end,
					boldText
				);
				// Remove the trigger text
				const triggerEnd = context.triggerPosition + context.triggerText.length;

				if (triggerEnd <= context.selection.start) {
					newText = removeTriggerText(newText, context.triggerPosition, context.triggerText.length);
					newCursor = context.selection.start - context.triggerText.length + boldText.length;
				} else {
					newText = removeTriggerText(newText, context.triggerPosition, context.triggerText.length);
					newCursor = context.triggerPosition + boldText.length;
				}
			} else {
				// Insert bold template
				const boldTemplate = '**bold text**';
				newText = replaceTextRange(
					context.currentText,
					context.triggerPosition,
					context.triggerPosition + context.triggerText.length,
					boldTemplate
				);
				newCursor = context.triggerPosition + 2; // Position inside the asterisks
			}

			return {
				text: newText,
				cursorPosition: newCursor,
				clearTrigger: true,
			};
		},
	},
	{
		trigger: '/italic',
		label: 'Italic Text',
		description: 'Make selected text italic (*text*)',
		icon: Italic,
		category: 'formatting',
		keywords: ['italic', 'emphasis', 'style', 'format'],
		examples: ['*emphasis*', '*note*'],
		action: (context: CommandContext): CommandResult => {
			let newText: string;
			let newCursor: number;

			if (context.selection && context.selection.text) {
				// Wrap selection in italic markers
				const italicText = `*${context.selection.text}*`;
				newText = replaceTextRange(
					context.currentText,
					context.selection.start,
					context.selection.end,
					italicText
				);
				// Remove the trigger text
				const triggerEnd = context.triggerPosition + context.triggerText.length;

				if (triggerEnd <= context.selection.start) {
					newText = removeTriggerText(newText, context.triggerPosition, context.triggerText.length);
					newCursor = context.selection.start - context.triggerText.length + italicText.length;
				} else {
					newText = removeTriggerText(newText, context.triggerPosition, context.triggerText.length);
					newCursor = context.triggerPosition + italicText.length;
				}
			} else {
				// Insert italic template
				const italicTemplate = '*italic text*';
				newText = replaceTextRange(
					context.currentText,
					context.triggerPosition,
					context.triggerPosition + context.triggerText.length,
					italicTemplate
				);
				newCursor = context.triggerPosition + 1; // Position inside the asterisks
			}

			return {
				text: newText,
				cursorPosition: newCursor,
				clearTrigger: true,
			};
		},
	},
	{
		trigger: '/code',
		label: 'Inline Code',
		description: 'Make selected text inline code (`code`)',
		icon: Code,
		category: 'formatting',
		keywords: ['code', 'inline', 'monospace', 'format'],
		examples: ['`function()`', '`variable`'],
		action: (context: CommandContext): CommandResult => {
			let newText: string;
			let newCursor: number;

			if (context.selection && context.selection.text) {
				// Wrap selection in code markers
				const codeText = `\`${context.selection.text}\``;
				newText = replaceTextRange(
					context.currentText,
					context.selection.start,
					context.selection.end,
					codeText
				);
				// Remove the trigger text
				const triggerEnd = context.triggerPosition + context.triggerText.length;

				if (triggerEnd <= context.selection.start) {
					newText = removeTriggerText(newText, context.triggerPosition, context.triggerText.length);
					newCursor = context.selection.start - context.triggerText.length + codeText.length;
				} else {
					newText = removeTriggerText(newText, context.triggerPosition, context.triggerText.length);
					newCursor = context.triggerPosition + codeText.length;
				}
			} else {
				// Insert code template
				const codeTemplate = '`code`';
				newText = replaceTextRange(
					context.currentText,
					context.triggerPosition,
					context.triggerPosition + context.triggerText.length,
					codeTemplate
				);
				newCursor = context.triggerPosition + 1; // Position inside the backticks
			}

			return {
				text: newText,
				cursorPosition: newCursor,
				clearTrigger: true,
			};
		},
	},
	{
		trigger: '/link',
		label: 'Markdown Link',
		description: 'Create markdown link [text](url)',
		icon: LinkIcon,
		category: 'formatting',
		keywords: ['link', 'url', 'markdown', 'reference'],
		examples: ['[GitHub](https://github.com)', '[Docs](https://docs.example.com)'],
		action: (context: CommandContext): CommandResult => {
			let newText: string;
			let newCursor: number;

			if (context.selection && context.selection.text) {
				// Use selection as link text
				const linkTemplate = `[${context.selection.text}](url)`;
				newText = replaceTextRange(
					context.currentText,
					context.selection.start,
					context.selection.end,
					linkTemplate
				);
				// Remove the trigger text
				const triggerEnd = context.triggerPosition + context.triggerText.length;

				if (triggerEnd <= context.selection.start) {
					newText = removeTriggerText(newText, context.triggerPosition, context.triggerText.length);
					newCursor = context.selection.start - context.triggerText.length + linkTemplate.length - 4; // Position at 'url'
				} else {
					newText = removeTriggerText(newText, context.triggerPosition, context.triggerText.length);
					newCursor = context.triggerPosition + linkTemplate.length - 4; // Position at 'url'
				}
			} else {
				// Insert link template
				const linkTemplate = '[link text](url)';
				newText = replaceTextRange(
					context.currentText,
					context.triggerPosition,
					context.triggerPosition + context.triggerText.length,
					linkTemplate
				);
				newCursor = context.triggerPosition + 1; // Position at 'link text'
			}

			return {
				text: newText,
				cursorPosition: newCursor,
				clearTrigger: true,
			};
		},
	},
];

// Template Commands (/)
const templateCommands: Command[] = [
	{
		trigger: '/meeting',
		label: 'Meeting Notes',
		description: 'Insert meeting notes template',
		icon: Users,
		category: 'template',
		keywords: ['meeting', 'notes', 'agenda', 'minutes'],
		examples: ['Meeting with dev team', 'Weekly standup'],
		action: (context: CommandContext): CommandResult => {
			const template = `# Meeting Notes - ${getCurrentDate()}

**Attendees:** 
- [Name 1]
- [Name 2]

**Agenda:**
- [ ] Agenda item 1
- [ ] Agenda item 2

**Discussion:**
-

**Action Items:**
- [ ] Action 1 @[assignee] @[due date]
- [ ] Action 2 @[assignee] @[due date]

**Next Meeting:** @[date]`;

			const newText = replaceTextRange(
				context.currentText,
				context.triggerPosition,
				context.triggerPosition + context.triggerText.length,
				template
			);

			return {
				text: newText,
				cursorPosition: context.triggerPosition + template.indexOf('[Name 1]'),
				clearTrigger: true,
			};
		},
	},
	{
		trigger: '/standup',
		label: 'Daily Standup',
		description: 'Insert daily standup template',
		icon: Clock,
		category: 'template',
		keywords: ['standup', 'daily', 'scrum', 'update'],
		examples: ['Daily standup update', 'Team check-in'],
		action: (context: CommandContext): CommandResult => {
			const template = `# Daily Standup - ${getCurrentDate()}

**Yesterday:**
- Completed: 
- Blockers: 

**Today:**
- Plan to work on: 
- Expected completion: 

**Blockers & Help Needed:**
- 

**Notes:**
- `;

			const newText = replaceTextRange(
				context.currentText,
				context.triggerPosition,
				context.triggerPosition + context.triggerText.length,
				template
			);

			return {
				text: newText,
				cursorPosition: context.triggerPosition + template.indexOf('- Completed: ') + 13,
				clearTrigger: true,
			};
		},
	},
	{
		trigger: '/brainstorm',
		label: 'Brainstorming Session',
		description: 'Insert brainstorming template',
		icon: Lightbulb,
		category: 'template',
		keywords: ['brainstorm', 'ideas', 'creative', 'session'],
		examples: ['Feature brainstorming', 'Problem solving session'],
		action: (context: CommandContext): CommandResult => {
			const template = `# Brainstorming Session - ${getCurrentDate()}

**Topic/Challenge:** 
[Describe the problem or opportunity]

**Goals:**
- [ ] Goal 1
- [ ] Goal 2

**Ideas & Solutions:**

## Initial Ideas
- 💡 Idea 1: [description]
- 💡 Idea 2: [description]
- 💡 Idea 3: [description]

## Promising Concepts
- ⭐ [Best idea with details]
- ⭐ [Second best with details]

## Action Items
- [ ] Research [specific area] @[assignee]
- [ ] Prototype [concept] @[assignee] @[due date]
- [ ] Follow-up meeting @${getTomorrowDate()}

**Resources & References:**
- `;

			const newText = replaceTextRange(
				context.currentText,
				context.triggerPosition,
				context.triggerPosition + context.triggerText.length,
				template
			);

			return {
				text: newText,
				cursorPosition: context.triggerPosition + template.indexOf('[Describe the problem or opportunity]'),
				clearTrigger: true,
			};
		},
	},
	{
		trigger: '/retrospective',
		label: 'Sprint Retrospective',
		description: 'Insert retrospective template',
		icon: Target,
		category: 'template',
		keywords: ['retrospective', 'retro', 'sprint', 'review'],
		examples: ['Sprint retrospective', 'Project review'],
		action: (context: CommandContext): CommandResult => {
			const template = `# Sprint Retrospective - ${getCurrentDate()}

**Sprint Summary:**
- Duration: [X weeks]
- Team: [team members]
- Goals: [main objectives]

## What Went Well ✅
- 
- 
- 

## What Didn't Go Well ❌
- 
- 
- 

## What We Learned 📚
- 
- 
- 

## Action Items for Next Sprint 🎯
- [ ] Action 1 @[assignee]
- [ ] Action 2 @[assignee]
- [ ] Action 3 @[assignee]

## Metrics & Data 📊
- Velocity: [points completed]
- Bugs found: [number]
- Customer feedback: [summary]

**Overall Rating:** [1-5] ⭐
**Key Takeaway:** [main insight from this sprint]`;

			const newText = replaceTextRange(
				context.currentText,
				context.triggerPosition,
				context.triggerPosition + context.triggerText.length,
				template
			);

			return {
				text: newText,
				cursorPosition: context.triggerPosition + template.indexOf('[X weeks]'),
				clearTrigger: true,
			};
		},
	},
];

// Function to register all default commands
export const registerDefaultCommands = (): void => {
	// Clear existing commands
	globalCommandRegistry.clear();

	// Register all command categories
	const allCommands = [
		...nodeTypeCommands,
		...patternCommands,
		...formattingCommands,
		...templateCommands,
	];

	allCommands.forEach(command => {
		globalCommandRegistry.register(command);
	});
};

// Helper function to execute a command
export const executeCommand = (trigger: string, context: CommandContext): CommandResult | null => {
	const command = globalCommandRegistry.getCommand(trigger);

	if (!command) {
		return null;
	}

	try {
		return command.action(context);
	} catch (error) {
		console.error(`Command execution error for ${trigger}:`, error);
		return null;
	}
};

// Helper function to get commands by category
export const getCommandsByCategory = (category: Command['category']): Command[] => {
	return globalCommandRegistry.getAllCommands().filter(cmd => cmd.category === category);
};

// Helper function to get commands by trigger prefix
export const getCommandsByTriggerPrefix = (prefix: string): Command[] => {
	return globalCommandRegistry.getCommandsByTrigger(prefix);
};

// Helper function to search commands
export const searchCommands = (query: string): Command[] => {
	return globalCommandRegistry.search(query);
};

// Export the registry instance and types
export const commandRegistry = globalCommandRegistry;

// Auto-register default commands when module loads
registerDefaultCommands();