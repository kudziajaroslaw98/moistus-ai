/**
 * Node Commands - UI configurations for node creation
 * Bridges centralized command definitions with UI-specific requirements
 */

import {
	Calendar,
	CheckSquare,
	Code,
	FileText,
	Flag,
	Image,
	Lightbulb,
	Link,
	MessageCircle,
	Tag,
	Type,
} from 'lucide-react';
import { parseInput } from '../parsers/pattern-extractor';
import { nodeTypeCommands } from './definitions/node-type-commands';
import type { Command } from './command-types';

/**
 * Get base command by node type
 */
function getBaseCommand(nodeType: string): Command | undefined {
	return nodeTypeCommands.find(cmd => cmd.nodeType === nodeType);
}

/**
 * Node command UI configurations
 * Uses centralized definitions as base, adds UI-specific fields
 */
export const nodeCommands: Command[] = [
	// Note Node
	{
		...getBaseCommand('defaultNode')!,
		quickParse: parseInput,
		examples: ['Meeting notes #important', 'Project update #in-progress'],
		parsingPatterns: [
			{
				pattern: '$note',
				description: 'Switch to note node type',
				category: 'metadata',
				examples: ['$note Meeting notes #important', '$note Project update #in-progress'],
			},
			{
				pattern: '!priority',
				description: 'Set priority level',
				examples: ['!high', '!medium', '!low', '!', '!!', '!!!', '!1', '!2', '!3'],
				category: 'metadata',
				icon: Flag,
			},
			{
				pattern: '#tag',
				description: 'Add hashtag',
				examples: ['#meeting', '#important', '#urgent #bug'],
				category: 'metadata',
				icon: Tag,
			},
		],
	},

	// Task Node
	{
		...getBaseCommand('taskNode')!,
		quickParse: parseInput,
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
			'Review PR ^tomorrow #high',
			'Deploy to production ^friday',
			'Review PR; Fix bugs; Deploy ^monday #high',
			'Sprint tasks: Backend API, Frontend UI, Testing',
			'- [ ] Review PR\n- [ ] Fix bugs\n- [ ] Deploy',
			'Buy milk, Send email, Call client ^today',
		],
		parsingPatterns: [
			{
				pattern: '$task',
				description: 'Switch to task list node type',
				category: 'metadata',
				examples: ['$task Review PR; Fix bugs ^friday #high', '$task Buy milk, Send email'],
			},
			{
				pattern: '^date',
				description: 'Set due date',
				examples: ['^tomorrow', '^friday', '^2024-01-15'],
				category: 'metadata',
				icon: Calendar,
			},
			{
				pattern: '!priority',
				description: 'Set priority level',
				examples: ['!high', '!medium', '!low'],
				category: 'metadata',
				icon: Flag,
			},
			{
				pattern: '; or ,',
				description: 'Separate multiple tasks',
				examples: ['Task 1; Task 2', 'Buy milk, Send email'],
				category: 'formatting',
			},
			{
				pattern: '- [ ]',
				description: 'Markdown task list',
				examples: ['- [ ] Review PR\n- [ ] Fix bugs\n- [ ] Deploy'],
				category: 'formatting',
				insertText: '- [ ] ',
			},
			{
				pattern: 'Title:',
				description: 'List with title',
				examples: ['Sprint tasks: Backend, Frontend, Testing'],
				category: 'formatting',
			},
		],
	},

	// Code Node
	{
		...getBaseCommand('codeNode')!,
		quickParse: parseInput,
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
		parsingPatterns: [
			{
				pattern: '$code',
				description: 'Switch to code block node type',
				category: 'metadata',
				examples: ['$code ```js const sum = (a, b) => a + b', '$code python file:utils.py'],
			},
			{
				pattern: '```language',
				description: 'Code block with syntax highlighting',
				examples: ['```javascript', '```python', '```sql'],
				category: 'formatting',
				insertText: '```',
			},
			{
				pattern: 'file:filename',
				description: 'Specify filename',
				examples: ['javascript file:utils.js', 'python file:main.py'],
				category: 'metadata',
			},
		],
	},

	// Image Node
	{
		...getBaseCommand('imageNode')!,
		quickParse: parseInput,
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
		parsingPatterns: [
			{
				pattern: '$image',
				description: 'Switch to image node type',
				category: 'metadata',
				examples: [
					'$image https://example.com/diagram.png "System Architecture"',
					'$image https://example.com/image.jpg "Description"',
				],
			},
			{
				pattern: '"alt text"',
				description: 'Add alt text after URL',
				examples: ['https://example.com/image.jpg "Description"'],
				category: 'metadata',
			},
			{
				pattern: 'cap:text',
				description: 'Add caption',
				examples: ['https://example.com/img.png cap:Figure 1'],
				category: 'metadata',
			},
		],
	},

	// Resource Link Node
	{
		...getBaseCommand('resourceNode')!,
		quickParse: parseInput,
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
		parsingPatterns: [
			{
				pattern: '$link',
				description: 'Switch to resource link node type',
				category: 'metadata',
				examples: [
					'$link https://docs.example.com/api "API Documentation"',
					'$link https://example.com "My Resource"',
				],
			},
			{
				pattern: '"title"',
				description: 'Add title after URL',
				examples: ['https://example.com "My Resource"'],
				category: 'metadata',
			},
			{
				pattern: 'desc:text',
				description: 'Add description',
				examples: ['https://example.com desc:Useful reference'],
				category: 'metadata',
			},
		],
	},

	// Question Node
	{
		...getBaseCommand('questionNode')!,
		quickParse: parseInput,
		fields: [
			{
				name: 'question',
				type: 'textarea',
				label: 'Question',
				required: true,
				placeholder: 'What decision needs to be made?',
			},
			{
				name: 'type',
				type: 'select',
				label: 'Question Type',
				options: [
					{ value: 'binary', label: 'Yes/No' },
					{ value: 'multiple', label: 'Multiple Choice' },
				],
			},
		],
		examples: [
			'Should we migrate to TypeScript?',
			'Should we refactor this component? [yes/no]',
			'Which framework should we use? [React,Vue,Angular]',
			'What deployment strategy? [Blue-Green,Canary,Rolling]',
			'Do we need more testing?',
			'Which database to choose? [PostgreSQL,MongoDB,MySQL]',
		],
		parsingPatterns: [
			{
				pattern: '$question',
				description: 'Switch to question node type',
				category: 'metadata',
				examples: [
					'$question Should we migrate to TypeScript?',
					'$question Which approach is better? [A,B,C]',
				],
			},
			{
				pattern: '[yes/no]',
				description: 'Binary yes/no question',
				examples: ['[yes/no]', '[y/n]'],
				category: 'structure',
			},
			{
				pattern: '[opt1,opt2,opt3]',
				description: 'Multiple choice options',
				examples: ['[Build,Buy,Partner]', '[React,Vue,Angular]'],
				category: 'structure',
			},
		],
	},

	// Annotation Node
	{
		...getBaseCommand('annotationNode')!,
		quickParse: parseInput,
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
		parsingPatterns: [
			{
				pattern: '$annotation',
				description: 'Switch to annotation node type',
				category: 'metadata',
				examples: ['$annotation ⚠️ Breaking change in v2.0', '$annotation ✅ Deployment successful'],
			},
			{
				pattern: '⚠️',
				description: 'Warning annotation',
				examples: ['⚠️ Breaking change'],
				category: 'formatting',
			},
			{
				pattern: '✅',
				description: 'Success annotation',
				examples: ['✅ Tests passed'],
				category: 'formatting',
			},
			{
				pattern: 'ℹ️',
				description: 'Info annotation',
				examples: ['ℹ️ API endpoint updated'],
				category: 'formatting',
			},
			{
				pattern: '❌',
				description: 'Error annotation',
				examples: ['❌ Build failed'],
				category: 'formatting',
			},
			{
				pattern: '💡',
				description: 'Note/idea annotation',
				examples: ['💡 Consider caching'],
				category: 'formatting',
			},
			{
				pattern: 'type:',
				description: 'Type prefix',
				examples: ['warning: Check permissions', 'info: New feature'],
				category: 'structure',
			},
		],
	},

	// Text Node
	{
		...getBaseCommand('textNode')!,
		quickParse: parseInput,
		fields: [
			{
				name: 'content',
				type: 'textarea',
				label: 'Text Content',
				required: true,
				placeholder: 'Enter your text...',
			},
		],
		examples: ['**Bold text** @24px', '*Italic note* align:center', 'Important message color:red @32px'],
		parsingPatterns: [
			{
				pattern: '$text',
				description: 'Switch to text node type',
				category: 'metadata',
				examples: [
					'$text **Bold text** sz:24px align:center',
					'$text *Italic note* sz:18px align:left',
					'$text Important message color:red sz:24px align:center',
				],
			},
			{
				pattern: 'sz:size',
				description: 'Set font size',
				examples: ['sz:16px', 'sz:24px', 'sz:32px', 'sz:2rem'],
				category: 'formatting',
				insertText: 'sz:24px',
			},
			{
				pattern: '**text**',
				description: 'Make text bold',
				examples: ['**Important**', '**Warning**'],
				category: 'formatting',
			},
			{
				pattern: '*text*',
				description: 'Make text italic',
				examples: ['*emphasis*', '_note_'],
				category: 'formatting',
			},
			{
				pattern: 'align:direction',
				description: 'Set text alignment',
				examples: ['align:left', 'align:center', 'align:right'],
				category: 'formatting',
				insertText: 'align:center',
			},
			{
				pattern: 'color:value',
				description: 'Set text color',
				examples: ['color:red', 'color:#ff0000', 'color:blue-500'],
				category: 'formatting',
				insertText: 'color:',
			},
		],
	},

	// Reference Node
	{
		...getBaseCommand('referenceNode')!,
		quickParse: (input: string) => {
			const result = {
				content: input,
				metadata: {} as any,
			};

			// Clean content first by removing all existing patterns to prevent duplication
			const cleanContent = input
				.replace(/target:[^\s]+\s*/g, '') // Remove all target: patterns
				.replace(/map:[^\s]+\s*/g, '') // Remove all map: patterns
				.replace(/confidence:[^\s]+\s*/g, '') // Remove all confidence: patterns
				.trim();

			// Parse target references (use last occurrence only)
			const targetMatch = input.match(/target:([^\s]+)/);

			if (targetMatch) {
				result.metadata.targetNodeId = targetMatch[1];
			}

			// Parse map references (use last occurrence only)
			const mapMatch = input.match(/map:([^\s]+)/);

			if (mapMatch) {
				result.metadata.targetMapId = mapMatch[1];
			}

			// Parse confidence level (use last occurrence only)
			const confidenceMatch = input.match(/confidence:(\d+(?:\.\d+)?)/);

			if (confidenceMatch) {
				result.metadata.confidence = parseFloat(confidenceMatch[1]);
			}

			result.content = cleanContent;
			return result;
		},
		parsingPatterns: [
			{
				pattern: '$reference',
				description: 'Switch to reference node type',
				category: 'metadata',
				examples: [
					'$reference meeting notes #important',
					'$reference API documentation !in-progress',
					'$reference Cross-reference to project analysis',
				],
			},
			{
				pattern: 'target:nodeId',
				description: 'Reference target node ID',
				examples: ['target:node-123', 'target:analysis-456'],
				category: 'metadata',
				insertText: 'target:',
			},
			{
				pattern: 'map:mapId',
				description: 'Reference target map ID',
				examples: ['map:brainstorm-789', 'map:analysis-456'],
				category: 'metadata',
				insertText: 'map:',
			},
			{
				pattern: 'confidence:level',
				description: 'Set confidence level (0-1)',
				examples: ['confidence:0.8', 'confidence:0.95'],
				category: 'metadata',
				insertText: 'confidence:0.8',
			},
		],
	},
];

// Helper function to get command by type
export const getCommandByType = (nodeType: string): Command | undefined => {
	return nodeCommands.find((cmd) => cmd.nodeType === nodeType);
};

// Helper function to get commands by category
export const getCommandsByCategory = (category: string): Command[] => {
	return nodeCommands.filter((cmd) => cmd.category === category);
};

// Categories for grouping
export const commandCategories = [
	{ id: 'content', label: 'Content', icon: FileText },
	{ id: 'media', label: 'Media', icon: Image },
	{ id: 'interactive', label: 'Interactive', icon: CheckSquare },
	{ id: 'annotation', label: 'Annotations', icon: Lightbulb },
];