import {
	CheckSquare,
	Code,
	FileText,
	Image,
	Lightbulb,
	Link,
	MessageCircle,
	Type,
} from 'lucide-react';
import {
	parseAnnotationInput,
	parseCodeInput,
	parseImageInput,
	parseNoteInput,
	parseQuestionInput,
	parseResourceInput,
	parseTaskInput,
	parseTextInput,
} from './parsers';
import type { NodeCommand } from './types';

export const nodeCommands: NodeCommand[] = [
	{
		command: '/note',
		label: 'Note',
		description: 'Create a basic note with markdown support',
		icon: FileText,
		nodeType: 'defaultNode',
		category: 'content',
		quickParse: parseNoteInput,
		examples: ['Meeting notes @important', 'Project update #in-progress'],
	},
	{
		command: '/task',
		label: 'Task List',
		description: 'Create a task list with checkboxes',
		icon: CheckSquare,
		nodeType: 'taskNode',
		category: 'interactive',
		quickParse: parseTaskInput,
		fields: [
			{
				name: 'tasks',
				type: 'array',
				itemType: 'task',
				label: 'Tasks',
				required: true,
			},
			{
				name: 'dueDate',
				type: 'date',
				label: 'Due Date',
			},
			{
				name: 'priority',
				type: 'select',
				label: 'Priority',
				options: [
					{ value: 'low', label: 'Low' },
					{ value: 'medium', label: 'Medium' },
					{ value: 'high', label: 'High' },
				],
			},
		],
		examples: [
			'Review PR @tomorrow #high',
			'Deploy to production @friday',
			'Review PR; Fix bugs; Deploy @monday #high',
			'Sprint tasks: Backend API, Frontend UI, Testing',
			'- [ ] Review PR\n- [ ] Fix bugs\n- [ ] Deploy',
			'Buy milk, Send email, Call client @today',
		],
	},
	{
		command: '/code',
		label: 'Code Block',
		description: 'Add a syntax-highlighted code snippet',
		icon: Code,
		nodeType: 'codeNode',
		category: 'content',
		quickParse: parseCodeInput,
		fields: [
			{
				name: 'language',
				type: 'select',
				label: 'Language',
				options: [
					{ value: 'javascript', label: 'JavaScript' },
					{ value: 'typescript', label: 'TypeScript' },
					{ value: 'python', label: 'Python' },
					{ value: 'java', label: 'Java' },
					{ value: 'csharp', label: 'C#' },
					{ value: 'cpp', label: 'C++' },
					{ value: 'go', label: 'Go' },
					{ value: 'rust', label: 'Rust' },
					{ value: 'sql', label: 'SQL' },
					{ value: 'html', label: 'HTML' },
					{ value: 'css', label: 'CSS' },
					{ value: 'json', label: 'JSON' },
					{ value: 'yaml', label: 'YAML' },
					{ value: 'markdown', label: 'Markdown' },
					{ value: 'bash', label: 'Bash' },
					{ value: 'plaintext', label: 'Plain Text' },
				],
			},
			{
				name: 'code',
				type: 'code',
				label: 'Code',
				required: true,
				placeholder: 'Enter your code here...',
			},
			{
				name: 'filename',
				type: 'text',
				label: 'Filename (optional)',
				placeholder: 'main.js',
			},
		],
		examples: ['```js const sum = (a, b) => a + b', 'python file:utils.py'],
	},
	{
		command: '/image',
		label: 'Image',
		description: 'Add an image from URL or upload',
		icon: Image,
		nodeType: 'imageNode',
		category: 'media',
		quickParse: parseImageInput,
		fields: [
			{
				name: 'url',
				type: 'url',
				label: 'Image URL',
				required: true,
				placeholder: 'https://example.com/image.jpg',
			},
			{
				name: 'alt',
				type: 'text',
				label: 'Alt Text',
				placeholder: 'Description of the image',
			},
			{
				name: 'caption',
				type: 'text',
				label: 'Caption',
				placeholder: 'Optional caption',
			},
		],
		examples: ['https://example.com/diagram.png "System Architecture"'],
	},
	{
		command: '/link',
		label: 'Resource Link',
		description: 'Add a web link or document reference',
		icon: Link,
		nodeType: 'resourceNode',
		category: 'media',
		quickParse: parseResourceInput,
		fields: [
			{
				name: 'url',
				type: 'url',
				label: 'URL',
				required: true,
				placeholder: 'https://example.com',
			},
			{
				name: 'title',
				type: 'text',
				label: 'Title',
				placeholder: 'Resource title',
			},
			{
				name: 'description',
				type: 'textarea',
				label: 'Description',
				placeholder: 'Brief description of the resource',
			},
		],
		examples: ['https://docs.example.com/api "API Documentation"'],
	},
	{
		command: '/question',
		label: 'Question',
		description: 'Create a question node for brainstorming',
		icon: MessageCircle,
		nodeType: 'questionNode',
		category: 'interactive',
		quickParse: parseQuestionInput,
		fields: [
			{
				name: 'question',
				type: 'textarea',
				label: 'Question',
				required: true,
				placeholder: 'What question do you want to explore?',
			},
			{
				name: 'type',
				type: 'select',
				label: 'Question Type',
				options: [
					{ value: 'open', label: 'Open-ended' },
					{ value: 'multiple-choice', label: 'Multiple Choice' },
					{ value: 'yes-no', label: 'Yes/No' },
				],
			},
		],
		examples: [
			'How can we improve user engagement?',
			'Should we migrate to TypeScript? [yes/no]',
		],
	},
	{
		command: '/annotation',
		label: 'Annotation',
		description: 'Add a colored annotation or callout',
		icon: Lightbulb,
		nodeType: 'annotationNode',
		category: 'annotation',
		quickParse: parseAnnotationInput,
		fields: [
			{
				name: 'text',
				type: 'textarea',
				label: 'Annotation Text',
				required: true,
				placeholder: 'Enter your annotation...',
			},
			{
				name: 'type',
				type: 'select',
				label: 'Type',
				options: [
					{ value: 'note', label: 'Note' },
					{ value: 'warning', label: 'Warning' },
					{ value: 'info', label: 'Info' },
					{ value: 'success', label: 'Success' },
					{ value: 'error', label: 'Error' },
				],
			},
		],
		examples: ['⚠️ Breaking change in v2.0', '✅ Deployment successful'],
	},
	{
		command: '/text',
		label: 'Text',
		description: 'Create a simple text node',
		icon: Type,
		nodeType: 'textNode',
		category: 'content',
		quickParse: parseTextInput,
		fields: [
			{
				name: 'content',
				type: 'textarea',
				label: 'Text Content',
				required: true,
				placeholder: 'Enter your text...',
			},
		],
		examples: ['Quick note', 'Important reminder'],
	},
];

// Helper function to get command by type
export const getCommandByType = (nodeType: string): NodeCommand | undefined => {
	return nodeCommands.find((cmd) => cmd.nodeType === nodeType);
};

// Helper function to get commands by category
export const getCommandsByCategory = (category: string): NodeCommand[] => {
	return nodeCommands.filter((cmd) => cmd.category === category);
};

// Categories for grouping
export const commandCategories = [
	{ id: 'content', label: 'Content', icon: FileText },
	{ id: 'media', label: 'Media', icon: Image },
	{ id: 'interactive', label: 'Interactive', icon: CheckSquare },
	{ id: 'annotation', label: 'Annotations', icon: Lightbulb },
];
