import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import { DEFAULT_LAYOUT_CONFIG } from '@/types/layout-types';
import type { NodeData } from '@/types/node-data';

jest.mock('@/helpers/generate-uuid', () => jest.fn(() => 'mock-uuid'));

import {
	reattachAnchoredAnnotations,
	splitAnchoredAnnotations,
	withAnchoredFollowers,
} from '../anchored-annotation-layout';
import { runElkLayout } from '../elk-worker-client';

const createNode = (
	id: string,
	x: number,
	y: number,
	nodeType: NodeData['node_type'] = 'defaultNode',
	metadata: NodeData['metadata'] = {}
): AppNode =>
	({
		id,
		type: nodeType,
		position: { x, y },
		width: 200,
		height: 80,
		measured: { width: 200, height: 80 },
		data: {
			id,
			map_id: 'map-1',
			user_id: 'owner-id',
			content: id,
			metadata,
			aiData: {},
			position_x: x,
			position_y: y,
			node_type: nodeType,
			created_at: '2026-10-03T00:00:00.000Z',
			updated_at: '2026-10-03T00:00:00.000Z',
			parent_id: null,
		},
	}) as AppNode;

const createEdge = (id: string, source: string, target: string): AppEdge =>
	({
		id,
		source,
		target,
		type: 'floatingEdge',
		data: { id, source, target, map_id: 'map-1', metadata: {}, aiData: {} },
	}) as unknown as AppEdge;

const note = createNode('note', 900, 900, 'annotationNode', {
	anchorNodeId: 'child',
	anchorOffset: { x: 250, y: -20 },
});

describe('anchored annotation layout helpers', () => {
	const nodes = [createNode('root', 0, 0), createNode('child', 500, 500), note];
	const edges = [createEdge('e1', 'root', 'child'), createEdge('e2', 'note', 'root')];

	it('splits annotations and their edges out of the layout graph', () => {
		const split = splitAnchoredAnnotations(nodes, edges);
		expect(split.nodes.map((node) => node.id)).toEqual(['root', 'child']);
		expect(split.edges.map((edge) => edge.id)).toEqual(['e1']);
		expect(split.anchorHostById).toEqual(new Map([['note', 'child']]));
	});

	it('is a no-op when no annotation is anchored', () => {
		const plain = [createNode('a', 0, 0), createNode('b', 1, 1, 'annotationNode')];
		const split = splitAnchoredAnnotations(plain, []);
		expect(split.nodes).toBe(plain);
	});

	it('reattaches annotations at host position + offset, keeping order', () => {
		const split = splitAnchoredAnnotations(nodes, edges);
		const result = {
			nodes: [createNode('root', 10, 10), createNode('child', 300, 40)],
			edges: split.edges,
		};
		const reattached = reattachAnchoredAnnotations(
			nodes,
			edges,
			result,
			split.anchorHostById
		);

		expect(reattached.nodes.map((node) => node.id)).toEqual(['root', 'child', 'note']);
		expect(reattached.nodes[2].position).toEqual({ x: 550, y: 20 });
		expect(reattached.edges.map((edge) => edge.id)).toEqual(['e1', 'e2']);
		expect(reattached.movedAnnotationIds).toEqual(new Set(['note']));
	});

	it('adds followers of persisted hosts', () => {
		expect(
			withAnchoredFollowers(new Set(['child']), new Map([['note', 'child']]))
		).toEqual(new Set(['child', 'note']));
		expect(
			withAnchoredFollowers(new Set(['root']), new Map([['note', 'child']]))
		).toEqual(new Set(['root']));
	});

	it('keeps anchored annotations beside their host through a tree preset', async () => {
		const result = await runElkLayout({
			nodes,
			edges,
			config: { ...DEFAULT_LAYOUT_CONFIG, presetId: 'tree-right' },
		});

		const child = result.nodes.find((node) => node.id === 'child')!;
		const annotation = result.nodes.find((node) => node.id === 'note')!;
		expect(annotation.position).toEqual({
			x: child.position.x + 250,
			y: child.position.y - 20,
		});
		expect(result.edges.map((edge) => edge.id).sort()).toEqual(['e1', 'e2']);
	});
});
