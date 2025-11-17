/**
 * Node Type Configuration - UI metadata for node types
 * Simplified configuration system (replaces command-based config)
 */

import type { AvailableNodeTypes } from '@/registry/node-registry';
import {
	Calendar,
	CheckSquare,
	Code,
	FileQuestion,
	FileText,
	Flag,
	Image,
	Link,
	MessageSquare,
	StickyNote,
	Tag,
	Type,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Pattern for parsing legend
 */
export interface ParsingPattern {
	pattern: string;
	description: string;
	category: 'metadata' | 'formatting' | 'structure';
	examples?: string[];
	icon?: LucideIcon;
	insertText?: string;
}

/**
 * Node type configuration
 */
export interface NodeTypeConfig {
	/** Icon for UI display */
	icon: LucideIcon;
	/** Display label */
	label: string;
	/** Example inputs */
	examples: string[];
	/** Parsing patterns for legend */
	parsingPatterns: ParsingPattern[];
}

/**
 * Node type configurations map
 */
export const nodeTypeConfigs: Record<AvailableNodeTypes, NodeTypeConfig> = {
	// Default Node (Note)
	defaultNode: {
		icon: StickyNote,
		label: 'Note',
		examples: ['Meeting notes #important', 'Project update #in-progress'],
		parsingPatterns: [
			{
				pattern: '$note',
				description: 'Switch to note node type',
				category: 'metadata',
				examples: [
					'$note Meeting notes #important',
					'$note Project update #in-progress',
				],
			},
			{
				pattern: '!priority',
				description: 'Set priority level',
				examples: [
					'!high',
					'!medium',
					'!low',
					'!',
					'!!',
					'!!!',
					'!1',
					'!2',
					'!3',
				],
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
	taskNode: {
		icon: CheckSquare,
		label: 'Task List',
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
				examples: [
					'$task Review PR; Fix bugs ^friday #high',
					'$task Buy milk, Send email',
				],
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
				pattern: '[ ]',
				description: 'Markdown task list',
				examples: ['[ ] Review PR\n[ ] Fix bugs\n[ ] Deploy'],
				category: 'formatting',
				insertText: '[ ] ',
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
	codeNode: {
		icon: Code,
		label: 'Code Block',
		examples: ['```js const sum = (a, b) => a + b', 'python file:utils.py'],
		parsingPatterns: [
			{
				pattern: '$code',
				description: 'Switch to code block node type',
				category: 'metadata',
				examples: [
					'$code ```js const sum = (a, b) => a + b',
					'$code python file:utils.py',
				],
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
	imageNode: {
		icon: Image,
		label: 'Image',
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
	resourceNode: {
		icon: Link,
		label: 'Resource Link',
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
	questionNode: {
		icon: FileQuestion,
		label: 'Question',
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
				pattern: 'question:binary|multiple',
				description: 'Binary yes/no question',
				examples: ['question:binary', 'question:multiple'],
				category: 'structure',
			},
			{
				pattern: 'options:[opt1,opt2,opt3]',
				description: 'Multiple choice options',
				examples: [
					'options:[Build,Buy,Partner]',
					'options:[React,Vue,Angular]',
				],
				category: 'structure',
			},
		],
	},

	// Annotation Node
	annotationNode: {
		icon: MessageSquare,
		label: 'Annotation',
		examples: ['⚠️ Breaking change in v2.0', '✅ Deployment successful'],
		parsingPatterns: [
			{
				pattern: '$annotation',
				description: 'Switch to annotation node type',
				category: 'metadata',
				examples: [
					'$annotation ⚠️ Breaking change in v2.0',
					'$annotation ✅ Deployment successful',
				],
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
	textNode: {
		icon: Type,
		label: 'Text',
		examples: [
			'Bold text size:24px weight:bold',
			'Italic note style:italic align:center',
			'Important message color:red size:32px',
		],
		parsingPatterns: [
			{
				pattern: '$text',
				description: 'Switch to text node type',
				category: 'metadata',
				examples: [
					'$text Bold text size:24px align:center',
					'$text Italic note style:italic align:left',
					'$text Important message color:red size:24px',
				],
			},
			{
				pattern: 'size:value',
				description: 'Set font size',
				examples: ['size:16px', 'size:24px', 'size:32px', 'size:2rem'],
				category: 'formatting',
				insertText: 'size:24px',
			},
			{
				pattern: 'weight:value',
				description: 'Set font weight',
				examples: ['weight:bold', 'weight:normal', 'weight:400', 'weight:700'],
				category: 'formatting',
				insertText: 'weight:bold',
			},
			{
				pattern: 'style:value',
				description: 'Set font style',
				examples: ['style:italic', 'style:normal', 'style:oblique'],
				category: 'formatting',
				insertText: 'style:italic',
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
	referenceNode: {
		icon: Link,
		label: 'Reference',
		examples: [
			'meeting notes #important',
			'API documentation !in-progress',
			'Cross-reference to project analysis',
		],
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

	// Group Node (minimal config - usually not created via editor)
	groupNode: {
		icon: FileText,
		label: 'Group',
		examples: ['Group container'],
		parsingPatterns: [
			{
				pattern: '$group',
				description: 'Switch to group node type',
				category: 'metadata',
				examples: ['$group Container for related nodes'],
			},
		],
	},

	// Comment Node
	commentNode: {
		icon: MessageSquare,
		label: 'Comment',
		examples: ['Great idea!', 'Needs revision'],
		parsingPatterns: [
			{
				pattern: '$comment',
				description: 'Switch to comment node type',
				category: 'metadata',
				examples: ['$comment Great idea!', '$comment Needs revision'],
			},
		],
	},

	// Ghost Node (system-only, minimal config)
	ghostNode: {
		icon: FileText,
		label: 'AI Suggestion',
		examples: [],
		parsingPatterns: [],
	},
};

/**
 * Get config for a node type
 */
export function getNodeTypeConfig(
	nodeType: AvailableNodeTypes
): NodeTypeConfig {
	return nodeTypeConfigs[nodeType];
}

/**
 * Get icon for a node type
 */
export function getNodeTypeIcon(nodeType: AvailableNodeTypes): LucideIcon {
	return nodeTypeConfigs[nodeType].icon;
}

/**
 * Get label for a node type
 */
export function getNodeTypeLabel(nodeType: AvailableNodeTypes): string {
	return nodeTypeConfigs[nodeType].label;
}
