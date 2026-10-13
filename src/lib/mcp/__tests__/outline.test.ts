import { serializeOutline } from '../format/outline-serialize';
import { buildShortIds } from '../format/short-ids';
import { buildMapTree } from '../graph/tree';
import { makeEdge, makeNode, uuidFrom } from '../__fixtures__/graph';

const ROOT = uuidFrom('aaaaaa');
const PAUL = uuidFrom('bbbbbb');
const JESSICA = uuidFrom('cccccc');
const BARON = uuidFrom('dddddd');

function storyGraph() {
	const nodes = [
		makeNode(ROOT, { content: 'Dune', position_x: 0, position_y: 0 }),
		makeNode(PAUL, { content: 'Paul', parent_id: ROOT, position_x: 300, position_y: 100 }),
		makeNode(JESSICA, { content: 'Jessica', position_x: 300, position_y: -100 }),
		makeNode(BARON, {
			content: 'Plot hole: how does Paul know',
			node_type: 'annotationNode',
			parent_id: PAUL,
			metadata: { annotationType: 'warning' },
			position_x: 600,
			position_y: 100,
		}),
	];
	const edges = [
		makeEdge('e1', ROOT, PAUL),
		makeEdge('e2', ROOT, JESSICA, { label: 'mother' }),
		makeEdge('e3', PAUL, BARON),
		makeEdge('e4', JESSICA, PAUL, { label: 'son of' }),
	];
	return { nodes, edges };
}

describe('buildMapTree', () => {
	it('prefers parent_id, falls back to the first incoming edge, orders siblings by position', () => {
		const { nodes, edges } = storyGraph();
		const tree = buildMapTree(nodes, edges, 'LEFT_RIGHT');
		expect(tree.roots).toEqual([ROOT]);
		expect(tree.children.get(ROOT)).toEqual([JESSICA, PAUL]);
		expect(tree.parentOf.get(PAUL)).toBe(ROOT);
		expect(tree.treeEdgeIds).toEqual(new Set(['e1', 'e2', 'e3']));
	});

	it('nests an anchored annotation under its host', () => {
		const host = uuidFrom('a10000');
		const note = uuidFrom('a20000');
		const nodes = [
			makeNode(host),
			makeNode(note, { node_type: 'annotationNode', metadata: { anchorNodeId: host } }),
		];
		const tree = buildMapTree(nodes, [], 'LEFT_RIGHT');
		expect(tree.roots).toEqual([host]);
		expect(tree.children.get(host)).toEqual([note]);
	});

	it('turns a cycle into a root instead of losing nodes', () => {
		const a = uuidFrom('a00000');
		const b = uuidFrom('b00000');
		const nodes = [makeNode(a, { position_y: 0 }), makeNode(b, { position_y: 10 })];
		const edges = [makeEdge('ab', a, b), makeEdge('ba', b, a)];
		const tree = buildMapTree(nodes, edges, 'LEFT_RIGHT');
		expect(tree.roots).toEqual([a]);
		expect(tree.children.get(a)).toEqual([b]);
		expect(tree.treeEdgeIds).toEqual(new Set(['ab']));
	});
});

describe('serializeOutline', () => {
	it('prints the tree, then non-tree and labeled links', () => {
		const { nodes, edges } = storyGraph();
		const tree = buildMapTree(nodes, edges, 'LEFT_RIGHT');
		const result = serializeOutline(nodes, edges, tree, buildShortIds(nodes.map((n) => n.id)), {
			maxNodes: 300,
			detail: 'brief',
		});
		expect(result.text).toBe(
			[
				'[aaaaaa] Dune',
				'  [cccccc] Jessica',
				'  [bbbbbb] Paul',
				'    [dddddd] $annotation Plot hole: how does Paul know type:warning',
				'---',
				'aaaaaa -> cccccc : mother',
				'cccccc -> bbbbbb : son of',
			].join('\n')
		);
	});

	it('cuts by depth and says what is hidden', () => {
		const { nodes, edges } = storyGraph();
		const tree = buildMapTree(nodes, edges, 'LEFT_RIGHT');
		const result = serializeOutline(nodes, edges, tree, buildShortIds(nodes.map((n) => n.id)), {
			depth: 1,
			maxNodes: 300,
			detail: 'brief',
		});
		expect(result.text).toContain('    … 1 more below (read_map root:bbbbbb)');
		expect(result.text).toContain('(1 nodes and 0 links not shown.');
	});

	it('picks nodes level by level when maxNodes is small, and prints one branch from root', () => {
		const { nodes, edges } = storyGraph();
		const tree = buildMapTree(nodes, edges, 'LEFT_RIGHT');
		const shortIds = buildShortIds(nodes.map((n) => n.id));
		const capped = serializeOutline(nodes, edges, tree, shortIds, { maxNodes: 2, detail: 'brief' });
		expect([...capped.shownNodeIds]).toEqual([ROOT, JESSICA]);

		const branch = serializeOutline(nodes, edges, tree, shortIds, {
			rootId: PAUL,
			maxNodes: 300,
			detail: 'brief',
		});
		expect(branch.text.split('\n')[0]).toBe('[bbbbbb] Paul');
		expect(branch.totalNodes).toBe(2);
	});

	it('shows full bodies only in full detail', () => {
		const long = makeNode(uuidFrom('eeeeee'), { content: 'Title\nline 2\nline 3' });
		const tree = buildMapTree([long], [], null);
		const shortIds = buildShortIds([long.id]);
		const brief = serializeOutline([long], [], tree, shortIds, { maxNodes: 10, detail: 'brief' });
		const full = serializeOutline([long], [], tree, shortIds, { maxNodes: 10, detail: 'full' });
		expect(brief.text).toBe('[eeeeee] Title\n  | line 2 (+1 lines)');
		expect(full.text).toBe('[eeeeee] Title\n  | line 2\n  | line 3');
	});
});
