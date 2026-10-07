/** @jest-environment node */

import type { AppState } from '@/store/app-state';
import type { AppNode } from '@/types/app-node';
import type { GraphActor, GraphOp } from '@/types/extensions';
import { applyGraphOps, MAX_EXT_DATA_BYTES } from './graph-ops';

const OWNER_ID = 'owner-1';
const EDITOR_ID = 'editor-1';
const plugin: GraphActor = { kind: 'plugin', id: 'com.example.kanban' };
const user: GraphActor = { kind: 'user', id: OWNER_ID };

function node(id: string): AppNode {
	return { id, position: { x: 0, y: 0 }, data: { id } } as unknown as AppNode;
}

function createState(options: { userId?: string; canEdit?: boolean } = {}) {
	const state = {
		mapId: 'map-1',
		mindMap: { id: 'map-1', user_id: OWNER_ID },
		currentUser: { id: options.userId ?? OWNER_ID },
		permissions: { can_edit: options.canEdit ?? false },
		nodes: [node('root')] as AppNode[],
		edges: [] as Array<{
			id: string;
			source: string;
			target: string;
			data: object;
		}>,
		historyBatchDepth: 0,
		getNode: jest.fn((id: string): AppNode | undefined =>
			state.nodes.find((n: AppNode) => n.id === id)
		),
		addNode: jest.fn(async ({ nodeId }: { nodeId?: string }): Promise<void> => {
			state.nodes = [...state.nodes, node(nodeId ?? 'new-node')];
		}),
		updateNode: jest.fn(async () => undefined),
		deleteNodes: jest.fn(async () => undefined),
		addEdge: jest.fn(async (source: string, target: string) => {
			const edge = { id: `${source}-${target}`, source, target, data: {} };
			state.edges = [...state.edges, edge];
			return edge;
		}),
		updateEdge: jest.fn(async () => undefined),
		deleteEdges: jest.fn(async () => undefined),
		persistDeltaEvent: jest.fn(async () => undefined),
		beginHistoryBatch: jest.fn((): void => {
			state.historyBatchDepth += 1;
		}),
		endHistoryBatch: jest.fn((): void => {
			state.historyBatchDepth -= 1;
		}),
	};
	return state;
}

const asGetState = (state: ReturnType<typeof createState>) => () =>
	state as unknown as AppState;

describe('applyGraphOps', () => {
	it('refuses users without edit access', async () => {
		const state = createState({ userId: 'viewer-1', canEdit: false });

		const result = await applyGraphOps(
			asGetState(state),
			[{ type: 'createNode', content: 'Hi' }],
			plugin
		);

		expect(result).toEqual({
			ok: false,
			applied: 0,
			error: expect.any(String),
		});
		expect(state.addNode).not.toHaveBeenCalled();
		expect(state.beginHistoryBatch).not.toHaveBeenCalled();
	});

	it('allows the map owner and editors', async () => {
		for (const options of [{}, { userId: EDITOR_ID, canEdit: true }]) {
			const state = createState(options);
			const result = await applyGraphOps(
				asGetState(state),
				[{ type: 'createNode', content: 'Hi' }],
				user
			);
			expect(result).toEqual({ ok: true, applied: 1 });
		}
	});

	it('forwards ops to the existing store actions in order', async () => {
		const state = createState();
		state.nodes = [...state.nodes, node('a'), node('b')];

		await applyGraphOps(
			asGetState(state),
			[
				{ type: 'createNode', nodeId: 'c', content: 'C', parentNodeId: 'root' },
				{ type: 'updateNode', nodeId: 'a', data: { content: 'A2' } },
				{ type: 'createEdge', source: 'a', target: 'b' },
				{ type: 'deleteNodes', nodeIds: ['b'] },
			],
			user
		);

		expect(state.addNode).toHaveBeenCalledWith(
			expect.objectContaining({
				nodeId: 'c',
				content: 'C',
				parentNode: expect.objectContaining({ id: 'root' }),
			})
		);
		expect(state.updateNode).toHaveBeenCalledWith({
			nodeId: 'a',
			data: { content: 'A2' },
		});
		expect(state.addEdge).toHaveBeenCalledWith('a', 'b', {});
		expect(state.deleteNodes).toHaveBeenCalledWith([
			expect.objectContaining({ id: 'b' }),
		]);
	});

	it('records one history event for the batch, attributed to the actor', async () => {
		const state = createState();

		await applyGraphOps(
			asGetState(state),
			[
				{ type: 'createNode', nodeId: 'x' },
				{ type: 'createNode', nodeId: 'y' },
			],
			user,
			{ label: 'Kanban: add columns' }
		);

		expect(state.beginHistoryBatch).toHaveBeenCalledTimes(1);
		expect(state.endHistoryBatch).toHaveBeenCalledTimes(1);
		expect(state.persistDeltaEvent).toHaveBeenCalledTimes(1);
		const [label, prev, next, options] = state.persistDeltaEvent.mock
			.calls[0] as unknown as [
			string,
			{ nodes: AppNode[] },
			{ nodes: AppNode[] },
			{ actor: GraphActor },
		];
		expect(label).toBe('Kanban: add columns');
		expect(prev.nodes.map((n) => n.id)).toEqual(['root']);
		expect(next.nodes.map((n) => n.id)).toEqual(['root', 'x', 'y']);
		expect(options.actor).toEqual(user);
	});

	it('closes the batch and reports partial progress when an op fails', async () => {
		const state = createState();
		state.updateNode.mockRejectedValueOnce(new Error('save failed'));

		const result = await applyGraphOps(
			asGetState(state),
			[
				{ type: 'createNode', nodeId: 'x' },
				{ type: 'updateNode', nodeId: 'x', data: { content: 'boom' } },
			],
			user
		);

		expect(result).toEqual({ ok: false, applied: 1, error: 'save failed' });
		expect(state.endHistoryBatch).toHaveBeenCalledTimes(1);
		expect(state.persistDeltaEvent).toHaveBeenCalledTimes(1);
	});

	it('stops the batch when a store action fails without throwing', async () => {
		const state = createState();
		// The real addNode shows a toast and resolves when saving fails.
		state.addNode.mockImplementationOnce(async () => undefined);

		const result = await applyGraphOps(
			asGetState(state),
			[
				{ type: 'createNode', nodeId: 'x' },
				{ type: 'createEdge', source: 'root', target: 'x' },
			],
			user
		);

		expect(result).toEqual({
			ok: false,
			applied: 0,
			error: 'Node was not created',
		});
		expect(state.addEdge).not.toHaveBeenCalled();
		expect(state.endHistoryBatch).toHaveBeenCalledTimes(1);
	});

	it('reports a connection that was not saved', async () => {
		const state = createState();
		state.addEdge.mockImplementationOnce(async () => undefined as never);

		const result = await applyGraphOps(
			asGetState(state),
			[{ type: 'createEdge', source: 'root', target: 'root' }],
			user
		);

		expect(result).toEqual({
			ok: false,
			applied: 0,
			error: 'Connection was not created',
		});
	});

	it('gives new nodes an id up front so they can be verified', async () => {
		const state = createState();

		const result = await applyGraphOps(
			asGetState(state),
			[{ type: 'createNode', content: 'No id' }],
			user
		);

		expect(result).toEqual({ ok: true, applied: 1 });
		expect(state.addNode).toHaveBeenCalledWith(
			expect.objectContaining({ nodeId: expect.any(String) })
		);
	});

	it('rejects plugin data over the size cap before applying anything', async () => {
		const state = createState();
		const oversized = 'x'.repeat(MAX_EXT_DATA_BYTES + 1);

		const result = await applyGraphOps(
			asGetState(state),
			[
				{
					type: 'updateNode',
					nodeId: 'root',
					data: { metadata: { ext: { [plugin.id]: { blob: oversized } } } },
				},
			],
			plugin
		);

		expect(result.ok).toBe(false);
		expect(state.updateNode).not.toHaveBeenCalled();
	});

	it("rejects a plugin writing another plugin's namespace", async () => {
		const state = createState();

		const result = await applyGraphOps(
			asGetState(state),
			[
				{
					type: 'updateNode',
					nodeId: 'root',
					data: { metadata: { ext: { 'com.other.plugin': { x: 1 } } } },
				},
			],
			plugin
		);

		expect(result.ok).toBe(false);
		expect(state.updateNode).not.toHaveBeenCalled();
	});
});

describe('applyGraphOps: plugins only touch their own nodes', () => {
	const kanbanNode = (id: string, pluginId = plugin.id): AppNode =>
		({
			id,
			position: { x: 0, y: 0 },
			data: {
				id,
				node_type: 'extensionNode',
				metadata: {
					extension: { pluginId, kind: 'board', version: '1.0.0', data: {} },
				},
			},
		}) as unknown as AppNode;
	const extension = (pluginId = plugin.id) => ({
		pluginId,
		kind: 'board',
		version: '1.0.0',
		data: { title: 'Sprint' },
	});

	it('lets a plugin create and update its own extension nodes', async () => {
		const state = createState();
		state.nodes = [...state.nodes, kanbanNode('k1')];

		const result = await applyGraphOps(
			asGetState(state),
			[
				{
					type: 'createNode',
					nodeId: 'k2',
					nodeType: 'extensionNode',
					data: { metadata: { extension: extension() } },
				},
				{
					type: 'updateNode',
					nodeId: 'k1',
					data: { content: 'Sprint', metadata: { extension: extension() } },
				},
			],
			plugin
		);

		expect(result).toEqual({ ok: true, applied: 2 });
	});

	it('refuses plain nodes, other plugins’ nodes and connections', async () => {
		const state = createState();
		state.nodes = [...state.nodes, kanbanNode('theirs', 'com.other.plugin')];
		const attempts: GraphOp[] = [
			{ type: 'createNode', content: 'Plain note' },
			{
				type: 'createNode',
				nodeType: 'extensionNode',
				data: { metadata: { extension: extension('com.other.plugin') } },
			},
			{ type: 'updateNode', nodeId: 'root', data: { content: 'Hijacked' } },
			{ type: 'updateNode', nodeId: 'theirs', data: { content: 'Hijacked' } },
			{ type: 'deleteNodes', nodeIds: ['root'] },
			{ type: 'createEdge', source: 'root', target: 'theirs' },
		];

		for (const op of attempts) {
			const result = await applyGraphOps(asGetState(state), [op], plugin);
			expect(result.ok).toBe(false);
		}
		expect(state.addNode).not.toHaveBeenCalled();
		expect(state.updateNode).not.toHaveBeenCalled();
		expect(state.deleteNodes).not.toHaveBeenCalled();
		expect(state.addEdge).not.toHaveBeenCalled();
	});

	it('refuses changing anything but content and data, or the node’s kind', async () => {
		const state = createState();
		state.nodes = [...state.nodes, kanbanNode('k1')];

		for (const data of [
			{ node_type: 'defaultNode' },
			{ metadata: { title: 'x' } },
			{ metadata: { extension: { ...extension(), kind: 'other' } } },
		]) {
			const result = await applyGraphOps(
				asGetState(state),
				[{ type: 'updateNode', nodeId: 'k1', data } as never],
				plugin
			);
			expect(result.ok).toBe(false);
		}
		expect(state.updateNode).not.toHaveBeenCalled();
	});

	it('caps plugin data and saved views', async () => {
		const state = createState();
		state.nodes = [...state.nodes, kanbanNode('k1')];
		const big = 'x'.repeat(16 * 1024 + 1);

		for (const patch of [
			{ data: { blob: big } },
			{ snapshot: { type: 'text', value: big } },
		]) {
			const result = await applyGraphOps(
				asGetState(state),
				[
					{
						type: 'updateNode',
						nodeId: 'k1',
						data: { metadata: { extension: { ...extension(), ...patch } } },
					},
				],
				plugin
			);
			expect(result.ok).toBe(false);
		}
	});
});
