import { z } from 'zod';
import { McpToolError } from '../errors';
import { commitWorkingGraph, diffWorkingGraph, isEmptyChangeSet } from '../graph/commit';
import { applyEditOps, createWorkingGraph, type MapEditOp } from '../graph/edit-plan';
import { loadMapForCaller } from '../graph/loaded-map';
import { placeNewNodes } from '../graph/placement';
import { defineMcpTool } from '../tool-types';
import { agentActor, describeCommit } from './write-summary';

export const MAX_OPS_PER_CALL = 300;
export const MAX_TEXT_PER_CALL = 200_000;

const nodeId = z.string().min(1).describe('Short id, full id, or &ref from earlier in this call');
const LABEL = z.string().max(200);

export const editOpSchema = z.discriminatedUnion('op', [
	z.strictObject({
		op: z.literal('outline'),
		under: nodeId.optional().describe('Attach top-level lines under this node'),
		text: z.string().min(1).describe('Outline text (guide syntax)'),
	}),
	z.strictObject({ op: z.literal('add'), under: nodeId.optional(), text: z.string().min(1) }),
	z.strictObject({
		op: z.literal('update'),
		id: nodeId,
		text: z.string().optional().describe('New node line (+ | lines / [ ] rows); replaces text and tokens'),
		type: z.string().optional().describe('note, text, task, question, annotation, code, link, image'),
		tags: z.array(z.string().max(60)).max(30).optional(),
		title: z.string().max(300).optional(),
		collapsed: z.boolean().optional(),
	}),
	z.strictObject({ op: z.literal('move'), id: nodeId, under: nodeId.nullable().describe('null = top level') }),
	z.strictObject({
		op: z.literal('delete'),
		ids: z.array(nodeId).min(1).max(MAX_OPS_PER_CALL),
		withDescendants: z.boolean().optional(),
	}),
	z.strictObject({ op: z.literal('link'), from: nodeId, to: nodeId, label: LABEL.optional() }),
	z.strictObject({ op: z.literal('unlink'), from: nodeId, to: nodeId }),
	z.strictObject({ op: z.literal('label'), from: nodeId, to: nodeId, label: LABEL }),
]);

const textLength = (ops: MapEditOp[]) =>
	ops.reduce((sum, op) => sum + ('text' in op && op.text ? op.text.length : 0), 0);

export const editMapTool = defineMcpTool({
	name: 'edit_map',
	kind: 'write',
	summary:
		'Change a map in one atomic call: add outlines or nodes, update, move, delete nodes; add, label or remove links.',
	keywords: ['edit', 'add', 'update', 'change', 'delete', 'remove', 'move', 'link', 'connect', 'write', 'nodes'],
	input: z
		.strictObject({
			map: z.string().describe('Map id'),
			ops: z.array(editOpSchema).min(1).max(MAX_OPS_PER_CALL),
			place: z
				.enum(['auto', 'none'])
				.default('auto')
				.describe('auto positions new and moved nodes next to their parent'),
		})
		.refine((args) => textLength(args.ops) <= MAX_TEXT_PER_CALL, {
			message: `Text across all ops must be under ${MAX_TEXT_PER_CALL} characters; split into several calls.`,
		}),
	example: {
		map: 'a1b2c3',
		ops: [
			{ op: 'outline', under: 'd4e5f6', text: 'Jessica &jessica #character\n  $annotation type:warning Why does she stay?' },
			{ op: 'link', from: '&jessica', to: '77e01a', label: 'mother of' },
		],
	},
	async run({ map, ops, place }, ctx) {
		const loaded = await loadMapForCaller(ctx, map);
		if (!loaded.access.canEdit) {
			throw new McpToolError(
				`You're ${loaded.access.role === 'owner' ? 'the owner' : `a ${loaded.access.role}`} on "${loaded.map.title}" without edit rights, so it can be read but not changed.`
			);
		}

		const graph = createWorkingGraph({
			mapId: loaded.map.id,
			userId: ctx.userId,
			direction: loaded.map.layoutDirection,
			nodes: loaded.nodes,
			edges: loaded.edges,
		});
		applyEditOps(graph, ops as MapEditOp[]);
		if (place === 'auto') placeNewNodes(graph);

		if (isEmptyChangeSet(diffWorkingGraph(graph))) {
			return 'No changes: the map already matches.';
		}

		const { actor, name } = await agentActor(ctx);
		const result = await commitWorkingGraph(ctx, graph, { actor, actionName: `${name} edit` });
		return `Saved to "${loaded.map.title}": ${describeCommit(graph, result, name)}`;
	},
});
