/** @jest-environment node */
import { pushGraphMutation } from '@/helpers/partykit/admin';
import type { McpToolContext } from '../context';
import {
	buildHistoryEvent,
	commitWorkingGraph,
	explainCommitError,
	toHistoryNode,
} from '../graph/commit';
import { applyEditOps, createWorkingGraph } from '../graph/edit-plan';
import { makeEdge, makeNode, uuidFrom } from '../__fixtures__/graph';

jest.mock('@/helpers/partykit/admin', () => ({ pushGraphMutation: jest.fn() }));

const ROOT = uuidFrom('aaaaaa');
const CHILD = uuidFrom('bbbbbb');
const actor = { kind: 'agent' as const, id: 'client-1', label: 'Claude Code' };

function graph() {
	return createWorkingGraph({
		mapId: 'map-1',
		userId: 'user-1',
		direction: 'LEFT_RIGHT',
		nodes: [makeNode(ROOT, { content: 'Root' }), makeNode(CHILD, { content: 'Child', parent_id: ROOT })],
		edges: [makeEdge('e1', ROOT, CHILD)],
	});
}

describe('history entries', () => {
	it('uses the SQL snapshot node shape, nulls stripped', () => {
		const node = toHistoryNode(makeNode(ROOT, { content: 'Root', width: null }), 'map-1');
		expect(node).toEqual({
			id: ROOT,
			position: { x: 0, y: 0 },
			type: 'defaultNode',
			data: expect.objectContaining({ id: ROOT, map_id: 'map-1', content: 'Root', metadata: {}, aiData: {} }),
		});
		expect(node).not.toHaveProperty('parentId');
		expect(node.data).not.toHaveProperty('width');
	});

	it('records one event with the agent as actor', () => {
		const working = graph();
		applyEditOps(working, [
			{ op: 'add', under: 'aaaaaa', text: 'New' },
			{ op: 'update', id: 'bbbbbb', text: 'Child renamed' },
		]);
		const event = buildHistoryEvent(working, actor, 'Claude Code edit')!;
		expect(event).toMatchObject({
			action_name: 'Claude Code edit',
			operation_type: 'batch',
			entity_type: 'mixed',
			changes: { actor },
		});
		const ops = event.changes.changes.map((change) => `${change.type}:${change.op}`).sort();
		expect(ops).toEqual(['edge:add', 'node:add', 'node:patch']);
		expect(buildHistoryEvent(graph(), actor, 'nothing')).toBeNull();
	});
});

describe('commitWorkingGraph', () => {
	it('writes through the RPC as the user, then pushes the same change live', async () => {
		const rpc = jest.fn().mockResolvedValue({ error: null });
		const ctx = { supabase: { rpc }, clientId: 'client-1', userId: 'user-1', appOrigin: 'https://shiko.test' } as unknown as McpToolContext;
		(pushGraphMutation as jest.Mock).mockResolvedValue(true);

		const working = graph();
		applyEditOps(working, [
			{ op: 'add', under: 'aaaaaa', text: 'New' },
			{ op: 'delete', ids: ['bbbbbb'] },
		]);
		const committed = await commitWorkingGraph(ctx, working, { actor, actionName: 'Claude Code edit' });
		const args = rpc.mock.calls[0][1];
		expect(rpc).toHaveBeenCalledWith('apply_graph_changes', expect.any(Object));
		expect(args.p_insert_nodes).toHaveLength(1);
		expect(args.p_delete_node_ids).toEqual([CHILD]);
		expect(args.p_delete_edge_ids).toEqual([]);
		expect(args.p_history.changes.actor).toEqual(actor);
		expect(args.p_new_map).toBeNull();

		expect(pushGraphMutation).toHaveBeenCalledWith(
			expect.objectContaining({
				mapId: 'map-1',
				actorId: 'agent:client-1',
				deleteNodeIds: [CHILD],
				deleteEdgeIds: ['e1'],
			})
		);
		expect(committed.live).toBe(true);
	});

	it('turns database errors into instructions and survives a failed live push', async () => {
		const ctx = {
			supabase: { rpc: jest.fn().mockResolvedValue({ error: { message: 'NODE_LIMIT_REACHED: map has 50 of 50 nodes' } }) },
			clientId: 'c',
			appOrigin: 'https://shiko.test',
		} as unknown as McpToolContext;
		const working = graph();
		applyEditOps(working, [{ op: 'add', text: 'One more' }]);
		await expect(commitWorkingGraph(ctx, working, { actor, actionName: 'x' })).rejects.toThrow(
			/allows 50 nodes per map .*this call adds 1.*Nothing was written.*https:\/\/shiko.test\/dashboard\?settings=billing/
		);

		(pushGraphMutation as jest.Mock).mockRejectedValue(new Error('partykit down'));
		const ok = { ...ctx, supabase: { rpc: jest.fn().mockResolvedValue({ error: null }) } } as unknown as McpToolContext;
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
		await expect(commitWorkingGraph(ok, working, { actor, actionName: 'x' })).resolves.toMatchObject({ live: false });
		warn.mockRestore();
	});

	it('explains map limits, concurrent changes and missing edit rights', () => {
		expect(explainCommitError('MAP_LIMIT_REACHED: owner has 3 of 3 maps', 0, 'u')).toMatch(/allows 3 maps and you have 3/);
		expect(explainCommitError('GRAPH_CHANGED: 1 of 2 nodes to update were not found', 0, 'u')).toMatch(/Read the map again/);
		expect(explainCommitError('new row violates row-level security policy for table "nodes"', 0, 'u')).toMatch(
			/owner or an editor/
		);
	});
});
