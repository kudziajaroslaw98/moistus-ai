import type { AppNode } from '@/types/app-node';
import type { NodeData } from '@/types/node-data';
import {
	buildAnchorHostById,
	buildAnnotationsByHost,
	computeAnchorOffset,
	findNearestAnchorHost,
	getAnchorHostIds,
	getAnchorNodeId,
	getAnchorOffset,
	getDefaultAnchorOffset,
} from './anchored-annotations';

function createNode(
	id: string,
	nodeType: NodeData['node_type'],
	position = { x: 0, y: 0 },
	metadata: NodeData['metadata'] = null
): AppNode {
	return {
		id,
		type: nodeType,
		position,
		width: 100,
		height: 50,
		data: {
			id,
			map_id: 'map-1',
			parent_id: null,
			content: id,
			position_x: position.x,
			position_y: position.y,
			node_type: nodeType,
			created_at: '2026-10-03T00:00:00.000Z',
			updated_at: '2026-10-03T00:00:00.000Z',
			metadata,
		},
	};
}

describe('anchored annotations helpers', () => {
	const host = createNode('host', 'defaultNode', { x: 100, y: 100 });
	const anchored = createNode('a1', 'annotationNode', { x: 260, y: 100 }, {
		anchorNodeId: 'host',
		anchorOffset: { x: 160, y: 0 },
	});
	const free = createNode('a2', 'annotationNode', { x: 0, y: 0 });
	const dangling = createNode('a3', 'annotationNode', { x: 0, y: 0 }, {
		anchorNodeId: 'missing',
	});
	const chained = createNode('a4', 'annotationNode', { x: 0, y: 0 }, {
		anchorNodeId: 'a1',
	});
	const nonAnnotationWithAnchor = createNode('n1', 'defaultNode', { x: 0, y: 0 }, {
		anchorNodeId: 'host',
	});
	const nodes = [host, anchored, free, dangling, chained, nonAnnotationWithAnchor];

	it('only treats non-annotation nodes as hosts', () => {
		expect([...getAnchorHostIds(nodes)].sort()).toEqual(['host', 'n1']);
	});

	it('resolves valid anchors and treats invalid ones as free', () => {
		const hostIds = getAnchorHostIds(nodes);
		expect(getAnchorNodeId(anchored, hostIds)).toBe('host');
		expect(getAnchorNodeId(free, hostIds)).toBeNull();
		expect(getAnchorNodeId(dangling, hostIds)).toBeNull();
		expect(getAnchorNodeId(chained, hostIds)).toBeNull();
		expect(getAnchorNodeId(nonAnnotationWithAnchor, hostIds)).toBeNull();
	});

	it('groups anchored annotations by host', () => {
		const byHost = buildAnnotationsByHost(nodes);
		expect([...byHost.keys()]).toEqual(['host']);
		expect(byHost.get('host')?.map((node) => node.id)).toEqual(['a1']);
		expect(buildAnchorHostById(nodes)).toEqual(new Map([['a1', 'host']]));
	});

	it('prefers stored offset and falls back to relative position', () => {
		expect(getAnchorOffset(anchored, host)).toEqual({ x: 160, y: 0 });
		const noOffset = createNode('a5', 'annotationNode', { x: 130, y: 90 }, {
			anchorNodeId: 'host',
		});
		expect(getAnchorOffset(noOffset, host)).toEqual({ x: 30, y: -10 });
		expect(computeAnchorOffset({ x: 5, y: 5 }, { x: 2, y: 3 })).toEqual({ x: 3, y: 2 });
	});

	it('places default offset to the right of the host', () => {
		expect(getDefaultAnchorOffset({ width: 200 })).toEqual({ x: 248, y: 0 });
	});

	it('finds the nearest non-annotation host', () => {
		const near = createNode('near', 'defaultNode', { x: 10, y: 10 });
		const far = createNode('far', 'defaultNode', { x: 1000, y: 1000 });
		const annotation = createNode('a', 'annotationNode', { x: 0, y: 0 });
		const otherAnnotation = createNode('b', 'annotationNode', { x: 1, y: 1 });
		expect(
			findNearestAnchorHost(annotation, [annotation, otherAnnotation, far, near])?.id
		).toBe('near');
		expect(findNearestAnchorHost(annotation, [annotation])).toBeNull();
	});
});
