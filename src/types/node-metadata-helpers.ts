import { NodeData } from './node-data';

// ==========================================
// Status & Priority Constants
// ==========================================

export const NODE_STATUS = {
	DRAFT: 'draft',
	IN_PROGRESS: 'in-progress',
	COMPLETED: 'completed',
	ON_HOLD: 'on-hold',
} as const;

export const NODE_PRIORITY = {
	LOW: 'low',
	MEDIUM: 'medium',
	HIGH: 'high',
} as const;

export const NODE_IMPORTANCE = {
	TRIVIAL: 1,
	LOW: 2,
	MEDIUM: 3,
	HIGH: 4,
	CRITICAL: 5,
} as const;

// ==========================================
// Annotation Types
// ==========================================

export const ANNOTATION_TYPES = {
	COMMENT: 'comment',
	IDEA: 'idea',
	QUOTE: 'quote',
	SUMMARY: 'summary',
} as const;

// ==========================================
// Text Alignment
// ==========================================

export const TEXT_ALIGN = {
	LEFT: 'left',
	CENTER: 'center',
	RIGHT: 'right',
} as const;

// ==========================================
// Font Styles
// ==========================================

export const FONT_STYLE = {
	NORMAL: 'normal',
	ITALIC: 'italic',
} as const;

// ==========================================
// Type Guards
// ==========================================

export type NodeStatus = (typeof NODE_STATUS)[keyof typeof NODE_STATUS];
export type NodePriority = (typeof NODE_PRIORITY)[keyof typeof NODE_PRIORITY];
export type NodeImportance =
	(typeof NODE_IMPORTANCE)[keyof typeof NODE_IMPORTANCE];
export type AnnotationType =
	(typeof ANNOTATION_TYPES)[keyof typeof ANNOTATION_TYPES];
export type TextAlign = (typeof TEXT_ALIGN)[keyof typeof TEXT_ALIGN];
export type FontStyle = (typeof FONT_STYLE)[keyof typeof FONT_STYLE];

// ==========================================
// Helper Functions
// ==========================================

/**
 * Check if a node has tasks
 */
export const hasTaskMetadata = (data: NodeData): boolean => {
	return Boolean(data.metadata?.tasks && data.metadata.tasks.length > 0);
};

/**
 * Check if a node is part of a group
 */
export const isGroupMember = (data: NodeData): boolean => {
	return Boolean(data.metadata?.groupId);
};

/**
 * Check if a node is a group container
 */
export const isGroupContainer = (data: NodeData): boolean => {
	return Boolean(data.metadata?.isGroup);
};

/**
 * Check if a node has AI data
 */
export const hasAIData = (data: NodeData): boolean => {
	return Boolean(data.metadata?.answer);
};

/**
 * Check if a node is collapsed
 */
export const isCollapsed = (data: NodeData): boolean => {
	return Boolean(data.metadata?.isCollapsed);
};

/**
 * Get display title for a node
 */
export const getNodeDisplayTitle = (data: NodeData): string => {
	return (
		data.metadata?.title || data.metadata?.label || data.content || 'Untitled'
	);
};

/**
 * Check if node has high priority
 */
export const isHighPriority = (data: NodeData): boolean => {
	const priority = data.priority || data.metadata?.priority;

	if (typeof priority === 'string') {
		return priority === NODE_PRIORITY.HIGH;
	}

	if (typeof priority === 'number') {
		return priority >= 4;
	}

	return false;
};

/**
 * Get task completion percentage
 */
export const getTaskCompletionPercentage = (data: NodeData): number => {
	if (!data.metadata?.tasks || data.metadata.tasks.length === 0) {
		return 0;
	}

	const completed = data.metadata.tasks.filter(
		(task) => task.isComplete
	).length;
	return Math.round((completed / data.metadata.tasks.length) * 100);
};

/**
 * Check if node has external URL
 */
export const hasExternalUrl = (data: NodeData): boolean => {
	return Boolean(data.metadata?.url);
};

/**
 * Check if node has image
 */
export const hasImage = (data: NodeData): boolean => {
	return Boolean(data.metadata?.imageUrl || data.metadata?.thumbnailUrl);
};

/**
 * Get all tags from a node (handles both root level and metadata tags)
 */
export const getNodeTags = (data: NodeData): string[] => {
	const tags = data.tags || [];
	return Array.isArray(tags) ? tags : [];
};

/**
 * Check if node is a ghost/suggestion node
 */
export const isGhostNode = (data: NodeData): boolean => {
	return Boolean(
		data.metadata?.suggestedContent &&
			data.metadata?.suggestedType &&
			data.metadata?.confidence !== undefined
	);
};

/**
 * Check if node is a reference to another node/map
 */
export const isReferenceNode = (data: NodeData): boolean => {
	return Boolean(data.metadata?.targetNodeId && data.metadata?.targetMapId);
};

/**
 * Get formatted due date
 */
export const getFormattedDueDate = (data: NodeData): string | null => {
	if (!data.metadata?.dueDate) return null;

	try {
		const date = new Date(data.metadata.dueDate);
		return date.toLocaleDateString();
	} catch {
		return data.metadata.dueDate;
	}
};

/**
 * Check if due date is overdue
 */
export const isDueDateOverdue = (data: NodeData): boolean => {
	if (!data.metadata?.dueDate) return false;

	try {
		const dueDate = new Date(data.metadata.dueDate);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return dueDate < today;
	} catch {
		return false;
	}
};

/**
 * Get node type category for styling/grouping
 */
export const getNodeCategory = (
	data: NodeData
): 'content' | 'media' | 'interactive' | 'annotation' | 'structure' => {
	switch (data.node_type) {
		case 'defaultNode':
		case 'textNode':
		case 'codeNode':
			return 'content';
		case 'imageNode':
		case 'resourceNode':
			return 'media';
		case 'taskNode':
		case 'questionNode':
			return 'interactive';
		case 'annotationNode':
			return 'annotation';
		case 'groupNode':
		case 'referenceNode':
			return 'structure';
		default:
			return 'content';
	}
};

// ==========================================
// Default Values
// ==========================================

export const DEFAULT_METADATA: Partial<NodeData['metadata']> = {
	fontSize: '14px',
	fontWeight: 'normal',
	fontStyle: 'normal',
	textAlign: 'left',
	showLineNumbers: true,
	showThumbnail: false,
	showSummary: false,
	showCaption: false,
	isCollapsed: false,
	groupPadding: 40,
};

export const DEFAULT_NODE_DATA: Partial<NodeData> = {
	content: null,
	width: null,
	height: null,
	tags: null,
	status: null,
	priority: null,
	metadata: null,
	aiData: null,
};
