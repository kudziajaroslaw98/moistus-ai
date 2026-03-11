import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import { rerouteAutoWaypointEdges } from './route-auto-waypoint-edges';

function createNode(
	id: string,
	x: number,
	y: number,
	width = 200,
	height = 80
): AppNode {
	return {
		id,
		position: { x, y },
		width,
		height,
		data: {
			id,
			map_id: 'map-1',
			parent_id: null,
			content: id,
			position_x: x,
			position_y: y,
			width,
			height,
			created_at: '2026-03-11T00:00:00.000Z',
			updated_at: '2026-03-11T00:00:00.000Z',
			metadata: {},
		},
		type: 'defaultNode',
	} as AppNode;
}

function createEdge(
	id: string,
	source: string,
	target: string,
	data?: Partial<AppEdge['data']>
): AppEdge {
	return {
		id,
		source,
		target,
		type: data?.type ?? 'floatingEdge',
		data: {
			id,
			map_id: 'map-1',
			user_id: 'user-1',
			source,
			target,
			metadata: {
				...(data?.metadata ?? {}),
			},
			aiData: data?.aiData ?? null,
		},
	} as AppEdge;
}

describe('rerouteAutoWaypointEdges', () => {
	it('routes connected normal edges orthogonally in top-bottom maps', () => {
		const result = rerouteAutoWaypointEdges({
			nodes: [createNode('root', 0, 0), createNode('child', 220, 180)],
			edges: [createEdge('edge-1', 'root', 'child')],
			direction: 'TOP_BOTTOM',
			edgeIds: ['edge-1'],
		});

		expect(result.affectedEdgeIds).toEqual(new Set(['edge-1']));
		expect(result.edges[0]?.type).toBe('waypointEdge');
		expect(result.edges[0]?.data?.metadata).toMatchObject({
			pathType: 'waypoint',
			curveType: 'smoothstep',
			routingStyle: 'orthogonal',
			sourceAnchor: { side: 'bottom', offset: 0.5 },
			targetAnchor: { side: 'top', offset: 0.5 },
		});
		expect(result.edges[0]?.data?.metadata?.waypoints).toEqual([
			{ id: 'edge-1:wp:0', x: 100, y: 130 },
			{ id: 'edge-1:wp:1', x: 320, y: 130 },
		]);
	});

	it('normalizes only legacy normal edges and leaves special edges untouched', () => {
		const result = rerouteAutoWaypointEdges({
			nodes: [createNode('a', 0, 0), createNode('b', 220, 0)],
			edges: [
				createEdge('legacy', 'a', 'b'),
				createEdge('elk', 'a', 'b', {
					type: 'waypointEdge',
					metadata: {
						pathType: 'waypoint',
						routingStyle: 'elk',
					},
				}),
				createEdge('suggested', 'a', 'b', {
					type: 'suggestedConnection',
					aiData: { isSuggested: true },
					metadata: { pathType: 'smoothstep' },
				}),
			],
			direction: 'LEFT_RIGHT',
			legacyOnly: true,
		});

		expect(result.affectedEdgeIds).toEqual(new Set(['legacy']));
		expect(result.edges[0]?.data?.metadata?.routingStyle).toBe('orthogonal');
		expect(result.edges[1]?.data?.metadata?.routingStyle).toBe('elk');
		expect(result.edges[2]?.type).toBe('suggestedConnection');
	});
});
