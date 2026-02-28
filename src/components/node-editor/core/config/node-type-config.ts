/**
 * Node Type Configuration - UI metadata for node types
 * Node-specific syntax patterns live here.
 * Universal patterns are exported separately and can be shown per node type.
 */

import type { AvailableNodeTypes } from '@/registry/node-registry';
import {
	AtSign,
	Calendar,
	CheckSquare,
	Code,
	FileQuestion,
	FileText,
	Flag,
	Hash,
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
	category: 'metadata' | 'formatting' | 'structure' | 'content';
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
	/** Node-specific parsing patterns for legend */
	parsingPatterns: ParsingPattern[];
}

const UNIVERSAL_PATTERN_SUPPORTED_NODE_TYPES: AvailableNodeTypes[] = [
	'defaultNode',
	'taskNode',
	'codeNode',
	'imageNode',
	'resourceNode',
	'questionNode',
	'annotationNode',
	'textNode',
];

const NODE_TYPE_TRIGGER_BY_TYPE: Partial<Record<AvailableNodeTypes, string>> = {
	defaultNode: '$note',
	taskNode: '$task',
	codeNode: '$code',
	imageNode: '$image',
	resourceNode: '$link',
	questionNode: '$question',
	annotationNode: '$annotation',
	textNode: '$text',
};

const NODE_TYPE_SWITCH_DISCOVERY_ORDER = [
	'$note',
	'$task',
	'$code',
	'$image',
	'$link',
	'$question',
	'$annotation',
	'$text',
];

const UNIVERSAL_PARSING_PATTERNS: ParsingPattern[] = [
	{
		pattern: '#tag',
		description: 'Add hashtag',
		category: 'metadata',
		examples: ['#meeting', '#important', '#urgent #bug'],
		icon: Tag,
	},
	{
		pattern: '@assignee',
		description: 'Assign to person or role',
		category: 'metadata',
		examples: ['@me', '@dev', '@team-lead'],
		icon: AtSign,
	},
	{
		pattern: '^date',
		description: 'Set due date',
		category: 'metadata',
		examples: ['^today', '^tomorrow', '^2026-03-15'],
		icon: Calendar,
	},
	{
		pattern: '!priority',
		description: 'Set priority level',
		category: 'metadata',
		examples: ['!high', '!medium', '!low', '!', '!!', '!!!'],
		icon: Flag,
	},
	{
		pattern: ':status',
		description: 'Set workflow status',
		category: 'metadata',
		examples: [':todo', ':in-progress', ':done', ':blocked'],
		icon: Hash,
	},
];

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
			{
				pattern: 'lines:on|off',
				description: 'Toggle line numbers',
				examples: ['lines:on', 'lines:off'],
				category: 'metadata',
				insertText: 'lines:on',
			},
		],
	},

	// Image Node
	imageNode: {
		icon: Image,
		label: 'Image',
		examples: ['url:https://example.com/diagram.png alt:"System Architecture"'],
		parsingPatterns: [
			{
				pattern: '$image',
				description: 'Switch to image node type',
				category: 'metadata',
				examples: [
					'$image url:https://example.com/diagram.png alt:"System Architecture"',
				],
			},
			{
				pattern: 'url:link',
				description: 'Set image URL',
				examples: [
					'url:https://example.com/image.png',
					'url:https://imgur.com/abc.jpg',
				],
				category: 'metadata',
				insertText: 'url:',
			},
			{
				pattern: 'alt:"text"',
				description: 'Add alt text for the image',
				examples: ['alt:"System Architecture diagram"'],
				category: 'metadata',
				insertText: 'alt:"',
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
				examples: ['$link url:https://docs.example.com title:"API Docs"'],
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
				description: 'Set question type',
				examples: ['question:binary', 'question:multiple'],
				category: 'structure',
			},
			{
				pattern: 'multiple:true|false',
				description: 'Allow multiple responses',
				examples: ['multiple:true', 'multiple:false'],
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
			'⚠️ Potential bottleneck here',
			'✅ Reviewed and approved',
			'type:warning Important notice',
		],
		parsingPatterns: [
			{
				pattern: '$annotation',
				description: 'Switch to annotation node type',
				category: 'metadata',
				examples: ['$annotation ⚠️ Review this section', '$annotation ✅ Looks good'],
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

	// Reference Node (parser support intentionally disabled)
	referenceNode: {
		icon: Link,
		label: 'Reference',
		examples: ['Reference content'],
		parsingPatterns: [],
	},

	// Group Node (not command-creatable in node editor)
	groupNode: {
		icon: FileText,
		label: 'Group',
		examples: ['Group container'],
		parsingPatterns: [],
	},

	// Comment Node (not command-creatable in node editor)
	commentNode: {
		icon: MessageSquare,
		label: 'Comment',
		examples: ['Great idea!', 'Needs revision'],
		parsingPatterns: [],
	},

	// Ghost Node (system-only)
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

/**
 * Universal parsing patterns available for a node type.
 */
export function getUniversalParsingPatterns(
	nodeType: AvailableNodeTypes
): ParsingPattern[] {
	if (!UNIVERSAL_PATTERN_SUPPORTED_NODE_TYPES.includes(nodeType)) {
		return [];
	}

	return UNIVERSAL_PARSING_PATTERNS;
}

/**
 * Node-specific parsing patterns available for a node type.
 */
export function getNodeSpecificParsingPatterns(
	nodeType: AvailableNodeTypes
): ParsingPattern[] {
	const basePatterns = nodeTypeConfigs[nodeType].parsingPatterns;

	if (!UNIVERSAL_PATTERN_SUPPORTED_NODE_TYPES.includes(nodeType)) {
		return basePatterns;
	}

	const currentTrigger = NODE_TYPE_TRIGGER_BY_TYPE[nodeType];
	const discoverySwitches = NODE_TYPE_SWITCH_DISCOVERY_ORDER
		.filter((trigger) => trigger !== currentTrigger)
		.slice(0, 3);

	if (discoverySwitches.length === 0) {
		return basePatterns;
	}

	return [
		...basePatterns,
		{
			pattern: '$...',
			description: 'Switch node type with $ prefix',
			category: 'metadata',
			examples: [discoverySwitches.join(' ')],
			insertText: '$',
		},
	];
}
