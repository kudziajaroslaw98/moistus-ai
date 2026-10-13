import type { McpToolContext } from '../context';
import { McpToolError } from '../errors';
import { buildShortIds, normalizeIdInput, resolveShortId } from '../format/short-ids';
import { getMapAccess, type McpMapAccess } from './access';
import { loadMapGraph } from './load-graph';
import { resolveMapId } from './maps';
import type { McpMapGraph } from './types';

export interface LoadedMap extends McpMapGraph {
	access: McpMapAccess;
	/** Node id → short id, unique within this map. */
	shortIds: Map<string, string>;
	/** The map id as the agent wrote it, echoed back in output. */
	mapRef: string;
}

export async function loadMapForCaller(
	ctx: McpToolContext,
	mapInput: string
): Promise<LoadedMap> {
	const mapId = await resolveMapId(ctx.supabase, ctx.userId, mapInput);
	const graph = await loadMapGraph(ctx.supabase, mapId);
	const access = await getMapAccess(ctx.supabase, graph.map, ctx.userId);

	return {
		...graph,
		access,
		shortIds: buildShortIds(graph.nodes.map((node) => node.id)),
		mapRef: normalizeIdInput(mapInput),
	};
}

export function resolveNodeId(loaded: LoadedMap, input: string): string {
	const result = resolveShortId(
		input,
		loaded.nodes.map((node) => node.id)
	);
	if (result.ok) return result.id;

	if (result.reason === 'ambiguous') {
		const options = result.candidates.map((id) => loaded.shortIds.get(id)).join(', ');
		throw new McpToolError(`Node id "${input}" matches several nodes: ${options}. Use more characters.`);
	}
	if (result.reason === 'invalid') {
		throw new McpToolError(`"${input}" is not a node id. Node ids are the [hex] at the start of each read_map line.`);
	}
	throw new McpToolError(`No node "${input}" in this map. It may have been deleted; read the map again.`);
}
