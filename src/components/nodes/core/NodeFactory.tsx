/**
 * Node Factory for Type-Safe Node Creation
 * 
 * This factory provides a centralized way to create nodes with proper typing
 * and validation, ensuring consistency across the application.
 */

import { AvailableNodeTypes } from '@/types/available-node-types';
import { Position } from '@xyflow/react';
import { 
	TypedNodeData, 
	TypedNode, 
	NodeMetadataMap,
	createTypedNodeData 
} from './types';

// Default metadata for each node type
const DEFAULT_METADATA: Partial<NodeMetadataMap> = {
	defaultNode: {},
	
	textNode: {
		fontSize: '14px',
		textAlign: 'left',
		fontWeight: 400,
		fontStyle: 'normal',
		textColor: 'rgba(255, 255, 255, 0.87)',
	},
	
	taskNode: {
		tasks: [],
		status: 'pending',
	},
	
	imageNode: {
		showCaption: true,
		fitMode: 'cover',
		altText: '',
	},
	
	resourceNode: {
		showThumbnail: true,
		showSummary: true,
		url: '',
	},
	
	questionNode: {
		isAnswered: false,
	},
	
	codeNode: {
		language: 'javascript',
		showLineNumbers: true,
		fileName: '',
	},
	
	annotationNode: {
		annotationType: 'comment',
		fontSize: '14px',
		fontWeight: 400,
	},
	
	groupNode: {
		isGroup: true,
		groupChildren: [],
		groupPadding: 40,
		label: 'Group',
		backgroundColor: 'rgba(113, 113, 122, 0.1)',
		borderColor: '#52525b',
	},
	
	referenceNode: {
		targetMapTitle: 'Untitled Map',
		contentSnippet: 'No content',
	},
	
	ghostNode: {
		suggestedContent: '',
		suggestedType: 'defaultNode',
		confidence: 0,
	},
};

// Base node creation options
export interface CreateNodeOptions<T extends AvailableNodeTypes> {
	id?: string;
	mapId: string;
	content?: string;
	position: { x: number; y: number };
	nodeType: T;
	metadata?: Partial<NodeMetadataMap[T]>;
	parentId?: string;
	width?: number;
	height?: number;
}

// React Flow node creation options
export interface CreateReactFlowNodeOptions<T extends AvailableNodeTypes> 
	extends CreateNodeOptions<T> {
	selected?: boolean;
	dragging?: boolean;
	zIndex?: number;
}

/**
 * Node Factory Class
 * 
 * Provides methods for creating type-safe nodes with validation and defaults.
 */
export class NodeFactory {
	/**
	 * Create a typed node with proper defaults and validation
	 */
	static create<T extends AvailableNodeTypes>(
		options: CreateNodeOptions<T>
	): TypedNodeData<T> {
		const {
			id = crypto.randomUUID(),
			mapId,
			content = null,
			position,
			nodeType,
			metadata = {},
			parentId = null,
			width,
			height,
		} = options;

		// Merge with defaults
		const defaultMeta = DEFAULT_METADATA[nodeType] || {};
		const mergedMetadata = {
			...defaultMeta,
			...metadata,
		} as NodeMetadataMap[T];

		const now = new Date().toISOString();

		return createTypedNodeData(nodeType, {
			id,
			map_id: mapId,
			parent_id: parentId,
			content,
			position_x: position.x,
			position_y: position.y,
			width: width || null,
			height: height || null,
			created_at: now,
			updated_at: now,
			metadata: mergedMetadata,
		});
	}

	/**
	 * Create a React Flow compatible node
	 */
	static createReactFlowNode<T extends AvailableNodeTypes>(
		options: CreateReactFlowNodeOptions<T>
	): TypedNode<T> {
		const nodeData = this.create(options);
		
		return {
			id: nodeData.id,
			type: nodeData.node_type,
			position: {
				x: nodeData.position_x,
				y: nodeData.position_y,
			},
			data: nodeData,
			width: nodeData.width || undefined,
			height: nodeData.height || undefined,
			selected: options.selected || false,
			dragging: options.dragging || false,
			zIndex: options.zIndex || 1,
		} as TypedNode<T>;
	}

	/**
	 * Create a child node connected to a parent
	 */
	static createChildNode<T extends AvailableNodeTypes>(
		parentNode: TypedNode<any>,
		options: Omit<CreateNodeOptions<T>, 'position' | 'mapId'> & {
			offsetX?: number;
			offsetY?: number;
		}
	): TypedNode<T> {
		const { offsetX = 0, offsetY = 150 } = options;
		
		return this.createReactFlowNode({
			...options,
			mapId: parentNode.data.map_id,
			parentId: parentNode.data.id,
			position: {
				x: parentNode.position.x + offsetX,
				y: parentNode.position.y + offsetY,
			},
		});
	}

	/**
	 * Clone an existing node with new ID
	 */
	static clone<T extends AvailableNodeTypes>(
		sourceNode: TypedNode<T>,
		options?: {
			newId?: string;
			position?: { x: number; y: number };
			clearMetadata?: boolean;
		}
	): TypedNode<T> {
		const { 
			newId = crypto.randomUUID(), 
			position, 
			clearMetadata = false 
		} = options || {};

		const newPosition = position || {
			x: sourceNode.position.x + 50,
			y: sourceNode.position.y + 50,
		};

		const metadata = clearMetadata ? {} : sourceNode.data.metadata;

		return this.createReactFlowNode({
			id: newId,
			mapId: sourceNode.data.map_id,
			content: sourceNode.data.content,
			position: newPosition,
			nodeType: sourceNode.data.node_type,
			metadata: metadata as Partial<NodeMetadataMap[T]>,
			width: sourceNode.width,
			height: sourceNode.height,
		});
	}

	/**
	 * Update node metadata with type safety
	 */
	static updateMetadata<T extends AvailableNodeTypes>(
		node: TypedNode<T>,
		updates: Partial<NodeMetadataMap[T]>
	): TypedNode<T> {
		return {
			...node,
			data: {
				...node.data,
				metadata: {
					...node.data.metadata,
					...updates,
				} as NodeMetadataMap[T],
				updated_at: new Date().toISOString(),
			},
		};
	}

	/**
	 * Validate node structure and metadata
	 */
	static validate<T extends AvailableNodeTypes>(
		node: TypedNode<T>
	): { isValid: boolean; errors: string[] } {
		const errors: string[] = [];

		// Check required fields
		if (!node.id) errors.push('Node ID is required');
		if (!node.data.map_id) errors.push('Map ID is required');
		if (!node.data.node_type) errors.push('Node type is required');
		if (typeof node.position.x !== 'number') errors.push('Position X must be a number');
		if (typeof node.position.y !== 'number') errors.push('Position Y must be a number');

		// Validate node-specific requirements
		switch (node.data.node_type) {
			case 'taskNode':
				if (node.data.metadata && !Array.isArray((node.data.metadata as any).tasks)) {
					errors.push('Task node must have tasks array in metadata');
				}

				break;
				
			case 'groupNode':
				const groupMeta = node.data.metadata as any;
				if (!groupMeta?.isGroup) errors.push('Group node must have isGroup: true in metadata');

				if (!Array.isArray(groupMeta?.groupChildren)) {
					errors.push('Group node must have groupChildren array in metadata');
				}

				break;
				
			case 'ghostNode':
				const ghostMeta = node.data.metadata as any;
				if (!ghostMeta?.suggestedContent) errors.push('Ghost node must have suggestedContent');
				if (!ghostMeta?.suggestedType) errors.push('Ghost node must have suggestedType');

				if (typeof ghostMeta?.confidence !== 'number') {
					errors.push('Ghost node must have confidence number');
				}

				break;
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Get default metadata for a node type
	 */
	static getDefaultMetadata<T extends AvailableNodeTypes>(
		nodeType: T
	): NodeMetadataMap[T] {
		return (DEFAULT_METADATA[nodeType] || {}) as NodeMetadataMap[T];
	}

	/**
	 * Create a batch of nodes efficiently
	 */
	static createBatch<T extends AvailableNodeTypes>(
		nodes: CreateReactFlowNodeOptions<T>[]
	): TypedNode<T>[] {
		return nodes.map(options => this.createReactFlowNode(options));
	}
}

// Convenience functions for common node creation patterns
export const createDefaultNode = (
	options: Omit<CreateNodeOptions<'defaultNode'>, 'nodeType'>
) => NodeFactory.create({ ...options, nodeType: 'defaultNode' });

export const createTaskNode = (
	options: Omit<CreateNodeOptions<'taskNode'>, 'nodeType'>
) => NodeFactory.create({ ...options, nodeType: 'taskNode' });

export const createImageNode = (
	options: Omit<CreateNodeOptions<'imageNode'>, 'nodeType'>
) => NodeFactory.create({ ...options, nodeType: 'imageNode' });

export const createResourceNode = (
	options: Omit<CreateNodeOptions<'resourceNode'>, 'nodeType'>
) => NodeFactory.create({ ...options, nodeType: 'resourceNode' });

export const createQuestionNode = (
	options: Omit<CreateNodeOptions<'questionNode'>, 'nodeType'>
) => NodeFactory.create({ ...options, nodeType: 'questionNode' });

export const createCodeNode = (
	options: Omit<CreateNodeOptions<'codeNode'>, 'nodeType'>
) => NodeFactory.create({ ...options, nodeType: 'codeNode' });

export const createTextNode = (
	options: Omit<CreateNodeOptions<'textNode'>, 'nodeType'>
) => NodeFactory.create({ ...options, nodeType: 'textNode' });

export const createAnnotationNode = (
	options: Omit<CreateNodeOptions<'annotationNode'>, 'nodeType'>
) => NodeFactory.create({ ...options, nodeType: 'annotationNode' });

export const createGroupNode = (
	options: Omit<CreateNodeOptions<'groupNode'>, 'nodeType'>
) => NodeFactory.create({ ...options, nodeType: 'groupNode' });

export const createReferenceNode = (
	options: Omit<CreateNodeOptions<'referenceNode'>, 'nodeType'>
) => NodeFactory.create({ ...options, nodeType: 'referenceNode' });

export default NodeFactory;