import type { LayoutDirection } from './layout-types';

export interface MindMapData {
	id: string;
	user_id: string;
	title: string;

	description: string | null;
	tags?: string[];

	thumbnailUrl?: string | null;

	is_template?: boolean;
	template_category?: string | null;
	layout_direction?: LayoutDirection | null;

	created_at: string;
	updated_at: string;
}

/**
 * Admin-only template metadata accepted by PUT /api/maps/[id] (stored in
 * `mind_maps.metadata`); not part of the loaded map row.
 */
export interface TemplateMetadataUpdates {
	template_icon?: string;
	template_preview_colors?: string[];
}

export type MindMapUpdates = Partial<MindMapData> & TemplateMetadataUpdates;
