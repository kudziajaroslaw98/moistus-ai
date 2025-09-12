/**
 * Node Registry - Centralized Node Type Management
 * 
 * This registry manages all node types, their configurations, and provides
 * utilities for node type operations throughout the application.
 */

import { AvailableNodeTypes } from '@/types/available-node-types';
import { NodeMetadataMap, TypedNode } from './types';
import { ReactNode, ComponentType } from 'react';
import { NodeProps } from '@xyflow/react';

// Node configuration interface
export interface NodeTypeConfig {
	// Display information
	label: string;
	description?: string;
	icon?: ReactNode;
	category?: 'content' | 'media' | 'structure' | 'special' | 'ai';
	
	// Default metadata
	defaultMetadata: Partial<NodeMetadataMap[keyof NodeMetadataMap]>;
	
	// Visual configuration
	defaultWidth?: number;
	defaultHeight?: number;
	minWidth?: number;
	minHeight?: number;
	maxWidth?: number;
	maxHeight?: number;
	
	// Behavior settings
	resizable?: boolean;
	selectable?: boolean;
	deletable?: boolean;
	connectable?: boolean;
	draggable?: boolean;
	
	// Feature flags
	supportsMarkdown?: boolean;
	supportsRichText?: boolean;
	supportsMedia?: boolean;
	supportsConnection?: boolean;
	
	// Creation hints
	requiresInput?: boolean; // Whether creation requires user input
	creationPrompt?: string; // Prompt to show when creating
}

// Registry of all node type configurations
export const NODE_TYPE_REGISTRY: Record<AvailableNodeTypes, NodeTypeConfig> = {
	defaultNode: {
		label: 'Note',
		description: 'Basic note with markdown support',
		category: 'content',
		defaultMetadata: {},
		defaultWidth: 320,
		defaultHeight: 100,
		minWidth: 200,
		minHeight: 60,
		resizable: true,
		selectable: true,
		deletable: true,
		connectable: true,
		draggable: true,
		supportsMarkdown: true,
		supportsConnection: true,
		requiresInput: false,
	},
	
	textNode: {
		label: 'Text',
		description: 'Formatted text with style controls',
		category: 'content',
		defaultMetadata: {
			fontSize: '14px',
			textAlign: 'left',
			fontWeight: 400,
			fontStyle: 'normal',
			textColor: 'rgba(255, 255, 255, 0.87)',
		},
		defaultWidth: 280,
		defaultHeight: 80,
		minWidth: 150,
		minHeight: 40,
		resizable: true,
		selectable: true,
		deletable: true,
		connectable: true,
		draggable: true,
		supportsRichText: true,
		supportsConnection: true,
		requiresInput: true,
		creationPrompt: 'Enter text content',
	},
	
	taskNode: {
		label: 'Task',
		description: 'Task list with progress tracking',
		category: 'structure',
		defaultMetadata: {
			tasks: [],
			status: 'pending',
		},
		defaultWidth: 320,
		defaultHeight: 150,
		minWidth: 250,
		minHeight: 100,
		resizable: true,
		selectable: true,
		deletable: true,
		connectable: true,
		draggable: true,
		supportsConnection: true,
		requiresInput: false,
	},
	
	imageNode: {
		label: 'Image',
		description: 'Display images with captions',
		category: 'media',
		defaultMetadata: {
			showCaption: true,
			fitMode: 'cover',
			altText: '',
		},
		defaultWidth: 320,
		defaultHeight: 240,
		minWidth: 150,
		minHeight: 100,
		maxWidth: 800,
		maxHeight: 600,
		resizable: true,
		selectable: true,
		deletable: true,
		connectable: true,
		draggable: true,
		supportsMedia: true,
		supportsConnection: true,
		requiresInput: true,
		creationPrompt: 'Enter image URL or upload image',
	},
	
	resourceNode: {
		label: 'Resource',
		description: 'External links with previews',
		category: 'content',
		defaultMetadata: {
			showThumbnail: true,
			showSummary: true,
			url: '',
		},
		defaultWidth: 350,
		defaultHeight: 200,
		minWidth: 280,
		minHeight: 120,
		resizable: true,
		selectable: true,
		deletable: true,
		connectable: true,
		draggable: true,
		supportsConnection: true,
		requiresInput: true,
		creationPrompt: 'Enter resource URL',
	},
	
	questionNode: {
		label: 'Question',
		description: 'Q&A format with AI answers',
		category: 'ai',
		defaultMetadata: {
			isAnswered: false,
		},
		defaultWidth: 320,
		defaultHeight: 120,
		minWidth: 250,
		minHeight: 80,
		resizable: true,
		selectable: true,
		deletable: true,
		connectable: true,
		draggable: true,
		supportsConnection: true,
		requiresInput: true,
		creationPrompt: 'Enter your question',
	},
	
	codeNode: {
		label: 'Code Snippet',
		description: 'Syntax-highlighted code blocks',
		category: 'content',
		defaultMetadata: {
			language: 'javascript',
			showLineNumbers: true,
			fileName: '',
		},
		defaultWidth: 400,
		defaultHeight: 300,
		minWidth: 300,
		minHeight: 150,
		maxWidth: 800,
		maxHeight: 600,
		resizable: true,
		selectable: true,
		deletable: true,
		connectable: true,
		draggable: true,
		supportsConnection: true,
		requiresInput: true,
		creationPrompt: 'Paste or enter code',
	},
	
	annotationNode: {
		label: 'Annotation',
		description: 'Comments, ideas, and quotes',
		category: 'content',
		defaultMetadata: {
			annotationType: 'comment',
			fontSize: '14px',
			fontWeight: 400,
		},
		defaultWidth: 300,
		defaultHeight: 100,
		minWidth: 200,
		minHeight: 60,
		resizable: true,
		selectable: true,
		deletable: true,
		connectable: true,
		draggable: true,
		supportsConnection: true,
		requiresInput: true,
		creationPrompt: 'Enter annotation content',
	},
	
	groupNode: {
		label: 'Group',
		description: 'Container for organizing nodes',
		category: 'structure',
		defaultMetadata: {
			isGroup: true,
			groupChildren: [],
			groupPadding: 40,
			label: 'Group',
			backgroundColor: 'rgba(113, 113, 122, 0.1)',
			borderColor: '#52525b',
		},
		defaultWidth: 400,
		defaultHeight: 300,
		minWidth: 200,
		minHeight: 150,
		resizable: true,
		selectable: true,
		deletable: true,
		connectable: false, // Groups typically don't connect
		draggable: true,
		supportsConnection: false,
		requiresInput: false,
	},
	
	referenceNode: {
		label: 'Reference',
		description: 'Links to other nodes or maps',
		category: 'structure',
		defaultMetadata: {
			targetMapTitle: 'Untitled Map',
			contentSnippet: 'No content',
		},
		defaultWidth: 320,
		defaultHeight: 140,
		minWidth: 250,
		minHeight: 100,
		resizable: true,
		selectable: true,
		deletable: true,
		connectable: true,
		draggable: true,
		supportsConnection: true,
		requiresInput: true,
		creationPrompt: 'Select target node or map',
	},
	
	ghostNode: {
		label: 'AI Suggestion',
		description: 'AI-generated node suggestions',
		category: 'ai',
		defaultMetadata: {
			suggestedContent: '',
			suggestedType: 'defaultNode',
			confidence: 0,
		},
		defaultWidth: 280,
		defaultHeight: 150,
		minWidth: 200,
		minHeight: 100,
		resizable: false,
		selectable: true,
		deletable: true,
		connectable: false,
		draggable: false,
		supportsConnection: false,
		requiresInput: false,
	},
};

/**
 * Node Registry Class
 * 
 * Provides utilities for working with node types and their configurations.
 */
export class NodeRegistry {
	/**
	 * Get configuration for a node type
	 */
	static getConfig(nodeType: AvailableNodeTypes): NodeTypeConfig {
		return NODE_TYPE_REGISTRY[nodeType];
	}
	
	/**
	 * Get all available node types
	 */
	static getAllTypes(): AvailableNodeTypes[] {
		return Object.keys(NODE_TYPE_REGISTRY) as AvailableNodeTypes[];
	}
	
	/**
	 * Get node types by category
	 */
	static getTypesByCategory(
		category: NodeTypeConfig['category']
	): AvailableNodeTypes[] {
		return this.getAllTypes().filter(
			type => this.getConfig(type).category === category
		);
	}
	
	/**
	 * Get creatable node types (excludes system/special nodes)
	 */
	static getCreatableTypes(): AvailableNodeTypes[] {
		return this.getAllTypes().filter(
			type => type !== 'ghostNode' // Ghost nodes are system-created
		);
	}
	
	/**
	 * Check if a node type supports a feature
	 */
	static supportsFeature(
		nodeType: AvailableNodeTypes,
		feature: keyof Pick<NodeTypeConfig, 
			'supportsMarkdown' | 'supportsRichText' | 'supportsMedia' | 'supportsConnection'
		>
	): boolean {
		return Boolean(this.getConfig(nodeType)[feature]);
	}
	
	/**
	 * Get default dimensions for a node type
	 */
	static getDefaultDimensions(nodeType: AvailableNodeTypes) {
		const config = this.getConfig(nodeType);
		return {
			width: config.defaultWidth || 320,
			height: config.defaultHeight || 100,
		};
	}
	
	/**
	 * Get size constraints for a node type
	 */
	static getSizeConstraints(nodeType: AvailableNodeTypes) {
		const config = this.getConfig(nodeType);
		return {
			minWidth: config.minWidth || 100,
			minHeight: config.minHeight || 60,
			maxWidth: config.maxWidth || 800,
			maxHeight: config.maxHeight || 600,
		};
	}
	
	/**
	 * Validate if a node type is valid
	 */
	static isValidType(nodeType: string): nodeType is AvailableNodeTypes {
		return nodeType in NODE_TYPE_REGISTRY;
	}
	
	/**
	 * Get node types that can be created from inline input
	 */
	static getInlineCreatableTypes(): AvailableNodeTypes[] {
		return this.getAllTypes().filter(type => {
			const config = this.getConfig(type);
			return !config.requiresInput && type !== 'ghostNode' && type !== 'groupNode';
		});
	}
	
	/**
	 * Get node types suitable for AI suggestions
	 */
	static getAISuggestableTypes(): AvailableNodeTypes[] {
		return this.getAllTypes().filter(type => 
			type !== 'ghostNode' && type !== 'groupNode' && type !== 'referenceNode'
		);
	}
	
	/**
	 * Get display name for a node type
	 */
	static getDisplayName(nodeType: AvailableNodeTypes): string {
		return this.getConfig(nodeType).label;
	}
	
	/**
	 * Get description for a node type
	 */
	static getDescription(nodeType: AvailableNodeTypes): string {
		return this.getConfig(nodeType).description || '';
	}
	
	/**
	 * Check if node requires user input during creation
	 */
	static requiresInput(nodeType: AvailableNodeTypes): boolean {
		return Boolean(this.getConfig(nodeType).requiresInput);
	}
	
	/**
	 * Get creation prompt for a node type
	 */
	static getCreationPrompt(nodeType: AvailableNodeTypes): string {
		return this.getConfig(nodeType).creationPrompt || 'Create node';
	}
	
	/**
	 * Create node type selector data for UI components
	 */
	static getTypeSelector() {
		return this.getCreatableTypes().map(type => {
			const config = this.getConfig(type);
			return {
				value: type,
				label: config.label,
				description: config.description,
				category: config.category,
				icon: config.icon,
			};
		});
	}
	
	/**
	 * Get categorized node types for menu display
	 */
	static getCategorizedTypes() {
		const categories = ['content', 'media', 'structure', 'ai'] as const;
		
		return categories.map(category => ({
			category,
			label: category.charAt(0).toUpperCase() + category.slice(1),
			types: this.getTypesByCategory(category).map(type => ({
				type,
				config: this.getConfig(type),
			})),
		}));
	}
}

// Type-safe helpers for common operations
export function getNodeTypeConfig<T extends AvailableNodeTypes>(
	nodeType: T
): NodeTypeConfig {
	return NodeRegistry.getConfig(nodeType);
}

export function isCreatableType(nodeType: string): nodeType is AvailableNodeTypes {
	return NodeRegistry.isValidType(nodeType) && 
		NodeRegistry.getCreatableTypes().includes(nodeType);
}

export function getNodeDimensions(nodeType: AvailableNodeTypes) {
	return NodeRegistry.getDefaultDimensions(nodeType);
}

export function nodeSupportsFeature(
	nodeType: AvailableNodeTypes,
	feature: 'markdown' | 'richText' | 'media' | 'connection'
): boolean {
	const featureMap = {
		markdown: 'supportsMarkdown',
		richText: 'supportsRichText',
		media: 'supportsMedia',
		connection: 'supportsConnection',
	} as const;
	
	return NodeRegistry.supportsFeature(nodeType, featureMap[feature]);
}

export default NodeRegistry;