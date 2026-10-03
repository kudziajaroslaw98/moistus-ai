import type { AppNode } from '@/types/app-node';
import { createGroupsSlice } from './groups-slice';

jest.mock('@/helpers/generate-uuid', () => jest.fn(() => 'mock-uuid'));

jest.mock('@/helpers/with-loading-and-toast', () => ({
	__esModule: true,
	default: (fn: unknown) => fn,
}));

function makeNode(id: string, metadata: Record<string, unknown> = {}): AppNode {
	return {
		id,
		position: { x: 0, y: 0 },
		data: { id, node_type: 'defaultNode', metadata },
	} as unknown as AppNode;
}

function createHarness(initialNodes: AppNode[]) {
	const state: Record<string, unknown> & { nodes: AppNode[] } = {
		nodes: initialNodes,
	};

	// Mirrors nodes-slice.updateNode metadata merge semantics.
	const updateNode = jest.fn(
		async ({
			nodeId,
			data,
		}: {
			nodeId: string;
			data: { metadata?: Record<string, unknown> };
		}) => {
			state.nodes = state.nodes.map((node) =>
				node.id === nodeId
					? {
							...node,
							data: {
								...node.data,
								metadata: { ...node.data.metadata, ...data.metadata },
							},
						}
					: node
			);
		}
	);
	state.updateNode = updateNode;

	const set = (partial: unknown) => {
		const next =
			typeof partial === 'function' ? partial(state) : (partial as object);
		Object.assign(state, next);
	};
	const get = () => state;

	const slice = createGroupsSlice(
		set as never,
		get as never,
		{} as never
	);
	Object.assign(state, slice);

	const getNode = (id: string) => state.nodes.find((node) => node.id === id)!;
	return { slice, state, updateNode, getNode };
}

describe('groups-slice setNodesGroup', () => {
	it('removes several nodes from the same group without stale children', async () => {
		const { slice, getNode } = createHarness([
			makeNode('G', { isGroup: true, groupChildren: ['a', 'b', 'c'] }),
			makeNode('a', { groupId: 'G' }),
			makeNode('b', { groupId: 'G' }),
			makeNode('c', { groupId: 'G' }),
		]);

		await slice.setNodesGroup(['a', 'b'], null);

		expect(getNode('G').data.metadata?.groupChildren).toEqual(['c']);
		expect(getNode('a').data.metadata?.groupId).toBeUndefined();
		expect(getNode('b').data.metadata?.groupId).toBeUndefined();
		expect(getNode('c').data.metadata?.groupId).toBe('G');
	});

	it('moves a node from one group to another', async () => {
		const { slice, getNode } = createHarness([
			makeNode('A', { isGroup: true, groupChildren: ['x', 'y'] }),
			makeNode('B', { isGroup: true, groupChildren: ['z'] }),
			makeNode('x', { groupId: 'A', label: 'keep-me' }),
			makeNode('y', { groupId: 'A' }),
			makeNode('z', { groupId: 'B' }),
		]);

		await slice.setNodesGroup(['x'], 'B');

		expect(getNode('A').data.metadata?.groupChildren).toEqual(['y']);
		expect(getNode('B').data.metadata?.groupChildren).toEqual(['z', 'x']);
		expect(getNode('x').data.metadata?.groupId).toBe('B');
		expect(getNode('x').data.metadata?.label).toBe('keep-me');
	});

	it('adds ungrouped nodes to an empty group', async () => {
		const { slice, getNode } = createHarness([
			makeNode('G', { isGroup: true }),
			makeNode('a'),
		]);

		await slice.setNodesGroup(['a'], 'G');

		expect(getNode('G').data.metadata?.groupChildren).toEqual(['a']);
		expect(getNode('a').data.metadata?.groupId).toBe('G');
	});

	it('skips nodes already in the target group', async () => {
		const { slice, updateNode } = createHarness([
			makeNode('G', { isGroup: true, groupChildren: ['a'] }),
			makeNode('a', { groupId: 'G' }),
		]);

		await slice.setNodesGroup(['a'], 'G');

		expect(updateNode).not.toHaveBeenCalled();
	});

	it('rejects invalid target groups', async () => {
		const { slice } = createHarness([makeNode('a'), makeNode('b')]);

		await expect(slice.setNodesGroup(['a'], 'b')).rejects.toThrow(
			'Invalid group node'
		);
	});
});
