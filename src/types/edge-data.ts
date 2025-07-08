import type { PathType } from './path-types';

export interface EdgeData extends Record<string, unknown> {
	id: string;
	map_id: string;
	user_id: string;
	source: string;
	target: string;
	type?: string; // This will now be more static, e.g., 'floatingEdge'
	label?: string | null;
	created_at?: string;
	updated_at?: string;
	animated?: boolean;
	markerEnd?: string;
	markerStart?: string;
	style?: {
		stroke?: string;
		strokeWidth?: string | number;
	} | null;
	metadata?: {
		pathType?: PathType; // Added pathType
	} | null;
	aiData?: {
		isSuggested?: boolean | null;
		reason?: string | null;
		suggestion?: {
			node1Id: string;
			node2Id: string;
			reason?: string;
			similarityScore?: number;
			confidence?: number;
		};
	} | null;
}
