/**
 * Node Registry - Single Source of Truth for All Node Types
 *
 * This is THE master configuration file for all node types in the application.
 * All node type information, metadata, behavior, and utilities are defined here.
 *
 * To add a new node type: Add an entry to NODE_REGISTRY below.
 * To deprecate a node type: Change status to 'deprecated' and add deprecation info.
 */

import { ComponentType } from 'react';
import { NodeProps } from '@xyflow/react';
import type { LucideIcon } from 'lucide-react';
import { z } from 'zod';

// ═══════════════════════════════════════════════
// IMPORT NODE COMPONENTS
// ═══════════════════════════════════════════════

import AnnotationNode from '@/components/nodes/annotation-node';
import CodeNode from '@/components/nodes/code-node';
import CommentNode from '@/components/nodes/comment-node';
import DefaultNode from '@/components/nodes/default-node';
import { GhostNode } from '@/components/nodes/ghost-node';
import GroupNode from '@/components/nodes/group-node';
import ImageNode from '@/components/nodes/image-node';
import QuestionNode from '@/components/nodes/question-node';
import ReferenceNode from '@/components/nodes/reference-node';
import ResourceNode from '@/components/nodes/resource-node';
import TaskNode from '@/components/nodes/task-node';
import TextNode from '@/components/nodes/text-node';

// ═══════════════════════════════════════════════
// IMPORT ICONS
// ═══════════════════════════════════════════════

import {
	CheckSquare,
	Code,
	FileText,
	Hash,
	Image,
	Lightbulb,
	Link,
	MessageCircle,
	MessageSquare,
	Sparkles,
	SquareStack,
	Type,
} from 'lucide-react';

// ═══════════════════════════════════════════════
// IMPORT VALIDATION SCHEMAS
// ═══════════════════════════════════════════════

import { nodeValidationSchemas } from './node-validation-schemas';

// ═══════════════════════════════════════════════
// REGISTRY CONFIGURATION INTERFACE
// ═══════════════════════════════════════════════

export interface NodeRegistryConfig<T extends string = string> {
	// ─── Component & Identity ───
	component: ComponentType<any>; // Accept any compatible component type
	label: string;
	description: string;
	icon: LucideIcon;
	category: 'content' | 'media' | 'structure' | 'ai';
	accentColor?: string; // For UI theming

	// ─── Command System Integration ───
	commandTrigger: `$${string}` | null; // null for system-only nodes
	keywords: string[]; // For search/autocomplete
	examples: string[]; // Command usage examples

	// ─── Metadata & Validation ───
	defaultMetadata: Record<string, any>;
	metadataSchema: z.ZodType;

	// ─── Behavior Flags ───
	behavior: {
		selectable: boolean;
		deletable: boolean;
		connectable: boolean;
		draggable: boolean;
	};

	// ─── Feature Flags ───
	features: {
		markdown: boolean;
		richText: boolean;
		media: boolean;
		requiresInput: boolean;
		creationPrompt?: string;
	};

	// ─── Availability ───
	availability: {
		userCreatable: boolean; // Can users manually create this?
		aiSuggestable: boolean; // Can AI suggest this?
		inlineCreatable: boolean; // Can be created via quick input?
	};

	// ─── Lifecycle ───
	status: 'active' | 'deprecated' | 'experimental';
	deprecation?: {
		since: string; // ISO date
		reason: string;
		replacement: T | null;
	};
}

// ═══════════════════════════════════════════════
// THE MASTER REGISTRY
// ═══════════════════════════════════════════════

export const NODE_REGISTRY = {
	defaultNode: {
		component: DefaultNode,
		label: 'Note',
		description: 'Basic note with markdown support',
		icon: FileText,
		category: 'content',
		commandTrigger: '$note',
		keywords: ['note', 'text', 'memo', 'content', 'markdown'],
		examples: ['$note Meeting notes', '$note Project update'],
		defaultMetadata: {},
		metadataSchema: nodeValidationSchemas.defaultNode,
		behavior: {
			selectable: true,
			deletable: true,
			connectable: true,
			draggable: true,
		},
		features: {
			markdown: true,
			richText: false,
			media: false,
			requiresInput: false,
		},
		availability: {
			userCreatable: true,
			aiSuggestable: true,
			inlineCreatable: true,
		},
		status: 'active',
	},

	textNode: {
		component: TextNode,
		label: 'Text',
		description: 'Formatted text with style controls',
		icon: Type,
		category: 'content',
		commandTrigger: '$text',
		keywords: ['text', 'typography', 'formatted', 'styled'],
		examples: ['$text **Bold text** @24px', '$text Centered heading'],
		defaultMetadata: {
			fontSize: '14px',
			textAlign: 'left',
			fontWeight: 400,
			fontStyle: 'normal',
			textColor: 'rgba(255, 255, 255, 0.87)',
		},
		metadataSchema: nodeValidationSchemas.textNode,
		behavior: {
			selectable: true,
			deletable: true,
			connectable: true,
			draggable: true,
		},
		features: {
			markdown: false,
			richText: true,
			media: false,
			requiresInput: true,
			creationPrompt: 'Enter text content',
		},
		availability: {
			userCreatable: true,
			aiSuggestable: true,
			inlineCreatable: true,
		},
		status: 'active',
	},

	taskNode: {
		component: TaskNode,
		label: 'Task',
		description: 'Task list with progress tracking',
		icon: CheckSquare,
		category: 'structure',
		commandTrigger: '$task',
		keywords: ['task', 'todo', 'checklist', 'checkbox', 'action'],
		examples: ['$task Review PR', '$task Buy milk; Send email'],
		defaultMetadata: {
			tasks: [],
			status: 'pending',
		},
		metadataSchema: nodeValidationSchemas.taskNode,
		behavior: {
			selectable: true,
			deletable: true,
			connectable: true,
			draggable: true,
		},
		features: {
			markdown: false,
			richText: false,
			media: false,
			requiresInput: false,
		},
		availability: {
			userCreatable: true,
			aiSuggestable: true,
			inlineCreatable: true,
		},
		status: 'active',
	},

	imageNode: {
		component: ImageNode,
		label: 'Image',
		description: 'Display images with captions',
		icon: Image,
		category: 'media',
		commandTrigger: '$image',
		keywords: ['image', 'picture', 'photo', 'diagram', 'visual'],
		examples: ['$image https://example.com/diagram.png', '$image Upload image'],
		defaultMetadata: {
			showCaption: true,
			fitMode: 'cover',
			altText: '',
		},
		metadataSchema: nodeValidationSchemas.imageNode,
		behavior: {
			selectable: true,
			deletable: true,
			connectable: true,
			draggable: true,
		},
		features: {
			markdown: false,
			richText: false,
			media: true,
			requiresInput: true,
			creationPrompt: 'Enter image URL or upload image',
		},
		availability: {
			userCreatable: true,
			aiSuggestable: true,
			inlineCreatable: false,
		},
		status: 'active',
	},

	resourceNode: {
		component: ResourceNode,
		label: 'Resource',
		description: 'External links with previews',
		icon: Link,
		category: 'content',
		commandTrigger: '$link',
		keywords: ['link', 'url', 'resource', 'reference', 'external'],
		examples: ['$link https://docs.example.com', '$link Add bookmark'],
		defaultMetadata: {
			showThumbnail: true,
			showSummary: true,
			url: '',
		},
		metadataSchema: nodeValidationSchemas.resourceNode,
		behavior: {
			selectable: true,
			deletable: true,
			connectable: true,
			draggable: true,
		},
		features: {
			markdown: false,
			richText: false,
			media: false,
			requiresInput: true,
			creationPrompt: 'Enter resource URL',
		},
		availability: {
			userCreatable: true,
			aiSuggestable: true,
			inlineCreatable: true,
		},
		status: 'active',
	},

	questionNode: {
		component: QuestionNode,
		label: 'Question',
		description: 'Q&A format with AI answers',
		icon: MessageCircle,
		category: 'ai',
		commandTrigger: '$question',
		keywords: ['question', 'inquiry', 'decision', 'choice', 'ask'],
		examples: ['$question Should we migrate to TypeScript?', '$question What are the options?'],
		defaultMetadata: {
			isAnswered: false,
			questionType: 'binary',
		},
		metadataSchema: nodeValidationSchemas.questionNode,
		behavior: {
			selectable: true,
			deletable: true,
			connectable: true,
			draggable: true,
		},
		features: {
			markdown: true,
			richText: false,
			media: false,
			requiresInput: true,
			creationPrompt: 'Enter your question',
		},
		availability: {
			userCreatable: true,
			aiSuggestable: true,
			inlineCreatable: true,
		},
		status: 'active',
	},

	codeNode: {
		component: CodeNode,
		label: 'Code Snippet',
		description: 'Syntax-highlighted code blocks',
		icon: Code,
		category: 'content',
		commandTrigger: '$code',
		keywords: ['code', 'snippet', 'programming', 'script', 'syntax'],
		examples: ['$code javascript', '$code python file:main.py'],
		defaultMetadata: {
			language: 'javascript',
			showLineNumbers: true,
			fileName: '',
		},
		metadataSchema: nodeValidationSchemas.codeNode,
		behavior: {
			selectable: true,
			deletable: true,
			connectable: true,
			draggable: true,
		},
		features: {
			markdown: false,
			richText: false,
			media: false,
			requiresInput: true,
			creationPrompt: 'Paste or enter code',
		},
		availability: {
			userCreatable: true,
			aiSuggestable: true,
			inlineCreatable: true,
		},
		status: 'active',
	},

	annotationNode: {
		component: AnnotationNode,
		label: 'Annotation',
		description: 'Notes, ideas, and quotes',
		icon: Lightbulb,
		category: 'content',
		commandTrigger: '$annotation',
		keywords: ['annotation', 'note', 'callout', 'highlight'],
		examples: ['$annotation ⚠️ Breaking change', '$annotation Important note'],
		defaultMetadata: {
			annotationType: 'note',
			fontSize: '14px',
			fontWeight: 400,
		},
		metadataSchema: nodeValidationSchemas.annotationNode,
		behavior: {
			selectable: true,
			deletable: true,
			connectable: true,
			draggable: true,
		},
		features: {
			markdown: false,
			richText: false,
			media: false,
			requiresInput: true,
			creationPrompt: 'Enter annotation content',
		},
		availability: {
			userCreatable: true,
			aiSuggestable: true,
			inlineCreatable: true,
		},
		status: 'active',
	},

	groupNode: {
		component: GroupNode,
		label: 'Group',
		description: 'Container for organizing nodes',
		icon: SquareStack,
		category: 'structure',
		commandTrigger: null, // Groups created via special action, not command
		keywords: ['group', 'container', 'organize', 'collection'],
		examples: [],
		defaultMetadata: {
			isGroup: true,
			groupChildren: [],
			groupPadding: 40,
			label: 'Group',
			backgroundColor: 'rgba(113, 113, 122, 0.1)',
			borderColor: '#52525b',
		},
		metadataSchema: nodeValidationSchemas.groupNode,
		behavior: {
			selectable: true,
			deletable: true,
			connectable: false, // Groups don't connect
			draggable: true,
		},
		features: {
			markdown: false,
			richText: false,
			media: false,
			requiresInput: false,
		},
		availability: {
			userCreatable: true,
			aiSuggestable: false, // AI doesn't suggest groups
			inlineCreatable: false,
		},
		status: 'active',
	},

	referenceNode: {
		component: ReferenceNode,
		label: 'Reference',
		description: 'Links to other nodes or maps',
		icon: Hash,
		category: 'structure',
		commandTrigger: '$reference',
		keywords: ['reference', 'link', 'cross-reference', 'connection', 'pointer'],
		examples: ['$reference target:node-123', '$reference Link to node'],
		defaultMetadata: {
			targetMapTitle: 'Untitled Map',
			contentSnippet: 'No content',
		},
		metadataSchema: nodeValidationSchemas.referenceNode,
		behavior: {
			selectable: true,
			deletable: true,
			connectable: true,
			draggable: true,
		},
		features: {
			markdown: false,
			richText: false,
			media: false,
			requiresInput: true,
			creationPrompt: 'Select target node or map',
		},
		availability: {
			userCreatable: true,
			aiSuggestable: false, // References are user-initiated
			inlineCreatable: false,
		},
		status: 'active',
	},

	commentNode: {
		component: CommentNode,
		label: 'Comment Thread',
		description: 'Discussion thread with mentions and reactions',
		icon: MessageSquare,
		category: 'structure',
		commandTrigger: null, // Created via comment mode toggle only
		keywords: ['comment', 'discussion', 'thread', 'conversation', 'feedback'],
		examples: [],
		defaultMetadata: {
			totalMessages: 0,
			participants: [],
		},
		metadataSchema: nodeValidationSchemas.commentNode,
		behavior: {
			selectable: true,
			deletable: true,
			connectable: false, // Comments don't connect to other nodes
			draggable: true,
		},
		features: {
			markdown: false,
			richText: false,
			media: false,
			requiresInput: false,
		},
		availability: {
			userCreatable: true, // Can create in comment mode
			aiSuggestable: false,
			inlineCreatable: false,
		},
		status: 'active',
	},

	ghostNode: {
		component: GhostNode,
		label: 'AI Suggestion',
		description: 'AI-generated node suggestion',
		icon: Sparkles,
		category: 'ai',
		commandTrigger: null, // System-only, no command
		keywords: [],
		examples: [],
		defaultMetadata: {
			suggestedContent: '',
			suggestedType: 'defaultNode',
			confidence: 0,
		},
		metadataSchema: nodeValidationSchemas.ghostNode,
		behavior: {
			selectable: true,
			deletable: true,
			connectable: false,
			draggable: false,
		},
		features: {
			markdown: false,
			richText: false,
			media: false,
			requiresInput: false,
		},
		availability: {
			userCreatable: false, // System-only
			aiSuggestable: false,
			inlineCreatable: false,
		},
		status: 'active',
	},
} as const satisfies Record<string, NodeRegistryConfig<any>>;

// ═══════════════════════════════════════════════
// DERIVED TYPES
// ═══════════════════════════════════════════════

/**
 * All available node types (derived from registry keys)
 */
export type AvailableNodeTypes = keyof typeof NODE_REGISTRY;

/**
 * Active node types only (filters out deprecated)
 */
export type ActiveNodeTypes = {
	[K in AvailableNodeTypes]: typeof NODE_REGISTRY[K]['status'] extends 'deprecated'
		? never
		: K;
}[AvailableNodeTypes];

/**
 * User-creatable node types only
 */
export type CreatableNodeTypes = {
	[K in AvailableNodeTypes]: typeof NODE_REGISTRY[K]['availability']['userCreatable'] extends true
		? K
		: never;
}[AvailableNodeTypes];

/**
 * AI-suggestable node types only
 */
export type AISuggestableNodeTypes = {
	[K in AvailableNodeTypes]: typeof NODE_REGISTRY[K]['availability']['aiSuggestable'] extends true
		? K
		: never;
}[AvailableNodeTypes];

/**
 * Inline-creatable node types only
 */
export type InlineCreatableNodeTypes = {
	[K in AvailableNodeTypes]: typeof NODE_REGISTRY[K]['availability']['inlineCreatable'] extends true
		? K
		: never;
}[AvailableNodeTypes];

// ═══════════════════════════════════════════════
// NODE REGISTRY UTILITY CLASS
// ═══════════════════════════════════════════════

export class NodeRegistry {
	// ─── Core Getters ───

	/**
	 * Get full configuration for a node type
	 */
	static getConfig<T extends AvailableNodeTypes>(
		type: T
	): typeof NODE_REGISTRY[T] {
		return NODE_REGISTRY[type];
	}

	/**
	 * Get all node types
	 */
	static getAllTypes(): AvailableNodeTypes[] {
		return Object.keys(NODE_REGISTRY) as AvailableNodeTypes[];
	}

	/**
	 * Get only active (non-deprecated) node types
	 */
	static getActiveTypes(): ActiveNodeTypes[] {
		return this.getAllTypes().filter(
			(type) => (NODE_REGISTRY[type].status as string) !== 'deprecated'
		) as ActiveNodeTypes[];
	}

	/**
	 * Get user-creatable node types (excludes system-only)
	 */
	static getCreatableTypes(): CreatableNodeTypes[] {
		return this.getAllTypes().filter(
			(type) => NODE_REGISTRY[type].availability.userCreatable
		) as CreatableNodeTypes[];
	}

	/**
	 * Get AI-suggestable node types
	 */
	static getAISuggestableTypes(): AISuggestableNodeTypes[] {
		return this.getAllTypes().filter(
			(type) => NODE_REGISTRY[type].availability.aiSuggestable
		) as AISuggestableNodeTypes[];
	}

	/**
	 * Get inline-creatable node types (via quick input)
	 */
	static getInlineCreatableTypes(): InlineCreatableNodeTypes[] {
		return this.getAllTypes().filter(
			(type) => NODE_REGISTRY[type].availability.inlineCreatable
		) as InlineCreatableNodeTypes[];
	}

	// ─── React Flow Integration ───

	/**
	 * Get component map for React Flow's nodeTypes prop
	 */
	static getComponentMap(): Record<string, ComponentType<any>> {
		return Object.fromEntries(
			this.getAllTypes().map((type) => [type, NODE_REGISTRY[type].component])
		) as Record<string, ComponentType<any>>;
	}

	// ─── Command System ───

	/**
	 * Get mapping of command triggers to node types
	 */
	static getCommandTriggerMap(): Record<string, AvailableNodeTypes> {
		const map: Record<string, AvailableNodeTypes> = {};

		for (const type of this.getAllTypes()) {
			const trigger = NODE_REGISTRY[type].commandTrigger;
			if (trigger) map[trigger] = type;
		}

		return map;
	}

	/**
	 * Get node type from command trigger
	 */
	static getTypeFromTrigger(trigger: string): AvailableNodeTypes | null {
		const map = this.getCommandTriggerMap();
		return map[trigger] || null;
	}

	// ─── Validation ───

	/**
	 * Validate metadata for a node type using Zod schema
	 */
	static validateMetadata<T extends AvailableNodeTypes>(
		type: T,
		metadata: unknown
	) {
		return NODE_REGISTRY[type].metadataSchema.safeParse(metadata);
	}

	// ─── Deprecation Checks ───

	/**
	 * Check if a node type is deprecated
	 */
	static isDeprecated(type: AvailableNodeTypes): boolean {
		return (NODE_REGISTRY[type].status as string) === 'deprecated';
	}

	/**
	 * Get deprecation information for a node type
	 */
	static getDeprecationInfo(type: AvailableNodeTypes): {
		since: string;
		reason: string;
		replacement: any | null;
	} | null {
		const config = NODE_REGISTRY[type];
		if ((config.status as string) !== 'deprecated') return null;
		return (config as any).deprecation || null;
	}

	/**
	 * Warn in development if node type is deprecated
	 */
	static warnIfDeprecated(type: AvailableNodeTypes): void {
		if (process.env.NODE_ENV === 'development') {
			const info = this.getDeprecationInfo(type);

			if (info) {
				console.warn(
					`⚠️ Node type "${type}" is deprecated since ${info.since}\n` +
						`Reason: ${info.reason}\n` +
						(info.replacement ? `Use "${info.replacement}" instead.` : '')
				);
			}
		}
	}

	// ─── Type Guards ───

	/**
	 * Check if a string is a valid node type
	 */
	static isValidType(type: string): type is AvailableNodeTypes {
		return type in NODE_REGISTRY;
	}

	/**
	 * Check if a type is user-creatable
	 */
	static isCreatableType(type: string): type is CreatableNodeTypes {
		return (
			this.isValidType(type) && NODE_REGISTRY[type].availability.userCreatable
		);
	}

	/**
	 * Check if a type is AI-suggestable
	 */
	static isAISuggestableType(type: string): type is AISuggestableNodeTypes {
		return (
			this.isValidType(type) && NODE_REGISTRY[type].availability.aiSuggestable
		);
	}

	// ─── UI Helpers ───

	/**
	 * Get display information for a node type
	 */
	static getDisplayInfo(type: AvailableNodeTypes) {
		const config = NODE_REGISTRY[type] as any;
		return {
			label: config.label,
			description: config.description,
			icon: config.icon,
			category: config.category,
			accentColor: config.accentColor,
		};
	}

	/**
	 * Get node types organized by category
	 */
	static getCategorizedTypes() {
		const categories = ['content', 'media', 'structure', 'ai'] as const;

		return categories.map((category) => ({
			category,
			label: category.charAt(0).toUpperCase() + category.slice(1),
			types: this.getActiveTypes()
				.filter((type) => NODE_REGISTRY[type].category === category)
				.map((type) => ({
					type,
					...this.getDisplayInfo(type),
				})),
		}));
	}

	/**
	 * Get default metadata for a node type
	 */
	static getDefaultMetadata<T extends AvailableNodeTypes>(
		type: T
	): typeof NODE_REGISTRY[T]['defaultMetadata'] {
		return NODE_REGISTRY[type].defaultMetadata;
	}

	/**
	 * Get behavior flags for a node type
	 */
	static getBehavior(type: AvailableNodeTypes) {
		return NODE_REGISTRY[type].behavior;
	}

	/**
	 * Get feature flags for a node type
	 */
	static getFeatures(type: AvailableNodeTypes) {
		return NODE_REGISTRY[type].features;
	}

	/**
	 * Check if node supports a specific feature
	 */
	static supportsFeature(
		type: AvailableNodeTypes,
		feature: keyof typeof NODE_REGISTRY[AvailableNodeTypes]['features']
	): boolean {
		return Boolean(NODE_REGISTRY[type].features[feature]);
	}
}

export default NodeRegistry;
