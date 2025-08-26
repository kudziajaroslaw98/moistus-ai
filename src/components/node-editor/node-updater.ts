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
			if (data.metadata?.tags && data.metadata.tags.length > 0) {
				content += `\n[${data.metadata.tags.join(', ')}]`;
			}
			if (data.metadata?.priority && data.metadata.priority !== 'medium') {
				content += ` #${data.metadata.priority}`;
			}
			return content;

		case 'taskNode':
			const tasks = data.metadata?.tasks || [];
			let taskContent = '';
			tasks.forEach((task: any) => {
				taskContent += `${task.isComplete ? '[x]' : '[ ]'} ${task.text}\n`;
			});
			
			// Add metadata patterns
			const metadataParts = [];
			if (data.metadata?.dueDate) {
				metadataParts.push(`@${data.metadata.dueDate.slice(0, 10)}`);
			}
			if (data.metadata?.priority && data.metadata.priority !== 'medium') {
				metadataParts.push(`#${data.metadata.priority}`);
			}
			if (data.metadata?.assignee) {
				metadataParts.push(`+${data.metadata.assignee}`);
			}
			if (data.metadata?.tags && data.metadata.tags.length > 0) {
				metadataParts.push(`[${data.metadata.tags.join(', ')}]`);
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
			let imageContent = data.metadata?.imageUrl || data.metadata?.url || '';
			if (data.metadata?.altText) {
				imageContent += ` "${data.metadata.altText}"`;
			}
			if (data.metadata?.caption) {
				imageContent += ` caption:${data.metadata.caption}`;
			}
			return imageContent;

		case 'resourceNode':
			let resourceContent = data.metadata?.url || '';
			if (data.metadata?.title) {
				resourceContent += ` "${data.metadata.title}"`;
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
			
			const annotationType = data.metadata?.annotationType || 'note';
			const emoji = typeEmojiMap[annotationType];
			
			if (emoji) {
				return `${emoji} ${data.content || ''}`;
			} else {
				return `${annotationType}: ${data.content || ''}`;
			}
			

		case 'questionNode':
			let questionContent = data.content || '';
			
			if (data.metadata?.type === 'yes-no') {
				questionContent += ' [yes/no]';
			} else if (data.metadata?.type === 'multiple-choice' && data.metadata?.options) {
				questionContent += ` [${data.metadata.options.join(',')}]`;
			}
			
			return questionContent;

		case 'textNode':
			let textContent = data.content || '';
			const metaParts = [];
			
			// Add formatting patterns
			if (data.metadata?.fontSize && data.metadata.fontSize !== '14px') {
				metaParts.push(`@${data.metadata.fontSize}`);
			}
			if (data.metadata?.textAlign && data.metadata.textAlign !== 'left') {
				metaParts.push(`align:${data.metadata.textAlign}`);
			}
			if (data.metadata?.textColor && data.metadata.textColor !== '#000000') {
				metaParts.push(`color:${data.metadata.textColor}`);
			}
			
			// Apply text formatting
			if (data.metadata?.fontWeight === 'bold') {
				textContent = `**${textContent}**`;
			}
			if (data.metadata?.fontStyle === 'italic') {
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