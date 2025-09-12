import { AppState } from '@/store/app-state';
import type { AppNode } from '@/types/app-node';
import type { NodeData } from '@/types/node-data';
import type { NodeCommand, NodeCreationResult } from './types';

interface CreateNodeOptions {
	command: NodeCommand;
	data: any;
	position?: { x: number; y: number };
	parentNode: AppNode | null;
	addNode: AppState['addNode'];
}

export const createNodeFromCommand = async ({
	command,
	data,
	position,
	parentNode,
	addNode,
}: CreateNodeOptions): Promise<NodeCreationResult> => {
	try {
		// Transform parsed data into node-specific data structure
		const nodeData = transformDataForNodeType(command.nodeType, data);

		// Create base node structure
		const newNode: Omit<AppNode, 'id'> = {
			type: command.nodeType,
			data: {
				...nodeData,
				node_type: command.nodeType,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
				parent_id: parentNode?.id || null,
			},
		};

		// Add node to the graph
		await addNode({
			content: newNode.data.content || undefined,
			data: newNode.data,
			nodeType: newNode.type,
			parentNode,
			position,
		});

		return {
			success: true,
		};
	} catch (error) {
		console.error('Error creating node:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to create node',
		};
	}
};

// Helper to extract universal metadata that applies to all node types
const getUniversalMetadata = (data: any) => {
	const universalMeta: any = {};
	
	if (data.metadata?.priority || data.priority) {
		universalMeta.priority = data.metadata?.priority || data.priority;
	}
	
	if (data.metadata?.assignee || data.assignee) {
		universalMeta.assignee = data.metadata?.assignee || data.assignee;
	}
	
	if (data.metadata?.status || data.status) {
		universalMeta.status = data.metadata?.status || data.status;
	}
	
	if (data.metadata?.dueDate || data.dueDate) {
		universalMeta.dueDate = new Date(data.metadata?.dueDate || data.dueDate).toISOString();
	}
	
	return universalMeta;
};

// Transform parsed data based on node type
export const transformDataForNodeType = (
	nodeType: string,
	data: any
): Partial<NodeData> => {
	const universalMetadata = getUniversalMetadata(data);
	const baseTags = data.metadata?.tags || data.tags || [];

	switch (nodeType) {
		case 'defaultNode':
			return {
				content: data.content || '',
				tags: baseTags,
				metadata: {
					...universalMetadata,
				},
			};

		case 'taskNode':
			return {
				content: data.content || '',
				tags: baseTags,
				metadata: {
					...universalMetadata,
					tasks: data.metadata?.tasks || data.tasks || [],
				},
			};

		case 'codeNode':
			return {
				content: data.code || data.content || '',
				tags: baseTags,
				metadata: {
					...universalMetadata,
					language: data.metadata?.language || data.language || 'plaintext',
					fileName: data.metadata?.fileName || data.filename,
					showLineNumbers: data.lineNumbers !== false,
				},
			};

		case 'imageNode':
			return {
				content: data.content || '',
				tags: baseTags,
				metadata: {
					...universalMetadata,
					imageUrl: data.metadata?.imageUrl || data.url || '',
					altText: data.metadata?.altText || data.alt || '',
					caption: data.metadata?.caption || data.caption || '',
					source: data.metadata?.source || data.source,
				},
			};

		case 'resourceNode':
			return {
				content: data.content || data.description || '',
				tags: baseTags,
				metadata: {
					...universalMetadata,
					url: data.metadata?.url || data.url || '',
					title: data.metadata?.title || data.title || '',
					resourceType: data.metadata?.resourceType || data.type || 'link',
				},
			};

		case 'annotationNode':
			return {
				content: data.content || data.text || '',
				tags: baseTags,
				metadata: {
					...universalMetadata,
					annotationType: data.metadata?.annotationType || data.type || 'comment',
				},
			};

		case 'questionNode':
			return {
				content: data.content || data.question || '',
				tags: baseTags,
				metadata: {
					...universalMetadata,
					answer: data.metadata?.answer || data.answer || '',
				},
			};

		case 'textNode':
			return {
				content: data.content || '',
				tags: baseTags,
				metadata: {
					...universalMetadata,
					fontSize: data.metadata?.fontSize || data.fontSize,
					fontWeight: data.metadata?.fontWeight || data.fontWeight,
					fontStyle: data.metadata?.fontStyle || data.fontStyle,
					textAlign: data.metadata?.textAlign || data.textAlign,
					textColor: data.metadata?.textColor || data.textColor,
					backgroundColor: data.metadata?.backgroundColor || data.backgroundColor,
					borderColor: data.metadata?.borderColor || data.borderColor,
				},
			};

		case 'groupNode':
			return {
				content: data.content || '',
				tags: baseTags,
				metadata: {
					...universalMetadata,
					groupId: data.metadata?.groupId || data.groupId,
					groupPadding: data.metadata?.groupPadding || data.groupPadding,
					isCollapsed: data.metadata?.isCollapsed || data.isCollapsed,
				},
			};

		case 'referenceNode':
			return {
				content: data.content || '',
				tags: baseTags,
				metadata: {
					...universalMetadata,
					targetNodeId: data.metadata?.targetNodeId || data.targetNodeId,
					targetMapId: data.metadata?.targetMapId || data.targetMapId,
					confidence: data.metadata?.confidence || data.confidence,
					isAiGenerated: data.metadata?.isAiGenerated || data.isAiGenerated,
				},
			};

		default:
			// Fallback for any unknown node types
			return {
				content: data.content || '',
				tags: baseTags,
				metadata: {
					...universalMetadata,
				},
			};
	}
};

// Helper to generate child position
export const getChildPosition = (
	parentNode: AppNode,
	siblingCount: number = 0
): { x: number; y: number } => {
	const VERTICAL_SPACING = 120;
	const HORIZONTAL_SPACING = 200;

	return {
		x:
			parentNode.position.x +
			(siblingCount % 3) * HORIZONTAL_SPACING -
			HORIZONTAL_SPACING,
		y: parentNode.position.y + (parentNode.height || 100) + VERTICAL_SPACING,
	};
};

// Helper to validate node data
export const validateNodeData = (
	nodeType: string,
	data: any
): { isValid: boolean; error?: string } => {
	switch (nodeType) {
		case 'taskNode':
			if (!data.tasks || data.tasks.length === 0) {
				return { isValid: false, error: 'At least one task is required' };
			}

			break;

		case 'codeNode':
			if (!data.code || data.code.trim() === '') {
				return { isValid: false, error: 'Code content is required' };
			}

			break;

		case 'imageNode':
			if (!data.url || data.url.trim() === '') {
				return { isValid: false, error: 'Image URL is required' };
			}

			try {
				new URL(data.url);
			} catch {
				return { isValid: false, error: 'Invalid image URL' };
			}

			break;

		case 'resourceNode':
			if (!data.url || data.url.trim() === '') {
				return { isValid: false, error: 'Resource URL is required' };
			}

			try {
				new URL(data.url);
			} catch {
				return { isValid: false, error: 'Invalid resource URL' };
			}

			break;

		case 'questionNode':
			if (!data.question || data.question.trim() === '') {
				return { isValid: false, error: 'Question is required' };
			}

			break;

		case 'annotationNode':
			if (!data.text || data.text.trim() === '') {
				return { isValid: false, error: 'Annotation text is required' };
			}

			break;

		default:
			if (!data.content || data.content.trim() === '') {
				return { isValid: false, error: 'Content is required' };
			}
	}

	return { isValid: true };
};
