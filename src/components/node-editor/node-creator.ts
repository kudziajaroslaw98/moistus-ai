import { AppState } from '@/store/app-state';
import type { AppNode } from '@/types/app-node';
import type { NodeData } from '@/types/node-data';
import type { Command } from './core/commands/command-types';
import type { NodeCreationResult } from './types';
import { parseDateString } from './core/utils/date-utils';

interface CreateNodeOptions {
	command: Command;
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
		// Get node type with fallback
		const nodeType = command.nodeType || 'defaultNode';

		// Transform parsed data into node-specific data structure
		const nodeData = transformDataForNodeType(nodeType, data);

		// Create base node structure
		// Extract id from nodeData to avoid conflicts (it should be undefined for new nodes)
		const { id: _omitId, ...nodeDataWithoutId } = nodeData;
		const newNode: Omit<AppNode, 'id'> = {
			type: nodeType,
			position: position || { x: 0, y: 0 },
			data: {
				...nodeDataWithoutId,
				node_type: nodeType,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
				parent_id: parentNode?.id || null,
			} as NodeData,
		};

		// Add node to the graph
		await addNode({
			content: newNode.data.content || undefined,
			data: newNode.data,
			nodeType: nodeType, // Use the already-validated nodeType instead of newNode.type
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
// IMPORTANT: Always explicitly set fields to clear them during updates
const getUniversalMetadata = (data: any) => {
	const universalMeta: any = {};

	// Always set priority (undefined clears it on update)
	universalMeta.priority = data.metadata?.priority || data.priority || undefined;

	// Always set assignee (undefined clears it on update)
	universalMeta.assignee = data.metadata?.assignee || data.assignee || undefined;

	// Always set status (undefined clears it on update)
	universalMeta.status = data.metadata?.status || data.status || undefined;

	// Handle dueDate
	if (data.metadata?.dueDate || data.dueDate) {
		const dateValue = data.metadata?.dueDate || data.dueDate;
		// Parse date string (supports "tomorrow", "next week", ISO dates, etc.)
		const date = typeof dateValue === 'string'
			? parseDateString(dateValue)
			: dateValue instanceof Date
				? dateValue
				: undefined;

		if (date && !isNaN(date.getTime())) {
			universalMeta.dueDate = date.toISOString();
		} else {
			universalMeta.dueDate = undefined;
		}
	} else {
		universalMeta.dueDate = undefined;
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
				metadata: {
					...universalMetadata,
					tags: baseTags.length > 0 ? baseTags : undefined,
				},
			};

		case 'taskNode':
			return {
				content: data.content || '',
				metadata: {
					...universalMetadata,
					tags: baseTags.length > 0 ? baseTags : undefined,
					tasks: data.metadata?.tasks || data.tasks || [],
				},
			};

		case 'codeNode':
			return {
				content: data.code || data.content || '',
				metadata: {
					...universalMetadata,
					tags: baseTags.length > 0 ? baseTags : undefined,
					language: data.metadata?.language || data.language || 'plaintext',
					fileName: data.metadata?.fileName || data.filename,
					showLineNumbers: data.lineNumbers !== false,
				},
			};

		case 'imageNode':
			// Extract URL from content using regex
			const urlRegex = /https?:\/\/[^\s]+/g;
			const urlMatch = data.content?.match(urlRegex);
			const extractedUrl = urlMatch ? urlMatch[0] : '';

			// Remove URL from content to use rest as caption
			const caption = extractedUrl
				? data.content?.replace(extractedUrl, ' ').replace(/\s+/g, ' ').trim()
				: data.content || '';

			return {
				content: caption,
				metadata: {
					...universalMetadata,
					tags: baseTags.length > 0 ? baseTags : undefined,
					imageUrl: data.metadata?.imageUrl || data.metadata?.url || data.url || extractedUrl || '',
					altText: data.metadata?.altText || data.alt || caption || 'Image',
					caption: data.metadata?.caption || data.caption || caption || '',
					showCaption: Boolean(caption),
					fitMode: data.metadata?.fitMode || 'cover',
					source: data.metadata?.source || data.source,
				},
			};

		case 'resourceNode':
			return {
				content: data.content || data.description || '',
				metadata: {
					...universalMetadata,
					tags: baseTags.length > 0 ? baseTags : undefined,
					url: data.metadata?.url || data.url || '',
					title: data.metadata?.title || data.title || '',
					resourceType: data.metadata?.resourceType || data.type || 'link',
				},
			};

		case 'annotationNode':
			return {
				content: data.content || data.text || '',
				metadata: {
					...universalMetadata,
					tags: baseTags.length > 0 ? baseTags : undefined,
					annotationType: data.metadata?.annotationType || data.type || 'note',
				},
			};

		case 'questionNode':
			return {
				content: data.content || data.question || '',
				metadata: {
					...universalMetadata,
					tags: baseTags.length > 0 ? baseTags : undefined,
					answer: data.metadata?.answer || data.answer || '',
					questionType: data.metadata?.questionType || undefined,
					responseFormat: {
						options: data.metadata?.responseFormat?.options || [],
						allowMultiple: data.metadata?.responseFormat?.allowMultiple
					},
					responses: data.metadata?.responses || [],
				},
			};

		case 'textNode':
			return {
				content: data.content || '',
				metadata: {
					...universalMetadata,
					tags: baseTags.length > 0 ? baseTags : undefined,
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
				metadata: {
					...universalMetadata,
					tags: baseTags.length > 0 ? baseTags : undefined,
					groupId: data.metadata?.groupId || data.groupId,
					groupPadding: data.metadata?.groupPadding || data.groupPadding,
					isCollapsed: data.metadata?.isCollapsed || data.isCollapsed,
				},
			};

		case 'referenceNode':
			return {
				content: data.content || '',
				metadata: {
					...universalMetadata,
					tags: baseTags.length > 0 ? baseTags : undefined,
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
				metadata: {
					...universalMetadata,
					tags: baseTags.length > 0 ? baseTags : undefined,
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
		y: parentNode.position.y + (parentNode.measured?.height ?? 100) + VERTICAL_SPACING,
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
			// Check for URL in data.url, metadata, or content
			const urlRegex = /https?:\/\/[^\s]+/g;
			const contentUrl = data.content?.match(urlRegex)?.[0];
			const imageUrl = data.metadata?.imageUrl || data.url || contentUrl;

			if (!imageUrl || imageUrl.trim() === '') {
				return { isValid: false, error: 'Image URL is required' };
			}

			try {
				new URL(imageUrl);
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
