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

// Transform existing node data back to form data for editing
export const transformNodeToFormData = (
	node: AppNode,
	nodeType: string
): any => {
	const { data } = node;

	switch (nodeType) {
		case 'defaultNode':
			return {
				content: data.content || '',
				tags: data.metadata?.tags || [],
				priority: data.metadata?.priority || 'medium',
			};

		case 'taskNode':
			return {
				tasks: data.metadata?.tasks || [],
				dueDate: data.metadata?.dueDate ? data.metadata.dueDate.slice(0, 10) : '',
				priority: data.metadata?.priority || 'medium',
				assignee: data.metadata?.assignee ? data.metadata.assignee.join(', ') : '',
				tags: data.metadata?.tags || [],
			};

		case 'codeNode':
			return {
				code: data.content || '',
				language: data.metadata?.language || 'javascript',
				filename: data.metadata?.fileName || '',
				lineNumbers: data.metadata?.showLineNumbers !== false,
			};

		case 'imageNode':
			return {
				url: data.metadata?.imageUrl || data.metadata?.url || '',
				alt: data.metadata?.altText || '',
				caption: data.metadata?.caption || '',
				source: data.metadata?.source || '',
			};

		case 'resourceNode':
			return {
				url: data.metadata?.url || '',
				title: data.metadata?.title || '',
				description: data.content || '',
				type: data.metadata?.resourceType || 'link',
			};

		case 'annotationNode':
			return {
				text: data.content || '',
				type: data.metadata?.annotationType || 'comment',
			};

		case 'questionNode':
			return {
				question: data.content || '',
				answer: data.metadata?.answer || '',
				type: 'open',
			};

		case 'textNode':
			return {
				content: data.content || '',
				metadata: {
					fontSize: data.metadata?.fontSize || '14px',
					fontWeight: data.metadata?.fontWeight || 'normal',
					fontStyle: data.metadata?.fontStyle || 'normal',
					textAlign: data.metadata?.textAlign || 'left',
					textColor: data.metadata?.textColor || '#000000',
				},
			};

		default:
			return {
				content: data.content || '',
			};
	}
};

// Helper to convert form data for quick input parsing
export const transformNodeToQuickInputString = (
	node: AppNode,
	nodeType: string
): string => {
	const { data } = node;

	switch (nodeType) {
		case 'defaultNode':
			let content = data.content || '';
			const tags = data.tags || data.metadata?.tags;
			const priority = data.priority || data.metadata?.priority;
			
			if (tags && tags.length > 0) {
				content += `\n[${tags.join(', ')}]`;
			}
			if (priority && priority !== 'medium') {
				content += ` #${priority}`;
			}
			return content;

		case 'taskNode':
			// Try both flat structure (data.tasks) and nested structure (data.metadata.tasks)
			const tasks = data.tasks || data.metadata?.tasks || [];
			let taskContent = '';
			tasks.forEach((task: any) => {
				taskContent += `${task.isComplete ? '[x]' : '[ ]'} ${task.text}\n`;
			});
			
			// Add metadata patterns with new unique prefixes
			const metadataParts = [];
			const taskDueDate = data.dueDate || data.metadata?.dueDate;
			const taskPriority = data.priority || data.metadata?.priority;
			const taskAssignee = data.assignee || data.metadata?.assignee;
			const taskTags = data.tags || data.metadata?.tags;
			
			if (taskDueDate) {
				const dateStr = typeof taskDueDate === 'string' ? taskDueDate : taskDueDate.toString();
				metadataParts.push(`^${dateStr.slice(0, 10)}`);
			}
			if (taskPriority && taskPriority !== 'medium') {
				metadataParts.push(`#${taskPriority}`);
			}
			if (taskAssignee) {
				// Fix: properly handle assignee array
				const assigneeList = Array.isArray(taskAssignee) 
					? taskAssignee.join(',') 
					: taskAssignee;
				metadataParts.push(`@${assigneeList}`);
			}
			if (taskTags && taskTags.length > 0) {
				metadataParts.push(`[${taskTags.join(', ')}]`);
			}
			
			if (metadataParts.length > 0) {
				taskContent += `\n${metadataParts.join(' ')}`;
			}
			
			return taskContent;

		case 'codeNode':
			let codeContent = `\`\`\`${data.metadata?.language || 'javascript'}\n${data.content || ''}\n\`\`\``;
			if (data.metadata?.fileName) {
				codeContent = `file:${data.metadata.fileName}\n${codeContent}`;
			}
			return codeContent;

		case 'imageNode':
			const imageUrl = data.imageUrl || data.url || data.metadata?.imageUrl || data.metadata?.url || '';
			const altText = data.altText || data.metadata?.altText;
			const caption = data.caption || data.metadata?.caption;
			
			let imageContent = imageUrl;
			if (altText) {
				imageContent += ` "${altText}"`;
			}
			if (caption) {
				imageContent += ` cap:${caption}`;
			}
			return imageContent;

		case 'resourceNode':
			const resourceUrl = data.url || data.metadata?.url || '';
			const resourceTitle = data.title || data.metadata?.title;
			
			let resourceContent = resourceUrl;
			if (resourceTitle) {
				resourceContent += ` "${resourceTitle}"`;
			}
			if (data.content) {
				resourceContent += ` desc:${data.content}`;
			}
			return resourceContent;

		case 'annotationNode':
			// Map annotation types to emojis if we have icon data, otherwise use type: format
			const typeEmojiMap: Record<string, string> = {
				'warning': '⚠️',
				'success': '✅',
				'info': 'ℹ️',
				'error': '❌',
				'note': '💡'
			};
			
			const annotationType = data.annotationType || data.type || data.metadata?.annotationType || 'note';
			const emoji = typeEmojiMap[annotationType];
			
			if (emoji) {
				return `${emoji} ${data.content || ''}`;
			} else {
				return `${annotationType}: ${data.content || ''}`;
			}
			

		case 'questionNode':
			let questionContent = data.content || '';
			const questionType = data.type || data.metadata?.type;
			const options = data.options || data.metadata?.options;
			
			if (questionType === 'yes-no') {
				questionContent += ' [yes/no]';
			} else if (questionType === 'multiple-choice' && options) {
				questionContent += ` [${options.join(',')}]`;
			}
			
			return questionContent;

		case 'textNode':
			let textContent = data.content || '';
			const metaParts = [];
			
			// Handle both flat and nested metadata structures
			const fontSize = data.fontSize || data.metadata?.fontSize;
			const textAlign = data.textAlign || data.metadata?.textAlign;
			const textColor = data.textColor || data.metadata?.textColor;
			const fontWeight = data.fontWeight || data.metadata?.fontWeight;
			const fontStyle = data.fontStyle || data.metadata?.fontStyle;
			
			// Add formatting patterns with new unique prefixes
			if (fontSize && fontSize !== '14px') {
				metaParts.push(`sz:${fontSize}`);
			}
			if (textAlign && textAlign !== 'left') {
				metaParts.push(`align:${textAlign}`);
			}
			if (textColor && textColor !== '#000000') {
				metaParts.push(`color:${textColor}`);
			}
			
			// Apply text formatting
			if (fontWeight === 'bold') {
				textContent = `**${textContent}**`;
			}
			if (fontStyle === 'italic') {
				textContent = `*${textContent}*`;
			}
			
			// Add metadata patterns
			if (metaParts.length > 0) {
				textContent += ` ${metaParts.join(' ')}`;
			}
			
			return textContent;

		default:
			return data.content || '';
	}
};