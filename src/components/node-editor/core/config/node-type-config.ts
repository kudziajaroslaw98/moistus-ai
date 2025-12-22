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
		examples: ['lang:python file:utils.py', 'lang:typescript file:main.ts'],
		parsingPatterns: [
			{
				pattern: '$code',
				description: 'Switch to code block node type',
				category: 'metadata',
				examples: [
					'$code lang:python file:utils.py',
					'$code lang:javascript file:main.js',
				],
			},
			{
				pattern: 'lang:language',
				description: 'Set code language',
				examples: ['lang:javascript', 'lang:python', 'lang:typescript'],
				category: 'metadata',
				insertText: 'lang:',
			},
			{
				pattern: 'file:filename',
				description: 'Specify filename',
				examples: ['lang:javascript file:utils.js', 'lang:python file:main.py'],
				category: 'metadata',
				insertText: 'file:',
			},
		],
	},

	// Image Node
	imageNode: {
		icon: Image,
		label: 'Image',
		examples: ['url:https://example.com/diagram.png "System Architecture"'],
		parsingPatterns: [
			{
				pattern: '$image',
				description: 'Switch to image node type',
				category: 'metadata',
				examples: [
					'$image url:https://example.com/diagram.png "System Architecture"',
				],
			},
			{
				pattern: 'url:link',
				description: 'Set image URL',
				examples: ['url:https://example.com/image.png', 'url:https://imgur.com/abc.jpg'],
				category: 'metadata',
				insertText: 'url:',
			},
			{
				pattern: '"alt text"',
				description: 'Add alt text/caption after URL',
				examples: ['url:https://example.com/image.jpg "Description"'],
				category: 'metadata',
			},
		],
	},

	// Resource Link Node
	resourceNode: {
		icon: Link,
		label: 'Resource Link',
		examples: ['url:https://docs.example.com title:"API Documentation"'],
		parsingPatterns: [
			{
				pattern: '$link',
				description: 'Switch to resource link node type',
				category: 'metadata',
				examples: [
					'$link url:https://docs.example.com title:"API Docs"',
				],
			},
			{
				pattern: 'url:link',
				description: 'Set resource URL',
				examples: ['url:https://example.com', 'url:https://docs.api.com'],
				category: 'metadata',
			},
			{
				pattern: 'title:"text"',
				description: 'Set resource title',
				examples: ['title:"API Documentation"', 'title:"Reference Guide"'],
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
		examples: [
			'⚠️ Breaking change in v2.0',
			'✅ Deployment successful',
			'type:warning Important notice',
		],
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
				pattern: 'type:value',
				description: 'Set annotation type',
				examples: [
					'type:warning',
					'type:success',
					'type:info',
					'type:error',
					'type:note',
				],
				category: 'metadata',
				insertText: 'type:',
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
			'Cross-reference to project analysis',
		],
		parsingPatterns: [
			{
				pattern: '$reference',
				description: 'Switch to reference node type',
				category: 'metadata',
				examples: [
					'$reference meeting notes #important',
				],
			},
			{
				pattern: 'confidence:N%',
				description: 'Set confidence level',
				examples: ['confidence:80%', 'confidence:95%'],
				category: 'metadata',
				insertText: 'confidence:80%',
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
