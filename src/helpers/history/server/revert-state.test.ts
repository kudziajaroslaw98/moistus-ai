import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import { canonicalizeEdge, canonicalizeNode } from './revert-state';

const checkpointChildNode = {
	id: 'child-1',
	type: 'defaultNode',
	position: { x: 640, y: 320 },
	parentNode: 'root-1',
	parentId: 'root-1',
	data: {
		id: 'child-1',
		map_id: 'map-1',
		content: 'Child',
		position_x: 640,
		position_y: 320,
		node_type: 'defaultNode',
		metadata: {},
		aiData: {},
		parent_id: 'root-1',
	},
} as unknown as AppNode;

describe('canonicalizeNode', () => {
	it('keeps hierarchy in data.parent_id without a React Flow parentId', () => {
		const node = canonicalizeNode(checkpointChildNode) as unknown as Record<
			string,
			unknown
		>;

		expect(node).not.toHaveProperty('parentId');
		expect(node).not.toHaveProperty('parentNode');
		expect((node.data as Record<string, unknown>).parent_id).toBe('root-1');
	});

	it('keeps the absolute position from the snapshot', () => {
		const node = canonicalizeNode(checkpointChildNode);

		expect(node?.position).toEqual({ x: 640, y: 320 });
		expect(node?.data.position_x).toBe(640);
		expect(node?.data.position_y).toBe(320);
	});

	it('normalizes client-shaped and checkpoint-shaped nodes the same way', () => {
		const clientShapedNode = {
			id: 'child-1',
			type: 'defaultNode',
			position: { x: 640, y: 320 },
			data: { ...checkpointChildNode.data },
		} as unknown as AppNode;

		expect(canonicalizeNode(clientShapedNode)).toEqual(
			canonicalizeNode(checkpointChildNode)
		);
	});
});

describe('canonicalizeEdge', () => {
	it.each([
		['true', true],
		['null', false],
		['false', false],
	])('converts text animated %p to boolean %p', (animated, expected) => {
		const edge = canonicalizeEdge({
			id: 'edge-1',
			source: 'root-1',
			target: 'child-1',
			data: { animated },
		} as unknown as AppEdge);

		expect(edge?.animated).toBe(expected);
	});
});
