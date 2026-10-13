import type { RecipeRef } from '@/lib/extensions/recipe-schema';
import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import { buildRecipePromptContext } from './ai-recipe-context';

function createNode(
	id: string,
	nodeType = 'defaultNode',
	metadata: Record<string, unknown> = {}
): AppNode {
	return {
		id,
		type: nodeType,
		position: { x: 0, y: 0 },
		data: {
			id,
			map_id: 'map-1',
			user_id: 'user-1',
			content: `Node ${id}`,
			metadata,
			aiData: {},
			position_x: 0,
			position_y: 0,
			node_type: nodeType,
			created_at: '2026-10-04T00:00:00.000Z',
			updated_at: '2026-10-04T00:00:00.000Z',
			parent_id: null,
		},
	} as AppNode;
}

function createEdge(source: string, target: string, isSuggested = false): AppEdge {
	return {
		id: `${source}-${target}`,
		source,
		target,
		type: 'waypointEdge',
		data: {
			id: `${source}-${target}`,
			map_id: 'map-1',
			source,
			target,
			label: null,
			metadata: {},
			aiData: isSuggested ? { isSuggested: true } : {},
		},
	} as AppEdge;
}

const recipe = (scope: RecipeRef['definition']['scope']): RecipeRef => ({
	id: 'recipe-1',
	definition: {
		title: 'Test',
		description: '',
		icon: 'alert',
		scope,
		instruction: 'Do something.',
		output: { maxItems: 3, nodeTypes: ['defaultNode'], labels: [] },
	},
});

// root -> focus -> child -> grandchild ; root -> sibling ; focus -> ghost-child (suggested)
const nodes = [
	createNode('root'),
	createNode('focus'),
	createNode('sibling'),
	createNode('child'),
	createNode('grandchild'),
	createNode('ghost-child'),
	createNode('elsewhere'),
];
const edges = [
	createEdge('root', 'focus'),
	createEdge('root', 'sibling'),
	createEdge('focus', 'child'),
	createEdge('child', 'grandchild'),
	createEdge('focus', 'ghost-child', true),
];

const nodeTexts = (rows: string[]) => rows.filter((row) => row.startsWith('NODE=')).join('\n');

describe('buildRecipePromptContext', () => {
	it('node scope: focus with parent, siblings and direct children, anchored to the focus', () => {
		const context = buildRecipePromptContext({
			nodes,
			edges,
			recipe: recipe('node'),
			sourceNodeId: 'focus',
		});
		const rows = nodeTexts(context.graphRows);

		expect(rows).toContain('Node focus');
		expect(rows).toContain('Node root');
		expect(rows).toContain('Node sibling');
		expect(rows).toContain('Node child');
		expect(rows).not.toContain('Node grandchild');
		expect(rows).not.toContain('Node ghost-child');
		expect([...context.validAnchorNodeIds]).toEqual(['focus']);
		expect(context.focusNodeId).toBe('focus');
	});

	it('branch scope: focus and its whole structural subtree, plus the parent', () => {
		const context = buildRecipePromptContext({
			nodes,
			edges,
			recipe: recipe('branch'),
			sourceNodeId: 'focus',
		});
		const rows = nodeTexts(context.graphRows);

		expect(rows).toContain('Node grandchild');
		expect(rows).toContain('Node root');
		expect(rows).not.toContain('Node sibling');
		expect(rows).not.toContain('Node ghost-child');
		expect([...context.validAnchorNodeIds].sort()).toEqual(['child', 'focus', 'grandchild']);
	});

	it('branch scope stops at the node limit', () => {
		const wideNodes = [
			createNode('focus'),
			...Array.from({ length: 60 }, (_, i) => createNode(`leaf-${i}`)),
		];
		const wideEdges = wideNodes.slice(1).map((node) => createEdge('focus', node.id));
		const context = buildRecipePromptContext({
			nodes: wideNodes,
			edges: wideEdges,
			recipe: recipe('branch'),
			sourceNodeId: 'focus',
		});

		expect(context.validAnchorNodeIds.size).toBe(50);
	});

	it('map scope: every eligible node, without duplicate ANCHOR rows', () => {
		const context = buildRecipePromptContext({
			nodes: [...nodes, createNode('ghost', 'ghostNode')],
			edges,
			recipe: recipe('map'),
			sourceNodeId: null,
		});
		const rows = nodeTexts(context.graphRows);

		expect(rows).toContain('Node elsewhere');
		expect(rows).not.toContain('Node ghost"');
		expect(context.graphRows.some((row) => row.startsWith('ANCHOR='))).toBe(false);
		expect(context.validAnchorNodeIds.has('elsewhere')).toBe(true);
		expect(context.focusNodeId).toBeNull();
	});

	it('never shows UUIDs to the model', () => {
		const focusId = '0d6f2f4e-8c1b-4a51-9d0e-2b7d3c1f5a01';
		const childId = '7a9c1e2d-3b4f-4c5d-8e6f-9a0b1c2d3e4f';
		const focus = createNode(focusId);
		const child = createNode(childId);
		focus.data.content = 'Launch beta';
		child.data.content = 'Recruit testers';
		const context = buildRecipePromptContext({
			nodes: [focus, child],
			edges: [createEdge(focusId, childId)],
			recipe: recipe('branch'),
			sourceNodeId: focusId,
		});

		expect(context.graphRows.join('\n')).not.toMatch(
			/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/
		);
		expect(context.validAnchorNodeIds).toEqual(new Set([focusId, childId]));
	});

	it('runs on the host when the source is an anchored annotation', () => {
		const annotation = createNode('note', 'annotationNode', {
			anchorNodeId: 'focus',
			anchorOffset: { x: 0, y: 0 },
		});
		const context = buildRecipePromptContext({
			nodes: [...nodes, annotation],
			edges,
			recipe: recipe('node'),
			sourceNodeId: 'note',
		});

		expect(context.focusNodeId).toBe('focus');
	});

	it('rejects node and branch runs whose node is missing', () => {
		expect(() =>
			buildRecipePromptContext({
				nodes,
				edges,
				recipe: recipe('branch'),
				sourceNodeId: 'deleted',
			})
		).toThrow('no longer on the map');
	});
});
