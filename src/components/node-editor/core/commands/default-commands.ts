/**
 * Default Commands Registration
 * Registers all built-in commands for the node editor
 */

import {
	CheckSquare,
	Code,
	FileText,
	Hash,
	Image,
	Lightbulb,
	Link,
	MessageCircle,
	Type,
} from 'lucide-react';
import type { AvailableNodeTypes } from '../../../../types/available-node-types';
import { commandManager, type Command } from './command-manager';

/**
 * Node type commands mapping
 */
const NODE_TYPE_COMMANDS: Record<string, AvailableNodeTypes> = {
	$note: 'defaultNode',
	$text: 'textNode',
	$task: 'taskNode',
	$question: 'questionNode',
	$code: 'codeNode',
	$image: 'imageNode',
	$link: 'resourceNode',
	$resource: 'resourceNode',
	$annotation: 'annotationNode',
	$reference: 'referenceNode',
};

/**
 * Register default node type commands
 */
function registerNodeTypeCommands(): void {
	const commands: Command[] = [
		{
			id: 'node-type-note',
			trigger: '$note',
			label: 'Note',
			description: 'Create a basic note',
			icon: FileText,
			category: 'content',
			triggerType: 'node-type',
			nodeType: 'defaultNode',
			priority: 1,
			action: (context) => ({
				nodeType: 'defaultNode',
				success: true,
			}),
		},
		{
			id: 'node-type-task',
			trigger: '$task',
			label: 'Task List',
			description: 'Create a task list with checkboxes',
			icon: CheckSquare,
			category: 'interactive',
			triggerType: 'node-type',
			nodeType: 'taskNode',
			priority: 2,
			action: (context) => ({
				nodeType: 'taskNode',
				success: true,
			}),
		},
		{
			id: 'node-type-code',
			trigger: '$code',
			label: 'Code Block',
			description: 'Add a syntax-highlighted code snippet',
			icon: Code,
			category: 'content',
			triggerType: 'node-type',
			nodeType: 'codeNode',
			priority: 3,
			action: (context) => ({
				nodeType: 'codeNode',
				success: true,
			}),
		},
		{
			id: 'node-type-image',
			trigger: '$image',
			label: 'Image',
			description: 'Add an image from URL',
			icon: Image,
			category: 'media',
			triggerType: 'node-type',
			nodeType: 'imageNode',
			priority: 4,
			action: (context) => ({
				nodeType: 'imageNode',
				success: true,
			}),
		},
		{
			id: 'node-type-link',
			trigger: '$link',
			label: 'Resource Link',
			description: 'Add a web link or document reference',
			icon: Link,
			category: 'media',
			triggerType: 'node-type',
			nodeType: 'resourceNode',
			priority: 5,
			action: (context) => ({
				nodeType: 'resourceNode',
				success: true,
			}),
		},
		{
			id: 'node-type-question',
			trigger: '$question',
			label: 'Question',
			description: 'Create a question for brainstorming',
			icon: MessageCircle,
			category: 'interactive',
			triggerType: 'node-type',
			nodeType: 'questionNode',
			priority: 6,
			action: (context) => ({
				nodeType: 'questionNode',
				success: true,
			}),
		},
		{
			id: 'node-type-annotation',
			trigger: '$annotation',
			label: 'Annotation',
			description: 'Add a colored annotation',
			icon: Lightbulb,
			category: 'annotation',
			triggerType: 'node-type',
			nodeType: 'annotationNode',
			priority: 7,
			action: (context) => ({
				nodeType: 'annotationNode',
				success: true,
			}),
		},
		{
			id: 'node-type-text',
			trigger: '$text',
			label: 'Text',
			description: 'Create formatted text',
			icon: Type,
			category: 'content',
			triggerType: 'node-type',
			nodeType: 'textNode',
			priority: 8,
			action: (context) => ({
				nodeType: 'textNode',
				success: true,
			}),
		},
		{
			id: 'node-type-reference',
			trigger: '$reference',
			label: 'Reference',
			description: 'Reference another node or map',
			icon: Hash,
			category: 'content',
			triggerType: 'node-type',
			nodeType: 'referenceNode',
			priority: 9,
			action: (context) => ({
				nodeType: 'referenceNode',
				success: true,
			}),
		},
	];

	commands.forEach((cmd) => commandManager.register(cmd));
}

/**
 * Register slash commands
 */
function registerSlashCommands(): void {
	const commands: Command[] = [
		{
			id: 'slash-note',
			trigger: '/note',
			label: 'Note',
			description: 'Create a basic note',
			icon: FileText,
			category: 'content',
			triggerType: 'slash',
			nodeType: 'defaultNode',
			keywords: ['note', 'text', 'memo'],
			examples: ['Meeting notes', 'Quick reminder'],
		},
		{
			id: 'slash-task',
			trigger: '/task',
			label: 'Task List',
			description: 'Create a task list',
			icon: CheckSquare,
			category: 'interactive',
			triggerType: 'slash',
			nodeType: 'taskNode',
			keywords: ['task', 'todo', 'checklist'],
			examples: ['Review PR', 'Fix bugs', 'Deploy'],
		},
		{
			id: 'slash-code',
			trigger: '/code',
			label: 'Code Block',
			description: 'Add code with syntax highlighting',
			icon: Code,
			category: 'content',
			triggerType: 'slash',
			nodeType: 'codeNode',
			keywords: ['code', 'snippet', 'program'],
			examples: ['```js const x = 1', 'python file:main.py'],
		},
		{
			id: 'slash-image',
			trigger: '/image',
			label: 'Image',
			description: 'Add an image',
			icon: Image,
			category: 'media',
			triggerType: 'slash',
			nodeType: 'imageNode',
			keywords: ['image', 'picture', 'photo'],
			examples: ['https://example.com/image.png'],
		},
		{
			id: 'slash-link',
			trigger: '/link',
			label: 'Link',
			description: 'Add a resource link',
			icon: Link,
			category: 'media',
			triggerType: 'slash',
			nodeType: 'resourceNode',
			keywords: ['link', 'url', 'resource'],
			examples: ['https://docs.example.com'],
		},
	];

	commands.forEach((cmd) => commandManager.register(cmd));
}

/**
 * Register all default commands
 */
export function registerDefaultCommands(): void {
	// Clear existing commands
	commandManager.clear();

	// Register command sets
	registerNodeTypeCommands();
	registerSlashCommands();
}

/**
 * Get command for a node type
 */
export function getNodeTypeCommand(
	nodeType: AvailableNodeTypes
): Command | undefined {
	const trigger = Object.entries(NODE_TYPE_COMMANDS).find(
		([, type]) => type === nodeType
	)?.[0];

	if (!trigger) return undefined;

	return commandManager.getByTrigger(trigger);
}

/**
 * Get node type from trigger
 */
export function getNodeTypeFromTrigger(
	trigger: string
): AvailableNodeTypes | null {
	return NODE_TYPE_COMMANDS[trigger] || null;
}

// Auto-register commands on import
registerDefaultCommands();
