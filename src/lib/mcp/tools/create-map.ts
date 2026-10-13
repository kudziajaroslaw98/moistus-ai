import { z } from 'zod';
import generateUuid from '@/helpers/generate-uuid';
import { commitWorkingGraph } from '../graph/commit';
import { applyEditOps, createWorkingGraph } from '../graph/edit-plan';
import { buildMapShortIds, listAccessibleMaps } from '../graph/maps';
import { placeNewNodes } from '../graph/placement';
import { defineMcpTool } from '../tool-types';
import { MAX_TEXT_PER_CALL } from './edit-map';
import { agentActor, describeCommit } from './write-summary';

/** Same edge look as the app's tree presets: straight custom-layout lines. */
const PRESET_EDGE_METADATA = { pathType: 'waypoint', curveType: 'linear', routingStyle: 'custom-layout' } as const;

export const createMapTool = defineMcpTool({
	name: 'create_map',
	kind: 'write',
	summary: 'Create a new map, optionally filled from an outline in one call (laid out as a tree).',
	keywords: ['create', 'new', 'map', 'start', 'build', 'outline', 'import'],
	input: z.strictObject({
		title: z.string().trim().min(1).max(200),
		description: z.string().trim().max(2000).optional(),
		outline: z.string().max(MAX_TEXT_PER_CALL).optional().describe('Map content in outline syntax'),
		layout: z.enum(['tree-right', 'tree-down']).default('tree-right'),
	}),
	example: {
		title: 'Dune: characters and plot',
		outline: 'Dune\n  Paul Atreides &paul #character\n  Jessica &jessica #character\n---\n&jessica -> &paul : mother of',
	},
	async run({ title, description, outline, layout }, ctx) {
		const mapId = generateUuid();
		const direction = layout === 'tree-down' ? 'TOP_BOTTOM' : 'LEFT_RIGHT';
		const graph = createWorkingGraph({ mapId, userId: ctx.userId, direction, nodes: [], edges: [] });

		if (outline?.trim()) applyEditOps(graph, [{ op: 'outline', text: outline }]);
		placeNewNodes(graph);
		for (const [id, edge] of graph.edges) {
			graph.edges.set(id, { ...edge, type: 'waypointEdge', metadata: { ...PRESET_EDGE_METADATA } });
		}

		const { actor, name } = await agentActor(ctx);
		const result = await commitWorkingGraph(ctx, graph, {
			actor,
			actionName: `${name} created the map`,
			newMap: { title, description: description ?? null, layoutDirection: direction },
		});

		const maps = await listAccessibleMaps(ctx.supabase, ctx.userId);
		const shortId = buildMapShortIds(maps).get(mapId) ?? mapId;
		return [
			`Created map ${shortId} "${title}". Open it: ${ctx.appOrigin}/mind-map/${mapId}`,
			describeCommit(graph, result, name),
		].join('\n');
	},
});
