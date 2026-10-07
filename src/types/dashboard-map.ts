import type { MapCollaborator } from '@/helpers/dashboard/map-collaborators';

/** One row of `GET /api/maps` as the dashboard uses it. */
export interface DashboardMap {
	id: string;
	user_id: string;
	title: string;
	description: string | null;
	created_at: string;
	updated_at: string;
	is_template?: boolean;
	template_category?: string;
	/** True when the map belongs to someone else and was shared with the viewer. */
	is_shared?: boolean;
	_count?: {
		nodes: number;
		edges: number;
	};
	/** Up to 3 people with access, excluding the viewer (owner first). */
	collaborators?: MapCollaborator[];
	collaboratorCount?: number;
}

export type DashboardViewMode = 'grid' | 'list';
