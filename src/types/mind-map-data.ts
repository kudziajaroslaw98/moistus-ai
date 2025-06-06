export interface MindMapData {
	id: string;
	user_id: string;
	title: string;

	description: string | null;
	tags?: string[];
	visibility?: 'private' | 'public' | 'shared';

	thumbnailUrl?: string | null;

	created_at: string;
	updated_at: string;
}
