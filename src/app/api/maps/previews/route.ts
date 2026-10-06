import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import {
	buildMapPreview,
	MAP_PREVIEW_MAX_NODES,
	MAX_PREVIEW_MAP_IDS,
	type MapPreview,
} from '@/helpers/dashboard/map-preview';
import { z } from 'zod';

const MAX_PREVIEW_EDGES = 80;

const requestBodySchema = z.object({
	ids: z.array(z.string().uuid()).min(1).max(MAX_PREVIEW_MAP_IDS),
});

/**
 * POST /api/maps/previews
 *
 * Small structure previews (scaled node rects + edge index pairs) for
 * dashboard and template cards. Uses the user-session client, so RLS decides
 * which maps are readable; unreadable or empty maps return an empty preview.
 * Each map reads at most 40 nodes (oldest first, so roots come first).
 */
export const POST = withApiValidation(
	requestBodySchema,
	async (_req, { ids }, supabase) => {
		try {
			const uniqueIds = [...new Set(ids)];

			const entries = await Promise.all(
				uniqueIds.map(async (mapId): Promise<[string, MapPreview]> => {
					const { data: nodes, error: nodesError } = await supabase
						.from('nodes')
						.select('id, position_x, position_y, width, height, node_type')
						.eq('map_id', mapId)
						.order('created_at', { ascending: true })
						.limit(MAP_PREVIEW_MAX_NODES);

					if (nodesError || !nodes?.length) {
						return [mapId, { nodes: [], edges: [] }];
					}

					const { data: edges } = await supabase
						.from('edges')
						.select('source, target')
						.eq('map_id', mapId)
						.in(
							'source',
							nodes.map((node) => node.id)
						)
						.limit(MAX_PREVIEW_EDGES);

					return [mapId, buildMapPreview(nodes, edges ?? [])];
				})
			);

			return respondSuccess(
				{ previews: Object.fromEntries(entries) },
				200,
				'Map previews fetched successfully.'
			);
		} catch (error) {
			console.error('Error in POST /api/maps/previews:', error);
			return respondError(
				'Error fetching map previews.',
				500,
				'Internal server error.'
			);
		}
	}
);
