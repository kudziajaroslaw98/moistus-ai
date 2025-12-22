import { AvailableNodeTypes } from '@/registry/node-registry';
import { NodeData } from '@/types/node-data';

/**
 * Parsed preview data from pattern-extractor
 */
export interface ParsedPreview {
	content?: string;
	text?: string;
	question?: string;
	code?: string;
	language?: string;
	url?: string;
	alt?: string;
	type?: string;
	icon?: string;
	tasks?: Array<{
		id?: string;
		text: string;
		isComplete?: boolean;
		completed?: boolean;
	}>;
	referencePreview?: {
		targetNodeId?: string;
		targetMapId?: string;
		targetMapTitle?: string;
		contentSnippet?: string;
	};
	metadata?: {
		tags?: string[];
		priority?: string;
		status?: string;
		dueDate?: string | Date;
		assignee?: string | string[];
		[key: string]: unknown;
	};
	[key: string]: unknown;
}

/**
 * Helper to convert dueDate to string format
 */
function normalizeDueDate(
	dueDate: string | Date | undefined
): string | undefined {
	if (!dueDate) return undefined;
	if (dueDate instanceof Date) {
		return dueDate.toISOString();
	}
	return dueDate;
}

/**
 * Transform parsed preview data from pattern-extractor
 * into the NodeData format expected by node components.
 */
export function transformPreviewToNodeData(
	preview: ParsedPreview | null | undefined,
	nodeType: string
): NodeData {
	const now = new Date().toISOString();

	// Normalize metadata from preview
	const previewMetadata = preview?.metadata || {};

	// Normalize assignee to always be an array
	const normalizeAssignee = (
		assignee: string | string[] | undefined
	): string[] | undefined => {
		if (!assignee) return undefined;
		return Array.isArray(assignee) ? assignee : [assignee];
	};

	const normalizedMetadata: NodeData['metadata'] = {
		...previewMetadata,
		// Ensure dueDate is a string
		dueDate: normalizeDueDate(previewMetadata.dueDate),
		// Ensure assignee is always an array
		assignee: normalizeAssignee(previewMetadata.assignee),
	};

	// Base node data structure
	const baseData: NodeData = {
		id: 'preview-node',
		map_id: 'preview-map',
		parent_id: null,
		content: preview?.content || preview?.text || preview?.question || null,
		position_x: 0,
		position_y: 0,
		node_type: nodeType as AvailableNodeTypes,
		width: null,
		height: null,
		created_at: now,
		updated_at: now,
		metadata: normalizedMetadata,
	};

	// Node-type-specific transformations
	switch (nodeType) {
		case 'taskNode': {
			// Handle tasks from either location
			type TaskType = NonNullable<ParsedPreview['tasks']>[number];
			const rawTasks: TaskType[] | undefined =
				preview?.tasks ||
				(previewMetadata.tasks as TaskType[] | undefined);
			const tasks = (rawTasks || []).map((task, index) => ({
				id: task.id || `task-${index}`,
				text: task.text,
				isComplete: task.isComplete || task.completed || false,
			}));

			baseData.metadata = {
				...baseData.metadata,
				tasks,
				status: (previewMetadata.status as string) || 'pending',
			};
			break;
		}

		case 'codeNode': {
			baseData.content = preview?.code || preview?.content || null;
			baseData.metadata = {
				...baseData.metadata,
				// Check both direct preview.language and metadata.language from pattern-extractor
				language:
					preview?.language ||
					(previewMetadata.language as string) ||
					'plaintext',
				showLineNumbers: true,
			};
			break;
		}

		case 'imageNode': {
			baseData.metadata = {
				...baseData.metadata,
				imageUrl: preview?.url || '',
				altText: preview?.alt || '',
				showCaption: true,
			};
			break;
		}

		case 'annotationNode': {
			// Look for annotationType in metadata (from pattern-extractor) or preview.type (legacy)
			const annotationType = (previewMetadata.annotationType as string) || preview?.type;
			// Must match pattern-extractor's annotationType values
			const validTypes = ['warning', 'success', 'info', 'error', 'note'] as const;
			baseData.metadata = {
				...baseData.metadata,
				annotationType: validTypes.includes(
					annotationType as (typeof validTypes)[number]
				)
					? (annotationType as (typeof validTypes)[number])
					: 'note',
			};
			break;
		}

		case 'questionNode': {
			baseData.content = preview?.question || preview?.content || null;
			const questionType = previewMetadata.questionType as string | undefined;
			const validQuestionTypes = ['binary', 'multiple'] as const;
			baseData.metadata = {
				...baseData.metadata,
				questionType: validQuestionTypes.includes(
					questionType as (typeof validQuestionTypes)[number]
				)
					? (questionType as (typeof validQuestionTypes)[number])
					: 'binary',
				isAnswered: false,
			};
			break;
		}

		case 'referenceNode': {
			if (preview?.referencePreview) {
				baseData.metadata = {
					...baseData.metadata,
					targetNodeId: preview.referencePreview.targetNodeId,
					targetMapId: preview.referencePreview.targetMapId,
					targetMapTitle:
						preview.referencePreview.targetMapTitle || 'Unknown Map',
					contentSnippet:
						preview.referencePreview.contentSnippet || 'Referenced content...',
				};
			}
			break;
		}

		case 'resourceNode': {
			baseData.metadata = {
				...baseData.metadata,
				url: preview?.url || '',
				showThumbnail: true,
				showSummary: true,
			};
			break;
		}

		case 'textNode': {
			baseData.metadata = {
				...baseData.metadata,
				fontSize: '14px',
				textAlign: 'left',
				fontWeight: 400,
				fontStyle: 'normal',
				textColor: 'rgba(255, 255, 255, 0.87)',
			};
			break;
		}

		default:
			// defaultNode and others - no special transformation needed
			break;
	}

	return baseData;
}
