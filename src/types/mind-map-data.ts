export interface MindMapData {
	id: string;
	user_id: string;
	title: string;

	description: string | null;
	tags?: string[];

	thumbnailUrl?: string | null;

	is_template?: boolean;
	template_category?: string | null;

	created_at: string;
	updated_at: string;
}
