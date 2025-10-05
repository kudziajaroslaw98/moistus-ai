import { AvailableNodeTypes } from '@/registry/node-registry';
import { SuggestionContext } from './ghost-node';

export interface NodeData extends Record<string, unknown> {
	// ==========================================
	// Core Fields - Required for all nodes
	// ==========================================
	id: string;
	map_id: string;
	parent_id: string | null;
	content: string | null;
	position_x: number;
	position_y: number;
	node_type?: AvailableNodeTypes;
	width?: number | null;
	height?: number | null;
	created_at: string;
	updated_at: string;

	// ==========================================
	// Metadata - Node-specific properties
	// ==========================================
	metadata?: {
		// ------------------------------------------
		// Display & Layout Properties
		// ------------------------------------------
		title?: string;
		label?: string;
		showBackground?: boolean;
		backgroundColor?: string;
		borderColor?: string;
		isCollapsed?: boolean;
		accentColor?: string;

		// ==========================================
		// Common Fields - Used across multiple nodes
		// ==========================================
		tags?: string[] | null;
		status?: string | null; // 'draft' | 'in-progress' | 'completed' | 'on-hold'
		priority?: string | null; // 'low' | 'medium' | 'high'

		// ------------------------------------------
		// Text Formatting (TextNode, AnnotationNode)
		// ------------------------------------------
		fontSize?: string;
		fontWeight?: number | string;
		fontStyle?: 'normal' | 'italic';
		textAlign?: 'left' | 'center' | 'right';
		textColor?: string;

		// ------------------------------------------
		// Task Properties (TaskNode)
		// ------------------------------------------
		tasks?: { id: string; text: string; isComplete: boolean }[];
		dueDate?: string;
		assignee?: string[];

		// ------------------------------------------
		// Resource/Link Properties (ResourceNode)
		// ------------------------------------------
		url?: string;
		faviconUrl?: string;
		thumbnailUrl?: string;
		resourceType?: string;

		// ------------------------------------------
		// Image Properties (ImageNode)
		// ------------------------------------------
		imageUrl?: string;
		altText?: string;
		caption?: string;
		showCaption?: boolean;
		source?: string;

		// ------------------------------------------
		// Code Properties (CodeNode)
		// ------------------------------------------
		language?: string;
		showLineNumbers?: boolean;
		fileName?: string;

		// ------------------------------------------
		// Annotation Properties (AnnotationNode)
		// ------------------------------------------
		annotationType?: 'comment' | 'idea' | 'quote' | 'summary';
		author?: string;
		timestamp?: string;

		// ------------------------------------------
		// Question Properties (QuestionNode)
		// ------------------------------------------
		answer?: string; // For QuestionNode - can be AI or user answer
		questionType?: 'binary' | 'multiple';
		responseFormat?: {
			options?: Array<{ id: string; label: string }>;
			allowMultiple?: boolean;
		};
		userResponse?: boolean | string | string[];
		isAnswered?: boolean;
		responses?: Array<{
			userId?: string;
			answer: boolean | string | string[];
			timestamp: string;
		}>;

		// ------------------------------------------
		// Content Enhancement Properties
		// ------------------------------------------
		// These can be user-provided or AI-generated
		summary?: string; // For ResourceNode or any node - can be AI or user summary
		showSummary?: boolean;
		showThumbnail?: boolean;

		// Flags to indicate AI-generated content
		isAiGenerated?: boolean; // General flag for any AI content

		// AI-specific properties
		embedding?: number[]; // Vector embedding for semantic search
		extractedConcepts?: string[]; // AI-extracted key concepts
		isSearchResult?: boolean; // Whether this node appeared in search results
		confidence?: number; // AI confidence score (0-1)

		// ------------------------------------------
		// Group Properties (GroupNode)
		// ------------------------------------------
		groupId?: string; // ID of the group this node belongs to
		isGroup?: boolean; // Whether this node is a group container
		groupChildren?: string[]; // Array of child node IDs (for group nodes)
		groupPadding?: number; // Padding inside the group

		// ------------------------------------------
		// Reference Properties (ReferenceNode)
		// ------------------------------------------
		targetNodeId?: string;
		targetMapId?: string;
		targetMapTitle?: string;
		contentSnippet?: string;

		// ------------------------------------------
		// Ghost Node Properties (AI Suggestions)
		// ------------------------------------------
		suggestedContent?: string;
		suggestedType?: AvailableNodeTypes;
		context?: SuggestionContext;
	} | null;
}
