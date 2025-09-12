/**
 * Comprehensive TypeScript Types for Node Components
 * 
 * This file provides strict typing for all node types and their metadata,
 * improving type safety and developer experience throughout the application.
 */

import { AvailableNodeTypes } from '@/types/available-node-types';
import { Node, NodeProps } from '@xyflow/react';
import { ReactNode } from 'react';

// Base metadata that all nodes can have
export interface BaseNodeMetadata {
	// Organization & workflow
	tags?: string[];
	priority?: 'low' | 'medium' | 'high' | 'critical';
	status?: 'pending' | 'in-progress' | 'completed' | 'blocked';
	assignee?: string | string[];
	dueDate?: string;
	
	// Visual customization
	accentColor?: string;
	backgroundColor?: string;
	borderColor?: string;
	
	// Grouping
	groupId?: string;
	isGroup?: boolean;
	groupChildren?: string[];
	groupPadding?: number;
	
	// Layout & display
	isCollapsed?: boolean;
	showBackground?: boolean;
	label?: string;
	title?: string;
}

// Task-specific metadata
export interface TaskNodeMetadata extends BaseNodeMetadata {
	tasks: Array<{
		id: string;
		text: string;
		isComplete: boolean;
	}>;
	// Inherits dueDate and priority from base
}

// Text formatting metadata
export interface TextNodeMetadata extends BaseNodeMetadata {
	fontSize?: string | number;
	fontWeight?: string | number;
	fontStyle?: 'normal' | 'italic';
	textAlign?: 'left' | 'center' | 'right';
	textColor?: string;
}

// Image-specific metadata
export interface ImageNodeMetadata extends BaseNodeMetadata {
	imageUrl?: string;
	image_url?: string; // Alternative naming for compatibility
	altText?: string;
	caption?: string;
	showCaption?: boolean;
	fitMode?: 'cover' | 'contain' | 'fill';
	aspectRatio?: number;
	photographer?: string;
	dimensions?: string;
	fileSize?: string;
	format?: string;
	showInfo?: boolean;
}

// Resource/link metadata
export interface ResourceNodeMetadata extends BaseNodeMetadata {
	url?: string;
	faviconUrl?: string;
	thumbnailUrl?: string;
	imageUrl?: string;
	summary?: string;
	showSummary?: boolean;
	showThumbnail?: boolean;
	title?: string;
	resourceType?: string;
}

// Question metadata
export interface QuestionNodeMetadata extends BaseNodeMetadata {
	answer?: string;
	isAnswered?: boolean;
	confidence?: number;
	source?: string;
}

// Code-specific metadata
export interface CodeNodeMetadata extends BaseNodeMetadata {
	language?: string;
	showLineNumbers?: boolean;
	fileName?: string;
	isExecutable?: boolean;
	lastExecuted?: string;
	executionTime?: number;
}

// Annotation metadata
export interface AnnotationNodeMetadata extends BaseNodeMetadata {
	annotationType?: 'comment' | 'idea' | 'quote' | 'summary';
	fontSize?: string | number;
	fontWeight?: string | number;
	author?: string;
	timestamp?: string;
}

// Reference metadata
export interface ReferenceNodeMetadata extends BaseNodeMetadata {
	targetNodeId?: string;
	targetMapId?: string;
	targetMapTitle?: string;
	contentSnippet?: string;
}

// Group-specific metadata
export interface GroupNodeMetadata extends BaseNodeMetadata {
	isGroup: true;
	groupChildren: string[];
	groupPadding: number;
	label: string;
}

// Ghost node (AI suggestion) metadata
export interface GhostNodeMetadata extends BaseNodeMetadata {
	suggestedContent: string;
	suggestedType: AvailableNodeTypes;
	confidence: number;
	context?: {
		trigger: string;
		relationshipType?: string;
	};
}

// AI-related metadata (can be added to any node)
export interface AIMetadata {
	aiData?: {
		aiAnswer?: string;
		confidence?: number;
		source?: string;
		isAiGenerated?: boolean;
		embedding?: number[];
		extractedConcepts?: string[];
	};
}

// Map all node types to their specific metadata
export interface NodeMetadataMap {
	defaultNode: BaseNodeMetadata & AIMetadata;
	textNode: TextNodeMetadata & AIMetadata;
	taskNode: TaskNodeMetadata & AIMetadata;
	imageNode: ImageNodeMetadata & AIMetadata;
	resourceNode: ResourceNodeMetadata & AIMetadata;
	questionNode: QuestionNodeMetadata & AIMetadata;
	codeNode: CodeNodeMetadata & AIMetadata;
	annotationNode: AnnotationNodeMetadata & AIMetadata;
	groupNode: GroupNodeMetadata;
	referenceNode: ReferenceNodeMetadata & AIMetadata;
	ghostNode: GhostNodeMetadata;
}

// Discriminated union for type-safe metadata access
export type TypedNodeMetadata<T extends AvailableNodeTypes> = NodeMetadataMap[T];

// Enhanced NodeData with strict typing
export interface TypedNodeData<T extends AvailableNodeTypes = AvailableNodeTypes> {
	id: string;
	map_id: string;
	parent_id: string | null;
	content: string | null;
	position_x: number;
	position_y: number;
	node_type: T;
	width?: number | null;
	height?: number | null;
	created_at: string;
	updated_at: string;
	metadata?: TypedNodeMetadata<T>;
}

// Type-safe Node with specific metadata
export type TypedNode<T extends AvailableNodeTypes> = Node<TypedNodeData<T>>;

// Type-safe NodeProps
export type TypedNodeProps<T extends AvailableNodeTypes> = NodeProps<TypedNode<T>>;

// Enhanced BaseNodeWrapper props with better typing
export interface BaseNodeWrapperProps<T extends AvailableNodeTypes = AvailableNodeTypes> 
	extends NodeProps<TypedNode<T>> {
	children: ReactNode;
	nodeClassName?: string;
	nodeIcon?: ReactNode;
	nodeType?: string;
	includePadding?: boolean;
	hideNodeType?: boolean;
	accentColor?: string;
	elevation?: number;
}

// Type guards for runtime type checking
export function isTaskNode(node: TypedNode<any>): node is TypedNode<'taskNode'> {
	return node.data.node_type === 'taskNode';
}

export function isImageNode(node: TypedNode<any>): node is TypedNode<'imageNode'> {
	return node.data.node_type === 'imageNode';
}

export function isResourceNode(node: TypedNode<any>): node is TypedNode<'resourceNode'> {
	return node.data.node_type === 'resourceNode';
}

export function isQuestionNode(node: TypedNode<any>): node is TypedNode<'questionNode'> {
	return node.data.node_type === 'questionNode';
}

export function isCodeNode(node: TypedNode<any>): node is TypedNode<'codeNode'> {
	return node.data.node_type === 'codeNode';
}

export function isAnnotationNode(node: TypedNode<any>): node is TypedNode<'annotationNode'> {
	return node.data.node_type === 'annotationNode';
}

export function isTextNode(node: TypedNode<any>): node is TypedNode<'textNode'> {
	return node.data.node_type === 'textNode';
}

export function isGroupNode(node: TypedNode<any>): node is TypedNode<'groupNode'> {
	return node.data.node_type === 'groupNode';
}

export function isReferenceNode(node: TypedNode<any>): node is TypedNode<'referenceNode'> {
	return node.data.node_type === 'referenceNode';
}

export function isGhostNode(node: TypedNode<any>): node is TypedNode<'ghostNode'> {
	return node.data.node_type === 'ghostNode';
}

// Metadata validation helpers
export function validateTaskMetadata(metadata: any): metadata is TaskNodeMetadata {
	return metadata && Array.isArray(metadata.tasks);
}

export function validateImageMetadata(metadata: any): metadata is ImageNodeMetadata {
	return metadata && (typeof metadata.imageUrl === 'string' || typeof metadata.image_url === 'string');
}

export function validateResourceMetadata(metadata: any): metadata is ResourceNodeMetadata {
	return metadata && typeof metadata.url === 'string';
}

export function validateQuestionMetadata(metadata: any): metadata is QuestionNodeMetadata {
	return metadata !== null && typeof metadata === 'object';
}

export function validateCodeMetadata(metadata: any): metadata is CodeNodeMetadata {
	return metadata && typeof metadata.language === 'string';
}

export function validateAnnotationMetadata(metadata: any): metadata is AnnotationNodeMetadata {
	return metadata && typeof metadata.annotationType === 'string';
}

export function validateGroupMetadata(metadata: any): metadata is GroupNodeMetadata {
	return metadata && metadata.isGroup === true && Array.isArray(metadata.groupChildren);
}

export function validateGhostMetadata(metadata: any): metadata is GhostNodeMetadata {
	return (
		metadata &&
		typeof metadata.suggestedContent === 'string' &&
		typeof metadata.suggestedType === 'string' &&
		typeof metadata.confidence === 'number'
	);
}

// Utility function to safely get typed metadata
export function getTypedMetadata<T extends AvailableNodeTypes>(
	node: TypedNode<any>,
	nodeType: T
): TypedNodeMetadata<T> | null {
	if (node.data.node_type !== nodeType) {
		return null;
	}
	return (node.data.metadata as TypedNodeMetadata<T>) || null;
}

// Helper to check if metadata has required properties
export function hasRequiredMetadata<T extends AvailableNodeTypes>(
	node: TypedNode<T>,
	requiredProps: Array<keyof TypedNodeMetadata<T>>
): boolean {
	if (!node.data.metadata) return false;
	
	return requiredProps.every(prop => 
		prop in node.data.metadata! && node.data.metadata![prop] !== undefined
	);
}

// Factory function for creating typed node data
export function createTypedNodeData<T extends AvailableNodeTypes>(
	nodeType: T,
	data: Omit<TypedNodeData<T>, 'node_type'>
): TypedNodeData<T> {
	return {
		...data,
		node_type: nodeType,
	} as TypedNodeData<T>;
}

export default {
	// Export all types and utilities
	isTaskNode,
	isImageNode,
	isResourceNode,
	isQuestionNode,
	isCodeNode,
	isAnnotationNode,
	isTextNode,
	isGroupNode,
	isReferenceNode,
	isGhostNode,
	validateTaskMetadata,
	validateImageMetadata,
	validateResourceMetadata,
	validateQuestionMetadata,
	validateCodeMetadata,
	validateAnnotationMetadata,
	validateGroupMetadata,
	validateGhostMetadata,
	getTypedMetadata,
	hasRequiredMetadata,
	createTypedNodeData,
};