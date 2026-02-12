/**
 * Node Factory - Type-Safe Node Creation
 *
 * Provides utilities for creating nodes with proper typing and defaults.
 * All defaults are derived from the NodeRegistry.
 */

import {
	TypedNodeData,
	TypedNode,
	NodeMetadataMap,
	createTypedNodeData,
} from '@/components/nodes/core/types';
import { NodeRegistry, type AvailableNodeTypes } from './node-registry';

// ═══════════════════════════════════════════════
// BASE NODE CREATION OPTIONS
// ═══════════════════════════════════════════════

export interface CreateNodeOptions<T extends AvailableNodeTypes> {
	id?: string;
	mapId: string;
	content?: string;
	position: { x: number; y: number };
	nodeType: T;
	metadata?: Partial<NodeMetadataMap[T]>;
	parentId?: string;
}

// React Flow node creation options
export interface CreateReactFlowNodeOptions<T extends AvailableNodeTypes>
	extends CreateNodeOptions<T> {
	selected?: boolean;
	dragging?: boolean;
	zIndex?: number;
}

// ═══════════════════════════════════════════════
// NODE FACTORY CLASS
// ═══════════════════════════════════════════════

export class NodeFactory {
	/**
	 * Create a typed node with proper defaults from registry
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
		} = options;

		// Get defaults from registry
		const defaultMeta = NodeRegistry.getDefaultMetadata(nodeType);

		// Merge with defaults
		const mergedMetadata = {
			...defaultMeta,
			...metadata,
		} as NodeMetadataMap[T];

		const now = new Date().toISOString();

		// Warn if deprecated (development only)
		NodeRegistry.warnIfDeprecated(nodeType);

		return createTypedNodeData(nodeType, {
			id,
			map_id: mapId,
			parent_id: parentId,
			content,
			position_x: position.x,
			position_y: position.y,
			width: null,
			height: null,
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
			clearMetadata = false,
		} = options || {};

		const newPosition = position || {
			x: sourceNode.position.x + 50,
			y: sourceNode.position.y + 50,
		};

		const metadata = clearMetadata
			? NodeRegistry.getDefaultMetadata(sourceNode.data.node_type)
			: sourceNode.data.metadata;

		return this.createReactFlowNode({
			id: newId,
			mapId: sourceNode.data.map_id,
			content: sourceNode.data.content ?? undefined,
			position: newPosition,
			nodeType: sourceNode.data.node_type,
			metadata: metadata as Partial<NodeMetadataMap[T]>,
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
		if (typeof node.position.x !== 'number')
			errors.push('Position X must be a number');
		if (typeof node.position.y !== 'number')
			errors.push('Position Y must be a number');

		// Validate node type exists in registry
		if (!NodeRegistry.isValidType(node.data.node_type)) {
			errors.push(`Invalid node type: ${node.data.node_type}`);
		} else {
			// Validate metadata using Zod schema
			const metadataValidation = NodeRegistry.validateMetadata(
				node.data.node_type,
				node.data.metadata
			);

			if (!metadataValidation.success) {
				errors.push(
					`Metadata validation failed: ${metadataValidation.error.message}`
				);
			}

			// Check deprecated status
			if (NodeRegistry.isDeprecated(node.data.node_type)) {
				const info = NodeRegistry.getDeprecationInfo(node.data.node_type);

				if (info) {
					errors.push(
						`Node type "${node.data.node_type}" is deprecated: ${info.reason}`
					);
				}
			}
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Create a batch of nodes efficiently
	 */
	static createBatch<T extends AvailableNodeTypes>(
		nodes: CreateReactFlowNodeOptions<T>[]
	): TypedNode<T>[] {
		return nodes.map((options) => this.createReactFlowNode(options));
	}

}

// ═══════════════════════════════════════════════
// CONVENIENCE FUNCTIONS
// ═══════════════════════════════════════════════

/**
 * Create a defaultNode (Note)
 */
export const createDefaultNode = (
	options: Omit<CreateNodeOptions<'defaultNode'>, 'nodeType'>
) => NodeFactory.create({ ...options, nodeType: 'defaultNode' });

/**
 * Create a textNode
 */
export const createTextNode = (
	options: Omit<CreateNodeOptions<'textNode'>, 'nodeType'>
) => NodeFactory.create({ ...options, nodeType: 'textNode' });

/**
 * Create a taskNode
 */
export const createTaskNode = (
	options: Omit<CreateNodeOptions<'taskNode'>, 'nodeType'>
) => NodeFactory.create({ ...options, nodeType: 'taskNode' });

/**
 * Create an imageNode
 */
export const createImageNode = (
	options: Omit<CreateNodeOptions<'imageNode'>, 'nodeType'>
) => NodeFactory.create({ ...options, nodeType: 'imageNode' });

/**
 * Create a resourceNode
 */
export const createResourceNode = (
	options: Omit<CreateNodeOptions<'resourceNode'>, 'nodeType'>
) => NodeFactory.create({ ...options, nodeType: 'resourceNode' });

/**
 * Create a questionNode
 */
export const createQuestionNode = (
	options: Omit<CreateNodeOptions<'questionNode'>, 'nodeType'>
) => NodeFactory.create({ ...options, nodeType: 'questionNode' });

/**
 * Create a codeNode
 */
export const createCodeNode = (
	options: Omit<CreateNodeOptions<'codeNode'>, 'nodeType'>
) => NodeFactory.create({ ...options, nodeType: 'codeNode' });

/**
 * Create an annotationNode
 */
export const createAnnotationNode = (
	options: Omit<CreateNodeOptions<'annotationNode'>, 'nodeType'>
) => NodeFactory.create({ ...options, nodeType: 'annotationNode' });

/**
 * Create a groupNode
 */
export const createGroupNode = (
	options: Omit<CreateNodeOptions<'groupNode'>, 'nodeType'>
) => NodeFactory.create({ ...options, nodeType: 'groupNode' });

/**
 * Create a referenceNode
 */
export const createReferenceNode = (
	options: Omit<CreateNodeOptions<'referenceNode'>, 'nodeType'>
) => NodeFactory.create({ ...options, nodeType: 'referenceNode' });

export default NodeFactory;
