import { respondError } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import {
	requireSubscription,
	SubscriptionError,
} from '@/helpers/api/with-subscription-check';
import { z } from 'zod';

const requestSchema = z.object({
	mapId: z.string().uuid(),
});

/** Internal node data keys to strip from export */
const INTERNAL_DATA_KEYS = new Set([
	'id',
	'map_id',
	'user_id',
	'node_type',
	'position_x',
	'position_y',
	'aiData',
]);

/** Internal metadata keys to strip from export */
const INTERNAL_METADATA_KEYS = new Set([
	'isFetchingMetadata',
	'metadataFetchError',
	'metadataFetchedAt',
	'embedding',
	'isSearchResult',
	'confidence',
	'suggestedContent',
	'suggestedType',
	'context',
	'sourceNodeName',
]);

function stripNodeData(data: Record<string, unknown>): Record<string, unknown> {
	const clean: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(data)) {
		if (INTERNAL_DATA_KEYS.has(key)) continue;
		if (key === 'metadata' && value && typeof value === 'object') {
			const cleanMeta: Record<string, unknown> = {};
			for (const [mk, mv] of Object.entries(
				value as Record<string, unknown>
			)) {
				if (!INTERNAL_METADATA_KEYS.has(mk)) {
					cleanMeta[mk] = mv;
				}
			}
			if (Object.keys(cleanMeta).length > 0) {
				clean.metadata = cleanMeta;
			}
		} else {
			clean[key] = value;
		}
	}
	return clean;
}

export const POST = withApiValidation(
	requestSchema,
	async (_req, { mapId }, supabase, user) => {
		// Validate Pro subscription
		try {
			await requireSubscription(user, supabase, 'pro');
		} catch (error) {
			if (error instanceof SubscriptionError) {
				console.error(
					'[Export] Unauthorized JSON export attempt:',
					JSON.stringify({
						userId: user.id,
						mapId,
						code: error.code,
						timestamp: new Date().toISOString(),
					})
				);
				return respondError(
					'Pro subscription required for JSON export.',
					403,
					error.code,
					{ upgradeUrl: '/dashboard/settings/billing' }
				);
			}
			throw error;
		}

		// Verify user owns the map
		const { data: map, error: mapError } = await supabase
			.from('mind_maps')
			.select('id, user_id, title')
			.eq('id', mapId)
			.single();

		if (mapError || !map) {
			return respondError('Mind map not found.', 404, 'MAP_NOT_FOUND');
		}

		if (map.user_id !== user.id) {
			// Check shared access
			const { data: share } = await supabase
				.from('share_access')
				.select('id')
				.eq('map_id', mapId)
				.eq('user_id', user.id)
				.eq('status', 'active')
				.limit(1)
				.single();

			if (!share) {
				return respondError('Access denied.', 403, 'ACCESS_DENIED');
			}
		}

		// Fetch nodes and edges
		const [nodesResult, edgesResult] = await Promise.all([
			supabase.from('nodes').select('*').eq('map_id', mapId),
			supabase.from('edges').select('*').eq('map_id', mapId),
		]);

		if (nodesResult.error) {
			console.error('[Export] Failed to fetch nodes:', nodesResult.error);
			return respondError('Failed to fetch map data.', 500, 'FETCH_ERROR');
		}

		if (edgesResult.error) {
			console.error('[Export] Failed to fetch edges:', edgesResult.error);
			return respondError('Failed to fetch map data.', 500, 'FETCH_ERROR');
		}

		// Strip internal fields and ghost nodes
		const strippedNodes = (nodesResult.data ?? [])
			.filter((n) => n.node_type !== 'ghostNode')
			.map((node) => ({
				id: node.id,
				type: node.node_type,
				position: { x: node.position_x, y: node.position_y },
				data: stripNodeData(node.data ?? {}),
			}));

		const strippedEdges = (edgesResult.data ?? []).map((edge) => ({
			id: edge.id,
			source: edge.source,
			target: edge.target,
			type: edge.edge_type,
		}));

		const json = JSON.stringify(
			{ nodes: strippedNodes, edges: strippedEdges },
			null,
			2
		);

		const title = map.title || 'mind-map';
		const safeTitle = title.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
		const timestamp = new Date().toISOString().split('T')[0];
		const filename = `${safeTitle}-${timestamp}.json`;

		return new Response(json, {
			headers: {
				'Content-Type': 'application/json',
				'Content-Disposition': `attachment; filename="${filename}"`,
			},
		});
	}
);
