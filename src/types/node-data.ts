import { AvailableNodeTypes } from './available-node-types';
import { SuggestionContext } from './ghost-node';

export interface NodeData extends Record<string, unknown> {
	id: string;
	map_id: string;
	parent_id: string | null;
	content: string | null;
	position_x: number;
	position_y: number;
	node_type?: AvailableNodeTypes;
	width?: number | null;
	height?: number | null;

	tags?: string[] | null;
	status?: string | null;
	importance?: number | null;
	sourceUrl?: string | null;

	metadata?: {
		title?: string;
		dueDate?: string;
		priority?: string | number;
		tasks?: { id: string; text: string; isComplete: boolean }[];

		url?: string;
		faviconUrl?: string;
		thumbnailUrl?: string;
		summary?: string;
		showThumbnail?: boolean;
		showSummary?: boolean;

		imageUrl?: string;
		altText?: string;
		caption?: string;
		showCaption?: boolean;

		answer?: string;

		fontSize?: string;
		fontWeight?: number | string;
		targetNodeId?: string;
		annotationType?: 'comment' | 'idea' | 'quote' | 'summary';

		// New properties for TextNode
		textAlign?: 'left' | 'center' | 'right';
		fontStyle?: 'normal' | 'italic';
		showBackground?: boolean;
		backgroundColor?: string;
		textColor?: string;
		label?: string;
		sourceBranchNodeId?: string;
		language?: string;
		showLineNumbers?: boolean;
		fileName?: string;
		image_url?: string;
		borderColor?: string;
		isCollapsed?: boolean; // Added for collapsible branches

		// Group-related properties
		groupId?: string; // ID of the group this node belongs to
		isGroup?: boolean; // Whether this node is a group container
		groupChildren?: string[]; // Array of child node IDs (for group nodes)
		groupPadding?: number; // Padding inside the group

		suggestedContent?: string;
		suggestedType?: AvailableNodeTypes;
		confidence?: number;
		context?: SuggestionContext;

		// referencing
		targetMapId?: string;
		targetMapTitle?: string;
		contentSnippet?: string;
	} | null;
	aiData?: {
		requestAiAnswer?: boolean;
		aiAnswer?: string;
		embedding?: number[];
		aiSummary?: string;
		extractedConcepts?: string[];
		isSearchResult?: boolean;
	} | null;

	created_at: string;
	updated_at: string;
}
