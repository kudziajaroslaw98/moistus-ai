import { diffWorkingGraph } from '../graph/commit';
import { applyEditOps, createWorkingGraph, type WorkingGraph } from '../graph/edit-plan';
import { placeNewNodes } from '../graph/placement';
import { makeEdge, makeNode, uuidFrom } from '../__fixtures__/graph';

const ROOT = uuidFrom('aaaaaa');
const PAUL = uuidFrom('bbbbbb');
const BARON = uuidFrom('cccccc');
const PLUGIN = uuidFrom('dddddd');

function story(): WorkingGraph {
	return createWorkingGraph({
		mapId: 'map',
		userId: 'user',
		direction: 'LEFT_RIGHT',
		nodes: [
			makeNode(ROOT, { content: 'Dune', position_x: 0, position_y: 0, width: 320, height: 80 }),
			makeNode(PAUL, {
				content: 'Paul',
				parent_id: ROOT,
				position_x: 500,
				position_y: 0,
				metadata: { tags: ['character'], answer: 'kept' },
			}),
			makeNode(BARON, { content: 'Baron', parent_id: ROOT, position_x: 500, position_y: 200 }),
			makeNode(PLUGIN, {
				node_type: 'extensionNode',
				metadata: { extension: { pluginId: 'shiko.threads', kind: 'threads', version: '1', data: {} } },
			}),
		],
		edges: [makeEdge('e-root-paul', ROOT, PAUL), makeEdge('e-root-baron', ROOT, BARON)],
	});
}

const idOfContent = (graph: WorkingGraph, content: string) =>
	[...graph.nodes.values()].find((node) => node.content === content)?.id;

describe('applyEditOps', () => {
	it('adds an outline under an existing node with parent links and refs usable by later ops', () => {
		const graph = story();
		applyEditOps(graph, [
			{ op: 'outline', under: 'bbbbbb', text: 'Jessica &jessica #character\n  Leto' },
			{ op: 'link', from: '&jessica', to: 'cccccc', label: 'hates' },
		]);

		const jessica = graph.refs.get('jessica')!;
		const leto = idOfContent(graph, 'Leto')!;
		expect(graph.nodes.get(jessica)).toMatchObject({ parent_id: PAUL, metadata: { tags: ['character'] } });
		expect(graph.nodes.get(leto)?.parent_id).toBe(jessica);

		const changes = diffWorkingGraph(graph);
		expect(changes.insertNodes).toHaveLength(2);
		expect(changes.insertEdges.map((edge) => [edge.source, edge.target, edge.label])).toEqual([
			[PAUL, jessica, null],
			[jessica, leto, null],
			[jessica, BARON, 'hates'],
		]);
	});

	it('anchors annotations to the node above instead of making them children', () => {
		const graph = story();
		applyEditOps(graph, [{ op: 'add', under: 'bbbbbb', text: '$annotation type:warning Plot hole' }]);
		const note = idOfContent(graph, 'Plot hole')!;
		expect(graph.nodes.get(note)).toMatchObject({
			parent_id: null,
			node_type: 'annotationNode',
			metadata: { anchorNodeId: PAUL, annotationType: 'warning' },
		});
		expect(diffWorkingGraph(graph).insertEdges).toHaveLength(0);
	});

	it('updates text and tokens but keeps fields the text does not control', () => {
		const graph = story();
		applyEditOps(graph, [{ op: 'update', id: 'bbbbbb', text: 'Paul Muad\'Dib #hero' }]);
		expect(graph.nodes.get(PAUL)).toMatchObject({
			content: "Paul Muad'Dib",
			metadata: { tags: ['hero'], answer: 'kept' },
		});
		expect(diffWorkingGraph(graph).updateNodes.map((node) => node.id)).toEqual([PAUL]);
	});

	it('moves a node: old parent link out, new parent link in, no cycles', () => {
		const graph = story();
		applyEditOps(graph, [{ op: 'move', id: 'cccccc', under: 'bbbbbb' }]);
		expect(graph.nodes.get(BARON)?.parent_id).toBe(PAUL);
		const changes = diffWorkingGraph(graph);
		expect(changes.deleteEdgeIds).toEqual(['e-root-baron']);
		expect(changes.insertEdges.map((edge) => [edge.source, edge.target])).toEqual([[PAUL, BARON]]);

		expect(() => applyEditOps(story(), [{ op: 'move', id: 'aaaaaa', under: 'bbbbbb' }])).toThrow(
			/can't move under itself or its own children/
		);
	});

	it('deletes with descendants and drops their links; edges of deleted nodes are left to the FK cascade', () => {
		const graph = story();
		applyEditOps(graph, [{ op: 'delete', ids: ['aaaaaa'], withDescendants: true }]);
		const changes = diffWorkingGraph(graph);
		expect(changes.deleteNodeIds.sort()).toEqual([ROOT, PAUL, BARON].sort());
		expect(changes.deleteEdgeIds).toEqual([]);
	});

	it('labels and unlinks existing links in either direction', () => {
		const graph = story();
		applyEditOps(graph, [
			{ op: 'label', from: 'bbbbbb', to: 'aaaaaa', label: 'son of' },
			{ op: 'unlink', from: 'aaaaaa', to: 'cccccc' },
		]);
		const changes = diffWorkingGraph(graph);
		expect(changes.updateEdges).toEqual([expect.objectContaining({ id: 'e-root-paul', label: 'son of' })]);
		expect(changes.deleteEdgeIds).toEqual(['e-root-baron']);
	});

	it('reports every failing op and writes nothing', () => {
		const graph = story();
		const run = () =>
			applyEditOps(graph, [
				{ op: 'update', id: 'dddddd', text: 'rename the plugin' },
				{ op: 'link', from: '&nobody', to: 'aaaaaa' },
				{ op: 'add', text: '$plugin x "y"' },
			]);
		expect(run).toThrow(/op 1 \(update\): plugin nodes belong to their plugin/);
		expect(run).toThrow(/op 2 \(link\): unknown ref &nobody/);
		expect(run).toThrow(/op 3 \(add\): line 1: \$plugin nodes can't be created/);
	});

	it('lets plugin nodes be moved and deleted', () => {
		const graph = story();
		applyEditOps(graph, [
			{ op: 'move', id: 'dddddd', under: 'aaaaaa' },
			{ op: 'delete', ids: ['dddddd'] },
		]);
		expect(graph.nodes.has(PLUGIN)).toBe(false);
	});
});

describe('placeNewNodes', () => {
	it('places a new child right of its parent, past existing children, and moves nothing else', () => {
		const graph = story();
		const before = new Map([...graph.nodes].map(([id, node]) => [id, [node.position_x, node.position_y]]));
		applyEditOps(graph, [{ op: 'add', under: 'aaaaaa', text: 'Jessica' }]);
		placeNewNodes(graph);

		for (const [id, position] of before) {
			expect([graph.nodes.get(id)!.position_x, graph.nodes.get(id)!.position_y]).toEqual(position);
		}
		const jessica = graph.nodes.get(idOfContent(graph, 'Jessica')!)!;
		expect(jessica.position_x).toBeGreaterThan(320);
		// Baron (the lowest existing child) sits at y 200 with the default 80px height.
		expect(jessica.position_y).toBeGreaterThanOrEqual(280);
	});

	it('puts new top-level nodes beside the map and annotations right of their host', () => {
		const graph = story();
		applyEditOps(graph, [
			{ op: 'add', text: 'Appendix' },
			{ op: 'add', under: 'aaaaaa', text: '$annotation Remember the spice' },
		]);
		placeNewNodes(graph);
		expect(graph.nodes.get(idOfContent(graph, 'Appendix')!)!.position_x).toBeGreaterThan(820);
		expect(graph.nodes.get(idOfContent(graph, 'Remember the spice')!)).toMatchObject({
			position_x: 320 + 48,
			position_y: 0,
			metadata: { anchorOffset: { x: 368, y: 0 } },
		});
	});
});
