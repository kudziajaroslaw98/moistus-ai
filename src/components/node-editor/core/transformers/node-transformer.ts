/**
 * Node Transformer
 * Handles all data transformations between different node formats
 */

import type { AppNode } from '../../../../types/app-node';
import type { AvailableNodeTypes } from '@/registry/node-registry';
import type { NodeData } from '../../../../types/node-data';

/**
 * Transform parsed data to node data structure
 */
export function transformToNodeData(
	nodeType: AvailableNodeTypes,
	parsedData: any
): Partial<NodeData> {
	const baseData: Partial<NodeData> = {
		content: parsedData.content || '',
		tags: parsedData.metadata?.tags || [],
		node_type: nodeType,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	};

	// Add universal metadata
	const metadata: any = {};

	if (parsedData.metadata?.priority) {
		metadata.priority = parsedData.metadata.priority;
	}

	if (parsedData.metadata?.dueDate) {
		metadata.dueDate = parsedData.metadata.dueDate;
	}

	if (parsedData.metadata?.assignee) {
		metadata.assignee = parsedData.metadata.assignee;
	}

	if (parsedData.metadata?.status) {
		metadata.status = parsedData.metadata.status;
	}

	// Add node-specific metadata
	switch (nodeType) {
		case 'taskNode':
			metadata.tasks = parsedData.tasks || parsedData.metadata?.tasks || [];
			break;

		case 'codeNode':
			metadata.language =
				parsedData.language || parsedData.metadata?.language || 'javascript';
			metadata.fileName = parsedData.filename || parsedData.metadata?.fileName;
			break;

		case 'imageNode':
			metadata.imageUrl = parsedData.url || parsedData.metadata?.imageUrl || '';
			metadata.altText = parsedData.alt || parsedData.metadata?.altText || '';
			metadata.caption =
				parsedData.caption || parsedData.metadata?.caption || '';
			break;

		case 'resourceNode':
			metadata.url = parsedData.url || parsedData.metadata?.url || '';
			metadata.title = parsedData.title || parsedData.metadata?.title || '';
			metadata.resourceType =
				parsedData.type || parsedData.metadata?.resourceType || 'link';
			break;

		case 'annotationNode':
			metadata.annotationType =
				parsedData.type || parsedData.metadata?.annotationType || 'note';
			break;

		case 'questionNode':
			metadata.answer = parsedData.answer || parsedData.metadata?.answer || '';
			break;

		case 'textNode':
			metadata.fontSize = parsedData.metadata?.fontSize;
			metadata.fontWeight = parsedData.metadata?.fontWeight;
			metadata.textAlign = parsedData.metadata?.textAlign;
			metadata.textColor = parsedData.metadata?.textColor;
			break;

		case 'referenceNode':
			metadata.targetNodeId = parsedData.metadata?.targetNodeId;
			metadata.targetMapId = parsedData.metadata?.targetMapId;
			metadata.confidence = parsedData.metadata?.confidence;
			break;
	}

	baseData.metadata = metadata;
	return baseData;
}

/**
 * Transform node to form data for editing
 */
export function nodeToFormData(
	node: AppNode,
	nodeType: AvailableNodeTypes
): Record<string, any> {
	const { data } = node;
	const formData: Record<string, any> = {
		content: data.content || '',
	};

	// Add universal fields
	if (data.metadata) {
		formData.priority = data.metadata.priority || 'medium';
		formData.assignee = data.metadata.assignee || '';
		formData.status = data.metadata.status || '';

		if (data.metadata.dueDate) {
			const date = new Date(data.metadata.dueDate);
			formData.dueDate = !isNaN(date.getTime())
				? date.toISOString().split('T')[0]
				: '';
		} else {
			formData.dueDate = '';
		}

		formData.tags = data.metadata.tags || [];
	}

	// Add node-specific fields
	switch (nodeType) {
		case 'taskNode':
			formData.tasks = data.metadata?.tasks || [];
			break;

		case 'codeNode':
			formData.code = data.content || '';
			formData.language = data.metadata?.language || 'javascript';
			formData.filename = data.metadata?.fileName || '';
			break;

		case 'imageNode':
			formData.url = data.metadata?.imageUrl || '';
			formData.alt = data.metadata?.altText || '';
			formData.caption = data.metadata?.caption || '';
			break;

		case 'resourceNode':
			formData.url = data.metadata?.url || '';
			formData.title = data.metadata?.title || '';
			formData.description = data.content || '';
			formData.type = data.metadata?.resourceType || 'link';
			break;

		case 'annotationNode':
			formData.text = data.content || '';
			formData.type = data.metadata?.annotationType || 'note';
			break;

		case 'questionNode':
			formData.question = data.content || '';
			formData.answer = data.metadata?.answer || '';
			break;

		case 'textNode':
			formData.fontSize = data.metadata?.fontSize || '14px';
			formData.fontWeight = data.metadata?.fontWeight || 'normal';
			formData.textAlign = data.metadata?.textAlign || 'left';
			formData.textColor = data.metadata?.textColor || '#000000';
			break;

		case 'referenceNode':
			formData.targetNodeId = data.metadata?.targetNodeId || '';
			formData.targetMapId = data.metadata?.targetMapId || '';
			formData.confidence = data.metadata?.confidence || 0;
			break;
	}

	return formData;
}

/**
 * Transform node to quick input string for editing
 */
export function nodeToQuickInput(
	node: AppNode,
	nodeType: AvailableNodeTypes
): string {
	const { data } = node;
	let result = data.content || '';

	// Add metadata patterns
	const metadata = data.metadata || {};

	if (metadata.priority) {
		result += ` #${metadata.priority}`;
	}

	if (metadata.dueDate) {
		const date = new Date(metadata.dueDate);

		if (!isNaN(date.getTime())) {
			const dateStr = date.toISOString().split('T')[0];
			result += ` ^${dateStr}`;
		}
	}

	if (metadata.assignee) {
		const assignees = Array.isArray(metadata.assignee)
			? metadata.assignee
			: [metadata.assignee];
		assignees.forEach((a) => {
			result += ` @${a}`;
		});
	}

	if (metadata.status) {
		result += ` !${metadata.status}`;
	}

	if (metadata.tags && metadata.tags.length > 0) {
		result += ` [${metadata.tags.join(', ')}]`;
	}

	// Add node-specific patterns
	switch (nodeType) {
		case 'taskNode':
			if (metadata.tasks) {
				const taskLines = metadata.tasks.map(
					(task: any) => `${task.isComplete ? '[x]' : '[ ]'} ${task.text}`
				);
				result = taskLines.join('\n') + (result ? '\n' + result : '');
			}

			break;

		case 'codeNode':
			if (metadata.language) {
				result = `\`\`\`${metadata.language}\n${data.content || ''}\n\`\`\``;
			}

			break;

		case 'imageNode':
			if (metadata.imageUrl) {
				result = metadata.imageUrl;

				if (metadata.altText) {
					result += ` "${metadata.altText}"`;
				}
			}

			break;
	}

	return result.trim();
}

/**
 * Validate node data
 */
export function validateNodeData(
	nodeType: AvailableNodeTypes,
	data: any
): { isValid: boolean; errors: string[] } {
	const errors: string[] = [];

	// Basic content validation
	if (!data.content && nodeType !== 'taskNode' && nodeType !== 'imageNode') {
		errors.push('Content is required');
	}

	// Node-specific validation
	switch (nodeType) {
		case 'taskNode':
			if (!data.tasks || data.tasks.length === 0) {
				errors.push('At least one task is required');
			}

			break;

		case 'codeNode':
			if (!data.code || data.code.trim() === '') {
				errors.push('Code content is required');
			}

			break;

		case 'imageNode':
			const imageUrl = data.url || data.metadata?.imageUrl;

			if (!imageUrl) {
				errors.push('Image URL is required');
			} else {
				try {
					new URL(imageUrl);
				} catch {
					errors.push('Invalid image URL');
				}
			}

			break;

		case 'resourceNode':
			const resourceUrl = data.url || data.metadata?.url;

			if (!resourceUrl) {
				errors.push('Resource URL is required');
			} else {
				try {
					new URL(resourceUrl);
				} catch {
					errors.push('Invalid resource URL');
				}
			}

			break;
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}
