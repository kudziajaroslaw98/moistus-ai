import type { SupabaseClient } from '@supabase/supabase-js';
import type { EdgeData } from '@/types/edge-data';
import { normalizeLayoutDirection } from '@/types/layout-types';
import type { NodeData } from '@/types/node-data';
import { McpToolError } from '../errors';
import { isStructuralEdge, isVisibleNode, type McpMapGraph } from './types';

interface AggregatedMapRow {
	map_id: string;
	user_id: string;
	title: string | null;
	description: string | null;
	tags: string[] | null;
	is_template: boolean | null;
	layout_direction: string | null;
	map_updated_at: string;
	nodes: NodeData[] | null;
	edges: EdgeData[] | null;
}

/**
 * Loads one map with the caller's client, so RLS decides whether they can
 * see it. Hidden node types and non-structural edges are dropped here.
 */
export async function loadMapGraph(
	supabase: SupabaseClient,
	mapId: string
): Promise<McpMapGraph> {
	const { data, error } = await supabase
		.from('map_graph_aggregated_view')
		.select('*')
		.eq('map_id', mapId)
		.maybeSingle<AggregatedMapRow>();

	if (error) throw new McpToolError(`Could not load the map: ${error.message}`);
	if (!data) throw new McpToolError('Map not found, or you no longer have access to it.');

	const nodes = (data.nodes ?? []).filter(isVisibleNode);
	const nodeIds = new Set(nodes.map((node) => node.id));
	const edges = (data.edges ?? []).filter(
		(edge) => isStructuralEdge(edge) && nodeIds.has(edge.source) && nodeIds.has(edge.target)
	);

	return {
		map: {
			id: data.map_id,
			ownerId: data.user_id,
			title: data.title ?? 'Untitled map',
			description: data.description,
			tags: data.tags ?? [],
			isTemplate: data.is_template === true,
			layoutDirection: normalizeLayoutDirection(data.layout_direction),
			updatedAt: data.map_updated_at,
		},
		nodes,
		edges,
	};
}
