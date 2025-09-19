import { AppState } from '@/store/app-state';
import type { AppNode } from '@/types/app-node';
import type { NodeData } from '@/types/node-data';
import type { NodeCommand, NodeCreationResult } from './types';
import { createNodeFromCommand, transformDataForNodeType } from './node-creator';

interface UpdateNodeOptions {
	command: NodeCommand;
	data: any;
	existingNode: AppNode;
	updateNode: AppState['updateNode'];
}

interface CreateOrUpdateNodeOptions {
	command: NodeCommand;
	data: any;
	mode: 'create' | 'edit';
	position?: { x: number; y: number };
	parentNode?: AppNode | null;
	existingNode?: AppNode;
	addNode?: AppState['addNode'];
	updateNode?: AppState['updateNode'];
}

export const updateNodeFromCommand = async ({
	command,
	data,
	existingNode,
	updateNode,
}: UpdateNodeOptions): Promise<NodeCreationResult> => {
	try {
		// Transform parsed data into node-specific data structure
		const nodeData = transformDataForNodeType(command.nodeType, data);

		// Update the existing node with new data
		await updateNode({
			nodeId: existingNode.id,
			data: {
				...nodeData,
				node_type: command.nodeType,
				updated_at: new Date().toISOString(),
			},
		});

		return {
			success: true,
			nodeId: existingNode.id,
		};
	} catch (error) {
		console.error('Error updating node:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to update node',
		};
	}
};

export const createOrUpdateNodeFromCommand = async ({
	command,
	data,
	mode,
	position,
	parentNode,
	existingNode,
	addNode,
	updateNode,
}: CreateOrUpdateNodeOptions): Promise<NodeCreationResult> => {
	if (mode === 'edit' && existingNode && updateNode) {
		return updateNodeFromCommand({
			command,
			data,
			existingNode,
			updateNode,
		});
	} else if (mode === 'create' && addNode) {
		return createNodeFromCommand({
			command,
			data,
			position,
			parentNode: parentNode || null,
			addNode,
		});
	} else {
		return {
			success: false,
			error: 'Invalid mode or missing required functions',
		};
	}
};

// Helper to get universal form data fields
const getUniversalFormData = (data: NodeData) => ({
	priority: data.metadata?.priority || 'medium',
	assignee: data.metadata?.assignee ? (Array.isArray(data.metadata.assignee) ? data.metadata.assignee.join(', ') : data.metadata.assignee) : '',
	status: data.metadata?.status || '',
	dueDate: data.metadata?.dueDate ? data.metadata.dueDate.slice(0, 10) : '',
	tags: data.metadata?.tags || [],
});

// Transform existing node data back to form data for editing
export const transformNodeToFormData = (
	node: AppNode,
	nodeType: string
): any => {
	const { data } = node;
	const universalFormData = getUniversalFormData(data);

	switch (nodeType) {
		case 'defaultNode':
			return {
				content: data.content || '',
				...universalFormData,
			};

		case 'taskNode':
			return {
				tasks: data.metadata?.tasks || [],
				...universalFormData,
			};

		case 'codeNode':
			return {
				code: data.content || '',
				language: data.metadata?.language || 'javascript',
				filename: data.metadata?.fileName || '',
				lineNumbers: data.metadata?.showLineNumbers !== false,
				...universalFormData,
			};

		case 'imageNode':
			return {
				url: data.metadata?.imageUrl || data.metadata?.url || '',
				alt: data.metadata?.altText || '',
				caption: data.metadata?.caption || '',
				source: data.metadata?.source || '',
				...universalFormData,
			};

		case 'resourceNode':
			return {
				url: data.metadata?.url || '',
				title: data.metadata?.title || '',
				description: data.content || '',
				type: data.metadata?.resourceType || 'link',
				...universalFormData,
			};

		case 'annotationNode':
			return {
				text: data.content || '',
				type: data.metadata?.annotationType || 'comment',
				...universalFormData,
			};

		case 'questionNode':
			return {
				question: data.content || '',
				answer: data.metadata?.answer || '',
				type: 'open',
				...universalFormData,
			};

		case 'textNode':
			return {
				content: data.content || '',
				fontSize: data.metadata?.fontSize || '14px',
				fontWeight: data.metadata?.fontWeight || 'normal',
				fontStyle: data.metadata?.fontStyle || 'normal',
				textAlign: data.metadata?.textAlign || 'left',
				textColor: data.metadata?.textColor || '#000000',
				backgroundColor: data.metadata?.backgroundColor || '',
				borderColor: data.metadata?.borderColor || '',
				...universalFormData,
			};

		case 'groupNode':
			return {
				content: data.content || '',
				groupId: data.metadata?.groupId || '',
				groupPadding: data.metadata?.groupPadding || 0,
				isCollapsed: data.metadata?.isCollapsed || false,
				...universalFormData,
			};

		case 'referenceNode':
			return {
				content: data.content || '',
				targetNodeId: data.metadata?.targetNodeId || '',
				targetMapId: data.metadata?.targetMapId || '',
				confidence: data.metadata?.confidence || 0,
				isAiGenerated: data.metadata?.isAiGenerated || false,
				...universalFormData,
			};

		default:
			return {
				content: data.content || '',
				...universalFormData,
			};
	}
};

/**
 * Universal metadata serializer helper - extracts common metadata for all nodes
 */
const serializeUniversalMetadata = (metadata?: NodeData['metadata']): string => {
	if (!metadata) return '';
	
	const parts: string[] = [];
	
	// Universal metadata that applies to ALL node types
	if (metadata.assignee?.length) {
		const assignees = Array.isArray(metadata.assignee) 
			? metadata.assignee.join(',') 
			: String(metadata.assignee);
		parts.push(`@${assignees}`);
	}
	
	if (metadata.priority) {
		parts.push(`#${metadata.priority}`);
	}
	
	if (metadata.dueDate) {
		const date = typeof metadata.dueDate === 'string' 
			? metadata.dueDate.slice(0, 10)
			: new Date(metadata.dueDate).toISOString().slice(0, 10);
		parts.push(`^${date}`);
	}
	
	if (metadata.status) {
		parts.push(`!${metadata.status}`);
	}
	
	if (metadata.tags?.length) {
		parts.push(`[${metadata.tags.join(', ')}]`);
	}
	
	return parts.join(' ');
};

/**
 * Node-specific metadata serializer - only includes relevant patterns per node type
 */
const serializeNodeSpecificMetadata = (nodeType: string, metadata?: NodeData['metadata']): string => {
	if (!metadata) return '';
	
	const parts: string[] = [];
	
	switch (nodeType) {
		case 'textNode':
			// Text formatting patterns
			if (metadata.fontSize) {
				parts.push(`~${metadata.fontSize}`);
			}
			
			if (metadata.fontWeight && metadata.fontWeight !== 'normal') {
				parts.push(`*${metadata.fontWeight}`);
			}
			
			if (metadata.fontStyle === 'italic') {
				parts.push(`/italic`);
			}
			
			if (metadata.textAlign && metadata.textAlign !== 'left') {
				parts.push(`>${metadata.textAlign}`);
			}
			
			if (metadata.textColor) {
				parts.push(`color:${metadata.textColor}`);
			}
			
			if (metadata.backgroundColor) {
				parts.push(`bg:${metadata.backgroundColor}`);
			}
			
			if (metadata.borderColor) {
				parts.push(`border:${metadata.borderColor}`);
			}

			break;

		case 'imageNode':
			// Image-specific patterns
			if (metadata.altText) {
				const escapedAlt = metadata.altText.replace(/"/g, '\\"');
				parts.push(`alt:"${escapedAlt}"`);
			}
			
			if (metadata.caption) {
				const escapedCaption = metadata.caption.replace(/"/g, '\\"');
				parts.push(`cap:"${escapedCaption}"`);
			}
			
			if (metadata.source) {
				const escapedSource = metadata.source.replace(/"/g, '\\"');
				parts.push(`src:"${escapedSource}"`);
			}

			break;

		case 'codeNode':
			// Code-specific patterns
			if (metadata.language) {
				parts.push(`lang:${metadata.language}`);
			}
			
			if (metadata.fileName) {
				parts.push(`file:${metadata.fileName}`);
			}
			
			if (metadata.showLineNumbers !== undefined) {
				parts.push(`lines:${metadata.showLineNumbers ? 'on' : 'off'}`);
			}

			break;

		case 'resourceNode':
			// Resource-specific patterns
			if (metadata.url) {
				parts.push(`url:${metadata.url}`);
			}
			
			if (metadata.title) {
				const escapedTitle = metadata.title.replace(/"/g, '\\"');
				parts.push(`title:"${escapedTitle}"`);
			}
			
			if (metadata.resourceType) {
				parts.push(`restype:${metadata.resourceType}`);
			}

			break;

		case 'annotationNode':
			// Annotation-specific patterns
			if (metadata.annotationType) {
				parts.push(`type:${metadata.annotationType}`);
			}

			break;

		case 'questionNode':
			// Question-specific patterns
			if (metadata.answer) {
				const escapedAnswer = metadata.answer.replace(/"/g, '\\"');
				parts.push(`answer:"${escapedAnswer}"`);
			}

			break;

		case 'groupNode':
			// Group-specific patterns
			if (metadata.groupId) {
				parts.push(`groupid:${metadata.groupId}`);
			}
			
			if (metadata.groupPadding !== undefined) {
				parts.push(`padding:${metadata.groupPadding}`);
			}
			
			if (metadata.isCollapsed !== undefined) {
				parts.push(`collapsed:${metadata.isCollapsed ? 'on' : 'off'}`);
			}

			break;

		case 'referenceNode':
			// Reference-specific patterns
			if (metadata.targetNodeId) {
				parts.push(`target:${metadata.targetNodeId}`);
			}
			
			if (metadata.targetMapId) {
				parts.push(`map:${metadata.targetMapId}`);
			}
			
			if (metadata.confidence !== undefined) {
				parts.push(`confidence:${metadata.confidence}`);
			}
			
			if (metadata.isAiGenerated) {
				parts.push(`ai:true`);
			}

			break;

		// taskNode and defaultNode only use universal metadata
		case 'taskNode':
		case 'defaultNode':
		default:
			// No node-specific patterns for these types
			break;
	}
	
	return parts.join(' ');
};

// Helper to convert form data for quick input parsing with node-specific metadata support
export const transformNodeToQuickInputString = (
	node: AppNode,
	nodeType: string
): string => {
	const { data } = node;

	// Get universal and node-specific metadata
	const universalMetadata = serializeUniversalMetadata(data.metadata);
	const nodeSpecificMetadata = serializeNodeSpecificMetadata(nodeType, data.metadata);
	
	// Combine metadata parts
	const allMetadata = [universalMetadata, nodeSpecificMetadata]
		.filter(Boolean)
		.join(' ');

	switch (nodeType) {
		case 'defaultNode':
			let content = data.content || '';

			if (allMetadata) {
				content += ` ${allMetadata}`;
			}

			return content;

		case 'taskNode':
			// Serialize tasks first
			const tasks = data.tasks || data.metadata?.tasks || [];
			let taskContent = '';
			tasks.forEach((task: any) => {
				taskContent += `${task.isComplete ? '[x]' : '[ ]'} ${task.text}\n`;
			});
			
			// Add metadata
			if (allMetadata) {
				taskContent += `${allMetadata}`;
			}
			
			return taskContent.trim();

		case 'codeNode':
			// Start with code block
			let codeContent = `\`\`\`${data.metadata?.language || 'javascript'}\n${data.content || ''}\n\`\`\``;
			
			// Add metadata (includes universal and code-specific patterns)
			if (allMetadata) {
				codeContent += `\n${allMetadata}`;
			}
			
			return codeContent;

		case 'imageNode':
			// Start with primary image URL
			const imageUrl = data.imageUrl || data.url || data.metadata?.imageUrl || data.metadata?.url || '';
			let imageContent = imageUrl;
			
			// Add metadata (includes universal and image-specific patterns)
			if (allMetadata) {
				imageContent += ` ${allMetadata}`;
			}
			
			return imageContent;

		case 'resourceNode':
			// Start with primary URL
			const resourceUrl = data.url || data.metadata?.url || '';
			let resourceContent = resourceUrl;
			
			// Add description if present
			if (data.content) {
				resourceContent += ` desc:"${data.content.replace(/"/g, '\\"')}"`;
			}
			
			// Add metadata (includes universal and resource-specific patterns)
			if (allMetadata) {
				resourceContent += ` ${allMetadata}`;
			}
			
			return resourceContent;

		case 'annotationNode':
			// Keep emoji mapping for backward compatibility
			const typeEmojiMap: Record<string, string> = {
				'warning': '⚠️',
				'success': '✅',
				'info': 'ℹ️',
				'error': '❌',
				'note': '💡'
			};
			
			const annotationType = data.annotationType || data.type || data.metadata?.annotationType || 'note';
			const emoji = typeEmojiMap[annotationType];
			
			let annotationContent = '';

			if (emoji) {
				annotationContent = `${emoji} ${data.content || ''}`;
			} else {
				annotationContent = `${data.content || ''}`;
			}
			
			// Add metadata (includes universal and annotation-specific patterns)
			if (allMetadata) {
				annotationContent += ` ${allMetadata}`;
			}
			
			return annotationContent;

		case 'questionNode':
			let questionContent = data.content || '';
			
			// Add metadata (includes universal and question-specific patterns)
			if (allMetadata) {
				questionContent += ` ${allMetadata}`;
			}
			
			return questionContent;

		case 'textNode':
			let textContent = data.content || '';
			
			// Add metadata (includes universal and text formatting patterns)
			if (allMetadata) {
				textContent += ` ${allMetadata}`;
			}
			
			return textContent;

		case 'groupNode':
			let groupContent = data.content || data.metadata?.label || 'Group';
			
			// Add metadata (includes universal and group-specific patterns)
			if (allMetadata) {
				groupContent += ` ${allMetadata}`;
			}
			
			return groupContent;

		case 'referenceNode':
			let refContent = data.content || '';
			
			// Add metadata (includes universal and reference-specific patterns)
			if (allMetadata) {
				refContent += ` ${allMetadata}`;
			}
			
			return refContent;

		default:
			// Universal fallback for any new node types
			let defaultContent = data.content || '';
			
			// Add universal metadata only (no node-specific patterns for unknown types)
			if (universalMetadata) {
				defaultContent += ` ${universalMetadata}`;
			}
			
			return defaultContent;
	}
};